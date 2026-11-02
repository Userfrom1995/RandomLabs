# STATE

Last updated: 2026-11-02T06:14Z by run 41398193031 (intake after the #788 fix push: the round-8 review is live on `9a22e75c`, and both lab lanes are working).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T06:10-06:14Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged since the #802/#754 rebase merge. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. No failure, timed-out, or startup-failure run in the newest 200. Pages green (`41398193083`, 06:09:48Z).
- **#788 head `9a22e75c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. The Fixer run `41397277655` completed success at 06:09Z and pushed one test-lane commit ("fixer: make the transcript-path regression portable", 06:06:32Z): `TestRunLinuxTranscriptPaths` no longer hardcodes `/bin/true` (absent on macOS) or relies on host GNU `sha256sum`; it creates portable `true`/`sha256sum` stubs on its own PATH and passes the stub binary by absolute path. The transcript-path assertion is unchanged; the only other change is `progress/786-harness-determinism.md`. I verified the commit diff.
  - The fix workflow forwarded `/oc review` at 06:09:37Z; **review `41398178861` is live on `9a22e75c`** (agent since 06:09:42Z). The Tester approval marker `6569023690` (04:24:56Z on `8723172c`) and the round-7 review approval are stale after the fix push; the chain restarts at review.
  - The previous macOS rows `41388720220` and `41392351386` were both killed by the #805 watchdog false positive (long silent output-redirected `browser-e2e` calls), not by code findings; the recovered `/bin/true` finding is the one `9a22e75c` fixes. No third row on the killed head.
  - Sequencing: review approval -> the workflow posts `/oc test` -> Tester approval -> native rows (`test-macos`, plus `test-linux` if the Tester's Linux evidence does not suffice) once #805's watchdog fix lands -> binding eval on the settled head -> merge and close #786 with the native evidence.
- **#804 (the #798 lab PR)** head `b794217d`, 2 commits, MERGEABLE/CLEAN, 9 files, workflow-touching. Review `41389927049` returned **`lab`**: blocking F1 (the restore step's dirty delta is auto-committed and the guard drops the tester range) and F2 (strip rewrites the captured baseline, so the guard refuses in the incident state), plus F3-F9. Lab run `41393863548` is LIVE (agent since 05:24:43Z; 150-minute cap).
- **#805 (Auditor, 05:20:33Z)**: the #653 watchdog false positive on long silent tool calls. The Owner summoned it at 05:31:02Z; Lab Engineer run `41395241489` is LIVE on it since 05:38:55Z (child-aware accounting plus R15 fixtures; rebases over #804 because both edit `.github/scripts/silent-stall-audit.sh`).
- **Lab queue:** #804 live, **#805 live** (parallel; will rebase over #804), then #799, then #803. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue. #792 waits behind #788. #773/#774/#775 parked.
- **Open issues: 20**, all triaged: #805, #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. **Open PRs: 3** (#804, #788, #745).
- **Curator** schedule `41391253241` completed SUCCESS at 04:57Z. **Auditor** schedule `41390987022` completed SUCCESS at 04:54Z and posted the daily report at 05:30Z (opening #805). **Recover** schedule `41374312993` SUCCESS at 01:47Z. No manual re-dispatch.
- **Concurrency note:** this run is the `/oc maintainer` wake at 06:09:45Z, seconds after the fix workflow's `/oc review`. The review lane is already live, so this run adds no trigger. The comment batch spawned many skipped comment-triggered runs; that is the designed fan-out, not a defect.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap moved this checkout to the #788 head `9a22e75c`; the staged prompt is trusted and stays authoritative, while the maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #788 intake note. No `emergency.json`.

- No `review` #788: the fix workflow already forwarded `/oc review` at 06:09:37Z and run `41398178861` is live on the new head; a second trigger would queue a duplicate.
- No `test` #788: the review is the next gate; the review workflow forwards `/oc test` on approval.
- No `test-linux` / `test-macos` #788: the Tester must first approve the settled head, and the macOS arm stays blocked by the #805 watchdog until that fix lands (no third row on the killed head).
- No `fix` #788: the macOS portability fix just landed; the review is the next gate.
- No `eval` #788: the binding eval must bind the Tester-settled head after the native rows.
- No `lab` #804/#805: both lanes are live; duplicates would collide on the audit script and the quota window.
- No `lab` #799/#803/#745: serialized queue; #745 parked.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: the schedules are green, no request, nothing stranded.
- No merge: no owner-authored `eval-verdict: approve-eval` marker exists for #788; #804 has no approve-test or eval marker.

## Next run

1. **Read the #788 round-8 review `41398178861` on `9a22e75c`.** On approval the workflow posts `/oc test`; on `fix` it forwards the Fixer. A review death needs an explicit head-bound redraw (the lifetime review auto-retry budget is spent, #803).
2. **After the Tester approves the settled head**, dispatch the native rows: `test-macos` (plus `test-linux` if the Tester's Linux evidence does not suffice) once #805's watchdog fix has landed, so the macOS arm is not fed into the same false positive. Then the binding eval on the settled head; on `approve-eval` verify the owner-authored marker is head-bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`, branch kept) and close #786 with the native evidence (the PR body uses `Refs #786`).
3. **Watch #804's lab fix `41393863548`:** on push the review re-binds; then the Tester, the binding eval, and the PAT sweep (fresh head-bound approve-test verdict plus a fresh head-bound eval marker). On new findings, `fix`; on infra, only `lab`.
4. **Watch #805's lab fix `41395241489`:** R15 must gain the live-child, no-child, and tool-timeout-above-idle fixtures and stay load-bearing; the branch rebases over #804 before review.
5. Then #799, then #803, serially; #792 after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
6. **Curator/auditor:** both schedules are green today; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Does the round-8 review approve `9a22e75c` in one round (the fix is test-only)?
2. Does the Tester approve the new head, and do the native rows pass once #805 lands?
3. Does #805's child-aware accounting land without weakening the #653/#754 retry and fast-fail semantics, and does it unblock the macOS row?
4. Does #804's lab clear F1/F2 and pass the re-review?
5. Does the free-usage wall stay quiet through the two lab sessions, the review, and the Tester?

- Hephaestus, the Maintainer
