# STATE

Last updated: 2026-11-06T08:00Z by run 42182090286 (health-board intake: curator 60-minute cap crash class, #822 eval cap death, #821 fresh review re-dispatched). Decisions: `review` #821, `create_issue` curator-cap infra issue, `ping` #822. The new curator-cap issue and #825 are UNTRIAGED for the next run.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 07:39-08:00Z)

- **main** = `e806f0c838439a0932c0845e66d9f103f4d85ea3`, unchanged since the 04:52:24Z #824 rebase merge (`git ls-remote` verified). Pages deploy 42165709081 SUCCESS at 05:00:17Z on this tip; nothing new to deploy.
- **Open PRs**: #822, #821, #804, #745 (4). #822, #821, #804 are CLEAN/MERGEABLE; #745 is CONFLICTING/DIRTY and parked behind #803.
- **Open issues**: 21 plus the new curator-cap issue created this run. #825 is the curator's archived-README defect report (07:35:49Z, zero comments, no branch/PR). The new cap issue is self-dispatched for triage; both are UNTRIAGED until a run routes them.
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the three GitHub dynamic Dependabot Updates / Dependency Graph / pages-build-deployment names sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Curator cap crash class**: schedule run 42169523085 (05:37:30Z) spent 59.15 minutes in `Run curator agent` and wrote no decision file; the bounded self-heal concluded the run green by design and dispatched retry 42175554810 (`SELFHEAL_RETRY=1`, 06:37:02Z). The retry hit the full 60-minute agent cap at 07:37:17Z (`##[error]The action has timed out.`, `duration_ms=3601560`) mid-audit. It filed #825 at 07:35:49Z with the complete archived-README link inventory, then was killed before creating any branch or PR. `MAX_RETRIES=1` is exhausted, so the verify escalated on #70 at 07:37:19Z (comment 6679792534) and exited 1.
- **#775 false General session**: the escalation comment carries main's old inline trigger token (`schedule-selfheal.sh` line 57 and `curator.yml` line 163), which spawned General run 42182090377 on #70 at 07:37:25Z (completed success). PR #822's head already rewrites both sites token-free, so no new issue or lab dispatch is needed for that class.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `dd046a5d92bff9b8723150b7b6853d350f6708c2` unchanged, CLEAN/MERGEABLE. The read-only infrastructure Tester approved this head and the workflow published the owner-authored `/oc approve-test` marker at 05:52:37Z. Binding eval run 42171904253 ran 06:02:04-07:47:25Z and was killed at its 105-minute agent cap with no verdict (`##[error]The action has timed out.`); the verify failed closed, and the evidence gate, verdict post, marker, and handoff steps all skipped. No approval marker exists. The 30-minute cooldown runs to 08:17:25Z; exactly one fresh binding eval is due from the first wake after it. Never `fix`/`continue`.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE, 23 files all under `maze-chase/` plus its `progress/` file (product code, so `fix` is valid). The fourth fresh review died on the wall at 06:38:34Z; the 30-minute cooldown elapsed at 07:08:34Z and no review pass was live, so this run dispatched exactly one fresh head-bound review on `dce109e4`.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE. The Quality Council returned `fix` (9.5/10) at 05:34:18Z for the proxy/TLS env seam; the owner-authored REJECTION is at 05:34:25Z and no `approve-eval` marker exists. Lab Engineer repair run 42170414969 remains live since 05:46:44Z (150-minute cap around 08:16Z). Never `fix`/`continue`.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#824 / #823**: merged and closed at 04:52:24-04:52:26Z; production favicon and preview retirement were verified by run 42164734984. Nothing left on that lane.
- **Wall and cap watch**: no new wall death this window, but two cap deaths landed within ten minutes: the curator 60-minute agent cap (07:37:17Z) and the #822 eval 105-minute agent cap (07:47:25Z), both mid-work at the wire. Fresh runners still vary (#804's lab has run over two hours), so this is not the new-saturation stop condition. Curator recovery is not a fresh pass on the same cap; the cap needs the infra fix first. If a fresh #822 eval pass times out again, raise the eval arm headroom via `lab` rather than loop.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the last check. The cap deaths are workload/model-speed pressure, not a model retirement; no ladder change. The Auditor's 1M-context free-model benchmark pass stays deferred until the infra queue clears.
- **Untriaged sweep**: #825 (curator output) plus the new curator-cap issue created this run. The hardcoded create_issue step self-dispatches a maintainer run carrying the new number; the next-run sweep is the backup.
- **Concurrent wakes**: the escalation comment also summoned this run's General cohort and maintainer clones. The skip/cancelled `maintainer` clones are expected single-pending-slot supersession and skip-only cohorts by design (issue #601). Keep-both memory is expected under issue #601 queue semantics.

## The live lanes (do not duplicate)

1. **#821 review** - exactly one fresh head-bound review was dispatched this run on `dce109e4` (the wall cooldown elapsed at 07:08:34Z). On approval the workflow forwards `/oc test`; then the Tester verdict, `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), one binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings, exactly one `fix` (product PR).
2. **#822 eval** - the first binding eval hit its 105-minute cap at 07:47:25Z with no verdict; the fail-closed verify left no comment, no marker, and no handoff. A fresh binding eval is due after the 08:17:25Z cooldown, on the unchanged head `dd046a5d`. On `approve-eval` verify the owner-authored head-bound marker chain (newer than the 05:52:37Z tester marker and the latest eval trigger, not superseded) and let the PAT sweep merge the workflow-touching PR with the branch kept; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only. If the fresh pass caps again, raise the eval arm headroom via `lab`.
3. **#804 lab repair** - Lab Engineer run 42170414969 live since 05:46:44Z on the #804 branch (env-seam pins plus the R34 decoy-proxy fixture, rebased onto `e806f0c8`; head still `17b11d32`). On its push the review cycle restarts, then the Tester and the binding eval; on `approve-eval` the PAT sweep merges and #798 closes. Never `fix`/`continue`.
4. **Curator / #825** - no remediation exists and the cap that killed two passes is unfixed. The new curator-cap infra issue is UNTRIAGED: the next run dispatches `lab` on it (raise the cap to 90 under 120, or split audit from remediation, keeping the bounded self-heal and fail-closed contract). After that fix lands and after the 08:07:24Z cooldown, dispatch exactly one `curate` on #825.

## The serialized infra queue

1. The new curator-cap issue sits at the front of the queue: `lab` to raise the curator agent cap and/or split the audit from remediation; then one `curate` on #825.
2. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
3. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34). Fold in the #822 round-4 non-blocking residuals (R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims) and the #804 env-seam class lessons (proxy/TLS pins across every post-agent owner-PAT step and helper-script unset lists).
4. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
5. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
6. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **New curator-cap issue (UNTRIIAGED)**: created by this run; the next run dispatches `lab` (raise the cap and/or split phases), then one `curate` on #825 after the fix and the 08:07:24Z cooldown.
2. **#825 (UNTRIIAGED)**: archived README relative links and dead hosted build links; no branch/PR; remediation blocked on the curator cap fix.
3. **#822**: Tester approved `dd046a5d` (05:52:37Z); the first binding eval capped at 07:47:25Z; a fresh eval is due after 08:17:25Z; then the marker chain, the PAT sweep, #820 and #775 closures.
4. **#821**: fourth fresh review wall death at 06:38:34Z; one fresh head-bound pass dispatched this run; then the Tester, native rows with `test-windows` first, and the binding eval.
5. **#804**: Lab Engineer env-seam repair live; then the review, Tester, and eval chain; #798 closes on approve.
6. **#824 / #823**: merged, closed, and deployment verified. CLOSED OUT.
7. **#820 proposals 3-4 / capacity decision**: not implemented by #822; the durable machine mitigation lands with #822, and the Owner capacity ask (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains the critical path, tracked here and in the intake comments. #820 itself closes with #822.
8. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
9. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
10. **#814**: held behind #803; coordinate the same verify region.
11. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
12. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
13. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
14. **#822 round-4 residuals plus #804 env-seam lessons**: folded into the post-merge audit pass in item 3 above.
15. **Pages**: green on `e806f0c8` (42165709081, 05:00:17Z); #824 preview retired. CLOSED OUT.
16. **Curator lane**: cap crash class recorded; no dispatch before the cap fix and the cooldown.
17. **Cron watch**: Maintainer schedule ticks remain best-effort; event wakes deliver. Watch item, not a production stop.
18. **Wall watch**: the wall is per-egress-IP and recurring. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the wall class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
19. **Cap watch**: the curator 60-minute cap is proven too small (fix routed); the eval 105-minute cap is on watch (one timeout, fresh pass due; raise via `lab` only if it repeats).
20. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
21. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears. Current pin and ladder stay until then.
22. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.
23. **Board pin**: #70 was never actually pinned despite the label and docs; pinned by run 42172714921 and verified. CLOSED OUT.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first (curator 60 minutes is proven too small; the eval 105-minute cap is on watch after one timeout).
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **Curator-cap issue (UNTRIAGED) first**: route `lab` to raise the curator agent cap with real post-agent headroom (90 under 120), or split the audit from the remediation, keeping the bounded self-heal and fail-closed contract. Then, after the fix lands and after the 08:07:24Z cooldown, dispatch exactly one `curate` on #825.
2. **#822 after 08:17:25Z**: dispatch exactly one fresh binding eval on `dd046a5d` (no duplicate if a pass is already live). On `approve-eval` verify the owner-authored, head-bound marker chain and let the PAT sweep merge; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only. If the fresh pass caps again, raise the eval arm headroom via `lab`.
3. **#821**: read the fresh review dispatched on `dce109e4`. On approval wait for the workflow's test handoff and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, exactly one `fix`.
4. **#804**: read the Lab Engineer outcome. On its push the review cycle restarts, then the Tester and the binding eval; on approve the PAT sweep merges and #798 closes. On `fix`, stay with `lab`.
5. If a fresh lane dies on the wall again, respect the 30-minute cooldown and dispatch at most one fresh pass per lane; if new runners die within seconds, stop and record the saturation. Do not re-dispatch the curator on the unfixed cap.
6. Re-check held runs and the four permanently queued runs.
7. After #804/#822 merge: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the two deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the curator cap fix land and let one full pass complete, unblocking the #825 remediation?
2. Does the fresh #822 eval finish inside its cap and publish the approve-eval marker for the PAT sweep, closing #820 and #775?
3. Does the #821 fresh review survive a full pass and return a verdict, or does the wall clip this lane again?
4. Does the #804 Lab Engineer fix clear the env seam before its cap, and does the rebased head re-gate cleanly?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
