# STATE

Last updated: 2026-11-01T15:48Z by run 41321831412 (the #788 review probe `41319072315` died on the fourth quota wall; the #754 lab fix pushed `1480500a` on #802 and its review is queued).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T15:34-15:48Z)

- **`main` = `0e61decc`**, unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Zero held `action_required` runs. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names).
- **The only failure since 14:00Z** is the #788 review probe `41319072315`: about 11 minutes of real read-only work, then `FreeUsageLimitError` (HTTP 429) at 15:12:16Z, the #653 watchdog cut attempt 1 at 15:22:41Z, the same-model retry walled at 15:22:55Z, and the second window ended the run at 15:33:21Z with no decision file and no published verdict. The verify counted 4/4 attempts and red-ed. This is the fourth quota death on this head (11:22Z, 12:11Z, 13:52Z, 15:12Z).
- **#802 head moved to `1480500a`**, MERGEABLE/CLEAN. Lab Engineer run `41320131745` completed success at 15:41:45Z and pushed six commits (branch tip `1480500ab4e0281794c517f5d605fa31f6d655b7`); the 15:41:31Z wrapper App-token rejection is expected workflow-touching-branch noise and the PAT push landed the head. Head checks green (`trigger`, `comment`, GitGuardian; `deploy` skipped). The lab reports the six review findings fixed, both run scalars under the R33 ceiling, and the full audit 33/0.
  - The lab forward posted `/oc review` at 15:41:40Z. Real review run `41322516774` is pending in the `opencode-review-802` group; the skip-only `41322525912` (from the `/oc maintainer` comment) is pending behind it.
  - **Stale duplicate review `41318088124` is still in progress** on the old `a488dbd1` (since 15:13:39Z). Its verdict is not binding on `1480500a`; absorb any forwarded `/oc lab`, never trust it.
- **#788 head `d5ae6352`**, MERGEABLE/CLEAN, unchanged since the Fixer's 10:37:51Z push (17 files, `Refs #786`). No review verdict exists on this head. Checks green.
- **No eval verdict binds anything.** Only the stale `34571cce` rejection (09:30:22Z) on #788; no owner-authored `eval-verdict: approve-eval` marker. The Tester `06:17:38Z` approve and the round-5 review approval of `8fbfea38` (09:50:05Z) predate the later head moves.
- **Quota doctrine:** the #754 branch (pushed, not merged) defines the wall as a per-egress fast-fail whose recovery is a fresh run on a new runner, with `retry-after` diagnostic only. The live `main` runner still classifies the class as a stall, so each review wall still burns the stall window.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked. **Open issues: 19**, all deliberately parked or triaged; no untriaged issue and no new human request. Lab queue: #802 first, #798 second, #799 third. #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## Decisions this run

`.maintainer/decision.json` = one `ping` on #788 (quota status plus the next step). `.maintainer/comment.md` empty (a `workflow_run` run has no comment target). No `emergency.json`.

- No `review` #788: the failure ended 15:33:28Z, inside the 30-minute failure cooldown, and this is the fourth consecutive quota death on the head; the fresh head-bound probe belongs to the next run after ~16:03Z.
- No `review` #802: a real review is already queued on `1480500a` behind the stale duplicate; a dispatch would duplicate it.
- No `lab` #802: the lab just completed success and moved the head; the new head needs review, not another fix session.
- No `test` / `test-linux` / `test-macos` / `eval` on either PR: no settled head carries an approving review.
- No `fix`: #802 is the lab's lane; #788 has no code finding in the fix lane.
- No merge: #802 has no review/test/eval chain on `1480500a`; #788 has no review verdict and no fresh head-bound `approve-eval` marker.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: schedules own the recurring passes, no request, nothing stranded.

## Next run

1. **#788 after the cooldown:** from ~16:03Z dispatch `{"action": "review", "pr": 788, "head": "d5ae6352bbcce9148839e3fd562e9a09cae0565b"}` on a fresh runner. The #754 contract says a new runner may get a fresh bucket and `retry-after` is advisory; if it walls again, record the sample and wait a tick, never loop inside 30 minutes.
2. **#802 review on `1480500a`:** read `41322516774` when it runs; absorb the stale duplicate `41318088124` (not binding on the moved head). On approval the workflow posts `/oc test`; the Tester is read-only for infra; on `/oc approve-test` route the binding eval; merge only on a head-bound owner-authored `approve-eval` marker newer than the Tester marker and the latest eval trigger, with no newer fix or rejection; keep the branch and close #754.
3. **#788 delivery chain:** after a review verdict, the workflow posts `/oc test`; on Tester approval dispatch `test-linux` + `test-macos` on the settled head, then the binding eval, then merge with the branch kept and close #786 on the native evidence. Never merge on a `34571cce`-bound marker; the merged diff must include `36defc54`, `51d6863b`, and the round-5 fixes.
4. **The #788 PR body is still stale** (673 assertions, no macOS repaint or F1/F2 mention); the final Tester report may correct it, or a Fixer wording pass before merge (moves the head, re-binds the chain).
5. **Lab queue:** #802 first, then #798, then #799. #792 after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain.
6. **Pages:** `main` unchanged; the next main advance re-runs the hardcoded dispatch and the next run confirms it.

## Open questions

1. Does the queued #802 review on `1480500a` verify all six findings and the 33/0 audit, or send the branch back to lab?
2. Does the stale duplicate review `41318088124` forward a duplicate `/oc lab` on `a488dbd1`, and does that session converge on `1480500a`?
3. Does a fresh #788 review after the cooldown complete inside one runner bucket, or die on the wall again?
4. Does the #754 fast-fail land on `main` with the delivery chain, and does #754 close on merge?
5. Which lane corrects the stale #788 PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?

- Hephaestus, the Maintainer
