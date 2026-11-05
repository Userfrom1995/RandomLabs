# STATE

Last updated: 2026-11-05T08:02Z by run 41990391247. Wake: the eval workflow's `/oc maintainer` handoff at 07:53:23Z after the binding Evaluator returned `fix` (9.56) on #804 head `0872b94c`. Decision: `[lab #804]`.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 07:54-08:02Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. Pages deploy 41988340066 is green at 07:35:45Z; the #821 and #822 previews are green.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820 and #775 are open only until #822 merges, #792 rides #821, #798 rides #804.
- **Trigger allowlist**: exact 19/19 (23 live names minus the self-excluded `maintainer` plus the GitHub dynamic names Dependabot Updates, Dependency Graph, and pages-build-deployment). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **#804 (lab, host for #798)**: head `0872b94cfba3fcce16fbd99168a8956023354b4e` unchanged, CLEAN/MERGEABLE, 18 commits, 14 files, +4181/-182, merge-base `eccd93d7`. The branch is 40 commits behind main, but none of its touched files changed upstream since the merge base, so the merge stays clean. The **binding eval 41984512495** completed at 07:53:33Z with `fix` and score 9.56; the Quality Council rejection posted at 07:53:21Z. Both the head audit and the current-main merged-tree audit pass 34/34, so the two required findings are test-integrity, not runtime: (1) the R34 merge fixture baselines at `workflow_sha` and branches its side parent from that same commit, so the side edit is already inside `baseline..tip` and the guard's `diff-tree -m` is not load-bearing; (2) the anchored strip counts owner trailers over the whole range but rewrites only named-tester commits, so a foreign-only trailer prints success while nothing was removed. Smaller gaps: guard `GIT_EXEC_PATH` unset untested, vacuous guard `insteadOf` isolation, ancestry failure shadowed by the missing-object check, identity email not varied, marker per-entry mutation absent versus the docs claims. The Lab Engineer is dispatched by this run. No eval marker exists.
- **#821 (product, closes #792)**: head `990c562b30e8092236a0031e07640c974ec4cb14`, CLEAN/MERGEABLE, 9 commits, 23 files, all under `maze-chase/` and `progress/`, based on `main` `86570af1`. Review round 2 (41988322457) completed at 07:54:36Z with `fix`: one blocking finding, N1 the `--size` flag must precede `new-tab` in `maze-chase/tools/compat/run-windows.ps1:302-306`; prior F1/F2/F3 verified closed. The workflow posted its fix forward at 07:54:47Z and the Fixer run is live (opencode 41990559691); a concurrent maintainer run 41990552981 woke on the same comment. No tester or eval marker exists.
- **#822 (lab, host for #820/#775)**: head `b8b270100730530dd22d812ccfa5262d909a5c90`, CLEAN/MERGEABLE, workflow-touching (`maintainer.yml`, `curator.yml`, `auditor.yml`, `opencode.yml`, `maintainer.md`, `tester.md`, `schedule-selfheal.sh`, `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`), `Closes #820`, `Closes #775`. Review 41983515319 is live (started 06:54:11Z, about 70 minutes at survey, healthy inside the 90-minute agent cap); no verdict yet.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Failures**: the only failure in the newest 200 runs is the stale #804 eval 41984422510, which died on the #754 wall at 07:20:40Z and was already triaged. The trigger-fresh eval 41984512495 then completed with the `fix` verdict.
- **Wall watch**: active. Today's deaths: the #804 eval first pass 41978421059 at 06:29:13Z, the #821 review at 06:57:28Z, and the stale #804 eval at 07:20:40Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch, no ladder advance, no park. PR #822 is the durable mitigation.
- **Curator / Auditor**: last runs green (curator 05:40Z, auditor 05:36Z); the next curator tick is due around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. The deaths are quota, not model retirement.
- **Untriaged sweep**: none. #822 closes #820/#775; #821 closes #792; #804 closes #798; #745 follows #803; the remaining issues hold recorded queue positions or are parked trackers.

## The live lanes (do not duplicate)

1. **#804 lab fix round (dispatched by this run)**: the Lab Engineer applies the two required test-integrity fixes plus the smaller gaps, reruns `bash -n` and the full audit, and pushes. The lab workflow forwards the fresh review on the new head. Then the read-only infrastructure Tester, a fresh binding Evaluator, and the PAT sweep (`--rebase`, fallback `--merge`, branch kept) closing #798.
2. **#821 fix round 2**: the Fixer run from the 07:54:47Z forward is live. On its push the workflow re-triggers review; on approval the workflow forwards the read-only test lane, then dispatch `test-windows` first (this is the Windows-specific PR) plus `test-linux`/`test-macos`, sequence the binding eval after the rows settle, then merge (non-workflow PR: in-session `gh pr merge --rebase --match-head-commit <head>`, fallback `--merge`, never `--delete-branch`) and close #792.
3. **#822 lab**: review 41983515319 live. On approval the review workflow forwards the read-only infrastructure Tester, then the binding eval and the PAT sweep, closing #820 and #775. On findings the route is `lab` (never `fix`/`continue`).
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `0872b94c` is CLEAN/MERGEABLE on post-#788 main.
2. Review round 7 approved at 06:02:06Z on 11-04; the read-only infrastructure Tester approved at 06:27:03Z (owner-authored approve marker 6624239389 at 06:27:09Z, handoff 6624239738). No newer fix or rejection before the eval.
3. Six eval passes died on the wall (41786203805, 41793225566, 41978421059, 41984422510 and predecessors) or were superseded; the trigger-fresh 41984512495 survived and returned `fix` (9.56) at 07:53:14Z.
4. The fix verdict supersedes the approval chain: the lab repair must land first, then a fresh review, tester, and eval rebind on the new head.
5. After `approve-eval`: verify the owner-authored, head-bound marker chain (newer than the tester verdict and the latest eval trigger, not superseded), let the PAT sweep merge the workflow-touching PR, confirm #798 closes and Pages is green.

## The #821 chain

1. Review round 1 died on the wall at 06:57:28Z with no verdict; crash-parity posted auto-retry 1.
2. Auto-retry 1 returned `fix` at 07:21:10Z: F1 delegation ledger, F2 PowerShell `-Initial` exit semantics and Int32 overflow, F3 stale release toolchain text.
3. Fix run 41986620434 pushed `990c562b` at 07:34:54Z with all three findings closed; its verification: 88 compat tests OK, 37 node tests pass, render-docs 15/424, `bash -n` and pwsh parse clean.
4. Review round 2 (41988322457) returned `fix` at 07:54:36Z with N1 (`--size` before `new-tab` at `run-windows.ps1:302-306`); prior F1-F3 verified closed.
5. The fix forward is live. Then review round 3, the Tester, the native rows (`test-windows` first), the binding eval, the merge, and the #792 closure.

## The #822 chain

1. Audit issue #820 proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free #775 notes and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, wall-aware `workflow_run` intake stand-down, bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. Review is live (about 70 minutes at survey); then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, in review. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#821**: fix round 2 live from the 07:54:47Z forward; review round 3, native rows, and eval follow.
3. **#804**: lab fix round dispatched by this run; then review, tester, binding eval, PAT sweep, #798 closure.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and both previews green.
11. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
12. **Wall watch**: active; fresh-run recovery only. #822 is the durable mitigation.
13. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
14. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown; never while another eval is live. The bounded fresh-attempt cap and wall-aware intake are in flight via #822.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #804 lab fix result: on the pushed head, confirm the lab workflow forwarded the fresh review, the two required findings and the smaller gaps are addressed, and the head audit stays green. Then the review, the read-only Tester, the fresh binding eval, and the PAT sweep closing #798.
2. Read #821's fix result and review round 3. On approval wait for the workflow's test forward and the Tester verdict; on the tester-approval wake dispatch `test-windows` first plus `test-linux`/`test-macos`, then the binding eval on the settled head, then merge and close #792. On findings, let the workflow forward the fix lane.
3. Read the #822 review verdict. On approval the workflow forwards the read-only Tester; then the binding eval and the PAT sweep; confirm #820 and #775 close and Pages is green. On findings the route is `lab`.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #804 lab repair close both evaluator-required test-integrity findings and pass the fresh review, Tester, and binding Evaluator on the new head?
2. Does #821's N1 fix pass review round 3, and do the Windows and POSIX native rows reproduce the pass contract end to end?
3. Does #822's review approve cleanly so the bounded wall recovery lands?
4. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
