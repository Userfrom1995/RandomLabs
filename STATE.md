# STATE

Last updated: 2026-11-02T11:51Z by run 41439326770. Wake: workflow_dispatch self-triage of the bot-created infra issue #807 (main Tester arm auto-commit leak); the #788 repair landed at `012536c8` and a fresh review is live on it.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 2026-11-02T11:46-11:51Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged since the #806 rebase merge. Tags `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. Pages production `41439395078` SUCCESS on `97bf24bf` (11:46:10Z; the earlier `41439388349` was a superseded dispatch). Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. The newest 60 runs contain no genuine failure or timeout: the only reds are expected maintainer concurrency supersedes and one cancelled Pages dispatch immediately superseded by the success. Wall tally today: nine (last sample 10:32:56Z); no new wall death this run.
- **#788** (maze-chase, host PR for #786) head `012536c86d68e32462891f39794824484fa1a9f5`, `Mergeable=MERGEABLE`, `mergeStateStatus=UNSTABLE`, 17 files, all under `maze-chase/` plus `progress/786-harness-determinism.md`. The lab repair run `41439324262` completed SUCCESS at 11:48:58Z: it rebased the branch onto `main` `97bf24bf` and dropped the stray `40fa1586` auto-commit. The PR's own diff is exactly the intended 17 harness/docs/progress files, its `maze-chase/` and `progress/` content is identical to the Tester-approved `87cfa82c`, and it contains no `.github` paths. The lab session's first push attempt was rejected non-fast-forward (raw stderr is bot comment `6576374083` at 11:48:45Z); the PAT-backed push step then landed the head. The lab forwarded `/oc review` at 11:48:54Z and review run `41439765900` is pending on `012536c8`. The Tester approval binds the content-identical `87cfa82c` (marker `6576169748`), so a fresh Tester pass on `012536c8` is still required before the native rows and binding eval. No eval marker exists.
- **#807** (new infra, created 11:45:37Z by my previous run) triaged this run: `lab` dispatched with the `opencode-test.yml` fix scope (restore the runner from the PR head or stage it outside the workspace, hardcoded clean-tree guard against `.github/**`, audit of the other composite arms, and a regression that an older-runner branch leaves the PR diff free of `.github` paths). Distinct from #798/#804 (per-OS arm).
- **#804** (harness determinism, host PR for #798) head `9222df1e`, `Mergeable=CONFLICTING`/`DIRTY`; review retry 2 run `41429758237` live since 10:33:31Z (about 78 minutes at survey; retry budget 2/3, one auto-retry left).
- **#799** lab run `41439335552` in progress since 11:45:45Z (setup.sh clone URL).
- **#745** parked at `7a04fa4a`, `CONFLICTING`/`DIRTY`.
- **Open issues: 20** (`42 70 582 655 657 659 661 677 678 683 742 773 774 775 786 792 798 799 803 807`). **Open PRs: 3** (#804, #788, #745).
- **Benign wake noise**: `opencode-pr-trigger` posted `/oc maintainer` on #788 at 11:45:55, 11:46:02, and 11:49:02 (PR-event wakes); the queued skip-only lab/maintainer runs are absorbed by the queue design and need no action.
- **Workspace provenance**: the workflow checked out the trusted default branch `97bf24bf`; the CLI session bootstrap moved the working tree to the PR head for this comment-triggered session. The staged Maintainer prompt is the trusted default-branch copy and remains authoritative; `.maintainer/` is gitignored and harness-materialized.

## The #788 chain after the repair

1. Fresh review on `012536c8` (run `41439765900`); on approval the workflow forwards `/oc test`.
2. Tester re-approves the settled head (the old marker binds the content-identical `87cfa82c`, not this head).
3. `test-linux` plus `test-macos` bind the settled head; macOS is the remaining native acceptance row.
4. Binding `eval` on the settled head; on `approve-eval`, verify the owner-authored marker is head-bound, newer than the Tester marker, and has no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept) with `Refs #786`, and close #786 with the native evidence.

## The serialized infra queue

1. #788 repair (done this run: `012536c8`; review live).
2. #799 (in flight).
3. #807 (dispatched this run): main tester-arm auto-commit fix.
4. #803 (lifetime retry budgets; rendered and tested, not yet fixed).
5. #745 (owner-PAT env PR) after the queue; parked CONFLICTING at `7a04fa4a`.
6. #792's follow-ups wait behind #788; #773/#774/#775 parked.
7. #700 / #796 / #755 are Owner-triage queued; do not dispatch lanes into them.

## Loose ends board

1. **#807**: read the lab outcome; ensure the fix lands before another project tester run repeats the auto-commit class.
2. **#788**: read review `41439765900`; then the chain above. Keep #786 open until the merge.
3. **#804**: read retry 2; if it dies, retry 3 auto-posts (budget 3/3); if that dies the gate is red and needs a manual fresh dispatch.
4. **#799 / #803 / #745**: serialized as above.
5. **Provider wall**: per-egress-IP free quota; recovery is a fresh runner; `retry-after` is diagnostic only. Do not advance the model ladder on the wall class.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- `create_issue` bodies are passed via `gh issue create --body`; the handler self-dispatches triage for the new number; dedupe is by normalized title only (paraphrases are not matched).
- Memory: output `.maintainer/log-entry.md` must be the full current `logs/2026-11-02.md` with today's entry appended (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict; #788 has no eval marker. The tester marker itself is head-unbound (a known #619/#629 residual), which is why the repaired head needs a fresh Tester pass.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read #788 review `41439765900`. On approval, the workflow forwards `/oc test`; do not duplicate. On `lab`/`fix`, the workflow routes it; never `fix`/`continue` an infra-touching PR.
2. Read the #807 lab outcome; confirm the fix PR is opened with `Refs #807` and handed to review.
3. Read the #799 lab outcome; then queue #803.
4. Read #804 review retry 2. On `lab`, ensure the pass combines the findings with the rebase onto `97bf24bf`; on approval, dispatch `lab` for the rebase then a fresh review on the rebased head.
5. Keep #745 parked; keep #700/#796/#755 out of the lane until the Owner triages. Watch the post-merge Pages lane and the allowlist after any new workflow lands.
6. On any provider-wall death, note it and let the fresh-runner retry lane take it; do not advance the model ladder on the wall class.

## Open questions

1. Does the fresh review approve `012536c8` so the Tester can re-approve the repaired head?
2. Does the #807 fix land before another project tester run repeats the auto-commit class?
3. Does #804 retry 2 return a verdict before the wall, and does its rebase combine cleanly with the findings?
4. Does #799 land and unblock #803?

- Hephaestus, the Maintainer
