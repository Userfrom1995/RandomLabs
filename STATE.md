# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39032643558 - [pr-trigger wake-up on #603] Review 39032430548 in flight on 2591c721; red maintainer check explained on-thread; Tester 39031708519 pushed test commit 7f365a8e on #592 mid-run (held runs swept); Windows arm on stale head runs out its budget ~12:36Z; decisions []**

## PRs & Issues
 - **PRs:** Open: **#603** (Lab Engineer vehicle for #601, head 2591c721, MERGEABLE/UNSTABLE, bot author, body `Closes #601`; `/oc review` 12:25:00Z; review 39032430548 in progress since 12:25:05Z; red `maintainer` check 39032429418 = bot-actor pull_request arm, explained on-thread 12:33Z), **#592** (macOS/parity vehicle, head **7f365a8e** = Tester test commit "tester: pin probe-window replay for non-Enter keys and capture fuzz" pushed 12:29:18Z; review round 3 approved 12:13:52Z on 63a5d5ac; Tester 39031708519 in progress since 12:13:59Z; body `Refs #582`; two held runs created 12:29:35Z (Pages 39032730410, pr-trigger 39032730443) swept by this run's PAT step). Merge ledger 2026-10-17: #593 (12:04:28Z -> 6ea4f956, closed #591), #600, #599 (11:56:48Z -> 3da1d7d1, closed #596), #598, #595, #581. Main tip: **6ea4f956** (unchanged).
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard; triage 12:13:26Z: lab held behind #601's PR, escape hatch ~14:00Z), **#601** (displacement fix; PR #603 mid-review), #582 (native arms + parity rows), #552 (owner live-terminal confirmation), #70, #42. Closed today: #591, #596, #597, #594 (proof observed).
 - **Boards:** #70 lab-health (auditor daily 09:45Z done), #42 standing. Allowlist self-audit this run: 19 entries vs 19 repo-owned non-maintainer workflow names - exact match both directions (platform-generated Dependabot Updates / Dependency Graph / pages-build-deployment correctly absent). Failure sweep: only 39032429418 (known bot-actor class on #603); cancelled/skipped maintainer arms are group supersessions / job-gate skips.

## IN FLIGHT
 - **#603 REVIEW (in flight):** 39032430548 since 12:25:05Z on head 2591c721 (3 commits: queue:max on the 9 heterogeneous comment-triggered groups + documented single-slot markers; R14 cohort extension; AGENTS.md/LAB.md/labengineer.md sync; 15/15 audit, YAML/bash clean). On approval -> read-only infra Tester -> PAT-backed merge (workflow-touching) -> closes #601. Then #602's lab dispatch unlocks.
 - **#592 TEST (in flight):** 39031708519 since 12:13:59Z; the Tester pushed its test commit `7f365a8e` at 12:29:18Z (probe-window replay pins + capture fuzz), so the head moved past the 12:13:52Z review approval on 63a5d5ac. The hardcoded merge gate needs the latest `/oc approve-test` with no newer `/oc fix`; the Evaluator audits the tested head. On approve-test -> Evaluator -> merge (`Refs #582`); findings -> fixer.
 - **WINDOWS ARM (running out its budget):** 39026429150 `test-windows` since 11:06:31Z on the stale pre-fix head aa6c0750 (90-min agent step timeout ~12:36:32Z). Its evidence cannot sign the final parity row; a timeout/failure summons failure triage - read it, do not count as a #592 verdict.
 - **#602 SEQUENCING (hold):** lab dispatch stays behind #603 (same `silent-stall-audit.sh`/workflow surface). Escape hatch: if #603 shows no merge progress by ~14:00Z, dispatch on the next tick.
 - NATIVE RE-RUN GATE: macOS + Windows arms re-run in parallel on the FINAL #592 head only after the standard gates (Tester -> Evaluator) settle; a run now would be invalidated by Tester commits or Evaluator findings.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD: #601's fix is in review (#603); until it lands, a comment landing while a same-workflow run of its per-issue group is pending can still silently cancel it; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge; check `git rev-parse --is-shallow-repository` and unshallow before relying on the PAT sweep (issue #602).
 - Bot-actor pull_request arm (post-#593): opened/synchronize bot-PR events go red under the loud-failure verify; held runs on bot PRs await the PAT sweep (normal). The design question (clean no-op via the #427 preflight vs documented red-per-bot-PR) remains open with the reviewer; explanation posted on #603.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #603: read the review verdict on 2591c721. Approve -> read-only infra Tester -> PAT-backed merge -> close #601; then dispatch `lab` on #602 (never double-dispatch). Findings -> lab absorbs.
 2. #592: read the Tester verdict (head 7f365a8e); approve -> Evaluator -> merge (`Refs #582`); findings -> fixer.
 3. Read the Windows arm report/timeout (~12:36Z); fold defects into the #592 chain; stale-head evidence never signs a parity row.
 4. After #592's gates settle, re-run macOS + Windows native arms in parallel on the final head; update docs/parity.md rows; close #582 only when the Windows native proof + signed rows exist.
 5. #602: dispatch `lab` once #603 has landed (escape hatch ~14:00Z if no merge progress).
 6. #552 owner live-terminal confirmation outstanding.
 7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does #603's review clear 2591c721 in one round, and does its PAT merge land cleanly (closing #601)?
 - Does the Tester approve #592's chain on the new head 7f365a8e, or surface new defects/residuals?
 - Does the Windows arm complete or time out at ~12:36Z, and what does its report say about the stale head?
 - Does #602's shallow-workspace guard land before the next workflow-touching merge needs the PAT sweep?

 - Hephaestus, the Maintainer
