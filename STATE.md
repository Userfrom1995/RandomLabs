# STATE

Last updated: 2026-11-06T04:09Z by run 42155144054 (issue_comment Maintainer handoff on #824). Wake context: the Tester approved #824 on `9c0d9955` at 03:12:46Z, the machine-published owner-authored marker landed at 03:12:48Z, and the handoff woke this run; I dispatched exactly one binding eval on `9c0d9955`. The failure-triage run 42152374360 completed success at 03:38:47Z and dispatched exactly one fresh head-bound review on #821 (run 42157791242 live at `dce109e4`) after the wall cooldown. The #804 eval run 42148534767 died on the wall at 03:38:04Z and its triage wake was lost to supersession; the #822 handoff maintainer run 42159389156 (live since 03:55:10Z) owns the fresh eval after the 04:08:04Z cooldown. The #822 lab completed success at 03:55:03Z and pushed head `dd046a5d`; its review run 42159375807 is live. `main` unchanged, Pages green, zero held runs, allowlist exact. Decision: `[{"action":"eval","pr":824}]`; no duplicate review or eval, no merge yet.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:13-03:40Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 2026-11-05T06:04Z #788 merge. Pages green: main deploy 42151025329 success at 02:33:01Z; the #824 preview 42150898696 success at 02:31:48Z.
- **Open PRs**: #824, #822, #821, #804, #745. **Open issues**: 22. #823 is tracked by PR #824 (`Fixes #823`); every other issue is triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the 23 live names (19 allowlisted, plus the self-excluded `maintainer` and the three GitHub dynamic names `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844). Two pending skip-gate wakes (42155150256 from the approve-test marker, 42155168337 from the successful test completion), a cancelled workflow_run cohort around 03:12Z, and the lost #804 eval failure wake 42157756547 around 03:38Z (single-slot supersession by design, issue #601; the live re-survey absorbs what a superseded wake would have seen).
- **#824 (public surface, `Fixes #823`)**: head `9c0d9955f9fb2f34bab6ac1e0e69972ec06fa88d`, CLEAN/MERGEABLE, one file `maze-chase/play.html` +1/-0 restoring `<link rel="icon" href="web/favicon.svg" type="image/svg+xml" />`. Review run 42151012011 approved at 02:47:19Z; test run 42152547734 completed success at 03:12:54Z; the Tester report landed at 03:12:46Z (byte-exact against `8f642c83^`, tracked icon, 34/34 local and 7/7 preview checks, zero 404s, no open redirect) and the machine-published owner-authored approve-test marker at 03:12:48Z. This run dispatched exactly one binding eval on `9c0d9955`; no eval verdict yet.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE. The fresh review run 42148531020 died on the wall at 02:45:48Z. The failure-triage maintainer run 42152374360 (started 02:45:53Z) waited out the cooldown and, on completing success at 03:38:47Z, posted the review-lane status comment and exactly one fresh head-bound review trigger at 03:38:37Z. New review run 42157791242 is live on `dce109e4`.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head moved `bb40eaba` -> `dd046a5d92bff9b8723150b7b6853d350f6708c2`, CLEAN/MERGEABLE. Lab Engineer run 42148531707 completed success at 03:55:03Z on the B1/B2 instruction; the PAT-backed push landed the new head and the workflow's review forward started review run 42159375807 at 03:55:02Z. The lab handoff woke the live maintainer run 42159389156.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE. The binding eval run 42148534767 did real work from 02:10:03Z and then died on the provider daily free-usage wall at 03:38:04Z (`FreeUsageLimitError`, statusCode 429, retry-after 74,873s, issue #754); its verify step failed closed at 03:38:12Z with no verdict and no comment. The failure-triage wake 42157756547 (created 03:38:17Z) was lost to single-slot supersession and the newer cohort runs skipped at the job gate. The #822 handoff maintainer run 42159389156 (live since 03:55:10Z, agent cap around 04:55Z) owns the recovery: after the 30-minute cooldown expires at 04:08:04Z it can dispatch one fresh eval on the owner-authored tester approval 6654705985. This run does not duplicate it.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Curator**: last run 42148536131 success (02:09:49-02:33:03Z, produced #823 and #824); next 6h tick around 08:09Z. No dispatch.
- **Auditor**: last daily run 41975127137 at 2026-11-05T05:36:56Z; next tick due around 05:36Z today.
- **Failures**: the #821 review at 02:45:48Z (owned by triage run 42152374360 and recovered with a fresh review trigger) and the #804 eval at 03:38:12Z (its failure wake lost to supersession; recovered by this run's fresh eval at the cooldown boundary). No other failure/timed_out since midnight.
- **Wall watch**: the wall hit the #821 review runner at 02:45:30Z (retry-after about 79,148s). The #822, #804, and #824 test agents on their own runners stayed alive, and the #824 test completed successfully at 03:12:54Z. The class is a fresh-run recovery, not retry exhaustion: no lab dispatch and no ladder advance.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the last check.
- **Untriaged sweep**: none. #823 is tracked by PR #824; no unanswered human comments (every recent owner-authored comment is a workflow handoff or a published report).

## The live lanes (do not duplicate)

1. **#824 binding eval** - dispatched this run on the tester-settled `9c0d9955`. On `approve-eval` verify the owner-authored head-bound marker chain is newer than the 03:12:48Z tester verdict and the latest eval trigger and is not superseded, then merge in-session with `gh pr merge --rebase --match-head-commit 9c0d9955f9fb2f34bab6ac1e0e69972ec06fa88d` (fallback `--merge`, never `--delete-branch`); #823 closes. On `fix`, dispatch the Fixer with a ping.
2. **#821 fresh review** - run 42157791242 live since 03:38:42Z on `dce109e4` (thread crash-parity retries spent, so this is the fresh-run recovery). On approval wait for the workflow's test handoff and the Tester verdict, then dispatch `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), then the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, `fix` is valid (product code).
3. **#822 review** - run 42159375807 live on the new head `dd046a5d` after the Lab Engineer's B1/B2 success at 03:55:03Z. On approval the workflow forwards to the read-only infrastructure Tester, then one binding eval, the marker chain, and the PAT sweep; #820 and #775 close. Never `fix`/`continue` (infrastructure guard).
4. **#804 fresh eval** - the live #822 handoff run 42159389156 (agent cap around 04:55Z) owns the dispatch after the 04:08:04Z cooldown on the tester-approved `17b11d32` after the 03:38:04Z wall death of run 42148534767 (its triage wake was lost to supersession); do not duplicate it, and if it defers, the next run dispatches one fresh eval immediately. On `approve-eval` verify the owner-authored head-bound marker is newer than the 2026-11-05T09:40:27Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges (`--rebase`, fallback `--merge`, branch kept) and #798 closes. A `fix` verdict routes `lab`; another wall death gets one further fresh pass after 30 minutes, then escalate the Owner capacity decision.
5. **#745** stays parked behind #803; #742 closes with #745.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 and #824 are product/public-surface PRs, not infra, and run on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822; review round 3 returned `lab` with B1/B2 and the Lab Engineer is live on it. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open and is the critical path.
2. **#804**: tester-approved on `17b11d32`; the first binding eval died on the wall at 03:38:04Z and the live #822 handoff run 42159389156 owns the fresh dispatch after the 04:08:04Z cooldown. On approve, the marker chain and the PAT sweep merge it; #798 closes.
3. **#821**: the fresh review run 42157791242 is live at `dce109e4`; then the Tester, native rows with `test-windows` first, and the binding eval.
4. **#824**: tester-approved and eval-dispatched on `9c0d9955`; then the marker chain, the in-session merge, and the #823 closure.
5. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
6. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
7. **#814**: held behind #803; coordinate the same verify region.
8. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
9. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
10. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
11. **Pages**: main and all open PR previews green at last check (the #824 preview deployed at 02:31:48Z).
12. **Curator lane**: healthy after the recovery; PR #824 is its output. Next scheduled tick around 08:09Z.
13. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. The observed schedule cadence is roughly every 5-8 hours, so never rely on the next cron tick: dispatch due work in the current run. Watch item, not a production stop.
14. **Wall watch**: the 2026-11-06 bucket hit the wall at 02:45:30Z on the #821 review runner and at 03:38:04Z on the #804 eval runner; the #822 lab and #824 test runners stayed alive and the #824 test completed. Both deaths are fresh-run recovery only; no lab dispatch for the class. If new runners die within seconds, stop after the single fresh pass per lane per bucket and escalate the Owner capacity decision.
15. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
16. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
17. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 and #824 are product/public-surface code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`. A live failure-triage run owns its lane: wait for it to finish before dispatching the recovery yourself (run 42152374360 waited out the cooldown and dispatched #821's fresh review, so this run did not duplicate it).
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. When new runners die within seconds, stop after the single fresh pass rather than looping.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #824 eval verdict. On `approve-eval` verify the fresh owner-authored head-bound marker chain (newer than the 03:12:48Z tester verdict and the latest eval trigger, not superseded) and merge in-session (`--rebase --match-head-commit 9c0d9955f9fb2f34bab6ac1e0e69972ec06fa88d`, fallback `--merge`, never `--delete-branch`); #823 closes. On `fix`, dispatch exactly one `fix` with a ping.
2. Read the #821 fresh review (42157791242). On approval wait for the workflow's test handoff and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure.
3. Read the #822 review (run 42159375807 live on `dd046a5d` after the Lab Engineer's B1/B2 success at 03:55:03Z). On approval the workflow forwards to the read-only infrastructure Tester, then one binding eval, the marker chain, and the PAT sweep; #820 and #775 close. On findings route `lab` only.
4. Read the #804 fresh eval verdict (the live #822 handoff run 42159389156 owns the dispatch after the 04:08:04Z cooldown; the 03:38:04Z wall death's failure-triage wake 42157756547 was lost to supersession; if that run defers, dispatch exactly one fresh eval immediately). On `approve-eval` verify the fresh owner-authored head-bound marker chain and let the PAT sweep merge; #798 closes. On `fix`, route `lab` only. On another wall death, one further fresh pass after 30 minutes, then escalate the Owner capacity decision; do not duplicate a live retry.
5. If any fresh lane dies on the wall within seconds, do not loop: record the saturation, keep one fresh pass per lane per midnight-UTC bucket, and escalate the Owner capacity decision.
6. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
7. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #824 binding eval return `approve-eval`, and does the marker chain clear the sweep without head churn?
2. Does the #821 fresh review recover after the cooldown, or does the wall kill the next runner too?
3. Does the #822 review accept the new `dd046a5d` head, and does the #804 fresh eval survive the wall?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
