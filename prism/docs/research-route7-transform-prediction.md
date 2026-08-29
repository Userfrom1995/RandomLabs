# Research: Route 7 - In-Subband Value Prediction and Adaptive Transform (issue #130)

- **Author:** Dr. Mob, the Researcher
- **Date:** 2026-08-29
- **Precedes:** `prism/docs/research-route6d-property-tree.md` (R6-D, the final
  context-modeling lever) and the Route 4 beyond-predictive ledger
  (`progress/130-prism-route4-beyond-predictive.md`). R6-D routes context
  clustering on RAW neighbour magnitudes and transmits per-leaf P(0) histograms to
  kill the EMA cold-start waste. This spec attacks the SECOND, independent axis of
  the residual: the absence of a scalar value predictor inside each wavelet subband.
- **Status:** RESEARCH HANDOFF -> `{"action":"architect"}`
- **Binding gates (restated, units mandatory):** M2 summed < 9.498 AND per-sample
  < 3.166 (vs real WebP m6 3.166); M3 summed < 8.655 AND per-sample < 2.885 (vs real
  cjxl -d0 -e9 2.885). Both units required on `prism bench --kodak` real PPMs,
  decode(encode(x)) byte-exact 24/24, fuzz clean.

---

## 1. Honest diagnosis: what the residual floor actually is

Measured floor (real Kodak-24, `prism/benchmarks/results/2026-08-29-x6b-kodak24.csv`):

- **X6b mean: 3.2175 per-sample / 9.6525 summed.**
- M2 needs ~1.6% more (summed 9.6525 -> 9.498; per-sample 3.2175 -> 3.166).
- M3 needs ~10.3% more (per-sample 3.2175 -> 2.885; summed 9.6525 -> 8.655).

The Route 4 pipeline (wavelet.cpp + bitplane.cpp + learned_ctx) does exactly two
decorrelation steps today:

1. A reversible integer wavelet (`WaveletLift::forward`, wavelet.cpp:254) splitting
   each plane into orient/level subbands. Only Le Gall 5/3 is used as the primary
   filter; Haar and a reversible 9/7 (`forward_97`, wavelet.cpp:105) already exist but
   are not selected per group.
2. A bitplane rANS coder (`BitplaneCoder`, bitplane.cpp) with a per-context EMA that
   predicts `P(0)` from neighbour magnitudes (`LearnedModel::predict`, learned_ctx).

Step 2 is a **context model**, not a **value model**. It estimates the probability
that the current bit is 0 given neighbour magnitudes, but it never forms a scalar
estimate `c_hat` of the coefficient VALUE and codes the residual `r = c - c_hat`.
That distinction is the entire gap to JPEG XL Modular, whose lossless path applies a
**predictor transform**: each (subband or spatial) sample is predicted from its
already-coded neighbours by the MED/gradient predictor, and only the residual is
entropy coded. The context model then only has to handle the residual's shape, which
is far sharper than the raw coefficient shape.

Why every rejected mechanism (V1, S1/S3, T1a/T2a/T3, R6-A/R6-B/R6-C, U1, R2) could not
touch this axis: they all tried to improve the *context table* or the *binarization*,
and every one of those paid transmitted-table or structural overhead that exceeded its
entropy gain at Kodak sizes (the table-economics law, I12). An in-subband value
predictor pays **zero** side-info: the prediction is recomputed from already-reconstructed
neighbours at both encoder and decoder, so there is no table to transmit. This is the
one mechanism class that structurally sidesteps I12, which is exactly why JXL's
predictor transform (and LOCO-I / CALIC / JPEG-LS before it) is free entropy.

Net: the remaining ~10% to M3 decomposes into two independent, stackable axes:
- **Axis A (cold-start waste):** removed by R6-D transmitted per-leaf histograms.
- **Axis B (value decorrelation):** removed by an in-subband value predictor (this spec).

Neither alone reaches M3 from 3.2175; the two compose because they attack disjoint
sources of entropy. This is the honest M3 path once R6-D lands.

---

## 2. Mechanism R7-A: in-subband MED value predictor (the JXL predictor transform)

### 2.1 Placement in the pipeline
The wavelet already produces `std::vector<Subband>` (wavelet.cpp:254), each with
`coeffs` (a 2D `int32` buffer in raster order), `orient`, `level`, `w`, `h`. Today
`BitplaneCoder` codes `coeffs` bitplane-by-bitplane. R7-A inserts, per coefficient at
raster position `(x,y)` and at each bitplane position `p`, a scalar prediction

```
c_hat = MED( W, N, NW, NE )
```

where `W,N,NW,NE` are the **fully reconstructed** neighbour coefficients of the SAME
subband (spatial 4-neighbourhood, mirror/symmetry at borders, identical to the MED
used throughout v1). The coder then encodes the residual bit `r_p = c_p - c_hat_p`
instead of the raw coefficient bit `c_p`. On decode the identical prediction is formed
from already-reconstructed neighbours, so `c = c_hat + r` reconstructs byte-exact.

Critical decode-order property: `BitplaneCoder` already walks coefficients in raster
order and processes bitplanes high-to-low. When coding bit position `p` of `(x,y)`,
every higher bitplane of `(x,y)` AND all bitplanes of `W,N,NW,NE` (which were coded
earlier in raster order) are already reconstructed. Therefore the full neighbour
values are available for `MED` with no extra buffering and no transmitted state. This
is the standard JPEG-LS / LOCO-I prediction condition, lifted from the spatial domain
to each wavelet subband.

### 2.2 Why it beats the EMA context model
The EMA predicts `P(0)` of the raw coefficient bit. The MED predictor removes the
*local mean* of the coefficient (smooth regions -> residual near 0; edges -> residual
carries the edge step). After the predictor, the residual's `P(0)` is sharper AND its
magnitude distribution is tighter, so even the retained EMA context model codes fewer
bits. The two are complementary: the predictor removes the low-order structure the EMA
cannot (EMA only sees a magnitude-quantised neighbour feature, LCFeat, not the signed
value), and the EMA still models the per-context residual shape.

### 2.3 Gradient predictor variant (swept)
JPEG XL's predictor transform also offers the gradient predictor
`c_hat = clip(W + N - NW)`. R7-A primary is MED (LOCO-I), with the gradient predictor
as a swept secondary; selection per subband by real coded bytes reuses the existing C3
trial-encoding-by-bytes mechanism (no energy proxy).

### 2.4 Overhead
Zero transmitted bytes. The predictor is a fixed, side-information-free function of
reconstructed state. Invariant I29 (no full model bytes) holds trivially. Decode cost
is 4 integer reads + one MED per coefficient, negligible vs the EMA+MLP it leaves in
place.

---

## 3. Mechanism R7-B: per-group adaptive filter selection (5/3 vs 9/7 vs Haar)

`WaveletParams` (wavelet.h) already carries `.filter` over `{Haar, LeGall53,
Reversible97}`. For natural photographs the reversible 9/7 (`forward_97`,
wavelet.cpp:105) packs energy better than 5/3 by ~1-3% but can be worse on synthetic
edges; Haar wins on flat regions. Route: trial-encode each subband (or each level
group) under each of the three filters and select the winner by real coded bytes
(C3 mechanism). This is a low-risk, infra-reusing lever and the second independent axis
of Axis-B (transform choice complements in-subband prediction).

Confound (I11-style): the 9/7 here is the SAME reversible 9/7 already in wavelet.cpp; it
must be measured by NET bytes vs the 5/3 baseline on identical subbands, not by energy
(L1) proxy, to avoid the C3-vs-pooled-scoring trap that inflated earlier margins.

---

## 4. Mechanism R7-C (reserve): per-image integer colour matrix

JXL Modular uses a flexible colour transform (YCbCr / YCoCg plus a per-image 3x3
integer matrix and a "subtract green" RCT) chosen per image by bytes. Prism uses
YCoCg-R + D4c reversible rotations (v1 win). A per-image optimal 3x3 integer RCT selected
by coded bytes adds an estimated 1-3% on chromatic content. This is the smallest lever
and is reserved for R7-3 stacking if R7-A + R7-B fall short of M3. No new transform
family is required; the D4c trial framework already does per-image colour choice by
bytes.

---

## 5. Honest arithmetic (composition with R6-D)

| Stage | per-sample | vs X6b | note |
|---|---|---|---|
| X6b floor | 3.2175 | - | measured |
| + R6-D (cold-start removal) | ~3.05-3.12 | -3 to -5% | R6-D own projection |
| + R7-A (in-subband MED) | ~2.98-3.05 | -3 to -4% marginal | free predictor |
| + R7-B (9/7 by bytes) | ~2.93-3.00 | -1.5 to -2% marginal | filter choice |
| + R7-C (colour matrix, if needed) | ~2.88-2.95 | -1 to -3% marginal | reserve |

Optimistic stack lands ~2.85-2.95 (clears or nears M3 2.885); conservative stack
~3.00-3.10 (clears M2 3.166, M3 at risk). The two independent axes (R6-D context
clustering + R7 value/transform decorrelation) are the honest M3 path; no single lever
reaches it. M2 is expected to clear once R6-D and R7-A are in (both are free of
table-economics overhead).

---

## 6. Training / measurement protocol (honest, no leakage)

- **R7-A wiring is table-free**: no offline training, no transmitted parameters. The
  predictor is a fixed function; the only free choice is MED vs gradient, decided per
  subband by real coded bytes at encode time (C3). Byte-exact holds by the SAME
  symmetry argument as the existing bitplane coder.
- **R7-B filter selection**: per-subband trial encode by bytes, winner transmitted as
  a 2-bit tag per subband (or per level) -> negligible header (< 0.001 bpp).
- **Evaluation gate (pre-registered):** R7-1 must lower the FULL coded rate (not just an
  MSE or BCE) by >= 1.5% vs X6b (3.2175) on a held-out 4-image subset
  (kodim02/07/17/21) BEFORE the full 24-image binding measurement, to catch any
  predictor/decode drift early.

---

## 7. Overhead bound (why it stays inside I29 / the 0.02 bpp sub-gate)

| item | bytes | bpp over ~3.5M-symbol Kodak image |
|---|---|---|
| R7-A predictor | 0 | 0 (recomputed from state) |
| R7-B filter tags (24 subbands x 2 bit) | 6 | ~0.0000 |
| R7-C colour matrix (if used) | ~12 | ~0.0000 |

All at or far under 0.02 bpp. R7-A/R7-B add ZERO model bytes; only the tiny filter-tag
header is new. Invariant I29 preserved.

---

## 8. Pinned constants (Addendum 29, frozen before measurement)

- `R7A_FLAG`: next free `residual_mode` bit (R6D_FLAG=16 used; R7A = 32), dispatched in
  `frame_wavelet_encode_*` / decode alongside the existing WAVELET_FLAG path.
- `R7A_PRED`: enum `MED=0, GRADIENT=1`; default `MED`; swept per subband by bytes.
- `R7B_FILTER`: per-subband chosen from `{Haar, LeGall53, Reversible97}` by bytes;
  `WaveletParams::filter` already supports all three.
- `R7C_MATRIX`: reserve; per-image 3x3 integer RCT via existing D4c trial framework.
- Symmetry: raster-order 4-neighbourhood (W, N, NW, NE), mirror at borders; identical
  encode/decode walk.

---

## 9. Program, gates, and cascade

| Phase | Deliverable | Primary gate | Sub-gates |
|---|---|---|---|
| R7-0 | Wire R7-A MED predictor into `BitplaneCoder` coefficient loop (flag + symmetry + byte-exact self-check) | decode(encode(x)) byte-exact 24/24 | zero container bytes |
| R7-1 | R7-A alone vs X6b on pinned quad (kodim01/05/13/19) | median NET <= -1.5% vs X6b (3.2175) on held-out kodim02/07/17/21 | same |
| R7-2 | R7-B per-subband filter selection by bytes | additional >= -0.5% over R7-1 | overhead <= 0.001 bpp |
| R7-3 | Compose R7-A+R7-B (+R7-C if short); full Kodak-24 dual-unit | summed <= 9.498 AND per-sample <= 3.166 (M2) | byte-exact 24/24, fuzz clean |
| R7-4 | Stack with R6-D (context clustering) for M3 | summed <= 8.655 AND per-sample <= 2.885 (M3) | byte-exact 24/24, fuzz clean |

**Cascade (honest, no re-tuning to force a pass):**
- R7-1 FAIL (in-subband predictor cannot beat EMA by >= 1.5%): the value-decorrelation
  axis is exhausted on this residual -> STOP-AND-REPORT; the residual after the
  reversible wavelet is then the hard floor and M3 requires a fundamentally different
  source model (neural or learned transform), to be researched as Route 8 only on owner
  authorization. Flagged, not silently attempted.
- R7-3 M2 PASS, R7-4 M3 FAIL: M2 genuinely declared PASS (first in lab history); M3
  PENDING; attempt R7-C stacking then R6-D composition, then escalate for Route 8.
- R7-4 PASS: both gates met in both units -> format-stable v3 PR `Refs #130`.

**Honesty about M3:** even the full R7 + R6-D stack is at risk for M3 (2.885) on the
conservative line (3.00-3.10). The 10% gap is larger than any single free lever, which
is why this spec composes two independent, table-free axes rather than promising one.
No success claim leaves the lab without a fresh, reproducible measurement stated in
BOTH units.

---

## 10. Complexity

- **Per coefficient (R7-A):** 4 neighbour reads + 1 MED (or gradient) + 1 subtract,
  then the existing bitplane/EMA path. Negligible vs the MLP forward (~1500 MACs) which
  R7-A does NOT require. Decode is at most as costly as today.
- **R7-B selection:** three forward/inverse wavelet passes per subband at trial time
  (offline, not in the bitstream decode); winner tag transmitted as 2 bits.
- **Memory:** no new persistent tables; R7-A predictor needs only the 4 already-cached
  neighbour coefficients (already in cache during the raster walk).
- **Offline cost:** R7-A/R7-B need no training; R7-B trial-encode is seconds in-repo.

---

## 11. Handoff

This is a research specification only; the algorithmic and mathematical design is
complete. The Architect should produce the blueprint: the `R7A_FLAG` dispatch in the
wavelet frame coder, the MED/gradient prediction inserted into the `BitplaneCoder`
coefficient loop (mirroring the existing `model.predict`/`update` walk, but operating on
reconstructed neighbour VALUES rather than only LCFeat magnitudes), the per-subband
filter-tag header (extending `WaveletParams`/`WaveletHeader`), the C3 trial-encoding
hook to choose predictor and filter by real bytes, and the `prism wavelet-r7` /
`bench-r7` CLIs. Decision: `{"action":"architect"}`.

- Dr. Mob, the Researcher
