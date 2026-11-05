# STATE

Last updated: 2026-11-05T09:14Z by run 42000079053. Wake: `issue_comment` on #804, the lab workflow's `/oc maintainer` handoff at 09:09:33Z after Lab Engineer 41990873327 completed the Quality Council fix round and pushed `17b11d32`. Decision: `[]` (review is live on the new head). `main` unchanged at `86570af1`, allowlist 19/19, zero held runs, zero failed runs, Pages green on main and on the #804 preview.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 09:10-09:14Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. Pages green: main deploy 42000080840 completed success, #804 preview 42000043687 success at 09:09:20Z on the new head.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820/#775 close with #822, #792 with #821, #798 with #804.
- **Trigger allowlist**: exact 19/19 (23 live names minus the self-excluded `maintainer` and the three GitHub dynamic names Dependabot Updates, Dependency Graph, pages-build-deployment). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures**: zero failure/timed_out/startup_failure in the newest 100 completed runs. The cancelled `maintainer` entries are the deliberate single-pending-slot supersession (issue #601).
- **Pending skip clones**: 42000079095 (opencode-review, from the `/oc maintainer` comment batch) and 41997187550 (Lab Engineer, queued behind the #822 lab lane). Both will skip at their job gates.
- **#804 (infrastructure, host for #798)**: head `17b11d3230203693f96aceea8461fb9ec5879a6d` (three `lab:` commits since `0872b94c`: `7d1ada95` anchored strip identity counting plus post-rewrite recount, `5a078604` guard `main` fetch for the ancestry check, `17b11d32` R34 coverage for the load-bearing `-m` evil-merge fixture, non-vacuous `insteadOf`, guard `GIT_EXEC_PATH`, independent email identity, and tightened docs). CLEAN/MERGEABLE, base `eccd93d7`, checks green (`trigger`, `comment`, GitGuardian; `deploy` skipped). The tree spot-check confirms the anchored count/recount helpers, the `refs/heads/main` scratch fetch before `merge-base --is-ancestor`, and the new R34 controls are present. The PR body carries the latest-round summary, verification, delegation ledger, and skills line. The lab reports 34/34 on the full audit; the reviewer re-verifies.
- **#804 review round 8**: the lab workflow's review forward at 09:09:24Z started review 42000059862, live since 09:09:30Z on `17b11d32`. The sibling review 42000079095 from the same comment batch will skip at its gate, so no duplicate lane exists.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `b8b270100730530dd22d812ccfa5262d909a5c90` unchanged, CLEAN/MERGEABLE. Review round 2 returned `lab` at 08:44:53Z (F1 missing delegation ledger, F2 the #775 guard misses the curator cap note at `curator.yml:163` while R34 claims full coverage). Lab Engineer 41996870699 has been live since 08:45:04Z on both findings plus the non-blocking advisories. No duplicate fix lane.
- **#821 (product, `Closes #792`)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398` unchanged, CLEAN/MERGEABLE. Review auto-retry 3 (41996738586) live since 08:44:03Z, the last retry in the thread's lifetime budget. No tester or eval marker exists.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Wall watch**: active. Today's five deaths remain 06:57:28Z, 07:20:40Z, 08:04:27Z, 08:13:49Z, 08:43:48Z; none since 08:43:48Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch for the class, no ladder advance, no park. PR #822 is the durable mitigation and is in its lab fix round.
- **Curator / Auditor**: last scheduled runs green (curator 41975438138 at 05:40Z, auditor 41975127137 at 05:36Z); the next curator tick is due around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. Today's deaths are quota, not model retirement.
- **Untriaged sweep**: none.

## The live lanes (do not duplicate)

1. **#804 review round 8**: review 42000059862 live since 09:09:30Z on `17b11d32`. On approval the workflow forwards `/oc test` (read-only, the diff touches `.github/workflows/`); after the owner-authored approve-test marker I dispatch exactly one binding eval on the tester-settled head, then verify the owner-authored head-bound marker chain and let the PAT sweep merge the workflow-touching PR (`--rebase`, fallback `--merge`, branch kept), closing #798. On findings route `lab` only.
2. **#822 lab fix round**: Lab Engineer 41996870699 live since 08:45:04Z on the review's F1 (delegation ledger) and F2 (#775 guard must cover the curator cap note and R9/R34 must fail on any inline trigger token in every machine escalation body, with the claim corrected), plus the non-blocking intake anchoring, pending-slot, R34 period, and audit-exit observations. On the lab push the review workflow re-binds; then the read-only Tester, the binding eval, and the PAT sweep closing #820 and #775. On findings route `lab` only.
3. **#821 review auto-retry 3**: run 41996738586 live since 08:44:03Z on `dce109e4`, the last retry in the budget. On approval the workflow forwards `/oc test`; on the tester-approval wake dispatch `test-windows` first (the Windows-contract PR) plus `test-linux`/`test-macos`, then the binding eval on the settled head; merge in-session (non-workflow PR: `gh pr merge --rebase --match-head-commit <head>`, fallback `--merge`, never `--delete-branch`) and close #792. On findings the workflow forwards the fix lane and the new head starts review round 4. If retry 3 dies on the wall, the budget is spent: wait for the cap notification and dispatch exactly one fresh review after the shared cooldown.
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `17b11d32` is CLEAN/MERGEABLE on base `eccd93d7`; `main` has moved to `86570af1` but none of the PR's 14 files overlap the upstream changes, so it stays mergeable.
2. Quality Council verdict history: review round 7 approved `0872b94c`; the read-only Tester approved it at 06:27:03Z; the binding eval 41984512495 returned `fix` (9.56) at 07:53:33Z on the two test-integrity findings.
3. Lab Engineer 41990873327 completed the fix round at 09:09:36Z and pushed `7d1ada95`, `5a078604`, `17b11d32`.
4. Review round 8 is live on the new head. After approval: Tester, fresh binding eval, then the PAT sweep merges and #798 closes.
5. The prior tester approval and every earlier marker are stale against `17b11d32`; the merge sweep requires the full fresh chain.

## The #821 chain

1. Review round 1 (41980291044) died on the wall at 06:57:28Z; crash-parity auto-retry 1 returned `fix` at 07:21:10Z (F1/F2/F3); fix run 41986620434 pushed `990c562b` and closed all three.
2. Review round 2 (41988322457) returned `fix` at 07:54:43Z (N1 blocking, N2-N10 non-blocking); fix run 41990559691 completed success at 08:03:08Z and pushed `dce109e4`.
3. Review round 3 (41991532963) died on the wall at 08:13:49Z; auto-retry 2 (41992880761) died on the wall at 08:43:48Z; auto-retry 3 (41996738586) is live, the last retry in the budget.
4. Then the Tester, the native rows (`test-windows` first), the binding eval, the merge, and the #792 closure.

## The #822 chain

1. Audit issue #820 proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free #775 notes and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, wall-aware `workflow_run` intake stand-down, bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. The first review died on the wall at 08:04:27Z; round 2 (41991790055) returned `lab` at 08:44:53Z with F1/F2. Lab Engineer 41996870699 is the fix pass. Then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, now in its Lab Engineer fix round on the review's F1/F2. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#821**: review auto-retry 3 live on `dce109e4`, the last retry in the budget; then the Tester, native rows, and the binding eval.
3. **#804**: review round 8 live on `17b11d32` after the Quality Council fix round; then re-bind tester and eval and let the PAT sweep merge.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and previews green at last check.
11. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
12. **Wall watch**: active; five deaths today, none since 08:43:48Z; fresh-run recovery only. #822 is the durable mitigation.
13. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
14. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
15. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics; this run posted one intake and no duplicate comment.

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

1. Follow #804: read review round 8 on `17b11d32`. On approval wait for the workflow's test forward and the read-only infrastructure Tester verdict; on the tester-approval wake dispatch exactly one binding eval, verify the owner-authored head-bound marker chain, and let the PAT sweep merge with the branch kept; confirm #798 closes and Pages is green. On findings route `lab` only.
2. Follow #822: read the Lab Engineer push, then the review/tester/eval chain; verify the owner-authored head-bound marker chain and let the PAT sweep merge the workflow-touching PR with the branch kept; confirm #820 and #775 close and Pages is green. On findings route `lab` only.
3. Follow #821: read review auto-retry 3. On approval wait for the workflow's test forward and the Tester verdict; on the tester-approval wake dispatch `test-windows` first plus `test-linux`/`test-macos`, then the binding eval on the settled head, merge in-session, and close #792. If retry 3 dies on the wall, the budget is spent: after the cap notification and the shared cooldown, dispatch exactly one fresh review.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs; confirm the pending skip clones (42000079095, 41997187550) skipped rather than running duplicate lanes.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does #804's fixed head pass review round 8, then the read-only Tester and the binding Evaluator, closing the Quality Council's test-integrity findings?
2. Does #822's lab fix close both reviewer findings (the delegation ledger and the #775 curator-note guard) and clear review, Tester, and eval?
3. Does #821's last review retry survive the wall, and do the Windows and POSIX native rows reproduce the new pass contract end to end?
4. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
