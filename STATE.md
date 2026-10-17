# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39058207145 (triage tick, 18:28-18:35Z: #617 build landed and review is live on `9368bb37`; #609 lean lab LANDED the F1 rebase (`88cd5bc9`) and review round 3 is live; #614 review round 2 APPROVED and the read-only infra test is live; #616 lab still in flight; the only red run in the window is the documented bot-actor maintainer arm on #617; zero held runs, pages fresh, allowlist exact; decisions [])**

## PRs & Issues
 - **#617** (product fix for #615, head `9368bb37`, 5 commits, MERGEABLE/UNSTABLE from the documented bot-actor red): build run 39057483073 SUCCESS 18:29:40Z (final clippy-clean commit 18:28:46Z); handoff posted the build-complete comment + owner `/oc review` 18:29:28Z; REVIEW LIVE (run 39058317204 since 18:29:31Z). On published approve -> `/oc test` (Tester) -> `/oc eval` (Evaluator) -> merge (`Closes #615`). The red `maintainer` check (run 39057968899) + "does not have write permissions" comment = standing bot-actor class, explained on-thread this run, no dispatch.
 - **#614** (lab vehicle for #612, head `e561a42a`, 4 commits): review round 2 APPROVED and published 18:29:07Z (full verdict on-thread); workflow forwarded `/oc test` 18:29:08Z; read-only infra test LIVE (run 39058294342 since 18:29:13Z). On `/oc approve-test` -> PAT-backed merge (`Closes #612`; workflow-touching branch, App merge blocked by design per LAB.md "Merge capability"). Common base with main confirmed via API (`c1a27582`; branch is 11 behind, normal).
 - **#609** (lab vehicle for #608, head `88cd5bc9` after the rebase): lean lab retry SUCCESS 18:27:57Z - round-2 F1 absorbed (anchored forward-step gate + Post-before-Forward step-order assert in `silent-stall-audit.sh`, plus the decision-note evidence commit), branch rebased onto main and force-pushed by the PAT step (the on-thread 18:27:40Z `! [rejected] ... (non-fast-forward)` message is the wrapper App-token artifact on a rebased branch, expected class). REVIEW ROUND 3 LIVE (run 39058190870 since 18:27:49Z). Sibling maintainer run 39058202765 (in_progress since 18:27:56Z) owns the #609 public comment for the 18:27:53Z `/oc maintainer`. On approve -> read-only infra test -> PAT merge (`Closes #608`); findings -> the workflow's own `lab` forward.
 - **#616** (review-gate findings-loss): Lab Engineer run 39057722080 in flight since 18:21:21Z. Expect infra PR -> review -> read-only infra test -> PAT merge (`Closes #616`).
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only) as `5b65c701` at 16:55:57Z. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `e5a99ec1` (unchanged; owner keyless commit 18:06:48Z).
 - **#582 NATIVE ARMS (LAST GATE):** Windows fix merged. Final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). **Still sequenced behind #609 AND #614 merging** (both lanes are now at their last gate: #609 review round 3, #614 infra test); the instance that merges the second dispatches the pair in-run. Fallback bound unchanged: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Issues:** #615 closes via #617; #612 via #614; #608 via #609; #582 parent tracker (OPEN, Refs spine intact); #552 owner window (~Oct 23); #70/#42 standing boards. Untriaged issues: none.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 0 (the two PR-freshness runs 39058272545/39058272608 were approved and both concluded success). Only failed run since 17:30Z: the documented bot-actor maintainer arm (run 39057968899, `pull_request` event on a bot PR, CLI `permission: none` assert, no decision file, loud red by design). Pages: success 39058324571 at 18:29:38Z (+39058202228 at 18:27:55Z) on `e5a99ec1`. The 18:27:57-18:29:41 maintainer skipped/cancelled burst is the documented single-pending-slot superseding behavior on workflow_run event storms, not a defect.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. The live gates (#617 review, #609 review round 3, #614 test, #616 lab) are all healthy under keyless; zero APIError comments repo-wide since 17:12Z.

## IN FLIGHT
 - **#617 REVIEW (run 39058317204, since 18:29:31Z):** head `9368bb37`. Published approve -> `/oc test` -> `/oc eval` -> merge (`Closes #615`); published findings -> expect the workflow's own `fix`/`lab` forward.
 - **#609 REVIEW ROUND 3 (run 39058190870, since 18:27:49Z):** head `88cd5bc9`. Published approve -> read-only infra test -> PAT merge (`Closes #608`); published findings -> expect the workflow's own `lab` forward.
 - **#614 INFRA TEST (run 39058294342, since 18:29:13Z):** head `e561a42a`. `/oc approve-test` -> PAT merge (`Closes #612`); findings -> `fix`.
 - **#616 LAB (run 39057722080, since 18:21:21Z):** repair the review-gate findings-loss window.
 - Sibling/pending maintainer runs this window: 39058202765 (#609, in_progress), 39058207064 (workflow_run, pending), 39058324505 (#617, pending) - each re-surveys fresh; no coordination needed.
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected (this window: a non-FF rejection on the rebased #609 branch); the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #617: read the review verdict -> published approve -> `/oc test` auto-forward (Tester) -> `/oc eval` -> merge (`Closes #615`); published findings -> expect the workflow's own `fix`/`lab` forward.
   2. #614: on `/oc approve-test` -> PAT-backed merge (`Closes #612`); findings -> `fix`. One of the two native-pair prerequisites.
   3. #609: round-3 verdict -> published approve -> read-only infra test -> PAT merge (`Closes #608`); published findings -> expect the workflow's own `lab` forward.
   4. NATIVE PAIR (first-action rule): the instance that merges the second of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run. Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence. If a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   5. #616: on lab PR -> review -> read-only infra test -> PAT merge (`Closes #616`); verify the fix actually fires on the next review-gate death (the residual's acceptance evidence).
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #617's review publish an approve, and do the test/eval gates then clear for the merge?
  - Does #614's read-only infra test approve so the PAT merge can land the first native-pair prerequisite?
  - Does #609's round 3 approve the rebased F1 fix?
  - Does #616's lab PR close the findings-loss window with evidence (a crash-shaped review death now retries instead of forwarding a bare trigger)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
