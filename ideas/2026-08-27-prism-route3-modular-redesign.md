# Architectural Blueprint: Route 3 - JXL-style Modular Redesign

- **Issue:** #130 (Owner directive 2026-08-27: Route 3 first, cascade to Route 1
  then Route 2)
- **Research spec:** `prism/docs/research-route3-modular-redesign.md` (Dr. Mob,
  the Researcher)
- **Role:** the Architect
- **Date:** 2026-08-27
- **Scope:** Complete architectural blueprint for the R-series measurement program
  and the Route 3 modular redesign of Prism's entropy backend. This is NOT an
  incremental improvement; it replaces the single-pass adaptive coding pipeline
  with a multi-pass architecture with transmitted histograms and ANS coding.

---

## 1. Summary

Route 3 attacks the fundamental structural gap between Prism and JPEG XL:
single-pass vs multi-pass encoding. After 7 measurement programs (28 phases,
18 rejected with committed numbers), the lab confirmed the table-economics law:
every conditioning refinement measured under payable side-info has lost to its
own table bytes. Route 3 eliminates this by construction through multi-pass
encoding, where the analysis pass costs zero bits and pre-computed tables are
transmitted as format side-info.

**Projected outcome:** 7.8-11.8% recovery from e1 baseline (10.1210 summed).
Conservative: 9.33 summed (M2 PASS). Optimistic: 8.93 summed (M3 at risk but
within reach).

---

## 2. Module Breakdown

### 2.1 R0: Harness Extension (BLOCKING)

The R0 phase extends the existing V+S+T sandbox instrument with multi-pass
infrastructure. All new code lives under `prism/src/codec/` and
`prism/include/prism/codec/`.

#### 2.1.1 New Files

| File | Purpose |
|---|---|
| `include/prism/codec/multipass.h` | Two-pass encoder skeleton, pass interface |
| `include/prism/codec/ans_static.h` | ANS static-probability coder/decoder |
| `include/prism/codec/hybrid_uint.h` | Hybrid-uint tokenization profiles |
| `include/prism/codec/histogram.h` | Per-cluster histogram accumulator + smoothing + serialization |
| `src/codec/multipass.cpp` | Two-pass encoder implementation |
| `src/codec/ans_static.cpp` | ANS static-probability coder/decoder (interleaved rANS, 16 states) |
| `src/codec/hybrid_uint.cpp` | Hybrid-uint tokenization implementation |
| `src/codec/histogram.cpp` | Histogram accumulator, smoothing, hierarchical delta serializer |

#### 2.1.2 Existing Files to Modify

| File | Change |
|---|---|
| `include/prism/codec/staticmodel.h` | Add `MultiPassModel` class wrapping per-cluster histograms + MA-tree |
| `src/codec/staticmodel.cpp` | Implement `MultiPassModel::count_pass()`, `build_histograms()`, `serialize()` |
| `src/cli/main.cpp` | Add `bench-sandbox --r0` through `--r5` measurement commands |
| `benchmarks/probe_sandbox.sh` | Add R-series phases to the probe harness |
| `CMakeLists.txt` | Add new source files to `prism_core` |

#### 2.1.3 Core Data Structures

```cpp
// Two-pass encoder interface
struct MultiPassEncoder {
    // Pass 1: analysis (O(N), zero bits in stream)
    struct AnalysisResult {
        MATree tree;                           // MA-tree built from spatial features
        std::vector<uint16_t> cluster_ids;     // per-sample cluster assignment
        std::vector<Histogram> cluster_hists;  // per-cluster residual histograms
        Histogram global_hist;                 // pooled image-global histogram
        ColorTransformId color_xform;          // trial-selected color transform
        uint8_t effort;                        // effort level (0..7)
    };

    // Pass 2: coding (O(N), produces bitstream)
    struct CodeResult {
        std::vector<uint8_t> payload;          // ANS-coded residuals
        std::vector<uint8_t> model_blob;       // serialized tree + histograms
        uint32_t payload_len;
    };

    AnalysisResult analyze(const Raster& raster);
    CodeResult code(const Raster& raster, const AnalysisResult& analysis);
};

// Per-cluster histogram (34-symbol alphabet under ZFF, ~50 under hybrid-uint)
struct Histogram {
    static constexpr size_t MAX_ALPHABET = 64;
    uint32_t counts[MAX_ALPHABET];
    uint32_t total;

    void add(uint8_t token);
    void smooth(const Histogram& prior, double alpha, double r);
    std::array<uint16_t, 12> normalize_12bit() const;  // sum = 4096
};

// Hierarchical delta-coded histogram serializer
struct HistogramSerializer {
    // Serialize: global prior + per-cluster deltas
    std::vector<uint8_t> serialize(
        const Histogram& global,
        const std::vector<Histogram>& cluster_hists);

    // Deserialize: returns global + per-cluster
    struct DeserializeResult {
        Histogram global;
        std::vector<Histogram> cluster_hists;
    };
    DeserializeResult deserialize(const uint8_t* data, size_t len,
                                  uint16_t num_clusters, uint8_t alphabet_size);
};
```

#### 2.1.4 ANS Static-Probability Coder

```cpp
// Interleaved rANS with per-cluster static probabilities
// 16 states interleaved (same infrastructure as existing rans.h)
struct ANSStaticModel {
    static constexpr int NUM_STATES = 16;
    static constexpr int PRECISION = 12;  // 12-bit normalization (sum=4096)

    struct ClusterTable {
        // Probabilities derived from transmitted histogram
        // For each symbol s: cum_freq[s] and freq[s]
        std::array<uint32_t, 64> cum_freq;  // cumulative frequencies
        std::array<uint32_t, 64> freq;      // symbol frequencies
        uint32_t total;                      // = 4096
    };

    std::vector<ClusterTable> tables;  // one per cluster

    void build_from_histograms(const std::vector<Histogram>& hists);
    void encode(const int32_t* residuals, const uint16_t* cluster_ids,
                size_t count, BitWriter& writer);
    void decode(BitReader& reader, int32_t* residuals, uint16_t* cluster_ids,
                size_t count);
};
```

#### 2.1.5 Hybrid-Uint Tokenization

```cpp
// Hybrid-uint tokenization (replacing ZFF)
// Residual r -> folded u >= 0 -> token t = min(u, T_ESC) + escape bits
struct HybridUintProfile {
    uint8_t T_ESC;         // escape ladder (4, 8, or 16)
    uint8_t alphabet_size; // T_ESC + ceil(log2(max_residual)) + 1

    // Tokenize: residual -> events
    struct Events {
        uint8_t token;       // 0 = ZERO, 1..T_ESC-1 = direct, T_ESC = escape
        uint8_t sign;        // 0 or 1 (only if nonzero)
        uint8_t esc_quotient; // unary quotient of escape magnitude
        uint8_t esc_rawbits;  // raw low bits below escape ladder
    };

    Events tokenize(int32_t residual) const;
    int32_t detokenize(const Events& events) const;

    // Compute alphabet size for a given max_residual
    static uint8_t compute_alphabet(uint8_t T_ESC, int32_t max_residual);
};
```

#### 2.1.6 VB Rails (Verification Bodies)

Each VB rail is a self-contained verification that proves the multi-pass
infrastructure works correctly. These run as unit tests.

| Rail | What it proves |
|---|---|
| `VB-MULTI-PASS-ROUNDTRIP` | encode->decode reproduces source byte-exact |
| `VB-HISTOGRAM-FIDELITY` | transmitted histograms decode correctly |
| `VB-ANS-FIDELITY` | ANS coding/decoding is bit-exact |
| `VB-NET-AUDIT` | NET = payload + model overhead on every row |
| `VB-SELF-CHECK` | proves both verdict directions on pinned quad |

#### 2.1.7 Exit Conditions for R0

- [ ] All VB rails green
- [ ] Dated reference CSV committed (`prism/benchmarks/results/2026-MM-DD-sandbox-r0.csv`)
- [ ] Spec addendum 22 with ALL pinned constants committed BEFORE any measurement
- [ ] Byte-exact round-trip on pinned quad (kodim01, kodim05, kodim13, kodim19)

---

## 3. Spec Addendum 22: Pinned Constants

All constants below are pinned for the entire R-series. No measurement may
proceed until this addendum is committed.

### 3.1 MA-Tree Parameters

| Constant | Value | Rationale |
|---|---|---|
| `MA_MAX_DEPTH` | 10 | Same as Prism v1; depth > 10 overfits |
| `MA_MIN_SAMPLES_PER_LEAF` | 4096 | Ensures histograms are statistically reliable for 12-bit normalization |
| `MA_MAX_LEAVES` | 256 | Upper bound on cluster count |
| `MA_FEATURE_QG` | enabled | Quantized gradient magnitude |
| `MA_FEATURE_BAND_CLASS` | enabled | Always 0 (single-resolution) in R-series |
| `MA_FEATURE_ACTIVITY` | enabled | 4-level local activity |
| `MA_FEATURE_POSITION` | enabled | Normalized (x,y) coordinates (0..255) |
| `MA_SPLIT_CRITERION` | real ANS bytes | Trial-encoded, same as C1/P4 rule |

### 3.2 Histogram Parameters

| Constant | Value | Rationale |
|---|---|---|
| `HIST_ALPHABET_ZFF` | 34 | Zero-flag-first: zero flag, sign, unary quotient, MSB remainder |
| `HIST_ALPHABET_HYB` | computed | T_ESC + ceil(log2(max_residual)) + 1 (varies per image) |
| `HIST_SMOOTH_ALPHA` | 1.0 | Pseudo-count weight |
| `HIST_SMOOTH_R` | 15.0/16.0 | Geometric decay toward pooled prior |
| `HIST_NORMALIZE_BITS` | 12 | Sum = 4096 for ANS coding |
| `HIST_DELTA_CODED` | yes | Hierarchical delta from global prior |

### 3.3 ANS Parameters

| Constant | Value | Rationale |
|---|---|---|
| `ANS_NUM_STATES` | 16 | Interleaved rANS (same as Prism v1) |
| `ANS_PRECISION` | 12 | Matches histogram normalization |
| `ANS_LIFO` | yes | Interleaved rANS is LIFO by construction |
| `ANS_STATIC_PROBS` | yes | No epsilon-adaptation in R-series |

### 3.4 Hybrid-Uint Parameters

| Constant | Value | Rationale |
|---|---|---|
| `HYB_T_ESC_R3` | 8 | Escape ladder for R-series (measured in R3) |
| `HYB_SIGN_AFTER_NONZERO` | yes | L-C5 ordering rule |
| `HYB_ZERO_TOKEN` | 0 | Dedicated zero token |
| `HYB_ZIGZAG_FOLD` | yes | Signed -> unsigned mapping |

### 3.5 Color Transform Parameters

| Constant | Value | Rationale |
|---|---|---|
| `COLOR_XFORM_TRIALS` | {None, YCoCgR, D4c ids 7..11} | Same as Prism v1; trial-selected by real coded bytes |
| `COLOR_XFORM_SELECTION` | trial-encoded | Pass 1 evaluates, Pass 2 uses winner |

### 3.6 Wire Format Version

| Constant | Value | Rationale |
|---|---|---|
| `PRISM_VERSION` | 2 | New container layout for Route 3 |
| `PRISM_MAGIC` | 'P','R','S','M' | Unchanged |

---

## 4. Wire Format v2 Specification

### 4.1 Container Layout

```
PRISM v2 Container Layout (all integers little-endian):
=====================================================
[PRSM magic]          4 bytes: 'P','R','S','M'
[version]             1 byte:  = 2
[width]               4 bytes: u32 LE
[height]              4 bytes: u32 LE
[bit_depth]           1 byte:  8 or 16
[num_channels]        1 byte:  1..4
[color_transform_id]  1 byte:  (same as v1: 0-11)
[flags]               1 byte:  (new flags for v2)
[effort]              1 byte:  0..7
[reserved]            (padding for future use)

MODEL SECTION (new in v2):
  [num_clusters]      u16 LE  (K, typically 30-80)
  [ma_tree_blob]      variable: serialized MA-tree
    For each internal node:
      [prop_id]       u8
      [threshold]     u16 LE
    For each leaf:
      [leaf_id]       u16 LE
    Encoding: pre-order DFS, 1-bit leaf/internal flag per node
  [histogram_blob]    variable: hierarchical delta-coded histograms
    [alphabet_size]   u8  (34 for ZFF, variable for hybrid-uint)
    [global_prior]    alphabet_size x u12 packed (34 x 12 = 408 bits = 51 bytes)
    [per_cluster_deltas]:
      For each cluster 0..K-1:
        [delta_coded_histogram]  variable-length coded
        (delta from global prior, small differences compress well)

PAYLOAD:
  [payload_len]       u32 LE  (total payload bytes)
  [payload_bytes]     payload_len bytes of ANS-coded residuals
                      (per-cluster coding, interleaved rANS, 16 states)

FOOTER:
  [crc32_all]         u32 LE (over header + model + payload)
```

### 4.2 Flag Definitions (v2)

| Bit | Name | Description |
|---|---|---|
| 0 | CM | Context mixing (reserved, 0 in R-series) |
| 1 | LZP | LZP pre-filter (reserved, 0 in R-series) |
| 2 | ACODER | FIFO adaptive range coder (v1 path, 0 in v2) |
| 3 | ACODER_V2 | v2 dual-rate models (v1 path, 0 in v2) |
| 4 | MATREE_FLAT | MA-tree on level-0 planes (v1 path, 0 in v2) |
| 5 | SQUEEZE_LIFT | true CDC lifting (v1 path, 0 in v2) |
| 6 | XBAND | cross-band weights (v1 path, 0 in v2) |
| 7 | MULTI_PASS | **NEW**: multi-pass encoding active (Route 3) |

### 4.3 Model Blob Encoding

The model blob is NOT bit-packed in v2. It is byte-aligned for simpler parsing:

```
MA-tree blob:
  [num_internal_nodes]  u16 LE
  For each internal node (pre-order):
    [prop_id]           u8  (0=QG, 1=BandClass, 2=Activity, 3=PositionY, 4=PositionX)
    [threshold]         u16 LE
  [num_leaves]          u16 LE
  For each leaf (pre-order):
    [leaf_id]           u16 LE

Histogram blob:
  [alphabet_size]       u8
  [global_prior]        ceil(alphabet_size * 12 / 8) bytes (12-bit packed)
  For each cluster 0..K-1:
    [delta_coded_len]   u16 LE  (byte length of this cluster's delta)
    [delta_bytes]       delta_coded_len bytes
```

### 4.4 Estimated Overhead

For K=50 clusters, alphabet=34 (ZFF):
- Header: ~20 bytes
- MA-tree: ~250 bytes (50 internal nodes x 3 bytes + 50 leaves x 2 bytes)
- Histograms: ~1,751 bytes (50 x 34 bytes avg delta + 51 bytes global)
- Total model overhead: ~2,021 bytes = 0.0051 bpp per sample
- This is FIXED per image, independent of content

---

## 5. R-Series Measurement Program

### 5.1 R0: Harness Extension (BLOCKING)

**Purpose:** Extend the V+S+T sandbox with multi-pass infrastructure.

**Deliverables:**
1. Two-pass encoder skeleton (pass 1: analysis, pass 2: coding)
2. MA-tree builder that outputs cluster assignments (not context ids)
3. Per-cluster histogram accumulator (34-symbol alphabet)
4. Histogram smoothing (pseudo-count geometric toward pooled prior)
5. Hierarchical delta histogram serializer + deserializer
6. ANS static-probability coder/decoder (interleaved rANS, 16 states)
7. Hybrid-uint tokenization profile (replacing ZFF)
8. VB rails (5 verification bodies)
9. Self-check: proves both verdict directions on pinned quad
10. Spec addendum 22 committed BEFORE any measurement

**Exit condition:** all VB rails green + dated reference CSV committed.

**Failable self-check:** The self-check must prove that:
- FRAME-SINGLE (v1 path) produces a known output on the pinned quad
- FRAME-MULTI (v2 path) produces a DIFFERENT known output on the pinned quad
- Both outputs decode to the correct source raster

### 5.2 R1: Multi-pass vs Single-pass Baseline (attacks B1)

**Purpose:** Measure the multi-pass architecture against the v1 single-pass
baseline on the pinned quad.

**Test frames:**
- FRAME-SINGLE: Prism v1 single-pass (existing production path)
- FRAME-MULTI: Route 3 multi-pass with MA-tree clustering + transmitted
  histograms + ANS coding, using the SAME predictor (MED) and SAME color
  transform (D4c trials from v1)

**Parameters:** K in {16, 32, 64, 128} clusters, effort levels 3/5/7.

**Primary gate:** FRAME-MULTI median NET beats FRAME-SINGLE median NET by
>= +5.0% on the quad (per I10). This is the B1 bucket: the collection layer
improvement from multi-pass should be substantial because it eliminates the
entire online adaptation cost.

**Sub-gates:**
- R1a: payload reduction >= +3.0% (static ANS must be more efficient than
  online-adaptive coding)
- R1b: model overhead <= 0.02 bpp per sample (histograms + tree must be
  affordable)
- R1c: no image regresses by more than -1.0% (clustering must not hurt
  smooth images)

**Failable self-check:** proves both gate directions on pinned quad.

**Decision:** R1 passes -> proceed to R2. R1 fails -> cascade to Route 1.

### 5.3 R2: MA-Tree Parameter Optimization

**Purpose:** Sweep MA-tree parameters on the winning K from R1.

**Sweep:**
- Tree depth: {5, 7, 10, 12}
- Min samples per leaf: {2048, 4096, 8192}
- Feature set: {QG+activity, QG+activity+position, full}

**Gate:** best configuration beats R1 winner by >= +0.5% median NET.
**Fail:** use R1 winner parameters.

### 5.4 R3: Predictor-Tokenization Factorial (attacks B3+B5)

**Purpose:** Factorial trial of predictor families x tokenization under the
new multi-pass architecture.

**Factorial:**
- Predictors: {MED control, GAP, W ensemble}
- Tokenization: {hybrid-uint, ZFF control under ANS}

**Bars (same as T3 but under the NEW multi-pass architecture):**
- (i) Best non-MED family >= +1.50% median NET over MED under its winning
  tokenization, else GAP and W take third strike
- (ii) Tokenization main effect recorded

**Decision:** R3 records measurements. The R4 composition will decide whether
B3/B5 contribute meaningfully.

### 5.5 R4: Composition + Projection + Gate Check

**Purpose:** Compose all R-series winners per image by real NET bytes (L-C1).
Project corpus via formula 18.5 VERBATIM against the committed e1 CSV.

**Proceed-to-format threshold:** projected < 9.35 summed AND < 3.117
per-sample (2% margin under M2).

**If threshold met:** Architect blueprints the format program behind version
bump. Fresh dual-unit `bench_gate.sh` against REAL cjxl and WebP on full
Kodak-24. Byte-exact 24/24. Fuzz clean.

**If R4 passes M2 but not M3:** open R5 reserve once; recompose; then format.

### 5.6 R5: Reserve (only if R4 projects inside M3 reach but short of it)

One-shot reserve mechanisms (each is a separate sub-phase with its own gate):

- **R5a:** cross-band prediction from decoded LL to HF bands (parent-property
  conditioned; opens L-C7 reserve)
- **R5b:** extended predictor bank under ANS (GAP/W with max-error feedback;
  opens B3 fully)
- **R5c:** larger alphabet tokens (T_ESC = 8/16/32) to capture more of the
  residual distribution

Each gate: >= +1.0% median NET, no image worse than -0.5%. Third strike
dies forever.

---

## 6. Invariants (I15-I17 added)

### I15 (Multi-pass Primacy)
Route 3 requires a two-pass encoder. The analysis pass must produce identical
cluster assignments and histograms as the coding pass would expect; determinism
byte-for-byte is enforced by construction (same code path for both passes).

### I16 (Histogram Affordability)
Total model overhead (tree + histograms) must not exceed 0.02 bpp per sample
on the pinned quad. If overhead exceeds this bar, the clustering is too fine
and K must be reduced.

### I17 (ANS Static-Probability Fidelity)
The ANS coder must produce bit-exact output for a given static probability
table. No epsilon-adaptation or dynamic mixing is permitted in the R-series;
this is measured separately.

---

## 7. Module Map for Builder

### Phase 1: R0 Scaffolding (Week 1)

1. Create new header files: `multipass.h`, `ans_static.h`, `hybrid_uint.h`,
   `histogram.h`
2. Create new source files: `multipass.cpp`, `ans_static.cpp`,
   `hybrid_uint.cpp`, `histogram.cpp`
3. Add files to `CMakeLists.txt` under `prism_core`
4. Implement `Histogram` class: accumulator, smoothing, normalization
5. Implement `HybridUintProfile`: tokenize/detokenize
6. Implement `ANSStaticModel`: build_from_histograms, encode, decode
7. Implement `MultiPassEncoder::analyze()`: MA-tree + cluster assignment
8. Implement `MultiPassEncoder::code()`: ANS coding with per-cluster tables
9. Implement `HistogramSerializer`: serialize/deserialize
10. Write unit tests for each new module

### Phase 2: R0 VB Rails (Week 1)

1. `VB-MULTI-PASS-ROUNDTRIP`: encode raster -> decode -> compare byte-exact
2. `VB-HISTOGRAM-FIDELITY`: serialize histograms -> deserialize -> compare
3. `VB-ANS-FIDELITY`: encode payload -> decode -> compare bit-exact
4. `VB-NET-AUDIT`: for each row, verify NET = payload + model overhead
5. `VB-SELF-CHECK`: prove both verdict directions on pinned quad

### Phase 3: R0 Integration (Week 2)

1. Wire `MultiPassEncoder` into `prism.cpp` encode/decode path
2. Add `--r0` through `--r5` commands to `main.cpp`
3. Update `probe_sandbox.sh` with R-series phases
4. Run self-check on pinned quad
5. Commit spec addendum 22
6. Commit dated reference CSV

### Phase 4: R1 Measurement (Week 2)

1. Implement FRAME-SINGLE and FRAME-MULTI test frames
2. Sweep K in {16, 32, 64, 128} and effort {3, 5, 7}
3. Measure NET on pinned quad
4. Check primary gate (>= +5.0% NET improvement)
5. Check sub-gates R1a, R1b, R1c
6. Commit results CSV
7. Run failable self-check

### Phase 5: R2 Measurement (Week 3)

1. Sweep MA-tree parameters on winning K
2. Check gate (>= +0.5% NET improvement)
3. Commit results CSV

### Phase 6: R3 Measurement (Week 3)

1. Factorial trial: {MED, GAP, W} x {hybrid-uint, ZFF}
2. Score NET on pinned quad
3. Check bars (i) and (ii)
4. Commit results CSV

### Phase 7: R4 Composition (Week 4)

1. Compose all R-series winners per image
2. Project corpus via formula 18.5
3. Check proceed-to-format threshold
4. If threshold met: blueprint format program
5. If R4 passes M2 but not M3: open R5

### Phase 8: R5 Reserve (Week 4, conditional)

1. R5a: cross-band prediction
2. R5b: extended predictor bank
3. R5c: larger alphabet tokens
4. Recompose and project

---

## 8. Test Matrix

### Unit Tests

| Test | File | What it proves |
|---|---|---|
| `test_histogram.cpp` | New | Accumulator, smoothing, normalization, serialization round-trip |
| `test_hybrid_uint.cpp` | New | Tokenize/detokenize bijection for all T_ESC values |
| `test_ans_static.cpp` | New | Encode/decode bit-exact for static probabilities |
| `test_multipass.cpp` | New | Two-pass encode/decode byte-exact round-trip |
| `test_wire_v2.cpp` | New | Container v2 encode/decode + CRC32 gate |

### Integration Tests

| Test | File | What it proves |
|---|---|---|
| `test_roundtrip_v2.cpp` | Modified | Full v2 pipeline round-trip on pinned quad |
| `test_fuzz_gate_v2.cpp` | New | Randomized round-trip + corruption rejection for v2 |
| `test_compare_v1_v2.cpp` | New | v1 and v2 produce different bitstreams, same decoded output |

### Benchmark Tests

| Script | What it proves |
|---|---|
| `benchmarks/probe_sandbox.sh --r0` | R0 harness verification |
| `benchmarks/probe_sandbox.sh --r1` | Multi-pass vs single-pass baseline |
| `benchmarks/probe_sandbox.sh --r2` | MA-tree parameter sweep |
| `benchmarks/probe_sandbox.sh --r3` | Predictor-tokenization factorial |
| `benchmarks/probe_sandbox.sh --r4` | Composition + projection |
| `benchmarks/bench_gate.sh` | Final dual-unit gate check |

---

## 9. Decision Tree

| Outcome | Consequence |
|---|---|
| R0 fails (harness broken) | Fix and re-run; no verdict until green |
| R1 fails (< +5.0% NET) | Route 3 architecturally infeasible; cascade to Route 1 |
| R1 passes, R4 threshold met | Architect blueprints format program behind version bump |
| R4 projects into M3 reach | Open R5 reserve once; recompose; then format |
| R4 passes M2 but not M3 | Owner decides: Route 1 or honest closure |
| Everything fails | Full negative ledger; honest closure at achieved level |

---

## 10. What This Is NOT

- NOT an incremental improvement on Prism v1 (it replaces the entropy backend)
- NOT a neural/learned codec (L-C9: no external libraries)
- NOT a multi-resolution wavelet codec (L-C7: not transform-first)
- NOT a copy of JXL (it is a different codec with similar architectural
  principles; the specifics differ)

---

## 11. Deliverables Checklist

- [ ] Spec addendum 22 with ALL pinned constants
- [ ] R0 harness with VB rails + self-check
- [ ] R1 measurement results (multi-pass vs single-pass)
- [ ] R2 measurement results (MA-tree optimization)
- [ ] R3 measurement results (predictor-tokenization factorial)
- [ ] R4 composition + projection
- [ ] R5 reserve (conditional)
- [ ] Wire format v2 specification (byte-level)
- [ ] Format program blueprint (if R4 passes M2)

---

- the Architect
