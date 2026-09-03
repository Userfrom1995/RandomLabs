# Progress: Prism #130 - default-blend parity verification (issue #130)

- **Branch:** `opencode/issue130-20260903143317`
- **Status:** complete
- **Date:** 2026-09-03 (Builder run, resume mode - no redo of done work)
- **Precedent:** X6b floor 3.21843 per-sample / 9.65529 summed reproduced on
  current main (shards A/B/C + full-24 blend-0 CSVs on main; round-trip spot
  proof kodim16 byte-identical). Open PR #266 carries one unique commit
  (`8d9576f`) with a full-24 DEFAULT-blend CSV proving the baked `LBlend
  0.6 -> 0.0` flip end-to-end, but PR #266 is CONFLICTING and unmerged.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` only, never `Closes #130` while gates fail.

## This run (Builder, 2026-09-03, resume mode)

1. Oriented: branch == `origin/main` (`81f6769`), clean tree. Read the
   blend-0 full-24 progress file (Status: complete, all shards + aggregation
   + gate eval committed), the retry-confirmed escalation, and PR #266 state
   (OPEN, CONFLICTING, head `opencode/issue130-20260903133150`).
2. No new mechanism class proposed since R9; per resume mode, verified rather
   than rebuilt. No 2-hour re-measurement: the datum needed is an
   artifact-level comparison of two already-committed durable CSVs.
3. Extracted PR #266's unique `2026-09-03-x6b-full24-defaultblend.csv`
   (full-24 `bench-x --residual` under the NEW baked default, no `--blend`
   flag) and main's `2026-09-03-x6b-blend0-full24.csv` (explicit `--blend 0`).
   Compared all 24 rows, all columns.

## Measurement - default-blend parity (artifact comparison, zero new compute)

- `diff` of the two CSVs: **IDENTICAL modulo line endings** (24/24 images,
  every column: wnet, wpayload, spayload, both bpp columns, deco_pct,
  l1_shrink). wnet sums equal at 11389848 bytes, delta 0 (+0.0000%).
- Recomputed dual units from the verified byte sum (24 images x 768x512 px
  x 3 samples = 28311552 samples): **3.21843 per-sample / 9.65529 summed**,
  matching PR #266's title to all 5 decimals.
- Gate eval: M2 (9.65529 < 9.498 AND 3.21843 < 3.166) FAIL both units;
  M3 (9.65529 < 8.655 AND 3.21843 < 2.885) FAIL both units. Expected per
  ledger; no success claim.

## What this proves (new written datum, not a redo)

The baked-default flip (`LBlend 0.6 -> 0.0`) reproduces the X6b floor
**exactly** (0 bytes delta across all 24 images) under the default config -
the PR #263 loop is closed end-to-end with no `--blend` flag workaround.
The shipped 15-64-32-1 MLP prior is fully gated out at the new default on
both the wavelet and spatial paths. This confirmation previously existed
only inside unmerged, conflicting PR #266; it is now recorded against main.

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work)
- [x] PR #266 unique artifacts identified (1 commit, 3 files)
- [x] Default-blend vs blend-0 full-24 CSVs byte-compared (identical mod CRLF)
- [x] Dual units recomputed from verified sum (3.21843/9.65529, both stated)
- [x] Dual-unit gate eval (M2/M3 FAIL as expected, no success claim)
- [x] Triage note posted on PR #266 (conflicting + verified-identical)
- [x] Commit + push; decision file (review)

## Next steps (no further builder measurement pending)

- PR #266 needs a rebase onto current main (conflict is in the shared
  progress file; its CSV + decision doc are the keepers) or a close as
  superseded once this verification lands. Merge decision is the
  Maintainer's.
- The standing owner question is unchanged: (a) accept 3.21843/9.65529 as
  the honest best and close #130, (b) authorize a fundamentally new
  architecture with proper training infrastructure, or (c) relax the binding
  gates. Oracle ceiling 3.161 vs M2 3.166 leaves 0.16% margin no real
  predictor can claim; M3 is structurally unreachable in this architecture.
- `Refs #130` only, never `Closes #130` while gates fail.

- the Builder
