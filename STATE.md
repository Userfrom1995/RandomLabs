# STATE

Last updated: 2026-11-06T02:03Z by run 42146140553 (schedule tick). Wake context: the provider daily free-usage wall (issue #754) killed every model-backed lane from 2026-11-05T10:08Z through 23:27Z, including the fresh #821 review, all Maintainer wakes, the #822 lab, the #804 eval, the curator, and a false-positive general wake. The midnight-UTC allowance reset restored service and this run is alive on a fresh bucket. Decision: one fresh review on #821 (`dce109e4`), one lab pass on #822 for the review round 3 B1/B2 findings, one fresh binding eval on #804 (tester-approved `17b11d32`), one curator recovery on #70, and one wall-recovery ping on #821. No merges yet (no fresh tester-plus-eval marker chain).

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 01:48-02:03Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 2026-11-05T06:04Z #788 merge. Pages green: main deploy 42000880708 success at 2026-11-05T09:15:25Z, the #822 preview 42000862709 success at 09:15:17Z on `bb40eaba`, and the #804 preview 42000043687 success at 09:09:20Z on `17b11d32`. No Pages run since.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the 23 live workflow names (the three GitHub dynamic names Dependabot Updates, Dependency Graph, pages-build-deployment and the self-excluded `maintainer` outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Wall outage since the last log**: no model-backed run succeeded between 10:08Z and 23:27Z on 2026-11-05. Deaths: opencode-review 42008118016 at 10:08:51Z (the fresh #821 review dispatched at 10:07:50Z); maintainer 42008258674 at 10:10:03Z; opencode general 42043174681 at 14:15:59Z and maintainer 42043174754 / 42043186739 / 42043322471 at 14:16:17Z / 14:16:23Z / 14:17:29Z (the #70 self-heal note batch); curator 42043020983 at 14:15:04Z (re-dispatch); maintainer 42056661376 at 15:37:32Z; maintainer 42113765775 at 21:34:55Z; curator 42129061642 at 23:25:19Z; opencode general 42129089091 at 23:26:04Z, maintainer 42129088991 at 23:26:14Z, maintainer 42129096210 at 23:26:32Z, and maintainer 42129149656 at 23:27:32Z. All caught the provider `FreeUsageLimitError` (issue #754) and failed closed at the verify step with no decision file. The engine-only `opencode-recover` schedule arms kept succeeding (42143560348 at 2026-11-06T01:23:51Z).
- **#821 (product, `Closes #792`)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398` unchanged (pushed 2026-11-05T08:02:08Z), CLEAN/MERGEABLE. Review round 3 died on the wall at 08:13:49Z, auto-retry 2 at 08:43:48Z, auto-retry 3 at 09:34:08Z after about 50 minutes of real work; the gate failed closed with the lifetime cap spent. The manual fresh review at 10:07:50Z (run 42008118016) died at 10:08:51Z. This run dispatched exactly one fresh review on `dce109e4` now that the bucket reset. No tester or eval marker.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `bb40eabadd9d6a966a7bbba167d50bf5cb2c71ce` unchanged (pushed 09:14:48Z), CLEAN/MERGEABLE. Review round 3 (42000865427) completed success at 09:49:49Z and returned `lab`: B1 the R9 token guard does not mirror the general gate's wake semantics and the curator pin omits the closing quote, so an appended trigger still passes; B2 the claimed transcript-negative fixture does not exist and the unanchored wall detector still matches a transcript quoting the rendered annotation. The 09:49:46Z `/oc lab` died with run 42005610434 at 09:50:20Z. This run dispatched one lab pass with the B1/B2 instruction.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d3230203693f96aceea8461fb9ec5879a6d` unchanged (pushed 09:08:16Z), CLEAN/MERGEABLE. Review round 8 approved at 09:21:24Z; the read-only infrastructure Tester 42001720643 approved at 09:40:24Z and published owner-authored `/oc approve-test` 6654705985 at 09:40:27Z plus `/oc maintainer` at 09:40:29Z. The binding eval dispatched at 09:46:51Z (run 42005204354) died at 09:50:40Z with no verdict or marker. This run dispatched one fresh binding eval on the same head; the tester approval is head-fresh and owner-authored.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Curator**: schedule 42042886616 succeeded at 14:14:11Z; its self-heal re-dispatch 42043020983 died on the wall at 14:15:04Z; schedule 42129061642 died on the wall at 23:25:19Z and the 23:25:01Z self-heal re-dispatch could not queue (`gh workflow run` HTTP 500), posting the board note on #70. This run dispatched one curate on #70 to re-seed the lane.
- **Auditor**: last daily run 41975127137 at 2026-11-05T05:36:56Z; the next daily tick is due around 05:36Z today. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free. The outage was quota, not model retirement.
- **Untriaged sweep**: none. No new issues today and no unanswered human comments (the only non-bot comments were owner triggers and the two curator self-heal board notes).
- **Wall watch**: reset at midnight UTC and the bucket is live, but it will recur daily. #822 is the durable in-repo mitigation; the owner capacity decision remains the critical path.

## The live lanes (do not duplicate)

1. **#821 fresh review** - dispatched this run on `dce109e4`. On approval the workflow forwards `/oc test`; on findings it forwards `/oc fix` (product PR, so `fix` is valid). Then the Tester, the native rows (`test-windows` first), the binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure.
2. **#822 lab** - dispatched this run with the B1/B2 instruction. Apply both findings, then the workflow's review forward, the read-only infrastructure Tester, one binding eval, the owner-authored head-bound marker chain, and the PAT sweep merging with the branch kept; #820 and #775 close. Never `fix`/`continue` (infrastructure guard).
3. **#804 fresh eval** - dispatched this run on the tester-approved `17b11d32`. On `approve-eval` verify the owner-authored head-bound marker is newer than the 09:40:27Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges (`--rebase`, fallback `--merge`, branch kept) and #798 closes. A `fix` verdict routes `lab` and rebinds the chain.
4. **Curator recovery** - dispatched this run on #70. Confirm the lane is healthy and the site/README audit is clean; a structural finding escalates to me.
5. **#745** stays parked behind #803; #742 closes with #745.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822; review round 3 returned `lab` with B1/B2 and this run re-dispatched the lab pass. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open and is the critical path; the wall killed a further ~13 hours of production overnight.
2. **#804**: tester-approved on `17b11d32`; this run re-dispatched the binding eval. On approve, the marker chain and the PAT sweep merge it; #798 closes.
3. **#821**: fresh review on `dce109e4` is live; then the Tester, native rows, and the binding eval.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and both open PR previews green at last check.
11. **Curator lane**: two wall deaths on 2026-11-05 plus one transient GitHub HTTP 500 on the self-heal dispatch; a fresh curate run is live on #70. Watch the next scheduled tick.
12. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
13. **Wall watch**: active, reset at midnight UTC, will recur. One fresh pass per lane now; no lab dispatch for the class.
14. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
15. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
16. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`. All outstanding cooldowns expired during the outage.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. When new runners die within seconds, stop after the single fresh pass rather than looping.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #821 fresh review on `dce109e4`, then follow the normal chain (workflow test forward, Tester, `test-windows` first plus `test-linux`/`test-macos`, binding eval on the settled head, merge, #792 closes).
2. Read the #822 lab result. On a new head, the workflow's review forward, then the read-only Tester, one binding eval, the marker chain, and the PAT sweep; #820 and #775 close.
3. Read the #804 binding eval verdict. On `approve-eval` verify the fresh owner-authored head-bound marker chain and let the PAT sweep merge; #798 closes. On `fix`, route `lab` only.
4. Read the #70 curator recovery run; confirm the site/README audit is clean or triage its findings.
5. If any fresh lane dies on the wall again within seconds, do not loop: record the saturation, keep one fresh pass per lane per midnight-UTC bucket, and escalate the Owner capacity decision. No emergency edit: there is no workflow edit that creates provider quota, and the durable in-repo fix is #822.
6. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
7. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes).
8. Record the Owner capacity decision when given.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Do the three fresh lanes (the #821 review, the #822 lab, the #804 eval) survive the new daily bucket, or does the wall resume before the gates settle?
2. Does #822's B1/B2 fix land cleanly and clear the re-bound review, Tester, and binding evaluator?
3. Does #821's fresh review reach a verdict on `dce109e4`, and do the Windows and POSIX native rows reproduce the Windows pass contract end to end?
4. Does the #804 binding eval clear the 9.8 bar and publish the approve-eval marker for the PAT sweep?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
6. Does `pages.yml` stay green through the next merge cycle, and does the curator lane stay healthy after the HTTP 500?
