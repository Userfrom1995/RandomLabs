# Decision: #799 setup/shutdown clone-URL fix, review round 5 (PR #808)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-03T03:28:38Z
- **Applies to:** PR #808 / issue #799
- **Status:** accepted

## What was decided

The 2026-11-03T03:25Z review rejected head `a981e274` with two blocking
findings:

- F1: `resolve_github_repo` stripped a second trailing slash after the `*/*`
  guard, so `https://github.com/a//` collapsed to `a/a` and
  `git@github.com:owner//` collapsed to `owner/owner`. A malformed clone URL
  became a plausible real repository, and `--secrets`, `--dispatch`, or
  `--purge` acted on it.
- F2: the live PR body still carried the round-3 ledger (nine positive and
  six negative shapes, 17/62 verification counts) and a false claim that
  path-like components skip every `gh` write, because the `valid_repo_slug`
  shape check accepted dot-leading owners such as `.git` and `...`.

The redundant second strip is gone in both scripts, so an empty final path
component now fails `valid_repo_slug` instead of collapsing. `valid_repo_slug`
also rejects a dot-leading owner (GitHub owners cannot start with a dot), so
`.git/repo` and `.../repo` origins and overrides are rejected. The PR body is
rewritten with the current ten positive and fifteen negative fixtures, the
round-5 ledger, and the exact `AGENTS.md` wording.

## Changes

- `setup.sh`, `shutdown.sh`: removed the second `path="${path%/}"`; added the
  dot-leading owner rejection to `valid_repo_slug`.
- `tests/landing/test_pr799_setup_repo_remote.py`: added the three
  double-slash fixtures (`https://github.com/a//`,
  `git@github.com:owner//`, `ssh://git@github.com/owner//`) and the two
  dot-owner fixtures (`https://github.com/.git/repo.git`,
  `https://github.com/.../repo.git`); updated the docstring.
- Round-4 decision note: corrected the negative-fixture count, the mobile
  wrap claim, and the "no escape found" statement.
- PR #808 body: rewritten through `gh pr edit` with accurate claims and this
  round's delegation ledger.

## Delegation ledger

- general (resolver semantics audit): 15 negative fixtures and all ten positive shapes exercised through both shipped scripts with a proven mock `gh`; the double-slash and dot-owner shapes now make zero `gh` calls and every positive still targets `owner/repo`.
- general (mutation audit): restoring the second strip fails 6 subtests; removing the dot-owner guard fails 7; the 0o644 mock, scrub removal, and old greedy extraction guards still fail their suites.
- general (artifact audit): confirmed the stale PR-body counts and the false path-like claim, then verified the rewritten body against the shipped fixtures, `AGENTS.md`, and the docs; zero em dashes/CR/NUL in the changed files.
- Primary: removed both second strips, tightened `valid_repo_slug`, added the fixtures, corrected the round-4 note, ran the targeted and landing suites plus syntax checks, and updated the PR body.
- Skills: no skill fits because this round edits shell scripts, public docs, and a stdlib test, not opencode configuration.

## Verification

- `env -u ... python3 tests/landing/test_pr799_setup_repo_remote.py` -> 20 tests OK.
- `env -u ... python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 65 tests OK.
- `python3 tests/landing/test_pr797_setup_guidance.py` -> 9 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean; shellcheck only the pre-existing SC2015 in `shutdown.sh`.
- `env -u LAB_RUN_NONCE timeout 600 bash .github/scripts/silent-stall-audit.sh` -> 33 passed, 0 failed.
- Independent live matrix: ten positive origin shapes target exactly `owner/repo` with four setup calls and two shutdown deletes; fifteen negative shapes make zero `gh` calls in both scripts; `GITHUB_REPOSITORY` precedence and the malformed-override fallback hold on the write and purge paths.
- Mutation matrix: the second-strip regression fails 6 subtests and the dot-owner guard regression fails 7; each fails alone.
- PR #808 body re-read after `gh pr edit`: ten positives, fifteen negatives, the current verification counts, and the round-5 ledger are present; zero em dashes, CR, or NUL.
