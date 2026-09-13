# Progress: poolduel build (issue #302)

Status: in-progress
Date: 2026-09-12. Owner directive via #42 (supreme priority).
Blueprint: `ideas/2026-09-11-poolduel.md`. Researcher spec: `poolduel/docs/`.

Active Milestone: M4 (per-pooler deep-dives + ECharts charts + verification)

## Milestone roadmap

- Milestone 1 (M1 harness + transaction sweep): [x] Python harness
  (`runner`, `pgbench`, `cells`, `stats`, `schema`, `chunk`, `cli`,
  `check`) with 6 pooler-blind adapters; [x] M1-1..M1-7 cell table with
  pilot gate proof (`pilot_separates` + `--pilot` dry-run plan);
  [x] per-cell caps (8 min standard, 12 flagship) + JSON schema
  validation; [x] working `repro.sh` (`--pilot`/`--full`/`--dry-run`
  plus preflight `check.py`); [x] chunked CI workflow (9 chunks,
  each with own direct control, each under 60 min, manual dispatch).
  (Merged as PR #303, Refs #302)
- Milestone 2 (M2 modes + I/O + extra workloads): [x] session arms
  (pgagroal session + performance, pgbouncer/odyssey/pgcat session,
  pgpool session-class); [x] statement arms (PgBouncer + provisional
  Odyssey, rest N/A with nulls); [x] I/O axes (io_uring/epoll,
  so_reuseport 2-instance, workers 1/2/4, worker_threads 1/5, pgpool
  children sweep with 200x4 corner substituted); [x] extra workload
  twins (simple-update + churn for session arms, prepared where
  supported). 52 measured rows + 7 N/A rows, 16 chunks each under
  60 min, `--list-m2` budget table published. (This PR, Refs #302)
- Milestone 3 (report + audit): [ ] static Pages report at
  `/poolduel/index.html`; [ ] full M1+M2 medians with bands, iso-region
  slices, threats section; [ ] Tester independent cell reproduction;
  [ ] one-command repro green. (Final PR, Closes #302 only on passing
  binding gates: non-overlapping bands plus tps/p99 agreement; negative
  or marginal results stay Refs with logged ledger.)

## Done

- Researcher spec committed before any sweep (modes, matrix, grid,
  methodology, versions, 5 verbatim configs, supavisor deferral,
  harness contract, SPEC, README, repro placeholder).
- Architect blueprint written (`ideas/2026-09-11-poolduel.md`):
  Python harness language choice, adapter layout, chunked workflow,
  Pages skeleton, M1 plan with pilot gate and budget parity.
- Builder M1 (2026-09-11): full harness implemented, 26/26 unittests
  green, `repro.sh --dry-run` verified, 9-chunk workflow YAML parses.
  Design correction worth recording: the blueprint's "4+ chunks by
  workload pair" does not fit the 60 min cap (a flagship full cell is
  ~90 min for 5 repeats x 6 arms x 3 min per arm-run), so flagship
  cells split into repeat-halves (a1/a2, b1/b2) for 9 chunks total,
  worst chunk 54 min. Still compliant ("at least 4 chunks", per-chunk
  direct control, under-60-min). No sweep numbers claimed: CI has not
  run the matrix yet, so no medians, no rankings, no gates passed.
- Infra note (2026-09-11): the M1 sweep workflow is written and
  YAML-valid but staged at `poolduel/ci/poolduel-m1.yml`, NOT at
  `.github/workflows/`: the build token (GitHub App) is refused
  workflow-scope pushes ("without `workflows` permission"). Promotion
  is one mechanical `git mv` via a PAT-backed step (`/oc lab` route)
  or an owner push; content is final, no edits needed. The M1 sweep
  cannot be dispatched until that promotion lands.

Current step: M2 implementation complete, awaiting review
Next steps: Reviewer audit, then Tester sample-cell reproduction;
  M2 sweep dispatch needs PAT promotion of poolduel/ci/poolduel-m2.yml
  to .github/workflows/ (/oc lab route or owner push); M3 Pages report
  in the next milestone PR.

Builder follow-up (2026-09-11): added `poolduel/index.html` Pages report
skeleton closing the last open M1 spec item. Honest pending state: lineup
table with pins, normative M1 cell table, verbatim 12-line pilot dry-run
plan, results table with pending cells (fills live from
`results/medians.json` only after the sweep publishes it), fairness and
threats summary, repro commands. No numbers claimed, no zeros, no
interpolation. Also cleaned the stale README placeholder block and fixed
the test count (65) plus the promoted workflow path. Verified: 65/65
unittests green, HTML parses, page JS passes `node --check`, pilot dry-run
reproduces the embedded plan.

Builder M2 (2026-09-11): full M2 arms on branch
`opencode/issue302-poolduel-m2`. `harness/m2.py` variant table as DATA
(52 measured rows on 5 shared geometries reusing M1 shapes at standard
60 s/3-rep timing, 7 N/A rows with nulls), 16 chunks each under 60 min
with per-chunk direct control (worst 48 min). Adapters render the cell
`variant` dict (pgagroal pipeline/ev_backend, pgbouncer pool_mode plus
2-instance so_reuseport multi-proc start, odyssey pool/workers with
provisional statement label, pgcat pool_mode/worker_threads, pgpool
children sweep with the 200x4 corner substituted); M1 cells without a
variant render unchanged (65/65 M1 tests still green untouched).
CLI gains `--matrix m2`, `--list-m2`, `--write-na`; `check.py` covers M2
ratios, budgets, chunk coverage, N/A schema; `repro.sh` gains `--m2-*`
modes. M2 sweep workflow staged at `poolduel/ci/poolduel-m2.yml` for
PAT-backed promotion (same route M1 took). Parity: same procedure code,
same caps, at most 2 workloads per new arm per block, realized counts
published (`--list-m2`: pgagroal 11, pgbouncer 12, odyssey 11, pgcat 9,
pgpool 9; residual spread is structural and documented in
`m2_budget_table`). Verified: 83/83 unittests green, M1 pilot dry-run
byte-identical to the plan embedded in `index.html`, full M2 dry-run
plans 312 arm-runs, N/A emission schema-valid. No numbers claimed:
CI has not run either matrix yet. `index.html` untouched (M3 owns it).

Refs #302. No Closes: M2 report and M3 binding gates remain.

## M3 build log (branch `opencode/issue302-poolduel-m3`)

- M3-1 (2026-09-11): `harness/report.py` publication engine (stdlib
  only): `load_raw` with schema validation, `aggregate` medians with
  bands/CV plus measurement context (runner-compatible shape),
  `per_cell_best` best-vs-best with binding-gate verdicts,
  `pairwise` full verdict matrix, `iso_regions` shared-axes slices,
  `flatness` flat/peaky/single-point, `matrix_csv` full export,
  `build_bundle`/`write_outputs` (`m1/medians.json`,
  `m1/matrix.csv`, `m2/...`, `report.json` for the page live hooks).
  CLI fails loudly on missing/empty results (no invented numbers).
  `tests/test_report.py`: 17 new tests; 100/100 green total.
- M3-2 (2026-09-11): full `poolduel/index.html` publication report
  (M1+M2 matrices, verbatim pilot plan, pending-honest M1 table plus
  live SVG charts with min-max whiskers, M2 best-vs-best, iso-region
  and flatness blocks, fairness summary, full threats text, repro
  commands; fills live from `results/` only). `docs/results.md`
  (normative reading guide) plus `docs/fairness-audit.md` (per-pooler
  doc-cited re-check, budget parity, anti-theater list, post-sweep
  gate). `repro.sh --report` one-command artifact build (loud failure
  with no data) plus a `--m2-full` echo fix. `poolduel/README.md`
  M3 section, root `index.html` plus root `README.md` Poolduel entries,
  `ideas/2026-09-11-poolduel-shootout-report.md`, `results/` dirs.

Current step: M3 implementation complete, awaiting review
Next steps: Reviewer audit, then Tester sample-cell reproduction after
  sweep dispatch; post-sweep config re-check per fairness-audit section 4
  before any gate passes. `Refs #302`: no medians exist yet, so no gate
  can pass and no `Closes` is claimed.

- the Builder

## Adapter startup/auth fix log (branch `opencode/302-poolduel-adapter-fixes`)

Context: sweep `poolduel-m1` 34697687073 (2026-09-12, main 44df4ddb)
FAILED 9/9 product arms; aggregate committed partial medians (direct +
pgbouncer + pgpool timeout/inconclusive, zero raw for
pgagroal/odyssey/pgcat). Sweep pipeline itself green (Lab 34698415063).
Root causes proven from the `poolduel-m1-a1` chunk artifact workdirs:

1. pgagroal rc=1 `invalid option -- 'H'`: argv used `-H`/`-d <path>`/`-f`
   (none exist; `-d` is a no-arg daemon flag). Plus latent: config had no
   `[primary]` backend server section (host/port in `[pgagroal]` is the
   bind address, not the backend) and HBA `trust` leaves the pooler with
   no password for the SCRAM backend.
2. odyssey rc=1 `odyssey.conf:11 unknown parameter`: legacy
   `route { service ... backend_host ... }` syntax rejected by 1.5.1;
   also missing mandatory `authentication` and backend credentials.
3. pgcat rc=78 `missing field admin_username`: `[general]` lacked the
   required admin fields; also no `shards` section rendered.
4. pgbouncer exit 1 `password authentication failed` (`no such user`):
   no `auth_file`, so every pgbench login died at the pooler.
5. pgpool exit 1 `failed to authenticate with backend using SCRAM`
   (`valid password not found`): empty `pool_passwd` (pgpool created it
   in the workdir cwd, proving cwd resolution).

Fixes (all `poolduel/harness/adapters/`, doc-cited, identical
timeouts/schema/failure semantics - runner untouched):

- `base.py`: `setup()` stores `os.path.abspath(workdir)` (kills the
  relative-path doubling for every adapter's argv and config refs).
- `pgagroal.py`: argv `[pgagroal -c conf -a hba -l dblimit]` foreground;
  added `[primary]` server section (host 127.0.0.1, pg_port); HBA
  `trust` -> `scram-sha-256` so benchuser auts against PG itself via
  the allow_unknown_users passthrough (CONFIGURATION.html).
- `odyssey.py`: `storage "benchdb_store"` (remote, storage.html) plus
  `database/user` routing rule (rules.html) with
  `authentication "none"` (CI-only frontend), `storage_user` /
  `storage_password` benchuser/benchpass for the SCRAM backend leg;
  dropped `server_pstmt_cache_size` (not an Odyssey parameter) and the
  legacy route block.
- `pgcat.py`: `admin_username`/`admin_password` (required, CONFIG.md)
  plus `[pools.benchdb.shards.0]` single-primary shard
  (`pgcat.toml` example syntax, verified by tomllib in tests).
- `pgbouncer.py`: `users.txt` (`"benchuser" "benchpass"`, plaintext
  permitted, config.html) + `auth_type = scram-sha-256` + absolute
  `auth_file`; backend uses the client password pgbench presents.
- `pgpool.py`: workdir `pool_passwd` with plaintext
  `benchuser:benchpass` (6.2.4.1: SCRAM backend auth needs plaintext
  or AES entries); frontend pool_hba stays disabled (default).
- `docs/configs/`: pgagroal (server section, scram HBA, CLI), odyssey
  (storage+rule rewrite, auth note), pgcat (admin + shard), pgbouncer
  (auth_file), pgpool-II (pool_passwd + ch.6 links). Every non-default
  value still cites upstream docs.
- Tests: 7 new regression tests in `test_adapters.py` (argv flags +
  absolute paths, server section, storage/database syntax, admin +
  shards incl. TOML parse, users.txt, pool_passwd, abspath setup);
  updated two stale `pool <mode>` markers in `test_m2.py` to the
  quoted 1.5.1 syntax. 123/123 green, `repro.sh --dry-run` intact.

Current step: fix branch complete, awaiting review
Next steps: Reviewer audit -> Tester repro -> merge -> Maintainer
  re-dispatches `poolduel-m1` (9 chunks) then chains `poolduel-m2`.
  `Refs #302`: no `Closes` until binding gates pass on green medians.

- the Builder

## 2026-09-12 transaction-pipeline fix (this run, `opencode/302-poolduel-tx-pipeline-fixes`)

Sweep 34699523244 (on eb07f10f) FAILED 9/9 product startup again, now
down to two arms (Lab run 34701351432, artifact-proven):
- pgagroal tip rc=1 `Users must be defined for the transaction pipeline`
- odyssey 1.5.1 rc=1 `log_format is not defined`
Direct/pgbouncer/pgcat/pgpool now measure (19 measured medians in
ac897b75); pgagroal/odyssey emit zero raw records.

Fixes (proven against upstream source, not guessed):
- `pgagroal.py`: `allow_unknown_users = false` (validator FATALs on
  true; test/conf/01-02 pin false); `pgagroal_databases.conf` now the
  full `benchdb benchuser N N N` triple (max/initial/min all > 0
  mandatory, prefilled per PIPELINES); new `provision_users()` runs
  `pgagroal-admin master-key` (once per HOME) + `user add` for
  benchuser in setup() when the binary exists (CI/local repro),
  skipping silently when absent (unit tests); password via
  PGAGROAL_PASSWORD env, stdin DEVNULL, AdapterError on failure;
  `start_argv` gains `-u <abs users.conf>`.
- `odyssey.py`: `log_format "%p %t %l [%i %s] (%c) %m\n"` (verbatim
  from upstream odyssey.conf; mandatory per sources/config.c
  od_config_validate) + `log_to_stdout yes`. Verified against v1.5.1
  source that no other global is mandatory without unix_socket_dir
  (which the harness does not set).
- `docs/configs/pgagroal.md`, `odyssey.md`, `grid.md`: updated to the
  corrected rendering with upstream citations (validator paths,
  test/conf, odyssey.conf).
- Tests: 12 new in `tests/test_adapter_tx_fix.py` (mandates per
  pipeline, triple shape, vault argv, provision mock matrix incl.
  key-skip + loud failure + no-password-on-cmdline, log globals per
  variant). 149/149 green, `repro.sh --dry-run` intact (12-row pilot
  plan byte-identical), M1 pilot table in index.html untouched.

Current step: fix branch complete, awaiting review
Next steps: Reviewer audit -> Tester repro (incl. pgagroal-admin
provisioning path) -> merge -> Maintainer re-dispatches `poolduel-m1`
(9 chunks) then chains `poolduel-m2`. `Refs #302`: no `Closes`
until binding gates pass on green medians.

- the Builder

## M4 blueprint (Architect, 2026-09-12, `ideas/2026-09-12-poolduel-m4.md`)

Owner M4 order (per-pooler pages + ECharts + two-tier verification) plus
completeness-audit order, both acknowledged. Completeness audit run fresh
on main cab2375c this session: M1 42/42 present, M2 59/59 expected
(cell, pooler) pairs present plus 52 by-design direct extras, 7 N/A with
nulls, 0 missing, 0 gaps to measure. Per-pooler table in the blueprint.
Timeouts (pgcat M2 7, pgagroal M2 7) are honest findings, not gaps.

- Milestone 4 (M4 deep-dives + charts + verification): [ ] five pages at
  `poolduel/<pooler>/` on one fixed identical 7-section template (all five
  nested; `/pgbouncer/` normalized to `/poolduel/pgbouncer/`); [ ] main
  `/poolduel/` comparison tables + graphs + published banner (zero pending
  banners); [ ] ECharts pinned + vendored, SVG renderer, offline-clean,
  markers + tooltips + zoom/toggles + bands + PNG export; [ ] charts.py
  generator (bundles in, option JSON out, no hand values) + shared loader;
  [ ] Tier-0 vision probe first, Tier-1 deterministic gate + Tier-2 vision
  loop both blocking; [ ] fairness-audit s4 re-check on measured medians,
  Tester sample-cell repro, Pages green with numbers live. (This PR chain,
  Refs #302; no Closes without explicit @Userfrom1995 approval.)

Current step: M4 blueprint complete, ready for Builder
Next steps: Builder implements M4 per blueprint -> Reviewer audit ->
  Tester (Tier-1 re-run + sample-cell repro + Tier-2 vision) -> Pages.

Close rule (binding): no Closes on milestone completion or green medians;
tag @Userfrom1995 with completion summary and await direction.

- the Architect

## M4 build log (Builder, 2026-09-12, branch `opencode/issue302-20260912213237`)

Implemented the M4 blueprint (`ideas/2026-09-12-poolduel-m4.md`) in full:

- Milestone 4 (M4 deep-dives + charts + verification): [x] five pages at
  `poolduel/<pooler>/` on one fixed identical 7-section template
  (`s-header/s-charts/s-flatness/s-config/s-verdict/s-na/s-repro`, order
  fixed, prev/next rotation pgagroal-pgbouncer-pgpool-odyssey-pgcat);
  [x] main `/poolduel/` upgraded (8 ECharts comparison figures in new
  section 6b, published banner, deep-dive nav, stale pending headings
  cleared); [x] ECharts 5.5.1 vendored (`vendor/echarts-5.5.1/`,
  sha256-recorded VERSION, SVG renderer only, zero CDN refs);
  [x] `harness/charts.py` generator (bundles in, 6 option JSON + manifest
  with source SHAs out, no hand values) + shared loader
  `assets/poolduel-charts.js`; [x] Tier-0 vision probe PASS (headless
  Chromium screenshot read back, M1-1 direct 25405.035073 visible);
  [x] Tier-1 gate 17/17 green (`tests/test_charts.py`: sameness, palette,
  N/A markers, zero hand values, bands equal min-max, yAxis 0, zoom,
  saveAsImage, node --check, offline-clean); full suite 179/179 green;
  [x] Tier-2 wiring `ci/vision-shots.sh` (6 PNGs under /tmp, DOM-proven
  SVG render with real labels/values); [x] fairness-audit section 5
  post-sweep re-check (469 raw records all carry pooler_config +
  pooler_version, doc-cited keys present, 42+111 medians, 7 N/A nulls);
  [x] `repro.sh --charts` one-command chart build; `repro.sh --dry-run`
  intact.
- Timeout cells (pgcat M2 7, pgagroal M2 7) render as marked findings on
  every chart, never gap-filled. (This PR chain, Refs #302; no Closes
  without explicit @Userfrom1995 approval.)

Current step: M4 implementation complete, awaiting review
Next steps: Reviewer audit -> Tester (Tier-1 re-run + sample-cell repro
  + Tier-2 vision read) -> Maintainer tags @Userfrom1995 for direction.

- the Builder

## Owner-review fix log (Builder, 2026-09-13, branch `opencode/issue302-20260913071636`)

Owner review 2026-09-13T07:13:22Z (5 blocking groups, Refs #302,
best-mode on shared load). All fixes proven empirically, never guessed:

- p99 parser (`harness/pgbench.py`): local PG16 proved `--aggregate-interval`
  switches logs to `interval_start num_tx latency_sum ...` (field 2 is a SUM)
  and `-C` prints `(including reconnection times)`. Fixes: tolerant TPS_RE
  (prefer excluding/without, fall back to including - churn M1-6/M2-W6..W10
  parse now), aggregate lines skipped via epoch guard, `--aggregate-interval`
  removed from default argv, all per-worker log files merged
  (`parse_txn_logs` + `find_logs`). Live proof: p50 0.046ms over 606k
  samples (was 249895ms), churn tps 884.7 parses.
- Session cells (chunk workdirs `poolduel-m2-m2a1/m2a2` of run 34710318693):
  pgagroal S1-S4 `FATAL: connection pool is full` in 30.1s (blocking 30s);
  pgcat S9/S10/S13/S14 `AllServersDown` in 1.0s (connect_timeout 1000ms).
  Siblings queue (pgbouncer max_client_conn 500 + query_wait_timeout 120;
  session serving verified live: 20 clients on pool 2 full-rate). Fixes,
  session-variants-only (M1 byte-identical): pgagroal blocking 30s to 120s,
  pgcat per-user connect_timeout to 120000ms (CONFIG.md: "similar to
  PgBouncer's query_wait_timeout"). Backend pools unchanged.
- Medians/report rebuilt from committed raw: `p_quarantined` on all 107
  measured medians (raw untouched), gates re-evaluated (49 A-faster + 5
  inconclusive, was 46/54 inconclusive); cross-matrix iso slices live
  (simple-update M1-5+M2-W, prepared M1-3+M2-P); flatness troughs named.
- Charts (`harness/charts.py`): natural sort, log twins, scroll legend +
  de-collided grid, off-baseline markers (symbolOffset + labels), empty
  series dropped and named, cross-matrix iso preferred, relabeled flatness,
  peak/n/warmup/hardware subtitles, distinct palette (pgagroal blue,
  pgpool-II naming unified), y units `tps (transactions/s)`. Loader adds
  rich tooltips (n/CV/p99/verdict/config) from the same bundles.
- Pages: index log hosts, inline fallback SVG cut, natural table sort,
  honest fetch-failure notes; all five per-pooler pages carry full static
  config tables (M1 7 + own M2 rows + N/A) with live tps/status/PEAK
  columns over HTTP. HTTP smoke: all pages + bundles 200.
- Fairness hardening: churn auth asymmetry recorded (methodology s7.3),
  `pg_show` capture per arm-run (schema-optional), dataset-init doc
  aligned to per-chunk code, pgpool 1:1 backend label in config doc +
  deep-dive page, fairness-audit section 6 re-check.
- Tests: 215/215 green (12 new: churn/aggregate/multi-worker parser,
  quarantine + gate fallback, readability gates incl. sort/log/markers).

Current step: owner-review fixes complete, awaiting review
Next steps: Reviewer audit -> Tester sample-cell repro -> Maintainer
  dispatches SELECTED cells only (churn block + pgagroal/pgcat session
  cells with fixed harness; full re-sweep needed for matrix-wide real
  percentiles) -> Pages. `Refs #302`; no `Closes` without explicit
  @Userfrom1995 approval.

- the Builder
