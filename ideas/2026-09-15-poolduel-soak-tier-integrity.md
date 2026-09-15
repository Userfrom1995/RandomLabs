# Poolduel M10 soak tier-integrity fix + soak bundle legs

> Refs #302. Builder slice, 2026-09-15, branch
> `opencode/issue302-20260915034435`. No `Closes`: the soak matrix
> is 18/36 groups in git and the section-11 full gate is not green.

## What was wrong

The M10 soak sweep (run 34910054732, commit e7675597) landed 18 of
36 `(cell, arm, duration)` groups. Proven root cause, two cooperating
harness defects:

1. `runner.run_plan` wrote raw records as `CELL-ARM-rN.json` with no
   duration tier. The 30-min and 60-min tiers of one arm wrote
   identical filenames, and the aggregate's flat-dir `cp` kept one
   tier per arm (last-writer-wins). 34 of 36 chunks uploaded
   `pooler-versions-*.txt`, so the absent 18 groups most likely ran
   and were overwritten at merge. The success run's artifacts have
   expired (0 retained), so the lost tier is unrecoverable from
   artifacts and must be re-measured.
2. `runner.write_medians` grouped by `(cell_id, pooler)`, ignoring
   duration, and emitted no context keys: the committed medians
   carried no tier label, so cross-tier comparison could not even
   be detected downstream.

## What changed

- `stats.median_group_key`: `(cell_id, duration_s, pooler)`, shared
  by `report.aggregate` and `runner.write_medians`. M1/M2/M9 output
  is order- and content-identical (verified: full `--report`
  rebuild leaves m1/m2/m9 medians + CSVs byte-identical, statistics
  family 98 / headlines 96 / claims 1/2/3/5 faster + 4 inconclusive
  unchanged).
- `runner.raw_filename`: soak cells gain a duration segment
  (`M10-S1-1800s-direct-r1.json`); M1/M2/M9 names byte-identical.
- `runner.write_medians`: context keys + `context_mixed` +
  p-latency quarantine, mirroring `report.aggregate`. Mixed-status
  groups collapse to `timeout/inconclusive` in both paths now
  (pinned by a parity test).
- Rebuilt `results/m10-soak/medians.json` tier-labeled via
  `report.aggregate`: same 18 groups, every metric summary
  (tps + latency_avg + p50/p90/p99/p999) verified identical to the
  pre-fix commit; new `results/m10-soak/matrix.csv`.
- Soak bundle legs (counts + tier-rows, never headlines: soak is a
  stability estimand at n=3 with no per-repeat p-latency on most
  arms, so it stays out of the statistics family, headlines, and
  claims by design): `report.json` (`soak_cells/soak_measured/
  soak_na`), `manifest.json` (RAW_LEGS + m10-soak, 2293 files),
  `sitemeta.json` (`soak_leg`: 36 spec / 18 present / 15 measured /
  18 missing), `supplementmeta.json` (counts + banner), dossier
  soak rows per pooler (duration-aware dedupe key, tier-suffixed
  load labels, drift-evidence pointers). Pages re-applied:
  index section 6d, all six dossier config tables, supplement
  banners, reproducibility manifest fragment.
- `docs/errata.md`: filed entry (date, cells, cause, fix). The
  reproducibility errata table mirrors it.
- `docs/m10-soak-matrix.md`: status corrected (was "no numbers
  exist"), geometry table fixed (S1/S2 are select-only 100/200c,
  not tpcb 50c), scope decision 6 superseded (tier-labeled
  medians, soak out of family by design), new section 8 with the
  present/missing tables and the 18-chunk re-dispatch manifest.
- `repro.sh`: `--report` discovers `--soak-dir`, `--site` applies
  to index, `--dossiers` reads soak medians + raw, `--supplement`
  takes `--soak`.
- Tests: `tests/test_soak_tiers.py` (18 tests: filename scheme,
  no-mix proof, present-18/missing-18 tripwire, bundle legs,
  manifest seal); updated drift pins (sitemeta, dossiers,
  supplement, manifest 2293, charts manifest, pr339 rebuild with
  soak, m3-report isolation env with SOAKOUT, mixed-status parity).

## Incidents during the build (both caught, both fixed)

- Suite-order clobber: `test_report_with_no_sweep_data_fails_loudly`
  shelled `repro.sh --report` with OUT/M2OUT/M9OUT redirected but
  not SOAKOUT, so it "found" committed soak data and rewrote the
  real `report.json` with a soak-only bundle mid-suite. Fixed by
  isolating SOAKOUT in the test env. Lesson: any committed-data
  discovery in repro.sh is a loaded gun for hermetic tests.
- Mixed-status semantics: unifying `write_medians` with
  `report.aggregate` changed synthetic-fixture behavior (2
  measured + 1 timeout now collapses instead of summarizing
  survivors). No committed group is mixed, so no published number
  moved; the parity test pins the unified rule.

## Key files

- `poolduel/harness/{stats,report,runner,site,dossiers,
  supplement,manifest,check}.py`, `poolduel/repro.sh`
- `poolduel/results/{m10-soak/medians.json,matrix.csv,report.json,
  sitemeta.json,dossiermeta.json,supplementmeta.json,manifest.json,
  charts/manifest.json}`, `poolduel/index.html`, dossier +
  supplement + reproducibility pages
- `poolduel/docs/{errata.md,m10-soak-matrix.md}`,
  `poolduel/tests/test_soak_tiers.py` (+ drift-pin updates)

## Next

Maintainer re-dispatch of the 18 missing chunks (manifest in
`docs/m10-soak-matrix.md` section 8) with the fixed harness, then
bundle rebuild + review/test/Pages chain. Soak chart figure
(tps + RSS/FD drift per arm per tier) is tracked follow-up, not
in this slice: tables + CSV + raw carry the evidence meanwhile.
