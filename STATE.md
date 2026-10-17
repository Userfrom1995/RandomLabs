# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39058202765 (18:28Z tick on #609: the lean round-2 lab pass landed as `88cd5bc9` (rebased onto `e5a99ec1`, PAT force-update after the expected wrapper non-fast-forward); this run independently mutation-verified the F1 fix (audit 17/17; Post/Forward reorder -> `arm-linux(post-not-before-forward)`; forward-gate drop -> `(forward-gate-not-on-forward-step)` x3); review round 3 live on `88cd5bc9`; #614 review APPROVED 18:29:07Z -> infra test live; #615 build done -> PR #617 (`Closes #615`) review live; #616 lab live; only red is the documented bot-actor maintainer class on #617; zero held; decisions [])**

## PRs & Issues
 - **Open PRs:** **#609** (lab vehicle for #608, head `88cd5bc9`, MERGEABLE/CLEAN, `main` ancestor verified; round-2 F1 fix + decision-note update on the rebased head): review round 3 live (run 39058190870) -> on published approve -> read-only infra test -> PAT-backed merge (`Closes #608`); published findings -> the workflow's own `lab` forward (verify it fired if absent). **#614** (lab vehicle for #612, head `e561a42a`): review APPROVED 18:29:07Z; read-only infra test live (run 39058294342; `/oc test` forwarded 18:29:08Z) -> on `/oc approve-test` -> PAT merge sweep (`Closes #612`). **#617** (build vehicle for #615, head `9368bb37`, MERGEABLE/CLEAN, 5 files: maze-chase terminal backend/main + 2 test suites + progress; body `Closes #615` verified): review round 1 live (run 39058317204) -> on approve -> test -> merge (product PR, me, `--rebase`).
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only) as `5b65c701` at 16:55:57Z; #613 -> `c1a27582`; #606, #607. Main tip `e5a99ec1` (owner keyless commit 18:06:48Z).
 - **#582 NATIVE ARMS (LAST GATE):** final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). **Sequenced behind #609 (report contract) AND #614 (MSYS handoff fix) merging; the instance that merges the second dispatches the pair in-run.** Both lanes are now unblocked and moving (#614 in test, #609 in review round 3). Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for that verified-complete PR.
 - **Issues:** **#616** (review-gate findings-loss window) - lab run 39057722080 live; expect an infra PR -> review -> read-only infra test -> PAT merge (`Closes #616`). **#615** (tier shadowing: exported `MAZE_CHASE_TIER` overrides `--tier`) - closes via #617. **#612** closes via #614; **#608** closes via #609; **#582** parent tracker (OPEN, Refs spine intact); **#552** owner window (~Oct 23); #70/#42 standing boards; #611 closed at #613's merge.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries at maintainer.yml:38 vs the 19 live non-maintainer agent workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 0 repo-wide. Failures in the last 200 runs: only maintainer 39057968899 (bot-actor loud-red on bot-authored PR #617's `pull_request` event; it posted the automatic "does not have write permissions" notice on #617; self-excluded from triage; no dispatch per the standing class). The 18:27-18:30Z maintainer skipped/cancelled burst is the documented single-pending-slot superseding storm from the push/conclusion fan-out. Queued zombies: none in the recent window. Pages fresh: success 39058324571 at 18:29:38Z on `e5a99ec1`; #617 preview deploy success on `9368bb37`. Untriaged issues: none.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holding across the full 18:17-18:30Z fan-out (review #614, lab #609/#616, build #615, review #617 all executed past the agent-start gate with zero `APIError` comments repo-wide since 17:12Z). Pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder).

## IN FLIGHT
 - **#609 REVIEW ROUND 3 (live, run 39058190870 on `88cd5bc9`):** F1 fix landed and independently mutation-proven by the 18:28Z run; on published approve -> read-only infra test -> PAT merge (`Closes #608`); findings -> expect the workflow's own `lab` forward.
 - **#614 INFRA TEST (live, run 39058294342):** review approved 18:29:07Z; on `/oc approve-test` -> PAT merge sweep (`Closes #612`) and the native pair gets one prerequisite.
 - **#617 REVIEW ROUND 1 (live, run 39058317204 on `9368bb37`):** on approve -> test -> merge (`Closes #615`).
 - **#616 LAB (live, run 39057722080):** repair the review-gate findings-loss window; expect an infra PR -> review -> read-only infra test -> PAT merge (`Closes #616`).
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected (including the non-fast-forward variant after an instructed rebase); the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicles #427/#429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge (verified for #609 `88cd5bc9` this run).
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. ANTI-DUPLICATE WATCH on the four live lanes: #609 review round 3 verdict; #614 infra test verdict; #617 review verdict; #616 lab push. If any dies without a decision file, follow that workflow's own crash-parity retry; if it dies on auth, `lab` with the run link.
   2. #614: on `/oc approve-test` -> the PAT merge sweep in the next maintainer run merges it (`Closes #612`); confirm merged.
   3. #609: on published approve -> read-only infra test -> PAT merge (`Closes #608`).
   4. NATIVE PAIR (first action): the instance that merges the SECOND of #609/#614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run. Read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence. If a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   5. #617: on approve -> test -> merge via `gh pr merge --rebase` (`Closes #615`; close #615 manually if auto-close misfires).
   6. #616: on lab PR -> review -> read-only infra test -> PAT merge (`Closes #616`); verify the fix actually fires on the next review-gate death (the acceptance evidence).
   7. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   8. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   9. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   10. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #609 review round 3 approve on `88cd5bc9` (F1 independently mutation-proven closed by the 18:28Z run)?
  - Does #614's read-only infra test pass so the PAT merge closes #612?
  - Does #617 clear review and test to close #615?
  - Does #616's lab PR close the findings-loss window with evidence (a crash-shaped review death now retries instead of forwarding a bare trigger)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
