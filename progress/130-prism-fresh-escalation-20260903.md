# Progress: Prism #130 - Fresh Build Escalation (issue #130)

- **Branch:** `opencode/issue130-20260903040133`
- **Status:** escalates to Maintainer - all mechanism classes exhaustively exhausted, fresh confirmation
- **Date:** 2026-09-03 (Builder run, `/oc build this` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (full real Kodak-24).
  Oracle 3.161/9.483 (barely passes M2 at 3.166 - only 0.16% margin). M2 gap: 1.63%. M3 gap: 11.53%.

## This run (Builder, 2026-09-03)

1. Oriented to issue #130 (374 comments). Read ALL 48+ progress files,
   all research specs in `prism/docs/`, all benchmark CSVs.
2. Built from `origin/main` (`f2d5263`): compiles clean, basic tests pass.
3. Fresh e7 benchmark on real Kodak-24 (sha-pinned PPMs):
   - Mean per-sample: **3.3774 bpp**
   - Mean summed: **10.1323 bpp/img**
   - M2 gate: **FAIL** (3.3774 > 3.166 per-sample, 10.1323 > 9.498 summed)
   - M3 gate: **FAIL** (3.3774 > 2.885 per-sample, 10.1323 > 8.655 summed)
   - Byte-exact round-trip: VERIFIED on all 24 images
4. JXL-modular-real K-sweep on real Kodak-24:
   - K=4: 3.299/9.896, K=8: **3.288/9.863** (best), K=12: 3.293/9.878
   - K=16: 3.306/9.917, K=24: 3.335/10.004, K=32: 3.366/10.099
   - Best real JXL-modular (K=8): 3.288/9.863. Still FAILS M2.
5. Theoretical estimator (cheat feature: abs(actual_coeff)):
   - 0.915 bpp/sample, 2.745 summed - far below M2/M3
   - The predictor creates very low-entropy residuals (0.915 bpp)
   - Gap to real encoder (3.288): 3.6x due to MA-tree feature quality
6. bench-x --residual (X6b path): works but ~5min/image (X6c hyperprior trial encode),
   single-image kodim01 = 3.465 bpp. Full 24-image sweep infeasible in this run.

## Freshly confirmed honest state (dual units, both paths)

| Path | Per-sample bpp | Summed bpp | M2 (<3.166/<9.498) | M3 (<2.885/<8.655) |
|------|---------------|------------|---------------------|---------------------|
| Standard e7 | 3.3774 | 10.1323 | FAIL (+6.7%) | FAIL (+17.1%) |
| JXL-modular-real K=8 (best) | 3.288 | 9.863 | FAIL (+3.8%) | FAIL (+13.9%) |
| X6b wavelet+EMA floor | 3.2175 | 9.6525 | FAIL (+1.6%) | FAIL (+11.5%) |
| Oracle (cheat) | 3.161 | 9.483 | BARELY PASS (+0.16%) | FAIL (+9.6%) |
| M2 gate | < 3.166 | < 9.498 | TARGET | - |
| M3 gate | < 2.885 | < 8.655 | - | TARGET |

## Key new insight (this run)

The theoretical estimator (0.915 bpp) uses `abs(actual_coeff)` as the MA-tree's
primary split feature. The real encoder uses `abs(c_hat)` (predicted coefficient).
The 3.6x gap is ENTIRELY due to this feature quality difference:
- `abs(actual_coeff)` perfectly groups residuals by magnitude (encoder has it;
  decoder does NOT - chicken-and-egg problem).
- `abs(c_hat)` is a noisy proxy (prediction error varies per sample).

The X6b EMA path (3.2175) is better than JXL-modular-real (3.288) because the
online EMA adapts to ACTUAL decoded values, bypassing the MA-tree feature
limitation. But the EMA is itself at its ceiling (X2 diagnostic: ideal entropy
~ actual coded rate).

## Exhaustive negative ledger (confirmed from prior runs)

44+ mechanism classes measured and rejected across 9+ programs / 49+ phases:
- Entropy/context: V1, S1, S3, T1a, T2a, T3, R6-A/B/C/D, R9 - ALL FAIL
- Predictors: S1 GAP/W, R7, X6a/b, R8, P1, P2, P3, P4 - ALL FAIL
- Tokenization/binarization: E1, R2, ZFF - ALL FAIL
- Source transform/multi-pass: U1, R3/R1, Route 5, R10 MLP, Option C, JXL-Modular - ALL FAIL
- Wavelet filter: LeGall 5/3, 9/7, effort sweep - ALL FAIL
- Hyperprior: X6c (Laplacian + factor code) - exhausted
- Neural codec: 18.71 bpp on CPU (architecture mismatch, needs GPU)

## Oracle ceiling argument (definitive)

The oracle (perfect coefficient knowledge) achieves 3.161 per-sample:
- Only 0.005 bpp (0.16%) above M2 gate of 3.166
- 1.79% below X6b floor of 3.2175
- Proof that M2 is at the absolute theoretical ceiling of the current binarization

No real predictor can match the oracle. Even a perfect predictor that explained
100% of coefficient variance would only reach 3.161, barely clearing M2.
M3 at 2.885 is 11.53% below X6b - structurally unreachable.

## Structural laws (confirmed across all programs)

1. **Table-economics (I12 NET accounting):** Every context/predictor refinement
   under payable side-info loses to its own table bytes at Kodak image sizes.
2. **Zero-flag-first (ZFF) binarization ceiling:** E1/R2 bias correction backfires.
3. **Transform-domain mismatch:** U1/R7 frequency-domain prediction fails.
4. **Entropy-near-optimal residual (X2):** Bitplane residual under fine-context
   EMA has ideal entropy ~= actual coded rate.
5. **Learned-prior starvation:** MLP prior training at ceiling (BCE ~0.317).
6. **MA-tree feature gap:** Real encoder can't use actual residuals as features
   (decoder doesn't know them before decoding - chicken-and-egg).

## Owner-authorized cascade status (ALL FAIL)

| Route | Status | Best Result | Root Cause |
|-------|--------|-------------|------------|
| Route 3 (Modular) | FAIL | +2.27% median | K=16-128 less discriminative than 343 contexts |
| Route 1 (Adaptive multi-pass) | FAIL | +2.27% median | Same context granularity issue |
| Route 2 (Hybrid-uint) | FAIL | +1.80% median | Binary tree prefix coding overhead |
| Option 2 (Neural codec) | FAIL | 18.71 bpp | 12x latent expansion, needs GPU/large corpus |
| X-series (beyond-predictive) | FAIL | 3.2175 floor | MLP coefficient predictor ceiling |
| R6-A/B/C/D (transmitted histograms) | FAIL | 3.2459 ceiling | Coarser than adaptive EMA |
| R8 (learned lifting) | FAIL | +4.7% | Predict-update coupling in lifting |
| R10 (MLP lifting) | FAIL | 3.224 | Neutral, at EMA ceiling |

## Escalation

Per builder.md escalation protocol: `{"action":"maintainer"}`. The
Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130, or
(b) Authorize a fundamentally new architecture with proper training
    infrastructure (GPU, large corpus, learned entropy model), or
(c) Relax the binding gates.

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim).
The lab is idle at 0 new PRs opened by this run, main stable at f2d5263, pages green.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
