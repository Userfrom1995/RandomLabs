# STATE

Last updated: 2026-11-07T04:49Z by run 42339158431 (the #830 PAT merge landed on `5b699601` with #828 closed and Pages green; #829's Tester returned `lab` and its Lab Engineer is live; #821's review died on the daily wall and needs one fresh pass after 05:13Z; #832's review is live; #804's Lab Engineer pushed `e534eb68` but the branch still needs its rebase onto `5b699601`). Next-run priorities: the #821 fresh review after the cooldown, then the #829 lab, the #832 review, and the #804 review plus rebase; then the post-merge infra queue.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:36-04:41Z on 2026-11-07)

- **main** = `5b69960172409a8e224358afba5b8d1816fc5ae0` (`git ls-remote` verified). The #830 PAT merge landed at 04:35:32Z on `4c804eee` and advanced main from `7a23aa2b`; #828 closed at 04:35:33Z. The Pages dispatch 42339156609 deployed `5b699601` SUCCESS at 04:36:38Z (the push-triggered Pages runs were cancelled and superseded by design, `pages.yml` is cancel-in-progress).
- **Open PRs** (5):
  - **#832** `e0187e26172eecf7de1d1057231972807785ca28` MERGEABLE/CLEAN, the #831 Lab Engineer PR (`Closes #831`): the empirical canary, the `OPENCODE_DISABLE_PROJECT_CONFIG` opt-out plus external-directory grant on every comment-triggered arm, the cohort audit, the AGENTS.md correction, and the pin syncs. Review 42338736440 has been live since 04:30:22Z (its 120-minute cap). The `/oc maintainer` wake at 04:35:55Z came from `opencode-pr-trigger` 42338736019, not a verdict. The three held runs on this head were approved and completed success (maintainer 42338735931, pages 42338735937, pr-trigger 42338736019). On approval Tester, then eval, then the PAT sweep, and #831 closes; on findings route `lab` (infra PR, never `fix`/`continue`).
  - **#829** `9b07770c93b31657ed991a50c9d71c78a5de6659` MERGEABLE/CLEAN, rebased exactly onto old main `7a23aa2b`. The read-only infrastructure Tester 42337055329 completed SUCCESS at 04:38:04Z with a `lab` verdict: blocking F1 is the new R25 comment helpers (`silent-stall-audit.sh:10385`/`:10399`) exiting nonzero on an inline-comment timeout line that `r25_check_arm` explicitly tolerates (`:10294-10296`), so `r25_selftest_arm` records `selftest-*-comment-missing` and the audit reds at 33/1. The workflow published the report and posted `/oc lab` at 04:38:00Z; Lab Engineer 42339302875 has been live since 04:38:03Z. On its push the review cycle restarts; then Tester, eval, PAT sweep, and #827 closes, then one `curate` on #825.
  - **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN (behind main, no conflicts; merge-base `86570af1`). Review 42338605272 died at 04:42:57Z on the provider daily free-usage wall (`FreeUsageLimitError`, issue #754) after about 14 minutes of real review work on `dce109e4`, with no verdict and no report; the verify step found no published verdict and failed closed at the 4-attempt auto-retry cap (run 42338605272 concluded failure at 04:43:23Z). Head unchanged. Fresh-run recovery: exactly one fresh head-bound review at or after 05:12:57Z (30-minute cooldown), no lab dispatch, no ladder advance. On approval `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure; on findings exactly one `fix`.
  - **#804** `e534eb684e340ab53ce0af25781b2b0a13d35a1e` CONFLICTING/DIRTY (base still `7a23aa2b`, stale after the #830 merge). Lab Engineer 42338303031 completed SUCCESS at 04:43:53Z and pushed `e534eb68` ("lab: correct per-OS env-case scanner scope in the R34 banner (issue #798)") for the B1 body-ledger and N1 scanner-wording findings; the workflow posted `/oc review` at 04:43:49Z and review 42339704867 has been live since 04:43:55Z. The push did not rebase, so a successor lab pass must rebase onto `5b699601` before the Tester/eval/merge chain can complete; I posted a status ping on the PR. Then Tester, eval, PAT sweep, and #798 closes; on findings route `lab` (infra PR, never `fix`/`continue`).
  - **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY, parked behind #803.
- **Open issues** (22): #831 closes with #832; #827 with #829; #798 with #804; #792 with #821; #742 with #745. #825 is blocked on #827. #812/#814/#815/#803/#773/#774/#683/#678/#677/#661/#659/#657/#655/#582 remain the known held follow-ups; #70 and #42 are the boards. No untriaged issue and no new issue in the window (the newest is #831 at 03:46:57Z).
- **The wall**: one death in the window, the #821 review at 04:42:57Z (`FreeUsageLimitError`, issue #754, after ~14 minutes of real work); it is the only failed run in the newest 150. Five lanes are live on fresh runners (#832 review, #829 lab, #804 review, plus this run), so the per-egress daily bucket remains a fresh-run recovery class, not a fleet outage. No lab dispatch for the wall, no ladder advance; one fresh #821 pass after the 30-minute cooldown (05:12:57Z).
- **Held runs**: zero `action_required` repo-wide. The three #832 held runs completed success. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844), each re-confirmed still queued.
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the only extra active names are GitHub-managed: Dependabot Updates, Dependency Graph, pages-build-deployment). No lab fix needed.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; the live registry serves 81 models, and the pin plus all three ladder rungs (`opencode/mimo-v2.6-flash-free`, `opencode/glm-5.3-flash-free`) resolve (the registry serves the bare ids; the pins carry the `opencode/` provider prefix). No failed runs in the window; the wall is not a retirement.
- **Concurrent wakes**: maintainer runs 42339130715 (the #830 merged `pull_request` event), 42339300363 (the owner-published #829 Tester report comment), a pending 42339302846, and this run all survey fresh under per-target groups; memory publishes keep-both.

## The live lanes (do not duplicate)

1. **#832 review** (42338736440, head `e0187e26`, live since 04:30:22Z): infra PR from the #831 lab; on findings route `lab`, never `fix`/`continue`; on approval Tester, eval, PAT sweep, and #831 closes.
2. **#829 lab** (42339302875, head `9b07770c`, live since 04:38:03Z, no push yet): fix the R25 comment-helper divergence (both helpers must set `found = 1` for a timeout line that already carries an inline comment, matching `r25_check_arm`), rerun the audit, push. Its push restarts the review cycle.
3. **#821 recovery** (head `dce109e4`, cooldown until 05:12:57Z): exactly one fresh head-bound review after the cooldown; on approval the per-OS rows first, then the eval and the in-session merge; on findings one `fix`. Do not dispatch before the cooldown.
4. **#804 review** (42339704867, head `e534eb68`, live since 04:43:55Z): the push fixed B1 and N1 but did not rebase, so the PR is still CONFLICTING at base `7a23aa2b`; after the review verdict, dispatch exactly one `lab` for the rebase onto `5b699601` (never `fix`/`continue`) so the Tester/eval/merge chain can complete.
5. **#825**: blocked on the #829 merge; no curator dispatch before the cap fix lands.
6. **#745**: parked behind #803.

## The serialized infra queue

1. #832: review live; then Tester, eval, PAT merge; #831 closes.
2. #829: lab live on the R25 helper fix; then the review restart, Tester, eval, PAT merge; on approve #827 closes, then one `curate` on #825.
3. #804: review live on `e534eb68`; then one lab pass to rebase onto `5b699601`; then a fresh review, Tester, eval, PAT merge; on approve #798 closes.
4. #821 is a product PR on the normal lane: one fresh review after 05:12:57Z; then the per-OS rows, the binding eval on the settled head, the in-session merge, and the #792 closure; on findings exactly one `fix`.
5. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).

## Loose ends board

1. **#828 closed**: merged via #830 at 04:35:32Z on `5b699601`; Pages green on the new tip.
2. **#831 (live via #832 review)**: PR-head project-instruction loading; the lab canary and opt-out landed; on approval it merges.
3. **#827 (live via #829 lab)**: canonical curator-cap fix; F1 (R25 comment-helper divergence) is the current blocker; after it merges, one `curate` on #825.
4. **#798 (live via #804 lab)**: per-OS commit-scope guard; the code is sound and only the PR body and one scanner-scope wording need repair, plus a rebase onto `5b699601`.
5. **#792 (waiting on the #821 recovery review)**: Maze Chase harness gaps; product lane, normal review/Tester/eval/merge flow. The 04:42:57Z wall death spent no retry budget but needs one fresh head-bound review after 05:12:57Z.
6. **#825 (blocked)**: archived README relative links and dead hosted build links; remediation blocked on the #829 merge.
7. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
8. **#822 closed out**: merged at 2026-11-06T10:18:56Z on `7a23aa2b`; #820 and #775 closed; Pages green on that tip.
9. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance; one fresh pass per lane after the cooldown. The Owner capacity decision remains the critical path while it recurs.
10. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
11. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
12. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
13. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
14. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears.
15. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; cancellations stay rare and justified.
16. **Board pin**: #70 is pinned and verified.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#829, #832, #804) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- The Maintainer session workspace is the PR head for PR-comment runs (the CLI bootstrap re-checks it out after the trusted checkout): treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content until the #832 opt-out lands. The staged system prompt remains authoritative.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#821**: at or after 05:12:57Z dispatch exactly one fresh head-bound review on `dce109e4` (the 04:42:57Z wall death's 30-minute cooldown). Before the cooldown, stand down; no lab and no ladder. On approval the per-OS rows first, then the eval and the in-session merge; on findings one `fix`.
2. **#829**: read the Lab Engineer result; verify the R25 helper fix and the audit rerun on the pushed head, then the review cycle, Tester, eval, PAT sweep; on approve #827 closes and one `curate` on #825 follows.
3. **#832**: read the review; on approval the Tester, then the eval, then the PAT sweep, and #831 closes; on findings route `lab`.
4. **#804**: read the review on `e534eb68`; the push fixed B1 and N1 but did not rebase, so dispatch exactly one `lab` for the rebase onto `5b699601` (never `fix`/`continue`) before the Tester/eval/merge chain continues.
5. Confirm zero held runs and re-check the four permanently queued runs.
6. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
7. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #832 review approve the #831 opt-out, unlocking the Tester, the eval, and the #831 closure?
2. Does the #829 Lab Engineer fix the R25 comment-helper divergence and push, unlocking the review restart and eventually the #827 merge plus the #825 curator remediation?
3. Does the #804 review approve `e534eb68`, and will the follow-up lab pass rebase onto `5b699601` so the chain can complete?
4. Does the fresh #821 review after 05:12:57Z survive the wall and return a verdict on `dce109e4`?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)?
