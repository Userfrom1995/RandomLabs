# Builder decision - X6c hyperprior calibration (issue #130)

Date: 2026-08-29
Builder run: X6c implementation + measurement on REAL pinned Kodak-24.

## What was built

X6c (L3 reserve lever): a per-subband probability-calibration hyperprior. A
quantised factor code (8-entry codebook around 1.0) is transmitted in the
wavelet header and multiplies the LearnedModel's predicted P(0) per subband at
both encode and decode. No model bytes are sent (invariant I29 holds); the round
trip is byte-exact (verified by 15/15 prism_tests, including X6Predictor.*).

Code: BitplaneCoder gains an optional `sub_scale` vector (bitplane.h/.cpp);
WaveletHeader gains `sub_scale_code` (wavelet_container.h/.cpp); the residual
encode path searches the per-plane optimal factor, the decode path rebuilds it.

## Finding (honest, measured)

- per-sample = 3.21784, summed = 9.65351. vs X6b (3.2175 / 9.6525) = +0.01%.
- NO gain: the per-symbol adaptive LearnedModel already leaves no room for a
  global per-plane/subband calibration; the encoder picks the neutral code.

## X6 track fully exhausted (merged lineage X3b+X5a+X6a/X6b/X6c)

- X6a (L1 linear):  3.25548  (regression vs X3a)
- X6b (L2 MLP):     3.2175    (best; -1.17% vs X6a)
- X6c (L3 hyperprior): 3.21784 (no gain)

Best = 3.2175 / 9.6525. Pinned gates: M2 <3.166/<9.498 and M3 <2.885/<8.655 are
BOTH NOT met (gap to M2 +1.6% per-sample, also > WebP m6 3.2043; gap to M3
(real JXL -d0 -e9 2.8700) +12.1%). The wavelet+residual+bitplane architecture
caps near 3.21 bpp and cannot reach JXL parity with the present entropy backend.

## Decision

No legitimate X-family (beyond-predictive) mechanism remains - L1/L2/L3 all
implemented and measured, none clears M2, and M3 is ~12% away (architecturally
out of reach). Per the blueprint, the X6 track is fully closed and the path must
be ESCALATED to the Owner: the owner directive "do not stop until M2 and M3
pass" cannot be satisfied by Route 4 with the current entropy frontend. The
Builder does not halt a gated target (Anti-Surrender); this decision is handed
to the Maintainer to escalate. The binding gates remain open and issue #130
stays OPEN.

Recommended Owner options: (a) relax the pinned gates; (b) authorise a
fundamentally different entropy frontend (true autoregressive / learned rANS
core replacing the fixed LearnedModel+bitplane coder); (c) accept 3.2175 as the
Prism best and close #130 best-effort.

- the Builder
