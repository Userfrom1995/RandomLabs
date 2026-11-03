# STATE

Last updated: 2026-11-03T04:17Z by run 41576729036. Wake: owner-authored `/oc lab` on #808 at 04:12:17Z after the round-5 review returned `lab` on `46732940`; the lab lane is live, the #788 manual review died on the provider wall again, and this run dispatches nothing.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:12-04:17Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #809, #808, #804, #788, #745. Open issues: 22. Every active PR head is MERGEABLE/CLEAN except #745 CONFLICTING/DIRTY. Pages green at 03:46:10Z on `main`.
- **#808**: head `46732940650ef34c7e8064ca717f953561690d57`, MERGEABLE/CLEAN, unchanged. Round-5 review `41573177649` completed SUCCESS at 04:12:07Z with a **lab** verdict: F1 is the `git://` userinfo bypass, where `git://evil.invalid@github.com/owner/repo`, `git://user@github.com/owner/repo`, and `git://user@github.com:9418/owner/repo` pass the whole-authority check (Git treats the whole `user@host` as the hostname for `git://`) and then `--secrets`, `--dispatch`, and `--purge` target `owner/repo` without a warning. The reviewer verified the scheme-aware correction: keep the optional userinfo group for HTTPS/HTTP and `ssh://`, require a bare `github.com` authority for `git://`, and add the three negative fixtures. The workflow forwarded `/oc lab` at 04:12:17Z; Lab Engineer `41576733156` is live on this head since 04:12:20Z. The live PR body still carries the round-5 "optional userinfo/port" wording and the fifteen-negative count, so the lab pass must also refresh the body.
- **#788**: head `c7c3ff31a2aa06bc527294eebc69647d52315961`, MERGEABLE/CLEAN, unchanged. The manual head-bound review `41575070562` died on the #754 per-egress free-usage wall at 04:11:26Z (`FreeUsageLimitError`, model `deepseek-v4.1-flash-free`) after about 16 minutes with no published verdict; the verify failed closed and the thread's auto-retry budget is spent (4 attempts). The failure-triage run `41576748200` is pending and owns the wall-death triage; the next manual head-bound review is due at the first tick at or after the 30-minute cooldown, 04:41:26Z.
- **#809**: head `6cdb1b1e3338ccb90f350d874f73fe8f5bd62f2e`, MERGEABLE/CLEAN, 5 files. Review `41574141456` is live since 03:46:03Z (about 31 minutes). The body task is still not done: the live PR body is 1,921 chars with no delegation ledger and a Scope section that contradicts the branch. The next lab pass must run a direct `gh pr edit 809` in its session, because the `lab.yml` resume-metadata fix only becomes live after this PR merges.
- **#804**: head `d1a4b5c90be4ad6251a6361a5afa05fc1a317e90`, MERGEABLE/CLEAN. Lab `41569642729` is in its agent pass since 03:01:17Z (about 76 minutes) on the round-3 B1-B4 findings (B1/B2 are owner-PAT exfiltration paths). Watch the `opencode-peros-test.yml` overlap with #809.
- **#810**: the lab lane `41568183890` died on the wall at 03:54:32Z with no branch and no PR, so the cap-forward defect is not applied. The fresh-runner re-dispatch is due at the first tick at or after the 30-minute failure-triage cooldown, 04:24:32Z; this 04:17Z tick must hold.
- **#811**: the triage is corrected on the thread: the fix rides on #809 (`0877534b` plus the R11 pin), not a separate lab pass. Close it on #809 merge evidence after verifying the resume-metadata path and the R11 pin on `main`; only requeue if #809 is abandoned or drops the fix.
- **No merge candidate**: no PR carries a fresh, head-bound, owner-authored tester verdict plus a fresh, head-bound approve-eval marker. The #808 tester marker is bound to `cf626b9c`, the #788 tester markers predate `c7c3ff31`, #804 and #809 have no tester verdict at their heads, and no open PR has a live eval marker.
- **Health**: a third provider-wall sample since the 00:41Z reset at 04:11:26Z (the #788 review), after the 03:15:56Z review and 03:54:01Z lab samples. It is not yet recorded on #70; the pending failure-triage run `41576748200` owns that ledger update. No other failed or timed-out run exists since 02:00Z. The trigger allowlist, held-run sweep, stray-branch sweep and Pages are clean.
- **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#803** queued behind the #788/#792 lanes. **#792** waits behind #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live recovery lanes (do not duplicate)

1. #808 lab `41576733156` on `46732940`; on the push the lab workflow forwards `/oc review`, then on clean the read-only Tester binds the settled head, then the binding eval, then the head-bound merge with `Closes #799`.
2. #788: the pending failure-triage run `41576748200` owns the wall-death triage; the next manual head-bound review is due at the first tick at or after 04:41:26Z. On clean the workflow forwards `/oc test`; on `fix` its forward starts the Fixer; another wall death needs another manual dispatch after the next cooldown.
3. #809 review `41574141456` on `6cdb1b1e`; the body gap (F4) is still open and the next lab pass must use a direct `gh pr edit 809`. On a clean verdict the workflow forwards the read-only Tester, then the binding eval, then the merge with `Closes #807`.
4. #804 lab `41569642729`; on push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #798`. Never `fix`/`continue` on this infra PR.
5. #810 re-dispatch: one fresh-runner lab pass at the first tick at or after 04:24:32Z, carrying the cap-forward instruction from the owner's 02:46:37Z comment. Verify its branch/PR before the next review, then review, read-only test, eval, merge with `Closes #810`.

## The #808 chain

1. Read the lab push on `46732940`; it must fix F1 with the scheme-aware authority check, add the three `git://` userinfo negative fixtures, and refresh the body's userinfo wording and fixture count.
2. The lab workflow forwards `/oc review` on the pushed head; on clean the read-only Tester binds the settled head, then the binding eval, then the head-bound merge with `Closes #799`.
3. If the review returns `lab` again, route lab on the exact finding; never `fix` or `continue` on this infra PR.

## The #788 chain

1. The failure-triage run `41576748200` handles the 04:11:26Z wall death; the next manual head-bound review is due at the first tick at or after 04:41:26Z.
2. On approval the workflow forwards `/oc test`; on Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head, so the native evidence binds the final head.
3. On a clean macOS and Linux pass, dispatch the binding eval on the new head; on `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`, so this is a manual close), and dispatch `build` #792.
4. Do not treat unchanged-head markers from the spurious 14:51/15:58 chain as fresh. The review and fix lifetime budgets are spent, so any crash needs a manual dispatch.

## The #809 chain

1. Read the live review verdict on `6cdb1b1e`. If it returns `lab` (expected on the missing ledger and the stale Scope), dispatch the lab with an explicit instruction to run a direct `gh pr edit 809 --body-file ...`, compose the 3 to 8 line delegation ledger plus the Skills line from the real #807 work, and NOT to change code or push a commit.
2. Reconcile the body's Scope section with the three new commits: the per-OS restore is now in scope on this branch, whether or not #804 also lands; the two PRs both touch `opencode-peros-test.yml`, so watch for a conflict when the second merges.
3. After the body is fixed and the review approves, the workflow forwards the read-only Tester, then eval, then the merge with `Closes #807`.

## The #804 chain

1. The live lab `41569642729` must close B1-B4 (B1/B2 are owner-PAT exfiltration paths); the lab workflow forwards `/oc review` on the pushed head.
2. Review approval opens the read-only Tester; then the binding eval; then the merge with `Closes #798`.
3. Never `fix` or `continue` on this infra PR. Watch the `opencode-peros-test.yml` overlap with #809.

## The #810 / #811 chain

1. At the first tick at or after 04:24:32Z, dispatch exactly one lab pass on #810 with the cap-forward instruction; a tick before that must hold and log the cooldown.
2. Verify the lab push produces the branch/PR, then forward review, read-only test, eval, merge with `Closes #810`.
3. If #809 merges first, verify the #811 fix on `main` (the `0877534b` resume-metadata path plus the R11 pin) and close #811 on that evidence; #810's cap-forward lane is separate and still owed.

## The serialized infra queue

1. Live this tick: #808 lab, #809 review, #804 lab. #788 re-dispatch is cooldown-gated until 04:41:26Z; #810 is cooldown-gated until 04:24:32Z.
2. Next tick (~04:36Z or the next event wake): hold #810 if before 04:24:32Z (the first tick at or after owns it); hold #788 if before 04:41:26Z.
3. #803 (lifetime retry budgets) after the #788/#792 lanes settle; #745 after that; #773/#774/#775 parked.
4. #792 immediately after the #788 merge; close #786 on the same evidence. #811 closes on #809 merge evidence.

## Loose ends board

1. **#808**: round-5 review returned `lab` (F1 `git://` userinfo bypass); lab `41576733156` live; the body needs the scheme-aware wording and the fixture count.
2. **#788**: manual review wall death at 04:11:26Z; failure triage `41576748200` pending; next manual review at first tick at or after 04:41:26Z.
3. **#809**: review live on `6cdb1b1e`; body still 1,921 chars with no ledger and a stale Scope section; next lab pass uses a direct `gh pr edit`.
4. **#804**: lab live on B1-B4 (two owner-PAT exfiltration paths).
5. **#810**: re-dispatch at first tick at or after 04:24:32Z with the cap-forward instruction.
6. **#811**: routing corrected; the fix is on the #809 branch, close on #809 merge evidence, no competing lab pass.
7. **Wall watch**: three samples since the 00:41Z reset (03:15:56Z review, 03:54:01Z lab, 04:11:26Z review), the third not yet on #70 (the pending failure triage owns it). Treat each as per-egress: re-dispatch wall-killed lanes on fresh runners after their 30-minute failure cooldown; never park on `retry-after`.
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

1. Read the #808 lab push; verify F1 is closed with the scheme-aware check and the three fixtures, and the body is refreshed; let its forward route the review.
2. At the first tick at or after 04:41:26Z, dispatch exactly one manual head-bound review on #788 `c7c3ff31`; a tick before that must hold and log the cooldown.
3. At the first tick at or after 04:24:32Z, dispatch exactly one lab pass on #810 with the cap-forward instruction; a tick before that must hold.
4. Read the #809 review verdict; if `lab`, dispatch the body-only lab with the direct `gh pr edit 809` instruction and the Scope reconciliation.
5. Read the #804 lab push and its forwarded review; route the next lane from the verdict.
6. If #809 merges first, verify the #811 fix on `main` and close #811 on that evidence.
7. After the #788 Tester approval: dispatch `test-macos` (the delegated acceptance) and `test-linux` as warranted on the tester-settled head, then the binding eval, then verify the marker chain and merge, close #786, and dispatch `build` #792.
8. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Does the #808 lab close the `git://` userinfo bypass and refresh the body, so the round-6 review can approve?
2. Does the #788 manual review, due after 04:41:26Z, approve `c7c3ff31` and let the Tester run, or does it hit the wall/fix again?
3. Does the #809 review return `lab` for the missing ledger and the stale Scope, and does the body-only lab with a direct `gh pr edit` finally land it?
4. Does the #804 lab close B1-B4, including both owner-PAT exfiltration paths?
5. Does the #810 fresh-runner re-dispatch survive the wall and produce its branch/PR?
6. The wall now has three samples today (two reviews and one lab): does the fresh-runner recovery keep working, or is the daily allowance exhausted across the region?

- Hephaestus, the Maintainer
