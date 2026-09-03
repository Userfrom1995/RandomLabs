# Progress: Prism #130 - real-only 8-way mux oracle bound (issue #130)

- **Branch:** `opencode/issue130-20260903144614`
- **Status:** complete
- **Date:** 2026-09-03 (Builder run, resume mode - no redo of done work)
- **Precedent:** PR #268 built the 2-way per-image mux oracle min(e7, X6b)
  (11348667 bytes = 3.2068/9.6204, M2/M3 FAIL); PR #269 recomputed it
  exactly. Both stay OPEN and untouched by this run.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `Refs #130` only, never `Closes #130` while gates fail.

## This run (new datum, not a redo)

PR #268/#269 closed the 2-way mux question. The remaining mux question was
whether a wider per-image mux over EVERY real encoder on main could reach
M2. Answered by artifact-level computation only (zero new encodes, zero
source changes): per-image min over all 8 committed full-24 REAL-container-byte
CSV series on current main.

Real-only mux set (all 24/24 kodim rows present, byte columns):

| Key | CSV on main | Bytes total | per-sample / summed |
|---|---|---|---|
| e7 | 2026-09-03-prism-e7.csv | 11952491 | 3.37742 / 10.13225 |
| x6b_wnet | 2026-09-03-x6b-blend0-full24.csv (wnet) | 11389848 | 3.21843 / 9.65529 |
| x6b_spatial | same CSV (spayload) | 11550718 | 3.26389 / 9.79166 |
| jxlmod_final | 2026-09-01-jxl-modular-final-kodak24.csv | 11645331 | 3.29062 / 9.87187 |
| jxlmod_xsub | 2026-09-02-jxl-modular-real-xsubband-kodak24.csv | 11643150 | 3.29001 / 9.87002 |
| r9 | 2026-08-30-r9-tree-quant-ema-kodak24.csv (wnet) | 11411391 | 3.22452 / 9.67356 |
| r10mlp | 2026-08-30-route10-mlp-kodak24.csv (wnet) | 11407848 | 3.22352 / 9.67055 |
| e0 | 2026-09-01-prism-e0.csv | 20127986 | 5.68757 / 17.06271 |

(Dual units recomputed from byte sums over 28311552 samples = 24 x 768 x 512
x 3. jxlmod_final roundtrip-verified byte-exact per
progress/130-prism-two-pass-jxl-modular.md.)

## Result: 8-way real-only mux oracle

- Total 11336122 bytes = **3.20325 per-sample / 9.60975 summed**.
- M2 (9.60975 < 9.498 AND 3.20325 < 3.166): **FAIL both units**
  (shortfall +1.18% on both units).
- M3: **FAIL both units** (far).
- Per-image winners: x6b_wnet 15, x6b_spatial 5, r9 3, e7 1.
  jxlmod_final and jxlmod_xsub win ZERO images (fully dominated at ~3.29).
- Sanity: restricted to {e7, x6b_wnet} the script reproduces PR #268/#269
  exactly (11348667 = 3.20679/9.62038).
- Durable artifact: prism/benchmarks/results/2026-09-03-mux8-oracle-bound-kodak24.csv
  (per-image min bytes + winner; a BOUND, not a measurement - see below).

## Excluded with written reasons (unit-consistency rule)

- `2026-08-31-jxl-modular-kodak24.csv` (3.16065/9.48194, would pass M2):
  EXCLUDED. Its producer `bench-jxl-modular` is commented in main.cpp as
  "Measures the theoretical ANS-coded size" - an estimator with no roundtrip
  column, not container bytes. Mixing it with real byte counts would repeat
  the original M1-M3 mixed-units sin. A blind 10-way min including it reads
  3.14266/9.42797 (M2 PASS) and is WRONG for exactly this reason; it is
  oracle-of-oracle, dominated by the already-recorded PR #224 theoretical
  oracle 3.161 which the ledger deems unrealizable (decoder cannot know
  abs(actual_coeff)).
- `2026-09-01-neural-codec-e1.csv`: EXCLUDED. Constant 17694775 bytes /
  120.0 bpp on all 24 images - stub/placeholder, non-comparable unit.
- e0/r9/r10mlp included for exhaustiveness (only r9 ever wins: 3 images).

## What this proves (mux lever comprehensively closed)

A per-image mux over real encoders is itself realizable (encode-all, signal
the winner with flag bits). The oracle computed here costs ZERO selection
overhead, so any real mux encoder scores >= 3.20325/9.60975. Since even the
zero-overhead oracle fails M2 by 1.18% on both units, NO real mux of main's
encoders can pass M2. There is no `bench-mux` left to build: the oracle
bound already fails the gate. r9 winning 3 images changes nothing (bound
still fails). jxl-modular-real never winning an image closes its mux value.

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work)
- [x] Enumerate committed full-24 CSVs, verify 24/24 kodim rows each
- [x] Provenance-check the sub-M2 08-31 CSV (estimator, excluded with reason)
- [x] Compute 8-way real-only mux oracle, both units, gate eval
- [x] Reproduce 2-way 11348667 as sanity check
- [x] Durable oracle-bound CSV committed (named *-oracle-bound-*, documented)
- [x] Commit + push; decision file (review)

## Next steps (no further builder measurement pending on mux)

- Mux lever closed: 2-way (PR #268/#269), 8-way real-only (this run). Both FAIL M2.
- Standing owner question unchanged: (a) accept 3.21843/9.65529 floor and
  close #130, (b) authorize a fundamentally new architecture with proper
  training infrastructure, or (c) relax the binding gates. Merge decisions on
  open PRs #266/#268/#269 are the Maintainer's.
- `Refs #130` only, never `Closes #130` while gates fail.

- the Builder
