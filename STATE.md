# STATE

Last updated: 2026-11-02T11:51Z by run 41439365883. Wake: a duplicate `/oc maintainer` wake on #788 seconds behind the 11:45Z intake; the previous run's lab repair completed during the wake and force-updated the branch to the clean rebased head `012536c8`.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 2026-11-02T11:46-11:51Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged since the #806 rebase merge. Tags `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. Pages production `41439395078` SUCCESS on `97bf24bf` at 11:46:10Z. Trigger allowlist exact 19/19; zero held `action_required` runs; no stray `opencode/schedule-*` / `opencode/dispatch-*` branches; no failed/timed-out run in the recent window. Wall tally today: nine, unchanged (last sample #804 review retry 1 `41423414243` at 10:32:56Z, already on #70).
- **#788** (maze-chase, host PR for #786) head **`012536c8`**, `MERGEABLE`, 17 files, no `.github/**`. The lab repair `41439324262` completed success at 11:48:59Z and force-updated the branch `40fa1586` -> `012536c8` at 11:48:53Z. The new head is the tester-approved `87cfa82c` content rebased onto `main` `97bf24bf`: the diff vs main is exactly the 17 harness/docs/progress files, all 17 files are byte-identical to `87cfa82c`, `.github/actions/opencode-run/action.yml` is gone, and the merge base is `97bf24bf`. The red-looking `non-fast-forward` bot comment `6576374083` at 11:48:45Z was the agent's plain-push attempt; the PAT step then forced the update (`+ 40fa1586...012536c8 (forced update)`). The round-8 review (`9a22e75c`) and Tester (`87cfa82c`) approvals are head-stale by construction after the rewrite. The lab forward posted `/oc review` at 11:48:54Z; review run **`41439765900` is pending on `012536c8`**. **Do not dispatch `test-linux`, `test-macos`, or `eval` until a new Tester approval binds the settled head.**
- **#807** (tester-arm vendored-runner auto-commit root cause, filed by the previous run) created 11:45:37Z; its `create_issue` self-dispatch maintainer run **`41439326770` is in progress** and owns the triage. No duplicate lab dispatch from this run; the fix stays queued behind the delivery chain.
- **#799** (setup.sh clone URL) lab run **`41439335552` is in progress** since 11:45:43Z.
- **#804** (per-OS trailer/scope lab PR) head `9222df1e`, `Mergeable=CONFLICTING`/`DIRTY`; review retry 2 **`41429758237` is live** since 10:33:31Z on `9222df1e` (budget 2/3, one auto-retry left). The rebase onto `97bf24bf` (the `docs/index.html` conflict) stays queued behind the verdict.
- **#745** (owner-PAT env PR) parked at `7a04fa4a`, `CONFLICTING`/`DIRTY`.
- **Open issues: 20** (`42 70 582 655 657 659 661 677 678 683 742 773 774 775 786 792 798 799 803 807`). **Open PRs: 3** (#804, #788, #745).
- **Schedules**: curator 04:57Z, auditor 04:54Z, recover 01:47Z green on this survey's view.
- **Workspace provenance**: the workflow checked out the trusted default branch `97bf24bf`; the CLI session bootstrap moved the working tree to the event's PR head. The staged Maintainer prompt is the trusted default-branch copy and remains authoritative; `.maintainer/` is gitignored and harness-materialized.

## The #788 chain after the repair

1. Lab stripped the out-of-lane commit by rebasing `87cfa82c` onto `97bf24bf` -> `012536c8` (done, verified).
2. Review round 9 on `012536c8` (pending `41439765900`).
3. On review approval the workflow forwards `/oc test`; the Tester approves the settled head.
4. Then `test-linux` + `test-macos` on that head (the macOS row is the delegated acceptance; Linux re-binds after the rewrite).
5. Binding `eval` on the settled head; on `approve-eval` verify the owner-authored marker is head-bound, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept) and close #786 with the native evidence. The PR uses `Refs #786`, so the merge itself does not close it.

## The #804 / #798 lane

- #804 head `9222df1e` `CONFLICTING`/`DIRTY` after #806; review retry 2 `41429758237` live on the exact head. On `lab`, the review workflow posts its own lab trigger; the lab pass must combine the findings with the rebase onto `97bf24bf`. On approval, dispatch `lab` for the rebase, then a fresh review on the rebased head. Never `fix`/`continue` on this workflow-touching PR.
- #798 is the open schema issue behind #804 (per-OS tester auto-commits). #807 is the related but distinct main-tester-arm root cause from the #788 incident.

## The serialized infra queue

1. #788 review -> Tester -> native rows -> binding eval -> merge.
2. #799 lab (live).
3. #807 main-tester-arm runner auto-commit fix (triage in flight; dispatch `lab` after the delivery lane if the triage does not own it).
4. #803 (lifetime retry budgets), then #745 (owner-PAT env PR).
5. #792's follow-ups wait behind #788; #773/#774/#775 parked.
6. #700 / #796 / #755 are Owner-triage queued; do not dispatch lanes into them.

## Loose ends board

1. **#788**: read review `41439765900`; then the chain above. Keep #786 open until the merge and close it with the native evidence.
2. **#807**: confirm the `41439326770` triage outcome and that its lab lane is scheduled; if not, dispatch `{"action":"lab","issue":807}` once the #788 review is running.
3. **#804**: read retry 2; if it dies, retry 3 auto-posts; if that dies the gate is red and needs a manual fresh dispatch.
4. **#799 / #803 / #745**: serialized as above.
5. **Provider wall**: per-egress-IP free quota; recovery is a fresh runner; `retry-after` is diagnostic only. Do not advance the model ladder on the wall class.
6. **Lab push noise**: a `non-fast-forward` line from a lab repair means the agent's plain push was rejected and the PAT step then force-updated; verify the remote head and the file content before treating it as a failure. This run proved that for #788.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- `create_issue` bodies are passed via `gh issue create --body`; the handler self-dispatches triage for the new number; dedupe is by normalized title only (paraphrases are not matched).
- Memory: output `.maintainer/log-entry.md` must be the full current `logs/2026-11-02.md` with today's entry appended (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict. A head rewrite stales every earlier approval by construction.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **Read review `41439765900` on `012536c8`.** On approval the workflow forwards `/oc test`; after the Tester approves, dispatch `test-linux` plus `test-macos` on the settled head, then the binding eval, then merge with the branch kept and close #786 with the native evidence. On a `fix` verdict the review workflow posts its own `/oc fix`; this head is harness-only, so `fix` is allowed.
2. **Read the #807 triage `41439326770`.** If it did not dispatch a lab lane, dispatch `{"action":"lab","issue":807}` once the #788 review is running and the wall is clear.
3. **Read #804 review retry 2.** On `lab`, ensure the pass combines the findings with the rebase; on approval, dispatch `lab` for the rebase then a fresh review.
4. Confirm #799's lab lands; read its outcome before #803.
5. Keep #745 parked; keep #700/#796/#755 out of the lane until the Owner triages.
6. On any provider-wall death, note it and let the fresh-runner retry lane take it; do not advance the model ladder on the wall class.

## Open questions

1. Does review round 9 approve `012536c8` cleanly, so the Tester and the delegated macOS row can finally bind the repaired head?
2. Does the #807 triage dispatch its lab lane without duplicating the queued infra work, and does the fix land before another project tester run repeats the auto-commit class?
3. Does #804 review retry 2 return a verdict before the wall, and does a lab pass combine the fixes with the `docs/index.html` rebase cleanly?
4. Does the wall clear enough for the #788 eval and the #799/#803 queue to run today?

- Hephaestus, the Maintainer
