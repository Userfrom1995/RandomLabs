# STATE

Last updated: 2026-11-05T08:54Z by run 41997187236. Wake: `issue_comment` on #822, the owner `/oc maintainer` at 08:47:23Z posted by the general lane's hardcoded handoff after its no-action session; the preceding maintainer run 41996865992 had already surveyed and posted the intake, so this was a duplicate no-op wake. Decision: `[]`. No new comments or lane completions since the preceding survey; #822 lab 41996870699, #821 review auto-retry 3 41996738586, and #804 lab 41990873327 all still live. `main` unchanged at `86570af1`, allowlist 19/19, zero held runs, zero failed runs, Pages green.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 08:47-08:54Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. `Deploy static site to GitHub Pages` 41991548676 is green at 08:03:47Z on main; the #821 preview is current.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820/#775 close with #822, #792 with #821, #798 with #804.
- **Trigger allowlist**: exact 19/19 (20 live names minus the self-excluded `maintainer`). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (36101155868, 36101155851, 36101155844, 37344324101).
- **Failures**: zero failure/timed_out/startup_failure in the newest 100 completed runs.
- **New activity**: none since the preceding run's 08:48:43Z intake; no lane completed and no new comment landed on #822/#821/#804.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `b8b270100730530dd22d812ccfa5262d909a5c90` unchanged, CLEAN/MERGEABLE. Review round 2 (41991790055) returned `lab` at 08:44:53Z with two blocking findings: F1 the run has no delegation ledger despite the >3-unit/>4-file threshold (the PR body still greps 0 for delegation/ledger/subagent), and F2 the #775 guard does not cover the curator cap note at `curator.yml:163` while R34 claims full coverage (R9 only bans the self-heal literal; R20 pins a different marker). Non-blocking: the intake provider-form fallback is unanchored, the single `quota-recovery` pending slot can be displaced, R34 omits the trailing period, and `silent-stall-audit.sh` exits 0 on rule failures (pre-existing). The review workflow's forward started Lab Engineer 41996870699 at 08:45:04Z, still live and the only fix lane.
- **Pending lab clone**: 41997187550 (created 08:47:27Z from the `/oc maintainer` comment batch) is queued in the `lab-822` group behind 41996870699. Its job gate requires `startsWith(comment.body, '/oc lab')`, so it will skip on its turn; it is not a second fix pass and `queue: max` means it displaces nothing.
- **#821 (product, closes #792)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398`, CLEAN/MERGEABLE. Review round 3 (41991532963) died on the #754 wall at 08:13:49Z; auto-retry 2 (41992880761) died on the wall at 08:43:48Z; crash parity posted `/oc review (auto-retry 3)` at 08:43:56Z (comment 6653642111) and run 41996738586 is live since 08:44:03Z. That is the LAST retry in the budget: if it dies the review cap notifies and the lane needs one fresh dispatch from me after the shared cooldown. No tester or eval marker exists.
- **#804 (infrastructure, host for #798)**: head `0872b94cfba3fcce16fbd99168a8956023354b4e` unchanged, CLEAN/MERGEABLE, workflow-touching. Lab Engineer 41990873327 (the Evaluator's two required test-integrity fixes plus the coverage/doc gaps) is still live since 07:57:34Z. The owner-authored tester approval is from 2026-11-04 and there is no fresh `eval-verdict` marker (the binding eval returned `fix`, 9.56), so the PAT sweep has nothing to merge.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Wall watch**: active. Today's deaths: #821 review 06:57:28Z, #804 eval first pass 07:20:40Z, #822 review 08:04:27Z, #821 review round 3 08:13:49Z, #821 auto-retry 2 08:43:48Z; none since 08:43:48Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch for the class itself, no ladder advance, no park. PR #822 is the durable mitigation and is now in its lab fix round.
- **Curator / Auditor**: last scheduled runs green (curator 41975438138 at 05:40Z, auditor 41975127137 at 05:36Z); the next curator tick is due around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. Today's deaths are quota, not model retirement.
- **Untriaged sweep**: none.

## The live lanes (do not duplicate)

1. **#822 lab fix round**: Lab Engineer 41996870699 live since 08:45:04Z on the review's F1 (delegation ledger) and F2 (#775 guard must cover the curator cap note and R9/R34 must fail on any inline trigger token in every machine escalation body, with the claim corrected); it should also weigh the non-blocking intake anchoring, pending-slot, R34 period, and audit-exit observations. On the lab push the review workflow re-binds (workflow-touching, so route `lab` again on findings, never `fix`/`continue`), then the read-only infrastructure Tester, the binding eval, and the PAT sweep closing #820 and #775. The queued clone 41997187550 will skip at its gate.
2. **#821 review auto-retry 3**: run 41996738586 live on `dce109e4`. On approval the workflow forwards `/oc test`; on the tester-approval wake dispatch `test-windows` first (this is the Windows-contract PR) plus `test-linux`/`test-macos` for the shared parser/runner edits, then the binding eval on the settled head; merge in-session (non-workflow PR: `gh pr merge --rebase --match-head-commit <head>`, fallback `--merge`, never `--delete-branch`) and close #792. On findings the workflow forwards the fix lane and the new head starts review round 4. If retry 3 dies on the wall, the budget is spent: wait for the cap notification and dispatch exactly one fresh review after the shared cooldown.
3. **#804 lab fix round**: Lab Engineer 41990873327 live with the Evaluator's two required test-integrity fixes (`diff-tree -m` load-bearing merge fixture plus its removal mutation; anchored-strip no-op success) and the smaller coverage/doc gaps. On the lab push, re-bind the review/tester/eval chain (workflow-touching, so the PAT sweep is the only merge path) and expect #798 to close after approval.
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `0872b94c` is CLEAN/MERGEABLE on post-#788 main, behind but with no upstream changes in its 14 files (merge-base `eccd93d7`).
2. Review round 7 approved at 06:02:06Z; the read-only infrastructure Tester approved at 06:27:03Z (owner-authored `/oc approve-test` 6624239389 at 06:27:09Z, handoff 6624239738). No newer fix or rejection before the eval.
3. The binding eval 41984512495 returned `fix` (9.56, below the 9.8 bar) at 07:53:33Z. The Lab Engineer lane 41990873327 is the required fix pass.
4. After the lab push: review, tester, fresh binding eval, then the PAT sweep merges (`--rebase`, fallback `--merge`, branch kept) and #798 closes.

## The #821 chain

1. Review round 1 (41980291044) died on the wall at 06:57:28Z with no verdict; crash-parity posted `/oc review (auto-retry 1)`.
2. The auto-retry 41983905539 returned `fix` at 07:21:10Z (F1/F2/F3); fix run 41986620434 pushed `990c562b` and closed all three.
3. Review round 2 (41988322457) returned `fix` at 07:54:43Z: N1 blocking, N2-N10 non-blocking. Fix run 41990559691 completed success at 08:03:08Z and pushed `dce109e4`.
4. Review round 3 (41991532963) died on the wall at 08:13:49Z; auto-retry 2 (41992880761) died on the wall at 08:43:48Z; auto-retry 3 (41996738586) is live. Then the Tester, the native rows (`test-windows` first), the binding eval, the merge, and the #792 closure.

## The #822 chain

1. Audit issue #820 proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free #775 notes and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, wall-aware `workflow_run` intake stand-down, bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. The first review died on the wall at 08:04:27Z; round 2 (41991790055, the crash-parity retry) returned `lab` at 08:44:53Z with F1/F2. Lab Engineer 41996870699 is the fix pass. Then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, now in its Lab Engineer fix round on the review's F1/F2. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#821**: review auto-retry 3 live on `dce109e4`, the last retry in the budget; then the Tester, native rows, and the binding eval.
3. **#804**: binding eval returned `fix` (9.56); Lab Engineer 41990873327 live; then re-bind review/tester/eval and the PAT sweep.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and all previews green at last check.
11. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
12. **Wall watch**: active; five deaths today (06:57:28Z, 07:20:40Z, 08:04:27Z, 08:13:49Z, 08:43:48Z); fresh-run recovery only. #822 is the durable mitigation.
13. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
14. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
15. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics; this run posted no duplicate comment and left `comment.md` empty.

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

1. Follow #822: read the Lab Engineer push, then the review/tester/eval chain; verify the owner-authored head-bound marker chain and let the PAT sweep merge the workflow-touching PR with the branch kept; confirm #820 and #775 close and Pages is green. On findings route `lab` only.
2. Follow #821: read review auto-retry 3. On approval wait for the workflow's `/oc test` and the Tester verdict; on the tester-approval wake dispatch `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, merge in-session, and close #792. If retry 3 dies on the wall, the budget is spent: after the cap notification and the shared cooldown, dispatch exactly one fresh review.
3. Follow #804: read the Lab Engineer push, then the re-bound review/tester/eval chain; verify the owner-authored, head-bound marker chain and let the PAT sweep merge the workflow-touching PR with the branch kept, then confirm the #798 closure and Pages.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs; confirm the queued lab clone 41997187550 skipped at its gate rather than running a duplicate fix.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #822 lab fix close both reviewer findings (the delegation ledger and the #775 curator-note guard) and clear review, Tester, and eval?
2. Does #821's last review retry survive the wall, and do the Windows and POSIX native rows reproduce the new pass contract end to end?
3. Does the #804 lab repair close both Evaluator test-integrity findings and lift the score above the 9.8 bar on a fresh binding eval?
4. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
