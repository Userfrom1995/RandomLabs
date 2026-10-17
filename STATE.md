# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39029199545 - [fix-handoff tick on #599] #599 round-3 fix live on a3294b79 (rebased onto 0c4fbe5a) with re-review in flight; #593 lab round landed Finding 7 + rebase (head 49e91814, CLEAN, review in flight); #592 probe fix live on 7e2d03a7 (review in flight, Windows arm still running); #601 lab dispatch sequenced behind the #593 merge**

## PRs & Issues
 - **PRs:** Open: #599 (docs sweep for #596, head a3294b79, MERGEABLE/UNSTABLE; real review 39029191568 in progress since 11:34:02Z; on approve -> Tester -> merge -> closes #596), #593 (lab ladder for #591, head 49e91814, CLEAN after the 11:32:03Z PAT force-push landed Finding 7 + rebase onto 0c4fbe5a; real review 39029072421 in progress since 11:32:11Z; then read-only infra Tester -> PAT merge step -> close #591), #592 (macOS vehicle, head 7e2d03a7 (probe fix + rebase onto main), CLEAN; real review 39029200626 in progress since 11:34:11Z; sibling maintainer runs 39029214739 (in progress) + 39029222429 (queued); body Refs #582; Windows arm 39026429150 still running on pre-fix aa6c0750). Merge ledger 2026-10-17: #600 (11:28:47Z -> 0c4fbe5a), #598 (11:13:20Z -> 9cbc8f5c; closed #597), #595 (10:50:33Z -> d9f44db7), #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (displacement class, triaged + SEQUENCED, see IN FLIGHT), #596 (closes via #599), #591 (via #593), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. #597/#594 closed; #600 merged.
 - **Boards:** #70 lab-health (auditor daily report 09:45Z; no new anomalies), #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 live non-maintainer workflow names, exact set match; no drift.
 - Main tip: 0c4fbe5a (#600 merge). Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held action_required runs; cancelled/skipped arms all accounted as group supersessions or job-gate skips.

## IN FLIGHT
 - **#599 REVIEW (in flight):** 39029191568 on a3294b79 since 11:34:02Z. Round-3 fix verified first-hand this run: umbra scoreboard "five capability rounds", doom 52/52 ALL PASS, manifest M1-free, and origin/main (0c4fbe5a) is a direct ancestor of the head. Earlier fixes (audit-m3 count, delegation ledger) intact in history. On approve -> Tester -> merge -> close #596. Watch maze-chase docs overlap with #592 at merge time.
 - **#593 REVIEW (in flight):** 39029072421 on 49e91814 since 11:32:11Z. Lab round pushed Finding 7 (dc881fb8 exit-0 terminal anchoring, 87da334e R15 audit assertion) + docs/pin/ledger commits + rebase; CLEAN and MERGEABLE now. Pending no-op review 39029080682 drains after. Then: read-only infra Tester -> hardcoded PAT merge step (workflow-touching PR) -> close #591, fold the ladder into MODEL-WATCH.
 - **#601 DISPLACEMENT ISSUE (triaged, SEQUENCED):** dispatch `{"action": "lab", "issue": 601}` once #593 merges. Escape hatch: no merge progress 90 min after the 11:32:03Z round push -> dispatch at/after ~13:02Z with an explicit coordination instruction. Public triage note already posted (run 39028577133).
 - **#592 REVIEW (in flight):** 39029200626 on 7e2d03a7 since 11:34:11Z; sibling maintainer sessions 39029214739 (in progress) + 39029222429 (queued). Verify on the verdict: frame-strict probe_ok; non-reply byte replay Unix AND Windows; tester_packaging.rs Unix gate item. Then test -> eval -> merge (Refs #582); re-run BOTH native arms in parallel (queue:max proven).
 - **WINDOWS ARM (running):** 39026429150 test-windows since 11:06:32Z on aa6c0750 (pre-fix); report folds into the #592 chain.
 - Displacement class (this window): no real run lost. All no-op review runs either cancelled another no-op or drain pending; the three real reviews started within 3s of their `/oc review` comments and are past the job gate. Standing hazard until #601's fix lands; every tick re-checks for lost forwards.
 - #552: owner live-terminal confirmation outstanding; never auto-close on Refs.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin, healthy; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code; #599 is docs-only.
 - Orphan-main protection holds (verified this run for #599: origin/main is an ancestor of its head). Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #599: read the review verdict on a3294b79. Approve -> Tester -> merge -> close #596; findings -> confirm the fix round covers them.
 2. #593: read the review verdict on 49e91814. Approve -> read-only infra Tester -> PAT merge step -> close #591, fold the ladder into MODEL-WATCH. On merge: dispatch `lab` on #601 immediately (sequencing contract).
 3. #592: read the review verdict on 7e2d03a7; verify all three verdict items (frame-strict probe_ok; non-reply byte replay Unix AND Windows; tester_packaging.rs Unix gate); missing -> follow-up fix. Then test -> eval -> merge; re-run both native arms in parallel.
 4. Read the Windows arm report (39026429150); fold Windows-specific defects into the #592 chain.
 5. #601 escape hatch: if #593 has not merged by ~13:02Z, dispatch `lab` on #601 with an explicit coordination instruction.
 6. #552 closes only on owner live-terminal confirmation.
 7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the round-3 head clear the #599 review cleanly?
 - Does the third-round #593 review clear 49e91814 (Findings 1-7)?
 - Does the #592 review confirm the tester_packaging.rs Unix gate item, or does it need a follow-up round?
 - Does the Windows arm surface Windows-specific defects beyond the probe residuals?
 - Does the #601 escape hatch trip before #593 merges?

 - Hephaestus, the Maintainer
