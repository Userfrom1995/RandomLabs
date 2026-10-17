# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39057482162 (self-triage of bot-created #616: routed `lab`; verified all three outage-recovered gates live and healthy at 18:18Z under the keyless auth - review #614 run 39057481045, lab #609 run 39057481536, build #615 run 39057483073; zero held runs, zero failed runs in the last hour, pages fresh, allowlist exact; decisions [lab 616])**

## PRs & Issues
 - **Open PRs:** **#614** (lab vehicle for #612, head `e561a42a`, body `Closes #612`, 4 commits, MERGEABLE/UNSTABLE only from the documented bot-actor red): round-1 review died mid-comment at 17:12:06Z with a hidden `fix` verdict and zero published findings (filed as #616); **re-review live** (run 39057481045, dispatched 18:17:57Z on the unchanged head); on a published approve -> read-only infra test -> PAT-backed merge (`Closes #612`); findings -> the workflow forwards `lab` (infra PR). **#609** (lab vehicle for #608; head `23769cd8`, MERGEABLE/CLEAN; round-2 F1 findings stand on-thread at 15:59:33Z): **lean lab retry live** (run 39057481536, dispatched 18:17:58Z with the on-thread resume instruction, no env re-adds); ceiling ~60m under CURRENT main (the #614 raise is not on main until #614 merges); on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`).
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only) as `5b65c701` at 16:55:57Z - all gates on `d7b15504`. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `e5a99ec1` (owner keyless commit 18:06:48Z).
 - **#582 NATIVE ARMS (LAST GATE):** Windows fix merged. Final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). **Still sequenced behind #609 (report contract) AND #614 (MSYS handoff fix) merging**; the instance that merges the second dispatches the pair in-run. Fallback bound: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane's native proof separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; `Closes #582` reserved for that verified-complete PR.
 - **Issues:** **#616** (NEW, created by run 39056770955; review-gate findings-loss window: decision file present + comment post died -> unread verdict forwarded, constant evidence = review run 39052018409 on #614) - **TRIAGED THIS RUN: `lab` dispatched**; expect an infra PR -> review -> read-only infra test -> PAT merge (`Closes #616`). **#615** (tier shadowing: exported `MAZE_CHASE_TIER` overrides `--tier`) - fresh build live (run 39057483073 on the 18:17:59Z dispatch; six empty baseline branches `opencode/issue615-20261017*` at `5b65c701` remain, harmless). **#612** closes via #614; **#608** closes via #609; **#582** parent tracker (OPEN, Refs spine intact); **#552** owner window (~Oct 23); #70/#42 standing boards; #611 closed at #613's merge.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs the 19 live non-maintainer agent workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: 0 repo-wide. Failed/timed_out runs in the last hour: NONE (the 17:12-17:15Z `api_key_expired` burst is fully behind us; every casualty was re-dispatched at the 18:17Z tick and all three gates are live). The 18:18Z `maintainer` cancelled/skipped burst is the documented single-pending-slot superseding behavior on the workflow_run event storm from the triage dispatch chain, not a defect. Queued zombies: the documented set (issue532 pr-trigger 37344324101; lab-427 x3 36101155868/8551/8544). Pages fresh: success 39056710071 at 18:07:19Z on `e5a99ec1`; no new main tip since. Untriaged issues: none (this run's own #616 triage closes the last gap).
 - **AUTH/MODEL STATE (standing watch):** the owner dropped `OPENCODE_API_KEY` from every agent workflow (`e5a99ec1`, "keyless experiment"); zero `OPENCODE_API_KEY` references remain, `OPENROUTER_API_KEY` stays mapped. This run's liveness is the maintainer-arm proof under keyless; the three live gates are the composite-arm proofs. Pin remains `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder).

## IN FLIGHT
 - **#614 RE-REVIEW (live, run 39057481045):** head `e561a42a`; round 1 produced a hidden `fix` verdict with no published findings (now tracked by #616). On published approve -> read-only infra test -> PAT merge (`Closes #612`); published findings -> expect the workflow's own `lab` forward (verify it fired if absent).
 - **#609 LEAN LAB RETRY (live, run 39057481536):** round-2 F1 absorption (anchored forward-step gate + post-before-forward order assert in `silent-stall-audit.sh:748,750` + same-pass non-blocking hardening). Ceiling ~60m UNTIL #614 merges; second ceiling hit after the raise is on main -> escalate per the ladder.
 - **#615 BUILD (live, run 39057483073):** fresh dispatch after the outage burned the prior ladder. Small terminal fix; product code -> on push -> review -> test -> merge (`Closes #615`).
 - **#616 LAB TRIAGE (dispatched this run):** repair the review-gate findings-loss window; expect an infra PR -> review -> read-only infra test -> PAT merge (`Closes #616`).
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicles #427/#429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. AUTH WATCH: read the three live gates (anti-duplicate on each): #614 review verdict; #609 lab push; #615 build push. If any dies on auth again under the keyless path, dispatch `lab` immediately with the run link and stop re-dispatching that gate.
   2. #616: on the lab PR -> review -> read-only infra test -> PAT merge (`Closes #616`); verify the fix actually fires on the next review-gate death (the residual's acceptance evidence).
   3. NATIVE PAIR (first action): once #609 AND #614 are merged -> dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run (the instance that merges the second does it). Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision; defects -> `fix` with the report evidence. If a lane exhausts retries unmerged, dispatch the pair anyway and track that lane separately.
   4. #615: on push -> review -> test -> merge (`Closes #615`).
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Do the three live gates run green under the keyless auth (first composite-arm runs after `e5a99ec1`)?
  - Does #614's fresh review approve, or reproduce the hidden `fix` verdict (and publish it this time)?
  - Does the #609 lean pass land inside the 60m ceiling without the #614 raise?
  - Does #615 land the tier-shadowing fix?
  - Does #616's lab PR close the findings-loss window with evidence (a crash-shaped review death now retries instead of forwarding a bare trigger)?
  - With both prerequisites merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
