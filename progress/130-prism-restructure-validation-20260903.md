# Progress: Prism #130 - Restructure Validation (issue #130)

- **Branch:** `opencode/issue130-20260903090152`
- **Status:** escalates to Maintainer - new main HEAD validated, floor bit-identical, gates still FAIL
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed (full real Kodak-24).
  Oracle 3.161/9.483 (0.16% above M2 gate). M2 gap: 1.63%. M3 gap: 11.53%.

## Why this run existed

`origin/main` moved to `6e9df793` ("Model Change", 2026-09-03 13:56 +0530,
1230 files) after PR #259's floor re-confirmation. No builder run had
validated the codec at the new HEAD. A repo-wide restructure can silently
break build/test/bench paths, so re-validation is real work, not ceremony.

## This run (Builder, 2026-09-03)

1. Oriented to issue #130. Surveyed all open PRs (#259, #232, #203, #202,
   #186, #181), the 50+ progress files, and the 5 remaining untested
   incremental mechanisms (combined optimistic estimate < 1.0-1.5%, below
   the 1.63% M2 gap - correctly left unbuilt).
2. Confirmed `prism/` source, Kodak corpus links, and `bench_gate.sh`
   intact at `6e9df793`. Working tree clean.
3. Configured + built from source (`cmake -S prism`, Release): compiles
   clean, `prism` + `prism_tests` link.
4. Unit suite: **261/261 PASS** (63 suites, includes R6b/R6c/R6d/R7,
   neural-entropy, fuzz-gate).
5. Fresh `prism bench --effort 7 --kodak` on real Kodak-24:
   - Mean per-sample: **3.3774 bpp**, mean summed: **10.1323 bpp/img**
     (11,952,491 bytes / 24 images)
   - Output is **byte-identical to the committed CSV already on main**
     (`git diff HEAD` empty): the restructure preserved the deterministic
     floor exactly. No new CSV needed; the durable artifact stands.
   - kodim01 round-trip spot check: byte-exact (`cmp` clean)
6. Official `bench_gate.sh` on the fresh CSV (both units enforced):
   - M2 (< 9.498 / < 3.166): **FAIL** both units (10.1323, 3.3774)
   - M3 (< 8.655 / < 2.885): **FAIL** both units (10.1323, 3.3774)
7. `bench_gate.sh --self-check`: **PASS** (proves the gate can fail AND pass).

## Honest state (dual units)

| Path | Per-sample bpp | Summed bpp | M2 | M3 |
|------|---------------|------------|----|----|
| Standard e7 (this run, fresh) | 3.3774 | 10.1323 | FAIL (+6.7%) | FAIL (+17.1%) |
| X6b wavelet+EMA floor (ledger) | 3.2175 | 9.6525 | FAIL (+1.6%) | FAIL (+11.5%) |
| Oracle (ledger) | 3.161 | 9.483 | BARELY PASS | FAIL (+9.6%) |

No new mechanism class measured this run: every class across 9+ programs /
49+ phases remains rejected with committed CSVs, and the 5 unbuilt
incrementals cannot arithmetically close the gap. Deliberately did NOT run
a partial X6b quad subset (non-gate-authoritative numbers add noise, not
signal).

## Escalation

Per builder.md escalation protocol: `{"action":"maintainer"}`. The
Owner must decide:
(a) Accept 3.2175/9.6525 as the honest best and close #130, or
(b) Authorize a fundamentally new architecture with proper training
    infrastructure (GPU, large corpus, learned entropy model), or
(c) Relax the binding gates.

Per Anti-Surrender + No-Pause, #130 stays OPEN (no success claim).

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)
- `bench_gate.sh` dual-unit check is the only acceptance authority. `Refs #130`
  (never `Closes #130` while gates remain open).

- the Builder
