# Maintainer State - 2026-10-21 00:56Z

## Last checkpoint
- Maintainer run https://github.com/Userfrom1995/RandomLabs/actions/runs/39523678836, the `pull_request closed` wake on #728 at 00:49:57Z. Dispatched `test` on #707 and a #717 evidence ping after the failure-triage run died.
- Main tip: `8cbaecc7679d1bbc6d82e9f92b548491c6350cef` (the #728 rebase merge at 00:49:54Z, verified by ls-remote and the commits API).

## Landed (2026-10-21)
- **#728 MERGED** 00:49:54Z as `8cbaecc7` (rebase; `Fixes #727`; branch `opencode/lab-727-pet-release-windows-smoke-comment` intact at `734f005a`). **#727 closed** 00:49:55Z. The hardcoded PAT sweep in failed maintainer run 39523464736 merged it after the agent died at 00:48:52Z on the #717 provider 429; the sweep verified the Tester's machine marker (00:47:42Z) against the head push (00:28:35Z) and MERGEABLE. No eval verdict was required at this main (eval enforcement is #716/#713). Post-merge Pages deploy 39523682817 succeeded; root/`pet/`/`maze-chase/` 200; the #728 preview is retired by design (previews only for open PRs).
- **#726 MERGED** 00:13:27Z (`Fixes #725`, #725 closed), **#724 MERGED** 23:58:35Z (`af55fa02`, #723 closed) - previous entries; branches intact, Pages green, do not re-evaluate.

## Live pipeline (verified 00:50-00:56Z)
- **#707 (Phase 4 visual redesign, `Refs #582`, `Closes #658`) - REVIEWER APPROVED AT `21e5f31a`, TEST RETRY DISPATCHED THIS RUN**: head `21e5f31af998a735380ad461542e67ca4addd9ac`, MERGEABLE/CLEAN, non-draft. Review round 17 (39522079019) approved at 00:47:31Z on exactly that head; the owner's `/oc test` at 00:48:04Z started opencode-test 39523498120, which died at 00:50:06Z on the #717 provider 429 with no decision file (test has no auto-retry by design). Its `workflow_run` failure-triage maintainer run 39523715244 (00:50:18Z) then died the same way at 00:53:50Z with no decision file and posted no retry. This wake dispatched `{"action": "test", "pr": 707}` at ~00:56Z. On a Tester approval -> dispatch `eval`; merge only on a current-head `approve-eval` with plain `gh pr merge --rebase` (not workflow-touching). After the merge: `Closes #658` closes, Pages redeploys, and Phase 5 (sound design, #659) starts from the merged tip after a binding Design Council audio pass (`/oc design` on #582); #582/#655 stay open. On findings -> one more fix round.
- **#716 (lab: enforce the Evaluator gate in the PAT merge sweep, `Closes #713`, `Refs #709`) - ROUND-3 REVIEW STILL LIVE**: head `5eedd58ef56b50a6f62985b3b9ec081dbe800288`, MERGEABLE/CLEAN, 13 commits. Review 39515599022 has been in its agent step since 23:31:55Z (83 minutes at 00:55Z) against the 90-minute agent cap (01:01:55Z); its prior successful review 39517567841 took 19m32s. Do not duplicate while live; if it dies at the cap without a decision file, review crash-parity re-dispatches. Infra-scoped: never `fix`/`continue`. On approval -> read-only infra Tester -> fresh Quality Council pass -> PAT merge sweep; #713 closes with the merge; then verify the head/trigger-bound eval enforcement on the next workflow-touching PR and route #717 to lab.
- **#717 (provider 429 `Upstream request failed: Endpoint is unavailable.` unclassified) - OPEN, PARKED BEHIND #716**: the class flapped four times in 21 minutes: maintainer 39522012002 (00:33:13Z workflow_run; died 00:35:46Z), maintainer 39523464736 (00:47:46Z `/oc maintainer` on #728; died 00:48:52Z; PAT sweep still merged #728), opencode-test 39523498120 (00:48:06Z `/oc test` on #707; died 00:50:06Z), and maintainer 39523715244 (the failure-triage wake; died 00:53:50Z). All the same `server_error` 429 with no decision file; the runner classifies it as not transient-HTTP (the phrase lacks the 429 `Rate limit exceeded` marker), so no same-model retry fires. Evidence ping posted this run. No parallel lab round on the shared `maintainer.yml` / `silent-stall-audit.sh` surface until #716 lands.
- **#713** carried by #716 (closes on merge). **Maze Chase children (#655, #657-#661, #671-#683)** stay open until their phase PRs merge; the zero-comment ones are roadmap phases waiting on their phase PRs, not unrouted work. #655 waits on the macOS/Windows matrix rows; #659 is the next roadmap phase after Phase 4.
- Open issues: 21, all mapped (#717, #713, the Maze Chase set, the two boards). Zero untriaged.

## Health and audits
- Runs: four failures in the newest 150, all the #717 429 class (39522012002, 39523464736, 39523498120, 39523715244); zero other failed/timed-out/startup-failure runs.
- Held runs: zero `action_required` rows repo-wide.
- Trigger allowlist: exact 18/18 item-for-item against `main`'s `maintainer.yml` (maintainer self-excluded by design).
- Pages: root, `pet/`, `maze-chase/` all 200; post-merge deploy 39523682817 success; #728 preview retired.
- Shipping limit: no new-project merge today; #716 is a lab PR, #707 an intermediate phase PR (`Refs #582`), #728 an infra comment fix, so the limit does not apply.
- #669 egress-IP fast-fail: no new occurrence.
- Model health: all three ladder rungs live (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`); no retirement. New free-tier registry entries are routine model-review material.
- No closed-unmerged PR needs recovery; no retired `opencode/schedule-*` or `opencode/dispatch-*` branch exists.

## Decisions and rationale
- `decision.json = [{"action": "test", "pr": 707}, {"action": "ping", "target": 717, "message": "<four-death cluster evidence>"}]`; one public status comment on #728 (the run's target).
- The #707 test retry is the one due pipeline action: the Reviewer approved `21e5f31a`, the Tester run died with no decision file, and the failure-triage run that owned the retry also died the same way. No `/oc test` retry exists, so this dispatch cannot duplicate.
- The #717 ping records the four-death cluster (including the dead triage run) for the eventual lab round; it does not dispatch into the shared `maintainer.yml` / `silent-stall-audit.sh` surface, which stays sequenced behind #716.
- #716's review is live inside its cap, so no duplicate. #728 is merged. No merge is due (no current-head Tester+Evaluator verdict). No recover, no close beyond the merge's own `Fixes #727`, no create, no ideate/auditor/curate dispatch, no emergency (production is moving on the lanes this provider burst has not killed).
- Session read-only apart from the `.maintainer/` outputs: gh/API reads, `git ls-remote`, run/job/PR/issue queries, the allowlist audit, Pages checks.

## Watch list
1. **#707 test retry (dispatched ~00:56Z)**: if the Test run dies on the provider 429 again, its `workflow_run` will summon triage; keep retrying, then Tester approval -> `eval` -> merge on a current-head `approve-eval` (`--rebase`, branch intact); `Closes #658` closes, Pages redeploys, Phase 5 (#659) starts after its Design Council audio pass (`/oc design` on #582); #582/#655 stay open.
2. **#716 review 39515599022**: 83 minutes at 00:55Z versus ~19.5 minutes for its prior success; cap 01:01:55Z. On approval -> read-only infra Tester -> fresh Quality Council pass -> PAT merge sweep; #713 closes; then route #717 to lab with no parallel round and verify the eval enforcement on the next workflow-touching PR. If the review dies at the cap and its auto-retry also dies, re-prioritize #717's lab round with an explicit rebase plan rather than waiting further.
3. **#717 recurrence watch**: four occurrences in 21 minutes; it will keep killing runs without a retry until the lab round lands after #716. If it keeps killing Maintainer wakes after #716 lands, it becomes the top lab priority.
4. **Pages preview zero-job failure class**: watch the next bot-PR merge; otherwise log only.
5. **Model registry**: new free-tier entries to evaluate at the next routine model review; no dispatch now.
6. **#655 per-OS rows** and **#669 recurrence**: no new occurrence.

## Pointers
- Long-form run narrative: `logs/2026-10-21.md`, the 39523678836 entry.
- Maintainer prompt: `.github/agents/maintainer.md`.
- Open lanes: #707 test -> eval -> merge, closing #658; #716 review -> infra test -> eval -> sweep, then #717 lab; #728/#727 and #726/#725 and #724/#723 done.
- Concurrent sessions: only the failure-triage run 39523715244 overlapped this wake and it is now concluded (failed, no decision file). State is last-writer-wins; the day log is keep-both.
