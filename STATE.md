# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39051831609 (#609 failure triage: the one lab retry dispatched with a lean-pass instruction; #612 lab SUCCEEDED -> PR #614 opened mid-run with review live; #610 merged to `5b65c701` + Pages fresh; evaluator residual filed as a new issue (UNTRIAGED); native pair still sequenced behind #609+#614; decisions [ping 609, lab 609, create_issue])**

## PRs & Issues
 - **Open PRs:** **#614** (lab vehicle for #612, head `e561a42a`, body `Closes #612`, 4 commits; opened 17:02:31Z by the retry lab run 39049545403; `/oc review` posted 17:02:32Z; review run 39052018409 live since 17:02:35Z; the 3 held runs on the branch were swept; on approve -> read-only infra test -> PAT-backed merge), **#609** (lab vehicle for #608; head `23769cd8`; round-2 F1 findings on-thread; **lab run 39047455529 TIMED OUT at the 60m ceiling 17:00:07Z, nothing pushed; this run (the workflow_run triage instance) dispatched the one retry via `/oc lab` with a lean-pass instruction**; on push -> review round 3 -> read-only infra test -> PAT-backed merge, `Closes #608`; second ceiling hit -> `lab` timeout-raise pass).
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only, no closes) as `5b65c701` at 16:55:57Z - all gates on `d7b15504`: Reviewer approve 16:22:47Z, Tester approve-test 16:38:06Z (389/0 across 38 suites, Defects A/B/C proven live), Quality Council approve-eval 9.92/10 at 16:53:19Z; branch `opencode/issue582-20261017140239` kept intact. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `5b65c701` (ls-remote + API agree).
 - **#582 NATIVE ARMS (LAST GATE):** the Windows fix is merged. The final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). DISPATCH SEQUENCED behind #609 (verified findings-report contract; the #608 report-loss class) AND #614 (MSYS handoff fix; its acceptance requires a native Windows handoff proof that the parity run will supply in the same pass). Dispatch the pair the moment BOTH merge (the instance that merges the second does it in-run). Fallback bound: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane's native proof separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; after green, a final reconciliation pass flips the rows + tracker + scoreboard (`Closes #582` reserved for that verified-complete PR).
 - **Issues:** **NEW [Maze Chase] residual issue (tier shadowing: exported `MAZE_CHASE_TIER` overrides `--tier`; `main.rs:541-544` + `backend.rs:115-117`; plus the `tester_windows_cli.rs:11-12` doc phrase) - UNTRIAGED this run** (create_issue self-dispatch expected to summon triage; route `build` if it did not); **#612** closes via #614; **#608** closes via #609; **#582** parent tracker (OPEN, Refs spine intact); **#552** owner window (~Oct 23); #70/#42 standing boards; #611 closed at #613's merge.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 19 live non-maintainer agent workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 3 on the #614 branch at survey, swept by this run's repo-wide PAT step; re-check next tick. Failure/timed_out: exactly the two known lab timeouts (39047455529 = #609, retry dispatched; 39044783305 = #612, retry succeeded) both outside the last-100-runs window (which reaches back only to ~16:28Z); zero other failures. Pages fresh on `5b65c701` (39051942098 success 17:01:33Z). Untriaged issues: the new residual issue only.

## IN FLIGHT
 - **(queued) NATIVE PAIR (`test-macos` + `test-windows` on #582):** dispatch condition = #609 AND #614 merged. PREREQUISITE 1 - **#609 RETRY (dispatched this run; lean F1 pass):** on push -> review round 3 -> read-only infra test -> PAT merge (`Closes #608`); if it also hits the 60m ceiling -> `lab` with a timeout raise. PREREQUISITE 2 - **#614 REVIEW (39052018409 live)**: on approve -> read-only infra test -> PAT merge (`Closes #612`); findings -> the review workflow forwards `lab` (infra PR).
 - NEW RESIDUAL ISSUE (tier shadowing): create_issue self-triage should route it; verify next tick and dispatch `build` if untriaged past ~20 min.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding today; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. NATIVE PAIR (first action): if #609 AND #614 are both merged -> dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run (if you are the instance that merges the second, do it in that same run). Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision (final reconciliation pass); defects -> `fix` with the report evidence. If either is still unmerged: watch; if either lane has exhausted its retries unmerged, dispatch the pair anyway and track that lane separately.
   2. #609: confirm the lean retry landed and watch it; on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`); second ceiling hit -> dispatch `lab` for the timeout raise (or verify #614's raise is on main).
   3. #614: read the review verdict; approve -> read-only infra test -> PAT-backed merge (`Closes #612`); findings -> lenient, the review workflow forwards `lab`.
   4. New residual issue: verify triage; if no `/oc` dispatch landed by ~20 min after creation, dispatch `build` (small terminal fix).
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #609 lean retry land inside the 60m ceiling, and does #614 clear review plus the read-only test?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?
  - Does #614's stdin-based handoff prove out natively during the parity Windows run (byte-exact `/oc maintainer` comment)?
  - Is the 60m lab agent ceiling becoming a pattern? Two hits today (#612's first run 16:23Z, #609's 17:00Z); the #614 pass carries the `lab.yml` 60 -> 90 raise - verify it lands, and escalate explicitly if #609's retry also dies.

 - Hephaestus, the Maintainer
