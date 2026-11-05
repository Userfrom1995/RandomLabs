# Decision: #820 quota-wall recovery follow-up, review round 2 (PR #822)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-05T09:13:54Z
- **Applies to:** PR #822 / issues #820 and #775
- **Status:** accepted

## What was decided

The 2026-11-05T08:44Z review rejected head `b8b27010` with two blocking
findings:

- F1: the above-threshold run had no delegation ledger in the PR body,
  comments, or a decision note.
- F2: the #775 regression guard did not cover the curator cap note at
  `.github/workflows/curator.yml:163`, and the R34 banner claimed coverage
  that did not exist.

Both are fixed here. F1 is satisfied by this note and by the PR body, which
now carry the ledger. F2 is satisfied by extending R9 to pin the exact
self-heal and curator cap-note bodies and to ban `/oc` and `/opencode`
anywhere in them, extending R34 to pin the exact intake detector and to ban
both token spellings in the intake and recovery notes, and correcting the
R34 banner.

## Changes

- `maintainer.yml` intake: the detector now matches ONLY the runner's
  rendered `##[error]`/`##[warning]provider daily free-usage limit reached
  ... (FreeUsageLimitError, issue #754)` annotation. `gh run view --log`
  echoes every step's whole `run:` script (ANSI-colored), so the old
  unanchored fallback matched the source echo on every failed run and
  matched a quoted provider line in a successful run. `--log-failed` is not
  usable because the agent step is `continue-on-error`.
- R34: pins the exact intake detector; strips the old substring needle;
  bans `/oc` and `/opencode` in the intake and recovery notes; fixtures now
  include a canonical error annotation, a canonical warning annotation, a
  timestamped raw provider line (negative), and an ANSI source echo
  (negative); the intake matrix asserts the two provider-form negatives do
  not stand down or post a note; mutants prove the anchor and the
  `/opencode` ban load-bearing.
- R9: pins the exact `schedule-selfheal.sh` escalation body and the exact
  curator cap-note line, bans both token spellings in them, and carries four
  mutation self-tests (a token in each body, a rewritten body in each).
- R15: the canonical-message count is now anchored to the three
  `echo "::warning::`/`echo "::error::` lines and its exit-1 check to the two
  error echoes, so the new detector mention cannot mask a removed canonical
  echo.
- Docs: `LAB.md` and `AGENTS.md` describe the rendered-annotation match, the
  R9/R34 token-free coverage, and the one-pending-slot caveat (a second
  chain's recovery dispatch can replace a still-pending recovery run, so the
  red-at-cap guarantee is per chain); the stale "escalate to `/oc
  maintainer` at the cap" line is corrected to the lab-health board.
- R26: the maintainer pre-handler manifest was regenerated for the new
  intake body.

## Delegation ledger

- explore (quota-wall implementation map): returned the marker, intake,
  recovery, concurrency, and R34 locations; the final statement was sparse,
  so the primary re-read every changed region directly.
- explore (R9/R34 audit map): returned the rule line ranges, the `check()`
  reporter mechanics, the fixture structure, and the absence of a self-test
  mode; used to target the edits and mutation fixtures.
- explore (PR/decision survey): returned the live PR body, the decision-note
  naming/format precedent, and the lab runner's `/tmp` and linkage-guard
  contract; used to shape this note and the PR body.
- Primary: real-log forensics on four runs proved the source-echo hazard;
  edited the detector, R9/R34/R15, and docs; ran the full audit.
- Skills: no skill fits because this round edits workflows, shell audit
  rules, and docs, not opencode configuration.

## Verification

- `bash -n .github/scripts/silent-stall-audit.sh` and
  `bash -n .github/scripts/schedule-selfheal.sh`: clean.
- `yaml.safe_load` on `maintainer.yml`, `curator.yml`, and `opencode.yml`:
  OK.
- `env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh
  .github/workflows/opencode.yml`: 34 passed, 0 failed (R9, R15, R26, and
  R34 included).
- Real-log evidence: failed runs 41796370639, 41889667166, and 41933093526
  carry the canonical `##[error]provider daily free-usage limit reached ...
  (FreeUsageLimitError, issue #754)` annotation; successful run 41991790055
  carries zero rendered annotations while containing six raw provider
  quotes.

## Residuals

- The detector depends on the runner rendering the fast-fail echo as a
  `##[error]`/`##[warning]` annotation, which the measured wall-failure logs
  confirm. A future change to the runner's rendering would be caught only if
  the R34 fixtures move with it; the canonical echo remains the primary
  signal.
- The fixed `quota-recovery` group keeps one pending run, so a second
  chain's dispatch can replace a still-pending recovery run. The red-at-cap
  guarantee is per chain, and the next schedule tick re-arms recovery.
- `silent-stall-audit.sh` exits 0 even when rules fail (it posts a
  lab-health comment instead); that is pre-existing and out of scope here.

- the Lab Engineer
