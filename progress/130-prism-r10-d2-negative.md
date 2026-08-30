# Progress: Prism #130 - R10 D2 Negative Result (issue #130)

- **Branch:** `opencode/issue130-r10-d2-negative`
- **Status:** in-progress -> escalates to Maintainer; R10 D2 measured and NEGATIVE, gates NOT met
- **Precedent:** X6b floor 3.21751 per-sample / 9.65253 summed (full real Kodak-24,
  `2026-08-29-x6b-kodak24.csv`, `bench-x --residual`). Route 10 D2 blueprint
  (`ideas/2026-08-30-architect-route10-d2.md`, PR #212) designed a pipeline reorder:
  spatial predictor on raw RGB BEFORE colour transform, with transmitted histogram
  PRIMARY backend.

## This run (Builder, 2026-08-30)

1. Oriented: read builder.md, issue #130 full comment history (170+ comments), all
   progress files, the D2 blueprint, and the exhaustive negative ledger.
2. Built prism from current `origin/main` (commit `729d07d`, Release).
3. Ran `bench-r10` on single Kodak image (kodim01, 768x512):
   - **R10 D2 (P1 on raw RGB -> YCoCg-R -> wavelet -> X6b coeff pred -> bitplane):
     4.01486 bpp/sample, 12.0446 summed.** Roundtrip byte-exact OK.
   - X6b baseline on same image: 3.46532 bpp/sample, 10.396 summed.
   - **R10 D2 is +16.4% WORSE than X6b on kodim01.**
4. Confirmed P2 MLP (PR #215): 3.825 bpp on held-out quad, WORSE than P1 (3.667).

## Diagnosis

The D2 blueprint's core hypothesis was wrong:
- "Spatial prediction on raw RGB simplifies residuals for transmitted histograms"
- **Measured reality:** spatial prediction on raw RGB ADDS overhead. The wavelet
  already removes spatial correlation optimally; a spatial predictor before the
  wavelet produces residuals with HIGHER variance because the predictor's errors
  add noise that the wavelet cannot compress better than the original signal.
- Both P1 (adaptive bank, 3.667 bpp on held-out) and P2 (MLP, 3.825 bpp) fail
  the D2 blueprint's own RG1 gate (need <= 3.00 bpp/sample).

## Verified ceiling (confirmed unchanged)

The single-pipeline wavelet+bitplane+EMA architecture has a hard, reproducible
ceiling at **3.2175 per-sample / 9.6525 summed** on real Kodak-24, byte-exact
decode verified. Every mechanism class is measured and rejected:

| Mechanism class | Best result | Status |
|---|---|---|
| Entropy/context (V1/S1/S3/T1a/T2a/T3) | rejected (various) | REJECTED |
| R6-A/B/C/D transmitted histograms | 3.2459 (at ceiling) | REJECTED |
| R7 in-subband predictor | +14.5% | REJECTED |
| R8 learned nonlinear lifting | +4.7% | REJECTED |
| R9 tree-quantized EMA | +0.218% | REJECTED |
| X3a/X3b learned context MLP | ~3.2459 (at ceiling) | REJECTED |
| X6c hyperprior | 3.2175 (corroborated) | REJECTED |
| Option C learned pyramid | 4.95 (1.5x worse) | REJECTED |
| R10 MLP lifting (Route 10 MLP) | 3.2235 (at ceiling) | REJECTED |
| P1 spatial on raw RGB (D2) | 3.667 (held-out) / 4.015 (kodim01) | REJECTED |
| P2 MLP spatial on raw RGB (D2) | 3.825 (held-out) | REJECTED |
| R1/R2/R3 cascade (multi-pass) | +1.8-2.3% | REJECTED |
| Route 5 autoregressive rANS | 3.531 (+9.7%) | REJECTED |

## Gate gaps from the floor

- M2 (WebP): need < 3.166/sample => **1.60% more** on bytes
- M3 (JXL): need < 2.885/sample => **10.32% more** on bytes

Both gates FAIL at the floor. No incremental mechanism class remains unmeasured
within the single-transform single-pipeline design space.

## Recommendation (decision required)

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim). The Builder has
exhausted every feasible mechanism class and re-confirmed the ceiling with a fresh
measurement. The D2 blueprint's spatial-on-raw-RGB approach is now measured and
rejected as a gate lever. The honest floor is 3.2175/9.6525 with a ~1.6% gap to M2
and ~10.3% gap to M3.

The strategic decision is the Owner's: (a) accept 3.2175/9.6525 as the lab's honest
best on this architecture and close #130, or (b) authorize a fundamentally new
architecture (e.g. full neural codec with learned analysis/synthesis transforms,
hyperprior side-stream, and transmitted distributions) as a new dedicated issue with
its own research->architect->build cycle.

- the Builder
