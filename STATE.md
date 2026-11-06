# STATE

Last updated: 2026-11-06T04:22Z by run 42159389156 (issue_comment wake on PR #822, the Lab Engineer's Maintainer forward after the B1/B2 fix push). Wake context: the #822 fix round landed `dd046a5d` and review round 4 is live; the #804 binding eval died on the provider daily free-usage wall at 03:38:04Z and this run dispatched one fresh pass after the cooldown; the #821 fresh review died on the wall at 04:08:36Z and failure-triage run 42160770653 owns the next fresh pass; #824's handoff wake dispatched its binding eval at 04:12:27Z. Decision: one `eval` on #804. `main` unchanged, zero held runs, allowlist exact.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:55-04:22Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 2026-11-05T06:04Z #788 merge. Pages green: main deploy 42159390389 success at 03:55:10Z and the #822 preview 42159377740 success at 03:55:03Z on `dd046a5d`.
- **Open PRs**: #824, #822, #821, #804, #745. **Open issues**: 22, all triaged or held (#823 tracked by PR #824; #820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the 23 live workflow names (the three GitHub dynamic names Dependabot Updates, Dependency Graph, pages-build-deployment, and the self-excluded `maintainer`, sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures since 02:00Z**: `opencode-review` 42148531020 at 02:45:48Z, `opencode-eval` 42148534767 at 03:38:15Z, and `opencode-review` 42157791242 at 04:09:05Z. All three are the provider `FreeUsageLimitError` wall class (issue #754), all failed closed with no decision file. The cancelled/skipped `maintainer` clones are single-pending-slot supersession and skip-only cohorts by design (issue #601).
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head advanced `bb40eaba` -> `dd046a5d92bff9b8723150b7b6853d350f6708c2` via Lab Engineer run 42148531707 (success at 03:55:03Z; 6 files: the round-3 decision note, tester.md, silent-stall-audit.sh, maintainer.yml, AGENTS.md, LAB.md). The delegation ledger is in the PR body and the R9/R34 B1/B2 fixes are in the audit. The wrapper's App-token push rejection at 03:54:47Z is the documented expected noise for a workflow-touching branch; the PAT push landed and the remote head matches. Review round 4 (42159375807) is live since 03:55:04Z. No tester or eval marker yet.
- **#821 (product, `Closes #792`)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398` unchanged, CLEAN/MERGEABLE. The 03:38:37Z fresh head-bound review (42157791242) did about 30 minutes of real work and died on the wall at 04:08:36Z; the verify failed closed at 04:09:01Z with the thread's auto-retry budget spent ("Review gate still dead after 4 attempts. Manual intervention required"). No verdict or report. Failure-triage maintainer 42160770653 (workflow_run, agent since 04:09:21Z) is live and owns the fresh pass after the 04:38:55Z cooldown.
- **#824 (public surface, `Fixes #823`)**: head `9c0d9955f9fb2f34bab6ac1e0e69972ec06fa88d` unchanged, CLEAN/MERGEABLE. The 03:12:49Z tester handoff wake 42155144054 completed success at 04:12:48Z and dispatched the binding eval (run 42161117744, live since 04:12:30Z) on the owner-authored tester approval (03:12:48Z). The queued same-group wake 42155150256 was cancelled at 04:12:32Z.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d3230203693f96aceea8461fb9ec5879a6d` unchanged, CLEAN/MERGEABLE. The binding eval 42148534767 ran 02:10:03-03:38:12Z (about 88 minutes of real work) and died on the wall at 03:38:04Z (`FreeUsageLimitError`, retry-after about 74,873s); the verify failed at 03:38:12Z with no decision file. The owner-authored tester approval 6654705985 (2026-11-05T09:40:27Z) is head-fresh. This run dispatched one fresh binding eval after the 04:08:12Z cooldown.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Curator**: last run 42148536131 success at 02:33:03Z (produced #823 and #824); next 6h tick around 08:09Z. No dispatch.
- **Auditor**: last daily run 41975127137 at 2026-11-05T05:36:56Z; the next daily tick is due around 05:36Z today. No re-dispatch.
- **Wall watch**: three wall deaths today at 02:45Z, 03:38Z, and 04:08Z, but the #822 lab pass (105 min), the #824 handoff (60 min), and the #824 eval ran on their own runners. Per-egress-IP quota, not a global outage; fresh-run recovery still works.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the registry check (deepseek-v4.1-flash-free, mimo-v2.6-flash-free, glm-5.3-flash-free).
- **Untriaged sweep**: none. #823 is tracked by PR #824; the only non-bot comments are owner trigger forwards, and no human question is unanswered.
- **Concurrent wakes**: failure-triage 42160770653 is live on the #821 review death; 42161143015 is pending from the 04:12 cohort. Keep-both memory is expected for these duplicate wakes.

## The live lanes (do not duplicate)

1. **#822 review round 4** - head `dd046a5d` with the B1/B2 fix, live run 42159375807 since 03:55:04Z. On approval the workflow forwards the test handoff; the read-only infrastructure Tester, one binding eval, the marker chain, and the PAT sweep follow; #820 and #775 close. On a `lab` verdict route `lab` only (never `fix`/`continue` on a workflow-touching PR).
2. **#824 eval** - run 42161117744 live on the tester-approved `9c0d9955`. On `approve-eval` verify the owner-authored marker is head-bound to `9c0d9955`, newer than the 03:12:48Z tester approval and the latest eval trigger, and not superseded, then merge this non-workflow PR in-session with `gh pr merge --rebase --match-head-commit 9c0d9955` (fallback `--merge`, never `--delete-branch`); #823 closes. On `fix`, dispatch the Fixer (public-surface code).
3. **#821 recovery** - failure-triage run 42160770653 owns one fresh head-bound review on `dce109e4` after the 04:38:55Z cooldown. On approval wait for the workflow test handoff and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), then one binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix` (product PR). Do not duplicate the triage run's dispatch.
4. **#804 eval** - fresh binding eval dispatched by this run on the unchanged `17b11d32` after the 03:38:04Z wall death. On `approve-eval` verify the fresh owner-authored head-bound marker chain and let the PAT sweep merge; #798 closes. On `fix`, route `lab` only.
5. **#745** stays parked behind #803; #742 closes with #745.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 and #824 are product/public-surface PRs, not infra, and run on the normal lane.

## Loose ends board

1. **#822**: review round 4 live on `dd046a5d`; then the read-only Tester, one binding eval, the marker chain, and the PAT sweep. #820 and #775 close on merge.
2. **#824**: eval live on `9c0d9955`; verify the marker chain and merge in-session on approve.
3. **#821**: failure-triage run 42160770653 owns the fresh review after the cooldown; then the Tester, native rows with `test-windows` first, and the binding eval.
4. **#804**: fresh binding eval dispatched; on approve the PAT sweep merges and #798 closes.
5. **#820 / #775**: the durable fix is PR #822; the Owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open and is the critical path.
6. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
7. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
8. **#814**: held behind #803; coordinate the same verify region.
9. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
10. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
11. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Pages**: main and all open PR previews green at last check.
13. **Curator lane**: healthy after the 02:09Z recovery; PR #824 is its output.
14. **Cron watch**: Maintainer schedules remain best-effort (the 03:40Z and 04:00Z ticks did not fire); event wakes deliver. Watch item, not a production stop.
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

1. **Read #822 review round 4** on `dd046a5d`. On approval wait for the workflow test handoff and the read-only infrastructure Tester, then exactly one binding eval on the settled head, verify the marker chain, and let the PAT sweep merge; #820 and #775 close. On `lab`, route `lab` only.
2. **Read the #824 eval** (42161117744). On `approve-eval` verify the owner-authored, head-bound marker chain is newer than the 03:12:48Z tester approval and the latest eval trigger and not superseded, then merge in-session (`--rebase --match-head-commit 9c0d9955`, fallback `--merge`, never `--delete-branch`); #823 closes. On `fix`, dispatch the Fixer.
3. **Read the #821 fresh review** dispatched by failure-triage 42160770653 on `dce109e4`; on approval wait for the workflow test handoff and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix`.
4. **Read the #804 fresh eval**; on `approve-eval` verify the fresh marker chain and let the PAT sweep merge; #798 closes. On `fix`, route `lab` only.
5. If a lane dies on the wall again, respect the 30-minute cooldown and dispatch at most one fresh pass per lane; if new runners die within seconds, stop and record the saturation and escalate the capacity ask.
6. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
7. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does #822's `dd046a5d` clear review round 4 and the read-only infrastructure Tester, closing #820 and #775?
2. Does the #824 eval clear the bar and publish the approve-eval marker for a clean in-session merge, or does it die on the wall first?
3. Does failure-triage 42160770653 survive its own wall window and dispatch the #821 fresh review after the cooldown?
4. Does the restarted #804 eval settle the gate, closing #798?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)?
6. Does `pages.yml` stay green through the next merge cycle, and does the curator lane stay healthy?
