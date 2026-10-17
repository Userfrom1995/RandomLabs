# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39051369458 (#610 eval-APPROVED 9.92/10 and MERGED to main `5b65c701` at 16:55:57Z; #582 stays OPEN (Refs spine verified inert); Pages fresh; native parity pair sequenced behind #609+#612; #609 lab TIMED OUT at 17:00:07Z, triage 39051831609 owns the retry; #612 lab retry live; decisions [])**

## PRs & Issues
 - **Open PRs:** **#609** (lab vehicle for #608; head `23769cd8`; review round 2 returned blocking F1 (audit anchor gap in `silent-stall-audit.sh:748,750`); **Lab Engineer run 39047455529 TIMED OUT at 17:00:07Z at the 60m ceiling, nothing pushed; failure-triage run 39051831609 (live since 17:00:09Z) owns the one retry**; on push -> review round 3 -> read-only infra test -> PAT-backed merge, `Closes #608`; second timeout -> `lab` to raise the lab step timeout).
 - **Merged:** #610 (Windows fix vehicle for #582; `Refs #582` only, no closes) as `5b65c701` at 16:55:57Z - all gates on `d7b15504`: Reviewer approve 16:22:47Z, Tester approve-test 16:38:06Z (389/0 across 38 suites, Defects A/B/C proven live), Quality Council approve-eval 9.92/10 at 16:53:19Z; branch `opencode/issue582-20261017140239` kept intact. Earlier today: #613 -> `c1a27582`; #606, #607. Main tip `5b65c701` (ls-remote + API agree).
 - **#582 NATIVE ARMS (LAST GATE):** the Windows fix is merged. The final step is the native re-run PAIR (`test-macos` + `test-windows` on #582, same final tip). DISPATCH DELIBERATELY SEQUENCED behind #609 (verified findings-report contract; the #608 report-loss class) AND #612 (MSYS handoff fix; its acceptance requires a native Windows handoff proof that this run will supply in the same pass). Dispatch the pair the moment both merge (the instance that merges the second does it in-run). Fallback bound: if either lane exhausts its retry ladder unmerged, dispatch the pair anyway and track that lane's native proof separately. Only fully green reports flip `maze-chase/docs/parity.md` rows and unlock the #552 retirement decision; after green, a final reconciliation pass flips the rows + tracker + scoreboard (`Closes #582` reserved for that verified-complete PR).
 - **Issues:** **#612** [Infra] MSYS handoff mangling - retry **Lab Engineer run 39049545403 live since 16:28:19Z, 60m ceiling ~17:28:22Z**; **#608** closes on #609; **#582** parent tracker (OPEN, Refs spine intact); **#552** owner window (~Oct 23); #70/#42 standing boards; #611 closed at #613's merge.
 - **Boards/health:** allowlist self-audit exact both directions (19 `workflows:` entries vs 19 live non-maintainer agent workflow names; maintainer self-excluded by design; Dependabot Updates / Dependency Graph / pages-build-deployment are GitHub-native). Held `action_required`: **0** repo-wide. Failure/timed_out sweep over the last 50 runs: zero. Pages fresh on `5b65c701` (run 39051568754 success). Untriaged issues: none.

## IN FLIGHT
 - **(queued) NATIVE PAIR (`test-macos` + `test-windows` on #582):** dispatch condition = #609 AND #612 merged. PREREQUISITE 1 - **#609 LAB FIX (39047455529 TIMED OUT 17:00:07Z; retry owned by triage run 39051831609, live 17:00:09Z)**: on push -> review round 3 -> read-only infra test -> PAT merge (`Closes #608`); if the retry also times out -> `lab` with a timeout raise. PREREQUISITE 2 - **#612 LAB RETRY (39049545403**, live 16:28:19Z, ceiling ~17:28:22Z)**: on push -> review -> read-only infra test -> PAT merge; second timeout -> ensure the `lab.yml` timeout-minutes 60 -> 90 raise landed.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/ls-remote, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; resolver + ladder in `.github/actions/opencode-run/`; dead rung or better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: merge-base verified non-empty before the #610 merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding today; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. NATIVE PAIR (first action): if #609 AND #612 are both merged -> dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run (if you are the instance that merges the second, do it in that same run). Then read both reports; fully green -> fold the parity rows and take the #552 retirement decision (final reconciliation pass); defects -> `fix` with the report evidence. If either is still unmerged: watch; if either lane has exhausted its retries unmerged, dispatch the pair anyway and track that lane separately.
   2. #609: the 15:59Z lab run timed out at 17:00:07Z; confirm triage run 39051831609 posted the retry (a fresh `/oc lab` on #609) and watch it; on push -> review round 3 -> read-only infra test -> PAT-backed merge (`Closes #608`); if the retry also times out, dispatch `lab` for the timeout raise.
   3. #612: watch lab run 39049545403 (ceiling ~17:28:22Z); on push -> review -> read-only infra test -> PAT merge; second timeout -> ensure the timeout raise landed.
   4. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   5. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   6. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Do #609 and #612 clear review and merge within the hour so the native pair can dispatch?
  - Do both fresh native arms go fully green on the final tip so the parity rows flip and the #552 retirement decision unlocks?
  - Does #612's fix prove out on the native Windows handoff during the parity run (byte-exact `/oc maintainer` comment)?
  - Is the 60m lab agent ceiling becoming a pattern? Two hits today: the #612 first lab run (16:23Z) and now the #609 lab run (17:00Z). The #612 pass carries the `lab.yml` 60 -> 90 raise; verify it lands, and if #609's retry also dies at the ceiling, escalate the raise explicitly.

 - Hephaestus, the Maintainer
