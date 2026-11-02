# STATE

Last updated: 2026-11-02T06:56Z by run 41400619169 (intake: the delayed #806 PR-open wake; the first #806 review died on the daily free-usage wall and its auto-retry `41401026522` is live; the #788 redraw review `41400591337` is live; #804's lab lane is live).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T06:33-06:56Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. Only failure in the newest 200 runs is the already-triaged #788 review `41398178861`; no timed-out or startup-failure run.
- **#806 (the #805 lab PR)** head `fb8a36e8`, MERGEABLE/CLEAN, 11 files, workflow-touching, `Closes #805`. The first review attempt `41399396712` ran from 06:21:42Z and was cut at 06:36:35Z by the provider's daily free-usage wall (`AI_APICallError: Free usage limit reached ...`, `FreeUsageLimitError`, HTTP 429, `retry-after` 65008s): no decision file, no report, the #754 fast-fail class, not a code finding. The review workflow posted `/oc review (auto-retry 1)` at 06:36:53Z and a fresh runner `41401026522` is live on the same head since 06:36:56Z. The earlier `UNSTABLE` was only the three held branch runs, cleared by the previous run's approve sweep (this wake is the released `opencode-pr-trigger`).
- **#788 head `9a22e75c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. The previous run's head-bound redraw posted `/oc review (head 9a22e75c)` at 06:32:48Z; review `41400591337` is live since 06:32:53Z (agent since 06:33:06Z). No verdict yet at 06:56Z. The Tester marker `6569023690` (04:24:56Z on `8723172c`) stays stale after the fix push; the chain restarts at review.
- **#804 (the #798 lab PR)** head `b794217d`, 2 commits, MERGEABLE/CLEAN, 9 files, workflow-touching. Lab run `41393863548` is LIVE since 05:24:43Z (150-minute cap, so it can run until about 07:54Z); no push yet.
- **Interlock:** #806 is based on `eab27e42` and was not rebased over #804; both edit `.github/scripts/silent-stall-audit.sh`, so whichever merges second must rebase.
- **Lab queue:** #804 live, #806 in review, then #799, then #803. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue. #792 waits behind #788. #773/#774/#775 parked.
- **Open issues: 20**, all triaged: #805, #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. **Open PRs: 4** (#806, #804, #788, #745).
- **Schedules:** curator `41391253241` (04:57Z), auditor `41390987022` (04:54Z) plus the 05:30Z daily report, recover `41374312993` (01:47Z) all green. No new owner request after the #806 wake; no untriaged issue.
- **Concurrency note:** the 06:36:53Z auto-retry comment spawned the usual skipped/cancelled maintainer fan-out; none is a real wake (`/oc review (auto-retry 1)` does not match the maintainer job gate).
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap can move the checkout to a PR head while the staged prompt stays trusted; #745 carries the `OPENCODE_DISABLE_PROJECT_CONFIG` fix for the maintainer arm.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #806 intake note. No `emergency.json`.

- No `review` #806: the auto-retry `41401026522` is live on the same head; a maintainer trigger would queue a duplicate.
- No `review` #788: the head-bound redraw `41400591337` is live.
- No `test` / `test-linux` / `test-macos` #806/#788: the review is the next gate; the review workflow forwards `/oc test` on approval, and the native rows follow the Tester's settled head.
- No `eval`: the binding eval must bind the Tester-settled head.
- No `fix` / `continue`: no findings are pending on a same-repo lane; #806/#804 are workflow-touching and route to `lab` if the review returns findings.
- No `lab` #804/#806: both lanes are live; no `lab` #799/#803/#745: serialized queue, #745 parked.
- No `build` / `research` / `architect` / `design`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: schedules green, no request, nothing stranded.
- No merge: no owner-authored `eval-verdict: approve-eval` marker exists for #788, and #804/#806 have no approve-test or eval marker.

## Next run

1. **Read the #806 auto-retry `41401026522` and the #788 redraw `41400591337`.** If either dies again on the daily wall, re-dispatch on a fresh runner and record it; if a third fresh runner dies on the wall, put the persistent-wall evidence on the lab-health board #70 for the Owner (provider-plan decision, #754). A non-wall death on #788 is the #803 lifetime-budget class: redraw head-bound.
2. **On #806 approval**, the workflow forwards `/oc test`; then the binding eval on the settled head; on `approve-eval` verify the owner-authored marker is head-bound, newer than the Tester marker and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`, branch kept) and close #805. Rebase over #804 if #804 lands first (shared audit script).
3. **On #788 approval**, the workflow forwards `/oc test`; after the Tester approves the settled head, dispatch `test-macos` (plus `test-linux` if the Tester's Linux evidence does not suffice), then the binding eval on the settled head; on `approve-eval` verify the owner-authored marker is head-bound, newer than the Tester marker and the latest eval trigger, with no newer fix/rejection, then merge and close #786 with the native evidence (the PR body uses `Refs #786`).
4. **Watch #804's lab run `41393863548`:** on push the review re-binds; then the Tester, the binding eval, and the PAT sweep.
5. Then #799, then #803, serially; #792 after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
6. **Curator/auditor:** both schedules are green today; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Do the two redrawn reviews (#788 and #806) get fresh egress buckets and finish, or does the wall persist across runners?
2. Does #806's child-aware accounting pass review without weakening the #653/#754 retry and fast-fail semantics, and does it unblock the macOS row?
3. Does #804's lab clear F1/F2 and pass the re-review?
4. Does #788's round-8 redraw approve `9a22e75c` in one round (the fix is test-only)?
5. Does #803 (lifetime retry budgets) get its lab lane after #799 without another gate dying first?

- Hephaestus, the Maintainer
