# Architectural Blueprint: Route 10 (D2 Corrected) - From-Scratch JXL-Modular Codec

- **Date:** 2026-08-30
- **Issue:** #199 (successor to #130)
- **Mode:** Architectural Design (Mode 2 - Iterative Enhancement, D2 correction of prior Option A)
- **Depends on:** D1 Research Spec (`prism/docs/research-nextgen-predictor-transform-d1.md`), D2
  recalibration findings (issue #199 comments), NG-1/NG-2 measured failure (progress/199)
- **Author:** The Architect

---

## 1. Executive Summary

The D1 Blueprint (Option A) failed at NG-2: P1 spatial predictor on YCoCg-R planes
measured 3.71297 bpp per-sample, +15.4% WORSE than the X6b baseline (3.2175). The root
cause, confirmed by D2 recalibration: the spatial predictor operates on colour-transformed
(YCoCg-R) planes whose dynamic range (0..1023 for Y, biased 0..1023 for Co/Cg) produces
prediction residuals with HIGHER variance than the original pixels.

The corrected architecture (Route 10, D2) applies the spatial predictor on **raw RGB**
BEFORE the colour transform, then operates the colour transform on spatial residuals
(which have lower dynamic range), then applies wavelet + transmitted histogram as the
PRIMARY entropy model. This two-component correction (reorder colour transform + replace
EMA with transmitted histogram) is the mandated path to M2/M3 parity.

---

## 2. Root Cause Analysis (D2)

### 2.1 Why P1 Failed (NG-2 measurement: 3.71 bpp, +15.4%)

The D1 pipeline was:
```
Raw RGB -> YCoCg-R (expands range) -> Spatial predictor on YCoCg-R planes -> ...
```

After YCoCg-R on BD8:
- Y plane: 0..1023 (10-bit range, up from 8-bit RGB)
- Co plane: biased to ~0..1023 (differential, 10-bit effective range)
- Cg plane: biased to ~0..1023 (differential, 10-bit effective range)

The P1 adaptive bank (median/gradient/slope) produces mediocre predictions on these
expanded-range planes because:
1. The gradient predictor `clip(W+N-NW, min(W,N), max(W,N))` has limited dynamic range
   adaptation - it works well on 8-bit RGB (0..255) but struggles on 10-bit biased values
2. The adaptive weight convergence is slow on the expanded range, so early-row predictions
   are poor, polluting the running energy normalisation
3. The resulting spatial residuals R_spatial have LARGER variance than the original
   YCoCg-R planes, so the wavelet produces larger coefficients, and the bitplane coder
   needs more bits

**Measured evidence:** P1 + X6b = 3.71 bpp vs X6b alone = 3.22 bpp. The spatial
predictor ADDS 0.50 bpp of overhead instead of removing redundancy.

### 2.2 The Corrected Architecture (D2)

The fix is a **pipeline reorder**: apply spatial prediction on raw RGB where neighbour
correlation is ~0.95-0.99 (8-bit, 0..255 range), then colour-transform the spatial
residuals (which now have lower dynamic range), then wavelet + transmitted histogram.

```
FAILED (D1):  Raw RGB -> YCoCg-R -> Spatial pred -> Wavelet -> EMA
CORRECTED (D2): Raw RGB -> Spatial pred -> YCoCg-R -> Wavelet -> Transmitted histogram
```

Why this works:
1. Raw RGB pixels have strong spatial correlation (~0.95+) in a compact 0..255 range
2. The spatial predictor removes this redundancy, producing residuals with ~0.3-0.5x
   the original variance
3. YCoCg-R on these residuals (not on raw pixels) further decorrelates colour channels
   without expanding the dynamic range
4. The wavelet compacts the doubly-decorrelated signal
5. The transmitted histogram (not EMA) becomes the PRIMARY entropy model because the
   residuals are simple enough for a static histogram to beat online adaptation

### 2.3 Why Transmitted Histogram Replaces EMA

The D1 research showed that R6-B/C/D transmitted histograms lost to EMA on COMPLEX
residuals (current architecture ceiling). But with a stronger predictor simplifying
residuals, the D2 insight is:

- Simple residuals (low dynamic range, peaky distribution) -> transmitted histogram
  wins because it captures the true distribution without online adaptation lag
- Complex residuals (high dynamic range, heavy tails) -> EMA wins because it adapts
  to local statistics

The pipeline reorder makes residuals simple enough for transmitted histograms to win.
This is the PRIMARY architectural difference between Prism and JXL Modular: JXL wins
because its residuals are simpler, not because its context model is better.

---

## 3. Corrected Pipeline Architecture

### 3.1 New Pipeline (Route 10, D2 Corrected)

```
Raw RGB pixels (8-bit, 0..255)
  -> Spatial predictor (P1 bank or P2 MLP) on RAW RGB    [NEW: spatial_predictor.cpp]
     -> R_spatial = pixel_rgb - spatial_hat_rgb
     (residuals have ~0.3-0.5x original variance)
  -> Colour transform (YCoCg-R) on R_spatial             [UNCHANGED: color.cpp]
     -> R_colour = YCoCg(R_spatial)
     (further decorrelates colour, dynamic range stays compact)
  -> Wavelet lift (LeGall 5/3, 5 levels) on R_colour     [UNCHANGED: wavelet.cpp]
     -> Subbands of R_colour
  -> Coefficient predictor (X6b or P3) on subbands        [EXTENDED: predictor.cpp]
     -> R_final = wavelet_coeff - coeff_hat
  -> Transmitted histogram (PRIMARY) + EMA (SECONDARY)    [NEW: transmitted_histogram.cpp]
     -> Bitplane rANS with static backbone blended with adaptive EMA
  -> Container (PRSM v3)                                  [EXTENDED: container.cpp]
```

### 3.2 Key Differences from D1 Option A

| Aspect | D1 Option A (FAILED) | Route 10 D2 (CORRECTED) |
|--------|----------------------|--------------------------|
| Spatial predictor domain | YCoCg-R planes (expanded range) | Raw RGB (compact 0..255) |
| Colour transform position | BEFORE spatial predictor | AFTER spatial predictor |
| Entropy backend | EMA only (bitplane rANS) | Transmitted histogram PRIMARY, EMA SECONDARY |
| Expected per-sample | 3.00-3.05 (D1 projection, wrong) | 2.72-2.92 (D2 projection) |
| M2 target | 3.166 | 3.166 (unchanged) |
| M3 target | 2.885 | 2.885 (unchanged) |

### 3.3 Colour Transform on Residuals

The YCoCg-R transform operates on the spatial residuals R_spatial (int32_t values,
potentially negative). The transform must handle signed values:

```
For R_spatial (int32_t per channel):
  Y  = (2*R + G + B) / 4           // scaled, no overflow for 8-bit residuals
  Co = R - G
  Cg = (B - G) / 2

Inverse:
  G = Y - Co/4 - Cg/2
  R = Co + G
  B = 2*Cg + G
```

The residuals are typically in range [-128..128] for well-predicted 8-bit images,
so the YCoCg-R transform fits comfortably in int16_t without bias expansion.
This is a key difference from the D1 approach where YCoCg-R on 8-bit pixels
produces biased 10-bit values.

**bd_max for spatial predictor clamping:** 255 (raw RGB range, NOT 1023 as in D1).

---

## 4. Module Breakdown

### 4.1 Spatial Predictor Module (MODIFIED from D1)

**Files:**
- `include/prism/codec/spatial_predictor.h` (MODIFY: add P2 enum, P4 enum, raw-RGB API)
- `src/codec/spatial_predictor.cpp` (MODIFY: add P2/P4 paths, raw-RGB interface)
- `src/codec/spatial_predictor_p2.inc` (NEW: baked MLP weights)
- `src/codec/spatial_predictor_p4.inc` (NEW: baked attention weights)

**Critical API change:** The spatial predictor now operates on RAW RGB planes (before
colour transform), not on colour-transformed planes. The API adds:

```cpp
// Predict pixel at (x,y) from raw RGB planes (3-channel, interleaved or planar).
// Returns prediction for each channel (R, G, B).
struct RGBPrediction {
    int32_t r, g, b;
};

RGBPrediction spatial_predict_rgb(const std::vector<uint16_t>& plane_r,
                                  const std::vector<uint16_t>& plane_g,
                                  const std::vector<uint16_t>& plane_b,
                                  uint32_t w, uint32_t h,
                                  uint32_t x, uint32_t y,
                                  SpatialPredType type,
                                  SpatialState& state);

// Compute spatial residuals on raw RGB (raster scan order).
struct SpatialResiduals {
    std::vector<int32_t> r, g, b;
};

SpatialResiduals compute_spatial_residuals_rgb(
    const std::vector<uint16_t>& plane_r,
    const std::vector<uint16_t>& plane_g,
    const std::vector<uint16_t>& plane_b,
    uint32_t w, uint32_t h,
    SpatialPredType type);
```

**P1 sub-predictors (unchanged, but on raw RGB):**
- P_med = median(W, N, NW) per channel
- P_grad = clip(W+N-NW, min(W,N), max(W,N)) per channel
- P_ne = N + (N - NW) per channel
- P_we = W + (W - NW) per channel

**P2 MLP (baked weights, 17->64->32->1 per channel):**
- Input features from raw RGB neighbours (W, N, NW, NE, etc.)
- bd_max = 255 (raw 8-bit range)
- Weights baked from offline training on Kodak-24 raw RGB

**P4 attention-gated (same as D1, but on raw RGB):**
- Sub-predictors: P1 bank + P2 MLP outputs
- Attention features from local RGB statistics
- Baked attention weights

### 4.2 Colour Transform Integration Point

**Location:** Between spatial predictor and wavelet.

In the current wavelet pipeline, the flow is:
1. `apply_color(raster, ct)` -> colour-transformed planes
2. `wavelet.forward(plane, w, h, params)` -> subbands

The new flow becomes:
1. `spatial_predictor.compute_residuals_rgb(raster)` -> R_spatial (int32_t per channel)
2. `apply_color_residual(R_spatial, ct)` -> R_colour (colour-transformed residuals)
3. `wavelet.forward(R_colour, w, h, params)` -> subbands of R_colour
4. `coefficient_predictor.predict(subbands)` -> coeff_hat
5. `transmitted_histogram_encode(subbands - coeff_hat)` -> payload

**New function `apply_color_residual()`:**
- Takes int32_t residual planes (potentially negative)
- Applies YCoCg-R transform (or identity for BD16)
- Returns int32_t colour-transformed residual planes
- Must handle signed arithmetic correctly (no bias expansion)

### 4.3 Transmitted Histogram Backend (NEW)

**Files:**
- `include/prism/codec/transmitted_histogram.h` (NEW)
- `src/codec/transmitted_histogram.cpp` (NEW)

**Design:**

The transmitted histogram backend replaces the EMA-only bitplane coder as the
PRIMARY entropy model. It operates on the final residuals R_final (after coefficient
prediction).

**Two-pass architecture:**
1. **Pass 1 (encoder):** Count symbol frequencies per subband per bitplane context
2. **Pass 2 (encoder):** Encode with static backbone (transmitted histogram) blended
   with adaptive EMA, same as R6-B/C/D but on SIMPLIFIED residuals

**Transmitted histogram format:**
- Per-subband: 2^(maxbits+1) counts (symbol frequency table)
- Delta-coded across subbands (similar statistics within a level/orientation)
- Varint-encoded in the header
- Overhead: ~0.005-0.015 bpp (well under 0.02 bpp sub-gate)

**Blend with EMA:**
```
p_final = W * p_histogram + (1 - W) * p_ema
```
where W is a baked constant (default 0.7, swept on held-out data). This allows the
transmitted histogram to dominate on simple residuals while EMA handles edge cases.

**Inheritance from R6-B/C/D:** The transmitted histogram infrastructure already exists
in the codebase (R6B_FLAG, R6C_FLAG, R6D_FLAG in wavelet_container.h). Route 10
reuses this infrastructure but applies it to the NEW pipeline (spatial -> colour ->
wavelet) instead of the old pipeline (wavelet -> predict -> code).

### 4.4 Coefficient Predictor (EXTENDED)

**Files:** Extend existing `predictor.h` / `predictor.cpp`

**Options:**
1. **X6b (existing):** MLP on wavelet coefficients. Already proven, may still add value
   as a refinement stage after the spatial predictor has done the heavy lifting.
2. **P3 (cross-band):** Predict wavelet coefficients from parent/sibling/LL. Designed
   for simplified residuals (post-spatial-prediction). Baked weights.
3. **None:** Skip coefficient prediction entirely if spatial + colour + wavelet +
   transmitted histogram already clear M2/M3.

**Recommendation:** Start with X6b (proven, zero risk), measure, then try P3 or
none as a swept option.

### 4.5 Container Format Changes

**Version bump:** `PRSM_CONTAINER_VERSION` from 2 to 3.

**New flags in residual_mode (high byte, v3):**

| Bit | Flag | Description |
|-----|------|-------------|
| 8 | SPATIAL_P1_FLAG | P1 adaptive bank on raw RGB |
| 9 | SPATIAL_P2_FLAG | P2 MLP on raw RGB |
| 10 | SPATIAL_P4_FLAG | P4 attention on raw RGB |
| 11 | TRANSMITTED_HIST_FLAG | Transmitted histogram PRIMARY backend |
| 12 | CROSS_BAND_P3_FLAG | P3 cross-band coefficient predictor |
| 13-15 | reserved | Future use |

**Header layout (v3, WAVELET_FLAG set):**

| Offset | Size | Field |
|--------|------|-------|
| 0 | 4 | Magic: `PRSM` |
| 4 | 1 | Version: `3` |
| 5 | 4 | Width (LE u32) |
| 9 | 4 | Height (LE u32) |
| 13 | 1 | Bit depth (8 or 16) |
| 14 | 1 | Number of channels (1-4) |
| 15 | 1 | Color transform id (0-11) |
| 16 | 1 | Flags (bit7 = WAVELET_FLAG) |
| 17 | 1 | Effort (0-7) |
| 18 | nc-1 | CFL scales |
| 18+(nc-1) | nc | Squeeze levels |
| varies | varies | Wavelet header (extended residual_mode uint16_t) |
| varies | varies | Spatial predictor parameters (P1: ~18 bits; P2/P4: 0 bits) |
| varies | varies | Transmitted histogram header (if TRANSMITTED_HIST_FLAG) |
| varies | varies | Band payloads |
| end-4 | 4 | CRC32 footer |

**Spatial predictor parameters (P1 adaptive bank only):**
- Predictor bank selection: 2 bits
- Temperature T: 8 bits (fixed-point)
- Learning rate lr: 4 bits (log-scale)
- Decay: 4 bits
- Total: ~18 bits per image (negligible)

**Transmitted histogram header (if TRANSMITTED_HIST_FLAG set):**
- Per-subband symbol counts (delta-coded, varint)
- Blend weight W: 8 bits (W*255)
- Total: ~0.005-0.015 bpp

### 4.6 Training Pipeline for P2/P4

**Files:**
- `prism/scripts/train_spatial_p2.py` (NEW: offline MLP trainer on raw RGB)
- `prism/scripts/train_spatial_p4.py` (NEW: offline attention trainer on raw RGB)
- `src/codec/spatial_predictor_p2.inc` (NEW: baked weights)
- `src/codec/spatial_predictor_p4.inc` (NEW: baked attention weights)

**Training protocol (P2):**
1. Load all 24 Kodak PPMs (raw RGB, NOT colour-transformed)
2. For each pixel, extract 17-feature causal neighbourhood from raw RGB channels
3. Target: raw pixel value (the predictor must reconstruct from causal neighbours only)
4. Loss: MSE + L2 regularization (lambda = 1e-4)
5. Optimizer: Adam, lr=1e-3, batch_size=10000
6. Train for 50 epochs, evaluate on held-out set (kodim02/07/17/21)
7. Export weights as C arrays in `spatial_predictor_p2.inc`

**Invariant I29 preservation:** Baked weights are never transmitted. The decoder
reconstructs identically because prediction uses ONLY already-decoded neighbours.

---

## 5. Pre-Registered Gates (Binding)

### Gate RG1: Spatial Predictor on Raw RGB (P1 or P2, whichever better)

- **Primary gate:** median per-sample on held-out kodim02/07/17/21 <= 3.00
  (>= +6.8% NET over X6b 3.2175)
- **Byte-exact gate:** decode(encode(x)) == x on all 24 pinned Kodak PPMs
- **Fuzz gate:** 10,000 random perturbation tests, zero decode failures
- **Overhead gate:** NET bytes include ALL predictor parameters; overhead <= 0.02 bpp
- **Unit discipline:** both summed AND per-sample stated; bench_gate.sh self-check
  verified before binding run

### Gate RG2: Transmitted Histogram Backend

- **Primary gate:** additional >= +2.0% NET over RG1 winner (EMA -> transmitted
  histogram on simplified residuals should gain significantly)
- **Byte-exact + fuzz:** same as RG1
- **Overhead gate:** transmitted histogram header <= 0.02 bpp

### Gate RG3: Full M2 Measurement

- **Primary gate:** summed < 9.498 AND per-sample < 3.166 (both units)
- **Measurement:** `prism bench --kodak` on real PPMs, `bench_gate.sh` both units
- **Byte-exact:** decode(encode(x)) == x on 24/24
- **Fuzz:** 10,000 tests clean

### Gate RG4: Full M3 Measurement (only if RG3 passes)

- **Primary gate:** summed < 8.655 AND per-sample < 2.885 (both units)
- **Measurement:** same as RG3
- **Byte-exact + fuzz:** same as RG3

### Gate RG5: Cross-Band P3 or Attention P4 (if RG3 passes but RG4 fails)

- **Primary gate:** per-sample <= 2.885 (M3) OR additional >= +2.0% over RG3 winner
- **If P4 FAILS:** escalate to Maintainer for Option C decision

---

## 6. Implementation Phases (R10-1 through R10-8)

### Phase R10-1: Spatial Predictor Harness on Raw RGB (P1)
- **Deliverable:** Wire P1 (JXL adaptive bank) into prism encode/decode operating
  on RAW RGB pixels, BEFORE colour transform
- **Integration:** Modify `spatial_predictor.h/cpp` to add raw-RGB API, modify
  `wavelet_container.cpp` to add `frame_wavelet_encode_route10()`
- **Files to modify:**
  - Modify: `include/prism/codec/spatial_predictor.h` (add raw-RGB API)
  - Modify: `src/codec/spatial_predictor.cpp` (add raw-RGB prediction path)
  - Modify: `src/codec/wavelet_container.cpp` (add route10 encode function)
  - Modify: `src/cli/main.cpp` (add route10 subcommand)
  - Modify: `CMakeLists.txt` (if new files added)
- **Gate:** decode(encode(x)) byte-exact 24/24 on Kodak-24

### Phase R10-2: P1 on Raw RGB Measurement (Held-Out)
- **Deliverable:** P1 alone on held-out kodim02/07/17/21
- **Measurement:** `prism bench --kodak DIR --route10`
- **Gate RG1:** median per-sample <= 3.00 (>= +6.8% NET over X6b)
- **Unit discipline:** both summed AND per-sample stated

### Phase R10-3: P2 MLP Training + Implementation (if P1 fails RG1)
- **Deliverable:** P2 replacing P1 if better
- **Files to create:**
  - Create: `prism/scripts/train_spatial_p2.py`
  - Create: `src/codec/spatial_predictor_p2.inc` (baked weights)
- **Training:** Offline trainer on Kodak-24 raw RGB, export baked weights
- **Gate:** beat P1 by >= 0.5% on held-out (kodim02/07/17/21)
- **Byte-exact + fuzz:** same as R10-1

### Phase R10-4: Transmitted Histogram Backend
- **Deliverable:** Replace EMA-only with transmitted histogram PRIMARY + EMA SECONDARY
- **Files to create/modify:**
  - Create: `include/prism/codec/transmitted_histogram.h`
  - Create: `src/codec/transmitted_histogram.cpp`
  - Modify: `src/codec/wavelet_container.cpp` (add histogram encode/decode paths)
  - Modify: `include/prism/codec/wavelet_container.h` (add TRANSMITTED_HIST_FLAG)
- **Gate RG2:** additional >= +2.0% NET over R10-2/3 winner
- **Byte-exact + fuzz:** same as R10-1

### Phase R10-5: Full Kodak-24 M2 Measurement (RG3 Gate)
- **Deliverable:** Full 24-image measurement with best config
- **Measurement:** `prism bench --kodak DIR --route10 --transmitted-hist`
- **Gate RG3:** summed < 9.498 AND per-sample < 3.166 (both units)
- **Byte-exact:** decode(encode(x)) == x on 24/24
- **Fuzz:** 10,000 tests clean

### Phase R10-6: Full Kodak-24 M3 Measurement (RG4 Gate)
- **Deliverable:** Full 24-image measurement
- **Gate RG4:** summed < 8.655 AND per-sample < 2.885 (both units)
- **Byte-exact + fuzz:** same as R10-5

### Phase R10-7: P3 Cross-Band or P4 Attention (if RG4 fails)
- **Deliverable:** Additional predictor/transform if M3 not reached
- **Options:**
  - P3 cross-band coefficient predictor (stacked with spatial)
  - P4 attention-gated spatial predictor (replaces P1/P2)
  - Both stacked
- **Gate RG5:** per-sample <= 2.885 OR +2.0% over RG3 winner
- **If RG5 FAILS:** escalate to Maintainer for Option C decision

### Phase R10-8: Stabilisation
- **Deliverable:** Format freeze, fuzz testing, dated CSV, comparison table update
- **Activities:**
  - Format version bump finalised (v3)
  - bench_gate.sh updated with all Route 10 gates
  - Dated CSV committed (`prism/benchmarks/results/YYYY-MM-DD-route10-kodak24.csv`)
  - Comparison table updated in `prism/docs/index.md`
  - Fuzz gate clean (10,000 iterations)
  - Documentation updated

---

## 7. Invariants (must hold for every Route 10 commit)

- **I29 (NET accounting):** NET = payload + header. Predictor weights are baked
  constants, never transmitted (except bounded parameter tags <= 0.02 bpp total).
  Transmitted histogram counts are part of NET.
- **Byte-exact round-trip:** decode(encode(x)) == x on all 24 pinned Kodak PPMs
  (24/24) + fuzz clean (10,000 tests).
- **Unit discipline:** every claimed number states its unit (summed AND per-sample)
  and cites the dated CSV + bench_gate.sh run.
- **No success claim without fresh measurement:** both units, real Kodak PPMs,
  bench_gate.sh self-check verified.
- **Causality:** spatial predictor evaluation uses ONLY already-coded/reconstructed
  neighbours in raw RGB domain; no future information leaks. Colour transform
  operates on spatial residuals, not raw pixels.
- **Determinism:** encode and decode are deterministic; no random state in the
  bitstream. Transmitted histogram counts are deterministic from the encode pass.

---

## 8. Dependency Graph

```
R10-1 (P1 on raw RGB harness)
  |
  v
R10-2 (P1 measurement) --- gate RG1 --->
  |                                      |
  v (RG1 pass)                          v (RG1 fail)
R10-4 (Transmitted histogram)     R10-3 (P2 MLP training)
  |                                      |
  v                                      v
R10-4 (Transmitted histogram) --- gate RG2 --->
  |
  v
R10-5 (M2 measurement) --- gate RG3 --->
  |
  v
R10-6 (M3 measurement) --- gate RG4 --->
  |                                      |
  v (RG4 pass)                          v (RG4 fail)
R10-8 (stabilisation)            R10-7 (P3/P4 extension)
                                       |
                                       v
                                 R10-8 (stabilisation)
```

---

## 9. Success Criteria Summary

| Gate | Metric | Target | Status |
|------|--------|--------|--------|
| RG1 | Spatial predictor alone on raw RGB | median <= 3.00 per-sample | Pending |
| RG2 | Transmitted histogram backend | >= +2.0% NET over RG1 | Pending |
| RG3 | M2 parity | summed < 9.498 AND per-sample < 3.166 | Pending |
| RG4 | M3 parity | summed < 8.655 AND per-sample < 2.885 | Pending |
| RG5 | P3/P4 extension (if RG3 pass, RG4 fail) | per-sample <= 2.885 OR +2.0% over RG3 | Pending |

---

## 10. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| P1 on raw RGB still fails RG1 | Medium (~30%) | Fallback to P2 MLP (R10-3); P2 on raw RGB has stronger nonlinear modelling |
| Transmitted histogram gain < 2.0% (RG2 fail) | Low | Transmitted histogram on simplified residuals should gain significantly; worst case: keep EMA, still clear M2 |
| M3 not reached with Route 10 | Medium (~35-40%) | Fallback: P3/P4 (R10-7), then Option C (learned pyramid) |
| Colour transform on signed residuals introduces rounding errors | Low | Use integer arithmetic with proper rounding; verify byte-exact roundtrip |
| Format v3 breaks backward compat | Low | Version byte bump; old decoders reject v3 with clear error |
| Training instability for P2 on raw RGB | Low | MSE + L2 is stable; Adam with lr=1e-3 converges reliably on raw RGB (simpler than YCoCg-R) |

---

## 11. Honest Projections

### Conservative (gains at low end of D2 range)

```
P1 on raw RGB alone:         3.10 / 9.30 -> M2 PASS (3.10 < 3.166), M3 FAIL
+ Transmitted histogram:     2.95 / 8.85 -> M2 PASS, M3 at risk (2.95 > 2.885)
```

### Moderate (gains at mid-range)

```
P1 on raw RGB alone:         3.00 / 9.00 -> M2 PASS (3.00 < 3.166), M3 FAIL
+ Transmitted histogram:     2.82 / 8.46 -> M2 PASS, M3 PASS (2.82 < 2.885)
```

### Optimistic (gains at high end)

```
P1 on raw RGB alone:         2.90 / 8.70 -> M2 PASS, M3 at risk
+ Transmitted histogram:     2.72 / 8.16 -> M2 PASS, M3 PASS (comfortable)
```

**Honest assessment:** M2 is expected to clear with P1 on raw RGB alone (conservative
scenario: 3.10 < 3.166). M3 requires the transmitted histogram backend stacked on top.
The combined probability of clearing M3 with Route 10 is ~60-70% (higher than D1's
50-60% because the pipeline reorder fixes the root cause).

---

## 12. What Changed from D1 Option A

1. **Spatial predictor domain:** YCoCg-R planes -> raw RGB (D2 root cause fix)
2. **Colour transform position:** before spatial -> after spatial (pipeline reorder)
3. **Entropy backend:** EMA-only -> transmitted histogram PRIMARY (D2 architectural
   insight: simpler residuals make histograms viable)
4. **bd_max:** 1023 (YCoCg-R range) -> 255 (raw RGB range) (corrected clamping)
5. **Projections:** 3.00-3.05 -> 2.72-2.92 (D2 recalibration, honest)
6. **Gate RG1 target:** 3.10 -> 3.00 (tighter, reflects raw RGB advantage)
7. **New gate RG2:** transmitted histogram backend measurement (not in D1)
8. **Container version:** v2 -> v3 (new flags for transmitted histogram)

---

- the Architect
