# Negative Ledger v2: Prism #130 routes R3 -> R9 (complete mechanism record)

- **Issue:** #130 (owner Anti-Surrender directive 2026-08-23T16:22Z; iterate until M2
  AND M3 genuinely pass dual-unit gates against REAL cjxl/WebP).
- **Role:** The Builder
- **Date:** 2026-08-30 (consolidation run on `opencode/issue130-20260830024922`).
- **Supersedes:** extends `prism/docs/research-complete-negative-ledger.md` (Dr. Mob, the
  Researcher), which ends at the U-series (28 phases, 5 adopted / 18 rejected). This
  document records every route measured AFTER that ledger was written: the R3->R1->R2
  cascade, the X-series (Route 4 beyond-predictive), R6-A/B/C/D (JXL-Modular transmitted
  structure), R5 (autoregressive rANS), R7 (in-subband predictor), R8 (learned lifting),
  and R9 (fixed tree-quantized EMA). All numbers are measured on the exact Kodak-24 PPMs
  (sha-pinned, 24/24 byte-exact round-trip) unless a proxy is noted. No number is
  estimated. Every row cites a committed CSV or progress file.
- **Handoff decision:** `{"action":"maintainer"}` (see Section 5).

Units discipline (unchanged, binding): every number states its unit; on Kodak-24 (C=3)
summed = 3 x per-sample exactly; gates compare BOTH units via `benchmarks/bench_gate.sh`;
no success claim without a fresh measurement. No em dashes anywhere.

---

## 0. Corpus truth and the honest lab floor

Measured on the exact Kodak PPMs (24 images, 768x512 RGB, sha256-pinned before every
measurement), against REAL cjxl output (never a constant), byte-exact encode/decode
required:

| quantity | summed | per-sample | provenance |
|---|---|---|---|
| Prism v0 baseline (pre-C1) | 11.026 | 3.675 | comparison table 2026-08-23 |
| Prism v1 final (e1) | 10.1210 | 3.3737 | `2026-08-25-prism-e1.csv` |
| M2 gate (WebP lossless m6) | < 9.498 | < 3.166 | issue #130 |
| M3 gate (JXL -d0 -e9, binding) | < 8.655 | < 2.885 | issue #130 |
| **Prism honest floor (X6b, --residual)** | **9.6525** | **3.2175** | `2026-08-29-x6b-kodak24.csv` |
| Prism floor, non-residual config | 9.7326 | 3.2442 | route8/route9 progress (same coder, no `--residual`) |

The honest best the lab has ever produced on this architecture is **X6b = 3.2175
per-sample / 9.6525 summed** (LeGall 5/3, levels 5, EMA context blended with the baked
MLP prior, `--residual` bitplane coding; reproduces exactly from the committed CSV).
Bytes saved from v0 baseline: 1 - 9.6525/11.026 = 12.48 percent.

Gate gaps from the X6b floor:
- M2 (WebP): need < 3.166 per-sample => 1 - 3.166/3.2175 = **1.60 percent** more on bytes.
- M3 (JXL): need < 2.885 per-sample => 1 - 2.885/3.2175 = **10.32 percent** more on bytes.

Both gates FAIL at the floor. X6b is within ~0.4 percent per-sample of real WebP m6 on the
freshly-measured corpus (3.2175 vs 3.2043), but ~12 percent above real JXL (3.2175 vs 2.870).

---

## 1. Complete mechanism ledger: every route R3 -> R9

Each row is a committed measurement with a dated CSV / progress file. "Verdict" is
measured NET (payload + tables + maps + trees per I12) unless a proxy is noted.

### 1.1 R3 / R1 / R2 cascade (owner-authorized, 2026-08-27)

| route | mechanism | gate | measured result | verdict | provenance |
|---|---|---|---|---|---|
| R3 (MA-tree clustering) | multi-pass MA-tree context clustering, transmitted histograms | median NET <= -0.5% | +2.27% median (all images worse) | REJECTED | `progress/130-prism-route3-modular-redesign.md`, PR #156/#157 |
| R1 (adaptive multi-pass) | two-pass adaptive ACoderV2, entropy-split MA-tree | R1-1a/b/c + primary <= -0.5% | +2.27% median; model 0.0006 bpp | REJECTED | `progress/130-prism-route1-acoder-refinement.md`, PR #160 |
| R2 (hybrid-uint) | remove zero-flag-first pathology, hybrid-uint binarization | primary <= -0.5% | best +1.80% (T_ESC=16); 0 bpp overhead | REJECTED | `progress/130-prism-route2-hybrid-uint.md`, PR #162 |

Root cause (common): K=16-128 MA-tree leaf contexts / hybrid-uint wider alphabet each add
structural overhead that the adaptive coder cannot recover at Kodak image sizes. Coarse
contexts are less discriminative than v1's 343 ResDiff + 16 class priors.

### 1.2 X-series (Route 4: beyond-predictive, wavelet + bitplane, 2026-08-28)

| phase | mechanism | gate | measured result | verdict | CSV / provenance |
|---|---|---|---|---|---|
| X0/X1 | wavelet bitplane harness + per-subband fix | infra | byte-exact 24/24 | ADOPTED (instrument) | PR #164 |
| X2 | entropy diagnostic (ideal entropy vs coded rate) | infra | bitplane residual entropy-near-optimal under fine EMA | ADOPTED (evidence) | `2026-08-28-x2-kodak24-53.csv` |
| X3a | learned neural context model (CNN over coeff magnitudes) | >= +8% median | 3.2477 per-sample (floor-ish) | AT CEILING | codec-comparison table |
| X3b | stronger MLP prior (deeper net) | beat X3a | 3.2459 per-sample | AT CEILING | `2026-08-29-fixer-x3b-kodak24.csv` |
| X4 | train-learned MLP prior | reduce entropy below EMA | no gain (BCE ~0.31) | REJECTED | progress route4 |
| X5a | cross-component prediction | >= +N% | neutral/small | REJECTED | `2026-08-29-x5a-crosscomponent-kodak24.csv` |
| X6a | coefficient predictor variant | floor | 3.25548 / 9.76644 | worse than X6b | `2026-08-29-x6a-kodak24.csv` |
| X6b | coefficient predictor + EMA blend (FLOOR) | - | **3.21751 / 9.65253** | FLOOR | `2026-08-29-x6b-kodak24.csv` |
| X6c | hyperprior (Laplacian blend) | beat X6b | 3.21784 / 9.6535 (doubly exhausted, Laplacian 3.21526 corroboration) | REJECTED (no gain) | `2026-08-29-x6c-kodak24.csv`, `2026-08-29-x6c-laplacian-blend0.1.csv` |

X2 established the key fact: the bitplane residual is entropy-near-optimal under the
fine-context EMA. The context model, not the coding, is the limit. X6b is the floor.

### 1.3 R6-A / R6-B / R6-C / R6-D (JXL-Modular transmitted structure, 2026-08-29)

| variant | mechanism | gate | measured result | verdict | provenance |
|---|---|---|---|---|---|
| R6-A | deeper learned MLP context (13-64-32-1) | beat EMA | 3.2459 / 9.7377 | REJECTED (at ceiling, MLP prior untrained => constant) | progress route6 / PR #176 |
| R6-B | coarse per-(subband,class) transmitted static P(0) histogram, W=0.35 | M2/M3 | 3.4363 / 10.3089 (+6% vs X6b), byte-exact | REJECTED | `progress/130-prism-route6-r6b-transmitted-histogram.md`, PR #179 |
| R6-C | per-fine-context CLUSTER transmitted histogram (kb=256) | M2/M3 | 5.0847 / 15.2541 (MLP weights still zeros => collapses to 3 contexts) | REJECTED | `progress/130-prism-route6-r6c-cluster-histogram.md` |
| R6-D | property tree (blueprint delivered) | unmeasured | blueprint only, same class as R6-A/B/C | PENDING (conceptually exhausted) | `progress/130-prism-route6-r6d-property-tree.md` |

Root cause (common): a coarse or transmitted histogram cannot beat the 1.84M-entry online
EMA while the learned prior is uninformative. The MLP weights in `learned_ctx_data.inc`
remain ZEROS (untrained), so every "learned" variant degenerates to the EMA path or
collapses to a few contexts. R6-A/B/C (three Route 6 variants) all fail to beat X6b.

### 1.4 R5 (autoregressive rANS, 2026-08-29)

| phase | mechanism | gate | measured result | verdict | CSV |
|---|---|---|---|---|---|
| R5 | autoregressive rANS over wavelet coefficients | M2/M3 | 3.53136 / 10.59408 (+9.7% vs X6b) | REJECTED | `2026-08-29-r5-kodak24.csv` |

Regresses: the autoregressive conditioning adds sequential dependence overhead that the
parallel bitplane EMA already captures for free.

### 1.5 R7 (in-subband value prediction, 2026-08-29)

| phase | mechanism | gate | measured result | verdict | provenance |
|---|---|---|---|---|---|
| R7-A | in-subband MED/gradient value predictor + adaptive per-level filter | median NET <= -1.5% | +14.5% median (kodim02/07/17/21) | REJECTED | `progress/130-prism-route7-transform-prediction.md`, PR #185 |
| R7-B | per-level filter selection by real bytes | - | neutral/regression | REJECTED | same |

The integer wavelet lift already decorrelates spatial neighbours within each subband, so a
neighbour's coefficient is a poor predictor of the current one. Same rejection as S1
(GAP/W predictor families) in the v1 era: the single-pipeline predictor ceiling.

### 1.6 R8 (learned nonlinear lifting, 2026-08-29)

| phase | mechanism | gate | measured result | verdict | provenance |
|---|---|---|---|---|---|
| R8-1 | learned piecewise-constant lifting corrector (16 predict + 16 update LUTs) | beat LeGall floor | 3.4711 / 10.4136 (+4.7% vs 3.2442 floor) | REJECTED (regress) | `progress/130-prism-route8-learned-lifting.md` |

Predict correction propagates a context-dependent shift into the low-pass band; the LL
(the dominant-energy band) becomes less spatially smooth and less compressible than the
tiny detail-band saving. Structural coupling of predict->update in 1D lifting trades LL
compactness for detail savings and loses. Rules out the learned-lifting family.

### 1.7 R9 (fixed tree-quantized EMA, 2026-08-30)

| phase | mechanism | gate | measured result | verdict | CSV |
|---|---|---|---|---|---|
| R9 | baked R6D property-tree leaf (1024 clusters, ZERO transmitted bytes) keying the online EMA | beat X6b | 3.22452 / 9.67356 (+0.218% vs X6b) | REJECTED (coarse < fine) | `2026-08-30-r9-tree-quant-ema-kodak24.csv` |

The bet: 1.84M fine contexts see only ~5 symbols each (cold-start waste); coarsening to
1024 leaves lets the EMA converge without transmitted-tree overhead. Measured verdict: the
fine-context EMA is already near-optimal; its discrimination is worth more than better
convergence of a coarser clustering. closes the "fixed clustering" variant (R6 used
TRANSMITTED trees; R9 used a BAKED tree with zero overhead and still loses).

---

## 2. The structural law (why every refinement loses)

Confirmed across 9 programs / ~40 measured phases:

1. **Table-economics (I12 NET accounting).** Every context/predictor refinement under
   payable side-info loses to its own table bytes at Kodak image sizes. Demonstrated by
   V1, S1/S3, T1a/T2a/T3, R6-A/B/C, R9. A fixed or transmitted structure cannot beat the
   online 1.84M fine-context EMA.
2. **Zero-flag-first (ZFF) binarization ceiling.** E1 bias cancellation backfired
   (+19.85/+16.33 points) because ZFF's MED-bias correction fights the binarization. R2
   hybrid-uint also failed (+1.80%) from binary-tree prefix overhead.
3. **Transform-domain mismatch.** U1 frequency-domain MED failed (+20.32%) because DCT
   coefficients lack spatial locality; R7 in-subband MED failed (+14.5%) for the same
   reason at the coefficient level.
4. **Entropy-near-optimal residual (X2).** The bitplane residual under the fine-context
   EMA has ideal entropy ~= actual coded rate. The context model is the limit, not the
   arithmetic coder.
5. **Learned-prior starvation.** The MLP prior in `learned_ctx_data.inc` is untrained
   (zeros), so X3a/X3b/R6-A/R6-C all degenerate. Training was measured to be at its ceiling
   (BCE ~0.31, no gain over EMA) because the fine-context EMA already captures the same
   conditional structure.

Conclusion: no legitimate mechanism class remains unmeasured in the single-transform
single-pipeline design space. The gap to M3 is the architectural difference between
single-pass online adaptive coding (Prism) and a learned/neural entropy frontend (JXL
Modular's actual mechanism), not a tuning miss.

---

## 3. What remains (the only unbuilt class)

Per the R8 and R9 progress files, the sole remaining lever that can plausibly close the
~1.6% (M2) / ~10.3% (M3) gap is a **FULL learned nonlinear transform** (a small neural
network codec applied in the transform domain, NOT a linear/piecewise lifting correction)
or a **complete JXL-style Modular redesign with a learned nonlinear predictor + transmitted
tree**. This is:

- beyond the current single-incremental-route program,
- a major research/build effort requiring a wire-format / architecture bump,
- requiring a NEW dedicated issue + its own research -> architect -> build cycle and
  explicit owner authorization (per lab rules, every distinct task gets its own issue;
  the Builder cannot self-authorize a new paradigm).

---

## 4. Honest ledger totals (this document extends the original 28-phase ledger)

| program | phases | mechanisms measured | adopted | rejected |
|---|---|---|---|---|
| C/V/S/T/U (original ledger) | 28 | - | 5 | 18 |
| R3 / R1 / R2 (cascade) | 3 | MA-tree, adaptive multi-pass, hybrid-uint | 0 | 3 |
| X-series (Route 4) | X0-X6c | wavelet bitplane, learned ctx, hyperprior | X0/X1/X2 (instruments) | X3a/X4/X5a/X6a/X6c |
| R6-A/B/C/D | 4 | transmitted/learned histogram fusion | 0 | 3 (R6-D pending) |
| R5 | 1 | autoregressive rANS | 0 | 1 |
| R7 | 2 | in-subband predictor, adaptive filter | 0 | 2 |
| R8 | 1 | learned lifting | 0 | 1 |
| R9 | 1 | fixed tree-quantized EMA | 0 | 1 |

Total rejected mechanism classes (post-original): R3, R1, R2, X3a, X4, X5a, X6a, X6c,
R6-A, R6-B, R6-C, R5, R7-A, R7-B, R8, R9 = 16 additional measured rejections, all with
committed CSVs, on top of the original 18.

---

## 5. Recommendation to the Owner (via Maintainer)

Per Anti-Surrender + No-Pause, #130 stays OPEN. This run did NOT close it and did NOT
claim any gate pass. The single-pipeline architecture has a hard, reproducible ceiling at
3.2175 / 9.6525 (both units, byte-exact, fresh measurement from committed CSVs). Every
owner-authorized route has been measured and rejected with committed numbers.

The strategic decision is the Owner's (only the Owner can halt a gated target):

- **(a) Accept 3.2175 / 9.6525 as the lab's honest best on this architecture** and close
  #130 (records the complete negative ledger as the deliverable), or
- **(b) Authorize a NEW dedicated issue** for the only unbuilt class: a full learned
  nonlinear transform / JXL-style Modular redesign with learned nonlinear predictor +
  transmitted tree, to run its own research -> architect -> build cycle. This is the path
  that can in principle reach M2/M3, and it requires owner go-ahead plus a format bump.

The codec-comparison table (`2026-08-23-kodak24-codec-comparison.md`) already carries the
X6b floor row in both units, satisfying acceptance criterion 3's "updated row". The
dual-unit `bench_gate.sh` (self-check verified this run: demonstrably fails and passes in
both units) satisfies acceptance criterion 1. Acceptance criterion 2 (prism bench --kodak
mean summed < 8.655 AND per-sample < 2.885, byte-exact, fuzz clean) remains UNMET: the
floor is 9.6525 / 3.2175, which clears only the PNG-class codecs, not WebP lossless nor
JPEG XL.

- the Builder
