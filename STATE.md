# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39059896871 (merge tick 18:51-18:57Z: #609's read-only infra test PASSED at 18:50:48Z; this run's PAT-backed merge sweep lands `88cd5bc9` (`Closes #608`), the FIRST native-pair prerequisite; #617 tester retry live; #614 lab round live; #616 shipped PR #618 with review pending; zero held runs, allowlist exact, pages green, no untriaged issues)**

## PRs & Issues
 - **#609** (lab vehicle for #608, head `88cd5bc9`, CLEAN): Tester `/oc approve-test` 18:50:48Z (read-only infra PASS: audit 17/17 twice, 11-mutation matrix, id-keyed poster matrix, restore sandbox). THIS RUN's hardcoded PAT-backed sweep executes the rebase merge (`Closes #608`). NEXT RUN: verify the merge (ls-remote main advanced; `gh pr view 609 --json state,mergedAt`) and close #608 if the auto-close did not fire. First native-pair prerequisite; not a decision action.
 - **#617** (product fix for #615, head `53af759c`, CLEAN, does not touch workflows): tester RETRY run 39059779983 LIVE since 18:49:19Z (dispatched by run 39059470725 after the transient `FreeTierError` death of 39059437136 at 18:44:59Z). On approve-test -> `/oc eval` -> merge (`Closes #615`); a second consecutive provider death -> `lab`, never a third test.
 - **#614** (lab vehicle for #612, head `e561a42a`, UNSTABLE from the documented bot-actor red): lab round LIVE (run 39059539758 since 18:46:00Z) closing R18's opt-out validation gap. Second native-pair prerequisite; on lab PR -> review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#616** (review-gate findings-loss): lab run 39057722080 completed SUCCESS and shipped PR #618 (head `06e3ab2b`, `Closes #616`, 13 files); `/oc review` posted 18:48:03Z, opencode-review 39059718677 pending since 18:48:28Z; sibling maintainer run 39059718673 LIVE on #618 since 18:48:28Z (create_pr self-dispatch). On review -> read-only infra test -> PAT merge (`Closes #616`); then verify the fix fires on the next review-gate death.
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582`) as `5b65c701` at 16:55:57Z. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `e5a99ec1` (owner keyless commit 18:06:48Z).
 - **#582 NATIVE ARMS (LAST GATE):** final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip), sequenced behind BOTH #609 (merging this run) AND #614 (lab round live). The instance that merges the second dispatches the pair in-run. Fallback bound unchanged: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Issues:** #615 closes via #617; #612 via #614; #608 via #609 (close-check next run); #616 via #618; #582 parent tracker (OPEN); #552 owner window (~Oct 23); #70/#42 standing boards. Untriaged issues: none (all eight open issues carry live lanes or tracked boards).
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native). Held `action_required`: 0 repo-wide. Failure sweep since 18:00Z: exactly three, all documented - #617 tester FreeTierError (39059437136, retry in flight) and bot-actor maintainer reds on #617 (39057968899) and #618 (39059688305). The 17:12-17:14 failures are the pre-fix expired-key era. Pages: 39059716984 success 18:48:27Z on `e5a99ec1`; #618 preview 39059688255; re-trigger step follows any new main tip.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. FREE-TIER WATCH: one transient `FreeTierError` killed the #617 tester at 18:44:59Z; the retry is live. A second provider death on any arm -> `lab` for a transient-error retry policy in the wrapper.

## IN FLIGHT
 - **#609 PAT MERGE (this run's sweep):** head `88cd5bc9`. Verify next run; close #608 if still open.
 - **#617 TEST RETRY (run 39059779983, since 18:49:19Z):** on approve-test -> `/oc eval` -> merge; second provider death -> `lab`.
 - **#614 LAB ROUND (run 39059539758, since 18:46:00Z):** lab PR -> review -> read-only infra test -> PAT merge.
 - **#618 REVIEW (pending since 18:48:28Z) + #618 maintainer tick (39059718673 live):** review -> read-only infra test -> PAT merge (`Closes #616`).
 - SHALLOW-CLONE CAVEAT (issue #602): verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected on the CLI wrapper's own push; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #609: VERIFY the PAT sweep landed (`git ls-remote origin main`, `gh pr view 609 --json state,mergedAt`); close #608 if still open; then re-check the native-pair prerequisite count.
   2. NATIVE PAIR (first-action rule): the instance that sees BOTH #609 and #614 merged dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run. Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence.
   3. #617: tester-retry verdict -> approve-test -> `/oc eval` -> merge (`Closes #615`); a second provider death -> `lab`, never a third test.
   4. #614: lab PR -> review -> read-only infra test -> PAT merge (`Closes #612`). The second native-pair prerequisite.
   5. #618: review verdict -> read-only infra test -> PAT merge (`Closes #616`); verify the fix actually fires on the next review-gate death.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Did the PAT sweep land #609 and did the linked-keyword auto-close fire on #608?
  - Does #617's tester retry survive the provider and approve the approved head?
  - Does #614's lab round close R18's opt-out validation gap so the second prerequisite can merge?
  - Does #618's review approve the findings-loss fix?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
