# STATE

Last updated: 2026-11-06T08:55Z by run 42185629421 (#826 self-triage: the duplicate was already closed under #827 and the #822 eval and #827 lab were already dispatched by sibling run 42183884804; this run cancelled the duplicate #821 review and dispatched the surgical #804 lab retry after the 08:47:04Z cooldown). Next-run priorities: read the #822 eval, the #827 lab, the #821 review, and the #804 surgical lab pass; then the #825 curate after the cap fix lands.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 08:11-08:55Z)

- **main** = `e806f0c838439a0932c0845e66d9f103f4d85ea3`, unchanged since the 04:52:24Z #824 rebase merge (`git ls-remote` verified). Pages deploy 42165709081 SUCCESS at 05:00:17Z on this tip; nothing new to deploy.
- **Open PRs**: #822, #821, #804, #745 (4). #822 `dd046a5d`, #821 `dce109e4`, #804 `17b11d32`, all CLEAN/MERGEABLE; #745 `7a04fa4a` CONFLICTING/DIRTY and parked behind #803.
- **Open issues**: #827 is the canonical curator-cap tracking issue and the `lab` pass is live (run 42189720506); #826 was closed at 08:34:48Z by run 42183884804 as its duplicate (comment 6680727318). #825 is the curator's archived-README defect report, still without a remediation branch or PR. All other open issues are the known queue below.
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the three GitHub dynamic Dependabot Updates / Dependency Graph / pages-build-deployment names sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `dd046a5d92bff9b8723150b7b6853d350f6708c2` unchanged, CLEAN/MERGEABLE. The infrastructure Tester approved this head and the workflow published the owner-authored `/oc approve-test` marker at 05:52:37Z. The first binding eval (42171904253) ran 06:02:04-07:47:25Z and was killed at its 105-minute agent cap with no verdict; the verify failed closed, so no verdict, evidence file, marker, or handoff exists. The 30-minute cooldown ended at 08:17:25Z with no pass live, and run 42183884804 dispatched exactly one fresh binding eval at 08:43:23Z, live as run 42189719229 on the same head. Never `fix`/`continue`.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE, 23 files all under `maze-chase/` plus its `progress/` file (product code, so `fix` is valid). Exactly one review pass is live: run 42185629539 in progress since 08:09:07Z. A second identical queued pass (42185894789, pending since 08:11:21Z from a sibling wake) was cancelled by this run at 08:26Z so the lane does not double its review, test, and eval chain; its completion event is a skip-only maintainer clone.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE. The Quality Council returned `fix` (9.5/10) at 05:34:18Z for the proxy/TLS env seam: `HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY` plus `GIT_SSL_NO_VERIFY`/`GIT_SSL_CAINFO` unpinned on the post-agent strip/guard and owner-PAT steps, a decoy TLS proxy returning rc 0 while the real branch keeps `src/app.py` and the owner trailer, and the owner PAT leaking `Authorization: token ...` to a local TLS proxy. Lab Engineer run 42170414969 ran 05:46:44-08:17:00Z and was killed at its 150-minute agent cap with no decision file and no push. The 30-minute cooldown ended at 08:47:04Z and this run dispatched one surgical, time-boxed retry with the early-decision-file durability trick. Failure triage run 42186571991 was still live at survey end; if it also dispatches a retry, the lab queue serialises the two and the second sees the updated branch. Never `fix`/`continue`.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **#824 / #823**: merged and closed at 04:52:24-04:52:26Z; production favicon and preview retirement were verified by run 42164734984. CLOSED OUT.
- **Curator cap class**: schedule run 42169523085 (05:37:30Z) spent 59.15 minutes in `Run curator agent`, wrote no decision file, and concluded green through the bounded self-heal, which dispatched retry 42175554810 (06:37:02Z). The retry hit the full 60-minute agent cap at 07:37:17Z (`##[error]The action has timed out.`, `duration_ms=3601560`), 88 seconds after filing #825 with the complete link inventory and creating branch `opencode/issue825-curate-archive-readme-links` locally (never pushed). `MAX_RETRIES=1` is exhausted, so the verify escalated on #70 at 07:37:19Z and exited 1.
- **Duplicate issue pair**: concurrent wakes filed #826 (08:09:05Z) and #827 (08:11:20Z) for the same class. #827 carries the fuller remediation plan and is canonical; #826 was closed at 08:34:48Z as a duplicate with a signed rationale. The `lab` trigger went to #827 only (run 42189720506, live since 08:43:30Z).
- **Concurrent wakes**: run 42182090286 finished ~08:08:50Z (STATE, #821 review, #826); run 42182097294 finished ~08:11:20Z (duplicate #821 review, #827, three pings); run 42183884804 finished ~08:43Z (closed #826, dispatched eval #822 and lab #827, wrote the 08:43 memory); run 42185629421 is this run (self-triage of #826, cancelled the duplicate review, dispatched the #804 retry); run 42186571991 is still live since 08:17:07Z (the #804 lab failure triage). Skip/cancelled `maintainer` clones are expected single-slot supersession, and keep-both memory is expected under issue #601 queue semantics.
- **Wall and cap watch**: no new wall death this window. Two cap deaths are recorded: the #822 eval at 105 minutes (07:47:25Z) and the #804 lab at 150 minutes (08:17:00Z). Curator recovery is not a fresh pass on the same cap; the cap fix runs first. If the fresh #822 eval caps again, raise the eval arm headroom via `lab` rather than loop. If the surgical #804 pass caps too, split that lane structurally instead of a third identical pass.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live at the last check. The cap deaths are workload/model-speed pressure, not a model retirement; no ladder change. The Auditor's 1M-context free-model benchmark pass stays deferred until the infra queue clears.
- **Untriaged sweep**: #827 is locked by the live `lab`; #826 is closed; #825 stays blocked on the curator cap fix. No other untriaged issue is known.

## The live lanes (do not duplicate)

1. **#822 eval** - one fresh binding eval (42189719229) was dispatched by run 42183884804 at 08:43:23Z on the unchanged head `dd046a5d`. On `approve-eval` verify the owner-authored, head-bound marker chain (newer than the 05:52:37Z tester marker and the latest eval trigger 08:43:23Z, not superseded) and let the PAT sweep merge the workflow-touching PR with the branch kept; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only. If the fresh pass caps again, raise the eval arm headroom via `lab`.
2. **#827 curator cap** - `lab` run 42189720506 live since 08:43:30Z: 90-minute curator agent under a 120-minute job, durability/time-box/parallel-sweep guidance in the curator prompt, R25 extended to the curator arm with a mutation self-test, no other changes. After the fix lands, one `curate` on #825.
3. **#821 review** - exactly one live pass (42185629539) on `dce109e4`; the duplicate queued pass was cancelled this run. On approval the workflow forwards `/oc test`; then the Tester verdict, `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), one binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings, exactly one `fix` (product PR).
4. **#804 surgical lab retry** - dispatched by this run after the 08:47:04Z cooldown: pin the proxy/TLS env seam across every post-agent owner-PAT step and both helper unset lists on all three arms, add the R34 decoy-TLS-proxy fixture plus the PAT no-Authorization assertion and R17 pins, run the audit once, commit early and write the decision file before optional work, include the three advisories only if time allows. On its push the review cycle restarts, then the Tester and the binding eval; on `approve-eval` the PAT sweep merges and #798 closes. If it caps again, split the lane structurally. Never `fix`/`continue`.

## The serialized infra queue

1. #827 curator-cap fix (live), then one `curate` on #825.
2. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
3. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34). Fold in the #822 round-4 non-blocking residuals (R9 case-insensitive and quoted-body token hardening plus decoy-comment extraction, `schedule-selfheal.sh` raw `selfheal_retry` input interpolation, R34 jobs/dedupe/jq/log-ban coverage, and the AGENTS.md/LAB.md/maintainer.yml doc claims) and the #804 env-seam class lessons (proxy/TLS pins across every post-agent owner-PAT step and helper-script unset lists).
4. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
5. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
6. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#827 (live, `lab` 42189720506)**: canonical curator-cap fix; then one `curate` on #825 after the fix lands.
2. **#826**: closed at 08:34:48Z as a duplicate of #827 with a signed rationale. CLOSED OUT.
3. **#825 (blocked)**: archived README relative links and dead hosted build links; no branch/PR; remediation blocked on the curator cap fix.
4. **#822**: Tester approved `dd046a5d` (05:52:37Z); the first binding eval capped at 07:47:25Z; fresh eval 42189719229 live since 08:43:26Z; then the marker chain, the PAT sweep, #820 and #775 closures.
5. **#821**: single live review 42185629539 on `dce109e4` (duplicate pass cancelled); then the Tester, native rows with `test-windows` first, and the binding eval.
6. **#804**: 150-minute lab cap death at 08:17:00Z; one surgical lab retry dispatched this run after 08:47:04Z; then the review, Tester, and eval chain; #798 closes on approve.
7. **#824 / #823**: merged, closed, and deployment verified. CLOSED OUT.
8. **#820 proposals 3-4 / capacity decision**: not implemented by #822; the durable machine mitigation lands with #822, and the Owner capacity ask (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains the critical path, tracked here and in the intake comments. #820 itself closes with #822.
9. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
10. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
11. **#814**: held behind #803; coordinate the same verify region.
12. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
13. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
14. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
15. **#822 round-4 residuals plus #804 env-seam lessons**: folded into the post-merge audit pass in item 3 above.
16. **Pages**: green on `e806f0c8` (42165709081, 05:00:17Z); #824 preview retired. CLOSED OUT.
17. **Curator lane**: cap crash class recorded and the cap fix live under #827; no curator dispatch before the fix and the cooldown.
18. **Cron watch**: Maintainer schedule ticks remain best-effort; event wakes deliver. Watch item, not a production stop.
19. **Wall watch**: the wall is per-egress-IP and recurring. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the wall class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
20. **Cap watch**: the curator 60-minute cap is proven too small (fix live under #827); the eval 105-minute cap is on watch (one timeout, fresh pass live; raise via `lab` only if it repeats); the lab 150-minute cap capped once on #804 (one surgical pass, then split the lane if it repeats).
21. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
22. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears. Current pin and ladder stay until then.
23. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics. Concurrent sessions produced a duplicate review dispatch on #821 (cancelled) and a duplicate cap issue pair (#826 closed); both are handled. Cancelling a pending run emits a workflow_run completion event, so cancellations stay rare and justified.
24. **Board pin**: #70 was never actually pinned despite the label and docs; pinned by run 42172714921 and verified. CLOSED OUT.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first (curator is live under #827; the eval cap is on watch; the #804 lab gets one scoped pass, then a structural split).
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#822**: read the fresh binding eval 42189719229. On `approve-eval` verify the owner-authored, head-bound marker chain (newer than the 05:52:37Z tester marker and the 08:43:23Z eval trigger) and let the PAT sweep merge; confirm #820 and #775 close and Pages is green. On `fix`, route `lab` only. If it caps again, raise the eval arm headroom via `lab`.
2. **#827**: read the curator-cap lab run 42189720506. On its push the review cycle restarts; after it merges, dispatch exactly one `curate` on #825 (respect the cooldown if the lab just failed).
3. **#821**: read the single live review 42185629539. On approval wait for the workflow's test handoff and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, exactly one `fix`.
4. **#804**: read the surgical lab retry. On its push the review cycle restarts, then the Tester and the binding eval; on approve the PAT sweep merges and #798 closes. On another cap, split the lane structurally (for example a pins-only pass) rather than a third identical pass. If the live failure-triage run 42186571991 also dispatched a retry, let the lab queue drain and do not add a third.
5. If a fresh lane dies on the wall again, respect the 30-minute cooldown and dispatch at most one fresh pass per lane; if new runners die within seconds, stop and record the saturation. Do not re-dispatch the curator on an unfixed cap.
6. Re-check held runs and the four permanently queued runs.
7. After #804/#822 merge: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the two deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the fresh #822 eval finish inside its 105-minute cap and publish the approve-eval marker for the PAT sweep, closing #820 and #775?
2. Does the #827 lab raise the curator cap with real headroom and unblock the #825 remediation in one pass?
3. Does the surgical #804 lab pass clear the env seam before its cap, and does the rebased head re-gate cleanly?
4. Does the single live #821 review survive a full pass and return a verdict, or does the wall clip this lane again?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
