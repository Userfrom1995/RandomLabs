# Progress: Prism #130 - Deterministic Re-confirmation (issue #130)

- **Branch:** `opencode/issue130-20260903083353`
- **Status:** escalates to Maintainer - floor re-confirmed by bit-exact reproduction, no open lever
- **Date:** 2026-09-03 (Builder run, `/oc build` trigger)
- **Precedent:** X6b floor 3.2175 per-sample / 9.6525 summed. M2 gap 1.63%. M3 gap 11.53%.

## This run (Builder, 2026-09-03)

1. Oriented to issue #130. Reviewed the full negative ledger (9+ programs /
   44+ phases, all rejected with committed CSVs) and the last three
   escalation runs (2026-09-02 continue, 2026-09-03 fresh escalation +
   retry-confirmed). No new mechanism class proposed since; resume mode,
   no redo of done work.
2. Built from `origin/main` (`6e9df79`): cmake configure + full build clean.
3. `bench_gate.sh --self-check`: PASS (gate demonstrably fails known-bad
   input and passes known-good input, both units printed). D1 deliverable intact.
4. Fresh full Kodak-24 `prism bench --effort 7` on sha-pinned PPMs:
   - Mean per-sample: **3.3774 bpp**, mean summed: **10.1323 bpp/img**
   - M2 (<3.166/<9.498): **FAIL**. M3 (<2.885/<8.655): **FAIL**.
   - Output CSV is **md5-identical** to the committed
     `prism/benchmarks/results/2026-09-03-prism-e7.csv` - the encoder and
     the measurement are bit-deterministic; the floor reproduces exactly.
5. Single-image round-trip (kodim01, e7): 3.6502 bpp, `decode(encode(x))`
   byte-exact via `cmp`.
6. Full unit suite `prism_tests`: **260/261 pass**. The single failure is
   `R7.HeldOutVsBaseline` (held-out kodim02/07/17/21, R7-A vs X6b baseline):
   measured NET +13.41%..+14.76% (median +14.33%) against the test's
   catastrophic-regression guard of <= +5.0% (`prism/tests/unit/test_r7.cpp:161`).
   Round-trip byte-exactness holds (all `EXPECT_EQ(decode, r)` pass); only the
   size guard fails. This failure exists on unmodified `origin/main`
   (`6e9df79`) - this run changed no source - and is consistent with the
   ledger's R7 FAIL verdict: the experimental R7-A path is genuinely ~14%
   worse than X6b on held-out photos. Note the test skips vacuously when the
   Kodak dir is absent, so CI without corpus data stays green; the failure
   surfaces only with real data present, which is the test working as
   designed. No gate-gutting (relaxing the 5% guard) applied - that belongs
   to Route 7's open PR #186, not this run. Flagged here as a main-health
   observation for the Maintainer.

## Honest state (dual units)

| Path | Per-sample | Summed | M2 | M3 |
|------|-----------|--------|----|----|
| Standard e7 (fresh, this run) | 3.3774 | 10.1323 | FAIL (+6.7%) | FAIL (+17.1%) |
| X6b wavelet+EMA floor | 3.2175 | 9.6525 | FAIL (+1.6%) | FAIL (+11.5%) |
| Oracle (cheat) | 3.161 | 9.483 | barely PASS | FAIL (+9.6%) |

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
