# STATE

Last updated: 2026-11-08T03:35Z by run 42442875742 (intake: the #832 Tester returned `lab` on the plugin-import finding and Lab Engineer 42442877355 is live; #829's Tester approved and its binding eval is live; #833 merged at 03:34:18Z on the approved eval marker and #825 closed). Next-run priorities: verify the #832 lab push and the restarted review, verify the Pages deploy for the new main tip `942ff349`, read the #829 eval and #804 review verdicts, keep #821 parked.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:29-03:34Z on 2026-11-08)

- **main** = `942ff3491e559dec7b7e3a17d221ed079cb3bfda` after the #833 rebase merge at 03:34:18Z (the survey opened on `5b699601`; `git ls-remote` verified the advance at 03:35Z). The Pages deploy for the new tip is the remaining post-merge check: the newest main deploy is still `5b699601` at 03:09:13Z.
- **The wall**: absent in this window. Every lane surveyed here completed or is running on a fresh runner; the Tester and eval verdicts landed normally. The per-egress-IP daily allowance still applies, so a fresh pass remains the recovery class for a death.
- **Open PRs** (5):
  - **#832** `e260536aa7cf05a12e1f5d25d8e69f324311c0eb` MERGEABLE/CLEAN, 6 commits on `5b699601`, the project-config opt-out PR (`Refs #831`, branch `opencode/lab-831-project-config-optout`). Tester 42440624640 completed at 03:28:37Z with `lab`: the opt-out pair is verified on all 21 arms and the audit is 34/34, but on shipped CLI 1.19.5 the project `.opencode/plugin/*.js` module top-level code still executes at instance bootstrap under `OPENCODE_DISABLE_PROJECT_CONFIG=true` (only the factory and hooks are suppressed). The Tester and per-OS arms pre-check out the PR head with `contents: write`; Reviewer and Evaluator pre-check out the PR head with contents read plus PR/issues write, so this is import-time code execution with the job token and provider keys in those arms. The docs, R31 wording, `maintainer.yml` envelope, and decision note overclaim; the PR stays `Refs #831` and #831 stays open for the residual plus the Owner-requested scratch canary. The test workflow's 03:28:35Z handoff dispatched Lab Engineer 42442877355, live since 03:28:37Z.
  - **#833** MERGED at 03:34:18Z (rebase) on `6d858a0d425c6c44afa7681dc52d31b80c6410e7`, 4 commits on the previous main `5b699601`, the Curator archived-README remediation (`Fixes #825`, branch `opencode/issue825-curate-archive-readme-links`). Evaluator 42441516641 approved the head at 9.8/10 at 03:32:05Z; the `eval-verdict: approve-eval` marker published at 03:32:13Z; the `/oc maintainer` handoff at 03:32:15Z woke Maintainer 42443129459, which merged the docs-and-test-only PR at 03:34:18Z and closed #825 at 03:34:20Z. The Pages dispatch for the new tip is the outstanding post-merge check.
  - **#829** `48bb2dc494dab4d06910d5460be391d417e967d0` MERGEABLE/CLEAN, 8 commits on `5b699601`, the curator cap/durability PR (`Closes #827`, branch `opencode/lab-827-curator-cap-headroom`). Tester 42439068095 completed SUCCESS at 03:29:29Z approving the head (full R1-R34 green, prior F1 fixed); the owner-authored `/oc approve-test` marker published at 03:29:24Z. The dedicated #829 Maintainer run dispatched the binding eval at 03:33:14Z (opencode-eval 42443202122 live since 03:33:17Z). This is a workflow-touching PR, so it merges only through the PAT sweep after `approve-eval`.
  - **#804** `efb1784e7553251624deaf7612e4307e034392da` MERGEABLE/CLEAN, 2 commits on `5b699601`, 11 files, the per-OS commit-scope guard (`Closes #798`, branch `opencode/issue798-20261102035359`). Review 42439783880 is live since 02:44:14Z on the rebased head (about 50 minutes in, inside the 90-minute agent cap).
  - **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but behind main (15 commits, base `86570af1`), the Maze Chase harness PR (`Closes #792`). Parked on the Owner capacity decision; no fresh pass.
  - **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY (5 commits, base `e73bd7a2`), parked behind #803.
- **Open issues** (21): #827 closes with #829, #831 stays open past #832 for the plugin-import residual plus the scratch canary, #798 with #804, #792 with #821, #742 with #745; #825 closed at 03:34:20Z with the #833 merge. #812/#814/#815/#803/#773/#774/#683/#678/#677/#661/#659/#657/#655/#582 remain the known held follow-ups; #70 and #42 are the boards. No untriaged issue; the newest is #831.
- **Held runs**: zero `action_required` (the two #833 tester-push runs were cleared). The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the only extra active names are GitHub-managed: Dependabot Updates, Dependency Graph, pages-build-deployment). No lab fix needed.
- **Model watch**: the registry serves 81 models; the pin `opencode/deepseek-v4.1-flash-free` and all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) resolve (the registry lists them unprefixed; the resolver adds the provider prefix). No retirement.
- **Failures**: none since the wall lifted at 02:19Z; no failure or timeout today after that point. The maintainer cancellations are the deliberate single-pending-slot supersede noise from the comment-triggered burst, not crashes.
- **Concurrent wakes**: this run 42442875742 on #832 (from the 03:28:33Z Tester report), with 42442877470 pending behind it in the #832 group; #829 maintainer 42442926140 (dispatched its eval) with 42443202118 skipped and 42442929748 pending; #833 maintainer 42443129459 in progress with 42443133211 pending. Keep-both memory handles the overlap; each target-scoped run owns its own routing.

## The live lanes (do not duplicate)

1. **#832** - Lab Engineer 42442877355 live on the plugin-import finding. Next: the lab push restarts the review on the new head; then a fresh Tester, the binding eval, and the PAT sweep (workflow-touching PR). The lab must correct the overclaims, close or explicitly record the residual, and keep `Refs #831`. On findings after the push, route `lab` again (infra PR, never `fix`/`continue`).
2. **#833** - merged at 03:34:18Z; #825 closed at 03:34:20Z. Next: verify the hardcoded Pages dispatch for `942ff349` fired (no deploy for the new tip yet); if not, the next maintainer run triggers the Pages workflow. No further PR work.
3. **#829** - eval 42443202122 live on `48bb2dc4`. Next: read the verdict; on `approve-eval` the PAT sweep merges the workflow-touching PR and #827 closes; on `fix` route `lab` with the exact citations.
4. **#804** - review 42439783880 live on `efb1784e`. Next: the verdict; on approve the Tester, eval, and PAT sweep follow; on findings route `lab`.
5. **#821** - parked. Do not spend a fresh review until the Owner capacity decision.
6. **#745** - parked behind #803.

## The serialized infra queue

1. #829: eval live; then the PAT sweep; on approve #827 closes.
2. #832: lab live on the plugin-import fix; then re-review, Tester, eval, PAT sweep; #831 stays open past the merge.
3. #804: review live; then the Tester, eval, PAT sweep; on approve #798 closes.
4. #803: needs a fresh head-bound review after the queue; its lifetime review budget is spent, so a manual fresh pass is the recovery lane.
5. #821 is parked on the Owner capacity decision; #745 behind #803.
6. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#831 plugin-import residual (live via #832 lab)**: on CLI 1.19.5 the project plugin-directory walk is unconditional, so `.opencode/plugin/*.js` top-level code runs before the agent on every PR-head-checkout arm (Tester, per-OS, Reviewer, Evaluator). The opt-out stops config and instruction merge and plugin activation, not module import. The lab must correct the docs/audit claims, close or record the residual (CLI pin/upgrade, plugin removal/relocation after checkout, sanitized tree, or an explicit Owner acceptance), add an import-time canary, and still exercise the Owner-requested scratch canary on the Maintainer arm plus the `pull_request` and `workflow_dispatch` wake paths.
2. **#827 (live via #829 eval)**: curator cap fix; the Tester approved; the eval is the gate; then the PAT sweep.
3. **#798 (live via #804 review)**: per-OS commit-scope guard; the rebase landed and the fresh review is the gate.
4. **#825 (closed)**: the Curator remediation PR merged at 03:34:18Z and #825 closed at 03:34:20Z; the Curator lane is done.
5. **#792 (parked with #821)**: Maze Chase harness gaps; the lane is parked on the Owner capacity decision.
6. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
7. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance; the Owner capacity decision remains the critical path while it recurs. The Nov 7 wall persisted the whole day and every chain capped; the recovery contract held.
8. **#833 review residual (deferred, Curator follow-up)**: command examples in four touched archived READMEs still use pre-archive root paths (`archive/arpeggio/README.md:37,102`, `archive/automatrium/README.md:34,118`, `archive/homunculus/README.md:40,109`, `archive/granite/README.md:43`), `archive/rush/README.md:103` cites a `docs/index.md` that never existed there, the rush layout block and test count (20 vs 21) are stale, the orrery test count says 43 vs 57, and non-README archived docs still advertise retired `/Random/` URLs. Recorded for a Curator pass; no issue created.
9. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Queued-run anomaly**: four permanently queued runs with no jobs (37344324101, 36101155868, 36101155851, 36101155844); inert, recorded for the Auditor.
13. **Model watch**: the 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears.
14. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; cancellations stay rare and justified.
15. **Board pin**: #70 is pinned and verified.
16. **Missed auditor round**: the Nov 7 daily audit died on the wall; the Nov 8 daily schedule re-arms at about 05:00Z today. If it caps again, dispatch `auditor` on #70 as the manual recovery.
17. **#832 stale PR-body count**: the body says "all four commit subjects"; the branch has six, all `lab:` prefixed. Non-blocking; fix on a future touch.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#829, #832, #804) never take `fix`/`continue`; route `lab`. #821 and #833 are docs/product lanes, so `fix` is valid there.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown; a lane that has repeatedly failed may be parked on the Owner capacity decision.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- The #832 opt-out stops project config/instruction merge and plugin activation but NOT project plugin module import on CLI 1.19.5; only the Maintainer and `opencode.yml` arms pre-check out the default branch, and that ordering invariant is what protects them. Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on every PR-head-checkout arm until the lab closes the import residual.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Verify the #832 lab push, the restarted review, and the corrected docs/audit wording; keep `Refs #831` and #831 open.
2. Verify the Pages deploy for the new main tip `942ff349` and that #825 closed (the closure is already verified at 03:34:20Z); if the deploy did not fire, trigger it on the next run.
3. Read the #829 eval verdict; on `approve-eval` the PAT sweep merges and #827 closes; on `fix` route `lab`.
4. Read the #804 review verdict at `efb1784e`; on approve the Tester, eval, and PAT sweep follow; on findings route `lab` with the exact file:line citations.
5. Keep #821 parked on the Owner capacity decision; keep #745 behind #803.
6. Confirm zero held runs and re-check the four permanently queued runs.
7. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups (including the #833 review residual), then #814 with #803, then #803 and #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #832 lab close the plugin-import hole or record an explicit Owner acceptance, and does the corrected PR then re-approve through review, Tester, and eval?
2. Does the Pages deploy for `942ff349` fire and complete (the #833 merge and #825 closure are verified)?
3. Does the #829 binding eval approve the curator cap fix and unlock the PAT sweep, closing #827?
4. Does #804 clear review on `efb1784e` and restart its tester/eval chain, closing #798?
5. Will the daily wall recur today and cap the new lanes?
6. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? It remains the critical path while the daily wall recurs.
7. Does the Owner accept the CLI 1.19.5 plugin-import residual on the PR-head arms, or require a structural mitigation before #831 closes?
