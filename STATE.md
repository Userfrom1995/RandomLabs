# STATE

Last updated: 2026-11-06T06:50Z by run 42175757019 (failure triage of the failed #821 review run 42171979128). This run classified the fourth fresh-review wall death of the day, respected the 30-minute cooldown (ends 07:08:34Z), and posted a signed status note on #821. Decision: one `ping` on #821; no review dispatch yet.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 06:39-06:50Z)

- **main** = `e806f0c838439a0932c0845e66d9f103f4d85ea3` (`curate: restore the favicon declaration on the play redirect (Fixes #823)`), unchanged since the 04:52:24Z #824 rebase merge (`git ls-remote` verified). Pages deploy 42165709081 SUCCESS at 05:00:17Z on this tip; nothing new to deploy.
- **Open PRs**: #822, #821, #804, #745 (4). #822, #821, #804 are CLEAN/MERGEABLE; #745 is CONFLICTING/DIRTY and parked behind #803.
- **Open issues**: 21; every remaining issue is triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the three GitHub dynamic Dependabot Updates / Dependency Graph / pages-build-deployment names sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failure**: review run 42171979128 on #821 worked from 06:02:50Z and died at 06:38:26-06:38:34Z on the provider daily free-usage wall (`FreeUsageLimitError`, statusCode 429, retry-after 65,779 seconds, about 18.3 hours) after roughly 36 minutes of real work. No decision file, nothing published, nothing forwarded; the verify step hit the spent crash-parity budget (4 attempts) and failed closed, which summoned this run. This is the fourth fresh wall death on #821 today (02:45:30Z, 04:09:05Z, 05:24:17Z, 06:38:34Z).
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE, 23 files, all under `maze-chase/` plus its `progress/` file (product code, so `fix` is valid). The 30-minute cooldown from the 06:38:34Z death ends at 07:08:34Z, so this run did NOT dispatch another fresh pass. Exactly one fresh head-bound review is due from the first wake after 07:08Z.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `dd046a5d92bff9b8723150b7b6853d350f6708c2` unchanged, CLEAN/MERGEABLE. The read-only infrastructure Tester approved the head at 05:52:28Z and the workflow published the owner-authored `/oc approve-test` marker at 05:52:37Z. The binding eval 42171904253 has been live since 06:02Z (about 45 minutes at survey time); no verdict yet. Never `fix`/`continue` (infrastructure guard).
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE. The Quality Council returned `fix` (9.5/10) at 05:34:18Z for the proxy/TLS env seam; the owner-authored REJECTION is at 05:34:25Z and no `eval-verdict: approve-eval` marker exists. Lab Engineer repair run 42170414969 has been live since 05:46:44Z (about 61 minutes at survey time) with the env-pin, unset-list, rebase onto `e806f0c8`, and R34 decoy-proxy fixture instruction. Never `fix`/`continue`.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#824 / #823**: merged and closed at 04:52:24-04:52:26Z; production favicon and preview retirement were verified by run 42164734984. Nothing left on that lane.
- **Curator lane**: workflow_dispatch run 42175554810 has been live since 06:36:53Z. **Auditor**: the daily schedule run 42169101553 completed SUCCESS at 06:10Z; its report and handoff on #70 were handled by run 42172714921.
- **Wall watch**: the 06:38 death reports a retry-after of about 18.3 hours, so that egress bucket is exhausted for the day. Fresh runners still vary: the #822 eval has been live 45 minutes, the #804 lab 61 minutes, and this Maintainer session runs normally. Standing plan: one fresh pass per lane after the 30-minute cooldown; stop the fresh passes and record saturation only if new runners start dying within seconds.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the last check. The wall is a quota problem, not a model retirement; no ladder change.
- **Untriaged sweep**: none. No human comment anywhere after 06:20:30Z; the only new thread activity is the failed review run and this triage.
- **Concurrent wakes**: the `maintainer` skipped/cancelled clones are expected single-pending-slot supersession and skip-only cohorts by design (issue #601). Maintainer schedule ticks remain best-effort; event wakes deliver.

## The live lanes (do not duplicate)

1. **#822 eval** - binding eval run 42171904253 live since 06:02Z on `dd046a5d`. On `approve-eval` verify the owner-authored head-bound marker is newer than the 05:52:37Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges the workflow-touching PR (branch kept) and #820/#775 close; confirm Pages is green. On `fix`, route `lab` only.
2. **#821 review** - the fourth fresh pass died on the wall at 06:38:34Z with no verdict. Cooldown ends 07:08:34Z; the first wake after that dispatches exactly one fresh head-bound review on `dce109e4`. On approval the workflow forwards `/oc test`; then the Tester verdict, `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), one binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings, exactly one `fix` (product PR).
3. **#804 lab repair** - Lab Engineer run 42170414969 live since 05:46:44Z on the #804 branch (env-seam pins plus the R34 decoy-proxy fixture, rebased onto `e806f0c8`; head still `17b11d32`). On its push the review cycle restarts, then the Tester and the binding eval; on `approve-eval` the PAT sweep merges and #798 closes. Never `fix`/`continue`.
4. **#824 / #823** - merged and closed; deployment verified live. Nothing left on this lane.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34). Fold in the #822 round-4 non-blocking residuals (R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims) and the #804 env-seam class lessons (proxy/TLS pins across every post-agent owner-PAT step and helper-script unset lists).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#822**: Tester approved `dd046a5d` (05:52:28Z); the binding eval is live; then the marker chain, the PAT sweep, #820 and #775 closures.
2. **#821**: fourth fresh review wall death at 06:38:34Z; one fresh head-bound pass after the 07:08:34Z cooldown; then the Tester, native rows with `test-windows` first, and the binding eval.
3. **#804**: Lab Engineer env-seam repair live; then the review, Tester, and eval chain; #798 closes on approve.
4. **#824 / #823**: merged, closed, and deployment verified. CLOSED OUT.
5. **#820 proposals 3-4 / capacity decision**: not implemented by #822; the durable machine mitigation lands with #822, and the Owner capacity ask (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains the critical path, tracked here and in the intake comments. #820 itself closes with #822.
6. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
7. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
8. **#814**: held behind #803; coordinate the same verify region.
9. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
10. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
11. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **#822 round-4 residuals plus #804 env-seam lessons**: folded into the post-merge audit pass in item 2 above.
13. **Pages**: green on `e806f0c8` (42165709081, 05:00:17Z); #824 preview retired. CLOSED OUT.
14. **Curator lane**: dispatch run live since 06:36:53Z; next tick at the normal 6h cadence.
15. **Cron watch**: Maintainer schedule ticks remain best-effort; event wakes deliver. Watch item, not a production stop.
16. **Wall watch**: the wall is per-egress-IP and recurring; the 06:38 death carries an 18.3-hour retry-after for its bucket. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
17. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
18. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears. Current pin and ladder stay until then.
19. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.
20. **Board pin**: #70 was never actually pinned despite the label and docs; pinned by run 42172714921 and verified. CLOSED OUT.

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
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#821 first if it is after 07:08:34Z**: dispatch exactly one fresh head-bound review on `dce109e4` (no duplicate if a pass is already live). Then read the verdict: on approval wait for the workflow's `/oc test` and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix`. If the review dies on the wall again, respect the next 30-minute cooldown and dispatch at most one fresh pass.
2. **#822**: read the binding eval on `dd046a5d`. On `approve-eval` verify the owner-authored, head-bound marker chain (newer than the 05:52:37Z tester marker and the latest eval trigger, not superseded) and let the PAT sweep merge the workflow-touching PR with the branch kept; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only.
3. **#804**: read the Lab Engineer outcome. On its push the review cycle restarts, then the Tester and the binding eval; on approve the PAT sweep merges and #798 closes. On `fix`, stay with `lab`.
4. If a fresh lane dies on the wall again, respect the 30-minute cooldown and dispatch at most one fresh pass per lane; if new runners die within seconds, stop and record the saturation.
5. Re-check held runs and the four permanently queued runs.
6. After #804/#822 merge: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the two deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).
7. Record the Owner capacity decision when given.
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #822 binding eval approve and the PAT sweep merge, closing #820 and #775?
2. Does the post-07:08Z #821 fresh review finish inside one runner bucket and return a verdict, or does the wall clip this lane again?
3. Does the #804 Lab Engineer fix close the proxy/TLS env seam and clear the binding eval gate on the rebased head?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
