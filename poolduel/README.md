# Poolduel

Exhaustive PostgreSQL pooler shootout: pgagroal vs PgBouncer vs pgpool-II vs
Odyssey vs pgcat, plus direct-PG control. Supavisor deferred with reason.
Tracks issue #302. Report entrypoint (M3): `/poolduel/index.html`.

## Docs (Researcher spec, committed before any sweep)

- `docs/modes.md`: pooling modes and I/O backends per pooler.
- `docs/test-matrix.md`: M1/M2 cell lists, budget parity, pilot gate.
- `docs/grid.md`: numeric knob ranges and iso-region axes.
- `docs/methodology.md`: pgbench yardstick, metrics, threats to validity.
- `docs/versions.md`: pinned versions and SHAs.
- `docs/configs/`: verbatim baselines with doc citations.
- `docs/supavisor-deferral.md`: why Supavisor waits for its own milestone.
- `docs/harness-contract.md`: identical adapter contract and JSON schema.
- `docs/results.md`: how medians, comparisons, N/A semantics, and CSV/JSON
  exports work (normative reading guide for every number on the page).
- `docs/fairness-audit.md`: per-pooler config re-check against upstream
  tuning docs, budget parity, anti-theater checklist, post-sweep gate.
- `SPEC.md`: Researcher handoff to the Architect.

## Repro (M1 harness landed)

`repro.sh` replays the matrix with one command (identical procedure code).
No interactive prompts; everything via flags or env.

```sh
./poolduel/repro.sh --pilot    # M1-1 + M1-2, one repeat per arm (default)
./poolduel/repro.sh --full     # all 9 M1 chunks (a1,a2,b1,b2,c,d,e,f,g)
./poolduel/repro.sh --dry-run  # print the pilot plan, run nothing
THREADS=4 OUT=poolduel/results/m1 ./poolduel/repro.sh --full
```

M2 (session/statement/I-O arms plus workload twins) rides `--m2-*` flags
(same procedure code, same per-cell caps, every chunk with its own direct
control, N/A rows emitted as nulls, never zeros):

```sh
./poolduel/repro.sh --m2-smoke     # m2a1 session rows, one repeat per arm
./poolduel/repro.sh --m2-chunk m2c # one M2 chunk (m2a1..m2i2, 16 total)
./poolduel/repro.sh --m2-na        # emit N/A JSON for unsupported rows
./poolduel/repro.sh --m2-dry-run   # print the full 312-run M2 plan
M2OUT=poolduel/results/m2 ./poolduel/repro.sh --m2-full
```

After any sweep, build the publication artifacts with one command:

```sh
./poolduel/repro.sh --report  # raw JSON -> results/m1+m2/medians.json,
                              # matrix.csv per matrix, results/report.json
./poolduel/repro.sh --site    # bundles -> results/sitemeta.json,
                              # pre-rendered master-report sections
./poolduel/repro.sh --dossiers  # bundles -> results/dossiermeta.json,
                              # pre-rendered per-pooler dossier pages
                              # (M11c: six dossiers incl. Supavisor)
./poolduel/repro.sh --supplement  # bundles -> results/supplementmeta.json,
                              # pre-rendered guide/architecture/methodology/
                              # reproducibility facts (M11d)
./poolduel/repro.sh --manifest  # corpus -> results/manifest.json,
                              # deterministic build hash + size budget,
                              # pre-rendered reproducibility manifest (M12)
./poolduel/repro.sh --manifest-verify  # recompute + compare, fail on drift
```

With no sweep data on disk `--report` fails loudly instead of inventing
numbers. The master report (`index.html`) is static-first: every table
and headline card is pre-rendered from committed bundles by
`harness/site.py` (`repro.sh --site`), so it reads correctly with
JavaScript disabled; JS only switches column groups and refreshes counts.

Requires `pgbench` plus `psql` from PostgreSQL 17. `repro.sh` runs
`poolduel/harness/check.py` first (binaries, ratio guards, chunk caps)
and fails loudly instead of running a compromised sweep.

## Harness (M1)

Python 3, stdlib only, driving pgbench as a subprocess:

- `harness/cells.py`: M1 table (7 cells) as DATA plus the 5x ratio guard.
- `harness/pgbench.py`: identical-flags argv builder, stdout parser
  (tps without initial connection time, latency avg/stddev, failed),
  offline p50/p90/p99/p999 from per-transaction logs with the 200 MB
  sampling guard, 1% failure reject rule, SQLSTATE 26000 detection.
- `harness/stats.py`: median/min/max/CV plus the binding gate
  (non-overlapping bands AND same-direction tps + p99 agreement,
  else inconclusive) and the pilot separation check.
- `harness/schema.py`: normative cell JSON validator (exact fields,
  extra per-pooler fields forbidden, N/A rows carry nulls never zeros).
- `harness/chunk.py`: 9 chunks (flagship cells split into repeat-halves
  so every chunk stays under 60 min), round-robin scheduler, resume
  manifest, per-chunk direct-control injector.
- `harness/runner.py`: shared procedure (warmup, measure, caps 8/12 min,
  log collect, medians). Owns all timeouts; adapters never do.
- `harness/cli.py`: `python3 -m poolduel.harness.cli --chunk a1`,
  `--pilot`, `--cells M1-2,M1-3`, `--dry-run`. See `--help`.
- `harness/adapters/`: one pooler-blind adapter per arm
  (`direct`, `pgagroal`, `pgbouncer`, `pgpool`, `odyssey`, `pgcat`).
  Only `config_text()` and the port differ. Ports: direct 5432,
  pgagroal 6432, pgbouncer 6433, pgpool 6434, odyssey 6435, pgcat 6436.
  M2 variants (session/statement pipelines and pool modes, io_uring/epoll,
  so_reuseport instances, workers, worker_threads, children sweep) arrive
  via the cell's `variant` dict; cells without one render the M1 baseline.
- `harness/m2.py`: M2 variant table as DATA (52 measured rows on 5 shared
  geometries, 7 N/A rows with nulls), 16 chunks each under 60 min with
  per-chunk direct control, published per-pooler budget table
  (`--list-m2`), 2-workload cap per new arm per block.
- `tests/`: 100 stdlib unittests (`python3 -m unittest discover
  -s poolduel/tests`): 65 M1 plus 18 M2 (variant configs, M1 backcompat,
  chunk coverage and caps, N/A schema, no-variant-leak into JSON) plus 17
  M3 (report aggregation, best-vs-best, iso-region, flatness, CSV, CLI).
- `.github/workflows/poolduel-m1.yml`: 9-chunk CI sweep definition
  (manual dispatch only, pinned PG 17 plus pinned pooler builds,
  per-chunk artifacts).
- `.github/workflows/poolduel-m2.yml`: 16-chunk M2 sweep (manual dispatch,
  same discipline).
- `harness/report.py`: M3 publication engine (`python3
  -m poolduel.harness.report --m1-dir ... --m2-dir ... --out
  poolduel/results`): schema-validated raw JSON to medians with bands,
  best-vs-best with binding-gate verdicts, pairwise matrix, iso-region
  slices, surface flatness, full-matrix CSVs, and `report.json` for the
  page live hooks.
- `index.html`: full M1+M2 Pages report (lineup, both matrices, pilot
  plan, pending-honest results tables and SVG charts that fill live from
  `results/`, fairness summary, threats to validity, repro commands).

- the Builder
