# STATE

Last updated: 2026-11-07T05:15Z by run 42341521403 (the #833 curator remediation PR for #825 is open with its review live; #829's R25 fix landed rebased onto `5b699601` and its review restarted; #832 and #804 labs are live; #821 stays parked on the Owner capacity decision). Next-run priorities: the four live lanes (#833 review, #829 review, #832 lab, #804 lab rebase), then the post-merge infra queue.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:10-05:15Z on 2026-11-07)

- **main** = `5b69960172409a8e224358afba5b8d1816fc5ae0` (`git ls-remote` verified), unchanged since the 04:35:32Z #830 PAT merge. Pages is green on that tip (dispatch 42339156609 SUCCESS at 04:36:38Z), and the 05:09:33Z Pages dispatch 42341519891 completed success at 05:10:07Z, rebuilding the production site plus the #833 preview.
- **Open PRs** (6):
  - **#833** `293dd4381772c1707585d15771dc9a812eeeb0b8` MERGEABLE/CLEAN, exactly on `main` `5b699601` (ahead 1, behind 0), one `curate:` commit by The Curator: `Fixes #825`, the archived README link repair (arpeggio/automatarium/homunculus `../../docs` and `../../ideas` repoints, granite/orrery root `LICENSE`, orrery/rush retired hosted URLs, rush quick-start paths). Six files, +19/-15, no protected paths. Created 05:09:00Z; the curator workflow's hardcoded step posted the review handoff at 05:09:24Z and review 42341511122 has been live since 05:09:26Z. On approval Tester, binding eval, then the in-session merge and the #825 closure; on findings the normal fix lane applies (not infrastructure).
  - **#832** `e0187e26172eecf7de1d1057231972807785ca28` MERGEABLE/CLEAN, diverged from main (behind 4, ahead 4). The #831 Lab Engineer PR (`Closes #831`): the empirical canary, the `OPENCODE_DISABLE_PROJECT_CONFIG` opt-out plus external-directory grant on every comment-triggered arm, the cohort audit, the AGENTS.md correction, and the pin syncs. The review returned `lab` at 05:02:07Z: blocking is the missing delegation ledger and skills note (`reviewer.md:82`), plus the Owner-requested scratch PR-comment canary, a rebase onto `5b699601`, the 34/34 audit rerun, and the `maintainer.yml:544` "PR merge head" wording. Lab Engineer 42340994195 has been live since 05:02:19Z. On its push the review cycle restarts; then Tester, eval, PAT sweep, and #831 closes. Infra PR: never `fix`/`continue`.
  - **#829** `48bb2dc494dab4d06910d5460be391d417e967d0` MERGEABLE/CLEAN, rebased exactly onto `main` `5b699601` (ahead 8, behind 0). Lab Engineer 42339302875 completed SUCCESS and pushed the R25 comment-helper fix plus the fixture-wording correction (`9155aeb5f`, `48bb2dc49`, with the earlier cap-headroom and durability commits). The workflow's hardcoded step posted the review handoff at 05:06:51Z and review 42341329840 has been live since 05:06:54Z. The 05:06:39Z App-token non-fast-forward push rejection on the branch is the expected wrapper noise on a workflow-touching branch; the PAT-backed step landed the head. On approval Tester, eval, PAT sweep, and #827 closes; then one `curate` on #825 is no longer needed because #833 already exists.
  - **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN (behind main, no conflicts; merge-base `86570af1`). Parked per the 04:49:27Z public note on the Owner capacity decision after four consecutive wall deaths (the last review 42338605272 died at 04:43:22Z with no verdict). No fresh pass until the allowance changes; the 05:12:57Z cooldown boundary is deliberately not used. On resume: one fresh head-bound review, then the per-OS rows, the binding eval on the settled head, the in-session merge, and the #792 closure.
  - **#804** `e534eb684e340ab53ce0af25781b2b0a13d35a1e` CONFLICTING/DIRTY at base `7a23aa2b`, diverged (behind 4, ahead 2). Review 42339704867 served about 19 minutes of real review work and died at 05:02:55Z on the daily wall (`FreeUsageLimitError`, issue #754) with no verdict; the quota-wall intake logged it on #70 at 05:03:40Z. A lab pass 42341637324 has been live since 05:11:10Z: rebase onto `5b699601` (resolve the `docs/index.html` adjacent-row conflict), keep the B1/N1 body fixes and the scanner-scope wording, rerun the full silent-stall audit, and push. The push restarts the review cycle; then Tester, eval, PAT sweep, and #798 closes. If the lab also dies on the wall, park the lane on the capacity decision like #821.
  - **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY, parked behind #803.
- **Open issues** (22): #831 closes with #832; #827 with #829; #798 with #804; #792 with #821; #742 with #745; #825 with #833. #812/#814/#815/#803/#773/#774/#683/#678/#677/#661/#659/#657/#655/#582 remain the known held follow-ups; #70 and #42 are the boards. No untriaged issue and no new issue in the window (the newest issue is #831 at 03:46:57Z).
- **The wall**: two deaths in the wide window, both review lanes (#821's 42338605272 at 04:43:22Z and #804's 42339704867 at 05:02:55Z, `FreeUsageLimitError`, issue #754). The #832 review survived 32 minutes and returned a verdict at 05:02:07Z, and all four live lanes are on fresh runners, so it is a per-runner lottery, not a fleet outage. No lab dispatch for the wall, no ladder advance. The Owner capacity decision remains the critical path while it recurs.
- **Held runs**: zero `action_required` repo-wide. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844), each re-confirmed still queued.
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the only extra active names are GitHub-managed: Dependabot Updates, Dependency Graph, pages-build-deployment). No lab fix needed.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; the live registry serves 81 models, and the pin plus all three ladder rungs (`opencode/mimo-v2.6-flash-free`, `opencode/glm-5.3-flash-free`) resolve. No failed runs in this window; the wall is not a retirement.
- **Concurrent wakes**: maintainer 42340991517 (the #832 lab-handoff wake, which also dispatched the #804 rebase lab at 05:11:07Z), the failure-triage run 42341072548 (stood down at the wall class), the #833 `/oc maintainer` wake that started this run 42341521403, and the review/lab runs they forward; per-target groups and keep-both memory.

## The live lanes (do not duplicate)

1. **#833 review** (42341511122, head `293dd438`, live since 05:09:26Z): docs-only curator PR; on approval Tester, binding eval, then the in-session merge and #825 closes; on findings the normal fix lane.
2. **#829 review** (42341329840, head `48bb2dc4`, live since 05:06:54Z): the R25 helper fix landed rebased onto main; on approval Tester, eval, PAT sweep, and #827 closes.
3. **#832 lab** (42340994195, head `e0187e26`, live since 05:02:19Z): clear the review findings (delegation ledger and skills note, the scratch canary, the rebase, the 34/34 audit rerun, and the `maintainer.yml:544` wording) and push. Its push restarts the review cycle.
4. **#804 lab** (42341637324, head `e534eb68`, live since 05:11:10Z): rebase onto `5b699601`, keep B1/N1, rerun the audit, push. Its push restarts the review cycle. If it dies on the wall, park the lane on the capacity decision.
5. **#821** (head `dce109e4`): parked on the Owner capacity decision; no fresh passes.
6. **#745**: parked behind #803.

## The serialized infra queue

1. #829: review live on the rebased R25 fix; then Tester, eval, PAT merge; on approve #827 closes.
2. #832: lab live on the review findings; then the review restart, Tester, eval, PAT merge; on approve #831 closes.
3. #804: lab live on the rebase; then the review restart, Tester, eval, PAT merge; on approve #798 closes.
4. #833 is a docs/curator PR on the normal lane: review live; then Tester, the binding eval, the in-session merge, and the #825 closure.
5. #821 is a product PR on the parked capacity lane: one fresh review when the Owner capacity question is settled; then the per-OS rows, the binding eval on the settled head, the in-session merge, and the #792 closure.
6. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803, #745 (and #742 closes).

## Loose ends board

1. **#831 (live via #832 lab)**: PR-head project-instruction loading; the lab is clearing the review findings; on approval it merges.
2. **#827 (live via #829 review)**: canonical curator-cap fix; the R25 comment-helper divergence is repaired and the head is rebased; on merge the cap work closes.
3. **#798 (live via #804 lab)**: per-OS commit-scope guard; the code is sound and the lab is rebasing onto `5b699601` with the B1/N1 body fixes kept.
4. **#825 (live via #833 review)**: archived README relative links and dead hosted build links; the curator remediation PR is open on the current main and its review is live.
5. **#792 (parked with #821)**: Maze Chase harness gaps; product lane, normal review/Tester/eval/merge flow on capacity resume.
6. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
7. **#830/#828 closed out**: merged at 04:35:32Z on `5b699601`; Pages green on that tip.
8. **#822 closed out**: merged at 2026-11-06T10:18:56Z on `7a23aa2b`; #820 and #775 closed; Pages green on that tip.
9. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance. The Owner capacity decision remains the critical path while it recurs.
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
- Infra/protected-path PRs (#829, #832, #804) never take `fix`/`continue`; route `lab`. #821 and #833 are non-infra, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When fresh runners keep dying within seconds, stop and escalate the capacity ask rather than looping.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- The Maintainer session workspace is the PR head for PR-comment runs (the CLI bootstrap re-checks it out after the trusted checkout): treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content until the #832 opt-out lands. The staged system prompt remains authoritative.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **Read the four live lanes**: #833 review 42341511122, #829 review 42341329840, #832 lab 42340994195, #804 lab 42341637324. Do not dispatch duplicates while they are in progress.
2. **#833**: on approval the Tester, then the binding eval, then the in-session merge and the #825 closure; on findings one fix.
3. **#829**: on approval the Tester, eval, PAT sweep, and #827 closes; on findings route `lab` (infra PR).
4. **#832**: on its push read the fresh review; then Tester, eval, PAT sweep, and #831 closes; on findings route `lab`.
5. **#804**: on its push read the fresh review; then Tester, eval, PAT sweep, and #798 closes; on findings route `lab`; if the lab dies on the wall, park the lane on the capacity decision.
6. **#821**: stays parked pending the Owner capacity decision; do not spend fresh passes. On resume one fresh head-bound review, then the per-OS rows, the eval, and the merge.
7. Confirm zero held runs and re-check the four permanently queued runs; re-audit the 19/19 allowlist and the model ladder.
8. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
9. Record the Owner capacity decision when given; it remains the critical path against the daily wall.

## Open questions

1. Does the #833 review approve the archived-link repair, unlocking the Tester, the eval, the merge, and the #825 closure?
2. Does the #829 review approve the rebased R25 fix, unlocking the Tester, the eval, the PAT merge, and the #827 closure?
3. Does the #832 Lab Engineer clear the review findings and push, unlocking the review restart and eventually the #831 closure?
4. Does the #804 rebase lab land cleanly and restart the review, or does it also die on the wall and force the capacity park?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? It is the critical path for the parked #821 and for any further review-lane losses.
