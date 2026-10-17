# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39029214739 - [fix-handoff tick on #592] probe-residual fix 7e2d03a7 under review; Windows arm running on the pre-fix head aa6c0750; tester_packaging.rs cfg(unix) gate still unlanded (rides the next fix round); #593 and #599 in their review/test lanes; decisions []**

## PRs & Issues
 - **PRs:** Open: #592 (macOS vehicle, head 7e2d03a7, CLEAN/MERGEABLE, body `Refs #582`; fix push 11:33:53Z landed both probe residuals + rebase onto main; review 39029200626 in progress since 11:34:11Z on the fixed head), #593 (lab ladder for #591, head 49e91814, CLEAN vs 0c4fbe5a; lab round 39028125375 completed success 11:32:13Z - Finding 7 + rebase landed after the expected wrapper non-fast-forward rejection comment at 11:32:03Z; review 39029072421 in progress since 11:32:11Z), #599 (docs sweep for #596, head a3294b79; round-2 fix landed 11:33:58Z; Reviewer `/oc approve` 11:38:41Z; `/oc test` auto-forwarded -> read-only infra test 39029490404 in progress). **#600 MERGED 11:28:47Z -> main 0c4fbe5a.** Merge ledger 2026-10-17: #600 (11:28:47Z -> 0c4fbe5a), #598 (11:13:20Z -> 9cbc8f5c; closed #597), #595 (10:50:33Z -> d9f44db7), #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (displacement class, UNTRIAGED - sequenced behind #593, see IN FLIGHT), #596 (closes via #599), #591 (via #593), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. #597 closed (via #598), #594 closed (queue proof).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match (platform-generated Dependabot Updates / Dependency Graph / pages-build-deployment correctly absent). No drift.
 - Main tip: 0c4fbe5a. Failure sweep: zero failure/timed_out/startup_failure in the last 60 runs; zero held action_required runs. Benign displacement instance observed: no-op review runs 39029214648 (cancelled) replaced by 39029222405 (pending) on #592 while the real review 39029200626 was already in progress - no work lost.

## IN FLIGHT
 - **#592 REVIEW (in progress):** 39029200626 on 7e2d03a7 since 11:34:11Z. On approve -> Tester -> Evaluator -> merge (Refs #582). **PACKAGING GATE STILL UNLANDED:** crates/terminal/tests/tester_packaging.rs has no `#![cfg(unix)]` on the branch (verified at 7e2d03a7 via contents API) or on main; it must land before the Windows native re-verify. Expected vehicles: this review's verdict (auto-forward `/oc fix`) or the running Windows arm's native fix handoff. If the review approves without it, dispatch `{"action": "fix", "pr": 592}` for the one-line gate before the native arms re-run.
 - **WINDOWS ARM (running):** 39026429150 test-windows on aa6c0750 since 11:06:31Z (pre-fix head; its evidence cannot sign the final parity row). One arm only; do not re-dispatch mid-flight. Report folds into the #592 chain and may surface the packaging compile gap natively.
 - **#593 LAB ROUND LANDED:** head 49e91814, CLEAN. Review 39029072421 in progress since 11:32:11Z. Then: read-only infra Tester -> PAT merge step -> close #591, fold the ladder into MODEL-WATCH.
 - **#601 DISPLACEMENT ISSUE (UNTRIAGED, SEQUENCED):** dispatch `{"action": "lab", "issue": 601}` once #593 merges (escape hatch: no merge progress 90 min after the round push = ~13:02Z). The benign 11:34Z #592 instance (no-op cancellations while the real review ran) is a live reminder the class persists.
 - **#599 GATES:** Reviewer `/oc approve` 11:38:41Z on a3294b79; read-only infra test 39029490404 in progress; on approve-test -> merge -> closes #596. Watch maze-chase docs overlap with #592 at merge time.
 - #552: owner live-terminal confirmation outstanding; never auto-close on Refs.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin, healthy; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - DISPLACEMENT HAZARD (until #601's fix lands): any comment landing on a PR while a same-workflow run of its per-issue group is pending can silently cancel it (a skip-only run replaces the one pending slot). Minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates); #599 is docs-only; #593/#600/#601 are lab.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #592: read the review verdict on 7e2d03a7. Approve -> Tester -> Evaluator -> merge (Refs #582). Findings -> the auto-forward owns the fix; ensure the `tester_packaging.rs` cfg(unix) gate is in that same round. If the review approves WITHOUT the gate landed, dispatch `fix` for the gate before the native re-verify.
 2. Read the Windows arm report (39026429150); fold Windows defects + the packaging gate into the #592 chain.
 3. After the #592 chain settles, re-run macOS + Windows native arms on the final head in parallel (queue:max proven) to sign the last parity rows; then update docs/parity.md and close #582 only when the Windows native proof + signed rows exist (owner live-terminal #552 item separate).
 4. #593: review verdict -> read-only infra Tester -> PAT merge -> close #591, fold ladder into MODEL-WATCH, then dispatch lab on #601.
 5. #599: test verdict -> merge -> closes #596.
 6. #552 owner live-terminal confirmation outstanding.
 7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the #592 review clear 7e2d03a7, and does its verdict land or flag the tester_packaging.rs Unix gate?
 - Does the Windows arm on aa6c0750 surface the packaging compile failure or Windows-specific defects?
 - Does #593's reviewed head clear and merge (unblocking the #601 lab dispatch)?
 - Does #599's infra test approve and merge cleanly (closing #596)?

 - Hephaestus, the Maintainer
