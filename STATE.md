# STATE

Last updated: 2026-11-05T07:06Z by run 41984458060. Wake: the pr-trigger `/oc maintainer` on #822 at 07:02:40Z. Decision: `[]` - three healthy live lanes (#822 review, #821 review auto-retry, #804 eval plus one queued duplicate), zero held runs, allowlist 19/19, `main` unchanged. The only new fact is that the #804 eval was dispatched twice after the cooldown (triage run 07:02:20Z, schedule run 07:03:07Z); the eval workflow serializes them per PR, and the newer trigger is the binding one.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 07:03-07:06Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches). Pages preview redeploy 41984455890 green at 07:02:41Z; both the #821 and #822 previews are green; no main push since the 06:04Z #788 merge.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21. #820 and #775 are open only until #822 merges.
- **Trigger allowlist**: exact 19/19 (23 live names minus the deliberately self-excluded `maintainer`, plus Dependabot Updates, Dependency Graph, and pages-build-deployment which are GitHub dynamic names). No lab fix needed.
- **#822 (lab, host for #820/#775)**: head `b8b270100730530dd22d812ccfa5262d909a5c90`, CLEAN/MERGEABLE, 3 commits, workflow-touching (`maintainer.yml`, `curator.yml`, `auditor.yml`, `opencode.yml`, `maintainer.md`, `tester.md`, `schedule-selfheal.sh`, `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`), body `Closes #820`, `Closes #775`. Review 41983515319 live since 06:54:11Z (healthy). The three held 06:54 runs were cleared by the approve sweep and all checks report pass.
- **#821 (product, closes #792)**: head `f3364c7c5a9e94df61ffc113fadacfa256959eb9`, CLEAN/MERGEABLE. Review auto-retry 41983905539 live since 06:57:53Z after 41980291044 died on the wall at 06:57:28Z with no published verdict (crash-parity retry posted 06:57:44Z). Native rows stay deferred until the Tester lane settles.
- **#804 (lab, host for #798)**: head `0872b94cfba3fcce16fbd99168a8956023354b4e` unchanged, CLEAN/MERGEABLE, workflow-touching. Review round 7 and the read-only infrastructure Tester approved this head; owner marker 6624239389 at 06:27:09Z on 11-04 with handoff 6624239738, no newer fix or rejection, no eval marker. Two fresh evals are now queued after the shared cooldown: 41984422510 (in progress since 07:02:25Z, trigger 07:02:20Z from triage run 41980742985) and 41984512495 (pending, trigger 07:03:07Z from schedule run 41984139299). Per-PR `queue: max` serialises them; the first is trigger-stale, so its marker publisher will refuse and the second is the effective binding pass.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **Failures**: no `failure` or `timed_out` run in the newest 200. Eight `maintainer workflow_run` runs at 07:02:25-07:02:34Z show `cancelled`: deliberate single-pending-slot superseding in the `maintainer-main` group (issue #601), not a failure signature; every Maintainer run re-surveys fresh.
- **Wall watch**: active. Today's deaths: the #821 review at 06:57:28Z and the #804 eval at 06:29:18Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch, no ladder advance, no park. The durable fix is PR #822.
- **Curator / Auditor**: last runs green (curator 05:40Z, auditor 05:36Z); next curator tick around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. The wall deaths are quota, not model retirement.
- **Untriaged sweep**: none. #822 closes #820/#775; #821 closes #792; #804 closes #798; #745 follows #803; the remaining issues hold recorded queue positions or are parked trackers (#582 Phase 6, #657/#655/#659/#661/#677/#678/#683, #742/#773/#774/#812/#814/#815).

## The live lanes (do not duplicate)

1. **#804 eval pair**: 41984422510 live, 41984512495 queued. The trigger-fresh second pass is the binding one. On `approve-eval`, verify the owner-authored head-bound marker is newer than tester verdict 6624239389 and the latest eval trigger and is not superseded; the PAT sweep merges the workflow-touching PR (`--rebase`, fallback `--merge`, branch kept) and closes #798. On `fix`, route `lab` with the findings and re-bind the review/tester/eval chain to the new head. Do not dispatch a third eval while either run is live.
2. **#822 lab**: review 41983515319 live. On approval the review workflow forwards `/oc test` (read-only infrastructure Tester), then the binding eval, then the PAT sweep. It closes #820 and #775. #804 shares `silent-stall-audit.sh`, `AGENTS.md`, and `LAB.md`, so whichever lands second rebases and re-gates.
3. **#821 product**: review auto-retry 41983905539 live. On approval the workflow forwards `/oc test`; on findings it forwards `/oc fix` (product code, fix is valid). Then the Tester lane, then native rows (`test-windows` first for this Windows-specific PR, plus `test-linux`/`test-macos` for the shared parser/runner edits), then the binding eval on the settled head, then the merge and the #792 closure.
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `0872b94c` is CLEAN/MERGEABLE on the post-#788 main; the file lanes did not overlap with #788.
2. Review round 7 approved at 06:02:06Z; the read-only infrastructure Tester approved at 06:27:03Z (owner-authored `/oc approve-test` 6624239389 at 06:27:09Z, handoff 6624239738). No newer fix or rejection.
3. Four binding evals have died on the wall (41786203805, 41793225566, 41978421059) or are in flight; the duplicate pair dispatched after the 06:59:18Z cooldown is the designed fresh-run recovery.
4. After approval: verify the marker chain (owner-authored, head-bound `0872b94c`, newer than the tester verdict and the latest eval trigger, not superseded), let the PAT sweep merge, confirm #798 closes and Pages is green.

## The #822 chain

1. Audit issue #820 (created 06:01:14Z) proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free escalation notes (#775) and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, the wall-aware `workflow_run` intake stand-down, the bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. Review is live; then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, in review. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#821**: review auto-retry 1 live; native rows and eval follow the Tester.
3. **#804**: two serialized evals queued; then the marker chain, the PAT sweep, the #798 closure.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and both previews green; the #822 preview cleared its held check.
11. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
12. **Wall watch**: active; fresh-run recovery only. #822 is the durable mitigation.
13. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
14. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid if the review finds issues.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown. The bounded fresh-attempt cap and wall-aware intake are in flight via #822.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read whichever #804 eval finishes first; expect the trigger-fresh second pass to be the binding one. On `approve-eval`, verify the owner-authored, head-bound marker chain and let the PAT sweep merge the workflow-touching PR with the branch kept, then confirm the #798 closure and Pages. On `fix`, route `lab`. If both evals die on the wall, count the attempts and take the next fresh-run slot after the cooldown; do not dispatch a third pass while any eval is live.
2. Read the #822 review verdict. On approval the workflow forwards `/oc test`; on findings the review workflow forces `/oc lab` (infrastructure PR). Then the binding eval and the PAT sweep; confirm #820 and #775 close and Pages is green.
3. Read the #821 review auto-retry verdict. On approval the workflow forwards `/oc test`; on findings it forwards `/oc fix` (product PR). On the tester-approval wake dispatch `test-windows` first plus `test-linux`/`test-macos`, sequence the binding eval after the rows settle, then merge and close #792.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the first (trigger-stale) #804 eval waste the bucket or die on the wall before the trigger-fresh second pass runs?
2. Does #822's review approve cleanly so the resilience fix can reach the Tester, the eval, and the PAT sweep?
3. Does #821's review auto-retry 1 survive the wall and approve cleanly, or return findings to the Fixer?
4. Does the Windows native row reproduce the new pass contract end to end on a real Windows host (#821)?
5. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
6. Does `pages.yml` stay green through the next merge cycle?
