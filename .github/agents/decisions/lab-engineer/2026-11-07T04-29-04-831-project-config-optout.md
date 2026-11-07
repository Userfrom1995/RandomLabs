# Decision: project-config opt-out on every agent arm (issue #831)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-07T04:29:04Z
- **Applies to:** issue #831
- **Status:** accepted

## What was decided

`opencode github run` checks out the PR head for `pull_request`,
`pull_request_review_comment`, and `issue_comment`-on-a-PR wake-ups, so the
CLI's project-config auto-loader can merge the PR-controlled tree's
`AGENTS.md`, `opencode.json`, and `.opencode` plugins into an agent session
even when the workflow's pre-agent checkout is pinned to the trusted
default branch. Every comment-triggered agent arm now sets
`OPENCODE_DISABLE_PROJECT_CONFIG: "true"` and the exact
`OPENCODE_PERMISSION: '{"external_directory":{"*":"allow"}}'` grant. The
round-27 claim that the trusted checkout protects the agent session is
corrected in `AGENTS.md` and `LAB.md`.

## Empirical canary evidence

A local OpenAI-compatible mock provider captured every provider request
body (`/tmp/oc-canary/mock_server.py`, port 18777, SSE streaming). A staged
config (`OPENCODE_CONFIG`) pointed opencode at provider `mock` /
`canary-model`; the workspace carried three canaries: a plugin that writes
and lists a sentinel, `opencode.json` with a `username` marker, and
`AGENTS.md` with `AGENTS-CANARY-7731`.

- Without the opt-out, `opencode debug config` listed the workspace plugin
  (`file:///tmp/oc-canary/ws/.opencode/plugin/canary.js`), the workspace
  `opencode.json` merged (`username: WORKSPACE-CONFIG-CANARY-5182`), and
  the captured provider request's system message contained
  `AGENTS-CANARY-7731`. Exit status 0.
- With `OPENCODE_DISABLE_PROJECT_CONFIG=true` plus the grant, no plugin
  loaded, no workspace config merged, and zero captured requests contained
  any canary, while the staged config still supplied `small_model`, the
  mock model, and permissions. Exit status 0.

The loader code confirms the scope: the instruction loader returns an empty
list when `OPENCODE_DISABLE_PROJECT_CONFIG` is truthy, and the config loader
always merges the project `opencode.json`/`opencode.jsonc` and `.opencode`
directories unless that same flag is set, even when `OPENCODE_CONFIG` is
loaded first. The global config-dir `AGENTS.md` still loads (trusted home),
which is intended.

## Wake-path scope

Extracted from the shipped CLI (opencode 1.19.5, Bun binary): `schedule`
and `workflow_dispatch` events get a generated `opencode/dispatch-*` or
`opencode/schedule-*` branch and never check out a PR; the PR-head
checkout applies to the `pull_request` family and PR-thread
`issue_comment`. `maintainer.yml` maps `workflow_run` to
`GITHUB_EVENT_NAME="workflow_dispatch"`. The opt-out is applied to every
arm anyway, so a future wake-path change cannot reopen the class.

Residual: no live PR-comment session was executed for this round. The
loader behavior is cwd-based and does not depend on how the worktree came
to exist, so the canary proof plus the extracted wake-path mapping cover
the class at source level; a live run would add execution-path evidence
only.

## Changes

- `maintainer.yml`: opt-out on the inline agent env, the #743 comment
  updated to #831, the checkout comment corrected, and the PROMPT envelope
  states that the staged prompt is authoritative and project config is
  disabled.
- `opencode.yml` (all nine modes), `lab.yml`, `curator.yml`, `auditor.yml`,
  `ideate.yml`, `opencode-recover.yml`: opt-out plus the exact grant.
- `.github/scripts/silent-stall-audit.sh`: R31 requires the pair on every
  comment-triggered agent step and on the Maintainer inline arm, with
  remove/re-enable/weaken mutation self-tests per arm; R26's manifest and
  the R28 referenced-step env pin were updated in sync.
- `AGENTS.md`, `LAB.md`, `.github/actions/opencode-run/action.yml`:
  documentation corrected and extended.

## Verification

- All modified workflow files parse with `yaml.safe_load`.
- Every comment-triggered agent step carries the exact opt-out and grant.
- `bash .github/scripts/silent-stall-audit.sh`: 34 passed, 0 failed. The
  first run caught the stale R28 `AGENT_ENV` pin; the pin now carries the
  pair and the suite is green.
