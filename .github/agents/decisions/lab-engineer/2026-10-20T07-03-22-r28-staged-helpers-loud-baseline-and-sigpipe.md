# Decision: staged helpers, loud baseline, SIGPIPE fix, and R28 round-3 hardening (PR #708)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-10-20T07:03:22Z
- **Applies to:** PR #708 / issue #690
- **Status:** accepted

## What was decided

The round-3 review on PR #708 found three blocking defects in the #690
implementation and one non-blocking gap. All four are closed:

1. **F1 (blocking): post-agent steps executed helpers from the checkout the
   agent itself can rewrite.** Every phase auto-retry/completion-forward step
   and the build verify invoked `bash .github/scripts/<helper>` in the PR
   workspace. A `builder:` commit could rewrite the helper that decides
   whether a push happened, and a branch predating this PR would not even
   contain the file. Both helpers are now staged from the trusted checkout
   into `$RUNNER_TEMP/lab-scripts/` immediately after checkout and before the
   actor gate in all seven bound jobs, and every post-agent invocation uses
   the staged copy.
2. **F2 (blocking): a baseline query failure was swallowed and the verify
   then read pre-existing state as a push.** `gh pr view`/`gh pr list`
   failures were hidden by `2>/dev/null || echo ""`, so an API or permission
   error produced an empty baseline branch and the "new branch" fallback
   reported any existing remote tip as `pushed=yes`. The baseline now fails
   loudly (`::error::` plus `exit 1`), and the different-branch fallback
   additionally requires a tip absent from the baseline pattern set, so
   stale state cannot masquerade as this session's push.
3. **F3 (blocking): the classifier could SIGPIPE into a false `foreign`
   verdict.** `printf '%s\n' "$subjects" | grep -qE '^builder:'` under
   `set -euo pipefail` dies with 141 when `grep -q` exits early on a large
   builder batch (64 KiB pipe buffer), and the caller reads that as "no
   builder commit". The classifier now reads subjects through a here-string
   (`<<< "$subjects"`), which cannot SIGPIPE its writer.
4. **Non-blocking: the build forward was not gated on a verified push.** Its
   `if:` now also requires `steps.verify.outputs.pushed == 'true'`, so a
   retry-exhausted verify (`exit 1`, `pushed=false`) can never post the
   agent's stale decision.

R28 was extended accordingly: the seven staging steps and the build
forward's whole run body are pinned, any run body outside the staging steps
that names a helper basename without the `$RUNNER_TEMP/lab-scripts/` prefix
is rejected in any spelling, the workflow-level `permissions` block is
pinned exactly, and the mutation set grew to 61 (53 static + 8 helper
fixture mutants), with the large-range classifier fixture raised to 1500
commits so the SIGPIPE regression is deterministic.

## Rationale

Each defect shares the same shape: a guard that can silently conclude green
while the underlying evidence is absent or attacker-influenced. An
agent-mutable helper is not a trust boundary; a swallowed API error is not
an empty branch; a SIGPIPE-killed writer is not a foreign push. The fixes
move each decision onto evidence that cannot be forged or lost: a copy of
the helper taken before the agent starts, a baseline that is either a
successful query or a red run, and a comparison whose writer cannot die
mid-stream.

## Changes

- `opencode.yml`: added the quoted `Stage lab helper scripts (issue #690)`
  step to the research, architect, build, design, design-ux, design-visual,
  and design-motion jobs (after checkout, before the actor gate); switched
  all 18 resolver invocations and both classifier invocations to the staged
  copies; the baseline queries now fail loudly; the different-branch
  fallback requires a tip outside `PATTERN_TIPS`; the build forward `if:`
  gained `steps.verify.outputs.pushed == 'true'`.
- `classify-build-push.sh`: here-string match plus an explanatory comment.
- `silent-stall-audit.sh`: replaced the baseline and build-verify body pins
  from the live YAML; added `find_in_job`, `expect_job_step`, the
  `FORWARD_BUILD`, `STAGE_NAME`, `STAGE_BODY`, and `EXPECTED_PERMISSIONS`
  constants; pinned the seven staging steps (keys `name`/`run`, exact body,
  after checkout, before the actor gate), the build forward's full body, the
  exact workflow `permissions` block, and the helper-basename ban; added the
  `stage-body-changed`, `stage-name-changed`, `stage-direct-path`,
  `forward-builder-body-helper`, `build-baseline-fail-open`,
  `build-different-branch-no-tipmove`, and `permissions-pr-none` mutants;
  fixed the `forward-builder-gate` and baseline mutant anchors; replaced the
  400-commit large-range fixture with a deterministic 1500-commit one and
  added the branch-without-helpers staging fixture.
- `AGENTS.md`, `LAB.md`: documented staging, the loud baseline, the
  fallback tip check, the forward gate, the here-string, the permissions
  pin, and the 61/53/8 counts.

## Verification

- Control at the implementation head:
  `bash .github/scripts/silent-stall-audit.sh .github/workflows/opencode.yml`
  -> `28 passed, 0 failed`, exit 0, empty stderr (1m36s).
- Adversarial verifier A reproduced the reviewer's escapes and confirmed
  each fails R28 alone; it also found the two escapes closed in this round:
  the unpinned build-forward body and the `./.github/scripts/...` spelling
  of the workspace-copy invocation (both now pinned or rejected, with
  dedicated mutants).
- SIGPIPE determinism: a single huge subject line does not reproduce the
  bug (grep reads the line whole), and 400 commits (92 KiB) was flaky; 1500
  commits (~345 KiB) reliably returns `foreign` through the old pipe form
  (20/20) and `own` through the here-string, so `classifier-m5` is caught
  deterministically.
- Regression verifier B: all workflows parse, the seven staging steps sit
  at index 1 after checkout and before the actor gate with exactly the
  `name`/`run` keys, all 20 helper invocations use the staged path, the
  permissions block and forward gate match the pins, docs counts are
  consistent, and the audit is green with empty stderr.
- `bash -n`, `shellcheck -S error`, PyYAML parse, `git diff --check`, and
  the em-dash scan are clean.

## Delegation ledger

- General (very thorough; adversarial R28 verifier, first pass): reproduced
  every round-3 escape on the pre-fix head, verified each fails R28 alone
  after the fix, and surfaced the two residual escapes (unpinned
  build-forward body, `./`-spelled workspace helper) plus the classifier
  fixture flakiness; all are now closed or made deterministic.
- General (very thorough; regression verifier, second pass): independently
  re-derived the staging placement, invocation paths, permissions pin,
  baseline loudness, forward gate, and docs counts from the parsed YAML and
  the live audit run; 7/8 checks PASS with the remaining note (historical
  decision notes keep their era-accurate counts) deliberately not rewritten.
- Primary verified itself: generated the new constants from the live
  workflow, ran the full R1-R28 audit to 28 passed / 0 failed, and re-ran
  the SIGPIPE matrix (1500 commits, 20/20 deterministic) before landing.
- Skills: no skill fits (GitHub Actions CI and audit hardening, not
  opencode configuration); none loaded.

- the Lab Engineer
