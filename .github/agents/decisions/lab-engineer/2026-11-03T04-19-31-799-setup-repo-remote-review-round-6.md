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

The check became scheme-aware in both scripts: HTTPS, HTTP, and `ssh://` kept
optional userinfo, and `git://` began requiring a bare `github.com` authority
(an optional numeric port is still accepted). The three `git://` userinfo
shapes and a `git://` port form became fixtures, and the round-3 decision
note's userinfo scope was corrected.

Round-7 correction: the round-6 check was still too permissive for `ssh://`.
Git percent-decodes the SSH authority before splitting user and host, so
`ssh://evil.com%2f@github.com/owner/repo` reaches the host `evil.com` while
the raw text still ends in `@github.com`; the round-6 audit missed it. The
shipped check now accepts only a plain `[A-Za-z0-9._-]+` SSH username, which
rejects percent escapes, and the three shapes are negative fixtures.

The PR body was refreshed through `gh pr edit`, but it still carried the
false dot-leading-override sentence and the false "no accepted origin had a
non-github.com host" audit result; round 7 rewrote it with the accurate
claims and fixture counts.

## Changes

- `setup.sh`, `shutdown.sh`: scheme-aware authority validation; `git://`
  requires `^github\.com(:[0-9]{1,5})?$`.
- `tests/landing/test_pr799_setup_repo_remote.py`: three `git://` userinfo
  negatives, a `git://` port positive, a populated-fixture guard, and a
  duplicate-flag guard on the quickstart command check.
- Round-3 decision note: corrected the "optional userinfo" scope.
- PR #808 body: rewritten through `gh pr edit` with the round-6 counts and
  this round's delegation ledger (accuracy gaps corrected in round 7).

## Delegation ledger

- general (resolver semantics audit): 11 positive and 18 negative origin shapes exercised through both shipped scripts with a proven mock `gh`; every positive targeted exactly `owner/repo` with four setup calls and two purge deletes, every negative made zero `gh` calls, canaries never reached argv, and a hostile `;touch` origin created no file. Round-7 correction: this audit missed the SSH percent-decoded authority divergence (Git resolved `ssh://evil.com%2f@github.com/owner/repo` to the host `evil.com`), so its "no accepted origin had a non-github.com host" conclusion was false until the round-7 fix.
- general (mutation and artifact audit): baseline 21/21; the scheme-blind userinfo regression fails exactly 6 subtests (the three `git://` userinfo shapes in both scripts); the fixtures define 11 positives and 18 negatives; zero em dashes, CR, or NUL in the changed files.
- Primary: rewrote the scheme-aware authority check in both scripts, added the fixtures and two test-hardening guards, corrected the round-3 note, ran the targeted, guidance, and landing suites plus the 33/0 audit and an independent live matrix, and refreshed the PR body.
- Skills: no skill fits because this round edits shell scripts, public docs, and a stdlib test, not opencode configuration.

## Verification (round 6, historical)

- `env -u ... python3 tests/landing/test_pr799_setup_repo_remote.py` -> 21 tests OK.
- `python3 tests/landing/test_pr797_setup_guidance.py` -> 9 tests OK.
- `env -u ... python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 66 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean; shellcheck only the pre-existing SC2015 in `shutdown.sh`.
- `env -u LAB_RUN_NONCE timeout 600 bash .github/scripts/silent-stall-audit.sh` -> 33 passed, 0 failed.
- Mutation matrix (round 6): restoring the scheme-blind optional-userinfo check in both scripts failed 6 subtests. Round-7 correction: removing the three `git://` userinfo fixtures from the shipped matrix now fails the `DANGEROUS_NEGATIVES` membership pin, so the guard no longer depends only on the resolver fix.
- Independent live matrix: 11 positive origin shapes target exactly `owner/repo` (four setup calls, two purge deletes); 18 negative shapes make zero `gh` calls in both scripts; `GITHUB_REPOSITORY` precedence and the malformed-override fallback hold on the write and purge paths.
- PR #808 body re-read after `gh pr edit`: the round-6 counts and ledger were present, but the body still carried the false dot-leading-override sentence and the false non-github.com-host claim; round 7 corrected both.

## Round-7 verification (current tree)

- `python3 tests/landing/test_pr799_setup_repo_remote.py` -> 22 tests OK.
- `python3 tests/landing/test_pr797_setup_guidance.py` -> 9 tests OK.
- `python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 67 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean.
- `env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh` -> 33 passed, 0 failed.
- The shipped matrix is 13 positive and 21 negative origins (the 18 round-6
  negatives plus the three SSH percent shapes); restoring the permissive
  scheme-blind SSH check fails exactly 6 subtests, and an independent
  fake-`ssh` run showed Git targeted `evil.com` for all three shapes.
