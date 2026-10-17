# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39060638773 (19:01-19:10Z: #617 tester-approved on `23716030`, the first wake-up died at the provider (2nd FreeTierError today), this tick dispatches `/oc eval`; #609's merge sweep skipped CONFLICTING after #618 landed 18:55:19Z -> lab rebase dispatched + honesty ping; retry-policy issue filed; #614 lab round live; zero held runs, allowlist exact, pages fresh, no untriaged issues)**

## PRs & Issues
 - **#617** (product fix for #615, head `23716030`, CLEAN, does not touch workflows): review approved 18:44:34Z (on `53af759c`), Tester `/oc approve-test` 19:00:28Z with live PTY/pipe evidence + 5 hostile edge regressions (`tester_tier_precedence_edges.rs`). First maintainer wake-up (39060571484) died at the provider 19:00:53Z (FreeTierError); THIS run dispatched `{"action":"eval"}`. On approve-eval -> merge (`Closes #615`); on findings -> route per the Council.
 - **#609** (lab vehicle for #608, head `88cd5bc9`, CONFLICTING vs `17e32457`): review round 3 approved 18:43:47Z; Tester read-only PASS 18:50:48Z; the 18:56Z merge sweep skipped it (`mergeable=CONFLICTING` after the same sweep merged #618). THIS run dispatched `lab` (rebase over `17e32457`, resolve #618-merge conflicts in silent-stall-audit.sh / workflows / docs, preserve R17 semantics) + a ping correction. On push -> review round 4 -> read-only infra test -> PAT merge (`Closes #608`). FIRST native-pair prerequisite.
 - **#614** (lab vehicle for #612, head `e561a42a`, CONFLICTING vs `17e32457` since #618 merged): lab round 39059539758 LIVE since 18:46:00Z (dispatched pre-#618-merge; its push may not rebase). On push -> review -> read-only infra test -> PAT merge (`Closes #612`); if still CONFLICTING after the push -> lab rebase pass. SECOND native-pair prerequisite.
 - **#618 MERGED** 18:55:19Z (`17e32457`) -> **#616 CLOSED** 18:55:21Z; main tip `17e32457`; verify the findings-loss fix fires on the next review-gate death.
 - **#582 NATIVE ARMS (LAST GATE):** the merging instance of the SECOND of (#609, #614) dispatches `test-macos` + `test-windows` on #582 in-run. Fully green -> fold parity rows + unlock #552; defects -> `fix` with report evidence.
 - **Issues:** #615 closes via #617; #612 via #614; #608 via #609; NEW retry-policy issue (UNTRIAGED: created this run, self-triage dispatched, route `lab` next tick); #582 parent tracker (OPEN); #552 owner window (~Oct 23); #70/#42 standing boards.
 - **Boards/health:** allowlist self-audit exact both directions (19 at maintainer.yml:38 vs the 19 live non-maintainer names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native). Held `action_required`: 0 repo-wide. Failure sweep: exactly one, this window's maintainer FreeTierError 39060571484 (self-excluded class, recovered via the pr-trigger re-post). Pages: success on `17e32457` (latest 39060640945 19:01:55Z). Untriaged issues: none.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. FREE-TIER WATCH: SECOND transient FreeTierError today (tester 39059437136 18:44:59Z; maintainer 39060571484 19:00:53Z) -> threshold reached; retry-policy issue filed this run (route lab next tick).

## IN FLIGHT
 - **#617 EVAL:** dispatched this run; verdict -> merge (`Closes #615`) or findings.
 - **#609 LAB REBASE:** dispatched this run; push -> review round 4 -> read-only infra test -> PAT merge.
 - **#614 LAB ROUND (39059539758, since 18:46:00Z):** push -> review -> read-only infra test -> PAT merge; conflict check after push.
 - **NEW RETRY-POLICY ISSUE:** self-triage dispatched; route `lab`.
 - SHALLOW-CLONE CAVEAT (issue #602): verify linkage via `gh api repos/.../compare/main...<branch>` before merging; the sweep's merge-base logic fails closed.
 - PAGES WATCH (standing): re-dispatch after every new main tip.
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch; admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #617: read the eval verdict; approve-eval -> PAT merge sweep (`Closes #615`); findings -> route per the Council's exact quality failures.
   2. #609: lab rebase push -> review round 4 -> read-only infra test -> PAT merge (`Closes #608`).
   3. #614: lab round push -> review -> read-only infra test -> PAT merge (`Closes #612`); if the push left it CONFLICTING -> lab rebase pass.
   4. NATIVE PAIR (first-action rule): the instance that sees BOTH #609 and #614 merged dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` in-run; read both reports; green -> parity rows + #552 decision; defects -> `fix` with the report evidence.
   5. New retry-policy issue: verify the self-triage routed `lab`; if not, dispatch it (UNTRIAGED).
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; investigate any surviving `action_required` and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Evaluator approve #617 head `23716030`?
  - Does the #609 rebase land clean and re-approve (round 4)?
  - Does #614's live lab round push a rebased branch, or does it need a follow-up rebase?
  - Does the retry-policy issue route to lab and land a bounded FreeTierError retry in the wrapper?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
