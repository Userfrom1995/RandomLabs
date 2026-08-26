# Prism S3: extended causal properties under honest NET accounting

- **Date:** 2026-08-25 (S-series slice P2 of the source-side-only pivot,
  PR #145, issue #130)
- **Role:** the Builder
- **Status:** measured and CLOSED - S3 FAIL per its pre-registered gate;
  bucket B2 closed-with-numbers; zero container bytes by construction.

## What this was

The V1 measurement left one conditioning bucket open (B2): E0 had shown
per-image static margins of +1.86..+2.95 points of v0 behind richer causal
context, but every earlier probe had been poisoned by pooled joint scoring
or free side info. S3 was the clean test mandated by spec addendum 19.4:
does a FLAT HASHED keying over an extended causal property list beat the
best-flat-16 static spine once every transmitted byte is paid for?

The property list was frozen before any code ran:

- qW/qN/qNW/qNE - production quotient buckets of the neighbor residuals
  (quant_residual, values 0..6), with per-image octile edges computed from
  strictly-past samples only (edge k = smallest value whose cumulative
  count reaches k/8 of the total-so-far; bucket = number of deduped edges
  <= value). Prefix-invariance is structural, not hoped for: assignment of
  sample i can never depend on sample j > i, and a pinned unit test
  proves it by mutating the trailing half of a stream.
- gbW/gbN - the amendment-A4 CALIC gradient pair evaluated on the residual
  stream through the shared bias_bucket thresholds.
- plane id - raw plane index in the YCoCg-R transformed raster.
- e_max_prev - the previous sample's error magnitude through the literal
  18.4 edge table [0],[1],[2],[3],[4-5],...,[64+].

Four pre-named variants (SX-FULL/SX-Q/SX-G/SX-E) crossed with k_raw
{64, 256} clusters, caps K <= 256 and the 4096-sample floor inherited from
V0, 'SBP1' merge maps NETTED exactly as V1's decoders mirror count-based
merges.

## The engineering that made it trustworthy

The keying lives in an incremental PropHasher (src/codec/staticmodel.cpp):
it walks raster order once, maintaining tiny exact histograms per quotient
coordinate, and answers each sample's raw cluster id from prior samples
alone. Because the decoder decodes residuals in the same order, it runs a
FRESH hasher over its growing decoded history and reproduces the encoder's
cluster sequence byte-for-byte - no spatial map exists anywhere in the
design (the tree columns of every CSV row are pinned to zero and the shell
schema guard fails a run if they are not). The binding unit test encodes
through the live hasher, decodes through a fresh-hasher ClusterMap with the
transmitted 'SBP1' mapping, and requires identical residuals. Mixer:
FNV-1a word variant over enabled coordinates in the 19.4 listing order -
pinned constants, disabled coordinates skipped entirely.

Instrument discipline held: pins P-S3-1..P-S3-12 committed BEFORE any
measurement row existed; all six VB rails green first (VB-anchor-adapt
4/4 bit-for-bit against committed v2 bytes; VB-anchor-ideal frozen-walk AND
counting path bit-for-bit; rank fixtures live in both directions; fidelity
within the +0.50 pct bound on all 36 variant rows; net-audit clean on 72
rows; determinism byte-identical re-run); quad SHA256 pins verified before
measuring; the baseline cross-check reproduced the committed V1 reference
exactly (kodim01 spine B-IDEAL net 514496). 128/128 unit tests.

## What the measurement said

Every variant lost on every image:

| variant | k | median RELPCT | min | max |
|---|---|---|---|---|
| SX-G    | 64  | -8.09 | -9.94  | -5.95 |
| SX-Q    | 64  | -9.87 | -12.22 | -6.00 |
| SX-E    | 64  | -10.41| -12.24 | -6.75 |
| SX-FULL | 64  | -11.82| -14.04 | -10.09|
| SX-G    | 256 | -10.97| -13.12 | -9.60 |
| SX-Q    | 256 | -12.50| -15.56 | -10.55|
| SX-E    | 256 | -14.31| -16.62 | -12.07|
| SX-FULL | 256 | -16.62| -19.40 | -14.99|

Bar: >= +1.50 pct median vs the same-stack best-flat-16 baseline (fresh
in-run control). Verdict: FAIL, decisively and uniformly.

## Why it failed (the recorded mechanism)

Under I12 NET accounting the richer keying must PAY for its own tables.
At k=256 the smoothed tables cost ~40 KB per image - two orders of
magnitude above what conditioning could recover even at E0's static
ceilings - and at k=64 (~11 KB) the hash spreads samples so thin that
per-cluster statistics stay noisy while the table bill still dwarfs the
gain. E0's +2..+3 point margins were measured as ORACLE static ceilings
with tables never charged; S3 shows those margins do not survive contact
with payable side info at cluster counts that could realize them. This is
the same lesson V1's KTREE rows taught (tiny tree blob, huge per-leaf
table cost), now confirmed for causal-property keyings with zero spatial
structure.

## Consequence

Bucket B2 closes with numbers: flat-16 keying ships unchanged. With B1
(closed at V1), B3 (closed at S1), and B2 closed, the S-series composition
candidates reduce to {adaptive production control, static spine} x D4c
color trials - exactly decision-tree row 1. Slice P3 runs S4's per-image
composition and the 18.5 projection readout against the committed e1 CSV
(threshold < 9.35 summed / < 3.117 per-sample); midpoint arithmetic lands
~9.5-9.6 summed, above threshold, so stop-and-report is the expected
honest outcome unless the fresh measurement surprises upward.

Evidence: `prism/benchmarks/results/2026-08-25-sandbox-s3.csv`;
pins record `.github/agents/decisions/builder/2026-08-25T23-00-00-s3-
property-pins.md`; program blueprint `prism/docs/architecture-jxl-parity-
sourcepivot.md`.

- the Builder
