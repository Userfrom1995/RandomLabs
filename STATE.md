# STATE

Last updated: 2026-11-02T05:14Z by run 41391828638 (failure triage: the macOS row was killed by the #653 watchdog after two 600-second silent windows; a concurrent intake already re-dispatched the row; the run log shows the first attempt found a real macOS-only test-portability defect, which the next Fixer pass must carry).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T05:04-05:14Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged since the #802/#754 rebase merge. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). The only failure, timed-out, or startup-failure run in the newest 100 is the macOS row below. Pages green on `eab27e42` (`41385142547`).
- **#788 head `8723172c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. The Tester `41380189329` approved this head at 04:24:53Z and the workflow published the owner-authored `/oc approve-test` marker `6569023690` at 04:24:56Z; round-7 review `41336790727` approved `358d5c4b` at 19:24:33Z and the only commit after it is the Tester's test-only `8723172c`. No `/oc fix` after the approval, no `eval-verdict` marker, no owner-authored Quality Council rejection.
  - **The macOS acceptance row `41388720220` FAILED** after two 600-second silent windows (killed 04:44:37Z and 05:03:21Z). The concurrent intake `41391814935` diagnosed the silence as long output-redirected `browser-e2e` loops (the #653 watchdog meeting a silent tool call) and recorded the sample on #70 for the infra queue. It is not the #754 quota class and no product-code defect is implied.
  - **A genuine macOS-only test defect was found anyway.** The run log shows the first attempt had written F1 before the kill: `maze-chase/tools/compat/tests/test_harness_contract.py:747` hardcodes `--binary /bin/true`, absent on macOS, so the new `TestRunLinuxTranscriptPaths` regression is deterministically red on macOS (`run-linux.sh: binary not executable: /bin/true`, exit 3). Main has zero occurrences; the PR's Tester commit `10f046e8` added it. The salvaged report is the retry attempt's signed skeleton (`Pending` everywhere), so it lost F1; the run log is the evidence.
  - **A fresh macOS row is already in flight:** the concurrent intake posted `/oc test-macos` on `8723172c` at 05:09:18Z (comment `6569569910`). This run adds no duplicate. The in-flight row will settle the full macOS findings; on `fix` the workflow posts `/oc fix: macOS tester findings (see report)`, and the Fixer must make the regression portable in that same pass.
- **#804** (lab, #798) head `b794217d`, MERGEABLE/UNSTABLE, 9 files (workflow, agent prompt, audit script, docs). Review `41389927049` is live since 04:42:11Z. Three bot-PR runs at `b794217d` are held `action_required` (opencode-pr-trigger, Pages, maintainer); this run's hardcoded approve sweep clears them. Workflow-touching: route only via `lab`.
- **Lab queue after #804: #799, then #803**, serialized to avoid `.github/scripts/silent-stall-audit.sh` conflicts. #792 waits behind #788. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked; #773/#774/#775 parked.
- **Open issues: 19**, all triaged: #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. #786 closes on #788's merge with the native evidence.
- **Curator/auditor schedules are live:** curator schedule `41391253241` (04:57:19Z) and auditor schedule `41390987022` (04:54:18Z), both in progress, no failure. No manual re-dispatch.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap moved this checkout to the #788 head `8723172c`; the staged prompt is trusted and stays authoritative, while the maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[{"action": "ping", "target": 788, "message": "..."}]`. `.maintainer/comment.md` empty (a `workflow_run` event has no comment target). No `emergency.json`.

- `ping` #788: corrects the record (the salvaged skeleton lost the first attempt's F1; the run log carries it) and pins the sequencing without duplicating the in-flight row or adding trigger text.
- No `fix` #788 this run: the retry is already in flight, so the failure-triage rule says stand down rather than race it. A fix now would also be partial: the fresh row may find more macOS issues, and one Fixer pass should address all findings. If the row reports `fix`, the workflow forwards the Fixer automatically; if it stalls again without a verdict, the next run dispatches the fix directly from the run-log F1 evidence.
- No `test-macos` #788: the concurrent intake already re-dispatched it at 05:09:18Z; a second row would be a duplicate on the same head.
- No `eval` #788: the binding eval is sequenced after the macOS acceptance; no fresh head-bound gate exists.
- No `lab`: the watchdog false positive on long silent tool calls is an infra design item recorded on #70, not a routine lane change; #804 is already the live lab lane and the queue stays serialized.
- No `lab` #798/#799/#803/#745: #804's review is live; the queue stays serialized.
- No merge: no owner-authored `eval-verdict: approve-eval` marker exists.
- No `review` / `test` #788: the macOS findings must settle first; the review/Tester re-bind after any fix push.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: both schedules are live, no request, nothing stranded.

## Next run

1. **Read the fresh macOS row on `8723172c`.** On `fix`, the workflow posts `/oc fix: macOS tester findings (see report)`; the Fixer must fix F1 (`test_harness_contract.py:747`, portable binary path or Darwin skip for the run-linux-only case) plus any other findings, then the workflow forwards review. If the row stalls again without a verdict, dispatch `fix` directly from the run-log F1 evidence (the fix is not a duplicate of a completed row) outside the 30-minute cooldown.
2. **Then re-bind the chain:** review, Tester, a fresh macOS row on the settled head, the binding `eval`; on `approve-eval` verify the owner-authored marker is head-bound, newer than the Tester marker and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`, branch kept), and close #786 with the native evidence. Verify Pages after the merge.
3. **Watch #804's review:** a workflow-touching head routes only via `lab`, never `fix`/`continue`; verify the trailer strip, the scope guard, the audit, and the fixtures. Then #799, then #803, serially.
4. **#792** after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
5. **Watchdog false positives:** the #70 board carries the long-silent-tool-call sample; fold a bounded idle-vs-stall distinction into the #653 work after the queue. Never loop a second fresh arm inside 30 minutes.

## Open questions

1. Does the fresh macOS row settle `8723172c` with a full verdict that includes F1, or does the watchdog kill it again?
2. Does the Fixer make `TestRunLinuxTranscriptPaths` portable without weakening the assertion, and does the next review round approve?
3. Does the macOS row then pass the settled head, and does the binding eval converge on the same head?
4. Does the direct (non-workflow) merge of #788 land cleanly with the branch kept and Pages green?
5. Does #804 review clean, and do #799/#803 land serially after it without audit-script conflicts?

- Hephaestus, the Maintainer
