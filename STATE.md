# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39039721456 - [#606 fix round live (Fixer run 39039702167); #608 triaged + `/oc lab` posted 14:15:29Z by its self-dispatch run; Windows arm in flight; #605 build advanced #607 to `5e1cd28e`; decisions []]**

## PRs & Issues
 - **Open PRs:** **#606** (macOS tester vehicle, head `88dfe75e`, branch `opencode/issue582-20261017133106`; fix in flight: test-budget adjustment at `maze-chase/crates/terminal/src/main.rs:651` plus body `Closes #582` -> `Refs #582`; Fixer run 39039702167 started 14:11:46Z, no push yet at 14:16Z), **#607** (#605 desktop vehicle, head `5e1cd28e` advanced from `ef96ad2d` (ls-remote-verified), build run 39037405708 still in progress; concurrent maintainer run 39039726338 in flight on it).
 - **#582 NATIVE ARMS:** macOS arm done 14:01:54Z (all three layers green on `9422b4eb`; one defect: timing-sensitive `probe_reply_assembles_fragmented_da1_reply`, fix via #606). Windows arm 39036859435 `test-windows` in progress since 14:01:57Z (90-min budget to ~15:32Z). Parity rows flip after the #606 fix plus a fresh loaded macOS green run.
 - **Issues:** **#608** (peros report-loss Infra issue, filed 14:11:42Z) TRIAGED 14:15:28Z by its create_issue self-dispatch run 39039702262 (completed success, triage comment posted); `/oc lab` posted 14:15:29Z - next tick verifies the lab run is live. **#605** (build live, PR #607), **#582** (parent), **#552** (owner live-terminal confirmation; last owner activity 2026-10-16T08:57Z, ~29h; 7-day human rule not due), **#70** (auditor daily), **#42** standing.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, exact match with only `maintainer` absent (self-excluded by design). Held `action_required` runs at survey: **0**. Failure sweep since 14:00Z: exactly the two documented bot-actor `pull_request` maintainer reds (39039008396 on #606, 39039327380 on #607), no other failures/timed_out. Main tip: **6270703a**.

## IN FLIGHT
 - **#606 FIX (run 39039702167, agent step live since 14:11:46Z):** test-stability change plus the PR-body correction on #606. On push: dispatch `review` on the new head, then the standard test gate; on green, plan the parity-row fold (a Builder pass on #582) plus the fresh macOS arm re-run for the signed rows. The permission-noise comment on #606 (14:12:03Z) was explained on-thread this run.
 - **#607 BUILD (run 39037405708 in progress) + MAINTAINER 39039726338 (in progress):** head advanced to `5e1cd28e`; when the build hands off: review -> test -> eval -> merge (`Closes #605`; project code, no infra routing). The concurrent maintainer run owns this lane this tick - re-survey before acting on it.
 - **#608 LAB (just dispatched):** `/oc lab` posted 14:15:29Z by the self-dispatch run; verify the lab run starts; dead run -> one retry, then infra rules.
 - **#582 WINDOWS ARM (in flight):** run 39036859435 started real jobs 14:01:57Z; read its report when it lands; a silent death -> one retry then infra rules (`lab`: raise timeout / trim scope).
 - **MEMORY-WRITE RACE NOTE:** three maintainer runs raced this tick (39039702262 on #608, this run on #606, 39039726338 on #607); each commits its own memory copy; log run markers disambiguate.
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (standing): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder on `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red plus posts the permission-noise comment on bot-authored PR events (twice today: #606, #607); #427/#429 were CLOSED unmerged by the owner on 2026-09-25. Standing policy: documented red + on-thread explanation; no dispatch.
 - PERS REPORT CONTRACT: #608 filed, triaged, `/oc lab` dispatched 14:15:29Z. Until fixed, recover native reports from the arm's run log before triaging.
 - SHALLOW-WORKSPACE HAZARD: FIXED on main (#604, `6270703a`). Guard + R16 live.
 - Evaluator follow-ups, the Tester's R14 regex residuals, the Reviewer's flow-style note, and carried advisory nits remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
  1. #606: on the Fixer push, dispatch `review` on the new head, then the standard test gate; on green, plan the parity-row fold + fresh macOS arm re-run. Never `fix`/`continue` on infra PRs (not applicable here - test file only).
  2. #608: verify the lab run is live (branch/PR exists); dead or missing -> dispatch `lab` again.
  3. #607: drive review -> test -> eval -> merge (`Closes #605`) when the build hands off; the concurrent maintainer run 39039726338 may have moved this lane - re-survey first.
  4. Windows arm: read its report; 90-min budget (~15:32Z); second consecutive silent death -> `lab`.
  5. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
  6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #606 fix land clean and clear review + test, so the macOS rows can flip?
  - Does the Windows arm sign its rows or surface new native defects?
  - Does #607 pass the standard gates and close #605?
  - Does #608's lab run land the findings-report contract before the final native re-runs?

 - Hephaestus, the Maintainer
