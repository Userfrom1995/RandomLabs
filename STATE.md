# STATE

Last updated: 2026-11-03T04:20Z by run 41577133723. Wake: the owner-PAT publication of the #809 round-11 review report at 04:16:14Z (issue_comment), which returned `lab` on the missing delegation ledger only. The force-lab route started lab `41577137577` on `6cdb1b1e`; #808 and #804 labs are live, while #788 and #810 are cooldown-gated.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:16-04:20Z)

- **main** = `97bf24bf0a2cfc3cde432ff288c30a271005cb89`, unchanged. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph and pages-build-deployment are GitHub dynamic). Zero held `action_required` runs. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Open PRs: #809, #808, #804, #788, #745. Open issues: 22 before this run's follow-up (23 after). Every active head is MERGEABLE/CLEAN except #745 CONFLICTING/DIRTY. Pages green at 03:46:48Z on `main`. No non-maintainer failed or timed-out run since the #788 review wall death at 04:11:31Z; the cancelled `maintainer` runs at 04:12 and 04:16 are the deliberate single-slot concurrency churn.
- **#809 (the notification)**: review `41574141456` completed SUCCESS at 04:16:22Z on `6cdb1b1e`, report published at 04:16:14Z, verdict `lab`. The Reviewer executed the real restore and lane-guard bodies in sandboxes: the incident shape is fixed, the inventory is NUL-delimited and fail-closed, the skip-worktree plus intent-to-add hiding survives `git add -A`, `git commit -a`, an exclude removal and a `.gitignore` negation, and the quoted/newline/unicode/staged/corrupt-index/replace-ref/non-ancestor variants all fail the guard. The single blocking finding is F4: the body (1,922 bytes) has no delegation ledger and no Skills line, and its Scope paragraph calls the per-OS restore out of scope even though `6cdb1b1e` changes `opencode-peros-test.yml`. Non-blocking: the new R11 resumed-PR check is shadowed by an earlier same-name step (a reproduced audit bypass; the runtime `lab.yml` block is correct), `LAB.md:1032-1034` still describes exclude-only hiding, and the lane guard's success message can overstate the cleanup. The force-lab route posted `/oc lab` at 04:16:17Z; lab `41577137577` has been live since 04:16:22Z on `6cdb1b1e`, and the head has not moved.
- **#808**: round-5 review returned `lab` on F1 (the `git://` userinfo form hides a non-GitHub host from both resolvers); lab `41576733156` is live since 04:12:32Z on `46732940`.
- **#804**: lab `41569642729` is still live since 03:01:19Z on `d1a4b5c9`; B1/B2 are owner-PAT exfiltration paths. No push yet.
- **#788**: head `c7c3ff31`, stable. The manual review `41575070562` died on the #754 per-egress wall at 04:11:17Z with no verdict and the review lifetime budget is spent (#803), so recovery is exactly one manual head-bound review at the first wake at or after 04:41:31Z.
- **#810**: still no branch and no PR. The lab died on the wall at 03:54:01Z, so the fresh-runner re-dispatch is cooldown-gated to 04:24:01Z; the next wake at or after that takes it with the owner's cap-forward instruction.
- **#811**: open; its resume-metadata fix rides on #809 (`0877534b` plus the R11 pin). Close it on #809 merge evidence after verifying the fix on `main`.
- **No merge candidate**: no open PR carries a fresh, head-bound, owner-authored tester verdict plus a fresh, head-bound `eval-verdict: approve-eval` marker. #809 and #804 have no tester verdict at their heads, #808's tester marker is bound to `cf626b9c`, the five #788 tester markers predate `c7c3ff31`, and no open PR has an eval marker at all.
- **Health**: no new wall sample since 04:11:17Z. The live lanes (#809 lab, #808 lab, #804 lab) all started after it and are healthy so far, so the wall remains per-egress, not global.
- **#745** parked CONFLICTING/DIRTY at `7a04fa4a`. **#803** queued behind the #788/#792 lanes. **#792** waits behind #788; #786 stays open until the #788 merge. #773/#774/#775 parked. #742 stays open behind #745. Trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## The live lanes (do not duplicate)

1. #809 lab `41577137577` on `6cdb1b1e`: a body-only pass. It must apply the body in-session with a direct `gh pr edit 809 --body-file ...` (the `lab.yml` metadata-on-resume fix is on this branch, not `main`, so the workflow contract cannot do it until this PR merges, #811). The body needs the 3 to 8 line ledger plus the Skills line from the real #807 record, the three post-`7c3ab4f4` commits folded into Summary and Validation (the per-OS restore, the replace-ref pin, the resumed-branch metadata edit), and the false Scope line deleted. No invented subagents. On a push the lab workflow forwards `/oc review`.
2. #808 lab `41576733156` on `46732940`: close F1 (the `git://` userinfo host bypass) in both `setup.sh` and `shutdown.sh`, with negative fixtures. On a push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #799`. Never `fix`/`continue` on this infra PR.
3. #804 lab `41569642729` on `d1a4b5c9`: close B1-B4, including both owner-PAT exfiltration paths. On a push the lab workflow forwards `/oc review`, then the read-only Tester, then eval, then the merge with `Closes #798`. Never `fix`/`continue` on this infra PR.

## The #809 chain

1. Read the live lab result. If it pushes, the forwarded review re-checks the head; confirm the body now carries the ledger, the Skills line, the three commits and the corrected Scope.
2. On a clean review verdict the workflow forwards the read-only Tester (the diff touches `.github/workflows`, so the Tester never commits), then the binding eval, then the merge with `Closes #807`.
3. If the lab pass again leaves the body untouched, dispatch one lab with an explicit instruction to run `gh pr edit 809` directly and nothing else. Do not let a second code-pushing pass masquerade as the body fix.
4. After the merge, verify the #811 fix on `main`, close #811 on that evidence, and reconcile any R11/LAB.md/wording follow-up items that did not land.
5. Watch the `opencode-peros-test.yml` overlap with #804: both branches edit it, so the second merge may need a rebase.

## The #788 chain

1. At the first wake at or after 04:41:31Z, dispatch exactly one manual head-bound review on `c7c3ff31`.
2. Read its verdict. On approval the workflow forwards `/oc test`; on `fix` the forward starts the Fixer; on another wall death re-dispatch after the next 30-minute cooldown on a fresh runner.
3. On Tester approval dispatch at least a fresh macOS row (the delegated acceptance) and a Linux row as warranted on the tester-settled head, so the native evidence binds the final head.
4. On a clean macOS and Linux pass, dispatch the binding eval on the new head; on `approve-eval`, verify the owner-authored marker is head-bound and newer than the Tester marker and the latest eval trigger, with no newer fix or rejection, then merge `--rebase` (fallback `--merge`, branch kept), close #786 with the native evidence (the PR body says `Refs`, so this is a manual close), and dispatch `build` #792.
5. Do not treat unchanged-head markers from older chains as fresh. The review lifetime budget is spent, so any further crash needs a manual dispatch.

## The #810 chain

1. At the first wake at or after 04:24:01Z, dispatch exactly one lab pass on #810 with the cap-forward instruction. A wake before that must hold and log the cooldown.
2. Verify the branch/PR it produces, then review, read-only test, eval, and merge with `Closes #810`.
3. If the wall kills it again, re-dispatch after the next 30-minute cooldown on a fresh runner; the wall is per-egress and `retry-after` is never a park horizon.

## The R11 follow-up issue (UNTRIAGED, held)

- This run created one follow-up issue: `[Infra] R11 resumed-PR check is shadowed by an earlier same-name step (audit bypass)`. It covers the reproduced decoy-job bypass in `.github/scripts/silent-stall-audit.sh:518-529` (scope the extraction to the unique `lab:` job, pin the linkage-guard-before-edit order, add the decoy and reordered fixtures) plus `LAB.md:1032-1034` (skip-worktree + intent-to-add + lane guard) and the `opencode-test.yml:374-376` success-message wording.
- HOLD: do not dispatch a lab pass on it while #809 is open or in flight, because both edit `silent-stall-audit.sh` and a competing branch would collide. After #809 merges, verify each item on the merge head, drop the ones that landed, and triage the rest as one lab pass.
- If the issue number is not yet visible in the open list when a run surveys, find it by its exact title; the hardcoded handler deduped on creation.

## The serialized infra queue

1. Live this tick: #809 lab, #808 lab, #804 lab.
2. Next wake at/after 04:24:01Z: dispatch the #810 fresh-runner lab (the ~04:40 tick owns it unless a comment wake arrives earlier).
3. Next wake at/after 04:41:31Z: dispatch the #788 manual review (the ~04:40 tick must hold; the ~05:00 tick owns it unless a comment wake arrives earlier).
4. The R11 follow-up after #809 merges (held, see above).
5. #803 (lifetime retry budgets) after the #788/#792 lanes settle; #745 after that; #773/#774/#775 parked.
6. #792 immediately after the #788 merge; close #786 on the same evidence. #811 closes on #809 merge evidence.

## Loose ends board

1. **#809**: lab live on `6cdb1b1e`; the body still lacks the ledger and Skills line, and the Scope paragraph is stale. The live pass must use a direct `gh pr edit`.
2. **#808**: lab live on F1 (the `git://` userinfo host bypass).
3. **#804**: lab live on B1-B4 (two owner-PAT exfiltration paths).
4. **#788**: round-10 wall death at 04:11:17Z, head unchanged; one manual review owed at/after 04:41:31Z. Review lifetime budget spent.
5. **#810**: wall death at 03:54:01Z, no branch/PR; one lab re-dispatch owed at/after 04:24:01Z.
6. **#811**: routing corrected; close on #809 merge evidence.
7. **R11 follow-up**: created and held behind #809; triage after the merge.
8. **Wall watch**: dormant since 04:11:17Z, but every new dispatch is a fresh egress roll. Treat any death as per-egress: re-dispatch after the 30-minute failure cooldown; never park on `retry-after`.
9. **Queue**: #803 after the #788/#792 lanes; #745 after; #792 right after #788 merges.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue` (target = `target` or `pr` or `issue`).
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #809 lab result; if it pushed, let the forwarded review run and confirm the body carries the ledger, skills line, the three commits and the corrected Scope. If the body is still untouched, dispatch one lab with the direct-`gh pr edit` instruction.
2. If the wake is at or after 04:24:01Z, dispatch exactly one lab on #810 with the cap-forward instruction. A wake before that must hold.
3. If the wake is at or after 04:41:31Z, dispatch exactly one manual head-bound review on #788 `c7c3ff31`. The ~04:40 tick must hold.
4. Read the #808 lab push and its forwarded review; route the next lane from the verdict.
5. Read the #804 lab push and its forwarded review; route the next lane from the verdict.
6. If #809 merges, verify the #811 fix on `main`, close #811 on that evidence, reconcile the R11/LAB.md/wording items, and triage the held follow-up only if anything is still missing.
7. After the #788 Tester approval: dispatch `test-macos` (the delegated acceptance) and `test-linux` as warranted on the tester-settled head, then the binding eval, then verify the marker chain and merge, close #786, and dispatch `build` #792.
8. On every failure, verify the head and artifacts against the live repo before claiming a change landed; never advance the ladder on a provider wall.

## Open questions

1. Does the live #809 lab `41577137577` finally apply the body with a direct `gh pr edit`, or does it repeat the 02:46Z miss and leave the ledger absent?
2. Does the #809 review then approve the head, and do the read-only Tester and binding eval clear it for the merge with `Closes #807`?
3. Does the #810 fresh-runner lab at/after 04:24:01Z survive the wall and produce its branch/PR?
4. Does the #788 manual review at/after 04:41:31Z approve `c7c3ff31`, or does the wall hit it a third time?
5. Does the #808 lab close the `git://` userinfo finding, and does its forwarded review approve the new head?
6. Does the #804 lab close B1-B4, including both owner-PAT exfiltration paths?
7. Is the wall dormant for now (no new sample since 04:11:17Z) or does it return on the next fresh runner?

- Hephaestus, the Maintainer
