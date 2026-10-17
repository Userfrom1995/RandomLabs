# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39028286974 - [Owner-ping tick on #592: first fix run and Windows arm in flight, #600 approved into read-only test, #599/#593 in review/lab. Decisions `[]`]**

## PRs & Issues
 - **PRs:** Open: #600 (lab harness-isolation post-mortem, head c8a37cc8, MERGEABLE, Refs #593; round-2 review `/oc approve` at 11:20:44 -> `/oc test` 39028342932 in progress, maintainer 39028342803 queued), #599 (docs sweep for #596, head 8c9d619c (fix pushed 11:19:47), `Closes #596`; review 39028268833 in progress + duplicate 39028278139 pending), #593 (model ladder for #591, head f2e7f97d, **CONFLICTING vs main 9cbc8f5c**; lab 39028125375 in progress since 11:17:26), #592 (macOS vehicle, head b759dff4 (RED on the three macOS-pinned tests), MERGEABLE, body `Refs #582` verified no Closes; fix 39028021752 in progress, Windows arm 39026429150 in progress on aa6c0750). Merge ledger 2026-10-17: **#598 (Curator sync, 9cbc8f5c, closed #597)**, #595 (d9f44db7), #581 (curator). 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #596 (closes via #599), #591 (via #593), #582 (native arms; macOS residuals fix in flight), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run. No drift. Zero `action_required` held runs.
 - Main tip: 9cbc8f5c. Its Pages deploy (39028407654) succeeded 11:22:22Z.

## IN FLIGHT
 - **#592 FIX ROUND (first dispatch owns the repair):** opencode 39028021752 (dispatched 11:15:42 off the macOS findings handoff) is in its fix agent step since 11:15:58; head still b759dff4 at 11:25. The Tester's duplicate `/oc fix` (11:18:33) created 39028202649, pending behind the first, superseded/cancelled at 11:19:59 when the owner's `/oc maintainer` comment spawned opencode 39028287034 into the queue; that run's jobs will all skip (`/oc maintainer` excluded from every opencode.yml job), so the displacement is lossless. Fix scope: frame-strict `probe_ok`, replay in-window non-reply bytes into the normal input path on BOTH arms (macOS triad `tester_macos_probe_window.rs` must go green), plus the reviewer-flagged `tester_packaging.rs` `#![cfg(unix)]` gate. When the fix lands: re-run macOS + Windows arms on the fixed head (parallel safe, queue:max proven), then review -> test -> eval -> merge after the gates (body `Refs #582`).
 - **WINDOWS ARM (running):** 39026429150 `test-windows` in agent step since 11:06:53 on aa6c0750 (pre-second-fix head). Expected to confirm the shared residuals; Windows-specific findings fold into the next round. Do NOT re-dispatch; macOS re-verify must wait for the fix.
 - **#600 -> READ-ONLY TEST:** round-2 review approved 11:20:44 (infra class: `.github/agents/**`, `AGENTS.md`, `LAB.md`); read-only Tester 39028342932 in progress, maintainer 39028342803 queued. On approve-test -> PAT-backed merge (Refs #593, closes nothing).
 - **#599 FIX LANDED -> REVIEW:** head 8c9d619c; review 39028268833 in progress + 39028278139 pending. On approve -> read-only infra Tester -> regular merge -> closes #596.
 - **#593 LAB ROUND 3 (in flight):** lab 39028125375 in agent step since 11:17:26: F6 rebase onto 9cbc8f5c (docs conflicts only: docs/index.html + docs/index.md, keep main's #598 wording plus the branch's ladder docs; R14 -> R15 renumber with main's queue rule staying R14) and F7 exit-0 ladder false-advance anchor. Do not duplicate; on completion route review.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin and proved healthy across every lane this tick; #593 hardens the ladder for the exit-0 false-fire (F7) before it merges.
 - HOLLOW-GREEN WATCH: on main pre-#593, a maintainer/opencode Model-not-found death can conclude green (open until #593 merges).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates), so `fix` is correct there.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: the 11:19:58/11:20:48 trigger batches are the normal all-workflows fan-out on maintainer-triggered comments; all non-matching jobs skipped as designed. Old zombie queued runs from 2026-09-25/10-05 remain permanently queued with no required check affected (#594's queue:max fix does not apply to them).

## NEXT-RUN PLAYBOOK
 1. #592: verify the fix run pushed (head advances past b759dff4) with both residuals repaired, the macOS-pinned triad green, and the `tester_packaging.rs` Unix gate applied; then re-run the macOS + Windows arms on the fixed head (parallel safe); then review -> test -> eval -> merge after the gates (body `Refs #582`).
 2. #593: verify lab 39028125375 pushed F6+F7 + rebase onto 9cbc8f5c with docs conflicts resolved and the R14 queue guard intact; review picks it up. On approve -> read-only infra Tester -> PAT merge -> close #591, fold the ladder into MODEL-WATCH.
 3. #599: review verdict -> gates -> merge -> closes #596.
 4. #600: test verdict -> read-only infra Tester confirms -> PAT merge (Refs #593).
 5. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 6. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the first fix run on #592 land both residuals plus the Unix gate, and does the pending opencode 39028287034 skip cleanly?
 - Does the Windows arm surface Windows-specific defects beyond the shared probe residuals?
 - Does #599 clear review after the fix push?
 - Does #600 clear the read-only Tester and merge via PAT?
 - Does the #593 lab round land F6+F7 with the R14 queue guard intact?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
