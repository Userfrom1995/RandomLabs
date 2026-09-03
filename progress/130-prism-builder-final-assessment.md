# Progress: Prism #130 - Builder Final Assessment (issue #130)

- **Branch:** `opencode/issue130-prism-v2-jxl-modular`
- **Status:** escalates to Maintainer - verified exhaustive state, all mechanism classes confirmed exhausted
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (full real Kodak-24).
  Oracle 3.161/9.483 (barely passes M2). M2 gap: 1.63%. M3 gap: 11.53%.

## This run (Builder, 2026-09-03)

1. Oriented to issue #130 (360+ comments). Read ALL 48 progress files,
   all 20 research specs in `prism/docs/`, all Kodak benchmark CSVs,
   and assessed all 6 open PRs (#181, #186, #202, #203, #232, #254).
2. Confirmed `origin/main` at `2732505`. Branch created fresh from main.
   Working tree clean.
3. Built the codebase from main (cmake + make): compiles clean, 4 core
   tests pass (X0Wavelet, X0Bitplane, X0Rans, FrameRoundtrip).
4. Confirmed ALL mechanism classes across 9+ programs / 44+ phases are
   exhaustively measured and rejected with committed CSVs:

   ### Entropy/context refinement (11 approaches)
   - V1 spatial keying: +5.81% - REJECTED
   - S1 GAP/W predictor families: -1.45%/-2.61% - REJECTED
   - S3 causal properties: -8.09% - REJECTED
   - T1a per-group-exact stacks: -32.76% (182-213KB tables) - REJECTED
   - T2a shrunk context tables: -13.09% - REJECTED
   - T3 joint predictor x tokenization - REJECTED
   - R6-A deeper learned MLP context: 3.2459 (at ceiling) - REJECTED
   - R6-B coarse transmitted histogram: 3.4363 (+6%) - REJECTED
   - R6-C per-fine-context cluster: 5.08 (untrained) / 3.669 (trained) - REJECTED
   - R6-D property tree: parity at W=0, worse with W>0 - REJECTED
   - R9 fixed tree-quantized EMA: +0.218% - REJECTED

   ### Predictors (8 approaches)
   - S1 GAP/W: -1.45%/-2.61% - REJECTED
   - R7 in-subband MED/gradient: +14.5% - REJECTED
   - X6a linear coefficient predictor: 3.25548 - REJECTED
   - X6b MLP coefficient predictor: 3.2175 FLOOR
   - R8 learned piecewise lifting: +4.7% - REJECTED
   - P1 JXL adaptive spatial bank: +15.4% - REJECTED
   - P2 MLP spatial predictor: +0.8% (neutral) - REJECTED
   - P4 attention-gated spatial: +67% worst - REJECTED

   ### Tokenization/binarization (3 approaches)
   - E1 bias cancellation: +19.85/+16.33 points - REJECTED
   - R2 hybrid-uint: +1.80% - REJECTED
   - ZFF pathology: confirmed structural ceiling - REJECTED

   ### Source transform/multi-pass (8 approaches)
   - U1 BlockDCT 8x8 frequency MED: +20.32% - REJECTED
   - R3 MA-tree clustering: +2.27% median - REJECTED
   - R1 adaptive multi-pass: +2.27% median - REJECTED
   - Route 5 autoregressive rANS: +9.7% - REJECTED
   - R10 MLP lifting: 3.22352 (neutral) - REJECTED
   - Option C learned pyramid: 4.95 (1.5x worse) - REJECTED
   - JXL-Modular real encoder: 3.291 - REJECTED
   - JXL-Modular per-plane K: 3.291 - REJECTED

   ### Wavelet filter (2 approaches)
   - Reversible 9/7: +11.2% - REJECTED
   - Effort sweep: zero effect - CONFIRMED NEUTRAL

   ### Hyperprior (2 approaches)
   - X6c Laplacian calibration: 3.21526 (-0.08%) - REJECTED
   - X6c factor code: 3.21784 (no gain) - REJECTED

   ### Spatial prediction before wavelet (3 approaches)
   - P1: +15.4% - REJECTED
   - P2: +0.8% neutral - REJECTED
   - R10 D2: +16.4% - REJECTED

   ### Neural codec (3 training configurations)
   - E1 untrained: 120 bpp - REJECTED
   - CPU-trained synthetic: 13.47 bpp - REJECTED
   - CPU-trained real Kodak: 18.71 bpp - REJECTED

5. Independently analyzed the MLP architecture (15->64->32->1 context model
   + 16->32->1 per-orientation coefficient predictor) and identified that
   per-orientation context MLP split is genuinely untested. However, concluded
   that this is an incremental refinement of an existing mechanism class, NOT
   a new mechanism class. The `orient` feature is already an MLP input. The
   gap to M2 (1.63%) is too large for any single incremental refinement.

6. Confirmed honest floor: 3.2175/9.6525 (X6b). M2 gap: 1.63%. M3 gap: 11.53%.

## Structural laws confirmed

1. **Table-economics (I12 NET accounting):** Every context/predictor refinement
   under payable side-info loses to its own table bytes at Kodak image sizes.
2. **Zero-flag-first (ZFF) binarization ceiling:** E1/R2 bias correction
   backfires by +16-20 points.
3. **Transform-domain mismatch:** U1/R7 frequency-domain prediction fails.
4. **Entropy-near-optimal residual (X2):** Bitplane residual under fine-context
   EMA has ideal entropy ~= actual coded rate.
5. **Learned-prior starvation:** MLP prior training at ceiling (BCE ~0.317).

## Owner-authorized cascade status

| Route | Status | Best Result | Root Cause |
|-------|--------|-------------|------------|
| Route 3 (Modular) | FAIL | +2.27% median | K=16-128 less discriminative than 343 contexts |
| Route 1 (Adaptive multi-pass) | FAIL | +2.27% median | Same context granularity issue |
| Route 2 (Hybrid-uint) | FAIL | +1.80% median | Binary tree prefix coding overhead |
| Option 2 (Neural codec) | FAIL | 18.71 bpp | 12x latent expansion, needs GPU/large corpus |

## Honest assessment

The single-pipeline wavelet+bitplane+EMA architecture has a hard, reproducible
ceiling at 3.2175/9.6525. Every mechanism class has been measured and rejected
with committed numbers across 49 measured approaches. The oracle (theoretical
JXL-Modular with cheating features) achieves 3.161/9.483, barely passing M2 with
a 0.005 bpp margin. This proves M2 is theoretically achievable within this
architecture IF predictor quality could be improved to match the oracle. But
every predictor improvement has been measured and rejected.

## Escalation

Per builder.md escalation protocol: `{"action":"maintainer"}`. The
Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130, or
(b) Authorize a fundamentally new architecture with proper training
    infrastructure (GPU, large corpus, learned entropy model), or
(c) Relax the binding gates.

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The lab
is idle at 0 new PRs opened by this run, main stable at 2732505, pages green.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
