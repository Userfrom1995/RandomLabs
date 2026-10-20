# Decision: capture-first baseline, staging write ban, and resolver parse guard (PR #708)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-20T07:42:05Z
- **Applies to:** PR #708 / issue #690
- **Status:** accepted

## What was decided

The round-4 review on PR #708 found that the build baseline still failed
open on a `git ls-remote` failure: the piped form reports `cut`'s status,
`2>/dev/null` hides the error, and an empty result is indistinguishable
from "branch does not exist", so the verify fell back to main and
attributed a pre-existing builder commit as this session's push. The
non-blocking follow-ups (staged-directory overwrite hardening, the preserve
step's failed probe) are closed in the same pass.

1. **Capture-first baseline (blocking F1).** Both `git ls-remote` calls in
   `Capture build baseline` now capture the raw output first, `exit 1` with
   an `::error::` on a nonzero status, and only then pipe the captured text
   into `cut`/`sort`. A successful empty result remains the legitimate "no
   such branch" case, so the main fallback is unchanged on a healthy query.
2. **Staged-directory trust boundary.** The R28 scan now rejects any
   non-staging step whose run body writes into `$RUNNER_TEMP/lab-scripts`
   (copy verbs or a redirect), closing the demonstrated glob-copy overwrite
   that bypassed the basename-prefix scan.
3. **Preserve probe.** The preserve step captures `git ls-remote` first and
   skips preservation loudly on a failed probe instead of counting every
   local commit as ahead and force-pushing over remote state.
4. **Resolver event parse.** `resolve-thread-target.sh` proves the event
   payload parses before deriving `thread`/`is_pr`; an unparseable payload
   used to read as "not a PR" and resolve a phase PR to itself, restoring
   the #690 mis-target. The resolver matrix now includes bad-payload cases.

R28's mutation set grew from 61 to 63 self-tests: 55 workflow static-pin
mutants (adds `build-baseline-git-fail-open` and `stage-overwrite-copy`)
plus 8 helper-fixture mutants. The banner, `AGENTS.md`, and `LAB.md` counts
were updated together.

## Delegation ledger

- Subagents: `explore` (fail-open pipeline scan) and `general` (independent
  baseline repro sandbox).
- Explore returned the remaining status-swallowing shapes in the build
  baseline, preserve, verify, and helper scripts; the ones that can
  misreport success were fixed here, and the fail-closed ones were left as
  they were.
- General extracted the real baseline `run:` scalar with PyYAML, built a
  bare origin plus a `gh` mock and a `git` shim failing only `ls-remote`,
  and proved rc 1 with empty `GITHUB_OUTPUT` on failure and rc 0 with the
  expected branch/head_before/pattern_tips on the healthy path.
- Primary verified: full audit `28 passed, 0 failed` (twice, including
  after the resolver change), `bash -n` on all three scripts, PyYAML parse
  of both touched workflows, `shellcheck -S error` on both helpers, `git
  diff --check`, and a U+2014 scan over every changed file.
- Skills: no skill fits (GitHub Actions CI and audit work, not opencode
  configuration); none loaded.

## Changes

- `opencode.yml`: capture-first guards for both baseline `ls-remote` calls;
  capture-first remote probe in the preserve step.
- `resolve-thread-target.sh`: upfront `jq -e .` payload validation.
- `silent-stall-audit.sh`: updated `BASELINE_BODY`, the staging write ban,
  the resolver bad-payload fixtures, the two new static mutants, and the
  count/banner text.
- `AGENTS.md` and `LAB.md`: describe the capture-first baseline, the staging
  write ban, the unparseable-payload fail-closed contract, and the 63-test
  matrix.
