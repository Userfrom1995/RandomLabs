# STATE

Last updated: 2026-11-02T05:37Z by run 41394480606 (the owner `/oc maintainer` summon on #805: the Lab Engineer is dispatched on the #653 watchdog false positive while #804's lab lane and the #788 macOS row stay live).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T05:31-05:37Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged since the #802/#754 rebase merge. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names).
- **#788 head `8723172c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. The owner-authored Tester approval marker (`6569023690`) stands at 04:24:56Z; round-7 review approved `358d5c4b`; the only post-approval commit is the Tester's test-only `8723172c`. No `/oc fix` after the approval, no `eval-verdict` marker, no Quality Council rejection.
  - **The macOS row `41392351386` is LIVE** since 05:09:23Z (agent step since 05:09:39Z) on `8723172c`: the re-dispatch after row `41388720220` died on the #653 watchdog false positive during long output-redirected `browser-e2e` loops. No verdict yet; 150-minute job cap.
  - No `eval` is dispatched yet: the binding eval must bind the row-settled head, and a macOS test commit would stale it.
- **#804 (the #798 lab PR)** head `b794217d`, 2 commits, MERGEABLE/CLEAN, 9 files, workflow-touching. Review `41389927049` completed at 05:24:28Z with **`lab` (changes required)**: blocking F1 (the restore step's dirty delta is auto-committed and the guard drops the tester range) and F2 (strip rewrites the captured baseline, so the guard refuses in the incident state), plus F3-F9. The workflow posted `/oc lab` at 05:24:38Z; lab run `41393863548` is LIVE (agent since 05:24:52Z).
- **#805 (new, Auditor, 05:20:33Z)**: the #653 watchdog 600s no-output window cannot distinguish a dead provider stream from a live tool command whose output only reaches the log at completion; the macOS row `41388720220` lost both attempts and the first attempt's completed F1 (`TestRunLinuxTranscriptPaths` passes `--binary /bin/true`, absent on macOS). The Owner summoned `/oc maintainer` at 05:31:02Z; a concurrent tick (`41393860572`, woken by the `/oc lab` batch) triaged and queued it at 05:33:47Z, and this run dispatches the Lab Engineer now.
- **Lab queue:** #804 live (F1/F2), **#805 dispatched now** (parallel; rebase over #804 because both edit `.github/scripts/silent-stall-audit.sh`), then #799, then #803. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue. #792 waits behind #788. #773/#774/#775 parked.
- **Open issues: 20**, all triaged: #805, #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. #786 closes on #788's native evidence.
- **Curator** schedule `41391253241` completed SUCCESS at 05:20:44Z. **Auditor** schedule `41390987022` completed and posted the daily report at 05:30:04Z (opening #805). Both green; no manual re-dispatch.
- **Failures:** no failure/timed-out/startup-failure run in the newest window beyond the already-handled macOS row `41388720220`. No held `action_required` run.
- **Concurrency note:** the 05:24 `/oc lab` comment batch and the 05:31 owner wake overlapped; the single-slot maintainer design plus the keep-both memory publish (issue #647) make that safe. This run's memory base predates the concurrent tick's entry; the publish appends this delta without dropping it.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap can move the checkout to a PR head while the staged prompt stays trusted; the maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[{"action":"lab","issue":805,...}]`. `.maintainer/comment.md` = the #805 routing note. No `emergency.json`.

- `lab` #805: the durable fix belongs to the Lab Engineer. The Owner's direct summon lifts this out of the serialized queue; #804's lab lane continues in parallel and #805's branch rebases over it before review. The instruction carries the issue's durable direction (child-aware watchdog plus R15 fixtures, not a bare threshold raise).
- No `fix` #788: the macOS row is live on the current head; a fix push now would stale it. On a `fix` verdict the workflow forwards the Fixer; on a second watchdog kill the next run dispatches the Fixer from the run-log F1 evidence (no third row).
- No `eval` #788: the binding eval must bind the row-settled head.
- No `review` / `test` #804: the lab fix is live; the workflow re-binds review after the push.
- No `lab` #799/#803/#745: #804 stays first in the serialized queue; #805 pre-empts only because the Owner summoned on it and it actively burns acceptance rows.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: the schedules are green, no request, nothing stranded.

## Next run

1. **Read the macOS row `41392351386` on `8723172c`.** On `pass` with the head unmoved, dispatch `eval` #788 on that head; on `approve-eval` verify the owner-authored marker is head-bound, newer than `6569023690` and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`, branch kept) and close #786 with the native evidence. On `fix`, the workflow posts `/oc fix` and the head re-binds. A second watchdog kill on the same head is the infra class, not a retry signal: do not dispatch a third row; dispatch `fix` #788 from the run-log F1 evidence and let the #805 lab fix be the durable guard.
2. **Watch #804's lab fix `41393863548`:** on push the review re-binds; then the Tester, the binding eval, and the PAT sweep (fresh head-bound approve-test verdict plus a fresh head-bound eval marker). On new findings, `fix`; on infra, only `lab`.
3. **Watch #805's lab fix:** R15 must gain the live-child, no-child, and tool-timeout-above-idle fixtures and stay load-bearing; the branch bases on `main` and rebases over #804 before review.
4. Then #799, then #803, serially; #792 after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
5. **Curator/auditor:** both schedules are green today; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Does the macOS row survive the watchdog and return a full verdict on `8723172c`?
2. Does the Fixer make `TestRunLinuxTranscriptPaths` portable without weakening the assertion?
3. Does #805's child-aware accounting land without weakening the #653/#754 retry and fast-fail semantics?
4. Does #804's lab clear F1/F2 and pass the re-review?
5. Does the free-usage wall stay quiet through the two concurrent lab sessions plus the macOS row?

- Hephaestus, the Maintainer
