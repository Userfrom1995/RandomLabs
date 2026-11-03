# STATE

Last updated: 2026-11-03T03:56Z by run 41574154470. Wake: owner-authored `/oc maintainer` at 03:46:08Z from the #809 lab completion (lab run 41568177399 SUCCESS at 03:46:05Z; it pushed `7c3ab4f4` -> `6cdb1b1e` and forwarded `/oc review` at 03:46:01Z). One new dispatch this run: the #788 manual review, now past the failure cooldown. Every other lane is in its agent pass.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:46-03:56Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #809, #808, #804, #788, #745. Open issues: 22. Every active PR head is MERGEABLE/CLEAN except #745 CONFLICTING/DIRTY. Pages green at 03:46:10Z on `main`.
- **#809**: head `6cdb1b1e3338ccb90f350d874f73fe8f5bd62f2e`, MERGEABLE/CLEAN, 5 files. The body-only lab `41568177399` completed SUCCESS at 03:46:05Z and pushed three commits over `7c3ab4f4`: `0877534b` (`lab.yml` metadata-on-resume: `gh pr edit` for an existing PR, the issue #811 root cause, plus the R11 pin), `2e7fab50` (`GIT_NO_REPLACE_OBJECTS` in the lane inventory plus its audit fixture), and `6cdb1b1e` (skip-worktree + intent-to-add restore extended to the three per-OS tester arms, R17 pin moved). The App-token push rejection at 03:45:51Z is expected; the PAT push landed at 03:45:59Z (`7c3ab4f4..6cdb1b1e` verified). Local sanity on the branch: `bash -n` clean, YAML parse clean, `git diff --check 97bf24bf..6cdb1b1e` clean, silent-stall audit 33 passed / 0 failed. **The body task was not done**: the live PR body is still 1,921 chars with no delegation ledger, and its Scope section now contradicts the branch (it calls the per-OS restore #798/PR #804 while `6cdb1b1e` changes `opencode-peros-test.yml`). Review `41574141456` is live on `6cdb1b1e` since 03:46:03Z. The review will likely return `lab` on the body; the next lab pass must run a direct `gh pr edit 809` in its session, because the `lab.yml` resume-metadata fix only becomes live after this PR merges.
- **#788**: head `c7c3ff31a2aa06bc527294eebc69647d52315961`, MERGEABLE/CLEAN, unchanged. Round-9 review `41569951985` died at 03:15:56Z on the #754 per-egress wall with no verdict; the review lifetime budget is spent (#803), so this run dispatched exactly one manual head-bound `review` at about 03:56Z (the 30-minute failure-triage cooldown expired at 03:45:56Z). If it dies on the wall again, re-dispatch after the next cooldown on a fresh runner; never park on `retry-after`.
- **#808**: head `46732940650ef34c7e8064ca717f953561690d57`, MERGEABLE/CLEAN, 12 files, unchanged. Round-5 review `41573177649` is in its agent pass since 03:36:06Z on the verified double-slash fix, the three negative fixtures, and the refreshed 4,005-char body. On clean the workflow forwards the read-only Tester; a `lab` verdict routes back to the lab.
- **#804**: head `d1a4b5c90be4ad6251a6361a5afa05fc1a317e90`, MERGEABLE/CLEAN. Lab `41569642729` is in its agent pass since 03:01:17Z on the round-3 B1-B4 findings (B1/B2 are owner-PAT exfiltration paths).
- **#810**: the fix-forward defect issue. Lab `41568183890` is in its agent pass since 02:46:39Z; no branch or PR yet. #811 stays queued behind it, but note the #809 branch now contains the #811 fix: if #809 merges, verify the fix on `main` and close #811 on that evidence instead of starting a competing audit-rule pass.
- **No merge candidate**: no PR carries a fresh, head-bound, owner-authored tester verdict plus a fresh, head-bound approve-eval marker. The #808 tester marker is bound to `cf626b9c`, the #788 tester markers predate `c7c3ff31`, #804 and #809 have no tester verdict at their heads, and no open PR has an eval marker.
- **Health**: the wall reset holds; the last sample is the #788 review death at 03:15:56Z (recorded on #70 at 03:24:40Z). The only recent failure is that review; the run fan-out from the `/oc maintainer` comment was skip-only noise (#601 semantics).
- **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#803** queued behind the #788/#792 lanes. **#792** waits behind #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live recovery lanes (do not duplicate)

1. #809 review `41574141456` on `6cdb1b1e`; the body gap (F4) is still open and the next lab pass must use a direct `gh pr edit 809`. On a clean verdict the workflow forwards the read-only Tester, then the binding eval, then the merge with `Closes #807`.
2. #788 manual review on `c7c3ff31` (dispatched this run); on clean the workflow forwards `/oc test`, on `fix` its forward starts the Fixer, on another wall death re-dispatch after the next cooldown.
3. #808 round-5 review `41573177649`; on clean the workflow forwards the read-only Tester, then the binding eval, then the head-bound merge with `Closes #799`.
4. #804 lab `41569642729`; on push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #798`. Never `fix`/`continue` on this infra PR.
5. #810 lab `41568183890`; verify its branch/PR before the next review. Then review, read-only test, eval, merge with `Closes #810`.

## The #811 chain

1. Do not start a competing #811 lab while #810 and #809 are live; all three would edit `silent-stall-audit.sh`.
2. The #809 branch already carries the #811 fix (`0877534b` plus the R11 pin). If #809 merges, verify the resume-metadata path and the R11 pin on `main`, then close #811 with that evidence.
3. If #809 is abandoned or its lane removes the fix, dispatch #811 after #810's lane ends.

## The #809 chain

1. Read the live review verdict on `6cdb1b1e`. If it returns `lab` (expected on the missing ledger and the stale Scope), dispatch the lab with an explicit instruction to run a direct `gh pr edit 809 --body-file ...`, compose the 3 to 8 line ledger plus the Skills line from the real #807 work, and NOT to change code or push a commit.
2. Reconcile the body's Scope section with the three new commits: the per-OS restore is now in scope on this branch, whether or not #804 also lands; the two PRs both touch `opencode-peros-test.yml`, so watch for a conflict when the second merges.
3. After the body is fixed and the review approves, the workflow forwards the read-only Tester, then eval, then the merge with `Closes #807`.

## The #808 chain

1. Read the round-5 verdict on `46732940`; the double-slash fix, the fixtures, and the refreshed body are verified, so a clean verdict should forward the read-only Tester.
2. Tester approval binds the settled head; then the binding eval; then the head-bound merge with `Closes #799`.
3. If the review returns `lab`, route lab on the exact finding; never `fix` or `continue` on this infra PR.

## The #804 chain

1. The live lab `41569642729` must close B1-B4 (B1/B2 are owner-PAT exfiltration paths); the lab workflow forwards `/oc review` on the pushed head.
2. Review approval opens the read-only Tester; then the binding eval; then the merge with `Closes #798`.
3. Never `fix` or `continue` on this infra PR. Watch the `opencode-peros-test.yml` overlap with #809.

## The #788 chain

1. Read the manual review verdict on `c7c3ff31`. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer; on another wall death re-dispatch after the next cooldown.
2. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head, so the native evidence binds the final head.
3. On a clean macOS and Linux pass, dispatch the binding eval on the new head; on `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`, so this is a manual close), and dispatch `build` #792.
4. Do not treat unchanged-head markers from the spurious 14:51/15:58 chain as fresh. The review and fix lifetime budgets are spent, so any crash needs a manual dispatch.

## The serialized infra queue

1. Live this tick: #809 review, #788 manual review, #808 round-5 review, #804 lab, #810 lab.
2. Next tick: the #809 verdict and its body-only lab if needed; the #788 verdict; the #808 verdict and its Tester forward; the #804 lab push and its forwarded review; #810's PR and #811's fate.
3. #803 (lifetime retry budgets) after the #788/#792 lanes settle; #745 after that; #773/#774/#775 parked.
4. #792 immediately after the #788 merge; close #786 on the same evidence.

## Loose ends board

1. **#809**: review live on `6cdb1b1e`; body still 1,921 chars with no ledger and a stale Scope section; next lab pass uses a direct `gh pr edit`.
2. **#788**: manual review dispatched after the cooldown; watch for a verdict, a wall death, or a moved head.
3. **#808**: round-5 review live; the lab push is verified.
4. **#804**: lab live on B1-B4 (two owner-PAT exfiltration paths).
5. **#810**: lab live; verify its branch and PR before the next review.
6. **#811**: QUEUED, but the fix is already on the #809 branch; close on #809 merge evidence if the lane lands.
7. **Wall watch**: the 03:15:56Z sample is recorded on #70; the other lanes stayed healthy, so treat it as per-egress. Re-dispatch wall-killed lanes on fresh runners after their 30-minute failure cooldown; never park on `retry-after`.
8. **Queue**: #803 after the #788/#792 lanes; #745 after; #792 right after #788 merges.
9. **#788 and #804 lifetime budgets** are spent: any further crash needs a manual dispatch, not an auto-retry.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #809 review verdict on `6cdb1b1e`; if `lab`, dispatch the body-only lab with the direct `gh pr edit 809` instruction and the Scope reconciliation.
2. Read the #788 manual review verdict; route its forward (Tester on approval, Fixer on `fix`, re-dispatch after cooldown on a wall death).
3. Read the #808 round-5 verdict and let its forward route the next lane.
4. Read the #804 lab push and its forwarded review; route the next lane from the verdict.
5. Verify the #810 PR; if #809 merges first, verify the #811 fix on `main` and close #811 instead of starting a competing pass.
6. After the #788 Tester approval: dispatch `test-macos` (the delegated acceptance) and `test-linux` as warranted on the tester-settled head, then the binding eval, then verify the marker chain and merge, close #786, and dispatch `build` #792.
7. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Does the #809 review return `lab` for the missing ledger and the stale Scope, and does the body-only lab with a direct `gh pr edit` finally land it?
2. Does the post-cooldown fresh-runner review approve `c7c3ff31` and let the Tester run, or does it hit the wall/fix again?
3. Does the #808 round-5 review approve `46732940` now that the double-slash collapse and the stale body are both closed?
4. Does the #804 lab close B1-B4, including both owner-PAT exfiltration paths?
5. Does #810's lane produce its PR, and does #809 merge first so #811 closes on that evidence?

- Hephaestus, the Maintainer
