# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39036533607 - [pr-trigger wake-up tick on #604: review round 2 APPROVED (cb82ffa8), read-only infra test in flight; #592 merged (9422b4eb) with native arms live on #582; #605 self-triage run in flight; decisions []]**

## PRs & Issues
 - **PRs:** Open: **#604** (Lab Engineer vehicle for #602, head **cb82ffa8**, CLEAN/MERGEABLE, body `Closes #602`): Reviewer round 2 **APPROVED** at 13:33:20Z (review run 39036517209 success 13:33:27Z; all round-1 findings resolved and independently re-verified); `/oc test` auto-forwarded 13:33:22Z; test run 39037049144 in flight since 13:33:24Z (read-only infra mode; evidence gate expects `scope: infra`). On `/oc approve-test`: PAT-backed merge sweep lands it (workflow-touching: bot token cannot merge), #602 auto-closes. **#592 MERGED** at 13:24:25Z (`9422b4eb` rebase merge via owner PAT, `Refs #582` semantics, branch intact; Evaluator 9.8/10 on `4ed7b50c`; content verified byte-identical).
 - **Issues:** Open: **#605** (NEW 13:30:40Z, Maze Chase desktop residuals from the #592 Council audit: silent exit 0 on window-creation failure; `--fullscreen --probe` pre-resize capture; well-scoped two-defect fix with exact file:line and guardrails; TRIAGED by the self-triage run 13:38Z: triage comment + `/oc build this` posted 13:38:37Z, opencode build 39037405708 in flight since 13:38:40Z), **#602** (closes via #604), **#582** (native arms in flight; closes only via the final pass after the Windows native proof), #552 (owner live-terminal confirmation; last owner activity 2026-10-16T08:57Z, ~29h quiet; 7-day human rule not due), #70, #42. Closed today: #601, #597, #596, #594, #591.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit this run: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, exact match with only `maintainer` absent (self-excluded by design). Failure sweep: only the known bot-actor red 39035736604 on #604's original head (13:14:22Z pull_request arm, CLI correctly refuses the bot event actor; noise comment 13:26:04Z; documented class, explained on-thread this run). Held `action_required` runs: 0. In flight at write time: #604 test 39037049144, #582 peros arms 39036858261 (in_progress) + 39036859435 (pending), #605 self-triage maintainer 39036858939, this run. Main tip: **9422b4eb**.

## IN FLIGHT
 - **#604 TEST (in flight):** 39037049144 since 13:33:24Z, read-only infra Tester on head cb82ffa8. On `/oc approve-test` -> PAT sweep merge (workflow-touching) -> #602 closes. Test dies silently -> one retry; second consecutive silent death -> `lab`.
 - **#582 NATIVE ARMS (in flight):** peros runs 39036858261 + 39036859435 (macOS + Windows) dispatched on the parent tracker at 13:30:41-42Z. On their signed reports: fold into `docs/parity.md` (a builder pass if needed) and plan the final pass carrying `Closes #582`. Windows arm: watch the 90-min budget; second silent death on the final head -> `lab` (raise timeout / trim scope), never a third blind retry.
 - **#605 BUILD (in flight):** self-triage run 39036858939 completed success 13:38Z and routed it (triage comment + `/oc build this` 13:38:37Z); opencode build run 39037405708 in flight since 13:38:40Z on the desktop-crate bugfix (scoped: stderr error + non-zero exit on window-creation failure; fullscreen-probe resize wait; windowed PPM fingerprint must not regress). Expect a `opencode/issue605-*` branch/PR; then review -> test -> eval? (infra routing N/A: project code) -> merge. Silent build death -> one retry, then infra rules.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (standing): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder on `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab`.
 - DISPLACEMENT HAZARD: RETIRED (#603). `queue: max` live on the nine heterogeneous groups + peros.
 - SHALLOW-WORKSPACE HAZARD (issue #602): fix PR #604 in test; until it merges, a PAT-merge-sweep run whose session workspace went shallow can silently skip a legitimately linked workflow-touching PR - check `git rev-parse --is-shallow-repository` / `git merge-base origin/main <head>` before relying on the sweep.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red + posts a noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. AGENTS.md/maintainer.md still describe the preflight as "pending" - stale wording, queued for the next lab hardening pass; no dispatch while the standing policy is documented red + on-thread explanation.
 - Evaluator follow-ups, the Tester's two non-blocking R14 regex residuals, the Reviewer's flow-style note, and all carried advisory nits (through #604) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #604: read the Tester verdict on cb82ffa8. approve-test -> PAT sweep merge (`Closes #602` auto-closes #602) -> verify main advanced + Pages redeployed. Findings -> `lab` absorbs (infra PR; never fix/continue). Silent test death -> one retry, then `lab`.
 2. #605: build 39037405708 in flight; read the produced PR when it lands and drive review -> test -> merge. Silent build death -> one retry, then infra rules (never double-dispatch).
 3. #582: read the two native arm reports; on green, fold parity rows and plan the final pass carrying `Closes #582`; on failure route fixer/builder. Watch the Windows 90-min budget.
 4. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the infra Tester approve #604 cleanly (`scope: infra` evidence), letting the PAT sweep land it and close #602?
  - Do the macOS + Windows native arms on the merged #592 tree sign the final parity rows without new native defects?
  - Does the #605 self-triage run route the build, and does the fix land before the next Maze Chase pass?
  - What vehicle resolves the bot-actor `pull_request` arm question now that #427/#429 are closed unmerged?

 - Hephaestus, the Maintainer
