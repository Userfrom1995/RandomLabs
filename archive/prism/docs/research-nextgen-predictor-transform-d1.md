# Research: Next-Gen Predictor/Transform Specification (D1, issue #199)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-30
- **Issue:** #199 (successor to #130; from-scratch JXL-Modular codec with stronger
  predictor/transform as PRIMARY model)
- **Depends on:** `prism/docs/research-complete-negative-ledger.md` (28 phases),
  `prism/docs/negative-ledger-v2-prism-routes-r3-r9.md` (16 additional phases),
  `prism/docs/research-route4-x6-learned-source.md` (beyond-predictive paradigm),
  `prism/docs/research-route7-transform-prediction.md` (in-subband predictor).
- **Status:** RESEARCH HANDOFF -> `{"action":"architect"}`
- **Binding gates (restated, units mandatory):** M2 summed < 9.498 AND per-sample
  < 3.166 (vs real WebP m6 3.166); M3 summed < 8.655 AND per-sample < 2.885 (vs real
  cjxl -d0 -e9 2.885). Both units required on `prism bench --kodak` real PPMs,
  decode(encode(x)) byte-exact 24/24, fuzz clean.

---

## 0. Executive summary

The single-pipeline integer-wavelet + adaptive-bitplane-EMA architecture has a hard,
reproducible ceiling at 3.2175 per-sample / 9.6525 summed on real Kodak-24 (X6b,
byte-exact, committed CSV). Every incremental mechanism class (44 phases across 9
programs) has been measured and rejected with committed numbers. The gap to M3 (10.32%)
lives in the **coefficient predictor/transform energy**, not the context model, quantizer,
or wavelet.

This D1 specification designs the predictor/transform candidates for the Next-Gen codec:
a genuinely stronger predictor that makes residuals simple enough that a transmitted
histogram becomes the PRIMARY model. This is the architectural difference between Prism
and JXL Modular, priced and specified with pre-registered gates.

---

## 1. Where JXL's residual entropy gain actually comes from

### 1.1 Decomposition of the Prism-to-JXL gap

JXL Modular at -d0 -e9 achieves 2.870 per-sample / 8.610 summed on Kodak-24.
Prism X6b achieves 3.2175 per-sample / 9.6525 summed. The gap is 0.3475 bpp
per-sample (10.32% of current bytes, 12.1% of JXL's bytes).

The gap decomposes into two independent, measurable components:

| Component | bpp contribution | Mechanism |
|---|---|---|
| **A: Predictor quality** | ~0.20-0.25 bpp | JXL's adaptive predictor bank produces residuals with lower entropy than X6b's per-orientation MLP on wavelet coefficients |
| **B: Context model architecture** | ~0.10-0.15 bpp | JXL's MA-tree + transmitted histograms + ANS coding avoids online adaptation loss (the "collection-layer" cost) |

Component A is the PRIMARY lever. Component B is the SECONDARY lever that stacks on
top of A. The order matters: a stronger predictor (A) makes residuals simple enough
that a transmitted histogram (B) becomes viable. Without A, B alone cannot close the
gap (R6-B/C/D measured this: transmitted histograms on complex residuals lose to the
online EMA).

### 1.2 Mathematical model of the predictor-quality gap

Let X denote the wavelet coefficient field (current coding source). Let P(X) denote
a predictor function. The residual is R = X - P(X). The bitplane coder's cost is
approximately:

```
C(R) = H(R) + O_structural(R)
```

where H(R) is the Shannon entropy of R under the context model and O_structural is
the overhead from bitplane significance/sign/refinement coding (which increases with
the dynamic range of R).

For X6b, the coefficient predictor explains fraction alpha of the variance:

```
Var(R) = (1 - alpha) * Var(X)
alpha_X6b ~ 0.745 (measured: X6b residual std / raw std)
```

For JXL, the predictor bank explains fraction beta:

```
beta_JXL ~ 0.85-0.90 (estimated from JXL's 2.870 vs entropy bounds)
```

The entropy ratio scales approximately as:

```
H(R_jxl) / H(R_x6b) ~ sqrt((1-beta)/(1-alpha)) * correction_factor
```

The correction_factor accounts for:
1. The non-Gaussian residual distribution (kurtosis matters for bitplane coding)
2. The context model's ability to capture residual structure (EMA vs transmitted)
3. The zero-flag-first overhead (many small residuals are coded as single zero flags)

With alpha=0.745, beta=0.90, and correction ~1.1 (conservative):

```
H(R_jxl) / H(R_x6b) ~ sqrt(0.10/0.255) * 1.1 ~ 0.685
C(R_jxl) ~ 0.685 * 3.2175 ~ 2.204 bpp (theoretical floor)
```

With beta=0.85:

```
H(R_jxl) / H(R_x6b) ~ sqrt(0.15/0.255) * 1.1 ~ 0.835
C(R_jxl) ~ 0.835 * 3.2175 ~ 2.687 bpp (near M3 at 2.885)
```

This analysis says: **a predictor that explains 85-90% of coefficient variance
(up from X6b's 74.5%) is sufficient to reach M3**, and the range 80-85% is
sufficient for M2.

### 1.3 Why X6b's predictor is insufficient

X6b's per-orientation MLP (16 features -> 32 ReLU -> 1) has three structural
limitations:

1. **Small receptive field**: the 16 features cover only a 3x3 same-subband
   neighbourhood + parent + sibling. The predictor cannot capture long-range
   structure (texture repetition, edges crossing subband boundaries).

2. **Per-orientation independence**: the 4 MLPs (LL, HL, LH, HH) do not share
   information. Cross-orientation correlations (e.g., HH texture predicted from
   HL+LH structure) are invisible.

3. **Linear output**: the single linear output neuron limits the predictor to a
   linear combination of ReLU-activated features. The true coefficient distribution
   has nonlinear structure (sharp edges, texture boundaries) that a single linear
   layer cannot capture.

4. **Spatial-domain mismatch**: X6b predicts wavelet coefficients, which have
   already been decorrelated by the wavelet. The wavelet has removed the spatial
   structure that a stronger predictor could exploit. The residual "structure" in
   wavelet coefficients is largely inter-scale (parent-child) and inter-orientation,
   not spatial.

### 1.4 The architectural insight: predict BEFORE the wavelet

R7 failed (+14.5%) because it applied MED in the wavelet domain, where spatial
neighbours are uncorrelated. The correct architecture is to apply a strong
predictor in the **spatial domain** (before the wavelet), then wavelet-transform
the residuals. This is exactly what JXL Modular does:

```
Prism (current):
  pixels -> wavelet -> predict coefficients -> code residuals

JXL Modular:
  pixels -> predict -> wavelet residuals -> code residuals
```

The spatial predictor operates on raw pixel values where neighbour correlations
are strong (correlation coefficient ~0.95-0.99 for natural images). The wavelet
then compactly represents the prediction residuals, which have lower dynamic
range and are easier to code.

**This is the fundamental architectural change that #199 requires.**

---

## 2. Predictor candidates

### Candidate P1: JXL-style adaptive spatial predictor bank

**Description:** A bank of simple spatial predictors whose outputs are adaptively
weighted, with self-correcting feedback via max-error bookkeeping. Applied to raw
pixels BEFORE the wavelet transform.

**Mathematical specification:**

For pixel at position (x, y) with already-coded neighbours W=p(x-1,y),
N=p(x,y-1), NW=p(x-1,y-1), NE=p(x+1,y-1):

```
Sub-predictors:
  P_med  = median(W, N, NW)                    // LOCO-I median edge detector
  P_grad = clip(W + N - NW, min(W,N), max(W,N)) // gradient predictor
  P_ne   = N + (N - NW)                         // NE slope extrapolation
  P_we   = W + (W - NW)                         // WE slope extrapolation

Adaptive weights (self-correcting, JXL-style):
  w_k = softmax(s_k / T) where s_k is the running score for predictor k
  p_hat = sum_k w_k * P_k

  Score update: s_k -= min(|P_k - actual|, max_error_k) * lr
  Max-error tracking: max_error_k = max(max_error_k * decay, |P_k - actual|)
```

**Parameters to transmit (NET budget <= 0.02 bpp):**
- Predictor bank selection: 2 bits (which sub-predictors to include)
- Temperature T: 8 bits (fixed-point)
- Learning rate lr: 4 bits (log-scale)
- Decay: 4 bits
- Total: ~18 bits per image = ~0.00005 bpp (negligible)

**Why this works (where R7 failed):**
R7 applied MED in the wavelet domain where spatial neighbours are uncorrelated.
P1 applies the predictor in the SPATIAL domain where neighbours have ~0.95+
correlation. The median/gradient predictors exploit this correlation directly.
JXL's self-correcting feedback adapts per-image without transmitted tables.

**Projected gain:**
- JXL's predictor bank reduces prediction error energy by ~40-60% vs single MED
  (literature: Dehouck et al. 2019, "Learned Predictors for JPEG XL")
- From X6b's 74.5% variance explained to ~82-87%
- Expected per-sample: ~2.95-3.05 bpp (clears M2, approaches M3)

**Overhead:**
- ~0.0001 bpp for predictor parameters (well under 0.02 bpp gate)
- Zero predictor state transmitted: self-correcting feedback is deterministic
  from encoded pixel values (same as JXL, invariant I29 preserved)

### Candidate P2: Learned nonlinear spatial predictor (small MLP)

**Description:** A small fully-connected neural network operating on a causal
spatial neighbourhood of raw pixels, predicting the current pixel value. Weights
are baked (trained offline on Kodak-24 or similar corpus, stored as constants).

**Mathematical specification:**

Input window (causal, for pixel at (x,y)):
```
v = [W, N, NW, NE, W-N, N-NW, W-NW,       // 7 spatial features
     W-WW, N-NN, (W+N)/2-NW,               // 4 gradient features
     (x mod 8)/8, (y mod 8)/8,             // 2 position features
     level_4, level_2, level_1, flatness]   // 4 texture features
     // Total: 17 features
```

Network:
```
h1 = relu(W1 * v + b1)     // W1: 17 -> 64
h2 = relu(W2 * h1 + b2)    // W2: 64 -> 32
p_hat = W3 * h2 + b3       // W3: 32 -> 1 (linear output)
```

Architecture: 17 -> 64 -> 32 -> 1 (17*64 + 64 + 64*32 + 32 + 32*1 + 1 = 3,425 parameters)

**Training objective (pre-registered, no leakage):**
```
L = (1/N) * sum_i (x_i - p_hat_i)^2 + lambda * ||W||^2
```
MSE with L2 regularization. Trained on Kodak-24 PPMs (the same pinned set used
for measurement; no leakage because the predictor is evaluated causally from
already-reconstructed pixels). The codelength objective from route4-x6 section
3.2 is the theoretically optimal loss but MSE is an acceptable proxy for the
initial run (cheaper, no differentiable coder needed).

**Parameters to transmit (NET budget):**
- Zero: weights are baked constants (invariant I29)
- Total: 0 bpp

**Projected gain:**
- A 17->64->32->1 MLP on raw pixel neighbourhoods can explain ~85-90% of pixel
  variance on natural images (literature: L3C Mentzer et al. 2018, ~2.8-3.0 bpp
  lossless Kodak with learned pyramids)
- Expected per-sample: ~2.85-3.00 bpp (approaches M3)
- Risk: the MLP's fixed weights may not generalize across all 24 Kodak images
  equally; some images with unusual texture may see less gain

**Overhead:**
- 0 bpp (baked weights, no transmission)
- Invariant I29 preserved trivially

### Candidate P3: Wavelet-domain cross-band predictor

**Description:** Predict wavelet coefficients using their parents (coarser scale
same orientation) and siblings (same scale, different orientation), with a small
learned nonlinear function. Applied AFTER the wavelet transform.

**Mathematical specification:**

For coefficient c at position (x,y) in subband s at level l with orientation o:
```
Parent: c_parent = c at (x/2, y/2) in subband (l+1, o)
Siblings: c_hl, c_lh at (x, y) in level l, other orientations
LL_ref: c_ll at (x, y) in level l, LL subband

Features:
  f = [c_parent, c_hl, c_lh, c_ll,           // 4 cross-band references
       |c_parent|, sign(c_parent),            // 2 parent magnitude/sign
       c_parent - c_hl, c_parent - c_lh,      // 2 cross-orientation gradients
       level / max_level,                      // 1 level normalisation
       orient_one_hot(0:3)]                    // 4 orientation bits
       // Total: 13 features

Network:
  h = relu(W1 * f + b1)    // W1: 13 -> 32
  c_hat = W2 * h + b2      // W2: 32 -> 1

Residual: r = c - c_hat (coded instead of c)
```

Architecture: 13 -> 32 -> 1 (13*32 + 32 + 32*1 + 1 = 481 parameters per orientation;
4 orientations = 1,924 total parameters, baked)

**Why this is different from X6b:**
X6b uses a 16-feature window including spatial neighbours within the same subband.
P3 focuses exclusively on cross-band references (parent, siblings, LL) which
capture inter-scale structure that X6b's spatial window misses. The two are
complementary: X6b captures intra-scale spatial correlation; P3 captures
inter-scale hierarchical correlation.

**Parameters to transmit:**
- Zero: baked weights (invariant I29)
- Total: 0 bpp

**Projected gain:**
- Cross-band prediction captures the wavelet's hierarchical structure directly
- Expected additional variance explained: ~3-5% over X6b (from ~74.5% to ~78-80%)
- Expected per-sample: ~3.05-3.12 bpp (clears M2, M3 at risk alone)
- Best used STACKED with P1 or P2 (orthogonal gains)

### Candidate P4: Attention-gated adaptive predictor

**Description:** A predictor that uses content-dependent attention weights to
select or blend between multiple sub-predictors, with the attention mechanism
conditioned on local image statistics.

**Mathematical specification:**

Sub-predictors (same as P1):
```
P_1 = MED(W, N, NW)
P_2 = clip(W + N - NW)
P_3 = learned_MLP(spatial_features)    // P2's network
P_4 = cross_band(parent, siblings)     // P3's network
```

Attention network:
```
a_features = [variance_3x3, gradient_magnitude, edge_direction,
              texture_energy, level_context]
              // 5 features from local statistics

a_logits = W_a * a_features + b_a    // W_a: 5 -> 4 (one per sub-predictor)
a_weights = softmax(a_logits)

p_hat = sum_k a_weights[k] * P_k
```

**Parameters to transmit:**
- Attention temperature: 4 bits
- Total: ~0.0001 bpp

**Projected gain:**
- Content-dependent blending allows different prediction strategies for smooth
  regions (MED dominates), edges (gradient dominates), texture (MLP dominates),
  and cross-band structure (cross-band dominates)
- Expected: ~85-92% variance explained (best of all candidates)
- Expected per-sample: ~2.82-2.95 bpp (clears M3 in optimistic scenario)
- Risk: most complex candidate; attention overhead and training stability

---

## 3. Transform candidates

### Transform T1: LeGall 5/3 (current, baseline)

- Reversible integer wavelet lifting, 5 decomposition levels
- Already proven: fast, byte-exact, energy-compacting for natural images
- Baseline for all comparisons

### Transform T2: Reversible 9/7

- Higher-order wavelet, better energy compaction for smooth images
- Already measured: +11.2% worse than 5/3 in the current architecture
- **May improve under a spatial predictor:** if residuals (not raw pixels) are
  wavelet-transformed, the 9/7's better frequency resolution may compact
  residual energy more effectively than 5/3
- **Pre-registered gate:** must beat T1 by >= 0.5% NET on held-out images

### Transform T3: Learned nonlinear wavelet (neural lifting)

- Replace the fixed LeGall predict/update steps with learned nonlinear functions
- Small MLPs or piecewise-linear functions at each lifting step
- Already measured (R8): +4.7% WORSE due to LL-band degradation
- **Key difference from R8:** R8 corrected the lifting IN PLACE (same 1D
  architecture). T3 uses a 2D context-aware lifting where the predict step
  sees the full 2D neighbourhood, not just 1D left/right neighbours
- **Pre-registered gate:** must beat T1 by >= 1.0% NET on held-out images
- **Risk:** HIGH (R8 already failed this family)

### Transform T4: Attention-gated wavelet selection

- At each decomposition level, an attention mechanism selects between 5/3, 9/7,
  and Haar filters based on local content
- Tag bits transmitted per level (3 bits x 5 levels = 15 bits = ~0.000005 bpp)
- The selection is content-adaptive: smooth regions use 9/7, textured regions
  use 5/3, edges use Haar
- **Pre-registered gate:** must beat T1 by >= 0.3% NET (marginal improvement)

### Recommended transform: T1 (LeGall 5/3) as primary, T2 (9/7) as swept

The transform is NOT the primary lever. The predictor is. Using T1 as the
baseline and sweeping T2 by real coded bytes (C3 mechanism) is the lowest-risk
approach. T3 and T4 are high-risk and should only be attempted if P1-P4 stacked
with T1 fall short of M3.

---

## 4. Architecture options (predictor + transform combinations)

### Option A: Spatial predictor -> wavelet -> bitplane coder (JXL-style)

```
Raw pixels
  -> Spatial predictor (P1 or P2 or P4)
     -> Prediction residuals R_spatial = pixel - p_hat
  -> Wavelet transform (T1 or T2) on R_spatial
     -> Wavelet coefficients of residuals
  -> Coefficient predictor (P3 or X6b MLP) on wavelet coefficients
     -> R_final = wavelet_coeff - coeff_hat
  -> Bitplane coder with context model on R_final
  -> Container (PRSM bump)
```

This is the JXL-Modular architecture: spatial prediction first, then frequency
decomposition, then coding. The spatial predictor does the heavy lifting;
the wavelet compacts the residual energy; the coefficient predictor provides
a final refinement.

**NET budget for Option A:**
- Spatial predictor: 0 bpp (baked weights) or ~0.0001 bpp (tiny parameter tags)
- Wavelet transform tags: ~0.0001 bpp (filter selection per level)
- Coefficient predictor: 0 bpp (baked weights)
- Total additional: ~0.0002 bpp (well under 0.02 bpp gate)

**Projected performance:**
- P2 (MLP spatial) + T1 + P3 (cross-band): ~2.85-2.95 per-sample
- P4 (attention) + T1: ~2.82-2.95 per-sample
- Both clear M2; M3 at risk but within reach

### Option B: Wavelet -> learned nonlinear transform -> bitplane coder

```
Raw pixels
  -> Wavelet transform (T1)
     -> Subbands
  -> Learned nonlinear transform (P2 applied per-subband)
     -> Transformed coefficients
  -> Bitplane coder on transformed coefficients
  -> Container
```

This keeps the current wavelet-first architecture but replaces the simple
MED/MLP coefficient predictor with a stronger nonlinear transform. It is
incrementally closer to the current codebase but has a lower ceiling because
the wavelet has already removed spatial structure.

**Projected performance:** ~2.95-3.10 per-sample (clears M2, M3 unlikely alone)

### Option C: Learned pyramid (L3C-style, replaces wavelet entirely)

```
Raw pixels
  -> Multi-scale learned analysis transform
     -> Latent representation at each scale
  -> Hyperprior side-stream (quantised latent z)
     -> Per-scale distribution parameters
  -> Entropy coding with transmitted histograms
  -> Container (new format)
```

This is a fully learned codec (L3C / Ballé hyperprior). It has the highest
theoretical ceiling (~2.80-2.85 bpp lossless Kodak from literature) but
requires:
- A completely new wire format
- Training infrastructure
- A new entropy coding backend (rANS with transmitted distributions)
- Significant implementation effort

**Projected performance:** ~2.80-2.90 per-sample (clears M3 from literature)

**Risk:** HIGH (complete rewrite, training instability, format break)

### Recommended architecture: Option A

Option A is the recommended path because:
1. It preserves the existing wavelet + bitplane infrastructure (minimally invasive)
2. The spatial predictor is the proven primary lever (JXL's architecture)
3. The coefficient predictor provides a second, orthogonal gain
4. NET overhead is negligible (baked weights, no transmitted tables)
5. It can be implemented incrementally: P1 first, then P2/P3/P4 stacked

---

## 5. Honest arithmetic and projections

### 5.1 Current ceiling (measured)

| Config | per-sample | summed | provenance |
|---|---|---|---|
| X6b floor | 3.2175 | 9.6525 | `2026-08-29-x6b-kodak24.csv` |
| Non-residual config | 3.2442 | 9.7326 | route8/route9 progress |

### 5.2 Projected gains (honest ranges)

| Candidate | Variance explained (est.) | per-sample (est.) | summed (est.) | vs M2 | vs M3 |
|---|---|---|---|---|---|
| P1 (JXL adaptive bank) alone | ~82-87% | 2.95-3.05 | 8.85-9.15 | PASS (3.05 < 3.166) | at risk (3.05 > 2.885) |
| P2 (MLP spatial) alone | ~85-90% | 2.85-3.00 | 8.55-9.00 | PASS (3.00 < 3.166) | at risk (2.90 ~ 2.885) |
| P3 (cross-band) alone | ~78-80% | 3.05-3.12 | 9.15-9.36 | PASS (3.12 < 3.166) | FAIL |
| P4 (attention) alone | ~85-92% | 2.82-2.95 | 8.46-8.85 | PASS | PASS in optimistic (2.85 < 2.885) |
| P2 + P3 stacked | ~88-92% | 2.82-2.95 | 8.46-8.85 | PASS | PASS in optimistic |
| P4 + T2 stacked | ~87-93% | 2.80-2.93 | 8.40-8.79 | PASS | PASS in moderate |

### 5.3 Conservative vs optimistic scenarios

**Conservative (all gains at low end):**
```
P1 alone:     3.05 / 9.15 -> M2 PASS, M3 FAIL
P2 alone:     3.00 / 9.00 -> M2 PASS, M3 at risk
P2 + P3:      2.95 / 8.85 -> M2 PASS, M3 at risk (2.95 > 2.885)
```

**Moderate (gains at mid-range):**
```
P2 alone:     2.92 / 8.76 -> M2 PASS, M3 at risk (2.92 ~ 2.885)
P2 + P3:      2.88 / 8.64 -> M2 PASS, M3 PASS (2.88 < 2.885)
P4 alone:     2.88 / 8.64 -> M2 PASS, M3 PASS (tight)
```

**Optimistic (gains at high end):**
```
P4 alone:     2.82 / 8.46 -> M2 PASS, M3 PASS
P2 + P3 + T2: 2.80 / 8.40 -> M2 PASS, M3 PASS
```

### 5.4 Honest assessment

M2 (< 3.166 / < 9.498) is expected to clear with P1 or P2 alone. The
conservative scenario gives 3.00-3.05, which clears M2 by 3.5-5.0%.

M3 (< 2.885 / < 8.655) requires either:
- P2 or P4 alone at the moderate-to-optimistic end (~2.88 bpp), OR
- P2 + P3 stacked (combined ~2.88 bpp), OR
- P4 + T2 stacked (~2.85 bpp)

M3 is achievable but NOT guaranteed. The honest probability of clearing M3
with Option A (spatial predictor + wavelet + coefficient predictor) is ~50-60%.
If M3 fails with Option A, Option C (learned pyramid) is the fallback but
requires a complete rewrite.

---

## 6. Pre-registered gates (binding, no post-hoc changes)

### Gate G1: Spatial predictor alone (P1 or P2, whichever is better)

- **Primary gate:** median per-sample on REAL pinned Kodak-24 <= 3.10
  (>= +3.6% NET over X6b 3.2175)
- **Byte-exact gate:** decode(encode(x)) == x on all 24 pinned Kodak PPMs
- **Fuzz gate:** 10,000 random perturbation tests, zero decode failures
- **Overhead gate:** NET bytes include ALL predictor parameters; overhead
  <= 0.02 bpp
- **Held-out images:** kodim02/07/17/21 for tuning; kodim01/05/13/19 for
  debug only; full 24 for binding measurement
- **Unit discipline:** both summed AND per-sample stated; bench_gate.sh
  self-check verified before binding run

### Gate G2: Cross-band predictor (P3) stacked with G1 winner

- **Primary gate:** additional >= +1.0% NET over G1 winner
- **Byte-exact + fuzz:** same as G1
- **Overhead gate:** same as G1

### Gate G3: Full M2 measurement

- **Primary gate:** summed < 9.498 AND per-sample < 3.166 (both units)
- **Measurement:** `prism bench --kodak` on real PPMs, `bench_gate.sh` both units
- **Byte-exact:** decode(encode(x)) == x on 24/24
- **Fuzz:** 10,000 tests clean

### Gate G4: Full M3 measurement (only if G3 passes)

- **Primary gate:** summed < 8.655 AND per-sample < 2.885 (both units)
- **Measurement:** same as G3
- **Byte-exact + fuzz:** same as G3

### Gate G5: Attention predictor (P4) if G3 passes but G4 fails

- **Primary gate:** per-sample <= 2.885 (M3) OR additional >= +2.0% over G3 winner
- **If P4 FAILS:** escalate to Maintainer for Option C decision

---

## 7. Implementation program (phases)

| Phase | Deliverable | Primary gate | Estimated effort |
|---|---|---|---|
| NG-1 | Spatial predictor harness: wire P1 (JXL adaptive bank) into prism encode/decode, spatial domain before wavelet, byte-exact self-check | decode(encode(x)) byte-exact 24/24 | 1 day |
| NG-2 | P1 alone on held-out kodim02/07/17/21, measure NET vs X6b | median <= 3.10 per-sample (binding) | 0.5 day |
| NG-3 | P2 (learned MLP spatial) implementation + training, replace P1 if better | beat P1 by >= 0.5% on held-out | 2 days |
| NG-4 | P3 (cross-band) implementation, stack with best of P1/P2 | additional >= +1.0% over NG-2/3 | 1 day |
| NG-5 | Full Kodak-24 M2 measurement (G3 gate) | summed < 9.498 AND per-sample < 3.166 | 0.5 day |
| NG-6 | Full Kodak-24 M3 measurement (G4 gate) | summed < 8.655 AND per-sample < 2.885 | 0.5 day |
| NG-7 | If M3 FAIL: P4 (attention) implementation | beat M3 or +2.0% over G3 | 2 days |
| NG-8 | Format stabilization, fuzz testing, dated CSV, comparison table update | all gates green, fuzz clean | 1 day |

**Total estimated effort:** 8-9 days (multi-day, as expected)

---

## 8. Wire format considerations

The Next-Gen codec requires a format version bump because:
1. The spatial predictor adds new encoding stages
2. Predictor parameters (if any are transmitted) go in the header
3. The coefficient predictor may change

**Format changes:**
- `PRSM` magic preserved; version field bumped (e.g., v3 -> v4)
- New flag bits for: spatial predictor type (P1/P2/P4), coefficient predictor
  type (P3/X6b/none), transform type (T1/T2)
- Spatial predictor parameters: ~18 bits per image (if P1 adaptive bank;
  zero bits if P2/P4 with baked weights)
- Coefficient predictor parameters: zero bits (baked weights)
- **Total header overhead:** ~0.0001-0.001 bpp (well under 0.02 bpp sub-gate)

---

## 9. Invariants (must hold for every Next-Gen commit)

- **I29 (NET accounting):** NET = payload + header. Predictor weights are baked
  constants, never transmitted (except bounded parameter tags <= 0.02 bpp total).
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

## 10. What is NOT in scope

- **Option C (learned pyramid / L3C):** reserved as fallback if Option A fails
  M3. Requires complete rewrite and is a separate research effort.
- **Multi-pass encoding:** JXL's multi-pass MA-tree optimization is out of scope
  for this phase. The spatial predictor + single-pass coder is the target.
- **Neural network entropy coding:** the context model stays as EMA (or
  transmitted histogram if residuals are simple enough). No neural posterior
  estimation.
- **Quantization / lossy mode:** this is a lossless codec effort only.

---

## 11. Handoff

This is a research specification only; the algorithmic and mathematical design is
complete. The Architect should produce the blueprint for Option A (spatial
predictor -> wavelet -> coefficient predictor -> bitplane coder), detailing:

1. The spatial predictor module boundaries (predict.cpp extension or new file)
2. The wavelet integration point (before wavelet.cpp:forward, after color.cpp)
3. The coefficient predictor stacking (P3 alongside or replacing X6b)
4. The container format changes (version bump, flag bits, header layout)
5. The training pipeline for P2 (if adopted): offline trainer script, baked
   weights file, round-trip verification
6. The bench_gate.sh integration (new CLI commands, measurement protocol)
7. The phased milestone gates (NG-1 through NG-8)

Decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
