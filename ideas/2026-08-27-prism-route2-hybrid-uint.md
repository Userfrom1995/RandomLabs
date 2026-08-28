# Architectural Blueprint: Route 2 - Hybrid-Uint Binarization (ZFF Pathology Removal)

- **Issue:** #130 (Owner directive 2026-08-27: continue without pause, Route 3 first, cascade to Route 1 then Route 2)
- **Research spec:** `prism/docs/research-route2-hybrid-uint.md` (Dr. Mob, the Researcher)
- **Spec addendum:** `prism/docs/addendum-24-pinned-constants-route2.md` (pinned constants)
- **Role:** the Architect
- **Date:** 2026-08-27
- **Scope:** Architectural blueprint for Route 2: replacing zero-flag-first (ZFF) binarization with hybrid-uint tokenization under v1's ACoderV2 adaptive binary range coder. This does NOT change the entropy coding backend; it changes the tokenization that feeds the backend.

---

## 1. Summary

Route 2 targets the ZFF pathology: the structural bias where zero residuals cost 1 bin but magnitude-1 residuals cost 4 bins, creating disproportionate reward for zero-prediction and underrewarding small-magnitude prediction improvement. This pathology closed B3 (predictor headroom) in T3, caused E1 bias cancellation to backfire (+19.85 pts), and regressed S1 GAP/W families (-1.45%/-2.61%).

The fix is exactly one thing: replace `encode_residual_v2` / `decode_residual_v2` (ZFF binarization) with hybrid-uint tokenization (T_ESC+1 token alphabet via binary tree) under the same ACoderV2 adaptive coder. Everything else stays identical to v1: color transform, prediction (MED), context model (343 residual-diff + 16 class priors), MA-tree.

**Key architectural insight:** The existing ACoderV2 already handles per-context binary decisions with dual-rate EMA adaptation. Hybrid-uint tokenization codes T_ESC+1 tokens via a binary tree of T_ESC binary decisions, each using its own adapted probability. The model is wider (T_ESC+1 decision nodes instead of 4: zero/sign/q/rem) but the adaptation mechanism is identical. This is a pure tokenization swap, not a coding backend change.

**Projected outcome:** 0-4% recovery from B3+B5 reopening. Route 2 alone CANNOT reach M2 (10.1210 x 0.96 = 9.72, still 2.3% above 9.498). Its value is measuring the ZFF pathology, reopening B3, and establishing hybrid-uint for future composition.

---

## 2. Module Breakdown

### 2.1 Core Model: ACModelsHybrid

A new model struct parallel to `ACModelsV2` but with a `token` KindModelsV2 replacing `zero` and `q`:

```cpp
struct ACModelsHybrid {
    KindModelsV2 token;  // T_ESC+1 token via binary tree (replaces zero + q)
    KindModelsV2 sign;   // same as v1 (coded only for nonzero)
    KindModelsV2 escq;   // escape quotient continuation (same as v1's q)
    int T_ESC;
    explicit ACModelsHybrid(int n = 1, int t_esc = 8, bool uniform_priors = false);
    void init(int n, int t_esc, bool uniform_priors);
    void ensure(int n);
};
```

The `token` model tracks binary tree decision nodes. For T_ESC=8 (9 tokens: 0..7, ESC), the tree has 8 internal nodes, each a binary decision with its own adapted probability. The `escq` model tracks the unary escape quotient (same structure as v1's `q`). The `sign` model is unchanged.

**Memory:** For T_ESC=8, 343 contexts: 343 x (8 + 1 + 1) nodes x 2 rates x 2 bytes = ~27.4 KB (vs v1's 343 x 4 x 2 x 2 = ~11.0 KB). This is 2.5x more model memory but still negligible (< 0.001 bpp per sample).

### 2.2 Encode/Decode Functions

New functions in `acoder.cpp`, parallel to `encode_residual_v2` / `decode_residual_v2`:

```cpp
void encode_residual_hybrid(AEncoder& enc, ACModelsHybrid& m, int cx, int32_t e);
int32_t decode_residual_hybrid(ADecoder& dec, ACModelsHybrid& m, int cx);
```

**Encode algorithm (hybrid-uint):**
1. Zigzag fold: `u = (e << 1) ^ (e >> 31)` (pin D13, maps signed to unsigned)
2. Code token via binary tree:
   - Level 0: `v2_put(enc, m.token, cx, u == 0)` (ZERO vs nonzero)
   - If nonzero: halving tree to identify token (1..T_ESC-1 direct, T_ESC escape)
3. If nonzero: `v2_put(enc, m.sign, cx, e < 0)` (sign, L-C5 rule)
4. If escape: unary quotient + raw bypass bits (pin D3)

**Decode algorithm:** Mirror of encode, bin-for-bin (I2 invariant).

### 2.3 Binary Tree Token Coding

The token alphabet (T_ESC+1 symbols) is coded via a balanced binary tree of binary decisions:

```
For T_ESC=4 (5 tokens: 0,1,2,3,ESC):
  Level 0: is u == 0?              -> models.token[0]
  Level 1: is u in {1,2} vs {3,ESC}? -> models.token[1]
  Level 2: is u == 1 vs 2?         -> models.token[2] (left branch)
           is u == 3 vs ESC?        -> models.token[3] (right branch)

For T_ESC=8 (9 tokens: 0..7,ESC):
  Level 0: is u == 0?              -> models.token[0]
  Level 1: is u in {1..3,ESC} vs {4..7}? -> models.token[1]
  Level 2: is u in {1,2} vs {3,ESC}?     -> models.token[2] (left)
           is u in {4,5} vs {6,7}?        -> models.token[3] (right)
  Level 3: 4 binary decisions to identify leaf
```

**Key property:** Each decision node has its own adapted probability per context. Zero gets priced by its actual probability (node 0 in the tree), not by a fixed 1-bin ZFF cost. Small magnitudes get priced proportionally to their token frequency, not by binary decomposition depth.

### 2.4 Wire Format Extension

**Container flag:** bit1 (0x02) - aliases LZP_FLAG, mutually exclusive with LZP/CM.
For Route 2, bit1 signals "hybrid-uint mode" (no LZP/CM weights in this configuration).

**Compatibility:** Old v1 streams without ACODER_V2 are unaffected. New Route 2 streams set bit1 + bit3 (ACODER_V2_FLAG) + bit2 (ACODER_FLAG).

**Decoder dispatch:** In `prism.cpp` decode path, check `flags & 0x02` combined with ACODER_V2_FLAG to route to `decode_residual_hybrid` instead of `decode_residual_v2`.

### 2.5 Files to Modify/Create

| File | Change |
|---|---|
| `include/prism/codec/acoder.h` | Add `ACModelsHybrid`, `encode_residual_hybrid`, `decode_residual_hybrid` declarations |
| `src/codec/acoder.cpp` | Implement hybrid model, encode/decode functions, plane helpers |
| `include/prism/codec/container.h` | R2_HYBRID_FLAG (0x02, alias LZP bit1, exclusive with LZP/CM) |
| `src/codec/container.cpp` | Decode: check bit1 + ACODER_V2 to select hybrid decode path |
| `src/prism.cpp` | Encode/decode: check bit1 flag + ACODER_V2 to select hybrid path |
| `src/cli/main.cpp` | Add `--r2-hybrid`, `probe-r2-hybrid`, `self-check-r2-hybrid` commands |
| `benchmarks/probe_sandbox.sh` | Add R2-hybrid measurement phases |
| `tests/unit/test_acoder.cpp` | Add hybrid-uint round-trip tests |
| `tests/unit/test_hybrid_uint.cpp` | Extend with R2 binary tree tests |

### 2.6 VB Rails (Verification Bodies)

| Rail | What it proves |
|---|---|
| `VB-R2-HYBRID-ROUNDTRIP` | encode_residual_hybrid -> decode_residual_hybrid reproduces source byte-exact |
| `VB-R2-TOKEN-FIDELITY` | token distributions match expectations (zero freq > sign freq for photographic content) |
| `VB-R2-NET-AUDIT` | NET = payload + model overhead on every row |
| `VB-R2-MODEL-OVERHEAD` | per-context model memory audit (<= 0.01 bpp per sample) |

---

## 3. Detailed Implementation Plan

### 3.1 Phase: R2-0 Scaffolding (BLOCKING)

**Step 1: ACModelsHybrid struct (acoder.h)**

Add after ACModelsV2:
```cpp
struct ACModelsHybrid {
    KindModelsV2 token;  // binary tree over T_ESC+1 tokens
    KindModelsV2 sign;   // binary (nonzero only)
    KindModelsV2 escq;   // escape quotient continuation
    int T_ESC = 8;
    explicit ACModelsHybrid(int n = 1, int t_esc = 8, bool uniform_priors = false);
    void init(int n, int t_esc, bool uniform_priors);
    void ensure(int n);
};
```

**Step 2: Token tree helpers (acoder.cpp)**

```cpp
// Binary tree node index for token coding
// Tree has T_ESC internal nodes (0..T_ESC-1)
// Returns the path (sequence of bool decisions) to identify token t in [0, T_ESC]
static void token_tree_path(int t, int T_ESC, bool* path, int* depth);

// Encode one token via binary tree
static void encode_token_tree(AEncoder& enc, KindModelsV2& token, int cx, int t, int T_ESC);

// Decode one token via binary tree
static int decode_token_tree(ADecoder& dec, KindModelsV2& token, int cx, int T_ESC);
```

The tree is a complete binary tree over the range [0, T_ESC]. Token 0 (ZERO) is always the leftmost leaf. Tokens 1..T_ESC-1 are direct. Token T_ESC (escape) is the rightmost leaf.

**Step 3: encode_residual_hybrid / decode_residual_hybrid (acoder.cpp)**

```cpp
void encode_residual_hybrid(AEncoder& enc, ACModelsHybrid& m, int cx, int32_t e) {
    if (cx < 0) cx = 0;
    if (cx >= (int)m.token.ctx.p_fast.size()) m.ensure(cx + 1);
    // Zigzag fold (pin D13)
    uint32_t u = (uint32_t)(((uint32_t)e << 1) ^ (uint32_t)(e >> 31));
    // Code token via binary tree
    int token = (u < (uint32_t)m.T_ESC) ? (int)u : m.T_ESC;
    encode_token_tree(enc, m.token, cx, token, m.T_ESC);
    if (token == 0) return;  // zero: done
    // Sign (L-C5, only for nonzero)
    v2_put(enc, m.sign, cx, e < 0);
    // Escape path
    if (token == m.T_ESC) {
        uint32_t m_val = u - (uint32_t)m.T_ESC + 1;  // m >= 1 (pin D1)
        int q = 31 - __builtin_clz(m_val);
        for (int k = 0; k < q; ++k) v2_put(enc, m.escq, cx, false);
        v2_put(enc, m.escq, cx, true);
        // Raw bypass bits (pin D3)
        uint32_t raw = m_val & ((q >= 32) ? ~0u : ((1u << q) - 1u));
        enc.write_raw_bits(raw, q);  // literal bits, not adaptive
    }
}
```

**Step 4: Plane helpers (acoder.cpp)**

```cpp
std::vector<uint8_t> acoder_encode_plane_hybrid(
    const std::vector<int32_t>& residuals,
    uint32_t w, uint32_t h, int T_ESC);

std::vector<int32_t> acoder_decode_plane_hybrid(
    const std::vector<uint8_t>& bytes, size_t num_residuals,
    uint32_t w, uint32_t h, int T_ESC);
```

Same context computation as v2 (residual-diff 343).

**Step 5: Wire into prism.cpp**

In `prism.cpp` encode path:
- If `flags & R2_HYBRID_FLAG` and ACODER_V2: use `acoder_encode_plane_hybrid` instead of `acoder_encode_plane_v2`
- Pass T_ESC from a new encode option (default 8)

In `prism.cpp` decode path:
- If `flags & R2_HYBRID_FLAG` and ACODER_V2: use `acoder_decode_plane_hybrid` instead of `acoder_decode_plane_v2`

**Step 6: Container flag**

In container encode:
- If hybrid mode: set `flags |= R2_HYBRID_FLAG` (0x02, alias LZP bit1)

In container decode:
- After parsing flags, check `flags & R2_HYBRID_FLAG` + ACODER_V2 to select decode path

**Step 7: CLI integration**

Add to `main.cpp`:
- `--r2-hybrid` flag (sets T_ESC=8 by default, --r2-hybrid-4/--r2-hybrid-16 variants)
- `probe-r2-hybrid` command: measure hybrid vs ZFF on pinned quad
- `self-check-r2-hybrid` command: prove both gate directions

**Step 8: VB rails in probe_sandbox.sh**

Add `--r2-hybrid` mode with:
- VB-R2-HYBRID-ROUNDTRIP: byte-exact encode/decode on pinned quad
- VB-R2-TOKEN-FIDELITY: verify zero freq > sign freq on kodim01
- VB-R2-NET-AUDIT: NET = payload + model overhead
- VB-R2-MODEL-OVERHEAD: model memory <= 0.01 bpp per sample

**Step 9: Unit tests**

Extend `test_acoder.cpp` with:
- Hybrid-uint encode/decode round-trip for residuals {-10..10}
- T_ESC={4,8,16} parameterized tests
- Binary tree path correctness for all tokens
- Model memory audit

**Step 10: Self-check**

Failable self-check on pinned quad (kodim01/05/13/19):
- Proves PASS direction: hybrid encode -> decode reproduces source
- Proves FAIL direction: single-bit flip in payload causes decode mismatch

**Exit conditions for R2-0:**
- [ ] All VB rails green
- [ ] Dated reference CSV committed
- [ ] Spec addendum 24 already committed (DONE by Researcher)
- [ ] Byte-exact round-trip on pinned quad
- [ ] Self-check passes both directions

### 3.2 Phase: R2-1 Measurement (Hybrid vs ZFF)

**Test frames:**
- FRAME-ZFF: Prism v1 production path (encode_residual_v2, ZFF binarization)
- FRAME-HYB: Route 2 hybrid-uint (encode_residual_hybrid, T_ESC sweep)

**Parameters:** T_ESC in {4, 8, 16}, effort levels 3/5/7.

**Primary gate:** FRAME-HYB median NET beats FRAME-ZFF median NET by >= +0.5% on the quad (per I10).

**Sub-gates:**
- R2-1a: model overhead <= 0.01 bpp per sample
- R2-1b: no image regresses by more than -1.0%
- R2-1c: decode time <= 1.5x v1 decode time

### 3.3 Phase: R2-2 Predictor Factorial (conditional on R2-1 PASS)

**Test frames:**
- FRAME-MED-HYB: MED + hybrid-uint (R2-1 winner)
- FRAME-GAP-HYB: GAP + hybrid-uint
- FRAME-W-HYB: W ensemble + hybrid-uint

**Gate:** Best non-MED family >= +1.50% median NET over MED under hybrid-uint.

This is the CRITICAL measurement: if GAP/W beat MED under hybrid-uint but NOT under ZFF, the ZFF pathology is confirmed and B3 is reopened.

### 3.4 Phase: R2-3 Composition + Projection

Compose all R2-series winners per image by real NET bytes. Project corpus via formula 18.5 VERBATIM against committed e1 CSV.

---

## 4. What Route 2 is NOT

- NOT a path to M3 (gain is ~0-4% at best, 14.48% needed)
- NOT a replacement for Route 3's static ANS (different mechanism)
- NOT a new entropy coding backend (uses v1's ACoderV2)
- NOT a guarantee that B3 is reopenable (T3 negative result may repeat)

Route 2 IS:
- A measurement of whether the ZFF pathology is real and quantifiable
- An infrastructure investment (hybrid-uint tokenization for future use)
- A prerequisite for composition with Routes 1/3
- A low-risk, high-confidence measurement (same coder as v1)

---

## 5. Decision Tree

| Outcome | Consequence |
|---|---|
| R2-0 fails (harness broken) | Fix and re-run; no verdict until green |
| R2-1 fails (< +0.5% NET) | Hybrid-uint offers no gain; report ledger, owner decides |
| R2-1 passes, R2-2 bar(i) met | B3 reopened; proceed to R2-3 |
| R2-1 passes, R2-2 bar(i) not met | B3 stays closed; R2-3 with MED only |
| R2-3 passes M2 but not M3 | Report ledger; owner decides composition |
| R2-3 misses M2 | Report full ledger; owner decides next route |

---

## 6. Test Matrix

### Unit Tests

| Test | File | What it proves |
|---|---|---|
| `test_acoder_hybrid.cpp` | New | Hybrid-uint encode/decode round-trip, T_ESC parameterization |
| `test_hybrid_uint_tree.cpp` | New | Binary tree path correctness for all T_ESC values |
| `test_hybrid_uint_zigzag.cpp` | New | Zigzag fold/unfold round-trip |

### Integration Tests

| Test | File | What it proves |
|---|---|---|
| `test_r2_roundtrip.cpp` | New | Full R2 pipeline round-trip on pinned quad |
| `test_r2_fuzz.cpp` | New | Randomized round-trip + corruption rejection |
| `test_r2_compare_v1.cpp` | New | R2 and v1 produce different bitstreams, same decoded output |

### Benchmark Tests

| Script | What it proves |
|---|---|
| `benchmarks/probe_sandbox.sh --r2-hybrid` | R2 hybrid measurement |
| `benchmarks/bench_gate.sh` | Final dual-unit gate check |

---

## 7. Module Map for Builder

### Phase 1: R2-0 Scaffolding

1. Add `ACModelsHybrid` to `acoder.h`
2. Implement token tree helpers in `acoder.cpp`
3. Implement `encode_residual_hybrid` / `decode_residual_hybrid` in `acoder.cpp`
4. Implement `acoder_encode_plane_hybrid` / `acoder_decode_plane_hybrid` in `acoder.cpp`
5. Wire hybrid path into `prism.cpp` (flag bit1 alias LZP dispatch)
6. Add container flag handling in `container.cpp`
7. Add `--r2-hybrid` CLI flag and probe/self-check commands in `main.cpp`
8. Add VB-R2 rails to `probe_sandbox.sh`
9. Add unit tests in `test_acoder.cpp`
10. Run self-check on pinned quad
11. Commit dated reference CSV

### Phase 2: R2-1 Measurement

1. Implement FRAME-ZFF and FRAME-HYB test frames
2. Sweep T_ESC in {4, 8, 16} and effort {3, 5, 7}
3. Measure NET on pinned quad
4. Check primary gate (>= +0.5% NET improvement)
5. Check sub-gates R2-1a, R2-1b, R2-1c
6. Commit results CSV
7. Run failable self-check

### Phase 3: R2-2 Predictor Factorial (conditional)

1. Implement FRAME-MED-HYB, FRAME-GAP-HYB, FRAME-W-HYB
2. Check bar(i) (>= +1.50% NET improvement)
3. Commit results CSV

### Phase 4: R2-3 Composition (conditional)

1. Compose all R2-series winners per image
2. Project corpus via formula 18.5
3. Check proceed-to-format threshold

---

- the Architect
