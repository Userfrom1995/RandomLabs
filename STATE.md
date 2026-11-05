# STATE

Last updated: 2026-11-05T09:26Z by run 42001713306. Wake: `issue_comment` on #804, the review-batch comments at 09:21:24-34Z (round-8 approval, report, `/oc test` forward). Decision: `[]` (review round 8 approved `17b11d32` and the read-only Tester is live; #822 review round 3 and #821 review auto-retry 3 remain live). `main` unchanged at `86570af1`, allowlist 19/19, zero held runs, zero failures in the newest 200 completed runs, Pages green on main and both previews.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 09:22-09:26Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. Pages green: main deploy 42000880708 success at 09:15:25Z, the #822 preview 42000862709 success on `bb40eaba` at 09:15:17Z, and #804 preview 42000043687 success on `17b11d32`.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820/#775 close with #822, #792 with #821, #798 with #804.
- **Trigger allowlist**: exact 19/19 against the 23 live workflow names (the three GitHub dynamic names Dependabot Updates, Dependency Graph, pages-build-deployment and the self-excluded `maintainer` outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures**: zero failure/timed_out/startup_failure in the newest 200 completed runs. The cancelled `maintainer` entries are the deliberate single-pending-slot supersession (issue #601).
- **#804 (infrastructure, `Closes #798`)**: head `17b11d3230203693f96aceea8461fb9ec5879a6d` unchanged, CLEAN/MERGEABLE, 21 commits, 14 files. Review round 8 (42000059862) completed success at 09:21:39Z and approved the head at 09:21:24Z: the Quality Council fixes verify load-bearing (evil-merge `diff-tree -m` fixture, anchored-strip identity count and post-rewrite recount, guard ancestry fetch, non-vacuous `insteadOf`, both `GIT_EXEC_PATH` controls, independent email identity), full audit 34 passed / 0 failed. Two non-blocking advisories: the foreign-only fixture does not assert the absence of the success line, and the mixed-case wording is imprecise about the rewritten commit SHA (the trailer is preserved). The workflow forwarded `/oc test` at 09:21:34Z; read-only infrastructure Tester 42001720643 has been live since 09:21:40Z. The 2026-11-04 tester approval and every earlier marker are stale against this head.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `bb40eabadd9d6a966a7bbba167d50bf5cb2c71ce` unchanged, CLEAN/MERGEABLE. Review round 3 (42000865427) live since 09:15:22Z; no verdict yet. The F1 delegation ledger and the F2 #775 curator-note guard are verified at the head.
- **#821 (product, `Closes #792`)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398` unchanged, CLEAN/MERGEABLE. Review auto-retry 3 (41996738586) live since 08:44:03Z, the last retry in the thread's lifetime budget. No tester or eval marker.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Wall watch**: active. Today's five deaths remain 06:57:28Z, 07:20:40Z, 08:04:27Z, 08:13:49Z, and 08:43:48Z; none since 08:43:48Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch for the class, no ladder advance, no park. PR #822 is the durable mitigation.
- **Curator / Auditor**: last scheduled runs green (curator 41975438138 at 05:40Z, auditor 41975127137 at 05:36Z); the next curator tick is due around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. Today's deaths are quota, not model retirement.
- **Untriaged sweep**: none.

## The live lanes (do not duplicate)

1. **#804 read-only Tester**: `42001720643` live since 09:21:40Z on `17b11d32` after review round 8 approved. On a clean tester verdict the owner-authored `/oc approve-test` marker unlocks exactly one binding eval on this head; after a fresh owner-authored head-bound `eval-verdict: approve-eval` marker the PAT sweep merges the workflow-touching PR (`--rebase`, fallback `--merge`, branch kept) and #798 closes. On findings the aggregate Tester forwards `/oc fix`, which the infra guard rewrites: route `lab` only.
2. **#822 review round 3**: review 42000865427 live since 09:15:22Z on `bb40eaba`. On approval the workflow forwards `/oc test` (read-only); after the owner-authored approve-test marker dispatch exactly one binding eval, verify the marker chain, and let the PAT sweep merge, closing #820 and #775. On findings route `lab` only.
3. **#821 review auto-retry 3**: run 41996738586 live since 08:44:03Z on `dce109e4`, the last retry in the budget. On approval wait for the workflow's `/oc test` and the Tester verdict; on the tester-approval wake dispatch `test-windows` first plus `test-linux`/`test-macos`, then the binding eval on the settled head; merge in-session (non-workflow PR: `gh pr merge --rebase --match-head-commit <head>`, fallback `--merge`, never `--delete-branch`) and close #792. If retry 3 dies on the wall, the budget is spent: wait for the cap notification and the shared cooldown, then dispatch exactly one fresh review.
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `17b11d32` is CLEAN/MERGEABLE on base `eccd93d7`; `main` has moved to `86570af1` but none of the PR's 14 files overlap the upstream changes, so it stays mergeable.
2. Quality Council verdict history: review round 7 approved `0872b94c`; the read-only Tester approved it at 06:27:03Z; the binding eval 41984512495 returned `fix` (9.56) at 07:53:33Z on the two test-integrity findings.
3. Lab Engineer 41990873327 completed the fix round at 09:09:36Z and pushed `7d1ada95`, `5a078604`, `17b11d32`; review round 8 then approved `17b11d32` at 09:21:24Z with the fixes verified load-bearing.
4. The read-only infrastructure Tester 42001720643 is live on `17b11d32`. After its approval: one fresh binding eval, the marker chain, and the PAT sweep.
5. The prior tester approval and every earlier marker are stale against `17b11d32`; the merge sweep requires the full fresh chain.

## The #821 chain

1. Review round 1 (41980291044) died on the wall at 06:57:28Z; crash-parity auto-retry 1 returned `fix` at 07:21:10Z (F1/F2/F3); fix run 41986620434 pushed `990c562b` and closed all three.
2. Review round 2 (41988322457) returned `fix` at 07:54:43Z (N1 blocking, N2-N10 non-blocking); fix run 41990559691 completed success at 08:03:08Z and pushed `dce109e4`.
3. Review round 3 (41991532963) died on the wall at 08:13:49Z; auto-retry 2 (41992880761) died on the wall at 08:43:48Z; auto-retry 3 (41996738586) is live, the last retry in the budget.
4. Then the Tester, the native rows (`test-windows` first), the binding eval, the merge, and the #792 closure.

## The #822 chain

1. Audit issue #820 proposed bounded quota-wall recovery and wall-aware intake; the Lab Engineer run 41978422369 implemented both plus the token-free #775 notes and opened #822 at ~06:53Z.
2. The PR adds the `.maintainer/quota-wall` marker, wall-aware `workflow_run` intake stand-down, bounded 2-attempt fresh-run recovery on a fixed `quota-recovery` group with jitter, the red cap escalation, and audit R34 with mutation self-tests. `Closes #820`, `Closes #775`.
3. Review round 1 died on the wall at 08:04:27Z; round 2 (41991790055) returned `lab` at 08:44:53Z with F1/F2. Lab Engineer 41996870699 fixed both and pushed `bb40eaba` at 09:15Z (F1 ledger in the PR body and a decision note; F2 R9 curator cap-note pin plus the token ban, R34 intake/recovery pins and corrected claim).
4. Review round 3 (42000865427) is live. Then the read-only Tester, the binding eval, and the PAT sweep. No fix lane (infrastructure guard).

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#820 / #775**: the fix is PR #822, now in review round 3 after the F1/F2 fix round. The owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open.
2. **#804**: review round 8 approved `17b11d32`; the read-only Tester is live. Then one fresh binding eval, the marker chain, and the PAT sweep; #798 closes.
3. **#821**: review auto-retry 3 live on `dce109e4`, the last retry in the budget; then the Tester, native rows, and the binding eval.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and both previews green at last check.
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
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, no re-dispatch inside a known-window. A binding eval that died on the wall is recovered by one fresh run per lane after the shared cooldown; never while another eval is live. The bounded fresh-attempt cap and wall-aware intake land with #822.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Follow #804: read the read-only Tester verdict on `17b11d32`. On approval dispatch exactly one binding eval on this head, verify the owner-authored head-bound marker chain (approve-test newer than the head, eval marker newer than that verdict and the latest eval trigger, not superseded), and let the PAT sweep merge (`--rebase`, fallback `--merge`, branch kept); confirm #798 closes and Pages is green. On findings route `lab` only.
2. Follow #822: read review round 3 on `bb40eaba`. On approval wait for the workflow's test forward and the read-only infrastructure Tester verdict; on the tester-approval wake dispatch exactly one binding eval, verify the marker chain, and let the PAT sweep merge; confirm #820 and #775 close. On findings route `lab` only.
3. Follow #821: read review auto-retry 3. On approval wait for the workflow's test forward and the Tester verdict; on the tester-approval wake dispatch `test-windows` first plus `test-linux`/`test-macos`, then the binding eval on the settled head, merge in-session, and close #792. If retry 3 dies on the wall, the budget is spent: after the cap notification and the shared cooldown, dispatch exactly one fresh review.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs; confirm the pending skip clones skipped rather than running duplicate lanes.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does #804's read-only Tester pass the fixed head, and does the fresh binding Evaluator clear the 9.8 bar and close the test-integrity findings?
2. Does #822 review round 3 approve the fix round, clearing the read-only Tester and the binding eval?
3. Does #821's last review retry survive the wall, and do the Windows and POSIX native rows reproduce the new pass contract end to end?
4. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
