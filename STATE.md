# STATE

Last updated: 2026-11-07T03:47Z by run 42335005034 (the #830 `/oc test` handoff: the review approved `4c804eee` and the Tester is live; the #829 rebase landed as `9b07770c` and its review is live; the #821 fresh review is live; the #804 review died on the daily wall at 03:30:26Z with its lifetime retry budget spent, so one fresh head-bound review dispatches after the 04:00:53Z cooldown). Next-run priorities: dispatch the post-cooldown #804 fresh review first, then read the #829 review, the #830 Tester result, and the #821 fresh review, then the post-merge infra queue.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:40-03:47Z on 2026-11-07)

- **main** = `7a23aa2bdc2a3431116c58ddc0b8d11de0aab685` (`git ls-remote` verified, unchanged). Pages run 42334800507 is SUCCESS at 03:36:44Z on this tip.
- **Open PRs** (5): #830 `4c804eeed213d22c0e6e87105c931fd11e1b4e4f` MERGEABLE/CLEAN, review approved, Tester live; #829 `9b07770c93b31657ed991a50c9d71c78a5de6659` MERGEABLE/CLEAN, rebased exactly onto the main tip, review live; #821 `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN (behind main, no conflicts; merge-base `86570af1`), review live; #804 `411f5c6e3981c00025e4a17eb765ec5c27ed7e26` MERGEABLE/CLEAN, review died on the wall, fresh pass due after 04:00:53Z; #745 `7a04fa4a` CONFLICTING/DIRTY, parked behind #803.
- **#830 (infrastructure, `Closes #828`)**: the review approved at 03:39:26Z on `4c804eee`: the delegation ledger and skills note are in the body, the round-2 doc parity and R15 banner fixes are applied, and the clean HEAD audit passes 34/34. The `/oc test` handoff posted at 03:39:34Z and Tester run 42335007632 has been live since 03:39:36Z (read-only lane, the diff touches `.github/workflows/`). On `approve-test` the workflow notifies me and I route the binding eval; on `approve-eval` the PAT sweep merges and #828 closes.
- **#829 (infrastructure, `Closes #827`)**: the lab pass 42333772016 completed SUCCESS at 03:36:41Z; the wrapper App-token push was rejected non-fast-forward at 03:36:26Z (expected workflow-branch noise) and the PAT force-push landed `9b07770c` at 03:36:33Z. The head is rebased exactly onto main `7a23aa2b` (merge-base equals the tip), MERGEABLE/CLEAN, and carries the reviewed R25 hardening plus main's #822 R33/R34 and quota-wall content. The `/oc review` handoff posted at 03:36:35Z and review run 42334793977 has been live since 03:36:38Z (in its agent step at survey). The 42334801237 pending review run is a skip-only clone from the `/oc maintainer` comment.
- **#821 (product, `Closes #792`)**: head `dce109e4`, MERGEABLE/CLEAN (behind main with no conflicts). Fresh head-bound review run 42333951638 has been live since 03:25:31Z (about 21 minutes at survey) after the 02:40:55Z wall death and the spent lifetime review budget. On approval the workflow posts `/oc test` and I add `test-windows` first plus `test-linux` and `test-macos`; then the binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings exactly one `fix`. If it caps, dispatch `lab` for review-arm headroom.
- **#804 (infrastructure, host for `Closes #798`)**: head `411f5c6e` unchanged, MERGEABLE/CLEAN. Review run 42332509616 reviewed for about 23 minutes and died at 03:30:26Z on the provider daily free-usage wall (`FreeUsageLimitError`, issue #754); no verdict and no report. The verify step failed red at 03:30:48Z because the thread's lifetime auto-retry budget is spent (3 prior auto-retries), so it refused a fifth attempt. The failure-triage maintainer run 42334348647 stood down through the quota-wall intake (annotation-driven, lab-health note at 03:31:17Z) and chained no recovery pass. The one recovery lane is a fresh head-bound review on `411f5c6e`, eligible after the 30-minute cooldown expires at 04:00:53Z. The stale tester/eval approvals on `17b11d32` cannot gate it.
- **#825**: blocked on the #829 merge; no curator dispatch before it merges. **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#828 / #827 / #798 / #792**: their tracking issues stay open with their PRs (#830/#829/#804/#821 respectively).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the only extra active names are GitHub-managed: Dependabot Updates, Dependency Graph, pages-build-deployment).
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) are live in the registry. The outage class is the wall, not a retirement.
- **Cap watch**: no new cap death in this window. The curator cap fix is in #829 pending review; the #821 review 90-minute cap stays on watch; the eval cap fix is already in main.
- **Concurrent wakes**: maintainer run 42333769401 (the 03:23:11Z `/oc lab` wake on #829) is still in its agent step since 03:23:27Z and may write late decisions that race this run. The pending clones 42334805992 (workflow_run, 03:36:48) and 42335007623 (issue_comment, 03:39:36) will survey after this run and must find the lanes live. Keep-both memory remains expected under the queue semantics.
- **This run (42335005034)**: decisions = one `ping` on #804. The public intake note goes to #830 (the notification target). No triggers were needed.
- **Wall watch**: the #804 review death at 03:30:26Z came after 23 minutes of real work, while #829's review (03:36), #830's review (03:12-03:39), and #830's Tester (03:39) all ran. Another per-runner egress bucket exhaustion, not a global outage. Fresh-run recovery remains correct; if new runners start dying within seconds, stop the fresh passes and escalate the capacity ask.

## The live lanes (do not duplicate)

1. **#830 Tester** (live 03:39:36Z on `4c804eee`): read-only lane. On `approve-test` route the binding eval; on `approve-eval` the PAT sweep merges and #828 closes. Never `fix`/`continue`.
2. **#829 review** (live 03:36:38Z on `9b07770c`): on approval the workflow posts `/oc test`; then the Tester, the eval, the PAT sweep; on approve #827 closes, then one `curate` on #825. On `lab`, route lab only.
3. **#821 review** (live 03:25:31Z on `dce109e4`): on approval the workflow posts `/oc test`; add `test-windows` first plus `test-linux` and `test-macos`; then the binding eval on the settled head, the in-session merge, and the #792 closure. On findings exactly one `fix`.
4. **#804 fresh review** (not yet dispatched): eligible after 04:00:53Z on `411f5c6e`; one fresh head-bound review is the whole recovery.
5. **#825**: blocked on the #829 merge.
6. **#745**: parked behind #803.

## The serialized infra queue

1. #829 review (live), then Tester, eval, PAT merge, #827 closes, then one `curate` on #825.
2. #830 Tester (live), then eval, PAT merge, #828 closes.
3. #804 fresh review (post 04:00:53Z), then the read-only Tester, eval, PAT merge, #798 closes.
4. After #829/#830/#804 merge: reconcile #812/#815 plus the #822 round-4 residuals (R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims) and the #804 env-seam lessons into one scoped audit pass.
5. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
6. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
7. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#822**: merged at 10:18:56Z on 7a23aa2b; #820 and #775 closed; Pages green. CLOSED OUT.
2. **#827 (live review)**: the rebase landed as `9b07770c`; review 42334793977 is live; then the Tester and eval; on approve one `curate` on #825.
3. **#825 (blocked)**: archived README relative links and dead hosted build links; no branch/PR; remediation blocked on the #829 merge.
4. **#804 (wall death, fresh pass due)**: review 42332509616 died at 03:30:26Z on the wall; the lifetime budget is spent; dispatch one fresh head-bound review on `411f5c6e` after 04:00:53Z.
5. **#830 (Tester live)**: on approve-test route the eval, then the PAT sweep; #828 closes.
6. **#821 (review live)**: fresh pass 42333951638 on `dce109e4`; on approval the Tester (native rows with `test-windows` first), the eval, the merge, and the #792 closure. If it caps, `lab` for review headroom.
7. **The recurring daily wall**: per-egress-IP and recurring; fresh-run recovery after the cooldown; the intake and recovery chain behave as designed. The Owner capacity decision remains the critical path.
8. **#828 overloaded-detector fix**: in the #830 Tester lane; on approve-test the eval follows and #828 closes.
9. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
10. **#812**: held behind the infra queue; includes the R32 forward-target gap and the dead `outcome=skipped` note.
11. **#814**: held behind #803; coordinate the same verify region.
12. **#815**: held behind the infra queue (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
13. **#817 / #819 merged leftovers**: the deferred Curator docs pass and the deferred Lab Engineer docs pass still wait behind the infra queue.
14. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
15. **#804 env-seam lesson**: GitHub compares workflow env keys case-insensitively; every future env pin must keep one spelling per key and validate the whole tree before pushing.
16. **Pages**: green on `7a23aa2b` (42334800507, 03:36:44Z). CLOSED OUT.
17. **Curator lane**: cap fix in #829 pending review; no curator dispatch before it merges and the cooldown clears.
18. **Cron watch**: Maintainer schedule ticks remain best-effort (`*/20`); event wakes deliver. The outage window showed intake stand-downs and recovery dispatches rather than lost work.
19. **Wall watch**: fresh runs currently recover; the #804 death is the second wall death since the midnight reset and both came after real work. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
20. **Cap watch**: the curator cap fix is in #829; the #821 review 90-minute cap is on watch; the eval and lab caps are unchanged.
21. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
22. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears. Current pin and ladder stay until then.
23. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; the concurrent session 42333769401 may publish a late STATE. The next run must dedupe against its decisions and comments before dispatching anything.
24. **Board pin**: #70 is pinned and verified. CLOSED OUT.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #829, #830) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the reset or the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- The quota-wall intake stands a failure-triage run down on the canonical annotation and chains no recovery, so a wall-dead lane with a spent lifetime budget needs an explicit fresh head-bound dispatch from me.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- The provider's transient overload class (bracketed or plain `Upstream request failed: ...`, #828) is fixed by #830 pending the Tester and eval; until it merges, an overload death is a provider-load death, not a wall death, and the recovery is a fresh pass after the cooldown.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#804**: after 04:00:53Z, if no verdict and no fresh review run exists, dispatch exactly one `review` on `411f5c6e`. This is the whole recovery for the wall death; the lifetime budget is spent.
2. **#829**: read the review on `9b07770c` (run 42334793977). On approval the workflow posts `/oc test`; then the Tester, the eval, and the PAT merge; on approve #827 closes and dispatch exactly one `curate` on #825. On `lab`, route lab only. Do not duplicate the live review.
3. **#830**: read the Tester 42335007632. On `approve-test` route `eval`; then the PAT sweep on `approve-eval`, and #828 closes. On `lab`, route lab only.
4. **#821**: read the fresh review on `dce109e4` (run 42333951638). On approval add `test-windows` first plus `test-linux` and `test-macos`, then the binding eval on the settled head, the in-session merge, and the #792 closure. On findings exactly one `fix`. If it caps again, dispatch `lab` for review-arm headroom. Never dispatch a duplicate while 42333951638 is live.
5. **#825**: no dispatch until #829 merges.
6. Dedupe against late decisions from concurrent run 42333769401; re-check held runs and the four permanently queued runs.
7. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #829 review approve `9b07770c` after the rebase, unblocking #825?
2. Does the #830 Tester approve `4c804eee`, so the eval chain and the #828 closure can proceed?
3. Does the fresh #804 review (post 04:00:53Z) survive the wall long enough to return a verdict on `411f5c6e`?
4. Does the fresh #821 review (live 42333951638) survive the wall long enough to return a verdict on `dce109e4`, and does the product lane then pass the Tester and the binding eval?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path while the daily wall recurs.
