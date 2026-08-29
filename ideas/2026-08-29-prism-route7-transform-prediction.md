# Blueprint: Route 7 - In-Subband Value Prediction and Adaptive Transform (issue #130)

- **Author:** the Architect
- **Date:** 2026-08-29
- **Precedes:** `prism/docs/research-route7-transform-prediction.md` (Dr. Mob, the Researcher; `{"action":"architect"}` handoff).
- **Build branch:** `opencode/issue130-20260829211143` (PR #185, `Refs #130`).
- **Status:** BLUEPRINT DELIVERED. Ready for Builder (`{"action":"build"}`).
- **Binding gates (restated, units mandatory):** M2 summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166); M3 summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885). Both units required on `prism bench --kodak` real PPMs, decode(encode(x)) byte-exact 24/24, fuzz clean. `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never `Closes #130` while gates remain open).

---

## 1. Summary

Route 7 attacks the SECOND, independent axis of the residual floor on top of the
X6b baseline (3.2175/sample, 9.6525 summed): **value decorrelation**. Prism's
`BitplaneCoder` is a context model (it predicts `P(0)` of a coefficient bit from
neighbour magnitudes) but never forms a scalar estimate `c_hat` of the coefficient
*value* and codes the residual `r = c - c_hat` (JXL's predictor transform). R7-A
inserts an in-subband MED/gradient value predictor inside each wavelet subband.
R7-B chooses the wavelet filter (5/3 vs 9/7 vs Haar) per decomposition level by
real coded bytes. Both are **table-free** (I12), so they sidestep the
table-economics law that killed 18 earlier mechanisms, and they compose with R6-D
(cold-start removal, Axis A) toward M3.

This blueprint specifies the module boundaries, data structures, dispatch wires,
and test matrix for the Builder. No application code is written here (architect
phase); every constant below is pinned for the Builder to implement verbatim.

---

## 2. Deliverables

1. `R7A_FLAG` / `R7B_FLAG` residual_mode bits + per-plane/subband predictor and
   filter tags in `WaveletHeader`.
2. `InSubbandPredictor` (MED + gradient) over same-subband raster neighbours, with
   a byte-exact round-trip self-check.
3. `frame_wavelet_encode_r7` / decode dispatch (R7-A residual path, R7-B per-level
   filter) reusing the existing `frame_wavelet_encode_residual` machinery.
4. `prism wavelet-r7` and `prism bench-r7` CLIs (dual-unit CSV + byte-exact + fuzz),
   mirroring `wavelet-r6b` / `bench-r6b`.
5. `tests/unit/test_r7.cpp` registered in `prism/CMakeLists.txt`.
6. Measurement through R7-0 -> R7-4 with the pre-registered gates (R7-1 held-out
   kodim02/07/17/21 median NET <= -1.5% vs X6b BEFORE the full 24-image run).

---

## 3. Why (honest diagnosis)

Measured floor X6b = 3.2175/sample, 9.6525 summed. The Route 4 pipeline does exactly
two decorrelation steps: (1) reversible integer wavelet (`WaveletLift::forward`,
`wavelet.cpp:254`) and (2) a bitplane rANS coder with a per-context EMA that
predicts `P(0)` from neighbour magnitudes (`LearnedModel::predict`, `learned_ctx`).
Step 2 is a **context** model, not a **value** model: it never removes the local
mean of the coefficient. JXL's predictor transform (and LOCO-I / CALIC / JPEG-LS)
removes that mean for free (zero side-info, recomputed from reconstructed
neighbours at both ends), sharpening the residual so even the retained EMA codes
fewer bits. R7-A is the Prism realization of exactly that free lever.

R7-A composes with R6-D (Axis A) on disjoint entropy sources: R6-D kills EMA
cold-start waste; R7-A kills value-decorrelation waste. Neither alone reaches M3;
together they are the honest M3 path. M2 is expected to clear once R7-A lands
(R7-A is table-free, so it cannot trip I12).

---

## 4. How It Works

### 4.1 R7-A is a residual path, structurally identical to X6a but with a different predictor

The existing FRAME-WAVELET-RESIDUAL path (`frame_wavelet_encode_residual`,
`wavelet_container.cpp:312`) computes `R[si] = c - c_hat` in a **pre-pass** using
`CoefficientPredictor` (a cross-subband wavelet-tree predictor), bitplane-codes `R`,
and the decoder applies `c = c_hat + r` in a **post-pass** (`wavelet_container.cpp:835`).
R7-A reuses this exact two-pass framing but replaces `CoefficientPredictor` with a
new `InSubbandPredictor` that predicts each coefficient from its **same-subband
raster 4-neighbourhood** (W, N, NW, NE), not the wavelet tree.

**Encode pre-pass (per subband, raster order):** for coefficient at `(x,y)`,
`c_hat = MED(c_W, c_N, c_NW, c_NE)` from the *true* already-visited neighbours of
the same subband; store `R[(x,y)] = c[(x,y)] - c_hat`. Then bitplane-code `R` with
the existing `BitplaneCoder::encode` (unchanged: it just codes an integer's
bitplanes; it does not care that the integer is a residual).

**Decode post-pass (per subband, raster order):** bitplane-decode `R` byte-exact;
then `c[(x,y)] = MED(reconstructed c_W, c_N, c_NW, c_NE) + R[(x,y)]`. Because the
post-pass runs in raster order *after* `R` is fully decoded, every neighbour of
`(x,y)` is already finalized, so `MED(reconstructed neighbours)` equals
`MED(true neighbours)` by induction, and `c` reconstructs byte-exact.

**Why this is byte-exact and why the "inside the bitplane loop" wording is resolved:**
the research phrasing "inside the BitplaneCoder loop" describes the *effect* (the
coder codes `r`, not `c`). The bitplane coder processes coefficients bitplane by
bitplane high-to-low, so a neighbour's LSB (its last bitplane) is only decoded
alongside the current coefficient. Therefore `c_hat` cannot be formed mid-walk; it
is formed in a raster post-pass once `R` is fully decoded, exactly as X6a does.
This is the faithful, byte-exact realization of the researcher's intent and matches
the Reviewer's F3 correction (`r = c - c_hat` in value domain, not bitwise
`c_p - c_hat_p`).

**MED definition (JPEG-LS, LOCO-I):** `pred = W + N - NW; if (pred < min(W,N))
pred = min(W,N); else if (pred > max(W,N)) pred = max(W,N);` where `W=c_W, N=c_N,
NW=c_NW`. **Gradient variant:** `pred = clamp(W + N - NW, ...)` (JXL gradient).
Borders: mirror/symmetry (use the coefficient itself or a reflected neighbour when
a neighbour is outside the subband), identical at encode and decode. `NE` is
`(x+1, y-1)`; all four neighbours are raster-earlier than `(x,y)` so they are
finalized first.

### 4.2 R7-B: per-decomposition-level filter selection by real bytes

`WaveletParams` (`wavelet.h:31`) today carries a single `filter` used for every
level of `WaveletLift::forward`/`inverse`. The lift is inherently per level (each
decomposition level lifts rows then columns, producing HL/LH/HH), so the natural
selection granularity is **per decomposition level**, not per individual subband.

- Extend `WaveletParams` with `std::vector<WaveletFilter> per_level_filter` (empty =
  legacy single `filter` for all levels). `WaveletLift::forward`/`inverse` lift level
  `L` with `per_level_filter.empty() ? p.filter : per_level_filter[L]`.
- The chosen filter per level is transmitted as a 2-bit tag in the header
  (`WaveletHeader::sub_filter`, one `uint8_t` filter id per subband in forward()
  order; decode maps subband `level` -> tag). Present only when `R7B_FLAG` is set.
  Overhead = `levels` * 2 bits (~10 bits/image) << 0.001 bpp.
- **C3 trial hook (honest, I11):** for each level independently, trial-encode the
  whole frame under Haar / LeGall53 / Reversible97, measure the **real rANS payload
  bytes** (NOT an L1/energy proxy), and keep the per-level winner that minimizes
  total bytes. Pick the global combination by bytes, not by a pooled proxy, to
  avoid the C3-vs-pooled-scoring trap that inflated earlier margins.

### 4.3 R7-C (reserve, not in first Builder pass)

Per-image integer 3x3 colour matrix (YCoCg-R + D4c RCT) chosen per image by coded
bytes. Reuses the existing D4c trial framework. ONLY wired if R7-A + R7-B fall short
of M3 after R7-3 (post-stack with R6-D). Marked reserve; no code this pass.

---

## 5. Module Breakdown

### 5.1 `prism/include/prism/codec/wavelet_container.h` (edit)

Add the residual_mode flag constants after `R6C_FLAG` (line 21):

```cpp
constexpr uint8_t R7A_FLAG = 32; // bit 5: in-subband MED/gradient residual predictor
constexpr uint8_t R7B_FLAG = 64; // bit 6: per-level adaptive wavelet filter selection
// Overflow guard: residual_mode is uint8_t (8 bits). Bits used so far:
// 1 (RESIDUAL) | 2 (ROUTE5) | 4 (R6B) | 8 (R6C) | 32 (R7A) | 64 (R7B) = 111.
// Bit 7 (128) is the last free bit; the NEXT extension requires widening
// residual_mode to uint16_t. Assert uniqueness so a reused bit fails to compile.
static_assert((R7A_FLAG & (1u|2u|4u|8u|64u)) == 0, "R7A_FLAG collides");
static_assert((R7B_FLAG & (1u|2u|4u|8u|32u)) == 0, "R7B_FLAG collides");
static_assert(R7A_FLAG <= 128 && R7B_FLAG <= 128, "residual_mode overflow; widen to uint16_t");
```

Extend `WaveletHeader` (after `cluster_hist`, line 74):
- `uint8_t r7a_pred = 0;` // 0=MED, 1=GRADIENT (predictor kind for the R7-A residual)
- `std::vector<uint8_t> sub_filter;` // per-subband filter id (forward() order), present iff R7B_FLAG

Add frame entry points (after `frame_wavelet_encode_r6c`, line 135):
```cpp
std::vector<uint8_t> frame_wavelet_encode_r7(const Raster& raster, WaveletFilter filter,
                                             int levels, size_t& net_out,
                                             bool use_gradient = false,
                                             bool adaptive_filter = false);
```
Decode is handled by the existing `frame_wavelet_decode` dispatch (section 5.4).

### 5.2 `prism/include/prism/codec/predictor.h` + `predictor.cpp` (edit)

Add a new predictor class (sibling to `CoefficientPredictor`):

```cpp
// R7-A in-subband value predictor (JXL predictor transform, lifted to each
// wavelet subband). Predicts coefficient VALUE from the 4 already-reconstructed
// SAME-subband raster neighbours (W, N, NW, NE). Zero side-info: the prediction
// is recomputed from reconstructed state at encode and decode, so the rANS stream
// round-trips byte-exact. MED = LOCO-I median edge detector; GRADIENT = JXL.
struct InSubbandPredictor {
    enum class Kind : uint8_t { MED = 0, GRADIENT = 1 };
    static int32_t predict(const std::vector<int32_t>& coeffs, int w, int h,
                           int x, int y, Kind k);
    // Raster-order full-subband residual: R[(x,y)] = c[(x,y)] - predict(...).
    static void residual(const std::vector<int32_t>& c, int w, int h,
                         Kind k, std::vector<int32_t>& out);
    // Inverse post-pass: c[(x,y)] = predict(reconstructed c neighbours) + R[(x,y)].
    static void reconstruct(const std::vector<int32_t>& r, int w, int h,
                            Kind k, std::vector<int32_t>& out);
    // VB rail: reversible_for_all_inputs over the picked Kind (mirror X6a guard).
    static bool reversible_for_all_inputs(Kind k);
};
```

`predict` reads raster-earlier neighbours; at borders it mirrors (uses the
coefficient itself / reflected index). `residual` runs in raster order so each
neighbour is already visited. `reconstruct` runs in raster order so each neighbour
is already finalized. Both use the identical `predict`, guaranteeing byte-exact
`reconstruct(residual(c)) == c` for every input (proven by induction on raster
index; asserted by `reversible_for_all_inputs`).

### 5.3 `prism/src/codec/wavelet_container.cpp` (edit)

- **`frame_wavelet_encode_r7`** (new): mirror `frame_wavelet_encode_residual`
  (lines 312-417) but:
  - Use `InSubbandPredictor::residual` per subband (MED or GRADIENT by
    `use_gradient`) instead of `CoefficientPredictor::predict`.
  - If `adaptive_filter`: run the C3 trial (section 4.2) to set
    `WaveletParams::per_level_filter` and record `hdr.sub_filter` (per-subband
    filter id). Otherwise `hdr.sub_filter` empty.
  - Set `hdr.residual_mode = (uint8_t)(1u | R7A_FLAG | (adaptive_filter ? R7B_FLAG : 0u))`.
  - Set `hdr.r7a_pred = use_gradient ? 1 : 0`.
  - Keep the X6c hyperprior scale trial (optional, neutral by default) as in
    `frame_wavelet_encode_residual`.
- **`frame_wavelet_decode` dispatch** (lines 797-830 lambda): after the existing
  R6B/R6C/ROUTE5 branches, when `hdr.residual_mode & R7A_FLAG`, decode the plane
  subbands with `coder.decode(...)` (the standard bitplane decoder; the payload is
  `R`), then run the R7-A post-pass: `InSubbandPredictor::reconstruct(R, w, h,
  Kind(hdr.r7a_pred), recon)` in raster order to recover `c`. For `R7B_FLAG`,
  build `WaveletParams::per_level_filter` from `hdr.sub_filter` (map subband
  `level` -> filter id) and pass it to `lift.inverse`.
- **`wavelet_container_encode`/`decode`** (lines 64-217): when `R7B_FLAG` set,
  serialize `hdr.sub_filter` (one `uint8_t` filter id per subband in forward()
  order) right after the `sub_scale_code` block (before R6B/R6C blocks, guarded by
  `R7B_FLAG`). Mirror on decode.

### 5.4 `prism/src/codec/wavelet.cpp` (edit)

Extend `WaveletLift::forward`/`inverse` to accept per-level filters:
- `forward` already takes `const WaveletParams& p`. When `p.per_level_filter` is
  non-empty, lift decomposition level `L` (0-based, the LL is level 0 and is not
  re-lifted) with `p.per_level_filter[L]`. The existing `lift_rows_cols` /
  `unlift_rows_cols` already take `WaveletFilter f`, so only the per-level dispatch
  changes. `inverse` mirrors it. `reversible_for_all_inputs` must assert
  reversibility for every per-level filter combination used.

### 5.5 `prism/src/cli/main.cpp` (edit)

Mirror `wavelet-r6b` (lines 4687-4724) and `bench-r6b` (lines 4842-4917):
- `cmd == "wavelet-r7"`: parse `--filter`, `--levels`, `--gradient`,
  `--adaptive-filter`; call `frame_wavelet_encode_r7`; print bytes/bpp +
  `ROUNDTRIP=OK/FAIL` (return 1 on fail).
- `cmd == "bench-r7"`: dual-unit CSV (`image,net_bytes,bpp_net_per_sample,bpp_summed,
  roundtrip`) feeding `bench_gate.sh`; parse `--gradient` / `--adaptive-filter`;
  report M2/M3 gates in both units; return 1 on any roundtrip fail.

### 5.6 `prism/CMakeLists.txt` + `prism/tests/unit/test_r7.cpp` (new)

Register `tests/unit/test_r7.cpp` in the `prism_tests` source list (after
`test_r6c.cpp`, line 121). Test matrix in section 6.

---

## 6. Test Matrix

`tests/unit/test_r7.cpp` (mirrors `test_r6b.cpp` / `test_r6c.cpp` style):

| ID | Test | Acceptance |
|---|---|---|
| T1 | `InSubbandPredictor::reversible_for_all_inputs` MED and GRADIENT over synthetic + random subbands | true for 1000 random int32 buffers |
| T2 | Full-frame `frame_wavelet_encode_r7` -> `decode` round-trip (MED) on RGB8/16, multi-size | byte-exact (`dec == r`) |
| T3 | Full-frame round-trip (GRADIENT) | byte-exact |
| T4 | R7-B `adaptive_filter` round-trip with mixed per-level filters | byte-exact; `hdr.sub_filter` decodes to the chosen tags |
| T5 | `wavelet-r7` CLI smoke (encode+decode+roundtrip) | ROUNDTRIP=OK, non-empty bytes |
| T6 | No-worse property: on natural Kodak images, R7-A NET <= baseline `frame_wavelet_encode` bytes (the honest >= -1.5% marginal expectation); assert `<= baseline * 1.005` to catch regressions | pass |
| T7 | Determinism: two encodes of the same raster are byte-identical | pass |
| T8 | Fuzz: `fuzz_gate.sh` against `wavelet-r7` on 1000 random rasters, decode(encode(x)) == x | clean |
| T9 | `bench-r7` on held-out kodim02/07/17/21 emits CSV; median NET <= -1.5% vs X6b (3.2175) (R7-1 gate, pre-registered) | pass before full run |

Integration with `bench_gate.sh`: `bench-r7 --kodak DIR --out r7.csv` then
`bench_gate.sh --gate-summed 9.498 --gate-per-sample 3.166` for R7-3 (M2) and
`--gate-summed 8.655 --gate-per-sample 2.885` for R7-4 (M3, post R6-D stack).

---

## 7. Program, gates, and cascade (from research, binding)

| Phase | Deliverable | Primary gate | Sub-gates |
|---|---|---|---|
| R7-0 | Wire R7-A MED predictor (R7A_FLAG + symmetry + byte-exact self-check) | decode(encode(x)) byte-exact 24/24 | zero container bytes |
| R7-1 | R7-A alone vs X6b (tune/debug on kodim01/05/13/19) | median NET <= -1.5% vs X6b (3.2175) on held-out kodim02/07/17/21 (binding) | same |
| R7-2 | R7-B per-level filter selection by bytes | additional >= -0.5% over R7-1 | overhead <= 0.001 bpp |
| R7-3 | Compose R7-A+R7-B; full Kodak-24 dual-unit | summed <= 9.498 AND per-sample <= 3.166 (M2) | byte-exact 24/24, fuzz clean |
| R7-4 | Stack with R6-D for M3 | summed <= 8.655 AND per-sample <= 2.885 (M3) | byte-exact 24/24, fuzz clean |

**Cascade (honest, no re-tuning to force a pass):**
- R7-1 FAIL: value-decorrelation axis exhausted on this residual -> STOP-AND-REPORT;
  escalate to Owner for Route 8 (neural/learned transform) on authorization only.
- R7-3 M2 PASS, R7-4 M3 FAIL: M2 genuinely declared PASS (first in lab history); M3
  PENDING; attempt R7-C stacking then R6-D composition, then escalate for Route 8.
- R7-4 PASS: both gates in both units -> format-stable v3 PR `Refs #130`.

---

## 8. Complexity

- **Per coefficient (R7-A):** 4 neighbour reads + 1 MED (or gradient) + 1 subtract,
  then the existing bitplane/EMA path. Negligible vs the MLP forward (~1500 MACs)
  which R7-A does NOT require. Decode post-pass is O(1) per coefficient, at most as
  costly as today.
- **R7-B selection:** `levels * 3` forward/inverse wavelet passes at trial time
  (offline, not in the bitstream decode); winner tag transmitted as 2 bits/level.
- **Memory:** no new persistent tables; `InSubbandPredictor` needs only the 4
  already-cached raster neighbours. `per_level_filter` is `levels` entries.
- **Offline cost:** R7-A/R7-B need no training; R7-B trial-encode is seconds in-repo.

---

## 9. Honesty note

Even the full R7 + R6-D stack is at risk for M3 (2.885) on the conservative line
(3.00-3.10). The ~10% gap is larger than any single free lever, which is why this
blueprint composes two independent, table-free axes rather than promising one. No
success claim leaves the lab without a fresh, reproducible measurement stated in
BOTH units. M2 is expected to clear; M3 is the real target and may require R7-C and
Route 8.

- the Architect
