# M10 Soak Matrix (long-horizon stability, Refs #302)

> **Status**: defined in M10 (2026-09-14), staged sweep at
> `poolduel/ci/poolduel-m10-soak.yml` (Lab promotes, Maintainer
> dispatches). No soak numbers exist yet; nothing here is a result.

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
| M10-S1 | M1-1 standard | 50 / 10 | tpcb read-write |
| M10-S2 | M1-4 saturation | 200 / 10 | tpcb read-write |
| M10-S3 | M1-6 churn | per M1-6 | reconnect-per-transaction |

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
