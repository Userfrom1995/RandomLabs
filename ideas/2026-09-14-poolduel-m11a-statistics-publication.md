# Poolduel M11a: statistics bundle publication (Refs #302)

Date: 2026-09-14. First slice of the M11 website-rebuild chain
(blueprint `ideas/2026-09-13-poolduel-redesign.md`, operative plan
`864738b` v2.2). Branch: `opencode/issue302-20260914102844`.

## What was built

Published the M10 statistics rebuild into the committed bundles by
re-running the deterministic pipeline over committed raw records only
(no sweep, no new measurements, no numbers invented):

- `repro.sh --report`: `results/m9/medians.json` regenerated via
  `report.aggregate` (250 same keys; every entry gains measurement
  context `workload/clients/pool_size/protocol/churn/duration_s/scale`
  plus `context_mixed` plus `p_quarantined`), new
  `results/m9/matrix.csv`, `results/report.json` gains the `m9_*` leg
  plus the full `statistics` section (family 98, 96 Holm-gated
  headlines, claims 1/2/3/5 faster with excluding-zero CIs, claim 4
  inconclusive by the kill rule).
- `repro.sh --charts`: chart option JSONs byte-identical (m1/m2
  medians untouched); only `charts/manifest.json` refreshes its
  `report.json` SHA256.
- `repro.sh --pagemeta`: unchanged (m1/m2 counts only).

## Honest deltas (2 of 250 m9 cells, both intended M10 semantics)

- `M1-4/pgagroal`: committed `measured` (tps 1519, 5 of 7 repeats)
  becomes `timeout/inconclusive` with nulls. Raw shows 5 measured +
  2 timeout repeats on the saturation cell; the M10 mixed-status rule
  (`report.aggregate`: any status disagreement across repeats ships
  as inconclusive, never a majority-vote win) fires. This is the same
  rule that kills claim 4 in `statistics.py`.
- `M2-I15/pgpool`: committed `timeout/inconclusive` that leaked a
  single-sample tps value (17099, n=1) becomes nulls. Timeouts carry
  nulls, never values.
- m1/m2 medians and all three CSVs otherwise byte-identical;
  `p_quarantined` is False on all 250 m9 medians (no aggregate-log
  contamination in M9 raw); `context_mixed` False everywhere.

## Verification

- Trial rebuild into `/tmp/pd-rebuild` first; diffed before touching
  the tree (m1/m2 identical, m9 delta isolated to the 2 cells above
  plus additive context keys).
- Full suite 558/558 green after publication, `check.py` ok,
  page loader JS `node --check` clean.

## Follow-ups (not this PR)

- M11b (website rebuild) reads the committed bundles: static-first
  master report with CI-backed headlines, six dossiers, guide /
  architecture / methodology / reproducibility sections.
- Lab: promote `poolduel/ci/poolduel-m10-soak.yml`; switch the M9
  aggregate snippet to `report --m9-dir` (this PR proves the output
  it will produce).
- Maintainer: dispatch `poolduel-m10-soak` after promotion.

Refs #302. No Closes, no owner notification (mandate rule 6:
notify once when publishable; M11/M12 remain).

- the Builder
