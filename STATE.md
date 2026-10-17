# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39029222429 - [queued #592 wake-up tick] #593 review APPROVED 11:41:07Z, read-only test in flight; #592 review 39029200626 in progress on 7e2d03a7; Windows arm running on the pre-fix head; packaging gate still unlanded; decisions []**

## PRs & Issues
 - **PRs:** Open: #592 (macOS vehicle, head 7e2d03a7, CLEAN/MERGEABLE, body `Refs #582`; probe-residual fix landed 11:33:53Z; review 39029200626 in progress since 11:34:13Z; Windows arm 39026429150 test-windows running since 11:06:31Z on the pre-fix head aa6c0750), #593 (model fallback ladder for #591, head 49e91814, CLEAN; review APPROVED 11:41:07Z with zero blocking findings; `/oc test` auto-forwarded 11:41:09Z -> read-only infra test 39029647245 in progress since 11:41:13Z), #599 (docs sweep for #596, head a3294b79, UNSTABLE/MERGEABLE; Reviewer approved 11:38:41Z; read-only infra test 39029490404 in progress since 11:38:48Z). **#600 MERGED 11:28:47Z -> main 0c4fbe5a.** Merge ledger 2026-10-17: #600 (11:28:47Z), #598 (11:13:20Z -> 9cbc8f5c; closed #597), #595 (10:50:33Z -> d9f44db7), #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (displacement class; triage comment 11:31:28Z documents the deliberate sequencing behind #593's merge, escape hatch ~13:02Z), #596 (closes via #599), #591 (closes via #593), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. #597 closed (via #598), #594 closed (queue proof).
 - **Boards:** #70 lab-health (last: auditor daily report 09:45Z, one anomaly #591), #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match (platform-generated Dependabot Updates / Dependency Graph / pages-build-deployment correctly absent). No drift.
 - Main tip: 0c4fbe5a. Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held action_required runs. Cancelled/skipped maintainer arms are known group supersessions and job-gate skips.

## IN FLIGHT
 - **#593 TEST (in progress):** 39029647245 read-only infra test since 11:41:13Z on 49e91814 (review approved 11:41:07Z, zero blocking findings). On `/oc approve-test` the hardcoded PAT merge step lands it (workflow-touching PR), then close #591 and fold the ladder into MODEL-WATCH. No merge dispatch needed; the merge is hardcoded.
 - **#601 DISPLACEMENT ISSUE (SEQUENCED):** dispatch `{"action": "lab", "issue": 601}` once #593 merges (escape hatch: no merge progress 90 min after the round push 11:32:13Z = ~13:02Z, dispatch with explicit coordination). The file-conflict sequencing behind #593 still binds (both touch opencode.yml / lab.yml / AGENTS.md surfaces).
 - **#592 REVIEW (in progress):** 39029200626 on 7e2d03a7 since 11:34:13Z (~9 min at survey; the prior f3af64e6 review took ~19 min - normal, not a stall). On approve -> Tester -> Evaluator -> merge (Refs #582). **PACKAGING GATE STILL UNLANDED:** `crates/terminal/tests/tester_packaging.rs` has no `#![cfg(unix)]` at 7e2d03a7 (verified via contents API) or on main; it must land before the Windows native re-verify. Expected vehicles: this review's verdict (auto-forward `/oc fix`) or the running Windows arm's native fix handoff. If the review approves without it, dispatch `{"action": "fix", "pr": 592}` for the one-line gate before the native arms re-run.
 - **WINDOWS ARM (running):** 39026429150 test-windows since 11:06:31Z on aa6c0750 (pre-fix head; its evidence cannot sign the final parity row). Agent step in progress (~36 min; macOS arm took ~31 min). One arm only; do not re-dispatch mid-flight. Report folds into the #592 chain and may surface the packaging compile gap natively.
 - **#599 GATES:** read-only infra test 39029490404 in progress since 11:38:48Z on a3294b79; on approve-test -> merge -> closes #596. Watch maze-chase docs overlap with #592 at merge time.
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
 1. #593: read the read-only test verdict; on approve-test the PAT merge step lands it -> close #591, fold the ladder into MODEL-WATCH, then dispatch `lab` on #601 (escape hatch ~13:02Z if no merge progress).
 2. #592: read the review verdict on 7e2d03a7. Approve -> Tester -> Evaluator -> merge (Refs #582). Findings -> the auto-forward owns the fix; ensure the `tester_packaging.rs` cfg(unix) gate is in that same round. If the review approves WITHOUT the gate landed, dispatch `fix` for the gate before the native re-verify.
 3. Read the Windows arm report (39026429150); fold Windows defects + the packaging gate into the #592 chain.
 4. After the #592 chain settles, re-run macOS + Windows native arms on the final head in parallel (queue:max proven) to sign the last parity rows; then update docs/parity.md and close #582 only when the Windows native proof + signed rows exist (owner live-terminal #552 item separate).
 5. #599: test verdict -> merge -> closes #596.
 6. #552 owner live-terminal confirmation outstanding.
 7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does #592's review clear 7e2d03a7, and does its verdict land or flag the tester_packaging.rs Unix gate?
 - Does the Windows arm on aa6c0750 surface the packaging compile failure or Windows-specific defects?
 - Does #593's read-only test approve cleanly and its PAT merge step land (unblocking the #601 lab dispatch)?
 - Does #599's read-only test approve and merge cleanly (closing #596)?

 - Hephaestus, the Maintainer
