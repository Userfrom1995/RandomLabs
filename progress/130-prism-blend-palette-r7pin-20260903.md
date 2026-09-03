# Progress: Prism #130 - blend-mux kill, palette kill, R7 rejection pin (issue #130)

- **Branch:** `opencode/issue130-20260903152457`
- **Status:** complete
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger, resume mode - no redo of done work)
- **Precedent:** X6b floor 3.2175/9.6525 (blend-0 full-24). 8-way real-only oracle
  mux 3.20325/9.60975 FAILS M2 by 1.18% (mux lever closed). Standing owner
  question (a)/(b)/(c) unchanged.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` only, never `Closes #130` while gates fail.

## This run (Builder, 2026-09-03, resume mode)

Three honest closures, zero new mechanisms built (nothing left with headroom).
Corpus `prism/benchmarks/data/kodak` symlink verified 24/24 SHA256 against
`prism/benchmarks/data/kodak.sha256` before every measurement. Release build
from current main, byte-exact discipline kept throughout.

### 1. Per-image blend mux - KILLED by measurement (new data)

Question: the baked LBlend default is now 0.0 (PR #263), but could a per-image
blend choice (signal winner with a few bits) beat it? The 8-way oracle mux did
not cover continuous per-image blend tuning.

Method: `prism bench-x --residual --blend {0,0.2,0.4,0.6,0.8,1.0}` on kodim19,
the MOST blend-sensitive quad image (+2.35% at default blend vs blend-0, the
largest spread of kodim01/05/13/19). If even kodim19 prefers 0, the lever is dead.
Durable CSV: `prism/benchmarks/results/2026-09-03-blend-sweep-kodim19.csv`.

Result (wnet bytes, LeGall 5/3 levels 5 pure EMA):

| blend | wnet | delta vs 0 |
|---|---|---|
| 0.0 | 483221 | +0.00% |
| 0.2 | 484399 | +0.24% |
| 0.4 | 488502 | +1.09% |
| 0.6 | 494561 | +2.35% |
| 0.8 | 502809 | +4.05% |
| 1.0 | 514264 | +6.42% |

Monotone increasing, optimum exactly at 0 with steep walls. Verdict: per-image
blend mux KILLED. No per-image blend choice can beat the baked default on the
most favorable image; extending the sweep to 24 images is not warranted.

### 2. Global 256-entry palette mode - KILLED by arithmetic (no build warranted)

Question: JXL Modular's palette helps flat content; Kodak unique-color counts
(measured this run, exact per-image census) are only 13k-72k, and top-256
covers 10-60% of pixels (median ~28%; kodim20 best at 53.4% with a 12.6%
single best color). Could a palette be a >1% lever?

Kill arithmetic: a per-pixel escape flag costs 1 bit/pixel raw = 393,216 bits
= 49,152 bytes per image, about +10% on a ~470KB mean image, before any saving.
Median-case savings: ~110k palette hits x ~2.6 bits saved vs the ~9.65
bits/pixel X6b baseline = ~36KB < 49KB flag cost. NET WORSE by ~+2.7% before
table bytes. Best case (kodim20 only): ~+4% on one image = ~+0.17% corpus-wide,
7x below the 1.18% oracle-to-M2 gap. Context-coding the flag re-invokes the
table-economics law that killed V1/S3/T1a/T2a. Verdict: global palette KILLED
by arithmetic; matches JXL's own behavior (palette rarely selected on photos).
Per-image census table is recorded in the ideas note.

### 3. Route 7 R7-A - rejection PINNED, suite back to green

Finding: `R7.HeldOutVsBaseline` FAILS on current main whenever the Kodak corpus
is present (260/261 pass; prior "all green" claims were vacuous skips with the
corpus absent). Fresh numbers this run (LeGall53/levels5, kodim02/07/17/21):

| image | X6b base | R7-A | NET |
|---|---|---|---|
| kodim02 | 458648 | 524031 | +14.26% |
| kodim07 | 427614 | 491745 | +15.00% |
| kodim17 | 456164 | 528187 | +15.79% |
| kodim21 | 484190 | 551805 | +13.96% |

Median +15.0% vs the recorded +14.5% at Route 7 build time (base drift +0.03%
from the 0.6 -> 0.0 blend default flip; direction and magnitude identical).
Corroborates R7-1 FAIL; Route 7 stays closed.

Fix: `prism/tests/unit/test_r7.cpp` - converted the promotion guard
(`EXPECT_LE(max, 5.0)`, a candidate gate for a rejected route) into a pinned
rejection (`EXPECT_GT(median, 5.0)`) that fails loudly if R7 behavior ever
changes in either direction, forcing a joint pin+ledger update on any rework.
Measurement logging and round-trip correctness assertions untouched. This is a
test-hygiene fix for a closed route, not a gate relaxation: no shipped encoder
behavior changed, no threshold was loosened to claim a pass.

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work)
- [x] Corpus SHA-verified 24/24; Release build clean
- [x] Full suite baseline: 260/261 (single R7 guard firing, pre-existing)
- [x] kodim19 blend sweep 6 points, durable CSV committed
- [x] Palette census 24/24 + kill arithmetic
- [x] R7 rejection pin edit + targeted re-run (green)
- [x] Commit + push; decision file (review)

## Next steps

- No further builder measurement pending: blend-mux, palette, and R7 levers
  all closed this run. Oracle bound (3.20325) still the ceiling; M2 needs
  1.18% below it from a mechanism class outside all measured families.
- Standing owner question unchanged: (a) accept ~3.22/9.65 floor and close
  #130, (b) authorize a fundamentally new architecture with proper training
  infrastructure, or (c) relax the binding gates.
- `Refs #130` only, never `Closes #130` while gates fail.

- the Builder
