# Progress: Prism #130 - N-way per-subband mux oracle on quad (issue #130)

- **Branch:** `opencode/issue130-20260903181610`
- **Status:** complete (instrument extended, R6B desync fixed, quad N-way
  measured, lever closed; M2/M3 FAIL)
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger, resume mode)
- **Precedent:** Whole-image mux closed 2-way (3.2068) and 8-way real-only
  (3.20325/9.60975, M2 FAIL by 1.18%). Per-subband {P0,P2} full-24 oracle
  3.20664/9.61993 (M2 FAIL by 1.3%). Per-plane {P0,P2} oracle 0.0000%
  (P0 wins 72/72 planes, this run). Never previously measured: per-subband
  mux over ALL wavelet paths (R7/R5/R6B/R6C win subbands whole-image
  oracle cannot see).

## Binding gates (both units, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `Refs #130` only, never `Closes #130` while gates fail.

## This run, part 1: instrument (additive, zero production-path changes)

Extended `prism bench-subband` with `--r6b`, `--r6c [--kb N]` (default 256),
`--r7` (MED, no adaptive filter), `--route5`. Exactly-one-path enforced
(`--direct`/`--r9-tree` conflict abort non-zero). Added a raster round-trip
check (`frame_wavelet_decode` byte-exact vs input) to the instrument for ALL
paths, so every oracle candidate provably codes identical coefficients.
Usage line updated. Files touched: `prism/src/cli/main.cpp` only, plus the
R6B fix below in `prism/src/codec/bitplane.cpp`.

## This run, part 2: REAL BUG FOUND AND FIXED (R6B encode/decode desync)

The new round-trip check caught that `bench-r6b` FAILs decode on real Kodak
images on current main (kodim01 FAIL, blend-independent; the committed
`bench-r6b` command itself fails, so this is pre-existing, not caused by the
instrument). Unit tests stayed 261/261 green because synthetic images never
trip it. Root cause: `BitplaneCoder::encode_static` (bitplane.cpp) builds its
static P(0) backbone from UNCLAMPED per-class counts, while the container
(wavelet_container.cpp:670) clamps counts to 16 bits on the wire and the
decoder rebuilds P(0) from the clamped counts. Any class count > 65535 (every
real Kodak image; never a unit-test image) desyncs the rANS stream. Fix:
derive the encoder backbone from `min(cnt, 0xFFFF)`, bit-identical to what the
decoder sees. Zero format change (wire already clamped). After fix:
`bench-r6b` round-trips kodim01 (net 539440, 3.658/sample, +6.5% vs P0,
consistent with the ledger's R6-B +6% rejection) and the full quad.
R6B stays rejected (worse), but is honest again.

## This run, part 3: quad N-way oracle (kodim01/05/13/19, SHA-pinned, blend 0)

Stream-byte totals vs P0 (2097672): P2 +0.91%, R7 +14.31%, R5 +13.59%,
R6B-fixed +5.48%, R6C +(-0.34%) (streams only; header +19KB, see below).
All rows SELF-CHECK OK + round-trip OK. {P0,P2} saving 0.3921% reproduces the
committed quad oracle exactly (instrument validated).

Per-subband oracle savings vs P0 streams:

| Candidate set | Quad saving |
|---|---|
| {P0, P2} | 0.3921% |
| +R7 | 0.3921% (+0.000pp; R7 wins 0/192 subbands) |
| +R5 | 0.3943% (+0.002pp; 2 wins, noise) |
| +R6B | 0.4050% (+0.013pp; 17 wins) |
| +R6C | **0.7215%** (+0.33pp; 50 wins) |

Subband wins (192): P0 73, P2 50, R6C 50, R6B 17, R5 2, R7 0.

## Verdict: N-way subband mux lever CLOSED (M2/M3 FAIL)

1. Even the zero-overhead STREAM oracle (0.72%) projects to ~3.195/sample
   full-24 (0.72% off the 3.21843 floor), still M2 FAIL by ~0.9% and M3 far.
   No full-24 N-way program warranted: the quad bound already fails the
   "could it pass" test, and full-24 would cost ~5 paths x 60 min to confirm
   a FAIL. This is the honest projection, stated in both units in the ideas
   entry.
2. Headers make it worse, not better: R6C's 19KB/image cluster histogram is
   ~10x its 1.7KB/image stream saving; R6B's +2.3KB header wipes its 68B/image
   saving. The only realizable mux ({P0,P2}, identical 623B headers + ~12B
   flags) stays at 0.39% quad / 0.37% full-24 = 3.20664, M2 FAIL by 1.3%.
   R6C/R6B are therefore EXCLUDED from any real mux with this written reason
   (same unit-consistency spirit as the mux8 estimator exclusion).
3. R7 (in-subband prediction) winning 0/192 subbands at +14% closes the
   "different coefficient values win different bands" hypothesis for the
   MED/gradient family.

Mux lever now closed at every granularity and width: whole-image 2-way and
8-way, per-plane (0.0000%), per-subband 2-way full-24, per-subband N-way quad.
Best bound remains the 8-way whole-image oracle 3.20325/9.60975 (M2 FAIL).

## Standing owner question (unchanged)

(a) accept the 3.21843/9.65529 floor (best bound 3.20325) and close #130,
(b) authorize a fundamentally new architecture with proper training
infrastructure, or (c) relax the binding gates. No further builder measurement
is warranted on mux; the next lever (if any) needs Research/Architect
direction, not another oracle.

## Milestone checklist

- [x] Orient (ledger, branches, corpus SHA 4/4 quad pins)
- [x] bench-subband N-way flags + raster round-trip check (additive only)
- [x] R6B desync root-caused + fixed (encoder backbone from clamped counts)
- [x] Release build + 261/261 unit tests green + bench_gate self-check
- [x] Quad CSVs: R7, ROUTE5, R6B-fixed, R6C (all SELF-CHECK + round-trip OK)
- [x] N-way oracle CSV + quad gate projection (FAIL, both units)
- [x] Durable artifacts committed under prism/benchmarks/results/
- [x] ideas/ entry + decision doc; commit + push + PR (Refs #130)

- the Builder
