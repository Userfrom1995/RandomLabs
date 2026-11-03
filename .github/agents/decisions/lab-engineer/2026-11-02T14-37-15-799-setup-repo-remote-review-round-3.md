# Decision: #799 setup/shutdown clone-URL fix, evaluator round 3 (PR #808)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-02T14:37:15Z
- **Applies to:** PR #808 / issue #799
- **Status:** accepted

## What was decided

The binding Quality Council verdict scored the PR 9.7/10 and returned `fix`
on one blocking finding: the unconditional trailing `.git` strip accepted
any two-component path as a slug, so local, `file://`, and non-GitHub mirror
origins could resolve to a real GitHub `owner/repo`. With
`file:///srv/git/Userfrom1995/RandomLabs.git` the base code targeted the
harmless `Userfrom1995/RandomLabs.git` 404 while this branch targeted the
production `Userfrom1995/RandomLabs` for secret writes, dispatches, and
purges. That is a new destructive mis-target and is fixed here.

The resolver in both scripts now extracts a slug only from recognized
github.com origin URLs: HTTPS, HTTP, `ssh://`, and `git://` (optional
userinfo, optional numeric port), plus scp-style `git@github.com:...`, with
an optional trailing slash and one optional `.git` suffix. Local paths,
`file://` URLs, non-GitHub hosts, host lookalikes, path-like components, and
`.`/`..` are rejected with a loud warning and zero `gh` calls. `shutdown.sh`
now also honors `GITHUB_REPOSITORY` as the explicit override for GitHub
Enterprise and other hosts, and a malformed override falls back to a
recognized origin rather than being used. The secret-skip message branches on
`--secrets`, and the shutdown warning only mentions purge when `--purge` was
requested.

## Changes

- `setup.sh`, `shutdown.sh`: shared-shape `valid_repo_slug` and
  `resolve_github_repo` functions; GITHUB_REPOSITORY validated in both;
  unresolved targets warn and skip secret writes, dispatches, and purges.
- `tests/landing/test_pr799_setup_repo_remote.py`: negative fixtures for
  `file:///srv/git/owner/repo.git`, `https://gitlab.com/owner/repo.git`,
  `https://github.com.evil.example/owner/repo.git`, an invalid port suffix,
  `../repo`, `/srv/git/owner/repo.git`, and `.`; exact full `gh` call lists
  per success scenario; exact probe target and diagnostic; a dedicated
  child-env assertion for all six scrubbed GitHub keys; GITHUB_REPOSITORY
  precedence in shutdown; docs pins for README and `docs/index.md`.
- `README.md`, `docs/index.md`, `docs/index.html`, `LAB.md`: the Actions-tab
  route is labeled dispatch-only once the secrets exist. `AGENTS.md` carries
  the `--check` combination precision (a write also needs a resolved
  target repo).

## Delegation ledger

- general (runtime resolution audit): ran 67 hermetic assertions with a proven mock `gh`; all nine positive shapes and seven negative shapes behaved exactly as specified, with no token leak, no shell execution, and no unexpected calls.
- general (mutation audit): baseline 16/16; old greedy extraction failed 8 subtests, removing the scrub failed the env test, a 0o644 mock failed 11 tests inertly before any scenario, and widening the host check failed 4 subtests.
- general (docs truth audit): confirmed all five doc claims against the shipped flag behavior, 16/16 and 9/9 targeted tests, 61/61 landing tests at audit time, zero em dashes/CR/NUL, and no milestone leakage in changed lines.
- Primary: reviewed the evaluator finding and prior rounds, rewrote both resolvers, added the negative fixtures and full-call assertions, updated the docs, committed the change set, and ran the targeted and landing suites plus syntax checks.
- Skills: no skill fits because this round edits shell scripts, public docs, and a stdlib test, not opencode configuration.

## Verification

- `env -u GITHUB_TOKEN -u GH_TOKEN -u GITHUB_EVENT_PATH -u GITHUB_RUN_ID -u GITHUB_ACTIONS -u GITHUB_REPOSITORY python3 tests/landing/test_pr799_setup_repo_remote.py` -> 17 tests OK.
- `env -u ... python3 tests/landing/test_pr797_setup_guidance.py` -> 9 tests OK.
- `env -u ... python3 -m unittest discover -s tests/landing -p 'test_*.py'` -> 62 tests OK.
- `bash -n setup.sh && bash -n shutdown.sh` -> clean.
- Mutation matrix: old greedy extraction fails the negative matrices in both scripts; host widening fails the non-GitHub rows; scrub removal fails the env test; a non-executable mock fails the interception gate before any scenario runs.
- No em dashes, CR, or NUL in the changed files; no workflow, agent prompt, or audit script changed.
