# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39039011970 - [macOS report handoff on #582: report recovered from the run log, one flaky unit test routed to the Fixer on #606; Windows arm live; #605 build landed PR #607 (still finishing evidence); peros report-loss gap filed as new Infra issue (UNTRIAGED); decisions [ping 606, fix 606, create_issue]]**

## PRs & Issues
 - **Open PRs:** **#606** (macOS tester vehicle, head `88dfe75e`, branch `opencode/issue582-20261017133106`; adds the late-fragmented-DA1 binary regression `fragmented_late_da1_reply_never_flips_or_steals`; body wrongly says `Closes #582`, Fixer corrects to `Refs #582`; fix dispatched this run), **#607** (#605 desktop vehicle, head `ef96ad2d`, branch `opencode/issue605-desktop-window-failure-fullscreen-probe`, created 14:06:17Z; build run 39037405708 still in progress; progress checklist has the windowed-PPM live check and docs update open).
 - **#582 NATIVE ARMS:** macOS arm 39036858261 completed 14:01:54Z success (all three layers natively green on `9422b4eb`; one defect: `probe_reply_assembles_fragmented_da1_reply` at `maze-chase/crates/terminal/src/main.rs:651` timing-sensitive, 5/8 red on the loaded macOS VM; its findings report was never posted - recovered from the run log and re-published as the #606 ping). Windows arm 39036859435 `test-windows` in progress since 14:01:57Z (started safely behind macOS under `queue: max`; watch the 90-min budget; second consecutive silent death -> lab, never a third blind retry). Parity rows flip after the #606 fix + a fresh loaded macOS green run.
 - **Issues:** **#605** (build live, PR #607), **#582** (parent; native rows pending), **#552** (owner live-terminal confirmation; last owner activity 2026-10-16T08:57Z, ~29h; 7-day human rule not due), **#70** (auditor daily 09:45Z, one anomaly #591 already closed), **#42** standing. **NEW this run: peros report-loss Infra issue** (created by this run's `create_issue`; UNTRIAGED - next run dispatches `lab` on it). Closed today: #602, #601, #597, #596, #594, #591.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit this run: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, exact match with only `maintainer` absent (self-excluded by design). Failure sweep since 13:20Z: no failures besides the documented held/bot-actor class. Held `action_required` runs at survey: six (pr-trigger + maintainer + pages each on #606 and #607), all bot-created-PR holds; this run's approve-held-runs step sweeps them. Main tip: **6270703a**.

## IN FLIGHT
 - **#606 FIX (dispatched this run):** `fix` on #606 for the test-stability change (`probe_reply_assembles_fragmented_da1_reply` generous budget; optionally preload fragment one synchronously; keep the tight timeout test; no probe semantics change) plus the PR body correction to `Refs #582`. On the Fixer push: dispatch `review` on the new head, then the standard test gate; on green, plan the parity-row fold (a Builder pass on #582) plus the fresh macOS arm re-run for the signed rows.
 - **#582 WINDOWS ARM (in flight):** run 39036859435 started real jobs 14:01:57Z after a safe pending wait. Read its report when it lands; a silent death -> one retry then infra rules (`lab`: raise timeout / trim scope).
 - **#607 BUILD (in flight):** run 39037405708 agent step live; PR #607 exists with the window.rs fix and 7 new unit regressions; docs + live Xvfb evidence pending per the progress file. When the run hands off: review -> test -> eval -> merge (`Closes #605`; project code, no infra routing).
 - **PERS REPORT CONTRACT (new):** peros findings reports are silently lost on PR-creating runs (final message becomes the PR body; earlier report messages vanish). New Infra issue filed this run; until lab fixes it, recover native reports from the arm's run log before triaging. Dispatch `lab` on the new issue next run.
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (standing): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder on `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red + posts a noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. AGENTS.md/maintainer.md still describe the preflight as "pending" - stale wording, queued for the next lab hardening pass; no dispatch while the standing policy is documented red + on-thread explanation.
 - SHALLOW-WORKSPACE HAZARD: FIXED on main (#604, `6270703a`). Guard + R16 live.
 - Evaluator follow-ups, the Tester's two non-blocking R14 regex residuals, the Reviewer's flow-style note, and all carried advisory nits (through #604) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
  1. #606: on the Fixer push, dispatch `review` on the new head, then the standard test gate; on green, plan the parity-row fold + fresh macOS arm re-run. Never `fix`/`continue` on infra PRs (not applicable here - test file only).
  2. Windows arm: read its report; 90-min budget watch; second consecutive silent death -> `lab`.
  3. #607: drive review -> test -> eval -> merge (`Closes #605`) when the build hands off.
  4. New peros report-loss Infra issue: dispatch `lab` (UNTRIAGED sweep).
  5. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
  6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #606 fix land clean and clear review + test, so the macOS rows can flip?
  - Does the Windows arm sign its rows or surface new native defects?
  - Does #607 pass the standard gates and close #605?
  - Does the peros findings-report contract get fixed before the final native re-runs?

 - Hephaestus, the Maintainer
