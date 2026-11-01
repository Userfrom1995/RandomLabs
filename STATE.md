# STATE

Last updated: 2026-11-01T09:40Z by run 41293847832 (failure triage: the #788 Tester `41290509212` died on a repeated provider stall with no decision file; a fresh Tester is dispatched on the unchanged `8fbfea38`).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T09:37-09:40Z)

- **`main` = `0e61decc`** (the #801 rebase merge; `b60c7b8c` R32 pins + two mutants, then `0e61decc` review-round decision note). Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`). 0 held `action_required` runs; trigger allowlist exact 19/19 against the 20 lab-authored workflow names (`maintainer` self-excluded; the three remaining live names are GitHub dynamic workflows: Dependabot Updates, Dependency Graph, pages-build-deployment); no stray `opencode/schedule-*` / `opencode/dispatch-*` branches; the only failure/timed_out/startup_failure in the newest 100 runs is the #788 Tester below.
- **Pages for `0e61decc` is green**: run `41292449406`, `deploy` job green at 09:17:43Z (`comment` job skipped as expected). No manual dispatch needed.
- **#801 is MERGED** at 09:11:47Z (`bf42545d` -> `0e61decc`, branch `opencode/lab-800-r32-peros-forwarder-pins` kept at `bf42545d`); **#800 is CLOSED**. The merge announcement posted at 09:16:58Z. Nothing further on #801.
- **#788 is the only delivery lane; head `8fbfea38` unchanged** (MERGEABLE/CLEAN, 16 files, all `maze-chase/` + `progress/`, zero workflow paths; the PR uses `Refs #786`, so nothing auto-closes). Review round 5 approved at 09:50:05Z and the review workflow forwarded the Tester at 09:50:07Z. **Tester run `41290509212` FAILED**: the agent step hit two 600-second silent provider stalls (attempt 1 aborted at 09:19:54Z, the same-model retry aborted at 09:36:04Z) and failed loudly; the fail-closed verify found no decision file, nothing was published or pushed, and the head is unchanged. No `FreeUsageLimitError` line appears in the log, so this is not the #754 quota shape. A fresh Tester is dispatched this run. The only eval verdict on the thread is the stale `34571cce` rejection (09:30:22Z, fix 9.5/10), superseded and never to be used for a merge. No owner-authored `eval-verdict: approve-eval` marker exists on any PR.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged. Lab queue: #754 first (FreeUsageLimitError classification, 18+ comments of evidence), #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #773/#774/#775 parked (the false-General class); #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Nothing else needs me.** No untriaged issue, no new human question after the 09:50:07Z Tester forward, no stray branch, no merge-ready PR.

## Decisions this run

`.maintainer/decision.json` = `[test #788, ping #788]`. `.maintainer/comment.md` empty (the run's `workflow_run` event has no comment target; the ping carries the note on #788). No `emergency.json`.

- `test` #788: the Tester crashed on a provider stall with no verdict, so a fresh Tester on the unchanged, reviewer-approved `8fbfea38` is the crash-parity retry. Dispatched at ~09:38Z; the 30-minute no-repeat window runs to ~10:08Z.
- `ping` #788: a plain bot note recording the stall and the retry (no trigger text in the prose), so the thread shows why the Tester re-runs.
- No `test-linux`/`test-macos`/`eval` #788: the Tester must settle this head first (it may push test commits); the native rows and the fresh eval follow on the settled head.
- No `fix` #788: the macOS finding is fixed at `8fbfea38`; the review's non-blocking notes and the stale PR body ride a later round on a settled head, and a push now would stale the Tester.
- No `lab`: delivery-first. The stall was provider-side (no quota line), #788 is the live lane, and the free-tier quota is shared per egress IP across concurrent sessions. #754 stays the first post-delivery infra item (#798, #799 behind it).
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`: schedules own the recurring passes (today's arms are green), no request, nothing stranded.
- No merge: no fresh owner-authored `eval-verdict: approve-eval` marker; #788's only eval verdict is the superseded rejection.
- No `emergency.json`: the lab is healthy; no production-stopping defect.

## Next run

1. **#788 first.** Read the fresh Tester verdict on `8fbfea38` (the trigger posted by this run). On approval of the settled head, dispatch `test-linux` + `test-macos` (the macOS row is the delegated acceptance for the canvas-race fix and the repaint wait), then the binding eval on the native-settled head, then merge with the branch kept and close #786 on the native evidence. If the Tester pushes test commits, every later lane re-binds to the moved head; if it returns fix, the workflow forwards the Fixer.
2. **If the fresh Tester stalls again:** do NOT loop a second fresh Tester inside the 30-minute window. Hold #788, dispatch `lab` on #754 (the burn/classification fix) and wait for a clean provider window; a repeat stall on the same head is a provider-class issue, not a code finding.
3. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS fix (`36defc54`) and the height pin (`51d6863b`) must be in the merged diff. Carry the stale PR body (673 assertions, no repaint-fix mention) until a Builder/Fixer pass or the Tester report corrects it.
4. **#801 is done** (merged `0e61decc`, #800 closed, branch kept, pages green). Do not re-dispatch lab/review/test against it.
5. **Lab queue after #788 settles:** #754 first, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain and keeps its `ubuntu-latest` pinning observation.
6. **Pages:** verified green for `0e61decc`; the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does the fresh Tester (after the two-stall death) approve `8fbfea38`, or push test commits that re-sequence the chain?
2. Does the fresh macOS row pass the fixed `browser-e2e.js` repaint wait on the settled head, closing the last delegated acceptance gap?
3. Does the fresh eval accept the settled head after round 5's non-blocking notes, or does another fix round land first?
4. Is the persistent provider-stall class (two stalls in one Tester run, no quota line) worth folding into the #754 work as a separate classification, or is the #653 watchdog already the right ceiling?
5. Does the deferred lab queue (#754/#798/#799) get a clean quota window once #788's native rows and eval settle?

- Hephaestus, the Maintainer
