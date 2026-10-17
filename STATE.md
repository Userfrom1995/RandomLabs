# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39059718673 (`/oc maintainer` tick 18:48-18:55Z on the freshly opened #616 lab PR #618: review round 1 live; #609 cleared the read-only infra test at 18:50:48Z and its PAT merge sweep lands this run; #614 lab live; #617 tester retry live; zero held runs, allowlist exact, pages green, no untriaged issues)**

## PRs & Issues
 - **#618** (lab vehicle for #616, head `06e3ab2b`, 6 commits, `Closes #616`): opened 18:48:02Z by lab run 39057722080 - the publication-evidence gate for the review verdict (`review-comment-published.sh`, run-commit provenance, unpublished verdict discard + bounded auto-retry, R19 guard). `/oc review` 18:48:03Z -> review run 39059689600 LIVE since 18:48:05Z. UNSTABLE solely from the documented bot-actor red (39059688305, `pull_request` on this branch; CLI write-permission assert, no decision file, loud red by design; standard noise comment 18:48:35Z). On published approve -> read-only infra test -> PAT merge (`Closes #616`); published findings -> the workflow's own `lab` forward. Acceptance on merge: verify the gate fires on the next review-gate death. NOTE: if #609 merges first, this branch rebases/renumbers its R-strings (its own PR note anticipates it); churn owned by the lab lane.
 - **#609** (lab vehicle for #608, head `88cd5bc9`, CLEAN): read-only infra test PASSED and `/oc approve-test` published 18:50:48Z (audit R1-R17 17/0; 11-mutation matrix all red-as-expected; YAML + shell syntax clean; tree untouched); handoff `/oc maintainer` 18:50:49Z (sibling maintainer run exists for #609). PAT-backed merge sweep takes it after this session (`Closes #608` auto-closes). First native-pair prerequisite.
 - **#614** (lab vehicle for #612, head `e561a42a`, UNSTABLE from the documented bot-actor red): tester verdict 18:45:56Z = lab round required (R18 opt-out validation false-negative class); lab run 39059539758 LIVE since 18:46:00Z. On lab PR -> review -> read-only infra test -> PAT merge (`Closes #612`). Second native-pair prerequisite.
 - **#617** (product fix for #615, head `53af759c`, CLEAN): review round 2 approved 18:44:34Z; the forwarded tester died at the provider (`FreeTierError`) 18:44:59Z; retry dispatched 18:49:16/17Z; retry test run 39059779983 LIVE since 18:49:19Z. On approve-test -> `/oc eval` -> merge (`Closes #615`); second provider death -> `lab`, never a third test.
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only) as `5b65c701` at 16:55:57Z. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `e5a99ec1` (unchanged; owner keyless commit 18:06:48Z).
 - **#582 NATIVE ARMS (LAST GATE):** Windows fix merged. Final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). **Still sequenced behind #609 AND #614 merging**; the instance that merges the second dispatches the pair in-run. Fallback bound unchanged: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for the verified-complete PR.
 - **Issues:** #615 closes via #617; #612 via #614; #608 via #609; #616 via #618; #582 parent tracker (OPEN); #552 owner window (~Oct 23); #70/#42 standing boards. Untriaged issues: none (all eight open issues carry live lanes or tracked boards).
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 0 repo-wide. Failure sweep since 18:45Z: exactly TWO - the #617 tester FreeTierError crash (39059437136; retry in flight) and this PR's documented bot-actor maintainer red (39059688305). Pages: 39059716984 success 18:48:27Z on `e5a99ec1`.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. **FREE-TIER WATCH:** one transient `FreeTierError`/`AI_APICallError` (18:45Z, #617 tester); a SECOND provider death on any arm (including the live #617 retry) -> `lab` for a transient-error retry policy in the wrapper. No APIError comments repo-wide since 18:45Z besides that one.

## IN FLIGHT
 - **#618 REVIEW ROUND 1 (run 39059689600, since 18:48:05Z):** head `06e3ab2b`. Published approve -> read-only infra test -> PAT merge (`Closes #616`); published findings -> the workflow's own `lab` forward.
 - **#609 PAT MERGE (this run's sweep + the sibling #609 maintainer run):** head `88cd5bc9`, approve-test 18:50:48Z. Race expected: one sweep wins, the loser exits benignly. Then `Closes #608` auto-closes.
 - **#614 LAB ROUND (run 39059539758, since 18:46:00Z):** head `e561a42a`. Lab PR -> review -> read-only infra test -> PAT merge (`Closes #612`).
 - **#617 TEST RETRY (run 39059779983, since 18:49:19Z):** head `53af759c`. approve-test -> eval -> merge (`Closes #615`); second provider death -> `lab`.
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
   1. Confirm #609 merged + `Closes #608` closed + pages deployed on the new tip (bot merges emit no push event; else `gh workflow run pages.yml`). If the merge was skipped, read the sweep log for the reason.
   2. #618: review verdict -> approved -> read-only infra test -> PAT merge (`Closes #616`); findings -> expect the workflow's own `lab` forward. If the #609 merge made #618 CONFLICTING, dispatch `lab` for the rebase/renumber (its PR note anticipates R-string churn).
   3. #614: lab PR -> review -> read-only infra test -> PAT merge (`Closes #612`). The second native-pair prerequisite.
   4. NATIVE PAIR (first-action rule): the instance that merges the second of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run. Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence. If a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   5. #617: tester-retry verdict -> approve-test -> `/oc eval` -> merge (`Closes #615`); a second provider death -> `lab`, never a third test.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #609 PAT merge land cleanly (this run's sweep vs the sibling #609 run) and does #608 auto-close?
  - Does #618's review publish an approve before the #609 merge forces a rebase, and does the publication gate itself hold up under review?
  - Does #614's lab round close R18's false-negative class so the second native-pair prerequisite can merge?
  - Does the #617 tester retry survive the provider (second FreeTierError -> lab)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
