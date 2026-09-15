# Poolduel M13a: Soak Stability Figure on Partial-18 Data (Refs #302)

Date: 2026-09-15. Status: implemented, ready for review.
Blueprint: `ideas/2026-09-15-poolduel-m13-closure.md` (M13a slice).
Branch: `opencode/issue302-20260915074754` (resume on the Architect's
blueprint PR; body corrected to `Refs #302`: M13b and the section-11
full gate remain, and no owner approval exists yet).

## Summary

The soak leg existed as counts plus tier-rows in every bundle but had
no stability figure: a reader could not see tps drift, RSS/FD drift,
or tail drift per arm per tier. M13a renders that figure from the
committed bundles on the partial-18 data with honest absent marking,
so page work no longer serializes on the Maintainer-owned re-dispatch
of the missing 18 groups (`docs/m10-soak-matrix.md` section 8). When
the 18 land, the same generator re-runs with no code change and the
absent marks disappear.

## What was built

- Soak figure generator (`harness/charts.py`, new, stdlib only):
  two figures per soak cell, six chart ids on the comparison page
  (`soak-M10-S1/S2/S3` tps + `-drift`), same bundles-in/no-hand-values
  contract as the 6 existing figures.
  - X axis is numeric tier order (1800 s then 3600 s), never
    lexicographic. One series per arm in the shared pooler palette
    (fixed six-arm spec: every arm keeps its series, absent tiers are
    markers, never silent gaps). Tps medians with min-max band lines;
    dotted p99 lines on a right axis (null where quarantined, timeout,
    or absent, so lines break instead of interpolating).
  - Drift panels: median pre/post RSS-delta bars (left axis) plus
    FD-delta dotted lines (right axis) aggregated from committed raw
    `resources_drift` fields. Harness-process rusage is labeled a
    run-validity signal, never pooler-process leak sampling.
    Nullable resources mark `n/a (not recorded)`, never zero;
    measured flat zeros (the idle harness) stay visible as zeros,
    distinct from nulls.
  - Absent (cell, arm, tier) triples render as grey off-baseline
    markers labeled `tier not in git (re-dispatch owned by
    Maintainer)`, distinct in symbol and color from the yellow
    timeout triangles and white N/A diamonds.
  - `soak_absent()` (`harness/soak.py`) derives triples as spec
    minus present in `SOAK_CHUNKS` order, so generator, site,
    dossiers, and the s8 manifest cannot drift apart.
  - CLI `--soak` / `--soak-raw` (both optional: missing medians cut
    the figures, missing raw marks drift n/a); charts manifest gains
    `m10-soak/medians.json` SHA + `m10-soak/raw_files` count;
    `repro.sh --charts` passes both inputs.
- Site wiring (`harness/site.py`): the soak panel gains the six
  figure hosts plus a caption; per-tier rows already marked missing
  arms honestly. `--apply` stays idempotent.
- Dossier wiring (`harness/dossiers.py`): every dossier (except
  Supavisor, deferred from soak by design) gains absent-tier rows
  with tier-suffixed load labels derived from the soak geometry.
  Soak rows are now always entry-derived (a static lookup keyed by
  cell alone would smear one tier's label onto the other on
  re-apply). Rows carry `data-duration`; the config header counts
  absent tier-rows; the N/A table keeps its N/A + timeout contract.
- Loader fix (`assets/poolduel-charts.js`): fetches soak medians and
  keys lookups by (cell, duration, pooler), so present soak rows keep
  their baked values live instead of being clobbered to "no record";
  rows with `data-status="missing"` are never overwritten. This also
  fixes a live defect predating M13a (static-first pages were honest,
  live-enhanced pages were not, for soak rows).
- Gate (`harness/check.py` `check_soak_figure_coherence`): rebuild
  vs committed deep-equal, charts-manifest SHAs, figure hosts +
  absent-note + zero pending in the soak section.

## Proof

- Full suite 739/739 green (23 new in `test_m13a_soak_figure.py`:
  tier sort, 18 absent markers, timeout-vs-absent distinction,
  nullable n/a path, hostile drift shapes, value traceability,
  drift medians from raw, dossier absent rows, site figure slot,
  committed deep-equal, M4-shape backward compatibility).
- M4-era pinned tests extended, not weakened: zero-fill ban exempts
  only drift panels (measured zeros, traceability pinned); furniture
  test handles dual axes (tps zero-based, signed deltas named);
  chart-count contract lists the six soak ids; deep-equal rebuild
  passes soak inputs.
- `check.py` green (incl. the new coherence fn), `repro.sh
  --dry-run` intact, page JS `node --check` clean.
- Regen order verified: report (m1/m2/m9 bytes identical,
  statistics family 98 / headlines 96 unchanged) -> charts -> site
  -> dossiers -> manifest (idempotent re-apply).
- HTTP smoke: master + six dossiers 200, six figure hosts live,
  absent rows live with `data-status="missing"`, zero pending in
  the soak section.
- Tier-2 vision: headless Chromium renders 20 SVGs (14 existing +
  6 soak); DOM read-back shows soak titles, tier labels, bundle
  peak values (e.g. peak 45606.0 tps S2 pgbouncer), dual drift
  axes, legend entries, and 24 absent-label marks.

## Out of scope (explicit, per blueprint)

Soak stays out of the statistics family, headlines, and claims;
Supavisor stays out of soak; no re-tuning; no re-dispatch from
Builder. M13b (final section-11 gate + single @Userfrom1995
notification) runs after the missing 18 land.

- the Builder
