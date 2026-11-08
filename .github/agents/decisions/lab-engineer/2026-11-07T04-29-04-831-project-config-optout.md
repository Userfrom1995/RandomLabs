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

The 1.19.3 loader code confirmed the scope: the instruction loader returns
an empty list when `OPENCODE_DISABLE_PROJECT_CONFIG` is truthy, and the
config file loader skips the project `opencode.json`/`opencode.jsonc` merge
under the same flag, even when `OPENCODE_CONFIG` is loaded first. The global
config-dir `AGENTS.md` still loads (trusted home), which is intended.

## Import-time plugin channel (Tester round)

The Tester's CLI 1.19.5 canary found the opt-out boundary is narrower than
the 1.19.3 result: the unconditional plugin walk in
`packages/opencode/src/config/config.ts` still imports
`.opencode/plugin/*.js` and `.opencode/plugins/*.js` at process bootstrap
(`InstanceStore.load` then `plugin.init()`), and that bootstrap runs before
the GitHub handler's PR-head checkout. On the four PR-head-checkout arms
(review, test, per-OS, eval) a PR-controlled plugin module would therefore
execute top-level code before the agent, regardless of the opt-out.
Upstream tracks the bug (anomalyco/opencode#49836, fix PR #50186), and
`--pure` does not close it.

This round reproduced the finding locally on the installed 1.19.5 binary
with the same mock provider and staged config: with the opt-out plus the
exact grant, `.opencode/plugin/canary.js` imported (sentinel
`module-imported:/tmp/oc-canary/ws`) and `.opencode/plugins/canary.js`
imported (sentinel `plural-module-imported`); `.opencode/tool/canary.js`
and a `.opencode/plugin.js` file were not imported at bootstrap. Removing
both directories before the CLI started closed the channel (no sentinel,
exit 0). skip-worktree was tested separately: it does not stop a later
`git checkout <branch>` from restoring the files, but it does hide the
deletion from `git status --porcelain`, which is what keeps the
contents-write arms' end-of-session auto-commit from staging a deletion
onto the PR branch.

The fix lives in the vendored composite runner, so one trusted change
covers all 20 composite arms: a new first step removes
`.opencode/plugin` and `.opencode/plugins` before the first CLI process
starts, marks tracked paths `--skip-worktree` first (aborting loudly if the
enumeration or marking fails), removes a `.opencode` symlink without
following it, and leaves a legitimate `.opencode` tree (no plugin
directories) untouched. Because the CLI's GitHub handler checks out the PR
head mid-run and every provider/stall/ladder retry starts a NEW CLI process
on that tree, the `Run opencode` step also re-runs the same sanitizer
before every attempt (review F5). The four PR-head arms restore the
composite from `${GITHUB_SHA}` (the default-branch tip on `issue_comment`
wake-ups), so the guard is trusted code; after this PR merges, every later
PR's review/test/per-OS/eval runs get it. The Maintainer inline arm is not
exposed at bootstrap because its pre-agent checkout is the trusted default
branch (the CLI's PR-head checkout happens after plugin initialization),
but its retries are new processes on the PR-head tree, so it runs the same
per-attempt sanitizer in its retry loop.

R31 now pins the guard's exact name, `shell: bash`, unconditional shape,
position ahead of the CLI step, every load-bearing marker, and the entire
normalized guard body by SHA-256; it mutation-self-tests a removed guard, a
gated guard, an interpreter swap, a move after the CLI step, a
working-directory override, an inserted guard line, and each marker's
removal; it statically pins the sanitizer definition and the per-attempt
call in both retry loops (the composite `Run opencode` body and the
Maintainer inline body); and it executes the real extracted body under
`bash --noprofile --norc -eo pipefail` against tracked, untracked,
symlinked, clean, and failed-enumeration git fixtures. Controls prove the
skip-worktree status assertion, the symlink fixture, and the
failed-enumeration fail-closed branch are load-bearing (a body without the
marking leaves a visible deletion; a naive removal through the symlink
destroys the target; a swallowed enumeration failure removes the
directories unprotected).

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
  channel is the separate 1.19.5 import-time class recorded above: the
  loader canary plus the pre-CLI removal close it on the four PR-head arms.

Remaining verification gap: the Owner's ask also covers a canary plugin in
a scratch PR-comment session, the Maintainer arm, and the `pull_request`
and `workflow_dispatch` wake paths. Those were not exercised live this
round (a scratch PR cannot be pushed from this session: the PAT-backed
runner step owns the push, and the canary session must be triggered on a
disposable PR). The PR therefore stays `Refs #831`, not `Closes #831`,
until that evidence or an explicit Owner waiver is recorded. The extracted
wake-path mapping, the loader canary, and the pre-CLI guard now cover the
class in code; the remaining gap is the live scratch-session evidence.

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
- T1 (blocking, Tester round): CLI 1.19.5 still imports
  `.opencode/plugin(s)` modules at bootstrap under the opt-out. Reproduced
  locally, closed by the vendored runner's pre-CLI removal guard, and the
  claim is corrected in `AGENTS.md`, `LAB.md`, the decision note, the R31
  wording, the arm env comments, and the Maintainer envelope. R31 pins the
  guard statically and functionally.

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
  `ideate.yml`, `opencode-recover.yml`: opt-out plus the exact grant; the
  env comments now scope the opt-out to config/instructions and name the
  pre-CLI plugin-directory removal.
- `.github/scripts/silent-stall-audit.sh`: R31 requires the pair on every
  comment-triggered agent step and on the Maintainer inline arm, with
  remove/re-enable/weaken mutation self-tests per arm; the same rule pins
  the pre-CLI plugin guard (exact name, `shell: bash`, unconditional shape,
  position ahead of the CLI step, every load-bearing marker) with
  removed/gated/interpreter/moved/marker mutation self-tests and functional
  tracked/untracked/symlinked/clean fixtures plus load-bearing controls;
  R26's manifest (regenerated for the envelope edit) and the R28
  referenced-step env pin were updated in sync.
- `.github/actions/opencode-run/action.yml`: the pre-CLI project-plugin
  sanitizer (symlink-safe removal, skip-worktree marking before deletion,
  loud marking failure) plus the corrected header scope note.
- `AGENTS.md`, `LAB.md`, the decision note, and the 15 arm comments: the
  opt-out claim corrected to config/instructions only, with the 1.19.5
  import-time plugin channel and the sanitizer documented.
- Review round: the `maintainer.yml` #831 comment now names the PR head
  branch (or fork head branch), `LAB.md` gains the complete wake-path
  sentence (three PR-triggered events, schedule/workflow_dispatch never
  check out a PR), and this note gains the live evidence, ledger, and
  skills sections.

## Verification

- All modified workflow files and the composite action parse with a strict
  duplicate-key-rejecting loader (21 files).
- A structural enumeration across all 20 workflow files finds 21 agent
  steps (20 composite-action steps plus the Maintainer inline arm), and all
  21 carry the exact opt-out plus grant.
- The installed 1.19.5 binary was exercised twice with the mock provider:
  with the opt-out, `.opencode/plugin/*.js` and `.opencode/plugins/*.js`
  both imported (sentinel lines), `.opencode/tool/*.js` and a
  `.opencode/plugin.js` file did not, and removing the two plugin
  directories closed the channel (no sentinel, exit 0). skip-worktree was
  verified to hide the deletion from `git status --porcelain` (it does not
  block a later checkout restore, which is not the import window).
- The extracted guard body was executed under
  `bash --noprofile --norc -eo pipefail` against tracked, untracked,
  symlinked, and clean fixture repositories: both plugin directories are
  removed, tracked paths carry the `S` skip-worktree bit, `git status`
  stays clean, unrelated files survive, the symlink target survives, and
  the controls (no marking; naive symlink-following removal) fail as
  expected.
- `timeout 1800 env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh`
  on the rebased head: 34 passed, 0 failed, exit 0. The first pre-rebase
  run caught the stale R28 `AGENT_ENV` pin; the pin now carries the pair.
- Timing note: the four PR-head arms restore the composite from
  `${GITHUB_SHA}` (the default-branch tip on `issue_comment` wake-ups), so
  the guard protects PRs after this PR merges; this PR's own review/test
  runs use the pre-merge main copy, and the branch carries no plugin
  directory, so there is nothing for that copy to import.
- Diff hygiene: no em dash or `Co-authored-by` additions; every commit
  subject starts with `lab:`; the working tree holds only the intended
  edits.

## Review round fixes (F5-F8)

- F5 (blocking): the CLI's GitHub handler checks out the PR head mid-run,
  and every provider/stall/ladder retry starts a NEW CLI process on that
  tree. The first-step guard therefore covered only attempt 1. The same
  sanitizer is now defined in the composite `Run opencode` body and in the
  Maintainer inline `Run Maintainer agent` body and is called as the FIRST
  statement of every attempt (inside `while :; do`, covering both the FIFO
  and degraded no-mkfifo capture shapes). The definition is loaded from the
  trusted step script before the first attempt, so the PR-head checkout can
  never replace it with mutable workspace code.
- F6 (blocking): rebased onto `origin/main`
  `22d6c92fefd406057c3a6ce28a24e5a2b9d1951d`; the one conflict in
  `.github/scripts/silent-stall-audit.sh` was resolved to keep the #831 R31
  changes, and the branch is no longer behind.
- F7 (important): `mark_skip_worktree` now fails closed when
  `git ls-files` itself fails: it prints a canonical `::error::`, removes
  the temporary file, and exits nonzero before any plugin directory is
  removed. A shimmed-git fixture proves the guard exits nonzero, emits the
  message, and leaves the plugin directory in place.
- F8 (important): R31 now bans a step-level `working-directory`, pins the
  entire normalized first-step guard body by SHA-256, mutation-self-tests
  EVERY marker in `PLUGIN_GUARD_MARKERS` (10 now, including
  `rm -f -- .opencode`, `git ls-files -z -- "$1"`, and the fail-closed
  messages), adds an inserted-line mutation, SHA-pins both per-attempt
  sanitizer copies (composite and Maintainer inline), statically pins the
  per-attempt call as the first statement of the attempt in both run
  bodies, and mutation-self-tests a removed call, a gated call, a moved
  call, and a removed definition on both arms.

## Delegation ledger (review round)

- general (full R1-R34 audit on the rebased head): 34 passed, 0 failed,
  exit 0.
- explore (static review of the new pins): confirmed both per-attempt
  SHA-256 values, the first-attempt call shape, and the working-directory
  ban bind the shipped bodies.
- Primary verified itself: the rebase ancestry, the R31 hash outputs, the
  R15/R26 regenerated pins, and the clean-tree diff.

## Skills (review round)

Loaded `customize-opencode`: the per-attempt sanitizer stays on the
supported env/permission surface (`OPENCODE_DISABLE_PROJECT_CONFIG` plus
`OPENCODE_PERMISSION`), and no project config file was added or changed.

## Verification (review round)

- `timeout 1800 env -u LAB_RUN_NONCE bash .github/scripts/silent-stall-audit.sh`
  on the rebased head: 34 passed, 0 failed, exit 0.
- The failed-enumeration fixture executes the real guard body with a
  PATH-shimmed `git` whose `ls-files` exits 1 and asserts nonzero exit,
  the canonical message, and the untouched plugin directory; the SHA pins
  and every mutation self-test (including a `/tmp` working-directory and an
  inserted guard line) fail as expected when mutated.
- Branch ancestry: `git merge-base --is-ancestor origin/main HEAD` holds.
