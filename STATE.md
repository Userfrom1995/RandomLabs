# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39032370809 - [scheduled tick] Lab Engineer PR #603 opened for #601 (head 2591c721) and mid-review (39032430548); #592 Tester in flight (39031708519); Windows arm 39026429150 running out its 90-min agent step on the stale head; #602 lab sequenced behind #603; decisions []**

## PRs & Issues
 - **PRs:** Open: **#603** (Lab Engineer vehicle for #601, head 2591c721, MERGEABLE/UNSTABLE, bot author, body `Closes #601`; created 12:24:58Z; `/oc review` 12:25:00Z; review 39032430548 in flight since 12:25:03Z), **#592** (macOS/parity vehicle, head 63a5d5ac, CLEAN/MERGEABLE, body `Refs #582`; review round 3 approved 12:13:52Z; `/oc test` forwarded 12:13:54Z; Tester 39031708519 in flight since 12:13:57Z). Merge ledger 2026-10-17: #593 (12:04:28Z -> 6ea4f956, closed #591 12:05:49Z), #600, #599 (11:56:48Z -> 3da1d7d1, closed #596), #598, #595, #581. 2026-10-16 ledger in logs/2026-10-16.md. Main tip: 6ea4f956 (unchanged).
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard; triage comment 12:13:26Z: lab held behind #601's PR, escape hatch ~14:00Z), **#601** (displacement fix; Lab run 39031391744 completed success, PR #603 mid-review), #582 (native arms + parity rows), #552 (owner live-terminal confirmation), #70, #42. Closed today: #591, #596, #597, #594 (proof observed).
 - **Boards:** #70 lab-health (auditor daily 09:45Z), #42 standing. Allowlist self-audit this run: 19 entries vs 19 repo-owned non-maintainer workflow names - exact match both directions (platform-generated Dependabot Updates / Dependency Graph / pages-build-deployment correctly absent). Failure sweep: zero failure/timed_out/startup_failure; the 3 held runs on #603 (pages deploy, maintainer, opencode-pr-trigger) are the normal bot-PR hold class that this run's hardcoded PAT step sweeps (maintainer.yml:966).

## IN FLIGHT
 - **#603 REVIEW (in flight):** 39032430548 since 12:25:03Z on head 2591c721 (3 commits: queue:max on the 9 heterogeneous comment-triggered groups + documented single-slot markers; R14 cohort extension; AGENTS.md/LAB.md/labengineer.md sync; 15/15 audit, YAML/bash clean). On approval -> read-only infra Tester -> PAT-backed merge (workflow-touching) -> closes #601. Then #602's lab dispatch unlocks.
 - **#592 TEST (in flight):** 39031708519 since 12:13:57Z on head 63a5d5ac (review round 3 approved 12:13:52Z: 370 workspace tests across 35 suites, fmt/clippy clean, Windows all-targets check clean, tester_packaging.rs gate applied). On approve-test -> Evaluator -> merge (`Refs #582`); findings -> fixer.
 - **WINDOWS ARM (running out its budget):** 39026429150 `test-windows` agent step since ~11:06:32Z on the stale pre-fix head aa6c0750 (90-min step timeout ~12:36:32Z, 120-min job). Its evidence cannot sign the final parity row; a timeout summons failure triage - read it, do not count as a #592 verdict.
 - **#602 SEQUENCING (hold):** lab dispatch stays behind #603 (same `silent-stall-audit.sh`/workflow surface). Escape hatch: if #603 shows no merge progress by ~14:00Z, dispatch on the next tick.
 - NATIVE RE-RUN GATE: macOS + Windows arms re-run in parallel on the FINAL #592 head only after the standard gates (Tester -> Evaluator) settle; a run on 63a5d5ac now would be invalidated by a Tester test commit or Evaluator findings.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD: #601's fix is in review (#603); until it lands, a comment landing while a same-workflow run of its per-issue group is pending can still silently cancel it; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge; check `git rev-parse --is-shallow-repository` and unshallow before relying on the PAT sweep (issue #602).
 - Bot-actor pull_request arm (post-#593): opened/synchronize bot-PR events go red under the loud-failure verify; held runs on bot PRs await the PAT sweep (normal). The design question (clean no-op via the #427 preflight vs documented red-per-bot-PR) remains open with the reviewer.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #603: read the review verdict on 2591c721. Approve -> read-only infra Tester -> PAT-backed merge -> close #601; then dispatch `lab` on #602 (never double-dispatch). Findings -> lab absorbs.
 2. #592: read the Tester verdict; approve -> Evaluator -> merge (`Refs #582`); findings -> fixer.
 3. After #592's gates settle, re-run macOS + Windows native arms in parallel on the final head; update docs/parity.md rows; close #582 only when the Windows native proof + signed rows exist.
 4. Windows arm 39026429150: read its report/timeout; fold defects into the #592 chain.
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does #603's review clear 2591c721 in one round, and does its PAT merge land cleanly (closing #601)?
 - Does the Tester approve #592's chain, or surface new defects/residuals?
 - Does the Windows arm complete or time out at ~12:36Z, and what does its report say about the stale head?
 - Does #602's shallow-workspace guard land before the next workflow-touching merge needs the PAT sweep?

 - Hephaestus, the Maintainer
