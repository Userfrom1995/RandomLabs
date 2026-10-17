# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39024084910 - [Infra] #594 triaged: Lab Engineer dispatched for the peros concurrency cancellation; #593 review and #592 fix runs still in flight (no duplicates dispatched)**

## PRs & Issues
 - **PRs:** Open: #593 (lab: bounded model fallback ladder + loud failure, #591; head 21b45358; /oc review run 39023474710 in progress since 10:03:57Z, no verdict yet; maintainer check RED on the PR = the new loud-failure contract firing on the bot-actor pull_request arm, already explained on-thread; infra PR -> merge path is the PAT-backed step gated on /oc approve-test), #592 (macOS native report for #582, head b56b9879, CLEAN; its /oc maintainer run 39023486016 in progress since 10:04:20Z with no decision posted yet - it owns the fix dispatch). Merge ledger unchanged since 2026-10-16: #590 (Final Phase packaging verification + release audit for #582, merged via --rebase, branch kept; Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1 of the #582 epic, merged Refs-only), #581 (curator landing fix). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #594 ([Infra] peros concurrency cancellation; lab dispatched this run), #591 (closes when #593 merges), #582 (native parity rows: macOS evidence in #592; Windows arm lost, re-dispatch after the fix), #552 (Pac-Man; owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues remain: every open issue carries a dispatch or an owner-pending state.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields. No drift.
 - Main tip: aad7ff9a (owner "lab: raise agent context window to 1M with late auto-compaction", 10:06:30Z, opencode.json only). Previous pin-switch commit 16c00979.
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#594 (peros concurrency, lab dispatched this run):** instruction routes drop/scope of the workflow-level group (or `queue: max`) plus the LAB.md/AGENTS.md queued-execution wording; Refs-only until a live two-arm dispatch proves the queued arm survives. Workaround in force until fixed: one per-OS arm per tick.
 - **#593 (lab ladder + loud failure, in review):** head 21b45358; review 39023474710 in progress (started 10:03:57Z). Do not merge without /oc approve-test from the read-only infra Tester; merge via the PAT-backed step (workflow-touching PR). Public comment already posted on #593 explaining the red check and the reviewer choice: revive the #427 preflight (branch opencode/lab-427-actor-permission-preflight, PR #429 closed unmerged) vs accept red-per-bot-PR as the loud signal.
 - **#592 (macOS report) + #582 native rows:** defects: terminal auto-detect keypress theft (crates/terminal/src/main.rs:79-100); desktop first settings save when parent dir missing (crates/desktop/src/app.rs:144-147; persist.rs:212 swallows the write error). Failing repro committed b56b9879. Fix dispatch owned by run 39023486016 (still in progress at 10:15Z, no decision posted yet; do not duplicate). After the fix push: re-run macOS and Windows native arms STRICTLY sequentially (one per tick) on the fixed head.
 - **PEROS CONCURRENCY RULE (new, standing):** dispatching two per-OS arms at once loses the queued one: GitHub keeps one pending run per concurrency group, and the first arm's completion handoff queues a run that replaces it (Windows run 39021803178 cancelled 09:57:20Z with zero jobs; macOS run 39021802900 succeeded). Dispatch one arm per tick only. Durable fix dispatched to the Lab Engineer via #594.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Once #593 merges, the registry-resolved ladder handles retirement automatically; fold that into this rule.
 - HOLLOW-GREEN WATCH: on main still pre-#593, a maintainer/opencode Model-not-found death can conclude green (agent step continue-on-error); check run logs for Model-not-found before assuming a timeout. #593 closes this on the maintainer + general arms.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590: hub code-chip wrap for small screens, installer missing-value argc guard, Cargo.toml VERSION grep stanza pin, index.html 42-vs-43 test-count copy nit + all earlier residuals) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
1. Verify `/oc lab` landed on #594 and watch the resulting Lab Engineer PR (infra -> read-only Tester gate -> PAT-backed merge). On merge: verify two per-OS arms dispatched together both survive.
2. #592: if run 39023486016 landed the fix, dispatch `{"action": "test-macos", "issue": 582}` on the fixed head; after its completion handoff has passed, dispatch `{"action": "test-windows", "issue": 582}` (sequential rule). If 39023486016 died without a decision, dispatch `{"action": "fix", "pr": 592}`.
3. Watch #593: review verdict (approve -> read-only infra Tester via `/oc test` -> PAT merge; fix/lab findings -> route accordingly). On merge: verify main contains the ladder + verify steps; fold the ladder into MODEL-WATCH; close #591.
4. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
5. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the Lab Engineer drop the workflow-level peros group entirely, scope it by comment id, or adopt `queue: max` (runner feature tier)?
 - Did run 39023486016 land the #592 fix or die mid-run (still in progress at this run's write time)?
 - Does the reviewer want the bot-actor `pull_request` maintainer arm made a clean no-op inside #593 (revive #427/#429's preflight) or accept red-per-bot-PR as the loud signal?
 - Does the Windows native arm on the fixed #592 head surface its own defects beyond the macOS pair?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
