# Decision: #799 setup/shutdown clone-URL fix, review round 7 (PR #808)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-03T05:04:22Z
- **Applies to:** PR #808 / issue #799
- **Status:** accepted

## What was decided

The 2026-11-03T04:52Z review rejected head `5873359d` with two blocking
findings:

- F1: Git percent-decodes the SSH authority before it splits user and host,
  so `ssh://evil.com%2f@github.com/owner/repo` reaches the host `evil.com`
  while the raw text still ends in `@github.com`. The scheme-aware check
  accepted it because the SSH branch reused the HTTP userinfo class, so
  `--secrets`, `--dispatch`, and `--purge` targeted `owner/repo` without a
  warning.
- F2: the live PR body and the round-6 note still carried a false
  dot-leading-override sentence and a false "no accepted origin had a
  non-github.com host" audit result.

The SSH authority now accepts only a plain `[A-Za-z0-9._-]+` username before
`github.com`, which rejects percent escapes (and the literal-colon and
backslash forms) while keeping `ssh://git@github.com/...`,
`ssh://git@github.com:22/...`, and the scp-style `git@github.com:...` forms
working. HTTP(S) keep credentialed userinfo because curl does not
percent-decode it, and `git://` keeps the bare-host rule. The three percent
shapes are negative fixtures, a `DANGEROUS_NEGATIVES` membership pin keeps
every historical mis-target fixture in the matrix, and the body plus both
notes now state the corrected facts and counts.

## Changes

- `setup.sh`, `shutdown.sh`: split the HTTP(S) and SSH authority cases; SSH
  requires `^([A-Za-z0-9._-]+@)?github\.com(:[0-9]{1,5})?$`.
- `tests/landing/test_pr799_setup_repo_remote.py`: three percent-encoded SSH
  negatives, two distinct-slug positives (13 positives total, 21 negatives),
  and `DANGEROUS_NEGATIVES` membership pinning.
- Round-3 decision note: SSH userinfo scope corrected (no percent escapes).
- Round-6 decision note: the missed SSH divergence and the inaccurate body
  claims are recorded, with a current-tree verification section.
- PR #808 body: rewritten through `gh pr edit 808` with accurate claims,
  counts, and this round's ledger.

## Delegation ledger

- general (resolver semantics audit): 13 positives and 21 negatives through both shipped scripts with a proven mock `gh`; every positive targeted exactly its expected `owner/repo`-style slug (4 setup calls, 2 purge deletes), all 63 negative runs made zero `gh` calls, a fake-`ssh` log proved Git targeted `evil.com` for all three percent shapes, and precedence, fallback, canary, and injection checks passed.
- general (mutation and artifact audit): baseline 22/22 targeted and 67/67 landing; the permissive SSH regression fails exactly 6 subtests, the second-strip regression 6, the dot-owner regression 7, and removing a fixture from the matrix fails the membership pin; zero em dashes, CR, or NUL across the 13 scanned files and no real secret.
- Primary: split the SSH authority check in both scripts, added the fixtures and membership pin, corrected the notes, ran the targeted, guidance, and landing suites plus the 33/0 audit and the live matrix, and rewrote the PR body.
- Skills: no skill fits because this round edits shell scripts, public docs, and a stdlib test, not opencode configuration.

## Verification

- `env -u ... python3 tests/landing/test_pr799_setup_repo_remote.py` -> 22 tests OK.
- `python3 tests/landing/test_pr797_setup_guidance.py` -> 9 tests OK.
- `env -u ... python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 67 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean; shellcheck only the pre-existing SC2015 in `shutdown.sh`.
- `env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh` -> 33 passed, 0 failed.
- Mutation matrix: the scheme-blind SSH regression fails exactly 6 subtests (the three percent shapes in both scripts); the second-strip, dot-owner, non-executable-mock, and scrub-removal guards still fail their suites.
- Independent live matrix: 13 positive origin shapes target exactly their expected slug (4 setup calls, 2 purge deletes); 21 negative shapes make zero `gh` calls in both scripts; `GITHUB_REPOSITORY` precedence and the malformed-override fallback hold on the write and purge paths.
- PR #808 body re-read after `gh pr edit`: the 13/21 counts, the corrected claims, and this ledger are present; zero em dashes.
