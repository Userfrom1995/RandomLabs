# M10 Soak Matrix (long-horizon stability, Refs #302)

> **Status**: defined in M10 (2026-09-14); sweep dispatched and
> partially landed 2026-09-15 (run 34910054732, commit e7675597):
> 18 of 36 (cell, arm, duration) groups in git (54 raw, 15 measured
> plus 3 timeout/inconclusive medians, 34/36 chunk version files).
> A harness filename defect dropped one tier per arm at merge (see
> `docs/errata.md` 2026-09-15 and section 8 below); the absent 18
> groups await Maintainer re-dispatch. Nothing here beyond the
> committed bundles is a result.

## 1. Why soak

The M1/M2/M9 matrices measure steady-state throughput in 60-120 s
windows. They cannot see leaks (RSS/FD growth), tail drift, or
stability cliffs that only appear after tens of minutes under a
loaded pool. Throughput without mechanism is marketing (plan
section 7): the soak matrix supplies the mechanism figures (leak,
tail drift, stability) that M11 pages render beside the headline
CIs.

## 2. Composition

Three cells reusing proven M1 geometries (no new workload
inventions), six incumbent arms, two duration tiers, three paired
repeats (`m9_seed_for` bases 42/1337/9001, stride schedule):

| Cell | Shape reused | Clients / pool | Workload |
|---|---|---|---|
| M10-S1 | M1-1 standard | 100 / 10 | select-only |
| M10-S2 | M1-4 saturation | 200 / 10 | select-only |
| M10-S3 | M1-6 churn | per M1-6 | reconnect-per-transaction |

(Geometries copied field-for-field from the M1 twin by
`harness/soak.py:soak_cell`; verified against committed raw:
workload/clients/pool_size on every landed row.)

- Arms: direct, pgagroal, pgbouncer, pgpool, odyssey, pgcat.
  Supavisor is excluded from soak with a written reason
  (`harness/soak.py:SUPAVISOR_SOAK_DEFERRAL`): soak needs a stable
  six-arm baseline first; Supavisor joins soak only after its M9
  smoke gate passes. Exclusion with reason, never silent.
- Tiers: 1800 s (30 min) plus 3600 s (60 min) measured, 60 s warmup
  (longer runs need settled state; M8 curve provenance cited in
  `harness/soak.py`).
- Chunking: one chunk per (cell, arm, duration), 36 chunks
  `m10s01..m10s36`. Direct is an arm like the rest (each
  (cell, duration) pair carries its own direct chunk, matched by
  chunk naming), so no chunk needs a foreign control.

## 3. Budget

`cli --list-soak`: 36 chunks, 108 arm-runs, 86.4 measured hours
(1728 min per cell-shape). Per-chunk measured time: 99 min
(30-min tier: 3 x 31 min + overhead) and 189 min (60-min tier).
Chunk cap is 200 min, not the classic 120: a 3-repeat 60-min
chunk floors at 183 measured minutes before overhead, so no such
chunk can fit 120 under the estimator's own formula (deviation
documented in `harness/soak.py`, asserted tier-aware in
`tests/test_m10_soak.py`). The 30-min tier still fits 120.
CI timeout is 300 min per chunk (measured plus init/build wall
clock, same accounting as M9).

## 4. Drift figures (what each arm-run proves)

Every arm-run samples resources immediately before and after the
measured pgbench run (`runner.measure_once`, never raises, never
fabricates; `resources_pre` / `resources_post` / `resources_drift`
in `build_record`, nullable for old rows via
`schema.OPTIONAL_FIELDS`). `soak_drift(pre, post)` returns signed
RSS delta (kB), FD delta, CPU seconds, and duration; missing
samples degrade to None with reason, never zero-filled. M11
renders per-arm leak panels (RSS/FD drift vs duration tier),
tail-drift panels (per-repeat p99 across the 3 repeats plus
within-run pg_stat deltas), and stability panels (tps across
repeats at 30 vs 60 min).

## 5. Scope decisions (written, not silent)

1. Three cells, not the full matrix: soak prices at 86 measured
   hours already; the three shapes (standard, saturation, churn)
   span the failure modes leaks hide in.
2. Three repeats, not ten: soak repeats price in hours, not
   minutes; n=3 bounds drift, it does not power headlines (no
   soak cell enters the headline family without M11 review).
3. 60 s warmup for all soak tiers: settled-state requirement
   dominates the M8 30 s proof at hour scale; re-proven by the
   stability panels themselves.
4. Chunk-per-arm (36 chunks) instead of chunk-per-cell: keeps
   every chunk failure-blast-radius at one arm and every chunk
   re-runnable alone.
5. Staged, not promoted, in this PR: workflow files ship via the
   Lab promotion route (PAT scope), same as M1/M2/M9 took.
6. Soak medians aggregate with the same `write_medians` shape
   into `results/m10-soak/`; the M10 statistics family runs over
   them only after all 36 chunks land (no partial headlines).

## 6. Verification mapping

- Definition: this file plus `harness/soak.py` (M10).
- Execution: `poolduel-m10-soak.yml` after Lab promotion,
  Maintainer dispatch.
- Publication: M11 leak/tail/stability panels, verified-only.

## 7. Scope correction (2026-09-15)

Decision 6 above is superseded: soak medians no longer use the
old context-free `write_medians` shape. Both `write_medians` and
`report.aggregate` group by `(cell_id, duration_s, pooler)` and
carry context keys plus `context_mixed` plus the p-latency
quarantine flag, so every median is tier-labeled. Soak stays out
of the statistics family, headlines, and claims by design (a
stability estimand at n=3 with no per-repeat p-latency cannot
feed paired-difference CIs); its bundle leg is counts plus
tier-rows (`report.json: soak_cells/soak_measured/soak_na`,
`sitemeta.json: soak_leg`, dossier soak rows).

## 8. Landed coverage and re-dispatch manifest (2026-09-15)

Run 34910054732 landed 18 of 36 groups (commit e7675597). Each
(cell, arm) below ran at exactly one tier; the complementary
tier never reached git (filename-collision loss, `docs/errata.md`).

Present (tier-labeled medians in `results/m10-soak/`):

| Cell | 1800 s tier | 3600 s tier |
|---|---|---|
| M10-S1 | direct, pgagroal, pgcat, pgpool | pgbouncer, odyssey |
| M10-S2 | pgbouncer, pgcat, pgpool (timeout) | direct (timeout), pgagroal, odyssey |
| M10-S3 | direct, odyssey, pgagroal (timeout), pgbouncer, pgcat | pgpool |

Timeout/inconclusive groups above are honest 3/3-repeat
findings, not gaps. Absent groups (Maintainer re-dispatch,
chunk ids from `harness/soak.py` order):

| Chunks | Groups |
|---|---|
| m10s03, m10s05 | M10-S1/1800 pgbouncer, odyssey |
| m10s07, m10s08, m10s10, m10s12 | M10-S1/3600 direct, pgagroal, pgpool, pgcat |
| m10s13, m10s14, m10s17 | M10-S2/1800 direct, pgagroal, odyssey |
| m10s21, m10s22, m10s24 | M10-S2/3600 pgbouncer, pgpool, pgcat |
| m10s28 | M10-S3/1800 pgpool |
| m10s31, m10s32, m10s33, m10s35, m10s36 | M10-S3/3600 direct, pgagroal, pgbouncer, odyssey, pgcat |

Chunks m10s35/m10s36 uploaded no version file at all; the other
16 absent groups uploaded version files but lost their raw at
the merge. Re-dispatch runs the fixed harness (tiered raw
filenames), so re-measured tiers merge without collision. No
group is interpolated, zero-filled, or carried forward.
