# Poolduel research specification (Researcher handoff, Refs #302)

## Problem

Compare five PostgreSQL connection poolers (pgagroal master tip, PgBouncer
1.25.2, pgpool-II 4.7.2, Odyssey 1.5.1, pgcat v1.2.0) plus a direct-PG control
under honest, exhaustive, publishable conditions. Supavisor v2.9.13 is
deferred with written reason. Full issue: #302.

## What the Researcher surveyed

Upstream docs and source for all five poolers plus Supavisor (modes, I/O
backends, every backend-relevant tunable with defaults and ranges) and
pgbench methodology for CI hardware. Findings are committed before any
benchmark runs, as the issue requires:

- `poolduel/docs/modes.md`: every pooling mode and I/O backend per pooler,
  with doc URLs and the normative mode/I-O coverage matrices.
- `poolduel/docs/test-matrix.md`: M1 (transaction pooling plus control),
  M2 (remaining modes, I/O variants, extra workloads), budget parity,
  pilot discrimination gate, anti-theater checklist.
- `poolduel/docs/grid.md`: bounded numeric ranges and steps per pooler plus
  the shared iso-region axes (clients {50,100,200}, backends {10,20}).
- `poolduel/docs/methodology.md`: pgbench yardstick, dataset and run shape,
  metrics (tps plus p99/p999 plus errors), fairness discipline, threats to
  validity, reproducibility-by-adversary standard.
- `poolduel/docs/versions.md`: pinned versions and SHAs; upgrades trigger
  re-runs.
- `poolduel/docs/configs/<pooler>.md`: verbatim baselines where every
  non-default value cites upstream tuning docs.
- `poolduel/docs/supavisor-deferral.md`: factual harness-cost deferral.
- `poolduel/docs/harness-contract.md`: identical adapter contract, JSON
  schema, calibration and pilot plan, chunked execution discipline.

## Key design decisions for the Architect

1. Do NOT force identical knobs: sweep each pooler's full documented space
   under equal cell budgets; compare best-vs-best plus iso-region slices.
2. `clients >> pool_size` is mandatory (min 5x); pgpool-II has session-class
   only and records N/A elsewhere; pgcat statement and pgagroal statement
   are N/A; Odyssey statement is provisional.
3. I/O sweep: pgagroal `io_uring` vs `epoll`; PgBouncer 1 vs 2 instances with
   `so_reuseport`; Odyssey `workers` {1,2,4}; pgcat `worker_threads` {1,5};
   pgpool-II sweeps `num_init_children`/`max_pool` instead.
4. Scale `-s 10`, warmup 30s discarded, measure 60s (flagship 120s), 3 repeats
   (5 flagship), median headlines, round-robin interleaving, per-cell caps
   8/12 min, chunked jobs under 60 min following the postformer pattern.
5. Stack guidance: harness in Go, Python, or Rust driving pgbench as a
   subprocess; static Pages report at `/poolduel/index.html`; project code in
   `/poolduel/`, never root `/docs/`; one-command `poolduel/repro.sh`.

## Baselines and gates

Baseline: direct-to-PostgreSQL control in every chunk. Performance gates:
median tps and p99 with non-overlapping min-max bands and same-direction
agreement, else `inconclusive`. No cherry-picking, no interpolated zeros, no
hidden failures, no carried-forward numbers across upgrades.

## Handoff

Next phase: Architect. The Architect reads every file under
`poolduel/docs/` and produces the build blueprint (harness language,
adapter layout, chunked workflow, report skeleton, M1 milestone plan).

- Dr. Mob, the Researcher
