# STATE

Last updated: 2026-11-02T05:58Z by run 41395797854 (the #788 salvage wake: the second macOS watchdog kill settled the row, and the first attempt's `/bin/true` finding is dispatched to the Fixer).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T05:45-05:58Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged since the #802/#754 rebase merge. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs. Pages green (`41392372027`).
- **#788 head `8723172c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. The owner-authored Tester marker (`6569023690`, 04:24:56Z) and the round-7 review approval (on `358d5c4b`) bind this head; the only post-approval commit is the Tester's test-only `8723172c`.
  - **The macOS row `41392351386` FAILED CLOSED at 05:44:52Z** (second watchdog kill; attempt 1 killed at 05:29:18Z, attempt 2 at 05:44:32Z, both on the #653 600s no-output false positive while the agent ran long output-redirected `browser-e2e` loops). The salvage step published only the signed skeleton; no verdict, head unmoved. This is the #805 infra class, not a code finding against #788.
  - **Real finding from the first row `41388720220` (attempt 1's completed Pass 1):** `TestRunLinuxTranscriptPaths.test_a_relative_outdir_keeps_the_launched_transcript` passes `--binary /bin/true`, absent on macOS (macOS has `/usr/bin/true`), so `run-linux.sh` exits 3 and the 72-test compat suite is deterministically red on Darwin. File `maze-chase/tools/compat/tests/test_harness_contract.py:747`; introduced by the Tester's `10f046e8`; Linux passes because `/bin/true` exists there.
  - **`fix` #788 is dispatched this run**: make the regression portable (a portable `true` path; keep the assertion intact). No third macOS row on this head. The fix push re-binds review and test; the macOS acceptance is sequenced after the #805 watchdog fix lands.
  - No eval is dispatched: the binding eval must bind the head after the fix and the re-run native row.
- **#804 (the #798 lab PR)** head `b794217d`, 2 commits, MERGEABLE/CLEAN, 9 files, workflow-touching. Review `41389927049` returned **`lab`**: blocking F1 (the restore step's dirty delta is auto-committed and the guard drops the tester range) and F2 (strip rewrites the captured baseline, so the guard refuses in the incident state), plus F3-F9. Lab run `41393863548` is LIVE (agent since 05:24:43Z; 150-minute cap).
- **#805 (Auditor, 05:20:33Z)**: the #653 watchdog false positive on long silent tool calls. The Owner summoned it at 05:31:02Z; Lab Engineer run `41395241489` is LIVE on it since 05:38:55Z (child-aware accounting plus R15 fixtures; rebase over #804 because both edit `.github/scripts/silent-stall-audit.sh`).
- **Lab queue:** #804 live, **#805 live** (parallel; will rebase over #804), then #799, then #803. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue. #792 waits behind #788. #773/#774/#775 parked.
- **Open issues: 20**, all triaged: #805, #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. **Open PRs: 3** (#804, #788, #745).
- **Curator** schedule `41391253241` completed SUCCESS at 05:20:44Z. **Auditor** schedule `41390987022` completed and posted the daily report at 05:30:04Z (opening #805). Both green; no manual re-dispatch.
- **Failures:** exactly one failure in the newest 200 runs: the macOS row `41392351386` (handled above). No held `action_required` run.
- **Concurrency note:** the failure-triage maintainer run `41395809204` (workflow_run, group `maintainer-main`) is concurrently live for the same macOS failure; this run (`41395797854`, group `maintainer-788`, the salvage wake) owns the `fix` dispatch. Both memory publishes are keep-both per issue #647. A duplicate `/oc fix` from the other tick would queue in the per-issue `opencode-788` group (queue: max); it is not a correctness risk.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap moved this checkout to the #788 head while the staged prompt stayed trusted; the maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[{"action":"fix","pr":788,"head":"8723172c8e2c2eaa5d1d507a4a0b2373c5e7c838",...}]`. `.maintainer/comment.md` = the #788 intake/status note. No `emergency.json`.

- `fix` #788: the macOS acceptance cannot be signed while the compat suite is deterministically red on Darwin, and the first attempt's evidence is already complete. The fix is test-only (portable `true` path). No third macOS row on this head (the #805 class), no eval before the post-fix head and the re-run native row.
- No `test-macos` / `test-linux` / `eval` / `review` / `test` #788: the fix push re-binds review and test; the native row and the eval follow the settled head, and the watchdog fix (#805) should land first.
- No `lab` #804/#805: both lab lanes are live; duplicate triggers would collide on the audit script and the quota window.
- No `lab` #799/#803/#745: serialized queue; #745 stays parked.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: the schedules are green, no request, nothing stranded.

## Next run

1. **Read the #788 Fixer result.** On the fix push, the workflow posts `/oc review`; then the Tester; then `test-linux` + `test-macos` once `#805`'s watchdog fix has landed (do not feed the macOS arm into the same false positive if #805 is still open). Then the binding eval on the settled head; on `approve-eval` verify the owner-authored marker is head-bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`, branch kept) and close #786 with the native evidence.
2. **Watch #804's lab fix `41393863548`:** on push the review re-binds; then the Tester, the binding eval, and the PAT sweep (fresh head-bound approve-test verdict plus a fresh head-bound eval marker). On new findings, `fix`; on infra, only `lab`.
3. **Watch #805's lab fix `41395241489`:** R15 must gain the live-child, no-child, and tool-timeout-above-idle fixtures and stay load-bearing; the branch rebases over #804 before review.
4. Then #799, then #803, serially; #792 after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
5. **Curator/auditor:** both schedules are green today; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Does the Fixer make `TestRunLinuxTranscriptPaths` portable without weakening the assertion, and does the re-review approve in one round?
2. Does #805's child-aware accounting land without weakening the #653/#754 retry and fast-fail semantics, and does it unblock the macOS row?
3. Does #804's lab clear F1/F2 and pass the re-review?
4. Does the binding eval converge on one head for #788 after the fix and the native rows?
5. Does the free-usage wall stay quiet through the two concurrent lab sessions plus the #788 fix lane?

- Hephaestus, the Maintainer
