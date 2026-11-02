# STATE

Last updated: 2026-11-02T05:17Z by run 41392370733 (the delayed PR-open wake on #804: the review is live since 04:42Z, the macOS row is re-running on #788 `8723172c`, the queue is unchanged; no dispatch).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T05:10-05:17Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged since the #802/#754 rebase merge. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Pages deploy `41392372027` succeeded 05:10:08Z (the #804 preview redeploy; production content unchanged).
- **#788 head `8723172c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. The owner-authored Tester approval marker (`6569023690`) sits at 04:24:56Z, newer than the head push (03:47:14Z); round-7 review approved `358d5c4b`; the only post-approval commit is the Tester's test-only `8723172c`. No `/oc fix` after the approval, no `eval-verdict` marker, no Quality Council rejection.
  - **The macOS row `41392351386` is LIVE since 05:09:23Z** (agent step since 05:09:39Z) on `8723172c`: the re-dispatch after the previous row `41388720220` died on the #653 watchdog false positive while running long output-redirected `browser-e2e` loops. No verdict yet; the job cap is 150 minutes.
  - No `eval` is dispatched yet: the binding eval must bind the row-settled head, and a macOS test commit would stale it.
- **#804 (the #798 lab PR)** head `b794217d`, 2 commits, MERGEABLE/CLEAN, 9 files, workflow-touching. Checks green (`trigger`, `comment`, `maintainer`, GitGuardian; `deploy` skipped); no held runs. Review `41389927049` is live since 04:42:11Z (agent since 04:42:26Z, no verdict yet; 120-minute agent cap). This run was woken by the delayed PR-open `/oc maintainer` (`opencode-pr-trigger` run `41389926534`, held `action_required` from 04:42Z until the previous run's sweep cleared it at 05:09:31Z).
- **Lab queue: #804 in review; after it lands, #799 then #803**, serialized to avoid `.github/scripts/silent-stall-audit.sh` conflicts and concurrent heavy sessions. #792 waits behind #788. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue. #773/#774/#775 parked.
- **Open issues: 19**, all triaged: #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. #786 closes on #788's native evidence.
- **Curator/auditor are both live** in their agent steps: curator `41391253241` (since 04:57:19Z), auditor `41390987022` (since 04:54:18Z). No manual re-dispatch.
- **Failures:** the last 100 runs contain exactly one failure, the already-handled macOS row `41388720220`. No untriaged crash, no startup failure, no held `action_required` run.
- **Watchdog false-positive finding** is recorded on #70 (`6569569512`): a single tool call that runs silently for more than 600s is indistinguishable from a provider stall. Lab queue after #798/#799/#803; candidate directions are a per-arm idle budget, prompt guidance to keep each tool call bounded, or a tool-level heartbeat.
- **Concurrency note:** the 05:09Z comment batch spawned a burst of `workflow_run` maintainer ticks; the single-pending-slot design superseded them and this run is the live one. That is by design, not a defect.
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap can move the checkout to a PR head while the staged prompt stays trusted; the maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #804 intake note. No `emergency.json`.

- No dispatch: the #804 review is live, the #788 macOS row is live, and the lab queue is deliberately serialized.
- No `lab` #804: a workflow-touching head routes only via `lab` if the review finds infra defects, never pre-emptively.
- No merge #804: no owner-authored `/oc approve-test` marker and no `eval-verdict: approve-eval` marker exist; a workflow-touching PR merges only through the PAT sweep with both fresh and head-bound.
- No `review` #804: the review is live on the current head.
- No `eval` / `test` / `fix` / `review` #788: the Tester approval stands; the macOS row is the only open item and it is live on the current head.
- No `lab` #799/#803/#745: serialized behind #804 to avoid audit-script conflicts and concurrent heavy sessions on the fragile quota window.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: the schedules are live, no request, nothing stranded.

## Next run

1. **Read the macOS row `41392351386` on `8723172c`.** On `pass` with the head unmoved, dispatch `eval` #788 on that head; on `approve-eval` verify the owner-authored marker is head-bound, newer than `6569023690` and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`, branch kept), and close #786 with the native evidence. On `fix`, the workflow posts `/oc fix` and the head re-binds. A second watchdog kill on the same head is the infra class, not a retry signal: do not dispatch a third row; record it and let the lab fix land.
2. **Watch #804:** on a clean review the workflow forwards `/oc test`; then the binding eval; a workflow-touching PR merges only through the PAT sweep with a fresh, head-bound approve-test verdict plus a fresh head-bound eval marker. On findings, `fix`; on infra, only `lab`. Then #799, then #803, serially.
3. **#792** after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
4. **Curator/auditor:** both schedules are live; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Does the fresh macOS row pass `8723172c` without moving the head or hitting the watchdog again?
2. Does #804's review pass the scope guard, the trailer strip, the audit, and the fixtures?
3. Does the binding eval approve on one head for #788, and does the direct merge land cleanly with the branch kept?
4. Do #799 and #803 land serially after #804 without audit-script conflicts?
5. Does the free-usage wall stay quiet through the macOS row and the binding eval?

- Hephaestus, the Maintainer
