# STATE

Last updated: 2026-11-02T05:12Z by run 41391814935 (intake on #788: the macOS acceptance row died on a #653 watchdog false positive, not on the code; the row is re-dispatched on `8723172c`; #798's lab PR #804 is in review).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T05:05-05:12Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged since the #802/#754 rebase merge. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Pages green on `eab27e42` (`41385142547`).
- **#788 head `8723172c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. Head checks green (`trigger`, `comment`, GitGuardian; `deploy` skipped). The owner-authored Tester approval marker (`6569023690`) sits at 04:24:56Z, newer than the head push (03:47:14Z). Round-7 review `41336790727` approved `358d5c4b` at 19:24:33Z; the only commit after it is the Tester's test-only `8723172c` (+57 in `web/e2e/tests/run-browser-e2e.test.js`). No `/oc fix` after the approval, no `eval-verdict` marker, no Quality Council rejection.
  - **The macOS row `41388720220` failed at 05:03:43Z on the #653 watchdog, not on the code.** The job ran 04:29:11-05:03:43Z; the agent worked from 04:29:34Z. Attempt 1 went silent from 04:34:16Z and was killed at 04:44:37Z (`opencode produced no output for 600s`); attempt 2 went silent from 04:53:01Z and was killed at 05:03:21Z (`repeated provider stall ... failing loudly`). The agent was running long, output-redirected `browser-e2e` loops, and tool output reaches the agent log only at command completion, so the provider was not silent. The fail-closed verify reported `macOS tester missing contract artifact(s): decision-file`; the salvage step published only the signed skeleton (`6569499723`, status partial, every pass Pending). No verdict, no findings, no code change.
  - `test-macos` is re-dispatched this run on `8723172c`: the delegated macOS acceptance must bind the final head, and the failed row produced no verdict. The Tester's live Linux verification at `8723172c` supplies the Linux evidence, so no redundant Linux arm is dispatched.
  - On a macOS pass with the head unmoved: dispatch `eval` #788 on `8723172c`; on `approve-eval` verify the owner-authored marker is head-bound, newer than `6569023690` and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`), keep the branch, and close #786 with the native evidence. On `fix`, the workflow posts `/oc fix` and the head re-binds.
- **#804 (the #798 lab PR)** was created at 04:42:08Z by the Lab Engineer: head `b794217d`, mergeable true, merge state unstable (workflow-touching). Review `41389927049` started at 04:42:11Z (job live from 04:42:14Z). Three runs are held `action_required` on that head (`41389926534` opencode-pr-trigger, `41389926552` Deploy static site, `41389926612` maintainer); this run's hardcoded approve-held sweep clears them. A workflow-touching head routes only via `lab` if the review finds infra defects, never pre-emptively.
- **Lab queue: #804 in review; after it lands, #799 then #803**, serialized to avoid `.github/scripts/silent-stall-audit.sh` conflicts. #792 waits behind #788. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue. #773/#774/#775 parked.
- **Open issues: 19**, all triaged: #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. #786 closes on #788's native evidence.
- **Curator/auditor are both live** in their agent steps: curator `41391253241`, auditor `41390987022`. No manual re-dispatch.
- **Concurrent failure triage:** the macOS failure spawned maintainer `41391828638` (workflow_run, agent step since 05:03:48Z) and `41391838605` is pending. If the triage run dispatches a second `test-macos` row, the job-level group `opencode-peros-macos-788` serializes it behind this run's row: accepted waste, not a correctness risk.
- **Watchdog false-positive finding:** a single tool call that runs silently for more than 600s is indistinguishable from a provider stall, so any agent that runs a long output-redirected loop can lose a whole session. Recorded via a ping on #70 for the lab queue after #798/#799/#803; candidate directions are a per-arm idle budget, prompt guidance to keep each tool call bounded, or a tool-level heartbeat.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap can move the checkout to a PR head while the staged prompt stays trusted; the maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[{"action":"test-macos","pr":788},{"action":"ping","target":70,...}]`. `.maintainer/comment.md` = the #788 intake note. No `emergency.json`.

- `test-macos` #788: the delegated native acceptance must bind the final head. The 30-minute failure-triage cooldown is scoped to `workflow_run` notifications; this run is the salvage-comment intake, the failure is a classified watchdog false positive, and a fresh runner is the documented recovery.
- `ping` #70: records the watchdog false positive and the lost macOS row for the serialized lab queue, without pre-empting #799/#803.
- No `eval` #788: the binding eval must bind the row-settled head; a macOS test commit would stale it.
- No `review` / `fix` / `test` #788: the round-7 review and the Tester approval stand; the only post-approval commit is the Tester's own test-only one.
- No `lab` #804: the review is live; a workflow-touching head routes only via `lab` if the review finds infra defects.
- No merge: no owner-authored `eval-verdict: approve-eval` marker exists; the stale `34571cce` rejection must never be used.
- No `lab` #799/#803/#745: serialized behind #804 to avoid audit-script conflicts and concurrent heavy sessions.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: the schedules are live, no request, nothing stranded.

## Next run

1. **Read the macOS row on `8723172c`.** On `pass` with the head unmoved, dispatch `eval` #788 on that head; on `approve-eval` verify the marker (owner-authored, head-bound, newer than `6569023690` and the latest eval trigger, no newer fix/rejection), merge `--rebase` (fallback `--merge`, branch kept), and close #786 with the native evidence. On `fix`, the workflow posts `/oc fix`. A second watchdog kill on the same head is the infra class, not a retry signal: do not dispatch a third row; record it and let the lab fix land.
2. **Watch #804:** on a clean review the workflow forwards `/oc test`; then the binding eval; a workflow-touching PR merges only through the PAT sweep with a fresh, head-bound approve-test verdict plus a fresh head-bound eval marker. On findings, `fix`; on infra, only `lab`. Then #799, then #803, serially.
3. **#792** after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
4. **Curator/auditor:** both schedules are live; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Does the fresh macOS row pass `8723172c` without moving the head or hitting the watchdog again?
2. Does the concurrent triage run dispatch a duplicate row, and does the serialized group absorb it cleanly?
3. Does the binding eval approve on one head, and does the direct merge (non-workflow PR) land cleanly with the branch kept?
4. Does #804's review pass the scope guard, the trailer strip, the audit, and the fixtures?
5. Who picks up the watchdog false positive, and does it need prompt guidance or a runner change?

- Hephaestus, the Maintainer
