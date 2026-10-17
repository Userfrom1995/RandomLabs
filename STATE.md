# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39027704479 - [owner `/oc maintainer` ping on #592] fix round on #592 already in flight (the macOS-handoff session dispatched 11:15:42Z; the Tester verdict FIX at 11:18:31Z auto-forwarded a second `/oc fix` queued behind it); branch RED with the three macOS-pinned tests; Windows native arm running; #598 merged as 9cbc8f5c closing #597; #593 lab round on Finding 6 in flight; decisions []**

## PRs & Issues
 - **PRs:** Open: #600 (lab harness-isolation post-mortem, head c8a37cc8 after the Lab Engineer's review-fix push; review 39028017662 pending; Refs #593), #599 (Builder docs sweep for #596, head 8c9d619c after the Fixer addressed both blocking review findings and rebased; review forwarded 11:19:39Z; body `Closes #596`), #593 (lab ladder + loud failure, head f2e7f97d; CONFLICTING vs main; round-2 review addendum 11:17:18Z added Finding 6 (rebase onto main + renumber the audit rule, keep BOTH R14 guards); owner forwarded `/oc lab` 11:17:20Z; lab 39028125375 in flight), #592 (macOS/native vehicle, head b759dff4; Tester verdict FIX 11:18:31Z: `cargo test --workspace` exits 101, three `tester_macos_probe_window.rs` failures; fix runs 39028021752 in progress + 39028202649 pending; Windows arm 39026429150 in progress; body `Refs #582`). Merge ledger since 2026-10-16: #598 (Curator sync, 9cbc8f5c at 11:15:15Z, closed #597), #595, #590 (Final Phase, Refs #582), #589-#583 (Phases 7-1), #581 (curator). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #596 (closes via #599 on merge), #591 (closes via #593 + ladder fold), #582 (native parity rows; macOS verdict fix routed, Windows arm running), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. **#597 CLOSED 11:15Z via #598.** **#594 CLOSED 11:09:30Z** with the live queue:max proof. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match re-verified this run. No drift.
 - Main tip: 9cbc8f5c (#598's rebase merge onto d9f44db7); pages deploy ran green after it.

## IN FLIGHT
 - **#592 (macOS/native vehicle, head b759dff4):** The concurrent macOS-handoff session (39027424300) posted the findings handoff on #592 at 11:15:40Z and dispatched `/oc fix` at 11:15:42Z -> fix run 39028021752 (in progress). The main Tester run 39027133491 finished 11:18:31Z with verdict FIX: it pushed b759dff4 (two new green PTY regressions: fragmented DA1 reply selects sixel with one Enter; late reply after the deadline neither upgrades nor steals), reproduced both residual defects on the current tree (3 macOS-pinned tests RED; workspace exit 101), and the test workflow forwarded a second `/oc fix` at 11:18:33Z (run 39028202649 pending behind the first; expected to no-op if the first fix lands green). Fix scope (both reports agree): make `probe_ok` frame-strict; replay non-reply probe bytes into the normal input path on BOTH the Unix and Windows arms. Reviewer-flagged pending item for the fix round: `crates/terminal/tests/tester_packaging.rs` needs `#![cfg(unix)]` (pre-existing on main; breaks Windows `cargo test --workspace`). The Windows native arm 39026429150 is running on this vehicle. After green: review -> Tester -> Evaluator -> fresh sequential macOS/Windows native pair to sign the parity rows. `Refs #582` stands; no `Closes`.
 - **#599 (docs sweep, 8c9d619c):** Fixer addressed both blocking review findings at 11:19:37Z (rebased onto d9f44db7); review forwarded 11:19:39Z; `/oc maintainer` handoff 11:19:47Z. On review approval -> read-only Tester -> merge (docs class) -> close #596. Watch the maze-chase docs overlap vs #592 at merge time.
 - **#593 (lab ladder, f2e7f97d):** Round-2 review addendum (11:17:18Z) added Finding 6: rebase onto main (now 9cbc8f5c) and renumber the audit rule (both sides claim R14; keep BOTH guards). Owner forwarded `/oc lab` 11:17:20Z; lab run 39028125375 in flight. On push -> re-review -> read-only infra Tester -> PAT-backed merge -> close #591; fold the ladder into MODEL-WATCH. If a stalled-run duplicate `/oc lab` arrives, the second run simply queues (do not cancel).
 - **#600 (lab post-mortem, c8a37cc8):** Lab pushed review fixes 11:15:38Z; review 39028017662 pending; infra -> read-only Tester -> PAT-backed merge; Refs #593.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - HOLLOW-GREEN WATCH: #593 closes the maintainer + general-arm hollow green; until it merges, a Model-not-found death can still conclude green on those arms.
 - NEW WATCH (stalled review run): review run 39025190545 (#593) posted its findings at 10:47:48Z and stayed in its agent step; it finally posted the Finding 6 addendum at 11:17:18Z (~30 min). If the class recurs, open a lab ticket.
 - PEROS CONCURRENCY RULE: RETIRED (#594 closed with live proof: the queued Windows arm survived the macOS handoff no-op and started 11:06:31Z; the no-op itself was dropped, the arm was not). The next real two-arm exercise is the fresh macOS/Windows pair after the #592 fix.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit: today's merges were lab/docs-class (#595, #598); no new-project merges, no limit concern.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; no required check affected.

## NEXT-RUN PLAYBOOK
 1. #592: read the fix push; ensure the three macOS-pinned tests AND the existing probe suite are green, ideally with the `tester_packaging.rs` Unix gate folded in; then let review -> Tester -> Evaluator run, then dispatch a fresh sequential macOS then Windows native pair to sign the parity rows. Watch the second queued fix run (39028202649) no-op cleanly. Fold any Windows-arm native defects into the same branch.
 2. #599: review verdict on 8c9d619c -> Tester -> merge on approve-test (docs class), close #596; check the maze-chase docs overlap vs #592 before merging.
 3. #593: lab round on f2e7f97d -> re-review -> read-only infra Tester -> PAT merge step -> close #591; fold the ladder into MODEL-WATCH.
 4. #600: review -> read-only Tester -> PAT merge.
 5. #598 DONE (merged, #597 closed). #594 DONE (proof observed, closed, rule retired).
 6. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 7. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Do the three macOS RED tests go green on both the Unix and Windows probe arms in one fix round?
 - Does the running Windows arm surface the `tester_packaging.rs` compile failure, and does the fix round pick up the one-line gate from the maintainer comment?
 - Does the second queued fix run (39028202649) no-op cleanly instead of duplicating work?
 - Does #593's lab round keep both R14 audit guards while resolving the conflict against 9cbc8f5c?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
