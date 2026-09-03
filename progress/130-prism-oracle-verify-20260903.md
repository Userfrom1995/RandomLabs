# Progress: Prism #130 - Independent verification of hybrid oracle bound (issue #130)

- **Branch:** `opencode/issue130-20260903143853`
- **Status:** complete (verification, no new mechanism)
- **Date:** 2026-09-03 (Builder run, `/oc build this` trigger, resume mode)
- **Precedent:** PR #268 (OPEN) claims the e7/X6b per-image mux oracle at
  3.2068 per-sample / 9.6204 summed, M2/M3 FAIL. PR #267 (MERGEABLE) proved
  default-blend parity. Floor 3.21843/9.65529 confirmed on main (PR #266).

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority.
- `Refs #130` only, never `Closes #130` while gates fail.

## This run (Builder, 2026-09-03, resume mode - verification, no redo)

1. Oriented: branch at `origin/main` (`81f6769`), clean tree. Read the issue
   tail and the newest progress files (hybrid oracle, blend0 default/full24,
   floor-fresh). No new mechanism class since R9; per resume mode, verified
   rather than rebuilt.
2. Corpus: `prism/benchmarks/data/kodak`, **24/24 SHA256 OK** against
   `prism/benchmarks/data/kodak.sha256` (run from inside the kodak dir).
3. `bench_gate.sh --self-check`: **PASS** (gate demonstrably fails known-bad
   and passes known-good, both units printed). D1 deliverable intact.
4. Clean Release build from current main (`81f6769`): configure exit 0,
   build exit 0. Unit suite **260/260 PASS**
   (`--gtest_filter=-R7.HeldOutVsBaseline`; excluded guard red on unmodified
   main by design, needs 600 s+ alone).
5. **Independent recomputation of PR #268's oracle** (zero re-encoding,
   pure artifact-level check): per-image `min(e7 bytes, X6b wnet)` from the
   two committed current-main CSVs (`2026-09-03-prism-e7.csv`,
   `2026-09-03-x6b-blend0-full24.csv`):
   - Recomputed mux total **11348667 bytes = oracle CSV total** (exact match).
   - All **24/24 rows match** (bytes + winner column, ties: none occur).
   - Dual units from verified sum: **3.2068 per-sample / 9.6204 summed**
     (matches claim to 4 dp).
   - Delta vs X6b floor: **-0.3616%**. M2 shortfall: **+1.288%** per-sample.
   - Gate eval (same comparisons as `bench_gate.sh gate_eval`, both units
     enforced): **M2 FAIL both units, M3 FAIL both units**.

## Milestone Checklist

- [x] Orient + read ledger (no redo of done work)
- [x] SHA-verified corpus present (24/24 files, 0 failures)
- [x] Clean Release build from current main
- [x] bench_gate.sh self-check PASS
- [x] Unit suite 260/260 (R7 guard excluded, red-on-main by design)
- [x] Oracle CSV independently recomputed: totals, rows, units all match
- [x] Dual-unit gate eval on verified oracle (M2/M3 FAIL as claimed)
- [x] Commit + push; decision file (review)

## Honest state (dual units)

- PR #268's oracle bound is **arithmetically correct** as claimed. Paths are
  nearly strictly ordered (e7 wins 2/24), so muxing cannot reach M2.
- Standing owner question unchanged: (a) accept 3.21843/9.65529 as the honest
  floor, (b) authorize a fundamentally new architecture with proper training
  infrastructure, or (c) relax the binding gates.
- `Refs #130` only, never `Closes #130` - performance-gated issue stays open.

- the Builder
