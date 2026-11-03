# STATE

Last updated: 2026-11-03T04:15Z by run 41576667820. Wake: workflow_run failure of `opencode-review` 41575070562 (the #788 manual review) at 04:11:31Z after a per-egress free-usage wall death. No dispatch this run: #788 is in failure cooldown to 04:41:31Z and #810 to 04:24:32Z, while the #809 review, the #808 F1 lab and the #804 lab are live.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:12-04:15Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #809, #808, #804, #788, #745. Open issues: 22. Every active PR head is MERGEABLE/CLEAN except #745 CONFLICTING/DIRTY. Pages green at 03:46:10Z on `main`.
- **#788 (the notification)**: the manual review `41575070562` served about 15 minutes (03:55:52-04:11:17Z) and died on the #754 per-egress wall (`AI_APICallError: Free usage limit reached. ...`, statusCode 429, model `deepseek-v4.1-flash-free`). The fast-fail consumed no retry budget; there is no decision file, no report and no published verdict, and the head stayed `c7c3ff31`. The verify failed closed and refused the auto-retry because the review lifetime budget is spent (#803). Recovery: one manual review on a fresh runner at the first wake at or after 04:41:31Z. The ~04:36 tick must hold.
- **#808**: round-5 review `41573177649` completed SUCCESS at 04:12:21Z with a `lab` rejection. Blocking F1: the whole-authority check still treats `user@` as userinfo for `git://`, where Git treats the entire `user@host` as the hostname, so a non-GitHub `git://` origin resolves to a plausible `owner/repo` and `--secrets`, `--dispatch` and `--purge` can target it with no warning (`setup.sh:121-132`, `shutdown.sh:59-70`). The report was published at 04:12:14Z and the workflow's force-lab route posted `/oc lab` at 04:12:17Z; Lab Engineer `41576733156` is live since 04:12:32Z on head `46732940`. The positive round-5 claims were accepted (double-slash closed, dot-leading-owner guard, refreshed 4,005-char body). On a push the lab workflow forwards `/oc review`.
- **#809**: review `41574141456` is still in its agent pass since 03:46:03Z on `6cdb1b1e`. The body is still 1,921 chars with no delegation ledger and a stale Scope section. On a `lab` verdict the workflow's force-lab route posts `/oc lab` itself; that pass must run a direct `gh pr edit 809` plus the Scope reconciliation and must not change code.
- **#804**: lab `41569642729` is still in its agent pass since 03:01:19Z on `d1a4b5c9`; B1/B2 are owner-PAT exfiltration paths. On a push the lab workflow forwards `/oc review`.
- **#810**: still no branch and no PR. The 03:54:32Z wall death keeps the lane in failure cooldown until 04:24:32Z; the ~04:16 tick holds, and the ~04:36 tick owns the fresh-runner lab with the owner's cap-forward instruction. A maintainer wake between 04:24:32Z and 04:36Z may dispatch it earlier.
- **#811**: triaged; the resume-metadata fix rides on #809 (`0877534b` plus the R11 pin), so close it on #809 merge evidence after verifying the path and the pin on `main`, and only requeue if #809 is abandoned or drops the fix.
- **No merge candidate**: no PR carries a fresh, head-bound, owner-authored tester verdict plus a fresh, head-bound `eval-verdict: approve-eval` marker. The #808 tester marker is bound to `cf626b9c`, the five #788 tester markers predate `c7c3ff31`, #804 and #809 have no tester verdict at their heads, and no open PR has an eval marker.
- **Health**: three wall samples since the 00:41Z reset: the #788 review at 03:15:56Z, the #810 lab at 03:54:01Z, and the #788 review again at 04:11:17Z. All three were fast-fails with no park horizon, and all are recorded or being recorded on #70. The other live lanes are healthy, so the wall remains per-egress, not global. No other failed or timed-out run since 02:00Z.
- **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#803** queued behind the #788/#792 lanes. **#792** waits behind #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live recovery lanes (do not duplicate)

1. #810 re-dispatch: one fresh-runner lab pass at the first wake at or after 04:24:32Z (the ~04:36 tick owns it), carrying the cap-forward instruction from the owner's 02:46:37Z comment. Verify its branch/PR before the next review, then review, read-only test, eval, merge with `Closes #810`.
2. #788 manual review: one head-bound review on `c7c3ff31` at the first wake at or after 04:41:31Z (the ~04:56 tick owns it). On approval the workflow forwards `/oc test`; on `fix` its forward starts the Fixer; on another wall death re-dispatch after the next cooldown on a fresh runner.
3. #809 review `41574141456` on `6cdb1b1e`; on `lab` the workflow forwards `/oc lab`, and that body pass uses a direct `gh pr edit 809`. On a clean verdict the workflow forwards the read-only Tester, then the binding eval, then the merge with `Closes #807`.
4. #808 lab `41576733156` on F1 (`git://` userinfo bypass); on a push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #799`.
5. #804 lab `41569642729`; on a push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #798`. Never `fix`/`continue` on this infra PR.

## The #788 chain

1. After the cooldown (earliest 04:41:31Z), dispatch exactly one manual head-bound review on `c7c3ff31`.
2. Read its verdict. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer; on another wall death re-dispatch after the next cooldown on a fresh runner.
3. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head, so the native evidence binds the final head.
4. On a clean macOS and Linux pass, dispatch the binding eval on the new head; on `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`, so this is a manual close), and dispatch `build` #792.
5. Do not treat unchanged-head markers from older chains as fresh. The review lifetime budget is spent, so any further crash needs a manual dispatch.

## The #810 chain

1. At the first wake at or after 04:24:32Z, dispatch exactly one lab pass on #810 with the cap-forward instruction. A wake before that must hold and log the cooldown.
2. Verify the branch/PR it produces, then review, read-only test, eval, and merge with `Closes #810`.
3. If the wall kills it again, re-dispatch after the next 30-minute cooldown on a fresh runner; the wall is per-egress and `retry-after` is never a park horizon.

## The #808 chain

1. The live lab `41576733156` must close F1: reject a `git://` authority whose userinfo form Git reads as a non-GitHub host, in both `setup.sh` and `shutdown.sh`, with negative fixtures and an audit pin as needed.
2. The lab workflow forwards `/oc review` on the pushed head; a clean verdict forwards the read-only Tester, then the binding eval, then the merge with `Closes #799`.
3. Never `fix` or `continue` on this infra PR. Watch the `opencode-peros-test.yml` overlap with #809.

## The #809 chain

1. Read the live review verdict on `6cdb1b1e`. If it returns `lab` (expected on the missing ledger and the stale Scope), let the workflow's force-lab route start the Lab Engineer, and instruct that pass to run a direct `gh pr edit 809 --body-file ...`, compose the 3 to 8 line delegation ledger plus the Skills line from the real #807 work, and NOT to change code or push a commit.
2. Reconcile the body's Scope section with the three lab commits: the per-OS restore is in scope on this branch, whether or not #804 also lands; both PRs touch `opencode-peros-test.yml`, so watch for a conflict when the second merges.
3. After the body is fixed and the review approves, the workflow forwards the read-only Tester, then eval, then the merge with `Closes #807`.

## The #804 chain

1. The live lab `41569642729` must close B1-B4 (B1/B2 are owner-PAT exfiltration paths); the lab workflow forwards `/oc review` on the pushed head.
2. Review approval opens the read-only Tester; then the binding eval; then the merge with `Closes #798`.
3. Never `fix` or `continue` on this infra PR. Watch the `opencode-peros-test.yml` overlap with #809.

## The serialized infra queue

1. Live this tick: #809 review, #808 lab (F1), #804 lab. #810 and #788 are cooldown-gated.
2. Next wake at/after 04:24:32Z: dispatch the #810 fresh-runner lab (the ~04:36 tick owns it; a wake between 04:24 and 04:36 may take it).
3. Next wake at/after 04:41:31Z: dispatch the #788 manual review (the ~04:56 tick owns it; the ~04:36 tick must hold).
4. #803 (lifetime retry budgets) after the #788/#792 lanes settle; #745 after that; #773/#774/#775 parked.
5. #792 immediately after the #788 merge; close #786 on the same evidence. #811 closes on #809 merge evidence.

## Loose ends board

1. **#788**: round-10 wall death at 04:11:17Z, head unchanged; one manual review owed at/after 04:41:31Z.
2. **#810**: wall death at 03:54:32Z, no branch/PR; one lab re-dispatch owed at/after 04:24:32Z.
3. **#808**: lab live on F1 (`git://` userinfo bypass); watch for the push and the forwarded review.
4. **#809**: review live on `6cdb1b1e`; body still 1,921 chars with no ledger and a stale Scope; the next lab pass uses a direct `gh pr edit`.
5. **#804**: lab live on B1-B4 (two owner-PAT exfiltration paths).
6. **#811**: routing corrected; close on #809 merge evidence, no competing lab pass.
7. **Wall watch**: three samples since the 00:41Z reset (03:15:56Z review, 03:54:01Z lab, 04:11:17Z review), all fast-fails. Treat each as per-egress: re-dispatch wall-killed lanes on fresh runners after their 30-minute failure cooldown; never park on `retry-after`.
8. **Queue**: #803 after the #788/#792 lanes; #745 after; #792 right after #788 merges.
9. **#788 review lifetime budget is spent**: any further crash needs a manual dispatch, not an auto-retry.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. If the wake lands at or after 04:24:32Z, dispatch exactly one lab on #810 with the cap-forward instruction; a wake before that must hold and log the cooldown.
2. If the wake lands at or after 04:41:31Z, dispatch exactly one manual head-bound review on #788 `c7c3ff31`; the ~04:36 tick must hold.
3. Read the #809 review verdict; if `lab`, let the workflow's forward start the lab and record that the body pass must use a direct `gh pr edit 809` with the Scope reconciliation.
4. Read the #808 lab push and its forwarded review; route the next lane from the verdict.
5. Read the #804 lab push and its forwarded review; route the next lane from the verdict.
6. If #809 merges first, verify the #811 fix on `main` and close #811 on that evidence; #810's cap-forward lane is separate and still owed.
7. After the #788 Tester approval: dispatch `test-macos` (the delegated acceptance) and `test-linux` as warranted on the tester-settled head, then the binding eval, then verify the marker chain and merge, close #786, and dispatch `build` #792.
8. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Does the #788 manual review succeed on a fresh runner after 04:41:31Z, or does the wall hit it a third time?
2. Does the #810 fresh-runner lab dispatch survive and produce its branch/PR?
3. Does the #808 lab close the `git://` userinfo finding cleanly, and does its forwarded review approve the new head?
4. Does the #809 review return `lab` for the missing ledger and the stale Scope, and does the body pass finally land with a direct `gh pr edit`?
5. Does the #804 lab close B1-B4, including both owner-PAT exfiltration paths?
6. Is the wall worsening (three samples in 56 minutes) or is it isolated to unlucky runner egress IPs?

- Hephaestus, the Maintainer
