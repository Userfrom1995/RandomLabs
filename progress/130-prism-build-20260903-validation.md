# Progress: Prism #130 - Build Validation (issue #130)

- **Branch:** `opencode/issue130-20260903113155`
- **Status:** escalates to Maintainer - floor re-confirmed deterministic, gates still FAIL, no open lever
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed. Oracle 3.161/9.483.
  M2 gap 1.63%. M3 gap 11.53%. HEAD `7b00e55` == `origin/main`.

## This run (Builder, 2026-09-03)

1. Oriented to issue #130. Reviewed the negative ledger and the three prior
   2026-09-03 escalation runs (deterministic reconfirm, retry-confirmed,
   restructure validation). Resume mode: no redo of measured work, no new
   mechanism class proposed since.
2. Configured + built from source (`cmake -S prism`, Release): compiles clean,
   `prism` + `prism_tests` link.
3. Unit suite (excluding slow R7-heldout + fuzz suites that exceed the run
   timeout): **253/253 PASS** across 61 suites. R7.HeldOutVsBaseline is a
   known FAIL on real data per the ledger (experimental R7-A path ~14% worse
   than X6b; round-trip byte-exactness holds, only the size guard fails) and
   was deliberately not re-run here; flagged in the prior deterministic
   reconfirm run for the Maintainer.
4. `bench_gate.sh --self-check`: **PASS** (gate demonstrably fails known-bad
   input and passes known-good input, both units printed). D1 deliverable intact.
5. Fresh full Kodak-24 `prism bench --effort 7` on sha-pinned PPMs:
   - Mean per-sample: **3.37742 bpp**, mean summed: **10.1323 bpp/img**
   - M2 (<3.166/<9.498): **FAIL**. M3 (<2.885/<8.655): **FAIL**.
   - Output is **byte-identical to the committed**
     `prism/benchmarks/results/2026-09-03-prism-e7.csv`
     (`git status` clean after bench): encoder + measurement bit-deterministic.
6. Single-image round-trip (kodim01, e7, `enc`/`dec`): 538244 bytes,
   3.6502 bpp, `decode(encode(x))` byte-exact via `cmp`.

## Honest state (dual units)

| Path | Per-sample | Summed | M2 | M3 |
|------|-----------|--------|----|----|
| Standard e7 (fresh, this run) | 3.3774 | 10.1323 | FAIL (+6.7%) | FAIL (+17.1%) |
| X6b wavelet+EMA floor (ledger) | 3.2175 | 9.6525 | FAIL (+1.6%) | FAIL (+11.5%) |
| Oracle (cheat) | 3.161 | 9.483 | barely PASS | FAIL (+9.6%) |

No new mechanism class measured this run: every class across 9+ programs /
49+ phases remains rejected with committed CSVs, and the unbuilt incrementals
cannot arithmetically close the 1.63% M2 gap.

## Escalation

Per builder.md escalation protocol: `{"action":"maintainer"}`. Same standing
question for the Owner: (a) accept 3.2175/9.6525 as the honest best and close
#130, (b) authorize a fundamentally new architecture with GPU + large-corpus
training infrastructure, or (c) relax the binding gates. Per Anti-Surrender +
No-Pause, #130 stays OPEN; `Refs #130` only, never `Closes #130` while gates fail.

## Binding gates (units mandatory, restated)

- M2: summed < 9.498 AND per-sample < 3.166 (vs real WebP m6 3.166)
- M3: summed < 8.655 AND per-sample < 2.885 (vs real cjxl -d0 -e9 2.885)

- the Builder
