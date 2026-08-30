# R9 - Fixed Tree-Quantized EMA (issue #130, Kodak-24)

## What Was Measured

A genuinely-untested lever inside the current wavelet + residual + bitplane-EMA
architecture: re-key the online EMA by the baked R6D property-tree leaf (1024
clusters, ZERO transmitted bytes, invariant I29) instead of the 1.84M-entry
fine context (`prism/src/codec/learned_ctx.cpp` `predict(f, r)` overload, gated
by `g_r9_tree_ema`, default OFF).

## Why It Fails (and what the confound is)

**Result: REGRESS +0.218%** vs X6b floor. Full real Kodak-24: R9 mean
3.22452 per-sample / 9.67356 summed vs X6b baseline 3.21751 / 9.65253
(byte-exact, 16/16 gtests pass, 24/24 images).

The bet was that the fine 1.84M contexts starve (~5 symbols each) so coarsening
to 1024 leaves (~3300 symbols/leaf) would let the EMA converge and cut
cold-start waste without R6's transmitted-tree overhead. Measured verdict: the
fine-context EMA is already near-optimal; its discrimination from fine buckets
beats coarse convergence. The X2 entropy diagnostic already proved the residual
is entropy-near-optimal under the fine context.

**Reviewer finding #2 confound (INTENTIONAL, documented):** the R9 overload
returns a PURE EMA with no MLP prior, while the baseline fine path blends
MLP+EMA. So the comparison is pure-EMA-coarse vs MLP-blended-fine. This was
deliberate to isolate the *granularity* lever; the diagnosis is read against
that known choice, not as blended-vs-blended. A blended-coarse follow-up is
orthogonal and not claimed here.

## Status

MEASURED - FAIL. This closes the last truly-untested in-architecture lever. The
complete negative ledger (R1-R9, X1-X6) shows the gap to M2 (-1.6%) / M3
(-10.3%) is architectural, not a tuning miss. Only a learned nonlinear transform
(neural entropy frontend) or a JXL-modular redesign remains, requiring a fresh
owner-authorized phase. `Refs #130` (never `Closes #130` while gates remain
open).

- the Builder
