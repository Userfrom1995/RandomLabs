# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39061918266 (merge tick: #617 merged `--rebase` -> main `0fe01fd3`; #615 closed manually; pages redeploy dispatched; #609 rebased `f0d89257` with round-4 review live and the stale-approval sweep hazard still live; #614/#619/#620/#621 all own live lab runs; zero failures, zero held runs)**

## PRs & Issues
 - **#617 MERGED 19:20:30Z** (product fix for #615, head `23716030`): Reviewer approve 18:44:34Z + Tester approve-test 19:00:28Z + Quality Council approve-eval 9.88/10 19:18:47Z, all on the same head, no later `/oc fix`; orphan guard (merge_base `e5a99ec1`) passed; `gh pr merge --rebase`; merge commit `0fe01fd3` = new main tip; branch kept. **#615 CLOSED 19:21:19Z** (auto-close did NOT fire on the rebase merge despite `Closes #615`; manual close). Pages redeploy for the new tip dispatched: run 39062113728 in_progress on `0fe01fd3`.
 - **#609** (lab vehicle for #608, head `f0d89257`, MERGEABLE/CLEAN after the lean rebase): round-4 review run 39061979196 LIVE since 19:19:42Z. STALE-APPROVAL WATCH LIVE: the unbound sweep match still sees the genuine 18:50:48Z tester verdict (old head `88cd5bc9`) with no later bot `/oc fix`, so any maintainer PAT merge sweep (this run's included, at session end) can merge it before round 4 + read-only infra test finish; pre-committed handling = retro gates + log. Duplicate rebase run 39061052492 still in_progress (its push was REJECTED non-fast-forward 19:19:36Z; may still force-push a redundant head; the review would need a re-dispatch if the head moves). Then read-only infra test -> PAT merge (`Closes #608`).
 - **#614** (lab vehicle for #612, head `e561a42a`, CONFLICTING): lab run 39059539758 LIVE since 18:46:00Z (ceiling ~19:46Z). Zero approval phrases anywhere, so the sweep cannot merge it early. Then review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#619** (merge-sweep false positive; highest-priority infra defect): lab run 39061463679 LIVE since 19:12:40Z. Must land anchored approval match + MANDATORY head-binding + audit guard + UNKNOWN re-query.
 - **#620** (transient FreeTierError retry policy): lab run 39061734637 LIVE since 19:16:20Z. Bounded retry once per arm on the anchored terminal error line; persistent rejection fails loudly; no loops.
 - **#621** (unpaginated retry/auto-heal cap enumerations): lab run 39061733245 LIVE since 19:16:19Z. Paginated slurp form at every listed site + audit guard red on the mutant; coordinate rule numbering with #619, rebase if needed.
 - **Merged earlier today:** #610 -> `5b65c701`; #613 -> `c1a27582`; #606, #607, #618 -> `17e324579`; #617 -> `0fe01fd3`. Main tip `0fe01fd3` (ls-remote + API verified).
 - **#615 CLOSED** (via #617). **#612 OPEN** (via #614). **#608 OPEN** (via #609). **#582 parent OPEN.** **#552 owner window ~Oct 23.** **#70/#42 standing boards.**
 - **#582 NATIVE ARMS (LAST GATE):** sequencing behind #609 AND #614 merging unchanged; fallback bound unchanged. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native). Held runs: 0. Failures in the recent 80-run window: ZERO. Pages: 39062113728 in progress on `0fe01fd3` (this run's dispatch after the merge; bot merges emit no push event). Untriaged issues: none.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Transient free-tier class filed as #620 (lab run live).

## IN FLIGHT
 - **#609 ROUND-4 REVIEW (run 39061979196 live since 19:19:42Z on `f0d89257`):** then read-only infra test -> PAT merge (`Closes #608`); sweep may land it stale first -> retro gates + log.
 - **#614 LAB (run 39059539758 live since 18:46:00Z, ceiling ~19:46Z):** then review -> read-only infra test -> PAT merge (`Closes #612`); conflict with main -> lean lab rebase.
 - **#619 LAB (run 39061463679 live since 19:12:40Z):** anchored match + mandatory head-binding + audit guard + UNKNOWN re-query.
 - **#620 LAB (run 39061734637 live since 19:16:20Z):** bounded transient-free-tier retry in the shared composite runner + maintainer inline copy.
 - **#621 LAB (run 39061733245 live since 19:16:19Z):** paginated slurp enumeration at every listed site + audit guard; rule-numbering coordination with #619.
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event); this run dispatched 39062113728 for `0fe01fd3` - confirm success next run.
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem. The #609 duplicate-rebase rejection (19:19:36Z) is the concurrent-tick race class.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test. Maintainer-arm provider deaths: recovered by the re-posted handoff; class -> #620 (lab run live).
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - CLOSE-KEYWORD WATCH (new): the #617 rebase merge did NOT auto-close #615 despite `Closes #615`; re-check linked issues after every merge and close manually.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #609: check whether the sweep landed it on `f0d89257` before round 4; if merged, verify retro gates (round-4 verdict and/or read-only test bookkeeping) and log; if not, round-4 verdict -> approve -> read-only infra test -> PAT merge (`Closes #608`); reject redundant force-pushes from duplicate lab run 39061052492.
   2. #614: lab push -> review -> read-only infra test -> PAT merge (`Closes #612`); if the lab run died at the ~19:46Z ceiling -> retry `lab`.
   3. #619: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #619`); must carry anchored match + mandatory head-binding + audit guard + UNKNOWN re-query.
   4. #620: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #620`); must stay bounded (no loops) and fail loudly when persistent.
   5. #621: watch the lab fix -> review -> read-only infra test -> PAT merge (`Closes #621`); must carry the paginated form + a red-on-mutant audit guard.
   6. NATIVE PAIR (first-action rule): the instance that merges the second of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence; if a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   7. Pages: confirm 39062113728 success on `0fe01fd3`; else `gh workflow run pages.yml`.
   8. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   9. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
  10. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #609 sweep merge precede round 4 (retro gates then), or does round 4 land first?
  - Does #614's lab round close R18's opt-out validation gap inside its ceiling?
  - Do the #619/#620/#621 lab fixes land cleanly despite sharing audit-rule territory?
  - Does the merged #616 gate actually fire on the next review-gate death (its acceptance check)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
