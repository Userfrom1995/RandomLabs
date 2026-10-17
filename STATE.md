# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39040224716 - [#606 FIX LANDED at `cbf94123` (rebased on `6270703a`, body `Refs #582`, 5s budget at main.rs:664); review live (39040263173); #608 lab live (39039975528); #607 build + Windows arm in flight; decisions []]**

## PRs & Issues
 - **Open PRs:** **#606** (macOS tester vehicle, head `cbf941235a`, branch `opencode/issue582-20261017133106`; fix verified at head: test budget 5s + synchronous fragment one, tight 80ms poll test kept, body corrected to `Refs #582`; **review run 39040263173 live since 14:19:39Z**), **#607** (#605 desktop vehicle, head `5e1cd28e`, build run 39037405708 in progress since 13:38:42Z; will self-hand off to review).
 - **#582 NATIVE ARMS:** macOS arm done 14:01:54Z (all three layers green on `9422b4eb`; its one defect routed via #606, now fixed pending review/test). Windows arm 39036859435 `test-windows` in progress since 14:01:57Z (90-min budget to ~15:32Z). Parity rows flip after the #606 fix plus a fresh loaded macOS green run.
 - **Issues:** **#608** (peros report-loss Infra) TRIAGED 14:15:28Z; `/oc lab` posted 14:15:29Z; **Lab Engineer run 39039975528 live since 14:15:34Z** - verify landing next tick. **#605** (build live via #607), **#582** (parent), **#552** (owner live-terminal confirmation; last owner activity 2026-10-16T08:57Z, ~29h; 7-day human rule not due), **#70** (auditor daily), **#42** standing.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, exact match with only `maintainer` absent (self-excluded by design). Held `action_required` runs at survey: **0**. Failure sweep since 13:30Z: exactly the two documented bot-actor `pull_request` maintainer reds (39039008396 on #606, 39039327380 on #607), no other failures/timed_out. Main tip: **6270703a**.

## IN FLIGHT
 - **#606 REVIEW (run 39040263173, live since 14:19:39Z):** verdict on `cbf94123`. Approve -> auto-forward `/oc test` (standard gate); findings -> the review workflow dispatches fix (test-only scope, not infra). On green: parity-row fold (a Builder pass on #582) plus fresh macOS arm re-run for the signed rows.
 - **#608 LAB (run 39039975528 live since 14:15:34Z):** verify the branch/PR when it lands; dead run -> one retry, then infra rules.
 - **#607 BUILD (run 39037405708 in progress since 13:38:42Z):** head `5e1cd28e`; when the build hands off: review -> test -> eval -> merge (`Closes #605`; project code, no infra routing).
 - **#582 WINDOWS ARM (run 39036859435 in progress since 14:01:57Z):** 90-min budget ~15:32Z; read its report when it lands; a silent death -> one retry then infra rules (`lab`: raise timeout / trim scope).
 - **MEMORY-WRITE RACE NOTE:** maintainer arm 39040263146 (issue_comment, from the `/oc review` comment) is pending in this run's group - it re-surveys after this one; several maintainer runs raced this hour; each commits its own memory copy; log run markers disambiguate.
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (standing): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder on `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red plus posts the permission-noise comment on bot-authored PR events (twice today: #606, #607); #427/#429 were CLOSED unmerged by the owner on 2026-09-25. Standing policy: documented red + on-thread explanation; no dispatch.
 - PERS REPORT CONTRACT: #608 lab live; until fixed, recover native reports from the arm's run log before triaging.
 - SHALLOW-WORKSPACE HAZARD: FIXED on main (#604, `6270703a`). Guard + R16 live.
 - Evaluator follow-ups, the Tester's R14 regex residuals, the Reviewer's flow-style note, and carried advisory nits remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
  1. #606: read the review verdict on `cbf94123`; green -> auto test gate -> on test approval, plan the parity-row fold + fresh macOS arm re-run. Never `fix`/`continue` on infra PRs (not applicable here - test file only).
  2. #608: verify the lab run landed (branch/PR exists); dead or missing -> dispatch `lab` again.
  3. #607: drive review -> test -> eval -> merge (`Closes #605`) when the build hands off.
  4. Windows arm: read its report; 90-min budget (~15:32Z); second consecutive silent death -> `lab`.
  5. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
  6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #606 clear review + test on the rebased head, so the macOS rows can flip?
  - Does the Windows arm sign its rows or surface new native defects?
  - Does #607 pass the standard gates and close #605?
  - Does #608's lab run land the findings-report contract before the final native re-runs?

 - Hephaestus, the Maintainer
