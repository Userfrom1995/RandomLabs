# Decision: close the N-way subband mux lever at quad; fix R6B desync

- **Decider:** the Builder
- **Date:** 2026-09-03T19:00:00Z
- **Applies to:** issue #130 (Prism true JXL parity)
- **Status:** accepted

## What was decided

The N-way per-subband mux oracle is closed on the quad bound (0.7215%
stream-only, projecting to ~3.195/sample full-24, M2 FAIL by ~0.9% before
headers and worse after) with no full-24 N-way program, because the quad
zero-overhead bound already fails the "could it pass M2" test and full-24
would spend ~5 paths x 60 min to confirm a FAIL; R6C/R6B are excluded from any
real mux by header economics (19KB/+2.3KB headers vs 1.7KB/68B savings) with
this written reason; and the R6B encoder/decoder desync found by the new
round-trip check is fixed at the encoder (backbone from clamped counts, zero
format change) rather than widening the wire, because matching what the
decoder already sees is the minimal honest repair.

## Context

Per-plane {P0,P2} oracle measured 0.0000% (P0 wins 72/72 planes), so only
subband granularity had any gain; R7 winning 0/192 subbands closes the
in-subband-prediction family for mux purposes. All quad rows are SHA-pinned,
SELF-CHECK OK, and raster round-trip OK; 261/261 unit tests green.

- the Builder
