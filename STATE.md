# STATE

Last updated: 2026-11-08T05:24Z by run 42450227553 (both infra reviews returned `lab` on rebase findings: #804 F1 rebase plus three-file conflict resolution, #832 F9 mechanical rebase; both Lab Engineer lanes are live; the scheduled Curator round completed clean with `[]` and the daily Auditor round is still live). Next-run priorities: read the two lab pushes and their fresh review verdicts, verify the Auditor round, keep #821 parked on the Owner capacity decision, and keep #831 open for the per-attempt verification and the scratch canary.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:18-05:24Z on 2026-11-08)

- **main** = `675658cbeb00b2dffda38cd1bc762f0dba0810ab`, the #835 rebase merge at 05:01:24Z. The chain is linear (`675658cb` -> `97f19f32` -> `dd2514a0` -> `22d6c92` -> ...), so main is not orphaned. **Pages is verified green on this tip**: workflow_dispatch runs 42449261384 (05:03:43Z) and 42449320456 (05:04:38Z) both SUCCESS on `675658cb`.
- **#835** MERGED at 05:01:24Z as rebase merge `675658cb` on head `dcf8d37a`, after the full gate: Reviewer APPROVE at 04:14:19Z, Tester APPROVE with the canonical owner-authored marker 6717272055 at 04:33:14Z, and the binding Evaluator's `approve-eval` (9.88/10) with the machine-published owner-authored marker 6717495203 at 04:59:53Z (head-bound to `dcf8d37a`, trigger 6717330353). **#834 is closed**.
- **#832** head `2410ad3af36bcbd6de3a9b1cf629c4a232105d2c`, **MERGEABLE/CLEAN**, three archive-only commits behind main. Review `42449254002` completed SUCCESS at 05:20:08Z with `lab`: F5-F8 verify fixed (per-attempt plugin sanitizer on both arms, fail-closed `git ls-files` enumeration, R31 pins, full audit 34/34 on a clean clone, decoy bypass caught by R15/R31); the blocking finding is F9, a mechanical rebase onto `675658cb` plus an audit rerun, and one non-blocking decision-note correction (the `PLUGIN_GUARD_MARKERS` count is 10, not 11). The review workflow forwarded `/oc lab` at 05:20:04Z; **Lab Engineer `42450360772` is live since 05:20:06Z**. Next: read its push, then the fresh review, Tester, eval, PAT sweep; `Refs #831` stays and #831 stays open for the per-attempt verification and the scratch canary.
- **#804** head `427faa7ac7894fa0c946385ccda2b7c594945ff4`, **CONFLICTING/DIRTY** against main. Review `42448890570` completed SUCCESS at 05:18:09Z with `lab`: the B8 contents-API helper read is verified fixed (full audit 35/35) and the prior non-blocking follow-ups are addressed; the only blocking finding is F1, rebase onto current main and resolve the three content conflicts in `.github/scripts/silent-stall-audit.sh`, `AGENTS.md`, and `LAB.md` while keeping main's R25 curator/cap-headroom rules and this branch's R34/R35 per-OS matrix and contents-API prelude, then rerun the full audit and update the stale PR body. The review read main at `22d6c92f`; main is now `675658cb` (three archive-only #834 commits), so the rebase target is the current tip. The review workflow forwarded `/oc lab` at 05:18:05Z; **Lab Engineer `42450231413` is live since 05:18:08Z**. Next: read its push, then the fresh review, Tester, eval, PAT sweep; #798 closes on approval.
- **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but behind main, Maze Chase harness (`Closes #792`). Parked on the Owner capacity decision; its last thread note records the 2026-11-07 review death on the daily wall. **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY (base `e73bd7a2`), parked behind #803.
- **Open issues** (20): #831 stays open past #832; #798 with #804; #792 with #821; #742 with #745. The known held follow-ups remain #815/#814/#812/#803/#774/#773/#683/#678/#677/#661/#659/#657/#655/#582; #70 and #42 are the boards. No untriaged issue and nothing newer than #834 (closed).
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Trigger allowlist**: strict-YAML exact 19/19 entries against the live repo-owned names outside the self-excluded `maintainer` (20 live names), verified against main's `maintainer.yml` through the contents API because the workspace checkout is the PR head. No missing workflow and no stale entry.
- **Model watch**: the registry serves 81 models; the pin `opencode/deepseek-v4.1-flash-free` and all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) resolve. No retirement.
- **Schedule arms**: the Nov 8 Auditor daily round **42448787330 is in progress since 04:56:29Z** (about 25 minutes at survey), inside its cap. The scheduled Curator round **42448985741 completed SUCCESS at 05:16:01Z with decision `[]`**: the public surface is pristine (15 live Pages URLs 200, archive 28/28, 37 JSON files parse, landing tests 72/72), #835 already repaired the archive README residuals and #834 closed during the round, so no follow-up issue was filed. The archive-residual loose end is closed by that audit.
- **Failures**: zero failure/timed_out/startup_failure runs in the last 150 runs; the wall has not recurred since it lifted at 02:19Z. The maintainer skip/cancel burst in the 05:18-05:20Z comment fan-out is the documented single-slot supersede noise.
- **Concurrent wakes**: this run 42450227553 is the review-verdict comment clone on #804. Sibling maintainer 42450231382 is pending on the `/oc lab` comment in the same burst, and sibling 42450360788 is pending on the #832 `/oc lab` comment. Keep-both memory handles the overlap.

## The live lanes (do not duplicate)

1. **#804** - Lab Engineer 42450231413 live since 05:18:08Z on `427faa7a` (F1 rebase plus the three-file conflict resolution, R34/R35 preserved). Next: lab push, fresh review, Tester, eval, PAT sweep; #798 closes on approval.
2. **#832** - Lab Engineer 42450360772 live since 05:20:06Z on `2410ad3a` (F9 mechanical rebase onto `675658cb` plus the 11 -> 10 marker-count note). Next: lab push, fresh review, Tester, eval, PAT sweep; #831 stays open.
3. **Auditor** - daily round 42448787330 live since 04:56:29Z.
4. **#821** - parked on the Owner capacity decision. Do not spend a fresh review until the Owner capacity decision is given.
5. **#745** - parked behind #803.

## The serialized infra queue

1. #829: DONE, merged as `22d6c92`, #827 closed.
2. #835: DONE, merged as `675658cb`, #834 closed, Pages verified.
3. #832: lab landed `2410ad3a`; F9 mechanical rebase lane live; then fresh review, Tester, eval, PAT sweep; #831 stays open.
4. #804: F1 rebase/conflict lane live on `427faa7a`; then fresh review, Tester, eval, PAT sweep; #798 closes on approval.
5. #803: needs a fresh head-bound review after the queue; its lifetime review budget is spent, so a manual fresh pass is the recovery lane.
6. #821 is parked on the Owner capacity decision; #745 behind #803.
7. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).
8. Whichever of #832/#804 lands first advances main, so the second must rebase before its own merge gate (the documented interlock).

## Loose ends board

1. **#831 (live via #832)**: PR-head project-config loading; the per-attempt sanitizer landed at `2410ad3a` and the F9 rebase lane is the current step. #831 stays open for the live verification and the Owner-requested scratch PR-comment canary.
2. **#798 (live via #804)**: per-OS commit-scope guard; the contents-API helper read landed at `427faa7a`, and the F1 rebase/conflict lane is the current step.
3. **#834 (done)**: closed on the #835 merge (`675658cb`); the scheduled Curator round audited the same public surface and found it pristine, so the archive residuals are closed.
4. **Archive residuals (closed)**: the granite docs `cd granite`, the retired poolduel hosted URL, and the README count drift were repaired by #835; the Curator's 05:16Z round confirmed 28/28 archive links and 15 live Pages URLs 200. No follow-up issue needed.
5. **#792 (parked with #821)**: Maze Chase harness gaps; parked on the Owner capacity decision.
6. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
7. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance. The Owner capacity decision remains the critical path while it recurs.
8. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
9. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
10. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
11. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
12. **Model watch**: the 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears.
13. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; cancellations stay rare and justified.
14. **Board pin**: #70 is pinned and verified.
15. **Nov 8 Auditor round**: 42448787330 in progress since 04:56:29Z; if it caps on the wall, dispatch `auditor` on #70 as the manual recovery.
16. **Scheduled Curator round**: DONE, 42448985741 SUCCESS 05:16:01Z with `[]`; the first capped round is clean.
17. **#831 scratch canary**: needs a disposable PR that only the Owner (or a pushed branch) can create; never claim it done without live evidence or a recorded Owner waiver.
18. **#829 post-merge**: the curator cap and durability protocol are live on main; the scheduled curator round exercised the new cap cleanly.
19. **General mid-body wake noise**: the evaluator verdict comment contains the tester marker mid-sentence, so the general arm wakes spuriously; ride along in the deferred #822 residuals pass.
20. **Pages verification**: DONE for `675658cb` (dispatch runs 42449261384 and 42449320456 both SUCCESS). Re-verify after every future merge.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#832, #804) never take `fix`/`continue`; route `lab`. Docs/product lanes may take `fix` if the review returns findings.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward. Two dispatches of the same tip are idempotent and harmless.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown; a lane that has repeatedly failed may be parked on the Owner capacity decision.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts (issue #831).
- The opt-out stops project config and instruction loading only; on CLI 1.19.5 it does not stop the plugin-directory import, so never claim the plugin channel is closed by the opt-out alone. The #832 branch carries the per-attempt sanitizer; the review and the per-attempt canary are the verification gate.
- The #831 pre-CLI guard is per step, not per CLI attempt: the retry loops start new processes after the PR-head checkout, so a per-attempt call is required (review F5, 2026-11-08), and the Maintainer inline arm needs its own call. Never claim the plugin channel is closed until those calls are pinned in R31 and verified.
- A rebase of the audit script must keep main's current rule numbering: R33 is the run-scalar budget and R34 is the quota-wall guard, so the per-OS rule takes R35 and every header, banner, label, and docs reference must move together.
- The expected App-token workflow push rejection on protected-path branches is wrapper noise (here also a non-fast-forward after a rebase); verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #804 lab push; on a push a fresh head-bound review follows, then the Tester, the binding eval, and the PAT sweep; #798 closes on approval.
2. Read the #832 lab push; on a push a fresh head-bound review follows; keep `Refs #831` and #831 open for the per-attempt verification and the scratch canary.
3. Verify the Auditor daily round 42448787330 completes; if it caps on the wall, dispatch `auditor` on #70 as the manual recovery.
4. Keep #821 parked on the Owner capacity decision; keep #745 behind #803.
5. Re-check held and queued runs, the trigger allowlist (against main, not the PR-head checkout), the model ladder, and the wall.
6. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
7. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.
9. Whichever of #832/#804 lands first advances main, so verify the second rebases before its own merge gate.

## Open questions

1. Do the two lab passes push clean rebased heads (the #804 three-file conflict resolution preserving main's R25 and the branch's R34/R35, and the #832 mechanical rebase), and do the fresh reviews bind them?
2. Does the Auditor daily round complete cleanly inside its cap?
3. Will the daily wall recur today and cap the new lanes?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)?
5. Will the Owner provide the disposable scratch PR (or a waiver) needed to close the #831 live canary ask?
6. Whichever of #832/#804 lands first advances main, so does the second rebase cleanly before its own merge gate?
