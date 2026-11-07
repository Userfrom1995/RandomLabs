# Decision: project-config opt-out on every agent arm (issue #831)

- **Decider:** the Lab Engineer (CTO)
- **Date:** 2026-11-07T04:29:04Z
- **Applies to:** issue #831
- **Status:** accepted; the live scratch-canary verification item stays open
  under `Refs #831`

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

Residual: the requested scratch PR-comment canary (a canary plugin on the
Maintainer arm plus the `pull_request` and `workflow_dispatch` wake paths)
was not executed this round. The loader behavior is cwd-based and does not
depend on how the worktree came to exist, so the canary proof plus the
extracted wake-path mapping cover the class at source level. The live
PR-thread evidence below covers the pre-fix execution path on the lab arm;
the Maintainer arm and the canary plugin remain the open ask (see
"Remaining verification gap").

## Live execution-path evidence (review round)

Review finding F2 required either the requested scratch PR-comment canary or
an explicit Owner waiver of the source-extraction substitution. This pass
adds the execution-path evidence the session itself can produce:

- Run 42340994195 was a live PR-thread `issue_comment` session on this PR
  (`GITHUB_EVENT_NAME=issue_comment`), the same wake class the issue names.
  `.git/logs/HEAD` shows the pre-agent checkout at `main` `5b699601` by the
  runner identity, then a second checkout to
  `opencode/lab-831-project-config-optout` head `e0187e26` authored by the
  session identity five seconds later: the CLI's GitHub bootstrap PR-head
  checkout.
- The session's instruction loader named the workspace
  `/home/runner/work/RandomLabs/RandomLabs/AGENTS.md`, and the loaded copy
  carried the #831 paragraph that exists only on this PR head (workspace
  grep count 1; `git show origin/main:AGENTS.md` grep count 0).
  `OPENCODE_CONFIG` pointed at the staged maintained config, so this
  directly confirms the issue's premise: the staged config does not stop
  project instruction loading, and the opt-out is required. The plugin
  channel is covered by the loader canary (control: plugin loaded;
  treatment: not loaded).

Remaining verification gap: the Owner's ask also covers a canary plugin in
a scratch PR-comment session, the Maintainer arm, and the `pull_request`
and `workflow_dispatch` wake paths. Those were not exercised live this
round (a scratch PR cannot be pushed from this session: the PAT-backed
runner step owns the push, and the canary session must be triggered on a
disposable PR). The PR therefore stays `Refs #831`, not `Closes #831`,
until that evidence or an explicit Owner waiver is recorded. The extracted
wake-path mapping and the loader canary remain the proof for those paths.

## Review round fixes

- F1 (blocking): the delegation ledger and skills note are recorded below
  and in the PR body.
- F2: the live execution-path evidence above is recorded; linkage stays
  `Refs #831` with the remaining gap stated explicitly.
- F3: the branch was rebased onto `5b699601` (four clean replays, no
  conflicts) and the full audit re-ran on the rebased head.
- F4: the `maintainer.yml` #831 comment now says "PR head branch (or the
  fork's head branch)", matching the shipped CLI bootstrap; LAB.md gains
  the schedule/workflow_dispatch negative clause and the complete
  three-event PR list.

## Delegation ledger

- explore (arm enumeration across 20 workflow files): all 21 agent steps
  carry the exact opt-out plus grant, zero misses; `opencode.yml` has nine
  agent modes (`continue` rides the build job).
- general (full R1-R34 audit on the rebased head): 34 passed, 0 failed,
  exit 0, no stderr surprises.
- explore (docs, diff, live evidence): no em dash or `Co-authored-by`
  additions; every subject starts `lab:`; the reflog and AGENTS.md grep
  evidence captured; flagged LAB.md's missing schedule/workflow_dispatch
  clause (fixed this round).
- Primary verified itself: the clean 4/4 rebase onto `5b699601`, the F4
  wording edit, the direct reflog and `AGENTS.md` greps, and the
  `Refs #831` metadata.

## Skills

Loaded `customize-opencode`: applied its escape-hatch guidance
(`OPENCODE_DISABLE_PROJECT_CONFIG` skips the project config while
`OPENCODE_CONFIG` remains the staged explicit config) and its
`external_directory` permission shape; no repo config file changed.

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
- Review round: the `maintainer.yml` #831 comment now names the PR head
  branch (or fork head branch), `LAB.md` gains the complete wake-path
  sentence (three PR-triggered events, schedule/workflow_dispatch never
  check out a PR), and this note gains the live evidence, ledger, and
  skills sections.

## Verification

- All modified workflow files parse with a strict duplicate-key-rejecting
  loader.
- A structural enumeration across all 20 workflow files finds 21 agent
  steps (20 composite-action steps plus the Maintainer inline arm), and all
  21 carry the exact opt-out plus grant.
- `timeout 1800 env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh`
  on the rebased head: 34 passed, 0 failed, exit 0. The first pre-rebase
  run caught the stale R28 `AGENT_ENV` pin; the pin now carries the pair.
- Diff hygiene: no em dash or `Co-authored-by` additions; every commit
  subject starts with `lab:`; the working tree holds only the intended
  edits.
