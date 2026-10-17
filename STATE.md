# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39033239953 - [failure-triage: Windows arm 39026429150 fail-closed 90-min timeout on the stale head, already explained on #592; #592 Evaluator dispatched by the concurrent session (eval 39033368988 live); #603 lab fix round in flight on the 3 review findings; decisions []]**

## PRs & Issues
 - **PRs:** Open: **#603** (Lab Engineer vehicle for #601, head 2591c721, MERGEABLE/UNSTABLE, bot author, body `Closes #601`; review round 1 returned FIX 12:36:01Z with three small findings [missing PR-body skills line + wording; `wf_concurrency_block` awk column-0 comment leak at `.github/scripts/silent-stall-audit.sh:449`; `.yaml` discovery gap at `:497`] + two non-blocking notes; `/oc lab` posted 12:36:03Z; Lab Engineer 39033171081 in progress since 12:36:06Z), **#592** (macOS/parity vehicle, head **4ed7b50c** = Tester-approved head [two test-only tester commits on 63a5d5ac]; Tester `/oc approve-test` 12:32:55Z; `/oc eval` posted 12:39:07Z by the concurrent maintainer session; eval 39033368988 in progress since 12:39:12Z; body `Refs #582`; CLEAN/MERGEABLE). Merge ledger 2026-10-17: #593 (12:04:28Z -> 6ea4f956, closed #591), #600, #599 (11:56:48Z -> 3da1d7d1, closed #596), #598, #595, #581. Main tip: **6ea4f956** (unchanged).
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard; lab held behind #603's PR, escape hatch ~14:00Z), **#601** (#603 mid-fix-round), **#582** (native arms + parity rows), **#552** (owner live-terminal confirmation), #70, #42. Closed today: #591, #596, #597, #594.
 - **Boards:** #70 lab-health (auditor daily 09:45Z done), #42 standing. Allowlist self-audit this run: 19 entries vs 19 repo-owned non-maintainer workflow names - exact match both directions (platform Dependabot/Dependency Graph/pages-build-deployment correctly absent). Failure sweep today: Windows arm timeout 39026429150 (this notification), bot-actor red 39032429418 on #603 (known class, explained 12:33Z), #599-branch trio 11:50:57Z (opencode-pr-trigger/Pages/tor-cli; PR merged 11:56:48Z - moot). Held action_required runs: 0.

## IN FLIGHT
 - **#592 EVAL (in flight):** 39033368988 since 12:39:12Z on reviewed+tested head 4ed7b50c. On approve-eval -> maintainer merge (`Refs #582`, rebase, keep branch) -> then dispatch native macOS + Windows re-runs in parallel on the final head. On findings -> fixer -> re-test -> re-eval.
 - **#603 LAB FIX ROUND (in flight):** 39033171081 since 12:36:06Z absorbing the three review findings (all small: PR-body skills line + backstop wording; awk column-0 comment leak at :449; `*.yaml` glob at :497). On push -> review re-triggers -> read-only infra Tester -> PAT-backed merge -> closes #601. Then #602's lab dispatch unlocks.
 - **NATIVE RE-RUN GATE:** macOS + Windows arms re-run in parallel on the FINAL #592 head only after the Evaluator settles (a run now would be invalidated by Evaluator findings; `/oc eval` is already live). The cfg(unix) compile gate is verified landed at 4ed7b50c, so the Windows test-tree compile is unblocked.
 - **WINDOWS TIMEOUT WATCH:** the stale-head arm died fail-closed at its 90-minute agent-step budget (12:37:06Z, `The action has timed out.`, no decision file). A repeat silent death on the FINAL head routes `lab` (raise timeout / trim the arm's E2E scope), never a third blind retry.
 - **#602 SEQUENCING (hold):** lab dispatch stays behind #603 (same `silent-stall-audit.sh`/workflow surface). Escape hatch: if #603 shows no merge progress by ~14:00Z, dispatch on the next tick.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD: #601's fix is mid-round (#603); until it lands, a comment landing while a same-workflow run of its per-issue group is pending can still be displaced; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge; check `git rev-parse --is-shallow-repository` and unshallow before relying on the PAT sweep (issue #602).
 - Bot-actor pull_request arm (post-#593): opened/synchronize bot-PR events go red under the loud-failure verify; held runs on bot PRs await the PAT sweep (normal). The design question (clean no-op via the #427 preflight vs documented red-per-bot-PR) remains open with the reviewer; explanation posted on #603.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #592: read the Evaluator verdict on 4ed7b50c. approve-eval -> merge (`Refs #582`, rebase, keep branch) -> dispatch `test-macos` + `test-windows` in parallel on the final head. Findings -> fixer -> re-test -> re-eval.
 2. #603: read the lab round's push and the review re-verdict; on approval -> read-only infra Tester -> PAT-backed merge -> close #601; then dispatch `lab` on #602 (never double-dispatch).
 3. Native arms: after the #592 standard gates settle, run macOS + Windows in parallel; watch the Windows arm against its 90-min budget; repeat silent death on the final head -> `lab` (timeout/scope), no third blind retry.
 4. #602: dispatch `lab` once #603 has landed (escape hatch ~14:00Z if #603 shows no merge progress).
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Evaluator approve #592 on 4ed7b50c, or return findings that move the head?
 - Does the #603 lab round clear all three review findings in one pass, and does its PAT merge land (closing #601)?
 - Will the Windows arm complete inside its 90-minute budget on the final head now that the cfg(unix) compile gate has landed?
 - Does #602's shallow-workspace guard land before the next workflow-touching merge needs the PAT sweep?

 - Hephaestus, the Maintainer
