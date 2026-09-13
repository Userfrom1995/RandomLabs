# Poolduel Benchmark Spec v1 (draft skeleton, M5)

> **Status**: draft v0.1 skeleton, to be completed in M6-M8 as methods,
> Supavisor onboarding, and calibration land. Refs #302.
> **Intent (plan section 12.1)**: the Poolduel Benchmark Spec v1.0 in
> SPEC/TPC style. Anyone with other iron must be able to run this spec
> and compare against our numbers. The report is an instance of the spec;
> the spec is what becomes the standard. Spec changes rev the version and
> re-run affected cells, never silently.

## 1. Run rules

- One harness, identical adapter contract for every contender: same
  timeouts, same warmup, same JSON schema, same failure semantics
  (`poolduel/docs/harness-contract.md`).
- Warmup discarded before every measured run (length proven by the M8
  sensitivity curve; until then the provisional 30 s with its provenance).
- Repeats: flagship cells n>=10, standard cells n>=7, at least 3 seeds,
  paired seeds across arms (M9; M1/M2 ran n=3-5 unpaired and are labeled
  as such wherever shown).
- Medians over repeats; per-repeat p99/p999 feed CI machinery at repeat
  level, never pooled raw transactions across repeats.
- Per-chunk direct control in every chunk; interleaved round-robin arm
  order.

## 2. Allowed vs prohibited tuning

- Allowed: any pooler setting that cites its upstream documentation, with
  the citation committed beside the config (`poolduel/docs/configs/`).
- Prohibited: home-team tuning without citation; sabotage by omission
  (withholding a documented setting that the contender needs to function);
  pipeline mode (forbidden with written reason: it changes protocol
  semantics rather than pooling behavior).
- Best-mode per pooler on shared load (SPEC.md, methodology.md): compare
  each contender's best documented mode on identical workload geometry,
  never identical knobs, always beside at least one iso-region slice.

## 3. Required disclosures (minimums)

- Pinned pooler versions plus SHAs; PG build; kernel, CPU model,
  frequency governor, nproc, runner topology per raw record.
- Effective `SHOW` values for `shared_buffers`, `max_connections`,
  `synchronous_commit`, `fsync` (M6: the runner applies the claimed
  baseline or the effective values become the published claim).
- Full verbatim configs with upstream citations; dataset policy
  (per-chunk init plus `CHECKPOINT` plus `VACUUM ANALYZE` rule, M6);
  isolation records (CPU pinning, fixed pgbench `-j`, M6).

## 4. Hardware envelope

- Numbers are valid for the stated iron only. Cross-hardware comparisons
  are never made; no absolute capacity claims are registered
  (`claims.md` section 4).
- CI iron is the reference platform; bare-metal reproduction follows the
  same spec with its own disclosure record.

## 5. Versioning and changelog policy

- This spec revs (`v1.0`, `v1.1`, ...) on any run-rule, metric, or
  disclosure change. Spec changes re-run affected cells, never silently.
- Report corrections land in a public errata log with date, affected
  cells, cause, and new values (M12 trust machinery).

## 6. Open items (to be closed by M6-M9)

- M6 (closed 2026-09-13): PG config enforcement wording (section 3:
  runner applies `harness/pgconf.py:apply_sql`, per-row
  `pg_config_status` enforced/disclosed/unknown with divergence list;
  disclosed divergence is a blocking defect for the fairness re-check);
  equalized-auth churn control arm defined
  (`harness/auth.py:EQUALIZED_CHURN_SPEC` M9-E1, SCRAM everywhere,
  beside labeled asymmetric arms, measured in M9); dataset policy text
  (per-chunk `pgbench -i -s 10` + `CHECKPOINT` + `VACUUM (ANALYZE)` +
  bloat accounting via `bloat_accounting_sql`); isolation record
  schema (`harness/isolate.py:collect_isolation`: cpu_model, kernel,
  nproc, governor, threads, pgbench_j pinned to threads, pinning,
  topology, per raw row, nullable for old rows).
- M7 (closed 2026-09-13): Supavisor provisioning and smoke-gate entry
  criteria. Pinned v2.9.13 with SHA-at-build procedure
  (`harness/supavisor.py:pin_sha`, versions.md); verbatim config with
  upstream citations (`docs/configs/supavisor.md`); identical adapter
  contract (`harness/adapters/supavisor.py`: transaction/session/native
  variants, no statement mode, setup writes env + tenant JSON +
  metadata SQL + run script, runner owns timeouts/warmup); equal cell
  budget (7 M1 geometries + 52 M2 rows,
  `harness/supavisor.py:M9_SUPAVISOR_BUDGET`, parity-checked in
  `harness/check.py`); smoke gate before matrix entry
  (`smoke_gate`/`gate_passes`, CLI `--smoke-supavisor`, zero fail rows
  required); deferral doc lifted to a lift note; modes coverage matrix
  carries the M9 arms column. M1/M2 medians untouched (no backfill).
- M8: warmup sensitivity curve result; scale-100 pilot parameters;
  resource-field schema; workload breadth additions (Zipf, think-time,
  multi-statement, JSONB/COPY-adjacent, fixed-offer `-R`).
- M8 (closed 2026-09-13): calibration instruments defined (measured in
  M9). Warmup curve M8-C1 (`harness/calibrate.py:WARMUP_CANDIDATES`
  0/10/30/60 s on the M1-1 geometry, direct arm, 60 s measure, 3 paired
  repeats; `evaluate_warmup_curve` picks the smallest warmup within
  5 percent of best, else warmup rises and the curve re-runs);
  scale-100 pilot M8-P1..P3 (`-s 100`, standard timing, per-chunk init
  plus `CHECKPOINT` + `VACUUM (ANALYZE)`; full scale-100 matrix joins
  M9 only after the pilot proves the iron); resource-field schema
  (`harness/resources.py`: cpu_time_s, peak_rss_kb, fd_count,
  pool_wait, pg_stat deltas, all nullable, old rows stay valid);
  workload breadth (`harness/workloads.py`: zipf-select,
  think-time, multi-statement, jsonb-write, copy-adjacent scripts plus
  the `-R`/`-L` fixed-offer modifier; side-table DDL at dataset init);
  pipeline mode forbidden with written reason
  (`PIPELINE_FORBIDDEN_REASON`; multi-statement covers batching inside
  the standard protocol). Full spec in `docs/calibration.md`; CLI
  readout via `--list-calibration`.
- M9 (closed 2026-09-13): main matrix resweep defined (measured by the
  staged sweep, analyzed in M10). Six blocks in `harness/m9.py`:
  R (7 M1 geometries at scale 10, flagship n=10 / standard n=7,
  8 arms), W (52 M2 rows, n=7, row arm + direct), U (46 Supavisor
  twins + 6 statement N/A), C (7 M1 twins at scale 100, M9-C1..C7;
  M8-P1..P3 subsumed), K (M8-C1 warmup curve), E (M9-E1
  equalized-auth churn, SCRAM everywhere via `auth_mode=equalized`
  on odyssey/pgpool, other arms unchanged). Paired seeds
  (`m9_seed_for`: repeat-only schedule, 3 bases, distinct every
  repeat). 103 chunks under the 60 min cap, priced at 78.1 measured
  hours (`cli --list-m9`, `docs/m9-matrix.md`); staged sweep
  `poolduel/ci/poolduel-m9.yml` (Lab promotes). M2-at-100 deferred
  to M9b behind the C-block gate (written reason, not silence).
