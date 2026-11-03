# Decision: #799 setup/shutdown clone-URL fix, review round 4 (PR #808)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-03T02:58:26Z
- **Applies to:** PR #808 / issue #799
- **Status:** accepted

## What was decided

Review round 4 returned `lab` with four blocking findings on head `9d7fe5f8`:

- F1: the authority capture stopped only at `/`, so a query or fragment could
  smuggle an `@github.com` suffix past the host check. With
  `https://evil.invalid?x@github.com/owner/repo` both scripts stripped to the
  last `@`, accepted `github.com`, and wrote secrets, dispatched the
  Maintainer, or deleted secrets on `owner/repo`.
- F2: a malformed `GITHUB_REPOSITORY` printed "secret and dispatch steps will
  be skipped" (and the shutdown "purge will not delete secrets" sentence)
  before falling back to a recognized origin and performing exactly those
  actions. The purge banner also announced purge mode with no resolved target.
- F3: shutdown's `GITHUB_REPOSITORY` precedence was only tested against an
  unrecognized origin, so a mutation letting a recognized origin override a
  valid override passed the suite.
- F4: setup's malformed-override fallback was only tested on `--check`, so a
  mutation restoring the raw value inside the `--secrets` branch passed.

The parser now validates the whole unstripped authority in one anchored match,
`^([^@/?#[:space:]]+@)?github\.com(:[0-9]{1,5})?$`, and the last-`@` strip is
gone. A malformed override prints a neutral "ignoring it and trying the origin
remote" notice, and only a post-fallback failure says the secret or purge
steps will be skipped. The purge banner requires a resolved target. The suite
now pins both write-path fallbacks and the recognized-origin precedence, and
the three bypass shapes are negative fixtures in both scripts.

## Changes

- `setup.sh`, `shutdown.sh`: anchored whole-authority host match; neutral
  pre-fallback malformed-override notice; purge banner gated on a resolved
  repo.
- `tests/landing/test_pr799_setup_repo_remote.py`: three query/fragment
  bypass fixtures, an `http://` positive fixture, the recognized-origin
  shutdown precedence test (F3), the setup write-path fallback test (F4),
  false-warning assertions, and removal of the unused projection helpers.
- `AGENTS.md`: combined `--check` writes once the lab file and target-repo
  checks pass.
- `docs/index.html`: the first-run comments wrap at mobile width and the
  Actions-tab route reads as dispatch-only.
- Round-3 decision note: corrected the negative-fixture count and the
  dispatch-only wording grouping.

## Delegation ledger

- general (resolver semantics audit): 49/49 shipped-script matrix; all ten positive origin shapes targeted exactly `owner/repo`, twelve negative shapes made zero `gh` calls in both scripts, precedence/fallback/purge-banner behavior matched, and no accepted shape targeted a non-github.com host.
- general (mutation audit): baseline 20/20; the six round-4 regressions each red the suite (F1 bypass 6 tests, F2a 2, F2b 1, F2c 1, F3 1, F4 1), and the 0o644 mock (15), scrub removal (1), and old greedy extraction (24) guards still hold.
- general (docs truth audit): confirmed the AGENTS, README, docs/index.md, docs/index.html, and LAB.md claims against live script execution, the HTML block is well-formed, and the changed files carry zero em dashes/CR/NUL/controls; found only a pre-existing 76-character quickstart line and the dated round-3 counts.
- Primary: fixed both resolvers, the fallback wording, and the purge banner; added the negative fixtures and F3/F4 tests; wrapped the quickstart comments; updated the AGENTS precision; ran the targeted and landing suites, the mutation matrix, syntax checks, and the silent-stall audit.
- Skills: no skill fits because this round edits shell scripts, public docs, and a stdlib test, not opencode configuration.

## Verification

- `env -u ... python3 tests/landing/test_pr799_setup_repo_remote.py` -> 20 tests OK.
- `env -u ... python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 65 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean.
- `env -u LAB_RUN_NONCE timeout 600 bash .github/scripts/silent-stall-audit.sh` -> 33 passed, 0 failed.
- `shellcheck setup.sh shutdown.sh` -> only the pre-existing SC2015 in `shutdown.sh`, a line this PR does not change.
- Independent runtime matrix: the F1 bypass shapes produce zero `gh` calls in both scripts; the F2 fallback paths write/delete against the recognized origin with no false warning; the unresolved purge prints the skip sentence and no purge banner.
- Mutation matrix: each blocking regression fails the suite alone (see the ledger); no escape found.
