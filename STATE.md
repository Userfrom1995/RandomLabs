# STATE

Last updated: 2026-11-06T08:05Z by run 42182097294 (failure triage of the failed curator self-heal run 42175554810). This run dispatched the overdue #821 fresh review, filed the curator cap-headroom issue, and published status notes on #70, #822, and #825. The #822 binding eval died at its 105-minute agent cap and is cooldown-bound to 08:17:21Z.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 07:37-08:05Z)

- **main** = `e806f0c838439a0932c0845e66d9f103f4d85ea3` (`curate: restore the favicon declaration on the play redirect (Fixes #823)`), unchanged since the 04:52:24Z #824 rebase merge. Pages deploy 42165709081 SUCCESS at 05:00:17Z on this tip; nothing new to deploy.
- **Open PRs**: #822, #821, #804, #745 (4). #822, #821, #804 are CLEAN/MERGEABLE; #745 is CONFLICTING/DIRTY and parked behind #803.
- **Open issues**: 22. #825 is the new curator finding (archived README pre-archive links and two dead hosted links). Every other issue stays triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the three GitHub dynamic Dependabot Updates / Dependency Graph / pages-build-deployment names sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Curator failure (this run's trigger)**: two dead passes in the 06:00Z cycle.
  - Attempt 1, schedule run 42169523085 (05:37:30Z): about 59 minutes of real work, then the provider daily free-usage wall at 06:36:46Z (`FreeUsageLimitError`, #754 class). No decision file; the verify queued the one bounded self-heal re-dispatch.
  - Attempt 2, run 42175554810 (06:36:53Z): fresh bucket, completed the audit, created #825 at 07:35:49Z, created local branch `opencode/issue825-curate-archive-readme-links` at 07:36:34Z, then hit the 60-minute agent cap at 07:37:17Z (`##[error]The action has timed out.`) while reading the affected READMEs. No commit, push, decision file, or PR. Verified: no `opencode/825*` branch exists on origin.
  - The verify hit the self-heal cap of 1 and escalated on #70 (comment 6679792534). The curator lane is idle until the next 6-hour tick (about 12:00Z).
  - The escalation's inline trigger spawned the expected #775-class false General session (opencode run 42182090377); it posted an independent signed diagnosis on #70 at 07:53:43Z and opened nothing. #822 carries the durable #775 fix (Closes #775).
- **#822 eval cap death**: binding eval run 42171904253 worked continuously from 06:02:02Z (deep audit of the R34/audit diff, repeated silent-stall-audit runs, a general subagent still live at 07:46:32Z) and timed out at 07:47:21Z at the 105-minute agent cap. Verify failed closed: no decision, no verdict, no marker, no forward. The eval triage maintainer run 42183187195 (07:47:29Z) was cancelled by the 07:53:56 single-slot supersession batch. Cooldown ends 08:17:21Z.
- **#821 (product, `Closes #792`)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398` unchanged, CLEAN/MERGEABLE, 23 files, all under `maze-chase/` plus its `progress/` file (product code, so `fix` is valid). The 30-minute cooldown from the 06:38:34Z fourth wall death ended at 07:08:34Z and no pass is live, so this run dispatched exactly one fresh head-bound review: the fifth fresh pass today.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `dd046a5d92bff9b8723150b7b6853d350f6708c2` unchanged, CLEAN/MERGEABLE. Owner-authored tester verdict at 05:52:37Z; no `eval-verdict: approve-eval` marker. Fresh eval due from the first wake after 08:17:21Z. Never `fix`/`continue` (infrastructure guard).
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE. Lab Engineer repair run 42170414969 has been live since 05:46:44Z (150-minute agent cap lands about 08:16:44Z). Never `fix`/`continue`.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#824 / #823**: merged and closed at 04:52:24-04:52:26Z; deployment verified by run 42164734984. CLOSED OUT.
- **Wall watch**: the wall is per-egress-IP. The 06:38 death carried an 18.3-hour retry-after for its bucket, and the curator attempt 1 hit the same class. Fresh buckets still work (the #804 lab has run 2h+ and this session is normal), but today's provider is slow (curator turns about 100s each). Standing plan: one fresh pass per lane after the 30-minute cooldown; if new runners start dying within seconds, stop the fresh passes and escalate the capacity ask.
- **Cap watch**: two cap deaths in this cycle (curator 60-minute agent cap; #822 eval 105-minute agent cap). The curator cap is structurally starved (60/75 leaves 15 minutes of post-agent headroom) and is filed for lab. The eval cap is one death on a slow-provider day and stays a watch item until a second consecutive cap death, at which point it becomes a lab issue with both runs as evidence.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the last check. The wall and the slowdown are quota/throughput problems, not model retirement; no ladder change.
- **Untriaged sweep**: #825 is the only new issue; it is the curator lane's own deliverable and is blocked on the cap fix, not routed to architect/build/lab. The curator cap issue created this run is routed by its self-triage dispatch; if that misfires it must be triaged to `lab` on the next wake.
- **Concurrent wakes**: the `maintainer` skip/cancelled clones are expected single-pending-slot supersession and skip-only cohorts by design (issue #601). The pending 42183908930 will re-survey fresh. Maintainer schedule ticks remain best-effort; event wakes deliver.

## The live lanes (do not duplicate)

1. **#821 review** - the fifth fresh head-bound pass was dispatched at about 08:00Z on `dce109e4`. On approval the workflow forwards `/oc test`; then the Tester verdict, `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), one binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings, exactly one `fix` (product PR).
2. **#822 eval** - cooldown-bound to 08:17:21Z. The first wake after that dispatches exactly one fresh binding eval on `dd046a5d` if no eval is live and the head is unchanged. On `approve-eval` verify the owner-authored head-bound marker is newer than the 05:52:37Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges the workflow-touching PR (branch kept) and #820/#775 close; confirm Pages is green. On `fix`, route `lab` only.
3. **#804 lab repair** - Lab Engineer run 42170414969 live since 05:46:44Z on the #804 branch (env-seam pins plus the R34 decoy-proxy fixture, rebased onto `e806f0c8`; head still `17b11d32`). On its push the review cycle restarts, then the Tester and the binding eval; on `approve-eval` the PAT sweep merges and #798 closes. Never `fix`/`continue`.
4. **Curator cap fix** - the issue created this run (title `[Infra] Curator agent cap starves the public-surface audit: ...`) is routed by its self-triage dispatch to the Lab Engineer. After it lands, dispatch one `curate` on #825 to produce the remediation PR.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. The new curator cap-headroom issue is a separate lab task; sequence it against #804/#822 to avoid a third rebase conflict in the audit file (the cap assertion lands in `silent-stall-audit.sh`).
3. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34). Fold in the #822 round-4 non-blocking residuals (R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims) and the #804 env-seam class lessons (proxy/TLS pins across every post-agent owner-PAT step and helper-script unset lists).
4. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
5. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
6. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#821**: fifth fresh review dispatched on `dce109e4` after the cooldown; then the Tester, native rows with `test-windows` first, and the binding eval.
2. **#822**: tester-approved; the binding eval died at the 105-minute cap at 07:47:21Z; one fresh eval after the 08:17:21Z cooldown; then the marker chain, the PAT sweep, #820 and #775 closures.
3. **#804**: Lab Engineer env-seam repair live; then the review, Tester, and eval chain; #798 closes on approve.
4. **#825**: curator finding stranded by the cap death; remediation queued behind the curator cap fix.
5. **Curator cap issue**: created this run, self-triage routes lab; verify on the next wake that the lab dispatch actually happened.
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
16. **Curator lane**: idle until the next 6-hour tick (about 12:00Z); the cap fix is the durable recovery.
17. **Cron watch**: Maintainer schedule ticks remain best-effort; event wakes deliver. Watch item, not a production stop.
18. **Wall watch**: per-egress-IP and recurring; the 06:38 death carries an 18.3-hour retry-after for its bucket. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
19. **Cap watch**: the curator arm is filed; the eval arm is a watch item pending a second consecutive cap death. Slow provider throughput (about 100s per turn) is the underlying driver today.
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
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- A cap death at the wire is a headroom problem only when the arm's shape leaves under 20 minutes of post-agent headroom or the death repeats on a healthy bucket; one slow-provider cap death is a watch item, not an automatic lab dispatch.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#822 first if it is after 08:17:21Z**: dispatch exactly one fresh binding eval on `dd046a5d` (no duplicate if a pass is already live). Read the verdict: on `approve-eval` verify the owner-authored, head-bound marker chain and let the PAT sweep merge; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only. If this fresh pass also hits the 105-minute cap, file the eval cap-headroom issue with both runs as evidence and route lab.
2. **#821**: read the fifth fresh review. On approval wait for the workflow's `/oc test` and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix`. If it dies on the wall again, respect the next 30-minute cooldown and dispatch at most one fresh pass.
3. **Curator cap issue**: confirm the self-triage lab dispatch exists; if not, route `lab` on the issue. After the cap fix lands, dispatch one `curate` on #825 for the remediation PR.
4. **#804**: read the Lab Engineer outcome. On its push the review cycle restarts, then the Tester and the binding eval; on approve the PAT sweep merges and #798 closes. On `fix`, stay with `lab`.
5. Re-check held runs and the four permanently queued runs.
6. After #804/#822 merge: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the two deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).
7. Record the Owner capacity decision when given.
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the post-08:17Z #822 fresh eval finish inside the 105-minute cap and return a verdict, or does it need cap headroom as well?
2. Does the post-08:00Z #821 fresh review finish inside one runner bucket and return a verdict, or does the wall clip this lane again?
3. Does the curator cap fix land cleanly in the shared audit file without a third rebase conflict, and does #825 then get its remediation PR?
4. Does the #804 Lab Engineer fix close the proxy/TLS env seam and clear the binding eval gate on the rebased head?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
