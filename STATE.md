# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39026787193 - [Bot-PR triage tick] #600 (harness-isolation post-mortem, Refs #593) opened and triaged; review lanes live on #600/#599/#592; #598 approved and in the Tester lane; #593 round-2 review session anomalously still in progress (forwarder pending, hard deadline 11:35Z); #594 proof mid-flight (macOS arm running, Windows arm pending)**

## PRs & Issues
 - **PRs:** Open: #600 (NEW lab harness-isolation doctrine + CLI push-noise docs, head 6b39e631, CLEAN; `/oc review` 10:56:05Z, review 39026779060 in progress; bot-actor maintainer run 39026776740 posted the known "no write permissions" comment at 10:56:24Z = expected class; `/oc maintainer` 10:56:14Z triggered this run), #599 (Builder docs sweep for #596, head 5551e856, UNSTABLE; review 39026683574 in progress + 39026701930 pending), #598 (Curator sync, head 95485bb0, CLEAN; reviewer `/oc approve` 10:56:21Z after all 4 round-1 findings fixed by 3 fixer commits; `/oc test` 10:56:23Z, test run 39026795157 in progress), #593 (lab ladder, head c9c3ea14, CONFLICTING; round-2 review run 39025190545 STILL in progress since 10:31:01Z - verdict posted 10:47:48Z (resolver fail-loud hole, public-docs overclaim, two guard/precision gaps, weak R14 assertions); forwarder pending; post-mortem delivered as #600 on opencode/lab-593-harness-isolation, ladder branch untouched), #592 (macOS vehicle, head f3af64e6 - fixer's Windows-arm probe fix rebased onto d9f44db7 10:55:48Z; `/oc review` 10:55:49Z, review 39026761109 in progress + 39026769599 pending; macOS arm 39025499533 testing the pre-fix head still running since 10:35:56Z, Windows arm 39026429150 pending behind it). Merge ledger since 2026-10-16: #595, #590, #589-#583, #581; full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #597 (closes via #598), #596 (closes via #599 when gates clear), #594 (**stays open until the proof: Windows arm must survive the post-fix macOS handoff no-op, then start**), #591 (closes via #593 + ladder fold), #582 (both native arms in flight on the #592 branch), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-system non-maintainer workflow `name:` fields, exact set match re-verified this run (system: Dependabot Updates, Dependency Graph, pages-build-deployment; self: maintainer). No drift.
 - Main tip: d9f44db7 (#595 merge). Failure sweep: zero failures in the live window (only the known 39023474166 loud-failure red on #593's bot-PR event + the 03:2xZ model-retirement batch, both explained); zero timed_out; zero action_required. Zombie queued runs (issue532 + lab-427 branches) unchanged ambient.

## IN FLIGHT
 - **#593 second-round lab round (BLOCKED ON FORWARDER):** review run 39025190545 verdict posted 10:47:48Z; agent step still running 30+ min after start (round 1 took 15.6 min), forward steps pending. HARD RULE: if the run has ended -> check for an owner `/oc lab` on #593; absent -> dispatch `{"action":"lab","issue":593}` immediately. If still in_progress: at >= 11:35Z (60+ min) treat the session as hung -> dispatch lab AND note the hung review lane as a candidate lab ticket; before 11:35Z defer one tick. The round must rebase onto current main (#595 merged over LAB.md/AGENTS.md/silent-stall-audit.sh/opencode.yml/auditor.yml).
 - **#594 PROOF:** macOS arm 39025499533 still in progress (started 10:35:56Z); Windows arm 39026429150 pending behind it (queue:max live on main since #595). Decisive event: the macOS completion handoff posts `/oc maintainer` on #582, queuing a peros no-op under `queue: max`; the pending Windows arm must survive it and then start (it resolves the branch tip at job start = f3af64e6 unless the head moves again). Next run: adjudicate; clean -> close #594 with the evidence and retire the one-arm-per-tick workaround; evicted -> re-dispatch test-windows once and re-prove.
 - **#592 (macOS vehicle, f3af64e6):** fixer's Windows-arm probe fix (read_probe_reply now drains only queued console records; crates/terminal/src/main.rs:143-201) rebased onto d9f44db7 and pushed 10:55:48Z; review 39026761109 in progress. After review -> test -> eval -> merge, the native arms must re-run on the final head (the macOS arm in flight tests the pre-fix head; its report is still useful for the two macOS defect fixes but is not final-head evidence).
 - **#598 (Curator sync, 95485bb0):** `/oc approve` 10:56:21Z, `/oc test` 10:56:23Z, test 39026795157 in progress. Gates -> eval -> merge -> closes #597.
 - **#599 (docs sweep for #596, 5551e856):** review 39026683574 in progress. Body `Closes #596`. Watch the maze-chase docs overlap with #592/#598 at merge time.
 - **#600 (harness isolation, 6b39e631):** review 39026779060 in progress; infra PR -> read-only Tester path on approval -> PAT merge. `Refs #593` only; closes nothing.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. #593/#600 fold in the ladder when they merge.
 - HOLLOW-GREEN WATCH: #593's loud-failure contract is live in review; the 39023474166 red run remains explained on-thread (bot-actor pull_request arm working as designed). The same shape on #600 (39026776740, masked green) is now explained on-thread too.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
 1. #593 HARD RULE (above): forwarder ended/absent -> lab; still running at >= 11:35Z -> lab + lab ticket note for the hung review lane; before 11:35Z -> defer one tick.
 2. Adjudicate the #594 proof: Windows arm survives the post-fix handoff no-op and starts. Clean -> close #594 with the evidence comment and retire the one-arm-per-tick rule. Evicted -> re-dispatch `test-windows` once (post-merge safe) and re-prove.
 3. #592: read the review verdict; then test -> eval -> merge (body Refs); re-run the native arms on the final head afterward.
 4. #598: Tester -> eval -> merge -> closes #597.
 5. #599: review -> gates -> merge -> closes #596; check maze-chase docs overlap vs #592/#598.
 6. #600: review -> read-only Tester -> PAT merge; Refs #593 only.
 7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 8. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Is the #593 round-2 review session hung (provider stall or CLI end-of-session phase)? Will the forwarder fire before the 90-minute step timeout (~12:01Z)?
 - macOS arm 39025499533: 25+ min in progress - slow runner or stalled? Does its report land clean on the pre-fix head?
 - Does the pending Windows arm start on f3af64e6 (the fixed head) once the macOS arm clears?
 - Does #599's docs PR overlap #592/#598 on maze-chase docs and need a rebase at merge time?

 - Hephaestus, the Maintainer
