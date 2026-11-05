# STATE

Last updated: 2026-11-05T09:46Z by run 42004310389. Wake: `issue_comment` on #804, the Tester verdict batch at 09:40:24-29Z (signed pass report, owner-authored `/oc approve-test` marker, `/oc maintainer` handoff). Decision: `[{"action":"eval","pr":804}]` (one binding Evaluator pass dispatched on the tester-approved head; #822 review round 3 live; #821's review budget is spent after the 09:34Z wall death, fresh review due after 10:04:24Z). `main` unchanged at `86570af1`, allowlist 19/19, zero held runs, Pages green.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 09:40-09:46Z)

- **main** = `86570af18a6bfef572da05d5bfe5af61d894eb86` (`git ls-remote` matches), unchanged since the 06:04Z #788 merge. Pages green: main deploy 42000880708 success at 09:15:25Z on `86570af1`, the #822 preview 42000862709 success at 09:15:17Z on `bb40eaba`, and the #804 preview 42000043687 success on `17b11d32`.
- **Open PRs**: #822, #821, #804, #745. **Open issues**: 21, all triaged or held; #820/#775 close with #822, #792 with #821, #798 with #804.
- **Trigger allowlist**: exact 19/19 against the 23 live workflow names (the three GitHub dynamic names Dependabot Updates, Dependency Graph, pages-build-deployment and the self-excluded `maintainer` outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures**: only the #821 review auto-retry 3 (41996738586) completed failure at 09:34:30Z (see below). No other failure/timed_out/startup_failure in the surveyed window. The cancelled `maintainer` entries at 09:40:31-47Z are the deliberate single-pending-slot supersession (issue #601), not failures.
- **#804 (infrastructure, `Closes #798`)**: head `17b11d3230203693f96aceea8461fb9ec5879a6d` unchanged, CLEAN/MERGEABLE, 21 commits, 14 files. The read-only infrastructure Tester 42001720643 completed success at 09:40:33Z and approved the head at 09:40:24Z (full audit 34 passed / 0 failed, live preflight rc 0, independent sandbox 16/16, parity/routing/hygiene clean; two non-blocking doc nits only). The workflow published the owner-authored `/oc approve-test` marker 6654705985 at 09:40:27Z and the `/oc maintainer` handoff 6654706492 at 09:40:29Z. No eval trigger or eval marker existed at survey; every earlier tester approval and eval marker is stale against this head. This run dispatched exactly one binding eval.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `bb40eabadd9d6a966a7bbba167d50bf5cb2c71ce` unchanged, CLEAN/MERGEABLE. Review round 3 (42000865427) is live since 09:15:22Z (healthy, about 28 minutes at survey). No verdict yet. The F1 delegation ledger and F2 #775 curator-note guard are verified at the head.
- **#821 (product, `Closes #792`)**: head `dce109e4479b3cf2801a1b0127ea98778e58c398` unchanged, CLEAN/MERGEABLE. Review auto-retry 3 (41996738586) ran about 50 minutes (08:44-09:34Z) and died on the #754 wall at 09:34:24Z with no verdict; the verify found no published reviewer-signed comment and hit the cap: "Review gate still dead after 4 attempts (1 initial + 3 auto-retries). Manual intervention required." The thread's lifetime retry budget is spent. The failure summoned the concurrent maintainer run 42003503857 (workflow_run, live since 09:34:37Z). No tester or eval marker exists. A fresh manual head-bound review is due at the first wake at or after 10:04:24Z (30-minute failure-triage cooldown).
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Concurrent maintainer lane**: run 42003503857 (workflow_run failure triage for the #821 review death) has been in its agent step since 09:34:37Z. This run is in group `maintainer-804` (issue_comment), so both run concurrently by design; its decision on #821 (if any) and its comment are keep-both with this run.
- **Wall watch**: active. One new death today: #821 review auto-retry 3 at 09:34:24Z. Today's earlier five remain 06:57:28Z, 07:20:40Z, 08:04:27Z, 08:13:49Z, and 08:43:48Z. This is the #754 per-egress daily free-usage class: fresh-run recovery only, `retry-after` diagnostic only, no lab dispatch for the class, no ladder advance, no park. PR #822 is the durable mitigation and is in review round 3.
- **Curator / Auditor**: last scheduled runs green (curator 41975438138 at 05:40Z, auditor 41975127137 at 05:36Z); the next curator tick is due around 11:40Z. No re-dispatch.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on all knobs; ladder 3/3 live and free. Today's deaths are quota, not model retirement.
- **Untriaged sweep**: none.

## The live lanes (do not duplicate)

1. **#804 binding eval**: dispatched by this run on `17b11d32` after the Tester's owner-authored approval. On `approve-eval` the eval workflow publishes the fresh head-bound `eval-verdict: approve-eval` marker and hands back; the PAT sweep then merges the workflow-touching PR (`--rebase`, fallback `--merge`, branch kept) and #798 (and #804) close. On `fix`, route `lab` only, never `fix`/`continue`.
2. **#822 review round 3**: run 42000865427 live since 09:15:22Z on `bb40eaba`. On approval the workflow forwards `/oc test` (read-only); after the owner-authored approve-test marker dispatch exactly one binding eval, verify the marker chain, and let the PAT sweep merge, closing #820 and #775. On findings route `lab` only.
3. **#821 fresh review boundary**: no live lane; the review budget is spent and the cooldown from the 09:34:24Z death ends 10:04:24Z. The first wake at or after that boundary owns exactly one fresh manual head-bound review on `dce109e4`. Then the Tester, the native rows (`test-windows` first), the binding eval, the in-session merge (`--rebase --match-head-commit <head>`, fallback `--merge`, never `--delete-branch`), and the #792 closure.
4. **#745** stays parked behind #803; #742 closes with #745.

## The #804 chain

1. Head `17b11d32` is CLEAN/MERGEABLE on base `eccd93d7`; `main` has moved to `86570af1` (the branch is 40 behind) but none of the PR's 14 files overlap the upstream changes and the merged tree is clean, so the rebase merge applies cleanly.
2. Review round 8 (42000059862) approved `17b11d32` at 09:21:24Z with the Quality Council fixes verified load-bearing.
3. The read-only infrastructure Tester 42001720643 approved the same head at 09:40:24Z; the workflow published the owner-authored approve-test marker at 09:40:27Z.
4. This run dispatched exactly one binding eval on that tester-settled head at 09:46Z.
5. After `approve-eval`: the PAT sweep verifies a fresh head-bound approve-test verdict plus a fresh head-bound eval marker newer than that verdict and the latest eval trigger, and merges. Every prior marker is stale against `17b11d32`.

## The #821 chain

1. Review round 1 (41980291044) died on the wall at 06:57:28Z; crash-parity auto-retry 1 returned `fix` at 07:21:10Z (F1/F2/F3); fix run 41986620434 pushed `990c562b` and closed all three.
2. Review round 2 (41988322457) returned `fix` at 07:54:43Z (N1 blocking, N2-N10 non-blocking); fix run 41990559691 completed success at 08:03:08Z and pushed `dce109e4`.
3. Review round 3 (41991532963) died on the wall at 08:13:49Z; auto-retry 2 (41992880761) died at 08:43:48Z; auto-retry 3 (41996738586) ran to 09:34:24Z and died on the wall, then the verify hit the lifetime cap.
4. Next: one fresh manual head-bound review after 10:04:24Z, then the Tester, native rows, binding eval, merge, and the #792 closure. Issue #803 tracks the lifetime-budget root cause.

## The #822 chain

1. Audit issue #820 proposed bounded quota-wall recovery and wall-aware intake; Lab Engineer run 41978422369 implemented both plus the token-free #775 notes and opened #822 at about 06:53Z.
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
2. **#804**: Tester approved `17b11d32`; one binding eval dispatched by this run. Then the marker chain and the PAT sweep; #798 closes.
3. **#821**: review budget spent (wall death at 09:34:24Z); one fresh head-bound review due after 10:04:24Z, then the Tester, native rows, and the binding eval.
4. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
5. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
6. **#814**: held behind #803; coordinate the same verify region.
7. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
8. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
9. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Pages**: main and both previews green at last check.
11. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
12. **Wall watch**: active; six deaths today, newest 09:34:24Z; fresh-run recovery only. #822 is the durable mitigation.
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

1. Follow #804: read the binding Evaluator verdict from this dispatch. On `approve-eval`, verify the owner-authored, head-bound marker chain (approve-test newer than the head push, eval marker newer than that verdict and the latest eval trigger, not superseded by a newer rejection), let the PAT sweep merge (`--rebase`, fallback `--merge`, branch kept), and confirm #798 and #804 close and Pages is green. On `fix`, route `lab` only.
2. Follow #822: read review round 3 on `bb40eaba`. On approval wait for the workflow's test forward and the read-only infrastructure Tester verdict; on the tester-approval wake dispatch exactly one binding eval, verify the marker chain, and let the PAT sweep merge; confirm #820 and #775 close. On findings route `lab` only.
3. #821: at the first wake at or after 10:04:24Z, dispatch exactly one fresh manual head-bound review on `dce109e4` (do not dispatch before the boundary; the lifetime budget is spent). Then the Tester, the native rows with `test-windows` first, the binding eval, the in-session merge, and the #792 closure.
4. Verify Pages after any merge; re-check held runs and the four permanently queued runs; confirm pending skip clones skipped rather than ran duplicate lanes.
5. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes). Follow #821 rather than re-dispatching its build.
6. Record the Owner capacity decision when given (fund the provider plan, raise the allowance, or lower the Maintainer cadence).
7. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #804 binding Evaluator clear the 9.8 bar on the tester-settled head and publish the approve-eval marker for the PAT sweep?
2. Does #822 review round 3 approve the fix round, clearing the read-only Tester and the binding eval?
3. Does the fresh #821 review after 10:04:24Z survive the wall, and do the Windows and POSIX native rows reproduce the pass contract end to end?
4. Will the Owner take the capacity decision (fund OpenCode Go or raise the allowance, or approve a lower Maintainer cadence)?
5. Does `pages.yml` stay green through the next merge cycle?
