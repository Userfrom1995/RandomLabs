# Architectural Blueprint: Route 1 - Adaptive Backend Refinement

- **Issue:** #130 (Owner directive 2026-08-27: continue without pause, Route 3 first, cascade to Route 1 then Route 2)
- **Research spec:** `prism/docs/research-route1-acoder-refinement.md` (Dr. Mob, the Researcher)
- **Role:** the Architect
- **Date:** 2026-08-27
- **Scope:** Architectural blueprint for Route 1 refinement: replacing static ANS backend with v1's adaptive coding backend (ACoderV2) while preserving multi-pass analysis. This is NOT a new entropy coding backend; it reuses v1's existing adaptive range coder with per-leaf probability states.

---

## 1. Summary

Route 1 refinement attacks the static ANS overhead identified in Route 3 R1 FAIL (2.6x overhead). The root cause is bypass data (sign bypass 55%, escape bypass 16%) and static ANS's inability to adapt to nonstationary symbol distributions. Route 1 retains the multi-pass structure (analysis pass + coding pass) but replaces the static ANS backend with v1's adaptive range coder (ACoderV2) that already supports MA-tree leaf contexts.

**Key insight:** v1's `acoder_encode_plane_leaves_v2` already accepts pre-computed leaf IDs and uses adaptive per-leaf coding. The decoder recomputes leaf IDs from the MA-tree (no leaf storage needed). This means v1 already IS a multi-pass architecture in disguise. Route 1 makes the separation explicit.

**Projected outcome:** 0.4-1.1% gain from better MA-tree clustering (full v1 features + entropy-based splitting) and eliminated trial-encode overhead. Route 1 is NOT the path to M2 alone (needs 6.15% more), but it is a prerequisite for hybrid approach (adaptive + static ANS).

---

## 2. Module Breakdown

### 2.1 R1-0: Harness Extension (BLOCKING)

The R1-0 phase extends the existing Route 1 harness with adaptive coding backend. All new code lives under `prism/src/codec/` and `prism/include/prism/codec/`.

#### 2.1.1 New Files

| File | Purpose |
|---|---|
| `include/prism/codec/r1_encoder.h` | Two-pass encoder using ACoderV2 (adaptive per-leaf coding) |
| `src/codec/r1_encoder.cpp` | Implementation of R1 encoder with MA-tree + adaptive coding |
| `tests/unit/test_r1_encoder.cpp` | Unit tests for R1 encoder |

#### 2.1.2 Existing Files to Modify

| File | Change |
|---|---|
| `include/prism/codec/multipass.h` | No change (R3 stays isolated) |
| `src/codec/multipass.cpp` | No change |
| `src/prism.cpp` | Add `--r1-adaptive` flag to enable Route 1 refinement |
| `src/cli/main.cpp` | Add `probe-r1-adaptive` and `self-check-r1-adaptive` commands |
| `benchmarks/probe_sandbox.sh` | Add R1-adaptive measurement phases |
| `CMakeLists.txt` | Add new source files to `prism_core` |

#### 2.1.3 Core Data Structures

```cpp
// Route 1 adaptive encoder: multi-pass with ACoderV2
struct R1Encoder {
    uint8_t effort = 5;
    uint16_t num_clusters = 32;
    uint8_t max_depth = 10;
    bool preseed_adaptive = false;  // Option A: pre-seed EMA from histograms

    struct AnalysisResult {
        std::vector<PlaneAnalysis> planes;  // per-plane MA-tree + leaf IDs
        uint8_t color_transform_id = 0;
        uint32_t width = 0;
        uint32_t height = 0;
        uint8_t num_channels = 0;
    };

    struct CodeResult {
        std::vector<uint8_t> payload;       // adaptive-coded residuals
        std::vector<uint8_t> model_blob;    // MA-tree only (no histograms)
        uint32_t payload_len = 0;
        uint32_t model_len = 0;
    };

    // Pass 1: analysis with full v1 features
    AnalysisResult analyze(
        const std::vector<std::vector<uint16_t>>& plane_pixels,
        const std::vector<std::vector<int32_t>>& plane_residuals,
        uint32_t w, uint32_t h, uint8_t num_channels,
        uint8_t bit_depth) const;

    // Pass 2: adaptive coding using ACoderV2 with pre-computed leaf IDs
    CodeResult code(
        const std::vector<std::vector<int32_t>>& plane_residuals,
        const AnalysisResult& analysis) const;

    // Decode: recomputes leaf IDs from MA-tree (no leaf storage)
    std::vector<std::vector<int32_t>> decode(
        const uint8_t* payload, size_t payload_len,
        const uint8_t* model_blob, size_t model_len,
        uint32_t w, uint32_t h, uint8_t num_channels) const;

    // Feature computation (same as v1)
    static std::vector<FeatureR1> build_features(
        const std::vector<uint16_t>& pixels,
        uint32_t w, uint32_t h,
        uint8_t band_class, uint8_t bit_depth);

    // Entropy-based MA-tree splitting (histogram entropy, not variance)
    static MATreeR1 build_matree_entropy(
        const std::vector<FeatureR1>& features,
        const std::vector<int32_t>& residuals,
        uint16_t num_clusters,
        uint8_t max_depth);
};

// Feature set for Route 1 (matches v1)
struct FeatureR1 {
    uint16_t qg = 0;          // quantized gradient
    uint8_t  band_class = 0;  // band class (0 for single-resolution)
    uint8_t  activity = 0;    // 4-level local activity
    uint8_t  position_y = 0;  // normalized y coordinate (0..255)
    uint8_t  position_x = 0;  // normalized x coordinate (0..255)
    // res_diff and sibling_class deferred to R1-3
};

// MA-tree node for Route 1
struct MATreeNodeR1 {
    bool is_leaf = true;
    uint16_t leaf_id = 0;
    uint8_t prop_id = 0;      // 0=QG, 1=BandClass, 2=Activity, 3=PositionY, 4=PositionX
    uint16_t threshold = 0;
    int32_t left = -1;
    int32_t right = -1;
};

// MA-tree for Route 1 (entropy-based splitting)
struct MATreeR1 {
    uint8_t max_depth = 0;
    uint16_t num_leaves = 0;
    std::vector<MATreeNodeR1> nodes;

    uint16_t eval(const FeatureR1& f) const;
    std::vector<uint8_t> serialize() const;
    static MATreeR1 deserialize(const uint8_t* data, size_t len);
    static MATreeR1 build_greedy(
        const std::vector<FeatureR1>& features,
        const std::vector<int32_t>& residuals,
        uint16_t num_clusters,
        uint8_t max_depth);
};
```

#### 2.1.4 Pass 2: Adaptive Coding with ACoderV2

The coding pass reuses v1's `acoder_encode_plane_leaves_v2` function exactly:

```cpp
// Pass 2 coding:
// 1. Re-apply color transform (same as pass 1)
// 2. Re-compute MED prediction residuals (same as pass 1)
// 3. Re-evaluate MA-tree to get leaf IDs (same as pass 1)
// 4. Encode residuals via ACoderV2 with pre-computed leaf IDs

std::vector<uint8_t> payload = acoder_encode_plane_leaves_v2(
    residuals, leaf_ids, num_leaves, uniform_priors);
```

**Key property:** Coding efficiency is identical to v1 because it uses the same adaptive coder with the same per-leaf probability states.

#### 2.1.5 Model Blob Format (MA-tree only)

Route 1 model blob contains only the MA-tree (no histograms). R1 reuses MATreeR3::serialize() verbatim (max_depth u8 + num_leaves u16 LE + pre-order nodes: is_leaf u8 + leaf_id u16 LE or prop_id u8 + threshold u16 LE). No new wire format.

**Estimated overhead:** For K=50 clusters: ~250 bytes (50 internal nodes x 3 bytes + 50 leaves x 2 bytes) = 0.00063 bpp per sample. This is SMALLER than Route 3's model blob (which included histograms).

#### 2.1.6 VB Rails (Verification Bodies)

| Rail | What it proves |
|---|---|
| `VB-R1-ADAPTIVE-ROUNDTRIP` | encode -> decode reproduces source byte-exact using adaptive per-leaf coding |
| `VB-R1-MA-TREE-FIDELITY` | transmitted MA-tree decodes correctly |
| `VB-R1-NET-AUDIT` | NET = payload + model overhead on every row |
| `VB-R1-SELF-CHECK` | proves both verdict directions on pinned quad |

#### 2.1.7 Exit Conditions for R1-0

- [ ] All VB rails green
- [ ] Dated reference CSV committed (`prism/benchmarks/results/2026-MM-DD-sandbox-r1-adaptive.csv`)
- [ ] Spec addendum 23 with ALL pinned constants committed BEFORE any measurement
- [ ] Byte-exact round-trip on pinned quad (kodim01, kodim05, kodim13, kodim19)

---

## 3. Spec Addendum 23: Pinned Constants for Route 1 Adaptive Refinement

All constants below are pinned for the entire R1-series. No measurement may proceed until this addendum is committed.

### 3.1 MA-Tree Parameters

| Constant | Value | Rationale |
|---|---|---|
| `R1_MA_MAX_DEPTH` | 10 | Same as Prism v1; depth > 10 overfits |
| `R1_MA_MIN_SAMPLES_PER_LEAF` | 4096 | Ensures statistical reliability |
| `R1_MA_MAX_LEAVES` | 256 | Upper bound on cluster count |
| `R1_MA_FEATURE_QG` | enabled | Quantized gradient magnitude |
| `R1_MA_FEATURE_BAND_CLASS` | enabled | Always 0 (single-resolution) in R1-series |
| `R1_MA_FEATURE_ACTIVITY` | enabled | 4-level local activity |
| `R1_MA_FEATURE_POSITION` | enabled | Normalized (x,y) coordinates (0..255) |
| `R1_MA_SPLIT_CRITERION` | histogram entropy | Entropy-based greedy splitting (not variance) |

### 3.2 Adaptive Coding Parameters

| Constant | Value | Rationale |
|---|---|---|
| `R1_ADAPTIVE_CODER` | ACoderV2 | v1's adaptive range coder with per-leaf probability states |
| `R1_ADAPTIVE_LEAF_CONTEXTS` | per-leaf | Each leaf gets its own adaptive probability model |
| `R1_ADAPTIVE_UNIFORM_PRIORS` | false | Use v1's default class priors (not uniform) |
| `R1_ADAPTIVE_PRESEED` | false (R1-0), true (R1-4) | Pre-seeding measured in R1-4 |
| `R1_ADAPTIVE_EMA_ALPHA` | v1 default | Same as v1's EMA adaptation rate |

### 3.3 Wire Format

| Constant | Value | Rationale |
|---|---|---|
| `R1_CONTAINER_VERSION` | 1 | Backward-compatible extension via MULTIPASS_FLAG |
| `R1_MAGIC` | 'P','R','S','M' | Unchanged |
| `R1_MULTIPASS_FLAG` | 0x80 (bit7) | Container carries Route 1 multi-pass data |
| `R1_MODEL_LOCATION` | after standard model, before payloads | Length-prefixed blob: MA-tree only (no histograms) |

### 3.4 R1-Series Gate Thresholds

| Gate | Threshold | Consequence |
|---|---|---|
| R1-0 exit | All VB rails green + spec addendum 23 committed + dated CSV | R1-1 may proceed |
| R1-1 primary | FRAME-R1 median NET >= +0.5% over FRAME-V1 | Multi-pass adaptive offers gain |
| R1-1 sub-gate R1-1a | model overhead <= 0.005 bpp per sample | MA-tree-only side-info cost bounded |
| R1-1 sub-gate R1-1b | no image regresses > -0.5% | No catastrophic outlier |
| R1-1 sub-gate R1-1c | decode time <= 1.5x v1 decode time | MA-tree evaluation overhead bounded |
| R1-2 | >= +0.3% NET improvement over R1-1 winner | Entropy-based splitting justified |
| R1-3 | >= +0.3% NET improvement over R1-2 winner | ResDiff + sibling_class features justified |
| R1-4 | >= +0.1% NET improvement | Pre-seeded adaptive coding justified |
| R1-5 threshold | projected < 9.35 summed AND < 3.117 per-sample | M2 PASS (2% margin) |

---

## 4. R1-Series Measurement Program

### 4.1 R1-0: Harness Extension (BLOCKING)

**Purpose:** Extend existing Route 1 harness with adaptive coding backend.

**Deliverables:**
1. Two-pass encoder using ACoderV2 (not static ANS)
2. Full v1 feature set in MA-tree (QG, band_class, activity, position)
3. Entropy-based MA-tree splitting (histogram entropy, not variance)
4. Causal QG/activity recomputation at decode time (matching prism.cpp pattern)
5. VB rails (4 verification bodies)
6. Self-check: proves both verdict directions on pinned quad

**Exit condition:** all VB rails green + dated reference CSV committed.

### 4.2 R1-1: Adaptive vs Adaptive Baseline (measures multi-pass benefit)

**Purpose:** Measure Route 1 (two-pass adaptive) vs v1 (single-pass adaptive) on the pinned quad.

**Test frames:**
- FRAME-V1: Prism v1 single-pass (existing production path)
- FRAME-R1: Route 1 two-pass with full v1 features + entropy-based MA-tree + adaptive per-leaf coding

**Parameters:** K in {16, 32, 64, 128} clusters, effort levels 3/5/7.

**Primary gate:** FRAME-R1 median NET beats FRAME-V1 median NET by >= +0.5% on the quad. This is a TIGHT gate because both use the same adaptive coder; the gain comes from better MA-tree clustering and eliminated trial-encode overhead.

**Sub-gates:**
- R1-1a: model overhead <= 0.005 bpp per sample (MA-tree only, no histograms)
- R1-1b: no image regresses by more than -0.5% (the MA-tree must not hurt any image)
- R1-1c: decode time <= 1.5x v1 decode time (the MA-tree evaluation overhead must be bounded)

**Failable self-check:** proves both gate directions on pinned quad.

### 4.3 R1-2: Entropy-based vs Variance-based MA-tree Splitting

**Purpose:** If R1-1 passes: measure entropy-based splitting vs variance-based splitting on the winning K.

**Test frames:**
- FRAME-VAR: variance-based splitting (current Route 1)
- FRAME-ENT: histogram-entropy-based splitting (new)

**Gate:** FRAME-ENT median NET beats FRAME-VAR by >= +0.3%.
**Fail:** use variance-based splitting.

### 4.4 R1-3: ResDiff + sibling_class Features (conditional)

**Purpose:** If R1-1 passes AND R1-2 passes: add res_diff and sibling_class features to the MA-tree.

**Gate:** median NET beats R1-2 winner by >= +0.3%.
**Fail:** use QG+band_class+activity+position only.

### 4.5 R1-4: Pre-seeded Adaptive Coding (B1 attack, conditional)

**Purpose:** If R1-1 passes: measure pre-seeded adaptive coding (pass 1 histograms initialize EMA states) vs cold-start adaptive coding.

**Gate:** median NET improvement >= +0.1% (A-share bound: 0.073 points).
**Fail:** cold-start is sufficient.

### 4.6 R1-5: Composition + Projection + Gate Check

**Purpose:** Compose all R1-series winners per image by real NET bytes (L-C1). Project corpus via formula 18.5 VERBATIM against the committed e1 CSV.

**Proceed-to-format threshold:** projected < 9.35 summed AND < 3.117 per-sample (2% margin under M2).

**If threshold met:** Architect blueprints the format program behind version bump. Fresh dual-unit `bench_gate.sh` against REAL cjxl and WebP on full Kodak-24. Byte-exact 24/24. Fuzz clean.

---

## 5. Invariants (I18-I20 added)

### I18 (Adaptive Backend Primacy)
Route 1 uses v1's ACoderV2 adaptive range coder with per-leaf probability states. No static ANS, no bypass data, no transmitted histograms. The coding efficiency must match or exceed v1 on every image.

### I19 (MA-tree Feature Parity)
The MA-tree in Route 1 uses the same feature set as v1's MATree (QG, band_class, activity, position; with res_diff and sibling_class added conditionally in R1-3). No feature degradation from v1.

### I20 (Decode-time Feature Recomputation)
Any feature that depends on decoded pixels (QG, activity, res_diff, sibling_class) must be recomputed causally during decode, matching the existing pattern in prism.cpp:244-251. No leaf ID storage in the stream.

---

## 6. What Route 1 is NOT

- A path to M3 (the gain is ~1% at best, 14.48% needed)
- A replacement for Route 3's static ANS (different mechanisms)
- A new entropy coding backend (it uses v1's existing ACoderV2)

Route 1 IS:
- A measurement of whether multi-pass with adaptive coding offers any gain
- An infrastructure investment (MA-tree with full features, entropy splitting)
- A prerequisite for the hybrid approach (adaptive + static ANS)
- A low-risk, high-confidence measurement (same coder as v1, just structured differently)

---

## 7. Module Map for Builder

### Phase 1: R1-0 Scaffolding (Week 1)

1. Create new header file: `r1_encoder.h`
2. Create new source file: `r1_encoder.cpp`
3. Add file to `CMakeLists.txt` under `prism_core`
4. Implement `R1Encoder::analyze()`: full v1 features + entropy-based MA-tree
5. Implement `R1Encoder::code()`: adaptive coding using ACoderV2
6. Implement `R1Encoder::decode()`: recomputes leaf IDs from MA-tree
7. Write unit tests for R1 encoder
8. Implement VB rails

### Phase 2: R1-0 Integration (Week 1)

1. Wire `R1Encoder` into `prism.cpp` encode/decode path
2. Add `--r1-adaptive` flag to CLI command
3. Add `probe-r1-adaptive` and `self-check-r1-adaptive` commands
4. Update `probe_sandbox.sh` with R1-adaptive phases
5. Run self-check on pinned quad
6. Commit spec addendum 23
7. Commit dated reference CSV

### Phase 3: R1-1 Measurement (Week 2)

1. Implement FRAME-V1 and FRAME-R1 test frames
2. Sweep K in {16, 32, 64, 128} and effort {3, 5, 7}
3. Measure NET on pinned quad
4. Check primary gate (>= +0.5% NET improvement)
5. Check sub-gates R1-1a, R1-1b, R1-1c
6. Commit results CSV
7. Run failable self-check

### Phase 4: R1-2 Measurement (Week 2)

1. Sweep MA-tree splitting criterion on winning K
2. Check gate (>= +0.3% NET improvement)
3. Commit results CSV

### Phase 5: R1-3 Measurement (Week 3, conditional)

1. Add res_diff and sibling_class features
2. Check gate (>= +0.3% NET improvement)
3. Commit results CSV

### Phase 6: R1-4 Measurement (Week 3, conditional)

1. Measure pre-seeded adaptive coding
2. Check gate (>= +0.1% NET improvement)
3. Commit results CSV

### Phase 7: R1-5 Composition (Week 4)

1. Compose all R1-series winners per image
2. Project corpus via formula 18.5
3. Check proceed-to-format threshold
4. If threshold met: blueprint format program

---

## 8. Test Matrix

### Unit Tests

| Test | File | What it proves |
|---|---|---|
| `test_r1_encoder.cpp` | New | Two-pass encode/decode byte-exact round-trip |
| `test_r1_matree.cpp` | New | MA-tree build/eval/serialize round-trip |
| `test_r1_features.cpp` | New | Feature computation matches v1 |

### Integration Tests

| Test | File | What it proves |
|---|---|---|
| `test_r1_roundtrip.cpp` | New | Full R1 pipeline round-trip on pinned quad |
| `test_r1_fuzz.cpp` | New | Randomized round-trip + corruption rejection |
| `test_r1_compare_v1.cpp` | New | R1 and v1 produce different bitstreams, same decoded output |

### Benchmark Tests

| Script | What it proves |
|---|---|
| `benchmarks/probe_sandbox.sh --r1-adaptive` | R1 adaptive measurement |
| `benchmarks/bench_gate.sh` | Final dual-unit gate check |

---

## 9. Decision Tree

| Outcome | Consequence |
|---|---|
| R1-0 fails (harness broken) | Fix and re-run; no verdict until green |
| R1-1 fails (< +0.5% NET) | Multi-pass adaptive offers no gain; report ledger, owner decides |
| R1-1 passes, R1-5 threshold met | Architect blueprints format program |
| R1-5 passes M2 but not M3 | Report ledger; owner decides Route 3 hybrid or Route 2 |
| R1-5 misses M2 | Report full ledger; owner decides next route |

---

## 10. Deliverables Checklist

- [ ] Spec addendum 23 with ALL pinned constants
- [ ] R1-0 harness with VB rails + self-check
- [ ] R1-1 measurement results (adaptive vs adaptive baseline)
- [ ] R1-2 measurement results (entropy vs variance splitting)
- [ ] R1-3 measurement results (res_diff + sibling_class features)
- [ ] R1-4 measurement results (pre-seeded adaptive)
- [ ] R1-5 composition + projection
- [ ] Wire format v2 addendum (MA-tree-only model section)
- [ ] Format program blueprint (if R1-5 passes M2)

---

- the Architect