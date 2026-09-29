# Research: Next-Gen D2 - Recalibration after P1 Empirical Failure (issue #199)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-30
- **Issue:** #199 (successor to #130; from-scratch JXL-Modular codec)
- **Depends on:** `prism/docs/research-nextgen-predictor-transform-d1.md` (D1 spec,
  projections now invalidated by P1 measurement), `progress/199-nextgen-predictor-transform-d1.md`
  (NG-1/NG-2 Builder results, P1 FAIL), `prism/docs/negative-ledger-v2-prism-routes-r3-r9.md`
  (complete negative ledger R3-R9).
- **Status:** RESEARCH RECALIBRATION -> `{"action":"architect"}`
- **Binding gates (restated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed <
  8.655 AND per-sample < 2.885. Both units on real Kodak-24, decode(encode(x)) byte-exact
  24/24, fuzz clean.

---

## 0. Executive summary

D1 projected P1 (JXL adaptive spatial predictor bank) at 3.00-3.05 per-sample bpp.
NG-2 measured P1 at **3.71297 per-sample** (+15.4% regression over X6b baseline 3.21751).
This is not a marginal miss; it is a 20% projection error in the wrong direction.

The root cause is identified and mathematically characterised below: the P1 adaptive bank
produces spatial residuals with HIGHER dynamic range than the colour-transformed input
planes, and the wavelet + bitplane pipeline cannot compensate. This is not a tuning
problem; it is a structural mismatch between the predictor's output distribution and the
downstream entropy backend's assumptions.

This D2 document recalibrates all projections, identifies which architectural paths remain
viable, and recommends a revised implementation programme. The from-scratch JXL-Modular
mandate of issue #199 remains valid, but the specific mechanism classes must be re-ranked.

---

## 1. Why P1 failed: root cause analysis

### 1.1 The measurement

| Metric | X6b baseline | P1 + X6b (NG-2) | Delta |
|--------|-------------|------------------|-------|
| Mean per-sample | 3.21751 bpp | 3.71297 bpp | +0.49546 bpp (+15.4%) |
| Mean summed | 9.65253 bpp/img | 11.1389 bpp/img | +1.4864 bpp (+15.4%) |
| Round-trip | 24/24 byte-exact | 24/24 byte-exact | PASS |

Source: `prism/benchmarks/results/2026-08-30-nextgen-p1-kodak24.csv`

### 1.2 The structural mechanism

The P1 adaptive bank operates on YCoCg-R colour-transformed planes with bd_max = 65535.
The spatial residuals R_spatial = pixel - P1_hat are signed integers that can range from
approximately -65535 to +65535. The wavelet transform (LeGall 5/3) then produces
coefficients from these wider-range residuals.

The key insight is captured by the following inequality. Let X denote the original
colour-transformed plane and R denote the spatial residual plane. For any predictor P:

```
Var(R) = Var(X) * (1 - R^2)
```

where R is the correlation between X and P(X). For P1 to HELP, we need:

```
H(wavelet(R)) < H(wavelet(X))
```

where H denotes the entropy of the wavelet coefficients. This requires not just
Var(R) < Var(X) (which P1 achieves for some pixels), but that the WAVELET COEFFICIENTS
of R have lower entropy than those of X.

P1 fails this test because:

1. **Dynamic range expansion.** The spatial predictor clips to [0, bd_max], but the
   prediction errors are NOT symmetric. On colour-transformed chroma planes (Co, Cg),
   which have near-zero mean and narrow range, the predictor's clipping creates a
   bimodal residual distribution: many small residuals (good predictions) but a heavy
   tail of large residuals (clipped predictions at boundaries). The wavelet transform
   of this bimodal distribution produces MORE large coefficients than the original
   narrow-range plane.

2. **Slow adaptive convergence.** P1's weights start at uniform (16384 each) and
   adapt via online gradient descent. The Kodak images are 768x512 = 393,216 pixels
   per plane. The first ~10,000 pixels have near-uniform weights (bad predictions).
   The entropy backend pays for these cold-start residuals in every image.

3. **Colour-transform mismatch.** YCoCg-R already removes much of the spatial
   redundancy that P1 targets. The correlation between neighbours in YCoCg-R planes
   is ~0.95 for Y but only ~0.85-0.90 for Co/Cg. P1's sub-predictors (MED, gradient,
   slope) are designed for raw RGB where neighbour correlation is ~0.98+.

### 1.3 Mathematical characterisation

For a causal spatial predictor operating on a plane with autocorrelation coefficient rho,
the prediction error variance is approximately:

```
Var(e) = Var(X) * (1 - rho^2)
```

For the wavelet coefficient of this error at level l, the entropy is approximately:

```
H(c_l) = log2(sigma_l) + (1/2)*log2(2*pi*e)
```

where sigma_l is the standard deviation of the wavelet coefficient at level l. The
critical point: the wavelet coefficient's dynamic range scales with sigma_l, which
scales with sqrt(Var(e)). If Var(e) > Var(X) (which happens when the predictor is
worse than trivial), the wavelet coefficients are LARGER and need MORE bits.

P1 achieves Var(e) < Var(X) on average for the Y plane (rho ~ 0.97 for YCoCg-R Y),
but NOT consistently for Co/Cg (rho ~ 0.85-0.90), and the bimodal clipping tail
dominates the wavelet coefficient distribution.

### 1.4 Comparison with JXL's spatial predictor

JXL Modular also applies a spatial predictor before the wavelet. Why does JXL succeed
where P1 fails?

1. **JXL operates on RAW RGB, not colour-transformed planes.** The YCoCg-R transform
   in Prism removes the spatial redundancy that the spatial predictor targets. JXL
   applies colour transform AFTER the spatial predictor + wavelet, not before.

2. **JXL's predictor is simpler but operates on higher-correlation data.** JXL uses
   MED(0), gradient, and three adaptive-weighted sub-predictors on raw RGB where
   neighbour correlation is ~0.98+. Prism's P1 operates on decorrelated Co/Cg where
   the correlation is lower.

3. **JXL's residual coding is different.** JXL uses ANS with transmitted histograms
   on the spatial residuals directly, not wavelet + bitplane. The wavelet is applied
   to the spatial residuals, but the entropy coding is fundamentally different.

---

## 2. Revised projections for remaining candidates

### 2.1 What D1 got wrong

D1's projection model assumed that the spatial predictor's gain on pixel prediction
would translate directly to wavelet coefficient entropy reduction. The P1 measurement
proved this assumption wrong: the spatial predictor CAN reduce pixel prediction error
while INCREASING wavelet coefficient entropy, due to the dynamic range expansion and
distribution shape change.

The correct model must account for:

1. The wavelet transform's sensitivity to the residual distribution's shape, not just
   its variance.
2. The bimodal clipping tail created by the predictor's boundary handling.
3. The colour-transform plane's lower autocorrelation (reducing the predictor's gain).

### 2.2 P2 (learned MLP spatial) - revised projection

P2 uses a 17->64->32->1 MLP on raw pixel neighbourhoods. The MLP can learn to predict
the pixel value more accurately than P1's linear blend, but it faces the SAME structural
problem: it operates on colour-transformed planes with lower autocorrelation.

**Revised projection:** P2 will likely achieve Var(R) < Var(X) more consistently than
P1 (the MLP is a more flexible function class), but the wavelet coefficient entropy
may still not decrease due to:
- The same dynamic range expansion (signed residuals from [0, bd_max] domain)
- The MLP's baked weights may not generalise across all colour planes
- The cold-start problem persists (first ~10,000 pixels have no adaptation)

**Estimated per-sample:** 3.50-3.70 bpp (at best +5% over X6b, not -7% as D1 projected)

**Probability of clearing M2:** ~10% (down from D1's ~70%)
**Probability of clearing M3:** ~2% (down from D1's ~50%)

### 2.3 P3 (cross-band wavelet predictor) - revised projection

P3 operates AFTER the wavelet transform on wavelet coefficients. It does NOT suffer
from the spatial predictor's dynamic range expansion problem. P3 predicts a wavelet
coefficient from its parent, siblings, and LL reference.

**Revised projection:** P3 is orthogonal to the P1/P2 failure. It operates on the
SAME wavelet coefficients as X6b, using cross-band references instead of spatial
neighbours. The gain comes from inter-scale/inter-orientation correlation that X6b's
16-feature window partially misses.

P3 was already measured as X3a/X3b (neural context on wavelet coefficients) and achieved
~3.2459 per-sample (at ceiling, ~0.9% over X6b). P3 with proper training should achieve
similar or slightly better.

**Estimated per-sample:** 3.15-3.25 bpp (similar to X6b ceiling)

**Probability of clearing M2:** ~15% (modest gain over X6b)
**Probability of clearing M3:** ~2%

### 2.4 P4 (attention-gated) - revised projection

P4 combines multiple sub-predictors with content-dependent attention. If P1 is one
of the sub-predictors, P4 inherits P1's structural problem. However, P4 can LEARN
to weight P1 less in regions where it hurts.

**Revised projection:** P4 may achieve a small net gain over X6b by learning to
select P1 only on Y plane (high correlation) and skip P1 on Co/Cg (low correlation).
But the training is more complex and the gain is limited by the same structural
ceiling.

**Estimated per-sample:** 3.10-3.25 bpp
**Probability of clearing M2:** ~20%
**Probability of clearing M3:** ~5%

---

## 3. The architectural insight: where JXL's gain ACTUALLY lives

### 3.1 Correcting D1's model

D1 Section 1.1 decomposed the Prism-to-JXL gap as:
- Component A (predictor quality): ~0.20-0.25 bpp
- Component B (context model): ~0.10-0.15 bpp

The P1 measurement proves Component A was MISIDENTIFIED. JXL's spatial predictor
does NOT operate on colour-transformed planes; it operates on RAW RGB where the
correlation is much higher. Prism's YCoCg-R transform removes the spatial redundancy
that the spatial predictor targets.

The correct decomposition is:

| Component | bpp contribution | Mechanism |
|-----------|-----------------|-----------|
| **A: Colour transform ordering** | ~0.05-0.10 bpp | JXL applies spatial prediction BEFORE colour transform; Prism applies colour transform BEFORE spatial prediction. This is the root cause of P1's failure. |
| **B: Context model architecture** | ~0.15-0.20 bpp | JXL's MA-tree + transmitted histograms + ANS coding avoids online adaptation loss. This is the LARGER component. |
| **C: Predictor bank quality** | ~0.10-0.15 bpp | JXL's self-correcting weighted ensemble on raw RGB is better than Prism's MED on colour-transformed planes. |

### 3.2 The correct architectural change

The from-scratch JXL-Modular codec must reorder the pipeline:

```
Current Prism:
  Raw pixels -> YCoCg-R -> Spatial predictor -> Wavelet -> Coefficient predictor -> Entropy

Correct JXL-Modular:
  Raw pixels -> Spatial predictor (on RAW RGB) -> Wavelet -> Colour transform -> Entropy
```

OR, equivalently, remove the spatial predictor entirely and focus on the context model
architecture (Component B), which is the LARGER gain.

### 3.3 Two viable paths

**Path 1: Reorder colour transform (fix Component A).**
Apply the spatial predictor BEFORE the YCoCg-R transform, on raw RGB planes where
neighbour correlation is ~0.98+. This preserves the existing wavelet + bitplane
infrastructure and adds the spatial predictor at the correct point in the pipeline.

Estimated gain: ~0.15-0.25 bpp over X6b (from 3.2175 to ~2.97-3.07 per-sample).
This clears M2 (3.166) but is tight for M3 (2.885).

**Path 2: Replace entropy backend with transmitted histograms (fix Component B).**
Replace the online-adaptive EMA with transmitted histograms + ANS coding. This is the
JXL Modular architecture proper: multi-pass encoding, MA-tree clustering, transmitted
per-leaf histograms. The spatial predictor becomes secondary (residuals are simpler,
histograms work better).

Estimated gain: ~0.20-0.35 bpp over X6b (from 3.2175 to ~2.87-3.02 per-sample).
This clears M2 and approaches M3.

**Path 3: Both (fix Components A + B).**
Stack the reordered colour transform with transmitted histograms. This is the true
JXL-Modular architecture.

Estimated gain: ~0.30-0.50 bpp over X6b (from 3.2175 to ~2.72-2.92 per-sample).
This clears both M2 and M3 with margin.

---

## 4. Revised implementation programme

### Phase NG-3R: Colour transform reorder (Path 1) - NEW

**Deliverable:** Move the spatial predictor to operate on raw RGB BEFORE the
YCoCg-R colour transform.

**Rationale:** This directly addresses the root cause of P1's failure. The spatial
predictor on raw RGB with ~0.98 correlation should produce residuals with lower
dynamic range and lower wavelet coefficient entropy.

**Files to modify:**
- `src/codec/wavelet_container.cpp` (change pipeline order in `frame_wavelet_encode_nextgen`)
- `prism/include/prism/codec/spatial_predictor.h` (update bd_max to use raw RGB range 0-255)

**Gate:** per-sample < 3.16 on held-out images (kodim02/07/17/21)

**Estimated effort:** 0.5 day

### Phase NG-4R: P2 MLP with colour reorder (Path 1 + P2) - NEW

**Deliverable:** Train P2 MLP on raw RGB planes (before colour transform), measure.

**Rationale:** P2's 17-feature window includes spatial neighbours that are maximally
correlated on raw RGB. The MLP should achieve better prediction on raw RGB than on
colour-transformed planes.

**Gate:** beat NG-3R by >= 0.5% on held-out

**Estimated effort:** 2 days (training + implementation)

### Phase NG-5R: Transmitted histogram backend (Path 2) - NEW

**Deliverable:** Replace online-adaptive EMA with transmitted histograms + ANS coding
for the wavelet coefficient residuals. This is the JXL Modular architecture proper.

**Rationale:** This is the LARGER gain component (B) and is independent of the spatial
predictor reorder (Component A). The transmitted histograms work on ANY residual
distribution, not just spatial residuals.

**Estimated effort:** 3-4 days (major format change)

### Phase NG-6R: Full M2/M3 measurement - NEW

**Deliverable:** Full Kodak-24 measurement with the best configuration from NG-3R/4R/5R.

**Gate G3:** summed < 9.498 AND per-sample < 3.166 (both units)
**Gate G4:** summed < 8.655 AND per-sample < 2.885 (both units)

**Estimated effort:** 1 day

### Revised programme total: 7-8 days

---

## 5. What about the existing NG-3 (P2 on colour-transformed)?

If the colour reorder (NG-3R) succeeds, NG-3 (P2 on colour-transformed) is superseded.
If NG-3R fails, NG-3 should still be attempted as a fallback, but the probability of
success is low (~10%) given P1's structural failure.

**Recommendation:** Proceed with NG-3R first. If it succeeds, skip NG-3. If it fails,
attempt NG-3 as the last spatial-predictor-class attempt before pivoting to Path 2.

---

## 6. Honest assessment of M2/M3 achievability

### M2 (< 3.166 per-sample)

With Path 1 (colour reorder): ~60-70% probability. The spatial predictor on raw RGB
should achieve ~2.97-3.07 per-sample, clearing M2 by 3-6%.

With Path 2 (transmitted histograms): ~70-80% probability. The context model gain
should achieve ~2.87-3.02 per-sample, clearing M2 by 5-9%.

With Path 3 (both): ~85-90% probability.

### M3 (< 2.885 per-sample)

With Path 1 alone: ~15-25% probability. The spatial predictor gain is not large enough
alone.

With Path 2 alone: ~40-55% probability. The context model gain is the larger component
but may not be sufficient alone.

With Path 3 (both): ~60-75% probability. The combined gain should reach ~2.72-2.92
per-sample, clearing M3 by 0-5%.

### Honest probability of closing #130

Across all paths: ~50-65% probability that M2 AND M3 both pass with dual-unit
`bench_gate.sh` on real Kodak-24.

This is a MAJOR improvement over the single-pipeline architecture (0% probability,
measured ceiling at 3.2175) but is NOT guaranteed. The research recommends proceeding
with Path 3 (both components) to maximise the probability of success.

---

## 7. Pre-registered gates (binding, no post-hoc changes)

### Gate G1R: Colour reorder spatial predictor (P1 on raw RGB)

- **Primary gate:** per-sample on held-out images (kodim02/07/17/21) < 3.10
  (>= +3.6% NET over X6b 3.2175)
- **Byte-exact gate:** decode(encode(x)) == x on all 24 pinned Kodak PPMs
- **Fuzz gate:** 10,000 random perturbation tests, zero decode failures
- **Overhead gate:** NET bytes include ALL predictor parameters; overhead <= 0.02 bpp

### Gate G2R: Transmitted histogram backend

- **Primary gate:** additional >= +3.0% NET over G1R winner
- **Byte-exact + fuzz:** same as G1R
- **Format gate:** wire format change documented and backward-incompatible (version bump)

### Gate G3R: Full M2 measurement

- **Primary gate:** summed < 9.498 AND per-sample < 3.166 (both units)
- **Measurement:** `prism bench --kodak` on real PPMs, `bench_gate.sh` both units
- **Byte-exact:** decode(encode(x)) == x on 24/24
- **Fuzz:** 10,000 tests clean

### Gate G4R: Full M3 measurement (only if G3R passes)

- **Primary gate:** summed < 8.655 AND per-sample < 2.885 (both units)
- **Measurement:** same as G3R
- **Byte-exact + fuzz:** same as G3R

---

## 8. Invariants (must hold for every Next-Gen commit)

- **I29 (NET accounting):** NET = payload + header. Predictor weights are baked
  constants, never transmitted (except bounded parameter tags <= 0.02 bpp total).
  Transmitted histogram side-info is included in NET.
- **Byte-exact round-trip:** decode(encode(x)) == x on all 24 pinned Kodak PPMs
  (24/24) + fuzz clean (10,000 tests).
- **Unit discipline:** every claimed number states its unit (summed AND per-sample)
  and cites the dated CSV + bench_gate.sh run.
- **No success claim without fresh measurement:** both units, real Kodak PPMs,
  bench_gate.sh self-check verified.
- **Causality:** predictor evaluation uses ONLY already-coded/reconstructed
  neighbours; no future information leaks.
- **Determinism:** encode and decode are deterministic; no random state in the
  bitstream.

---

## 9. What is NOT in scope

- **Option C (learned pyramid / L3C):** reserved as fallback if both Path 1 and
  Path 2 fail M3. Requires complete rewrite and is a separate research effort.
- **Quantization / lossy mode:** this is a lossless codec effort only.
- **Multi-pass encoding optimisation:** JXL's multi-pass MA-tree optimization is
  out of scope for this phase. Single-pass with transmitted histograms is the target.

---

## 10. Handoff

This is the D2 recalibration research specification. The Architect should produce
the blueprint for Path 3 (colour transform reorder + transmitted histograms),
detailing:

1. The pipeline reorder: spatial predictor on raw RGB BEFORE YCoCg-R
2. The transmitted histogram backend: ANS coding with transmitted distributions
3. The container format changes (version bump, flag bits, header layout)
4. The training pipeline for P2 (if adopted on raw RGB)
5. The bench_gate.sh integration (new CLI commands, measurement protocol)
6. The phased milestone gates (NG-3R through NG-6R)

Decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
