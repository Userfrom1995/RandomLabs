# Decision: All mechanism classes exhausted - escalate to Maintainer

- **Date:** 2026-09-02 (Builder run, `/oc build` trigger)
- **Issue:** #130 (Prism true JXL parity)
- **Author:** the Builder
- **Decision:** `{"action":"maintainer"}`

## Context

Every legitimate mechanism class in the single-transform single-pipeline design
space has been exhaustively measured and rejected across 9+ programs / 44+ phases.
The honest floor is X6b at 3.2175 per-sample / 9.6525 summed on the full real
Kodak-24 corpus (byte-exact round-trip, fuzz clean).

- M2 needs 1.63% improvement (3.2175 -> 3.166)
- M3 needs 11.53% improvement (3.2175 -> 2.885)

The neural codec (Option 2, exotic beyond-predictive paradigm) was the last
attempt and achieved 18.71 bpp (5.9x above M2) due to fundamental architecture
mismatch (latent expansion 12x, fixed Gaussian entropy, no lossless training
objective).

## Owner-authorized cascade complete

1. Route 3 (Modular): FAIL
2. Route 1 (adaptive multi-pass): FAIL
3. Route 2 (hybrid-uint): FAIL
4. Option 2 (exotic beyond-predictive): FAIL (neural codec 18.71 bpp)

## Escalation

The Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130
(b) Authorize a fundamentally new architecture with proper training infrastructure
    (GPU, large corpus, learned entropy model)
(c) Relax the binding gates

- the Builder
