# STATE

Last updated: 2026-11-05T10:07Z by run 42003503857. Wake: `workflow_run` failure for `opencode-review` 41996738586 (the #821 review auto-retry 3), which did ~50 minutes of real work and then died on the #754 provider daily free-usage wall at 09:34:08Z; the review gate is at its lifetime cap (1 initial + 3 auto-retries, "manual intervention required"). Decision: one wall-status ping plus exactly one fresh `/oc review (head dce109e4)` on #821 after the shared 30-minute cooldown (eligible 10:04:24Z). No lab/eval dispatch this session: the #822 lab attempt died on the wall at 09:50:20Z and the #804 eval at 09:50:40Z, so their re-dispatches are cooldown-gated to 10:20:20Z/10:20:40Z and belong to the queued failure-triage run 42005767555 and the 10:20/10:40 schedule ticks.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 09:36-10:05Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. Pages green: main deploy 42000880708 success at 09:15:25Z, the #822 preview 42000862709 success on `bb40eaba` at 09:15:17Z, and the #804 preview 42000043687 success on `17b11d32`.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820/#775 close with #822, #792 with #821, #798 with #804.
- **Trigger allowlist**: exact 19/19 against the 23 live workflow names (the three GitHub dynamic names Dependabot Updates, Dependency Graph, pages-build-deployment and the self-excluded `maintainer` outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures**: the wall deaths below. The cancelled `maintainer` entries are the deliberate single-pending-slot supersession (issue #601).
- **#821 (product, `Closes #792`)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398` unchanged, CLEAN/MERGEABLE. Review round 3 (41991532963) died on the wall at 08:13:49Z; auto-retry 2 (41992880761) at 08:43:48Z; auto-retry 3 (41996738586) did ~50 minutes of real work and died on the wall at 09:34:08Z (`FreeUsageLimitError`, issue #754) with no verdict. The thread's retry budget is spent and the gate went red with "manual intervention required". This run dispatched exactly one fresh `/oc review (head dce109e4)` after the cooldown expired at 10:04:24Z. No tester or eval marker.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `bb40eabadd9d6a966a7bbba167d50bf5cb2c71ce` unchanged, CLEAN/MERGEABLE. Review round 3 (42000865427) completed success at 09:49:49Z and returned `lab` with two blocking findings: B1 the R9 token guard does not mirror the general gate's contains-based wake semantics and the curator pin omits the closing quote so an appended trigger passes; B2 the claimed transcript-negative fixture does not exist and the unanchored detector still matches a transcript line that quotes the rendered annotation. The workflow forwarded `/oc lab` at 09:49:46Z; Lab Engineer 42005610434 started 09:49:52Z but died on the wall at 09:50:20Z with no decision file. Crash parity is a Maintainer re-dispatch, cooldown until 10:20:20Z; the 09:49:46Z trigger is stale.
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d3230203693f96aceea8461fb9ec5879a6d` unchanged, CLEAN/MERGEABLE. Read-only infrastructure Tester 42001720643 completed success at 09:40:33Z and approved the head at 09:40:17Z; the owner-authored `/oc approve-test` marker landed 09:40:27Z and `/oc maintainer` at 09:40:29Z. The concurrent maintainer run 42004310389 dispatched the binding eval (owner `/oc eval` at 09:46:51Z), but eval 42005204354 died on the wall at 09:50:40Z before any decision. Cooldown until 10:20:40Z, then exactly one fresh pass; the marker chain must be rebuilt on a fresh approve-eval.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Wall watch**: active and now saturating new runners. Today's deaths: 06:57:28Z, 07:20:40Z, 08:04:27Z, 08:13:49Z, 08:43:48Z, 09:34:08Z (#821 review), then three within 90 seconds: 09:50:20Z (#822 lab), 09:50:40Z (#804 eval), 09:51:39Z (maintainer 42005730253). New runners are hitting `FreeUsageLimitError` within ~30 seconds, so fresh-run recovery is degraded; the class is the #754 per-egress daily allowance, not retry exhaustion. No lab dispatch for the class, no ladder advance, no park; one fresh pass per lane per 30-minute cooldown; #822 plus the Owner capacity decision are the unblockers.
- **Curator / Auditor**: last scheduled runs green (curator 41975438138 at 05:40Z, auditor 41975127137 at 05:36Z); the next curator tick is due around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. Today's deaths are quota, not model retirement.
- **Untriaged sweep**: none.

## The live lanes (do not duplicate)

1. **#821 fresh review** - dispatched from this run after the 10:04:24Z cooldown on `dce109e4`. On approval the workflow forwards `/oc test`; on findings it forwards `/oc fix` (product PR, so `fix` is valid). Then the Tester, the native rows (`test-windows` first), the binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure.
2. **#822 lab re-dispatch** - earliest 10:20:20Z after the 09:50:20Z wall death, only if no newer lab run is live. Apply B1/B2; then the workflow's review forward, the read-only infrastructure Tester, one binding eval, the owner-authored head-bound marker chain, and the PAT sweep merging with the branch kept; #820 and #775 close. Never `fix`/`continue` (infrastructure guard).
3. **#804 fresh eval** - earliest 10:20:40Z after the 09:50:40Z wall death, only if no eval is live. On `approve-eval` verify the owner-authored head-bound marker is newer than the 09:40:27Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges (`--rebase`, fallback `--merge`, branch kept) and #798 closes. A `fix` verdict routes `lab` and rebinds the chain.
4. **#745** stays parked behind #803; #742 closes with #745.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822; review round 3 returned `lab` with B1/B2 and the lab attempt died on the wall. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open and is now the critical path: the wall is killing new runners within ~30 seconds.
2. **#804**: tester-approved on `17b11d32`; the binding eval died on the wall at 09:50:40Z. One fresh pass after 10:20:40Z, then the marker chain and the PAT sweep; #798 closes.
3. **#821**: fresh review dispatched after the cap; then the Tester, native rows, and the binding eval.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and both previews green at last check.
11. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
12. **Wall watch**: active and saturating; nine deaths today, three within 90 seconds after 09:50Z. Fresh-run recovery only; #822 is the durable mitigation.
13. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
14. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
15. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.
16. **Pending run 42005767555** (workflow_run failure wake, group `maintainer-main`) starts after this run and owns the 10:20:20Z/10:20:40Z cooldown re-dispatches.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown; never while another eval is live. When new runners die within seconds, stop after the single fresh pass rather than looping.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #821 fresh review on `dce109e4`, then follow the normal chain (workflow test forward, Tester, `test-windows` first plus `test-linux`/`test-macos`, binding eval on the settled head, merge, #792 closes).
2. At or after 10:20:20Z dispatch exactly one `lab` #822 if no newer lab run exists (the 09:49:46Z `/oc lab` is stale); then the review forward, read-only Tester, binding eval, marker chain, and PAT sweep; #820 and #775 close.
3. At or after 10:20:40Z dispatch exactly one fresh `eval` #804 if none is live; then the marker chain and PAT sweep; #798 closes.
4. If those fresh runs also die on the wall within seconds, do not loop: record the saturation, keep one fresh pass per lane per cooldown, and escalate the Owner capacity decision. No emergency edit: there is no workflow edit that creates provider quota, and the durable in-repo fix is #822.
5. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
6. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes).
7. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the fresh #821 review survive the wall and reach a verdict on `dce109e4`?
2. Do the 10:20Z fresh passes for #822's lab fix and #804's binding eval get a working egress bucket, or does the wall keep killing new runners within seconds?
3. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)? This is now the critical path.
4. Does #822's B1/B2 fix land cleanly and clear the re-bound review, Tester, and binding evaluator?
5. Does `pages.yml` stay green through the next merge cycle?
