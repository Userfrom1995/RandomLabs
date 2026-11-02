# Decision: #799 setup/shutdown clone-URL fix, review round 2 (PR #808)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-02T12:28:52Z
- **Applies to:** PR #808 / issue #799
- **Status:** accepted

## What was decided

Review round 1 on PR #808 verified the clone-URL extraction fix and the
regression suite as correct and mutation-proven, and raised two blocking
findings. F1: the PR artifact carried no delegation ledger or skills note.
F2: the new mock-`gh` harness had no interception proof and copied the live
GitHub context into every scenario, so a PATH fall-through could run the real
`gh` with runner credentials. Both are closed in this round, along with the
reviewer's two concrete test-coverage notes and the one non-blocking docs
ambiguity the independent docs audit reproduced.

## Changes

- `tests/landing/test_pr799_setup_repo_remote.py`: `setUp` now proves
  interception before any scenario (executable bit, `shutil.which` resolves
  to the mock, one probe whose call is asserted in the log). `run_script`
  scrubs `GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_EVENT_PATH`, `GITHUB_RUN_ID`,
  `GITHUB_ACTIONS`, and `GITHUB_REPOSITORY`, then pins `HOME`,
  `GH_CONFIG_DIR`, and `GH_HOST=github.invalid`, so a fall-through has no
  stored auth and no reachable host. The replacement failing mock re-proves
  interception before it is used. The suite now also covers `ssh://` with a
  port, credentialed HTTPS, `.git/`, and asserts the surfaced `HTTP 404`
  diagnostic.
- `docs/index.html`, `LAB.md`: the Actions-tab route is now labeled as a
  dispatch-only alternative for users who already set the secrets, instead of
  reading as an equivalent first run.
- `AGENTS.md`: `--check` is documented as read-only when used alone and
  writing when combined with `--secrets` or `--dispatch`, matching the
  independent flag-parser audit.
- The documentation tests pin all three corrected claims.

## Delegation ledger

- general (repo-slug extraction audit): confirmed the shipped sed resolves all eight HTTPS/SSH/scp/`ssh://`-port/credentialed/`.git/`/trailing-slash shapes, `GITHUB_REPOSITORY` precedence, no token leak, and warn-and-continue on a missing origin.
- general (harness isolation audit): proved the interception gate precedes the matrix; a 0o644 mock fails 7 sandbox tests before any scenario, and removing the scrub with a hostile `GITHUB_REPOSITORY` fails 13 assertions; suite 11/11 OK.
- general (setup docs accuracy audit): confirmed the script modes and most claims, and reproduced two gaps (Actions tab dispatches only; `--check` combined with a write flag writes). Both are fixed and pinned this round.
- Primary: reviewed the diff, edited the harness, docs, and tests, mutation-tested the three doc assertions in a scratch copy, ran the full landing suite and the silent-stall audit.
- Skills: no skill fits because this round edits shell scripts, public docs, and a stdlib test, not opencode configuration.

## Verification

- `env -u GITHUB_TOKEN -u GH_TOKEN -u GITHUB_EVENT_PATH -u GITHUB_RUN_ID -u GITHUB_ACTIONS -u GITHUB_REPOSITORY python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 56 tests OK.
- `python3 tests/landing/test_pr797_setup_guidance.py` -> 9 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean.
- `env -u LAB_RUN_NONCE timeout 300 bash .github/scripts/silent-stall-audit.sh` -> 33 passed, 0 failed.
- Mutations: reverting each of the three doc corrections fails its test (3 failures), a 0o644 replacement mock fails the interception gate before `setup.sh` runs, and the remote matrix stays green for all eight shapes.
- No em dashes in the changed files; no workflow, agent prompt, or audit script changed in this round.
