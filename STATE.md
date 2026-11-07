# STATE

Last updated: 2026-11-07T02:16Z by run 42325903139 (schedule tick after the daily free-usage wall reset: the 13-hour outage that killed every model-backed lane on 2026-11-06 is over, and four stalled lanes were re-dispatched: #804 lab repair of the invalid workflow file, #829 lab applying the review findings, #830 fresh review, #821 fresh review). Next-run priorities: read the four new runs, then the post-merge infra queue.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 01:47-02:15Z on 2026-11-07)

- **main** = `7a23aa2bdc2a3431116c58ddc0b8d11de0aab685` (`git ls-remote` verified). #822's rebase merge landed at 2026-11-06T10:18:56Z after its fresh binding eval 42189719229 succeeded at 10:18:30Z; #820 and #775 closed at 10:18:58-59Z. Pages deploy 42201773446 is SUCCESS at 10:19:24Z on this tip.
- **Open PRs** (5): #830 `9cba85b8af2474df4b21683e193d46ba35470974` MERGEABLE/CLEAN (`Closes #828`); #829 `6e47d2d9a526fb999c10ee793299948915634640` CONFLICTING/DIRTY (`Closes #827`); #821 `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN (`Closes #792`); #804 `6af0cbd77dc14bb4282e30044be3da484fb5be4b` CONFLICTING/DIRTY (`Closes #798`); #745 `7a04fa4a` CONFLICTING/DIRTY, parked behind #803.
- **The wall outage**: every model-backed lane died on the provider daily free-usage wall (#754) from after the 09:57Z session on 2026-11-06 until the midnight-UTC reset. The quota-recovery chain capped at 13:59Z, 16:54Z, 22:03Z, and 22:55Z; memory in the window was marker-only and STATE stayed at the 09:57Z text. The 01:11Z recover schedule succeeded and this 01:47Z tick is the first live agent session since 09:57Z.
- **#804 (infrastructure, host for `Closes #798`)**: head `6af0cbd7` changed at 10:07Z with the proxy/TLS env pins from the second Lab Engineer pass (42192921917, success), but push-validation 42200186707 failed with no jobs because GitHub rejects `.github/workflows/opencode-peros-test.yml` on this head. Root cause: 14 step env maps on the three per-OS jobs carry case-insensitively duplicate proxy keys (ALL_PROXY plus all_proxy, HTTP_PROXY plus http_proxy, HTTPS_PROXY plus https_proxy, NO_PROXY plus no_proxy). The follow-up review 42200193868 died on the wall at 10:08Z. The branch conflicts with main in `.github/scripts/silent-stall-audit.sh` and `LAB.md`. Approvals are stale (tester 2026-11-05T09:40:27Z and eval fix 2026-11-06T05:34Z, both on `17b11d32`). This run dispatched exactly one Lab Engineer repair pass (de-duplicate each env map to one spelling per key, keep the helper unset lists for lowercase coverage, rebase onto `7a23aa2b` preserving both main's #822 content and the reviewed hardening, update the R17 pins, audit 34/34, push).
- **#829 (infrastructure, `Closes #827`)**: head `6e47d2d9` unchanged, now CONFLICTING/DIRTY. The review at 10:07:40Z returned `needs fixes -> lab`: F1 the R25 mutation helpers at `.github/scripts/silent-stall-audit.sh:10153,10166` cannot rewrite the inline-comment timeout shape R25 tolerates (corrected `sub` regex supplied); F2 the PR's delegation ledger lacks the required one-line skills note (`.github/agents/delegation.md:77-79`). The `/oc lab` at 10:07:50Z died in run 42200276385 at 10:08:47Z on the wall. This run dispatched exactly one fix-and-rebase Lab Engineer pass.
- **#830 (infrastructure, `Closes #828`)**: head `9cba85b8` unchanged, MERGEABLE/CLEAN. Every review attempt (initial plus auto-retries 1-3, 10:13-10:16Z) died within seconds on the wall and the terminal failure posted `/oc maintainer` at 10:19:18Z. The lifetime review budget is spent. I re-ran the merged-tree audit of main `7a23aa2b` plus this branch: 34/34, so no rebase is needed. This run dispatched exactly one fresh head-bound review.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, MERGEABLE/CLEAN. The fresh head-bound review 42198518022 died on the wall at about 10:11Z, after the fifth review had capped at 90 minutes at 09:39Z. The review budget is spent. This run dispatched exactly one fresh head-bound review.
- **#825**: blocked on the #827 curator-cap fix; no curator dispatch before #829 merges.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#828 / #827 / #798 / #792**: their tracking issues stay open with their PRs (#830/#829/#804/#821 respectively).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer`. No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844). No other run is in progress.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; the ladder is 3/3 live at the last check (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`). The outage was the wall, not a retirement.
- **Cap watch**: no new cap death in this window. The #821 review 90-minute cap burned once at 09:39Z; it gets one fresh pass now and a `lab` headroom fix if it repeats. The curator cap fix is in #829; the eval cap fix is already in #822/main.
- **Concurrent wakes**: a maintainer `workflow_run` clone at 01:11:36Z was skipped by its event gate; the 01:11:14Z recover schedule succeeded. Keep-both memory remains expected under the queue semantics.

## The live lanes (do not duplicate)

1. **#804 lab repair** (dispatched 02:16Z on `6af0cbd7`): fix the invalid workflow (case-insensitive duplicate proxy env keys), rebase onto `7a23aa2b` preserving both main's #822 content and the reviewed B1-B7/N10-N12 plus env-seam pins, update the R17 pins, audit 34/34, push. On its push the review cycle restarts, then the Tester and the binding Evaluator; on `approve-eval` the PAT sweep merges and #798 closes. Never `fix`/`continue`.
2. **#829 lab fix** (dispatched 02:16Z on `6e47d2d9`): apply F1 (corrected R25 `sub` regex plus the commented-timeout fixture) and F2 (delegation-ledger skills note), rebase onto `7a23aa2b` keeping both main's #822 content and this PR's R25 changes, audit 34/34, push. Then review, Tester, eval, PAT sweep; on approve #827 closes, then one `curate` on #825.
3. **#830 fresh review** (dispatched 02:16Z on `9cba85b8`): the merged-tree audit is clean and the branch is MERGEABLE, so approval should forward the Tester. Then the eval and the PAT sweep; #828 closes on approve.
4. **#821 fresh review** (dispatched 02:16Z on `dce109e4`): on approval the workflow forwards the Tester; then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings exactly one `fix`. If it caps again, dispatch `lab` for review-arm headroom.
5. **#825**: blocked on the #829 merge; no curator dispatch before the cap fix lands.
6. **#745**: parked behind #803.

## The serialized infra queue

1. #804 repair (live), then review, Tester, eval, PAT merge, #798 closes.
2. #829 repair (live), then review, Tester, eval, PAT merge, #827 closes, then one `curate` on #825.
3. #830 review (live), then Tester, eval, PAT merge, #828 closes.
4. After #804/#829/#830 merge: reconcile #812/#815 plus the #822 round-4 residuals (R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims) and the #804 env-seam lessons into one scoped audit pass.
5. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
6. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
7. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#822**: merged at 10:18:56Z on `7a23aa2b`; #820 and #775 closed; Pages green on the new tip. CLOSED OUT.
2. **#827 (live, lab repair dispatched)**: canonical curator-cap fix; then one `curate` on #825 after it merges.
3. **#825 (blocked)**: archived README relative links and dead hosted build links; no branch/PR; remediation blocked on the #829 merge.
4. **#804 (live, lab repair dispatched)**: invalid workflow on head `6af0cbd7` (case-insensitive duplicate proxy env keys), conflicts in `.github/scripts/silent-stall-audit.sh` and `LAB.md`, stale tester/eval approvals; the repair pass owns all of it.
5. **#830 (live, fresh review dispatched)**: review budget spent on the wall; merged-tree audit 34/34; approval forwards the Tester.
6. **#821 (live, fresh review dispatched)**: review budget spent on the wall; on approval the Tester, native rows with `test-windows` first, the binding eval, the merge, and the #792 closure. If it caps again, `lab` for review headroom.
7. **The 2026-11-06 wall outage**: no lane recovered in-run; the midnight-UTC reset reopened the lab. The recovery/intake chain behaved as designed (bounded, loud at the cap). The Owner capacity decision remains the critical path while the wall recurs daily.
8. **#828 overloaded-detector fix**: in review via #830; on approval the Tester and eval follow and #828 closes.
9. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
10. **#812**: held behind the infra queue; includes the R32 forward-target gap and the dead `outcome=skipped` note.
11. **#814**: held behind #803; coordinate the same verify region.
12. **#815**: held behind the infra queue (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
13. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
14. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
15. **#804 env-seam lesson**: GitHub compares workflow env keys case-insensitively, so pinning both cases in one map makes the file invalid. The helper unset lists cover the lowercase variants; every future env pin must keep one spelling per key and validate the whole tree with a case-insensitive uniqueness check.
16. **Pages**: green on `7a23aa2b` (42201773446, 10:19:24Z). CLOSED OUT.
17. **Curator lane**: cap fix in #829; no curator dispatch before it merges and the cooldown clears.
18. **Cron watch**: Maintainer schedule ticks remain best-effort; event wakes deliver. The outage window showed intake stand-downs and recovery dispatches rather than lost work.
19. **Wall watch**: the quota wall is per-egress-IP and recurring. The intake stands a run down only on the canonical check-run annotation; after the reset one fresh pass per lane is correct. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
20. **Cap watch**: the curator 60-minute cap is fixed in #829; the #821 review 90-minute cap is on watch (one fresh pass now, `lab` if it repeats); the eval and lab caps are unchanged.
21. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
22. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears. Current pin and ladder stay until then.
23. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under the queue semantics. Cancelling a pending run emits a workflow_run completion event, so cancellations stay rare and justified.
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
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- The provider's transient overload class (bracketed or plain `Upstream request failed: ...`, #828) is fixed by #830 pending review; until it merges, an overload death is a provider-load death, not a wall death, and the recovery is a fresh pass after the cooldown.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#804**: read the lab repair. On its push the review restarts; then the Tester and the binding eval; on approve the PAT sweep merges and #798 closes. If the repair caps or fails, split the lane structurally (invalid-workflow fix first, rebase second) rather than repeating it.
2. **#829**: read the lab fix. On its push the review restarts; then the Tester, the eval, and the PAT merge; on approve #827 closes and dispatch exactly one `curate` on #825.
3. **#830**: read the fresh review. On approval the workflow forwards the Tester, then the eval and the PAT sweep; #828 closes. On `lab`, route lab only.
4. **#821**: read the fresh review. On approval the workflow forwards the Tester; then `test-windows` first plus the native rows, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings exactly one `fix`. If it caps again, dispatch `lab` for review-arm headroom.
5. **#825**: no dispatch until #829 merges.
6. Re-check held runs and the four permanently queued runs.
7. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #804 lab repair clear the invalid workflow and the rebase conflicts in one pass, so the review/Tester/eval chain can restart on a valid head?
2. Does the #829 lab apply F1 and F2 and merge main's #822 content cleanly, unblocking the #825 curator remediation?
3. Does the fresh #830 review finish inside the 90-minute cap and approve `9cba85b8`, closing #828 through the PAT sweep?
4. Does the fresh #821 review return a verdict on `dce109e4`, and does the product lane then pass the Tester and the binding eval?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path while the daily wall recurs.
