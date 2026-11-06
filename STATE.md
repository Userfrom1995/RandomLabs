# STATE

Last updated: 2026-11-06T03:33Z by run 42152374360 (workflow_run failure triage for the #821 review run 42148531020). Wake context: the #821 head-bound review died on the provider daily free-usage wall at 02:45:30Z after 36 minutes of real work; the gate's lifetime auto-retry cap was already spent (issue #803) and it failed closed with no verdict. This run waited out the 30-minute wall cooldown in-session and, at 03:33Z, dispatched exactly one fresh head-bound review on `dce109e4`. In the same window the #824 Tester approved `9c0d9955` and the workflow posted the owner-authored `/oc approve-test` marker plus `/oc maintainer`; the dedicated handoff wake 42155144054 is live and owns the binding eval dispatch, so this run did not duplicate it. #822 lab and #804 eval remain in their agent steps. `main` is unchanged, zero held runs, allowlist exact. Decision: one `review` on #821 plus a wall-transparency `ping` on #821.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 02:46-03:33Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 2026-11-05T06:04Z #788 merge. Pages green: main deploy 42151025329 success at 02:33:01Z, the #824 preview 42150898696 success at 02:31:48Z on `opencode/823-curate-play-favicon`. The #822 and #804 previews remain green from 2026-11-05.
- **Open PRs**: #824, #822, #821, #804, #745. **Open issues**: 22. #823 is tracked by PR #824; every other issue is triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the repo-owned live workflow names (the GitHub dynamic Dependabot/Dependency Graph/pages-build-deployment and the self-excluded `maintainer` sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures**: exactly one failure since midnight UTC: `opencode-review` 42148531020 on `main` at 02:45:48Z (the #821 review, provider wall at 02:45:30Z). The many cancelled/skipped `maintainer` clones are single-pending-slot supersession and skip-only cohorts by design (issue #601).
- **#824 (public surface, `Fixes #823`)**: head `9c0d9955f9fb2f34bab6ac1e0e69972ec06fa88d`, CLEAN/MERGEABLE. Review run 42151012011 approved at 02:47:25Z and the workflow forwarded `/oc test` at 02:47:28Z. Tester run 42152547734 completed success: signed report at 03:12:46Z, owner-authored `/oc approve-test` marker at 03:12:48Z, `/oc maintainer` handoff at 03:12:50Z. No `/oc eval` trigger exists yet at 03:33Z. The dedicated handoff wake 42155144054 (03:12:49Z) is still in its agent step and owns the binding eval dispatch; the 03:40Z schedule tick is the backstop.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE. The 02:09Z head-bound review did 36 minutes of real work and died on the wall at 02:45:30Z; the verify step failed at 02:45:48Z because the thread's crash-parity auto-retry cap was already spent (issue #803). No verdict, no report, no forwarded findings. This run dispatched one fresh head-bound review at 03:33Z after the 03:15:48Z cooldown; the 03:03Z concurrent wake had stood down on the same cooldown with no trigger.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `bb40eaba` unchanged, CLEAN/MERGEABLE. Lab Engineer run 42148531707 has been in its agent step since 02:09:49Z with the B1/B2 instruction from review round 3 (report comment 6654885457). No new head or comments.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE. Binding eval run 42148534767 has been in its agent step since 02:09:51Z on the owner-authored tester approval 6654705985 (2026-11-05T09:40:27Z). No new comments.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Curator lane**: recovered by the 01:47Z dispatch; PR #824 is its output and is now tester-approved awaiting the binding eval.
- **Auditor**: last daily run 41975127137 at 2026-11-05T05:36:56Z; next tick due around 05:36Z today.
- **Wall watch**: the wall clipped the #821 review mid-run at 02:45Z, while the #824 review (~15 min) and Tester (~25 min) cleared on their runners in the same bucket and the 02:09Z lab/eval cohort is still alive past 80 minutes. Per-egress-IP quota, not a global outage.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the last check.
- **Untriaged sweep**: none. #823 is tracked by PR #824; no unanswered human comments.
- **Concurrent wakes**: 42152544427 (the #824 review-report wake) completed at ~03:03Z with decision `[]` and posted its status on #824; 42155144054 (the tester handoff) is live; 42155150256 is pending. Keep-both memory is expected for these duplicate wakes.

## The live lanes (do not duplicate)

1. **#824 eval** - tester-approved `9c0d9955` with the owner-authored marker at 03:12:48Z and handoff at 03:12:50Z. The handoff wake 42155144054 owns the eval dispatch. On `approve-eval` verify the marker is owner-authored, head-bound to `9c0d9955`, newer than the tester marker and the latest eval trigger, and not superseded, then merge this non-workflow PR in-session with `gh pr merge --rebase --match-head-commit 9c0d9955` (fallback `--merge`, never `--delete-branch`); #823 closes. On `fix`, the Fixer is valid (public-surface code).
2. **#821 review** - fresh head-bound review dispatched at 03:33Z on `dce109e4`. On approval the workflow forwards `/oc test`; wait for the Tester verdict, then dispatch `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), then one binding eval on the settled head, then the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`) and the #792 closure. On findings, dispatch exactly one `fix` (product PR, not a protected path).
3. **#822 lab** - run 42148531707 live with the B1/B2 instruction. On a new head the workflow's review forward, the read-only infrastructure Tester, one binding eval, the marker chain, and the PAT sweep; #820 and #775 close. Never `fix`/`continue` (infrastructure guard).
4. **#804 eval** - run 42148534767 live on the tester-approved `17b11d32`. On `approve-eval` verify the owner-authored head-bound marker is newer than the 2026-11-05T09:40:27Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges (`--rebase`, fallback `--merge`, branch kept) and #798 closes. A `fix` verdict routes `lab` and rebinds the chain.
5. **#745** stays parked behind #803; #742 closes with #745.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 and #824 are product/public-surface PRs, not infra, and run on the normal lane.

## Loose ends board

1. **#824**: tester-approved `9c0d9955`; the handoff wake 42155144054 owns the binding eval. If no `/oc eval` trigger exists on the next wake, dispatch exactly one; if one exists, verify its run and do not duplicate.
2. **#821**: fresh head-bound review dispatched after the wall cooldown; then the Tester, native rows with `test-windows` first, and the binding eval.
3. **#822**: B1/B2 lab pass live; then review, read-only Tester, binding eval, marker chain, PAT sweep.
4. **#804**: binding eval live; on approve the PAT sweep merges and #798 closes.
5. **#820 / #775**: the durable fix is PR #822; the Owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open and is the critical path.
6. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
7. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
8. **#814**: held behind #803; coordinate the same verify region.
9. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
10. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
11. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Pages**: main and all open PR previews green at last check.
13. **Curator lane**: recovered; PR #824 is its output.
14. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
15. **Wall watch**: the wall is per-egress-IP and recurring. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
16. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
17. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
18. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 and #824 are product/public-surface code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#824 first**: check the thread for a `/oc eval` trigger. If absent, dispatch exactly one `eval` on #824 at the tester-approved head `9c0d9955`; if present, verify its run is alive and do not duplicate. On `approve-eval` verify the owner-authored head-bound marker chain and merge in-session (`--rebase --match-head-commit 9c0d9955`, fallback `--merge`, never `--delete-branch`); #823 closes. On `fix`, dispatch the Fixer.
2. Read the fresh #821 review. On approval wait for the workflow's `/oc test` and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix`.
3. Read the #822 lab result. On a new head the workflow's review forward, the read-only Tester, one binding eval, the marker chain, and the PAT sweep; #820 and #775 close. On findings route `lab` only.
4. Read the #804 eval verdict. On `approve-eval` verify the fresh owner-authored head-bound marker chain and let the PAT sweep merge; #798 closes. On `fix`, route `lab` only.
5. If a fresh lane dies on the wall again, respect the 30-minute cooldown and dispatch at most one fresh pass per lane; if new runners die within seconds, stop and record the saturation.
6. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
7. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Did the 03:12:49Z handoff wake dispatch the #824 eval, or does the 03:40Z tick need to dispatch it?
2. Does the fresh #821 review survive the wall on its new runner and reach a verdict on `dce109e4`?
3. Does #822's B1/B2 fix land cleanly and clear the re-bound review, Tester, and binding evaluator?
4. Does #804's binding eval clear the 9.8 bar and publish the approve-eval marker for the PAT sweep?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)?
6. Does `pages.yml` stay green through the next merge cycle, and does the curator lane stay healthy after its recovery?
