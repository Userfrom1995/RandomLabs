# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39029080733 - [`/oc maintainer` on #593] third lab round landed on rebased head 49e91814 (review 39029072421 in progress); #592 fix rebased 7e2d03a7 + review in flight; #599 fix a3294b79 + review in flight; #601 sequenced**

## PRs & Issues
 - **PRs:** Open: #599 (docs sweep for #596, head a3294b79, UNSTABLE; review 39029191568 in progress since 11:34:02Z; on approve -> Tester -> merge -> closes #596), #593 (lab ladder for #591, head 49e91814, CLEAN, rebased onto 0c4fbe5a, 21 commits; review 39029072421 in progress since 11:32:13Z; then read-only infra Tester -> PAT merge step -> close #591), #592 (macOS vehicle, head 7e2d03a7, CLEAN, body Refs #582; review 39029200626 in progress since 11:34:11Z; Windows arm 39026429150 running since 11:06:32Z on pre-fix aa6c0750). Merge ledger 2026-10-17: #600 (11:28:47Z -> main 0c4fbe5a), #598 (11:13:20Z -> 9cbc8f5c; closed #597), #595 (10:50:33Z -> d9f44db7), #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (displacement class, UNTRIAGED - sequenced, see IN FLIGHT), #596 (closes via #599), #591 (via #593), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. #597 closed, #594 closed, #600 merged.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 local non-maintainer workflow files, exact name-set match; no drift.
 - Main tip: 0c4fbe5a. Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held action_required runs.

## IN FLIGHT
 - **#593 REVIEW (in progress):** review run 39029072421 since 11:32:13Z auditing the rebased head 49e91814 (all seven findings applied: registry passthrough, docs claim scoping, R14->R15 renumber with both guards, three-knob procedure incl. the Maintainer inline pin, heartbeat claims, exit-0 terminal anchoring in both loops, R15 assertions). Skip-only duplicate 39029080682 pending behind it (gate skip). On approve -> read-only infra Tester -> PAT merge step -> close #591, fold the ladder into MODEL-WATCH. On findings -> lab round. Do NOT post another /oc review while it is pending/in progress (pending-slot displacement hazard).
 - **#601 DISPLACEMENT ISSUE (UNTRIAGED, SEQUENCED):** dispatch `{"action": "lab", "issue": 601}` when the #593 chain reaches main, NOT before: the fix touches opencode.yml, lab.yml, silent-stall-audit.sh, AGENTS.md - the same files #593's open PR keeps rebasing against. ESCAPE HATCH: if #593 shows no merge progress 90 min after its round push (11:32 -> ~13:02Z), dispatch with an explicit coordination instruction and accept one rebase round.
 - **#592 REVIEW (in progress):** review 39029200626 since 11:34:11Z on head 7e2d03a7 (the Fixer's rebased probe repair: frame-strict DA1 reply, non-reply byte replay via input::keys_from_captured_bytes; body Refs #582). Windows arm 39026429150 still running on the pre-fix tree. On approve -> Tester -> Evaluator -> merge; then re-run BOTH native arms in parallel (queue:max proven).
 - **WINDOWS ARM (running):** 39026429150 test-windows since 11:06:32Z on aa6c0750 (pre-fix); report folds into the #592 chain; may surface the packaging gate natively.
 - **#599 REVIEW (in progress):** review 39029191568 since 11:34:02Z on head a3294b79 (round-3 fix: umbra/docs/scoreboard.md:20 count corrected to "five" capability rounds; doom keeps "four" correctly). On approve -> Tester -> merge -> closes #596.
 - #552: owner live-terminal confirmation outstanding; never auto-close on Refs.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin, healthy; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - DISPLACEMENT HAZARD (until #601's fix lands): any comment landing on a PR while a same-workflow run is pending can silently cancel the pending run (one-pending-slot rule); running runs are safe. Minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code (maze-chase crates); #599 is docs-only.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #593: read the review verdict (39029072421). Approve -> read-only infra Tester -> PAT merge step -> close #591, fold the ladder into MODEL-WATCH. Findings -> lab round (check finding 7 acceptance first).
 2. Dispatch `lab` on #601 the moment #593 is merged (escape hatch: no merge progress 90 min after the round push, ~13:02Z -> dispatch with coordination note).
 3. #592: read the review verdict (39029200626) and the Windows arm report; then Tester -> Evaluator -> merge (Refs #582); re-run both native arms in parallel after.
 4. #599: review verdict (39029191568) -> Tester -> merge -> closes #596.
 5. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the reviewer accept the exit-0 tail/terminal-form anchoring for finding 7 (documented residual: a healthy final answer quoting the exact terminal form at column 0)?
 - Does #593 merge before the ~13:02Z #601 escape hatch?
 - Does the Windows arm surface Windows-specific defects beyond the shared probe residuals?
 - Do the re-reviews clear #599 and #592?

 - Hephaestus, the Maintainer
