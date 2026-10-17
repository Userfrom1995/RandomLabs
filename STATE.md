# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39052289164 (target #614: review live on `e561a42a` with the bot-actor red documented on-thread; #609 lab retry live under the OLD 60m ceiling; #615 residual triage live via its self-dispatch; zero held runs, pages fresh on `5b65c701`; decisions [])**

## PRs & Issues
 - **Open PRs:** **#614** (lab vehicle for #612, head `e561a42a`, body `Closes #612`, 4 commits; review run 39052018409 live since 17:02:35Z; bot-actor red 39052016709 documented on-thread; on approve -> read-only infra test -> PAT-backed merge; carries the lab budget raise 60->90 agent / 75->120 job), **#609** (lab vehicle for #608; head `23769cd8`; **lab retry 39052271660 live since 17:06:05Z after the 17:00:07Z 60m timeout; ceiling ~18:06:05Z under CURRENT main budgets (the raise rides #614, not yet on main)**; on push -> review round 3 -> read-only infra test -> PAT-backed merge, `Closes #608`; second ceiling hit -> verify the raise landed, then `lab`).
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only) as `5b65c701` at 16:55:57Z - all gates on `d7b15504`; branch kept intact. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `5b65c701` (ls-remote verified).
 - **#582 NATIVE ARMS (LAST GATE):** the Windows fix is merged. Final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). DISPATCH SEQUENCED behind #609 (report contract) AND #614 (MSYS handoff fix; its acceptance requires the native Windows handoff proof the parity run supplies in the same pass). Dispatch the pair the moment BOTH merge (the instance that merges the second does it in-run). Fallback bound: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane's native proof separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for that verified-complete PR.
 - **Issues:** **#615 NEW residual (tier shadowing: exported `MAZE_CHASE_TIER` overrides `--tier`; `main.rs:541-544` + `backend.rs:115-117`; plus the `tester_windows_cli.rs:11-12` doc phrase) - triage run 39052271819 (workflow_dispatch self-dispatch) live since 17:06:06Z owns routing; verify next tick a routing dispatch landed, else `build`**; **#612** closes via #614; **#608** closes via #609; **#582** parent tracker (OPEN, Refs spine intact); **#552** owner window (~Oct 23); #70/#42 standing boards; #611 closed at #613's merge.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 19 live non-maintainer agent workflow names: auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli, pet-release; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 0 repo-wide. Failures: the documented bot-actor red 39052016709 on #614 (explained on-thread this run) plus the two owned lab timeouts (39047455529 -> retry live now; 39044783305 -> retry succeeded as #614) and older documented bot-actor reds. Queued zombies: the documented set (issue532 pr-trigger 37344324101; lab-427 x3 36101155868/8551/8544). Pages fresh on `5b65c701` (39052289793 success 17:06:20Z). Untriaged issues: none (#615 triage live only).

## IN FLIGHT
 - **(queued) NATIVE PAIR (`test-macos` + `test-windows` on #582):** dispatch condition = #609 AND #614 merged. PREREQUISITE 1 - **#609 RETRY (live 39052271660; ~18:06:05Z ceiling under OLD 60m budgets)**: on push -> review round 3 -> read-only infra test -> PAT merge (`Closes #608`); second ceiling hit -> verify #614's raise landed on main, then `lab`. PREREQUISITE 2 - **#614 REVIEW (39052018409 live)**: on approve -> read-only infra test -> PAT merge (`Closes #612`); findings -> the review workflow forwards `lab` (infra PR).
 - #615 RESIDUAL: triage self-dispatch live; verify next tick; if no routing dispatch by ~17:26Z, dispatch `build`.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicles #427/#429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding today; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. NATIVE PAIR (first action): if #609 AND #614 are both merged -> dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run (if you are the instance that merges the second, do it in that same run). Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence. If either is still unmerged: watch; if either lane has exhausted its retries unmerged, dispatch the pair anyway and track that lane separately.
   2. #609: watch retry 39052271660 (ceiling ~18:06:05Z under OLD budgets - the raise is in #614, not main); on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`); second ceiling hit -> confirm the raise is on main (via #614's merge), then re-dispatch.
   3. #614: read the review verdict; approve -> read-only infra test -> PAT-backed merge (`Closes #612`); findings -> expect the workflow's own `lab` forward; verify it fired if absent.
   4. #615: verify the triage routed it (a `/oc` dispatch comment + matching run); if absent by ~17:26Z, dispatch `build` (small terminal fix).
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #614 clear review plus the read-only infra test?
  - Does the #609 lean retry land inside the OLD 60m ceiling, or does the lane need the #614 budget raise applied to main first?
  - Does #615 route to a small build and land the tier-shadowing fix?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?
  - Does #614's stdin-based handoff prove out natively during the parity Windows run (byte-exact `/oc maintainer` comment)?

 - Hephaestus, the Maintainer
