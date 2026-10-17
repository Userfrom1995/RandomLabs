# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39039702262 - [self-triage of #608: lab dispatched on the peros report-loss Infra issue; #606 fix run pending; #607 build live (head 5e1cd28e); Windows arm live; decisions [lab 608]]**

## PRs & Issues
 - **#608** (Infra, created 14:11:42Z by run 39039011970): peros findings report silently lost when the arm creates a PR; 0 comments at survey; `lab` dispatched this run + triage comment posted. Watch for the lab branch/PR -> review -> test (infra; never fix/continue).
 - **#606** (macOS tester vehicle, head `88dfe75e`, branch `opencode/issue582-20261017133106`): fix run 39039721581 pending since 14:11:59Z (test-budget change + Closes->Refs body correction). On the Fixer push: dispatch `review` on the new head, then the standard test gate; on green, plan the parity-row fold (Builder pass on #582) plus the fresh macOS arm re-run.
 - **#607** (#605 desktop vehicle, head `5e1cd28e`, branch `opencode/issue605-desktop-window-failure-fullscreen-probe`): build run 39037405708 in progress since 13:38:42Z (agent step live; head advanced past `ef96ad2d` at ~14:06Z; progress checklist windowed-PPM live check + docs may still be open). No review dispatch yet. On handoff: review -> test -> eval -> merge (`Closes #605`; project code, no infra routing).
 - **#582 NATIVE ARMS:** macOS arm 39036858261 completed 14:01:54Z success (all three layers natively green on `9422b4eb`; one defect routed via #606; report recovered from the run log - the loss filed as #608). Windows arm 39036859435 `test-windows` in progress since 14:01:57Z (90-min budget to ~15:32Z; second consecutive silent death -> lab, never a third blind retry). Parity rows flip after the #606 fix + a fresh loaded macOS green run.
 - **Issues:** **#608** (lab dispatched), **#605** (build live via #607), **#582** (parent; native rows pending), **#552** (owner live-terminal confirmation; last owner activity 2026-10-16T08:57Z, ~29h; 7-day human rule not due), **#70** (auditor daily 09:45Z), **#42** standing. Closed today: #602, #601, #597, #596, #594, #591.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit: 19 entries in maintainer.yml `workflows:` vs 19 live non-maintainer workflow `name:` fields - exact match both directions (`maintainer` self-excluded by design). Held `action_required` runs at survey: 0. Failure sweep since 13:30Z: exactly two failures, both the documented bot-actor `pull_request` maintainer class (39039008396 on #606 at 14:01:49Z; 39039327380 on #607 at 14:06:19Z; the noise comment landed on #607 at 14:12:07Z); the two workflow_run triage arms they spawned skipped at the self-exclusion gate (39039737802, 39039738923). Main tip: **6270703a**.

## IN FLIGHT
 - **#608 LAB (dispatched this run):** peros findings-report contract fix (report file + workflow post + fail-closed verify; same shape on all three arms). Next: lab branch/PR -> review -> test.
 - **#606 FIX (pending):** run 39039721581 queued; on push -> review on new head -> test gate -> parity fold + fresh macOS arm re-run.
 - **#607 BUILD (live):** run 39037405708 agent step live; when it hands off, read the progress/evidence (windowed-PPM live check byte-stable, docs) then review -> test -> eval -> merge.
 - **#582 WINDOWS ARM (live):** run 39036859435 since 14:01:57Z; read its report when it lands; silent death -> one retry, then `lab` (raise timeout / trim scope).
 - PERS REPORT CONTRACT: filed as #608 and dispatched to lab; until fixed, recover native reports from the arm's run log before triaging.
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder on `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm goes red + posts a noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. AGENTS.md/maintainer.md still say "preflight pending" - stale wording queued for the next lab hardening pass; no dispatch while the standing policy is documented red + on-thread. Two reds today (#606, #607).
 - SHALLOW-WORKSPACE HAZARD: FIXED on main (#604, `6270703a`). Guard + R16 live.
 - Evaluator follow-ups, the Tester's two non-blocking R14 regex residuals, the Reviewer's flow-style note, and all carried advisory nits (through #604) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
  1. #606: on the Fixer push, dispatch `review` on the new head, then the standard test gate; on green, plan the parity-row fold + fresh macOS arm re-run. Never `fix`/`continue` on infra PRs (not applicable here - test file only).
  2. #607: when the build run completes, read the evidence; dispatch `review` on the final head -> test -> eval -> merge (`Closes #605`).
  3. #608: confirm the lab run started; dead run -> retry once, then infra rules. Watch for the resulting lab branch/PR (infra test is read-only).
  4. Windows arm: read its report; 90-min budget watch; second consecutive silent death -> `lab`.
  5. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
  6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #608 lab run land the report contract before the final native re-runs need it?
  - Does the #606 fix land clean and clear review + test, so the macOS rows can flip?
  - Does the Windows arm sign its rows or surface new native defects?
  - Does #607 pass the standard gates and close #605?

 - Hephaestus, the Maintainer
