# Poolduel M10: soak + statistics rebuild (Refs #302)

Date: 2026-09-14. Milestone 10 of the redesign chain (operative plan
`864738b` v2.2, blueprint `ideas/2026-09-13-poolduel-redesign.md`).
Branch: `opencode/issue302-20260914094202` (milestone branch for M10).

## What was built

M10 closes the statistics gap between the powered M9 resweep
(250 medians, 1770 raw, paired seeds, all GREEN at `37d7948c`)
and publishable headlines, and defines the long-horizon soak
matrix. Harness + docs + staged sweep only; no sweep execution
(Maintainer dispatches after Lab promotes the staged soak file);
no numbers published (claims.md pre-registration untouched).

- `harness/statistics.py` (stdlib only): paired-difference 95%
  bootstrap CIs (`BOOTSTRAP_B` 5000, `BOOTSTRAP_SEED` 20260914,
  deterministic), two-sided bootstrap p (documented definition),
  Holm step-down (`holm_adjust`, alpha 0.05), Tukey-IQR outlier
  rule (1.5 flag / 3.0 extreme, `OUTLIER_RULE` verbatim) plus
  trimmed-mean sensitivity (flip demotes to inconclusive with
  forensics), `compare_ci` (effect + CI first, verdict second, p
  last; reason codes ci_includes_zero / quarantined / too_few /
  sensitivity_flip / mixed_status), `family_verdicts` (headline
  needs CI-excludes-zero AND Holm-adjusted p AND no quarantine),
  `CLAIM_CELLS` + `rederive_claims` with the claims.md kill rule
  enforced (never a win when killed).
- `harness/soak.py`: 3 cells (M1-1/M1-4/M1-6 shapes) x 6 arms x
  30/60-min tiers x 3 paired repeats = 36 chunks `m10s01..m10s36`,
  108 arm-runs, 86.4 measured hours; 200-min chunk cap with the
  written 120-deviation rationale; `SUPAVISOR_SOAK_DEFERRAL`
  reason constant; `soak_drift` (None-passthrough, never raises).
- Runner/resources/schema/check/cli wiring: pre/post resource
  sampling around every measured run (never raises, additive,
  old rows valid); `--matrix soak`, `--list-soak`; soak coherence
  checks with byte-identical success output.
- `report.py`: `--m9-dir` (+ `--bootstrap-b/seed`),
  `build_statistics` (M9 family + claim re-derivation),
  `build_bundle`/`write_outputs` extended with `m9_cells`,
  `m9_measured/na`, `statistics` (m1/m2-only shape unchanged);
  old min-max gate kept in best/pairwise for backward comparison.
- `repro.sh --report` now globs m9 dirs (m1/m2 behavior unchanged).
- Staged `poolduel/ci/poolduel-m10-soak.yml` (36 chunks, explicit
  out paths, 300-min timeout, aggregate into `results/m10-soak/`).
- Docs: spec-v1 s6 M10 closed, methodology s6 rewritten to the
  rebuild (old gate retired), new `docs/m10-soak-matrix.md`
  (composition, budget, drift figures, 6 scope decisions).
- Tests: `test_m10_statistics.py` (28), `test_m10_soak.py` (34),
  `test_m10_report.py` (7, wiring + compat + CLI).

## Proof runs (evidence, not publication)

Full rebuild over committed data into throwaway dirs (results/
untouched by this PR):
- `--bootstrap-b 200` smoke and full `B=5000` both:
  42 m1 + 111 m2 + 250 m9 medians (342 measured, 61 N/A/timeout),
  family 98, headlines 96, 2 inconclusive (ci_includes_zero).
- Claims: 1=A faster (CI [-2707,-100]), 2=B faster (CI [17.7,23.8]),
  3=A faster (CI [-6295,-4502]), 4=inconclusive killed by
  mixed_status (honest: saturation-row timeout arms), 5=A faster
  (CI [-2264,-1531]). Kill rule visibly working.
- Full suite green (521+), `check.py` exit 0 byte-identical,
  `repro.sh --dry-run` rc 0. `repro.sh --report` NOT run against
  the live tree (it would rewrite committed results/; the M9
  aggregate job owns those files until Lab switches it to
  `report --m9-dir` - flagged below).

## Follow-ups (not this PR)

- Lab: promote `poolduel-m10-soak.yml`; switch the M9 aggregate
  snippet from `runner.write_medians` to `report --m9-dir` so
  `results/m9/medians.json` carries context + quarantine flags
  and `report.json` gains the statistics section on every sweep.
- Maintainer: dispatch `poolduel-m10-soak` after promotion, then
  Builder M11 (website rebuild) reads the committed bundles.
- M11: leak/tail/stability panels from `resources_drift`.

## Key files

`poolduel/harness/statistics.py`, `poolduel/harness/soak.py`,
`poolduel/harness/report.py` (m9 leg), `poolduel/repro.sh`
(--report m9), `poolduel/ci/poolduel-m10-soak.yml`,
`poolduel/docs/m10-soak-matrix.md`, `poolduel/docs/spec-v1.md`,
`poolduel/docs/methodology.md`,
`poolduel/tests/test_m10_{statistics,soak,report}.py`.

Refs #302. No Closes, no owner notification (mandate rule 6:
notify once when publishable; M11/M12 remain).

- the Builder
