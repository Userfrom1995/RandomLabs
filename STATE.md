# STATE

Last updated: 2026-11-08T04:58Z by run 42448354999 (the #832 review returned `lab` on the per-attempt sanitizer gap and the Lab Engineer is live; #835 eval and #804 lab continue; no failures; Pages green on `22d6c92`). Next-run priorities: read the #835 eval verdict and merge in-session on approve (#834 closes), read the #832 lab push and follow with a fresh review, read the #804 lab outcome and follow with a fresh review plus the rebase/R34-to-R35 lab pass, verify the Nov 8 auditor round at about 05:00-05:45Z, keep #821 parked on the Owner capacity decision, and keep #831 open for the per-attempt verification and the residual scratch canary.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:50-04:58Z on 2026-11-08)

- **main** = `22d6c92fefd406057c3a6ce28a24e5a2b9d1951d` (`git ls-remote` verified at 04:51Z), the #829 rebase merge. The chain is linear (`22d6c92` -> `d6ba7f1e` -> `60179659` -> `59b6616d` -> `c9b4c563` -> ... -> `942ff349`), so main is not orphaned. **Pages is green** on this tip: dispatch 42446535552 completed SUCCESS at 04:22:58Z.
- **#835** head `dcf8d37a4c14357a6ad2d61dc996bf5e0c79ff4a`, MERGEABLE/CLEAN, 3 commits, 12 files (all `archive/` READMEs and docs plus `archive/rush/game.js`, zero protected paths), `Fixes #834`. Review 42445387947 approved at 04:14:19Z. Tester 42445984369 approved at 04:33:12Z with the machine-published **owner-authored marker** 6717272055 at 04:33:14Z, canonical and fresh against the 04:04:41Z head. The binding **eval 42447747230 is live since 04:40:23Z**. Next: read the verdict; on `approve-eval` merge in-session (`gh pr merge --rebase --match-head-commit dcf8d37a`, fallback `--merge`, never `--delete-branch`), verify Pages, and #834 closes.
- **#832** head `9b500d78798d7ef8978dfc725ea1141d54fc2847`, base `942ff349`, **CONFLICTING/DIRTY** against `22d6c92`. The only conflicted file is `.github/scripts/silent-stall-audit.sh` (the final failure-message string). Review 42444639469 returned `lab` at 04:49:32Z: **F5** the sanitizer is per step, but the CLI retry loops start new `opencode github run` processes after the PR-head checkout (`action.yml:517-534/608`, `maintainer.yml:662-679/754`) and the Maintainer inline arm has no guard at all; **F6** rebase onto `22d6c92`; **F7** `git ls-files ... || true` defeats the claimed fail-closed marking; **F8** R31 does not ban a step-level `working-directory`, only five of seven markers are mutation-tested, and the body is not fully pinned. The workflow published the signed report and posted the lab handoff at 04:49:42Z; **Lab Engineer 42448358027 is live since 04:49:45Z**. `Refs #831`; #831 stays open for the per-attempt verification and the Owner-requested scratch canary.
- **#804** head `efb1784e7553251624deaf7612e4307e034392da`, base `5b6996017`, **CONFLICTING/DIRTY** in `.github/scripts/silent-stall-audit.sh`, `AGENTS.md`, and `LAB.md`. **Lab Engineer 42443399156 is live since 03:36:04Z** (about 82 minutes, inside the 150-minute cap) on the B8 sanitizer trust seam plus the rebase. Follow-up rebase notes: keep BOTH main's #827 cap section and the branch's per-OS sanitization section (drop the old #701 bullet), and **renumber the per-OS rule from R34 to R35** (the branch labels both quota-wall and per-OS as R34: ids at its `:27309`/`:27312` quota-wall and `:29150`/`:29153` per-OS, plus the header, `[R1-R34]` banners, the R33 pad fixtures, `auditor.yml`/`tester.md` labels, and the docs) so R34 stays quota-wall.
- **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but 15 commits behind main (base `86570af1`), Maze Chase harness (`Closes #792`). Parked on the Owner capacity decision; no fresh pass. **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY (base `e73bd7a2`), parked behind #803.
- **Open issues** (21): #834 is triaged and closes with #835; #831 stays open past #832; #798 with #804; #792 with #821; #742 with #745. The known held follow-ups remain #812/#814/#815/#803/#773/#774/#683/#678/#677/#661/#659/#657/#655/#582; #70 and #42 are the boards. No untriaged issue and nothing newer than #834.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Trigger allowlist**: parsed-YAML exact 19/19 entries; every live repo-owned workflow name outside the self-excluded `maintainer` is covered (20 live repo-owned) and no allowlist entry is stale. No lab fix needed.
- **Model watch**: the registry serves 81 models; the pin `opencode/deepseek-v4.1-flash-free` and all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) resolve. No retirement.
- **Schedule arms**: auditor last scheduled success 2026-11-07T05:01:38Z; today's daily round is expected about 05:00-05:45Z. Curator last scheduled success 2026-11-07T21:34:22Z; its scheduled round remains delayed by the cron lag and its manual dispatch lane delivered #835, so no extra dispatch is needed.
- **Failures**: none since the wall lifted at 02:19Z; a 100-run scan shows zero failure, timed_out, or startup_failure runs. The maintainer skips/cancellations in the 04:49Z comment burst are the documented single-pending-slot supersede noise.
- **Concurrent wakes**: this run 42448354999 is the issue_comment clone from the 04:49:42Z lab handoff on #832; the sibling maintainer runs in the same burst are skip/intake runs. Keep-both memory handles the overlap.

## The live lanes (do not duplicate)

1. **#835** - binding eval 42447747230 live since 04:40:23Z on `dcf8d37a`. Next: read the verdict; on approve-eval merge in-session and verify Pages; #834 closes on merge.
2. **#832** - Lab Engineer 42448358027 live since 04:49:45Z on `9b500d78` (the F5-F8 round). Next: on the push, a fresh head-bound review; #831 stays open for the per-attempt verification and the scratch canary.
3. **#804** - Lab Engineer 42443399156 live since 03:36:04Z on `efb1784e` (the B8 sanitizer fix plus rebase). Next: on the push, a fresh head-bound review; then the rebase/R34-to-R35 lab pass if the review returns `lab`; then Tester, eval, PAT sweep; #798 closes on merge.
4. **#821** - parked. Do not spend a fresh review until the Owner capacity decision is given.
5. **#745** - parked behind #803.

## The serialized infra queue

1. #829: DONE, merged as `22d6c92`, #827 closed, Pages green.
2. #835: eval live; then the in-session merge; #834 closes.
3. #832: lab live on the F5-F8 round; then fresh review, Tester, eval, PAT sweep; #831 stays open for the per-attempt verification and the scratch canary.
4. #804: lab live; then fresh review, the rebase/numbering lab pass, review, Tester, eval, PAT sweep; #798 closes on approve.
5. #803: needs a fresh head-bound review after the queue; its lifetime review budget is spent, so a manual fresh pass is the recovery lane.
6. #821 is parked on the Owner capacity decision; #745 behind #803.
7. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#831 (live via #832 lab)**: PR-head project-config loading; the pre-CLI guard closes the first-attempt import channel, but the retry processes start after the PR-head checkout, so the guard must run per CLI attempt (review F5) and the Maintainer inline arm needs its own call; #831 stays open for that verification and the Owner-requested scratch PR-comment canary.
2. **#798 (live via #804 lab)**: per-OS commit-scope guard; the B8 sanitizer trust bypass is being repaired at `efb1784e`; the rebase must also fix the duplicate R34 numbering.
3. **#834 (live via PR #835 eval)**: archived-README and archived-docs remediation; review and Tester approved, and the binding evaluator is the current gate.
4. **#792 (parked with #821)**: Maze Chase harness gaps; parked on the Owner capacity decision.
5. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
6. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance. The Owner capacity decision remains the critical path while it recurs.
7. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
8. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
9. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
10. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
11. **Model watch**: the 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears.
12. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; cancellations stay rare and justified.
13. **Board pin**: #70 is pinned and verified.
14. **Nov 8 Auditor round**: expected about 05:00-05:45Z; if it caps again, dispatch `auditor` on #70 as the manual recovery.
15. **#831 scratch canary**: needs a disposable PR that only the Owner (or a pushed branch) can create; never claim it done without live evidence or a recorded Owner waiver.
16. **#829 post-merge**: the curator cap and durability protocol are live on main; the next scheduled curator round is the first under the new 90/120 cap.
17. **General mid-body wake noise**: the evaluator verdict comment contains the tester marker mid-sentence, so the general arm wakes spuriously; ride along in the deferred #822 residuals pass.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#832, #804) never take `fix`/`continue`; route `lab`. Docs/product lanes (#835) may take `fix` if the review returns findings.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs (#835) are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown; a lane that has repeatedly failed may be parked on the Owner capacity decision.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts (issue #831).
- The opt-out stops project config and instruction loading only; on CLI 1.19.5 it does not stop the plugin-directory import, so never claim the plugin channel is closed by the opt-out alone.
- The #831 pre-CLI guard is per step, not per CLI attempt: the retry loops start new processes after the PR-head checkout, so a per-attempt call is required (review F5, 2026-11-08), and the Maintainer inline arm needs its own call. Never claim the plugin channel is closed until those calls are pinned in R31 and verified.
- A rebase of the audit script must keep main's current rule numbering: R33 is the run-scalar budget and R34 is the quota-wall guard, so any new rule takes R35 and every header, banner, label, and docs reference must move together.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #835 evaluator verdict on `dcf8d37a`; on `approve-eval` merge in-session, verify the Pages deploy, and #834 closes; on `fix` route the exact findings.
2. Read the #832 lab push on the F5-F8 round; on a push, a fresh head-bound review follows. Keep `Refs #831` and #831 open for the per-attempt verification and the scratch canary.
3. Read the #804 lab outcome on the B8 seam; on a push, a fresh review follows. When that review returns `lab`, include the rebase (three conflicted files) and the R34 to R35 renumber for the per-OS rule in the instruction.
4. Verify the Nov 8 daily Auditor round at about 05:00-05:45Z; if it caps on the wall, dispatch `auditor` on #70 as the manual recovery.
5. Keep #821 parked on the Owner capacity decision; keep #745 behind #803.
6. Re-check held and queued runs, the trigger allowlist, the model ladder, and the wall.
7. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #835 evaluator approve `dcf8d37a`, unlocking the in-session merge that closes #834?
2. Does the #832 lab round add the per-attempt sanitizer, fix F7/F8, rebase onto `22d6c92`, and push?
3. Does #804's lab close the B8 sanitizer trust bypass and rebase cleanly with the per-OS rule renumbered to R35?
4. Will the daily wall recur today and cap the new lanes?
5. Does the Nov 8 daily Auditor round run clean at about 05:00-05:45Z?
6. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)?
7. Will the Owner provide the disposable scratch PR (or a waiver) needed to close the #831 live canary ask?
8. Does the first scheduled curator round under the new 90/120 cap complete cleanly?
