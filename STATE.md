# STATE

Last updated: 2026-11-01T09:12Z by run 41287537147 (schedule tick; both delivery lanes in flight).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T09:07-09:12Z)

- **`main` = `9ac93a9d`** (the #795 rebase merge). Tags unmoved (`rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages last deployed green at 07:20:12Z on `9ac93a9d`; the #801 preview deployed green at 07:19:19Z. 0 held `action_required` runs; trigger allowlist exact 19/19 against the 20 live workflow names (`maintainer` self-excluded, every other name present); no stray `opencode/schedule-*` / `opencode/dispatch-*` branches. 20 open issues, all triaged. No new human question since the 09:05:16Z owner `/oc fix` trigger on #788.
- **Open PRs:** #788 (head `34571cce`, MERGEABLE/CLEAN; Fixer `41287355443` live since 09:05:27Z on the macOS canvas-race finding), #801 (head `bf42545d`, MERGEABLE/CLEAN; Tester `41286440605` live since 07:51:28Z), #745 (CONFLICTING at `7a04fa4a`, parked).
- **#788's Fixer is the lane that matters.** `41287355443` is in its agent step on the 09:05:01Z macOS finding: unchanged `web/e2e/browser-e2e.js` hashes the canvas after the HUD label settles but before the next repaint, so the high-contrast assertion intermittently samples the previous frame and the new five-suite runner is about 30 percent red on macOS. On a successful fix push the workflow forwards `/oc review`; on a clean review it forwards `/oc test`, then I dispatch the native rows on the settled head, then the binding eval, then merge.
- **#788's stale eval `41285056811` is near its cap and harmless.** It has been in its agent step since 07:30:49Z (105-minute agent cap about 09:15:49Z under a 120-minute job). It is superseded by the newer macOS fix finding: even `approve-eval` cannot close the Tester gate, and a Fixer push stales its head binding. Do not merge on it; do not re-dispatch eval until the head settles.
- **The pending eval `41287355424` is a queue artifact** created 09:05:19Z by the `/oc fix: ...` comment; it sits behind the in-flight eval in the `opencode-eval-788` group and will skip at its job gate (body does not start with `/oc eval`). Not a dispatch.
- **#801's Tester is in flight** on the reviewer-approved `bf42545d` (90-minute agent cap about 09:21:40Z). Infra PR: read-only tester must prove `32 passed, 0 failed` dynamically, both new mutants load-bearing, and the #791 stdin/CR pins intact; then its owner marker hands back to me, then the binding eval, then merge (`Closes #800`). Defects route to `lab`, never `fix`.
- **Quota is quiet.** No terminal quota line since the 07:26:51Z eval death already triaged at 07:30Z; every later non-success entry is a maintainer `cancelled`/`skipped` concurrency fan-out. Today's curator (04:56Z) and auditor (04:52Z) schedule runs are green.
- **Nothing else needs me.** No untriaged issue, no new human question, no stray branch, no merge-ready PR (no `approve-eval` marker on any PR).

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` empty (the #788 intake note is two minutes old; another would be noise). No `emergency.json`.

- No `fix` #788 duplicate: `41287355443` is live on the macOS findings.
- No `eval` #788: the Fixer lane is live and the in-flight eval is superseded; the fresh binding eval belongs on the fixer-settled head after review and test.
- No `test`/`test-linux`/`test-macos` #788 now: the head will move with the Fixer; re-sequence after it settles.
- No duplicate `test` #801: `41286440605` is live on the approved head.
- No `review` #801 duplicate: the review approved at 07:51:13Z and the workflow forwarded the Tester.
- No merge: no `approve-eval` marker exists on any open PR.
- No `lab`: delivery-first; #754 stays the first post-delivery infra item (#798, #799 behind it), and a lab session now burns quota without delivering.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`/`ping`: schedules own the recurring passes, no request, nothing stranded, no new human question.
- No `emergency.json`: the lab is healthy; no production-stopping defect.

## Next run

1. **#788 first.** Read the Fixer outcome. If it pushed, the fix workflow forwards `/oc review`; read that review. On approval it forwards `/oc test`; after the Tester approves the settled head, dispatch `test-linux` + `test-macos`, then the binding eval, then merge with the branch kept and close #786 (the PR uses `Refs`, so no auto-close). If the Fixer crashed, its bounded auto-retry (3) owns it; failure triage wakes me at the cap.
2. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the marker is owner-authored, bound to the current head, newer than the Tester marker (06:17:38Z) and the latest eval trigger, and that no newer `/oc fix` finding is open. The macOS canvas-race fix must be in the merged diff. The stale eval's expected cap death (about 09:15:49Z) is not a signal to re-dispatch on the old head.
3. **Then #801.** Read the Tester verdict on `bf42545d` (cap about 09:21:40Z; a cap death falls to the workflow's crash-parity retry); on approval the marker forwards `/oc maintainer`, then the binding eval, then merge (`Closes #800`). A test failure on this infra PR routes to `lab`, never `fix`.
4. **Lab queue after delivery:** #754 first, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 remain parked.
5. **#657 next increment:** the merged metadata is in `main`; the next candidate cycle should carry it, and the `ubuntu-latest` pinning observation stays tracked on #657.

## Open questions

1. Does the Fixer land the bounded-wait fix in `browser-e2e.js` and push on its first attempt?
2. Does the superseded eval `41285056811` die at the 105-minute cap with no marker, so it is safely ignored on the old head?
3. Does #801's Tester approve `bf42545d` before its 90-minute cap, so the chain reaches eval and merge in one pass?
4. Is the ambient-nonce caveat (`env -u LAB_RUN_NONCE`) worth folding into the #754/#798 audit-ergonomics work rather than every run rediscovering it?

- Hephaestus, the Maintainer
