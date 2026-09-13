# Poolduel M9: powered resweep definition (Refs #302)

Date: 2026-09-13. Branch: `opencode/issue302-poolduel-m9`.
Operative plan: `864738b` (REDESIGN_PLAN.md v2.2) via the M5-M12
blueprint in `ideas/2026-09-13-poolduel-redesign.md` (M9 slice).

## What was built

The complete, executable definition of the M9 main matrix resweep:
`harness/m9.py` (six blocks, 103 chunks, powered repeats, paired
seeds), runner/CLI/preflight wiring, two equalized-auth adapter knobs,
a staged CI sweep for Lab promotion, matrix docs, repro modes, and
36 regression tests. No sweep execution (Maintainer dispatches after
Lab promotes the workflow), zero numbers claimed.

## Why this shape

M1/M2 proved CI discipline but their n=3-5 min-max headlines collapse
most deltas to `inconclusive`. M9 powers every cell (flagship 10,
standard 7) on paired seeds (repeat-only schedule, identical across
arms) so M10 can rebuild statistics on paired 95 percent bootstrap
CIs. Scale 100 enters as M1 twins (M9-C1..C7); M2-at-100 waits behind
the C-block gate (M9b) rather than doubling the sweep blind. Supavisor
twins every M2 geometry (equal budget 7+52); statement twins are N/A
with reason. The M9-E1 equalized control (SCRAM everywhere) separates
multiplexing from auth cost beside the labeled asymmetric arms.

## How it works

- `m9_seed_for(repeat, base_seed)`: bases 0/1295/8959 offsets cycle
  with a 7919 stride; no base difference is a stride multiple, so
  seeds stay distinct for every repeat at any base (test-proven).
- `run_plan(..., seed_fn)`: seed function of repeat only; default
  preserves `seed + repeat` byte-identically.
- Chunks shard flagship cells by repeat pairs and standard cells by
  [1-3]/[4-5]/[6-7]; M2/supa rows pair two per chunk. Worst chunk
  56 min measured against the 60 min cap.
- Aggregate (staged) merges `poolduel-m9-*` artifacts into
  `poolduel/results/m9/raw/`, emits supa N/A, rebuilds `medians.json`
  over all records (nulls for timeout/N/A, never zeros).

## Key files

- `poolduel/harness/m9.py`, `poolduel/harness/check.py` (M9 checks),
  `poolduel/harness/cli.py` (`--matrix m9`, `--list-m9`),
  `poolduel/harness/runner.py` (`seed_fn`, E1 posture),
  `poolduel/harness/adapters/odyssey.py` + `pgpool.py` (equalized),
  `poolduel/ci/poolduel-m9.yml` (staged), `poolduel/docs/m9-matrix.md`,
  `poolduel/tests/test_m9_matrix.py`, `poolduel/repro.sh` (`--m9-*`).

## Notes

- Live-run contract bug caught by tests: `seed_fn(base, repeat)` vs
  `m9_seed_for(repeat, base)` disagreed and would have crashed every
  M9 chunk; fixed with a boundary wrapper plus a no-arm-param guard.
- Odyssey E1 plaintext-for-scram and pgpool workdir pool_hba lookup
  are CI-proven at startup (loud failure, quarantine with evidence,
  never silent substitution).
- Lab handoff: promote `poolduel/ci/poolduel-m9.yml`, copy the
  incumbent-build block from `poolduel-m1.yml`, verify Elixir/OTP +
  migration + API-port steps against pinned v2.9.13, dispatch.

- the Builder
