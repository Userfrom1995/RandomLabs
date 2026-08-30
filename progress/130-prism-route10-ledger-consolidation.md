# Progress: Prism #130 - Negative Ledger Consolidation (R3 -> R9) (issue #130)

- **Branch:** `opencode/issue130-20260830024922`
- **PR:** (opened/continued by workflow, `Refs #130`)
- **Status:** in-progress -> this run delivers the consolidated negative ledger and
  escalates to Maintainer; gates NOT met (floor 3.2175 / 9.6525).
- **Precedent:** X6b honest floor 3.21751 per-sample / 9.65253 summed (full real
  Kodak-24, `2026-08-29-x6b-kodak24.csv`, `bench-x --residual`). All owner-authorized
  routes R3/R1/R2, X0-X6c, R6-A/B/C/D, R5, R7, R8, R9 measured and rejected.

## This run (Builder, 2026-08-30)

1. Oriented: read builder.md, issue #130 + full comment history, all progress files
   (`progress/130-prism-route*.md`), and the codec-comparison table. Confirmed the
   negative ledger (`research-complete-negative-ledger.md`) stops at the U-series (28
   phases) and does NOT record any route measured afterward.
2. Pinned exact numbers from committed CSVs (not estimates):
   - X6b floor 3.21751 / 9.65253 (with `--residual`); non-residual config 3.2442 / 9.7326.
   - X6c 3.21784 / 9.6535 (hyperprior, doubly exhausted). X6a 3.25548 / 9.76644.
   - R9 3.22452 / 9.67356 (+0.218% vs X6b). R6-A 3.2459 / 9.7377. R6-B 3.4363 / 10.3089.
     R6-C 5.0847 / 15.2541. R5 3.53136 / 10.59408. R7 +14.5% median. R8 3.4711 / 10.4136.
   - Cascade R3/R1 +2.27% median; R2 +1.80% median.
3. Verified the dual-unit `bench_gate.sh --self-check` still demonstrably FAILS on a
   known-bad input and PASSES on a known-good input (acceptance criterion 1 intact).
4. Wrote `prism/docs/negative-ledger-v2-prism-routes-r3-r9.md`: the complete mechanism
   ledger from R3 through R9, every row citing a committed CSV / progress file, plus the
   structural law (table-economics, ZFF ceiling, transform-domain mismatch, entropy-near-
   optimal residual, learned-prior starvation), honest totals, and a decision-ready
   recommendation to the Owner (accept floor + close, or authorize a new learned/neural
   paradigm issue).

## Milestone Checklist

- [x] Orient + read all prior progress / CSVs
- [x] Pin exact floor numbers from committed CSVs (both units)
- [x] Verify `bench_gate.sh --self-check` (demonstrably fails + passes)
- [x] Write consolidated negative ledger v2 (R3 -> R9)
- [x] Update this progress file
- [x] Commit + push; write `{"action":"maintainer"}` decision file
- [ ] Gates M2/M3 met (NOT reached - requires new paradigm, owner authorization)

## Binding gates (units mandatory)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130` (never
  `Closes #130` while gates remain open).

## Next steps (owner decision required)

The single-pipeline architecture is at its hard ceiling (3.2175 / 9.6525, both units, byte-
exact). All authorized routes are measured-and-rejected with committed numbers. Per the
Builder mandate, the next phase (a full learned nonlinear transform / JXL-Modular redesign
with learned nonlinear predictor + transmitted tree) requires a NEW dedicated issue and
owner authorization, beyond the Builder's scope to self-authorize. Escalated to the
Maintainer (`{"action":"maintainer"}`) with this consolidated ledger so the Owner can
choose (a) accept the honest floor and close #130, or (b) authorize the new-paradigm issue.

- the Builder
