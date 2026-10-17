# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39059470725 (failure-triage tick 18:45-18:49Z: the #617 tester crashed at the provider with FreeTierError 5s into run 39059437136 right after review round 2 approved; retry `/oc test` dispatched under the retry-once rule; #609 read-only infra test live; #614 tester returned lab-round-required -> lab run live; #616 lab live; zero held runs, allowlist exact, pages green, no untriaged issues)**

## PRs & Issues
 - **#617** (product fix for #615, head `53af759c`, 6 commits): review round 2 APPROVED and published 18:44:34Z (delegation-ledger fix accepted); the auto-forwarded tester run 39059437136 died 18:44:59Z with `AI_APICallError` FreeTierError (transient provider rejection; no decision file; loud red by design; the run itself posted the APIError comment). RETRY `/oc test` dispatched this run (test-crash retry-once rule). On approve-test -> `/oc eval` -> merge (`Closes #615`); a second provider death -> `lab`, never a third test. MERGEABLE/CLEAN.
 - **#609** (lab vehicle for #608, head `88cd5bc9`, CLEAN): review round 3 APPROVED/published 18:43:47Z; read-only infra tester run 39059377567 LIVE since 18:43:51Z (agent step in progress). On `/oc approve-test` -> PAT-backed merge (`Closes #608`; workflow-touching branch, App merge blocked by design per LAB.md "Merge capability"). Findings -> the workflow's own `lab` forward.
 - **#614** (lab vehicle for #612, head `e561a42a`, UNSTABLE from the documented bot-actor red): tester verdict 18:45:56Z = **lab round required** (stdin handoff fix verified excellent; R18 opt-out validation gap); `/oc lab` auto-forwarded 18:45:58Z; lab run 39059539758 LIVE since 18:46:00Z. On lab PR + review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#616** (review-gate findings-loss): lab run 39057722080 LIVE since 18:21:24Z (~30m, healthy; 60m agent-step timeout). Expect infra PR -> review -> read-only infra test -> PAT merge (`Closes #616`); verify the fix actually fires on the next review-gate death.
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only) as `5b65c701` at 16:55:57Z. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `e5a99ec1` (unchanged; owner keyless commit 18:06:48Z).
 - **#582 NATIVE ARMS (LAST GATE):** Windows fix merged. Final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). **Still sequenced behind #609 AND #614 merging**; the instance that merges the second dispatches the pair in-run. #614's lab round extends that dependency by one lane. Fallback bound unchanged: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Issues:** #615 closes via #617; #612 via #614; #608 via #609; #582 parent tracker (OPEN); #552 owner window (~Oct 23); #70/#42 standing boards. Untriaged issues: none (all eight open issues carry live lanes or tracked boards).
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 0 repo-wide. Failure sweep since 17:30Z: exactly TWO - the documented bot-actor maintainer arm (39057968899, `pull_request` on bot PR #617) and the #617 tester FreeTierError crash (39059437136, the notification; retry now in flight). Pages: deploy run 39059242937 success 18:42:35Z on `e5a99ec1`.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. **NEW FREE-TIER WATCH:** one transient `FreeTierError`/`AI_APICallError` ("free tier can only be used from within OpenCode") killed the #617 tester; concurrent arms were healthy on the same model minutes apart. One occurrence is not a pattern; a second provider death on any arm -> `lab` for a transient-error retry policy in the wrapper.

## IN FLIGHT
 - **#617 TEST RETRY (dispatched this run):** head `53af759c`. approve-test -> `/oc eval` -> merge (`Closes #615`); second provider death -> `lab` (never a third test).
 - **#609 INFRA TEST (run 39059377567, since 18:43:51Z):** head `88cd5bc9`. `/oc approve-test` -> PAT merge (`Closes #608`); findings -> `lab`.
 - **#614 LAB ROUND (run 39059539758, since 18:46:00Z):** head `e561a42a`. Lab PR -> review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#616 LAB (run 39057722080, since 18:21:24Z):** repair the review-gate findings-loss window.
 - SHALLOW-CLONE CAVEAT (issue #602): this workspace is shallow, so `git merge-base --is-ancestor` can false-negative on valid branches; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #617: read the tester-retry verdict -> approve-test -> `/oc eval` -> merge (`Closes #615`); a second provider death -> `lab`, never a third test.
   2. #609: infra-test verdict -> approve-test -> PAT merge (`Closes #608`); findings -> `lab`. One of the two native-pair prerequisites.
   3. #614: lab PR -> review -> read-only infra test -> PAT merge (`Closes #612`). The second native-pair prerequisite.
   4. NATIVE PAIR (first-action rule): the instance that merges the second of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run. Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence. If a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   5. #616: on lab PR -> review -> read-only infra test -> PAT merge (`Closes #616`); verify the fix actually fires on the next review-gate death (the residual's acceptance evidence).
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #617's tester retry survive the provider and approve the approved head?
  - Does #609's read-only infra test approve so the PAT merge can land the first native-pair prerequisite?
  - Does #614's lab round close R18's opt-out validation gap so the second prerequisite can merge?
  - Does #616's lab PR close the findings-loss window with evidence?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
