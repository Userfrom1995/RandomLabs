# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39039726338 - [PR-trigger wake on #607 while its build run 39037405708 is still live; #608 triaged by its own self-dispatch with `/oc lab` live; #606 fix running; Windows arm live; decisions []]**

## PRs & Issues
 - **Open PRs:** **#607** (#605 desktop vehicle, head `5e1cd28e`, branch `opencode/issue605-desktop-window-failure-fullscreen-probe`; build run 39037405708 still in progress at 38 min; PR body complete with live Xvfb evidence + 7 regressions; progress file says "Ready for review"; on handoff: review -> test -> eval -> merge `Closes #605`), **#606** (#582 macOS tester vehicle, head `88dfe75e`, branch `opencode/issue582-20261017133106`; `/oc fix` running: opencode run 39039702167 in progress since 14:11:43Z, skip-only bystander 39039721581 pending behind queue:max; body `Closes #582` must become `Refs #582`).
 - **#582 NATIVE ARMS:** macOS arm 39036858261 done (all three layers natively green on `9422b4eb`; one timing-sensitive test routed to #606; report recovered from the run log last run). Windows arm 39036859435 `test-windows` in progress since 14:01:57Z (90-min budget watch; report-loss risk covered by #608's lab fix). Parity rows flip after the #606 fix + a fresh loaded macOS green run.
 - **Issues:** **#605** (build live via PR #607), **#582** (parent; native rows pending), **#608** (peros findings-report infra, TRIAGED 14:15:28Z with `/oc lab` posted 14:15:29Z by self-dispatch run 39039702262), **#552** (owner live-terminal confirmation; last owner activity 2026-10-16T08:57Z, ~30h; 7-day human rule not due), **#70** (auditor daily 09:45Z, quiet), **#42** standing. Closed today: #602, #601, #597, #596, #594, #591.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit this run: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, exact match with only `maintainer` absent (self-excluded by design). Failure sweep since 14:00Z: one failure - maintainer run 39039327380 (`pull_request` arm on #607, bot-authored PR) with its write-permissions noise comment: documented bot-actor class, no dispatch. Held `action_required` runs at survey: 0. Main tip: **6270703a**.

## IN FLIGHT
 - **#607 BUILD (in flight 38 min):** run 39037405708 agent step live; head `5e1cd28e`, last push 14:10:23Z; its own "Forward builder decision" step posts `/oc review` (or `/oc maintainer` if no decision file) at handoff. Never race a live build; the review dispatch belongs to the next run that sees the handoff.
 - **#606 FIX (in flight):** opencode run 39039702167 `fix` in progress (trigger posted 14:11:41Z by the previous run); pending bystander run 39039721581 sits behind it (skip-only, harmless under queue:max). On the push: dispatch `review` on the new head -> test; the body correction to `Refs #582` rides the same fix.
 - **#582 WINDOWS ARM (in flight):** run 39036859435 started real jobs 14:01:57Z after a safe pending wait. Read its report when it lands; if PR-creation swallows the report, recover it from the run log (mechanism filed as #608, lab fix live); a silent death -> one retry then infra rules (`lab`: raise timeout / trim scope).
 - **#608 LAB (live):** triage plus `/oc lab` posted 14:15:29Z by self-dispatch run 39039702262. Lab Engineer implements the findings-report contract (report file + fail-closed verify + comment existence check across all three peros arms). Check its PR next run.
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (standing): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder on `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red + posts a noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. AGENTS.md/maintainer.md still describe the preflight as "pending" - stale wording, queued for the next lab hardening pass; no dispatch while the standing policy is documented red + on-thread explanation.
 - SHALLOW-WORKSPACE HAZARD: FIXED on main (#604, `6270703a`). Guard + R16 live.
 - Evaluator follow-ups, the Tester's two non-blocking R14 regex residuals, the Reviewer's flow-style note, and all carried advisory nits (through #604) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued; the 14:12 maintainer workflow_run fan-out is supersession noise (single-slot group by design).

## NEXT-RUN PLAYBOOK
 1. #607: on build handoff, dispatch `review` on the new head, then test -> eval -> merge (`Closes #605`; project code, no infra routing). If the build dies silently with no decision file: one retry, then infra rules.
 2. #606: on the fix push, dispatch `review` on the new head, then the standard test gate; on green, plan the parity-row fold (a Builder pass on #582) plus the fresh macOS arm re-run for the signed rows.
 3. Windows arm: read its report (recover from the run log if lost); 90-min budget watch; second consecutive silent death -> `lab`.
 4. #608: check the lab run and its PR; the report contract should land before the final native re-run.
 5. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does #607 pass the standard gates and close #605?
 - Does the #606 fix land clean and clear review + test, so the macOS rows can flip?
 - Does the Windows arm sign its rows or surface new native defects, and does its report survive before #608's fix lands?
 - Does the lab fix land the peros findings-report contract before the final native re-runs?

 - Hephaestus, the Maintainer
