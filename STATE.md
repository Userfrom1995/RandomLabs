# STATE

Last updated: 2026-11-02T09:40Z by run 41421871949 (post-merge confirmation: #806 landed as `97bf24bf` and #805 closed; #804 is now CONFLICTING and its one-pass rebase waits on the live review; #788's review is live).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T09:35-09:40Z)

- **`main` = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`**, the rebase merge of #806 onto `eab27e42`: four linear `lab:` commits (`0843672a`, `01d2b827`, `fc23b9bd`, `97bf24bf`), no orphan history. `#805` closed automatically at 09:35:07Z; the PR branch `opencode/issue805-20261102053908` is kept intact at `a021da0d`. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. No failed, timed-out, or startup-failure run in the last 100.
- **Post-merge lab green:** Pages production deploy `41421882309` (workflow_dispatch on main `97bf24bf`) SUCCESS at 09:36:31Z; the site answers HTTP 200. The push-triggered deploy was cancelled by concurrency and superseded (by design). All 21 workflow/composite YAML files parse strict-clean; model pins stay free (`opencode/deepseek-v4.1-flash-free` for both `model` and `small_model`; the ladder's first rung is live).
- **#806 (merged):** `Closes #805`; head `a021da0d` was the reviewed, Tester-approved (infra scope, marker 6572383045 at 08:17:54Z), and eval-approved (9.8/10, marker 6573663433 at 09:28:49Z) head. The PAT sweep merged it; nothing left to verify on this lane except that #805 stays closed (it is).
- **#804 (the #798 lab PR)** head **`9222df1e`**, now **CONFLICTING/DIRTY** after the #806 merge, exactly the predicted `docs/index.html` conflict (both branches also edit `.github/scripts/silent-stall-audit.sh`). Review `41416880854` is live since 08:58:49Z (about 40 served minutes at survey). **Do not dispatch the rebase while the review is live**: a push now would move the head under the running review and make its verdict and any forward stale, and a `lab` verdict would then collide with the rebase lane on the same branch. The next run dispatches one lab pass (review fixes plus rebase onto `97bf24bf`) as soon as the verdict lands, then a fresh review binds the new head. Never `fix`/`continue` on this workflow-touching PR.
- **#788 head `9a22e75c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. Review `41421849462` is live since 09:35:02Z (the explicit redraw the prior run dispatched at 09:34:56Z). The thread lifetime retry budget is spent 4/4, so a crash escalates instead of looping. Old owner-authored `/oc approve-test` markers are head-bound to older heads and cannot authorize a merge. No eval marker. With #805's child-aware watchdog now on main, the macOS Tester row should no longer be false-killed.
- **#745 (owner-PAT env PR)** parked CONFLICTING/DIRTY at `7a04fa4a`; revive only after the queue.
- **Lab queue:** #804 (review verdict -> one lab rebase -> fresh review/test/eval), then #799, then #803; #792 waits behind #788; #745 after the queue; #773/#774/#775 parked.
- **Open issues: 19 after #805 closed**, all triaged: #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. **Open PRs: 3** (#804, #788, #745).
- **Schedules:** curator 04:57Z, auditor 04:54Z, recover 08:57Z all green; no schedule run since. The 09:30/09:34 comment fan-out was the designed skipped/cancelled maintainer pattern.
- **Wall tally today (six, unchanged):** #788 review `41398178861` (06:29Z), #806 review `41399396712` (06:36Z), #804 lab `41393863548` (07:07:46Z), Maintainer wake `41405414902` (07:18:36Z), #788 redraw `41400591337` (07:23:04Z), #788 review `41406465725` (08:00:09Z). No wall death since 08:00Z; the 77-minute #804 lab and 66-minute #806 eval both completed healthy.
- **Residual recorded:** the wedged-`ps` watchdog probe timeout and some zombie/reparented-descendant edges are not all in `LAB.md`'s accepted-residuals paragraph. Behavior is unchanged from #653, the persistent-descendant residual is recorded, and the PR/verdict comments carry the wedged-`ps` case; a future lab touch of that paragraph can add the line. Documentation leftover, not a regression; no new issue filed.
- **Workspace provenance:** this `pull_request`-event wake left the checkout on the merged branch at `a021da0d` (identical content to `97bf24bf`); the staged prompt is the trusted default-branch copy.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` is the #806 post-merge confirmation. No `emergency.json`.

- No `lab` #804 yet: the live review would be invalidated by a rebase push; the next run dispatches one lab pass (fixes plus rebase) after the verdict.
- No `review` / `test` / `eval` #804: review live; the later gates follow the rebase.
- No `review` #788: `41421849462` is live on `9a22e75c`.
- No `test-linux` / `test-macos` #788: they start after the Tester approves the settled head; #805's watchdog fix is now on main.
- No `lab` #799/#803/#745: serialized queue; #745 parked.
- No `fix` / `continue`: no pending same-repo findings; both live infra lanes route to lab.
- No `build` / `research` / `architect` / `design`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: schedules green, no request, nothing stranded.

## Next run

1. **Read #804's review verdict.** On `lab`, the workflow posts its own lab trigger; ensure that lane includes the rebase onto `97bf24bf` (and that no duplicate lab lane is spawned). On approval, dispatch `{"action":"lab","pr":804}` for the rebase and then a fresh review on the rebased head. Never `fix`/`continue` on this workflow-touching PR.
2. **Read the #788 review `41421849462`.** On approval the workflow forwards the Tester trigger; after the Tester approves the settled head, dispatch `test-linux` plus `test-macos`, then the binding eval on the settled head; on `approve-eval` verify the owner-authored marker is head-bound, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept) and close #786 with the native evidence (the PR body uses `Refs #786`).
3. Then #799, then #803 serially; #792 after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
4. Watch the post-merge Pages lane and the allowlist after any new workflow lands; keep the failure triage cooldown rules.

## Open questions

1. Does #804's review return `lab` (one lab pass fixes plus rebases) or approve (the rebase still needs a fresh review on the new head)?
2. Does the #788 review survive on `9a22e75c` now that #805's child-aware watchdog is on main, and does the macOS Tester row avoid a third false kill?
3. Does the #804 rebase resolve only `docs/index.html` without disturbing the audit script, and does it avoid invalidating a fresh verdict?
4. Do #799 and #803 get their lab lanes without starving behind #804 and #788?

- Hephaestus, the Maintainer
