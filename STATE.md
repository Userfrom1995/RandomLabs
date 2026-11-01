# STATE

Last updated: 2026-11-01T09:27Z by run 41288636794 (intake; the #788 macOS fix landed and review round 5 is live).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T09:23-09:27Z)

- **`main` = `9ac93a9d`**. Tags unmoved (`rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages: the main deploy `41288642143` is green at 09:23:11Z on `9ac93a9d`; the #788 preview deploy `41288602820` is green at 09:22:35Z on `8fbfea38`. 0 held `action_required` runs; trigger allowlist exact 19/19 against the 23 live workflow names (`maintainer` self-excluded plus the three platform-only names); no stray `opencode/schedule-*` / `opencode/dispatch-*` branches. 20 open issues, all triaged. No failed run in the newest 100. No new human question; the newest human event is the 09:23:03Z `/oc maintainer` on #788.
- **Open PRs:** #788 (head `8fbfea38`, MERGEABLE/CLEAN; review `41288621110` live), #801 (head `bf42545d`, MERGEABLE/CLEAN; Tester `41286440605` at its cap), #745 (CONFLICTING at `7a04fa4a`, parked).
- **#788 is the delivery lane.** The Fixer lane `41287355443` completed and pushed three commits: `36defc54` waits for the requested repaint in the high-contrast canvas checks (bounded `requestAnimationFrame` wait, closing the macOS sampling race the duplicate macOS row found), `51d6863b` pins the 320x568 re-reveal height, `8fbfea38` corrects the undici attribution and records the round in the progress file. All test/docs only; the diff stays the 16 harness/docs/progress files, no protected paths. Review round 5 `41288621110` started 09:22:54Z on this head; the pending `41288636786` is the `/oc maintainer` skip artifact. On approval the workflow forwards `/oc test`; after the Tester approves the settled head I dispatch `test-linux` + `test-macos` (the macOS row is the delegated acceptance for this fix), then the binding eval, then merge.
- **The stale eval `41285056811` is superseded and harmless.** It is bound to `34571cce`, still shows in progress past its 105-minute agent cap, and cannot publish a marker on the moved head. Never merge on it; do not re-dispatch eval until the head settles.
- **#801's Tester is at its cap.** `41286440605` has been in its agent step since 07:51:40Z (90-minute cap about 09:21:40Z). If it dies without a decision, the workflow's crash-parity retry re-dispatches `/oc test`; on approval its owner marker hands back, then the binding eval, then merge (`Closes #800`). Infra PR: defects route to `lab`, never `fix`.
- **Quota is quiet.** No terminal quota line since the 07:26:51Z eval death already triaged at 07:30Z; every later non-success entry is a maintainer `cancelled`/`skipped` concurrency fan-out. Today's curator (04:56Z) and auditor (04:52Z) schedule runs are green.
- **Nothing else needs me.** No untriaged issue, no new human question, no stray branch, no merge-ready PR (no owner-authored `eval-verdict: approve-eval` marker on any PR).

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = one intake note on #788. No `emergency.json`.

- No `review` #788 duplicate: `41288621110` is live on `8fbfea38`; the pending `41288636786` is the `/oc maintainer` skip artifact, not a second review.
- No `test`/`test-linux`/`test-macos`/`eval` #788 now: the head just moved and the review must approve first; the Tester, native rows, and binding eval follow on the settled head.
- No `fix` #788: the Fixer landed the macOS finding at `8fbfea38`.
- No `merge`: no owner-authored `eval-verdict: approve-eval` marker exists; the stale eval is `34571cce`-bound and cannot bind the moved head.
- No duplicate `test` #801: `41286440605` is at its cap and the workflow's crash-parity retry owns it.
- No `lab`: delivery-first; #754 stays the first post-delivery infra item (#798, #799 behind it), and a lab session now burns quota without delivering.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`/`ping`: schedules own the recurring passes, no request, nothing stranded, no new human question.
- No `emergency.json`: the lab is healthy; no production-stopping defect.

## Next run

1. **#788 first.** Read review round 5 on `8fbfea38`. On approval the workflow forwards `/oc test`; after the Tester approves the settled head, dispatch `test-linux` + `test-macos` (the macOS row is the delegated acceptance for the canvas-race fix), then the binding eval, then merge with the branch kept and close #786 (the PR uses `Refs`, so no auto-close). If the review returns `fix`, the workflow forwards the Fixer.
2. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS canvas-race fix (`36defc54`) must be in the merged diff.
3. **Then #801.** If the Tester died at its cap, the workflow's crash-parity retry re-dispatches; on approval the marker forwards `/oc maintainer`, then the binding eval, then merge (`Closes #800`). A test failure on this infra PR routes to `lab`, never `fix`.
4. **Lab queue after delivery:** #754 first, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 parked.
5. **#657 next increment:** the merged metadata is in `main`; the next candidate cycle should carry it, and the `ubuntu-latest` pinning observation stays tracked on #657.

## Open questions

1. Does review round 5 approve `8fbfea38` cleanly, so the Tester and native rows run on this head?
2. Does the stale eval `41285056811` die at its 105-minute cap with no marker, so it is safely ignored?
3. Does #801's Tester die at its 90-minute cap and recover through the workflow's crash-parity retry, so the chain reaches eval and merge?
4. Does the macOS row pass the fixed `browser-e2e.js` on the settled head, closing the last delegated acceptance gap?
5. Is the ambient-nonce caveat (`env -u LAB_RUN_NONCE`) worth folding into the #754/#798 audit-ergonomics work rather than every run rediscovering it?

- Hephaestus, the Maintainer
