# Decision: #799 setup/shutdown clone-URL fix, review round 6 (PR #808)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-03T04:19:31Z
- **Applies to:** PR #808 / issue #799
- **Status:** accepted

## What was decided

The 2026-11-03T04:12Z review rejected head `46732940` with one blocking
finding: the whole-authority check allowed optional userinfo for every scheme,
but `git://` has no userinfo. Git parses `git://evil.invalid@github.com/...`
as the host `evil.invalid@github.com`, while the scripts read it as
`github.com`; `--secrets`, `--dispatch`, and `--purge` then targeted
`owner/repo` with no warning.

The check is now scheme-aware in both scripts: HTTPS, HTTP, and `ssh://` keep
optional userinfo, and `git://` requires a bare `github.com` authority (an
optional numeric port is still accepted). The three userinfo shapes and a
`git://` port form are fixtures. The round-3 decision note is corrected
(userinfo applies only to HTTPS/HTTP and `ssh://`), and the PR body is
refreshed through `gh pr edit` with the current fixture counts and ledger.

## Changes

- `setup.sh`, `shutdown.sh`: scheme-aware authority validation; `git://`
  requires `^github\.com(:[0-9]{1,5})?$`.
- `tests/landing/test_pr799_setup_repo_remote.py`: three `git://` userinfo
  negatives, a `git://` port positive, a populated-fixture guard, and a
  duplicate-flag guard on the quickstart command check.
- Round-3 decision note: corrected the "optional userinfo" scope.
- PR #808 body: rewritten through `gh pr edit` with accurate claims and this
  round's delegation ledger.

## Delegation ledger

- general (resolver semantics audit): 11 positive and 18 negative origin shapes exercised through both shipped scripts with a proven mock `gh`; every positive targeted exactly `owner/repo` with four setup calls and two purge deletes, every negative made zero `gh` calls, no accepted origin had a non-github.com host, canaries never reached argv, and a hostile `;touch` origin created no file.
- general (mutation and artifact audit): baseline 21/21; the scheme-blind userinfo regression fails exactly 6 subtests (the three `git://` userinfo shapes in both scripts); the fixtures define 11 positives and 18 negatives; zero em dashes, CR, or NUL in the changed files.
- Primary: rewrote the scheme-aware authority check in both scripts, added the fixtures and two test-hardening guards, corrected the round-3 note, ran the targeted, guidance, and landing suites plus the 33/0 audit and an independent live matrix, and refreshed the PR body.
- Skills: no skill fits because this round edits shell scripts, public docs, and a stdlib test, not opencode configuration.

## Verification

- `env -u ... python3 tests/landing/test_pr799_setup_repo_remote.py` -> 21 tests OK.
- `python3 tests/landing/test_pr797_setup_guidance.py` -> 9 tests OK.
- `env -u ... python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 66 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean; shellcheck only the pre-existing SC2015 in `shutdown.sh`.
- `env -u LAB_RUN_NONCE timeout 600 bash .github/scripts/silent-stall-audit.sh` -> 33 passed, 0 failed.
- Mutation matrix: restoring the scheme-blind optional-userinfo check in both scripts fails 6 subtests; removing the three `git://` userinfo fixtures keeps the suite green because the resolver fix is what closes the class.
- Independent live matrix: 11 positive origin shapes target exactly `owner/repo` (four setup calls, two purge deletes); 18 negative shapes make zero `gh` calls in both scripts; `GITHUB_REPOSITORY` precedence and the malformed-override fallback hold on the write and purge paths.
- PR #808 body re-read after `gh pr edit`: current counts, the round-6 ledger, and zero em dashes.
