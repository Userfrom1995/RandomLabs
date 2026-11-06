# STATE

Last updated: 2026-11-06T08:50Z by run 42186571991 (failure triage of the #804 env-seam Lab Engineer cap death). This run dispatched the time-boxed #804 lab retry after its cooldown. A concurrent Maintainer session had already posted the overdue #822 binding eval (08:43:23Z) and the #827 curator-cap lab pass (08:43:24Z), and closed duplicate issue #826 in favour of #827. Do not duplicate any of those live lanes.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 08:19-08:50Z)

- **main** = `e806f0c838439a0932c0845e66d9f103f4d85ea3`, unchanged since the 04:52:24Z #824 rebase merge (`git ls-remote` verified). Pages deploy 42165709081 SUCCESS at 05:00:17Z on this tip; nothing new to deploy.
- **Open PRs**: #822, #821, #804, #745 (4). #822/#821/#804 CLEAN/MERGEABLE; #745 CONFLICTING/DIRTY and parked behind #803.
- **Open issues**: #827 is the canonical curator cap-headroom issue; #826 is CLOSED as its duplicate (08:34:49Z). #825 is the curator archived-README finding. Every other issue stays triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the three GitHub dynamic Dependabot Updates / Dependency Graph / pages-build-deployment names sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **#804 lab cap death (this run's trigger)**: repair run 42170414969 ran 05:46:44-08:17:00Z, spent the full 150-minute agent cap on the env-seam task, and was killed at 08:17:00Z (`##[error]The action has timed out.`). No decision file; the verify failed red as designed; strip/push/forward stayed disabled; the head is unchanged at `17b11d32` and nothing was pushed. The 30-minute cooldown ended at 08:47:00Z and THIS RUN dispatched one fresh time-boxed lab retry on #804 (the trigger posts as the owner after the session).
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `dd046a5d92bff9b8723150b7b6853d350f6708c2` unchanged, CLEAN/MERGEABLE. Owner-authored tester marker 05:52:37Z; no `eval-verdict: approve-eval` marker. The prior binding eval died at its 105-minute agent cap at 07:47:21Z; the cooldown ended 08:17:21Z and the concurrent maintainer wake posted a fresh `/oc eval` at 08:43:23Z. Eval run 42189719229 has been live since 08:43:26Z. Never `fix`/`continue`.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE, 23 files all under `maze-chase/` plus its `progress/` file (product code, so `fix` is valid). The fifth fresh review run 42185629539 has been live since 08:09:07Z; the duplicate queued trigger 42185894789 was cancelled, so exactly one pass is live. No findings yet.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE, 21 commits, 14 files. Quality Council verdict `fix` (9.5/10) at 05:34:18Z for the proxy/TLS env seam; owner-authored REJECTION at 05:34:25Z; no approval marker. The time-boxed retry is dispatched this run. Never `fix`/`continue`.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#826 / #827 duplicate pair**: #826 filed 08:09:05Z and #827 filed 08:11:20Z by two concurrent maintainer wakes. The concurrent session kept the fuller #827, closed #826 as a duplicate at 08:34:49Z, and posted `/oc lab` on #827 at 08:43:24Z. Lab Engineer run 42189720506 has been live since 08:43:27Z on the cap-headroom fix (90/120 caps, R25 assertion, curator prompt time-box).
- **#824 / #823**: merged and closed at 04:52:24-04:52:26Z; deployment verified. CLOSED OUT.
- **Wall and cap watch**: no new wall death this window. Three cap deaths today (curator 60-minute, #822 eval 105-minute, #804 lab 150-minute), all on a slow provider. The lab arm keeps its 30-minute post-agent headroom (150/180), so the #804 death is a task-size/throughput problem, not a cap-shape defect yet. The retry is time-boxed; if it caps again, split the task or raise the budget via lab rather than loop.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free in the live registry; the maintainer inline pin matches. No ladder change.
- **Concurrent wakes**: two Maintainer sessions ran in the same window (this one and the self-dispatched session that posted its decisions at 08:43), producing the #826/#827 pair, two review triggers (the duplicate was cancelled), and two near-duplicate health-board notes. Skip/cancelled clones are the expected single-pending-slot supersession (issue #601). The pending 42189748124 will re-survey fresh after this run.
- **Untriaged sweep**: #827 is triaged (lab live); #825 is filed by the curator lane and waits on the cap fix; no other untriaged issue.

## The live lanes (do not duplicate)

1. **#822 eval** - run 42189719229 live since 08:43:26Z on `dd046a5d`. On `approve-eval` verify the owner-authored head-bound marker is newer than the 05:52:37Z tester marker and the latest eval trigger (08:43:23Z) and is not superseded; the PAT sweep then merges the workflow-touching PR (branch kept) and #820/#775 close; confirm Pages is green. On `fix`, route `lab` only. On another 105-minute cap death, file the eval cap-headroom issue with both runs and route lab.
2. **#804 time-boxed lab retry** - dispatched this run after the 08:47:00Z cooldown. On its push the review cycle restarts, then the Tester and the binding eval; on approve the PAT sweep merges and #798 closes. On `fix`, stay with `lab`. Never `fix`/`continue`.
3. **#827 curator-cap lab** - run 42189720506 live since 08:43:27Z. It will open its own PR; on that PR run review, Tester, and the binding eval. When both the #804 and #827 lab PRs exist, land one first and rebase the second (both touch `silent-stall-audit.sh`); dispatch no further infra work until they settle.
4. **#821 review** - run 42185629539 live since 08:09:07Z. On approval the workflow forwards `/oc test`; then the Tester verdict, `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), one binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings, exactly one `fix` (product PR).
5. **#825 remediation** - dispatch one `curate` on #825 after the #827 cap fix lands.

## The serialized infra queue

1. #822 and #804 are the live merge-bound infra lanes. #827's cap-fix lab runs in parallel by the concurrent wake's decision; both it and the #804 retry touch `silent-stall-audit.sh`, so land whichever PR is ready first and rebase the second.
2. The new curator cap-headroom work is now in the #827 lab pass (90/120 caps plus the R25 assertion and the curator prompt time-box).
3. After #804/#822/#827 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34). Fold in the #822 round-4 non-blocking residuals (R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims) and the #804 env-seam class lessons (proxy/TLS pins across every post-agent owner-PAT step and helper-script unset lists).
4. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
5. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
6. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#822**: tester-approved at 05:52:37Z; fresh binding eval live since 08:43:26Z; then the marker chain, the PAT sweep, #820 and #775 closures.
2. **#804**: time-boxed lab retry dispatched after the 08:47:00Z cooldown; then the review, Tester, and eval chain; #798 closes on approve.
3. **#827**: curator cap-headroom lab live since 08:43:27Z; then its PR review, Tester, and eval chain.
4. **#821**: fifth fresh review live; then the Tester, native rows with `test-windows` first, the binding eval, the in-session merge, and the #792 closure.
5. **#826**: closed as a duplicate of #827 at 08:34:49Z by the concurrent session. CLOSED OUT.
6. **#825**: curator finding stranded by the cap death; remediation queued behind the #827 cap fix.
7. **#820 proposals 3-4 / capacity decision**: not implemented by #822; the durable machine mitigation lands with #822, and the Owner capacity ask (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains the critical path, tracked here and in the intake comments. #820 itself closes with #822.
8. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
9. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
10. **#814**: held behind #803; coordinate the same verify region.
11. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
12. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
13. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
14. **#822 round-4 residuals plus #804 env-seam lessons**: folded into the post-merge audit pass in item 3 above.
15. **Pages**: green on `e806f0c8` (42165709081, 05:00:17Z); #824 preview retired. CLOSED OUT.
16. **Curator lane**: idle until the next 6-hour tick (about 12:00Z); the #827 cap fix is the durable recovery.
17. **Cron watch**: Maintainer schedule ticks remain best-effort; event wakes deliver. Watch item, not a production stop.
18. **Wall watch**: per-egress-IP and recurring; the 06:38 death carries an 18.3-hour retry-after for its bucket. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
19. **Cap watch**: curator and eval arms have recorded cap deaths today; the #827 lab carries the curator fix, and the eval arm becomes a lab issue if this fresh pass also dies at the cap. The #804 lab retry is time-boxed.
20. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
21. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears. Current pin and ladder stay until then.
22. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.
23. **Board pin**: #70 was never actually pinned despite the label and docs; pinned by run 42172714921 and verified. CLOSED OUT.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822, #827's PR) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- A cap death at the wire is a headroom problem only when the arm's shape leaves under 20 minutes of post-agent headroom or the death repeats on a healthy bucket; one slow-provider cap death is a watch item unless the lane keeps capping.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **Read the #822 eval** (run 42189719229). On `approve-eval` verify the owner-authored, head-bound marker chain and let the PAT sweep merge; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only. If this pass also hits the 105-minute cap, file the eval cap-headroom issue with both runs as evidence and route lab.
2. **Read the #804 lab retry** (triggered this run). On its push the review cycle restarts, then the Tester and the binding eval; on approve the PAT sweep merges and #798 closes. On `fix`, stay with `lab`. If it caps again, split the task or raise the budget via lab rather than loop.
3. **Read the #827 lab pass** and its PR. When both the #804 and #827 lab PRs exist, land one first and rebase the second; dispatch no further infra work until they settle. Then the review, Tester, and eval chain for the #827 PR.
4. **Read the #821 fifth fresh review.** On approval wait for the workflow's `/oc test` and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix`. If it dies on the wall, respect the next 30-minute cooldown and dispatch at most one fresh pass.
5. **After the #827 cap fix lands**, dispatch one `curate` on #825 for the remediation PR.
6. Re-check held runs and the four permanently queued runs.
7. After the infra lanes merge: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the two deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the fresh #822 eval finish inside the 105-minute cap and publish the approve-eval marker for the PAT sweep, closing #820 and #775?
2. Does the time-boxed #804 lab retry land the env-seam fix without another cap death?
3. Does the #821 fifth fresh review finish inside one runner bucket and return a verdict, or does the wall clip this lane again?
4. Does the #827 cap fix land cleanly alongside the #804 retry without a third audit-file conflict?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
