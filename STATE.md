# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39023493495 - lab PR #593 in review (loud-failure step already proved live); macOS native report triaged on #592 (2 defects, fix owned by concurrent run 39023486016); peros concurrency dispatch loss found, filed, Windows arm re-dispatch queued behind the fix**

## PRs & Issues
 - **PRs:** Open: #593 (lab: bounded model fallback ladder + loud failure, #591; head 21b45358; review 39023474710 in flight; infra PR -> merge path is the PAT-backed step gated on /oc approve-test), #592 (macOS native report for #582, head b56b9879, MERGEABLE; 2 app defects + committed failing repro; its /oc maintainer run 39023486016 was live at this run's write time). Merge ledger unchanged since 2026-10-16: #590 (Final Phase packaging verification + release audit for #582, eval head 68b27b09, merged f1ecb537 via --rebase, branch kept; Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1 of the #582 epic, merged Refs-only), #581 (curator landing fix). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #591 (closes when #593 merges), #582 (native parity rows: macOS evidence in #592; Windows arm lost, re-dispatch after fix), #552 (Pac-Man; owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. NEW this run: an [Infra] issue on the peros-test concurrency dispatch loss (title starts "[Infra] opencode-peros-test workflow-level concurrency", created by this run's decision list) - **UNTRIAGED**: next run locates it via open issues and dispatches `lab`.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields. No drift.
 - Main tip: aad7ff9a (owner "lab: raise agent context window to 1M with late auto-compaction", 10:06:30Z, opencode.json only; Pages deploy 39023644874 green). Previous pin-switch commit 16c00979.
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#593 (lab ladder + loud failure, in review):** head 21b45358; review run 39023474710 in flight. Live proof already exists: run 39023474166 (pull_request-event maintainer arm on this PR) died on the bot-actor CLI assert with no decision file and the new verify step concluded RED (the same refusal on #592's event, run 39023055115, concluded green under main's workflow). The branch's resolver resolved requested=deepseek-v4.1-flash-free with mimo-v2.6-flash-free + glm-5.3-flash-free behind it. Do not merge without /oc approve-test from the read-only infra Tester; merge via the PAT-backed step (workflow-touching PR). Public comment posted on #593 explaining the red check and the reviewer choice: revive the #427 preflight (branch opencode/lab-427-actor-permission-preflight, PR #429 closed unmerged) vs accept red-per-bot-PR as the loud signal.
 - **#592 (macOS report) + #582 native rows:** defects: terminal auto-detect keypress theft (crates/terminal/src/main.rs:79-100); desktop first settings save when parent dir missing (crates/desktop/src/app.rs:144-147; persist.rs:212 swallows the write error). Failing repro committed b56b9879. Fix dispatch on #592 is owned by the concurrent maintainer run 39023486016 (do not duplicate). After the fix push: re-run macOS and Windows native arms STRICTLY sequentially (one per tick) on the fixed head.
 - **PEROS CONCURRENCY RULE (new, standing):** dispatching two per-OS arms at once loses the queued one: GitHub keeps one pending run per concurrency group, and the first arm's completion handoff queues a run that replaces it (Windows run 39021803178 cancelled 09:57:20Z with zero jobs; macOS run 39021802900 succeeded). Dispatch one arm per tick only.
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
1. Locate the new UNTRIAGED [Infra] peros-concurrency issue and dispatch `lab` on it (fix direction in the issue: drop/scope the workflow-level group or adopt `queue: max`; update the LAB.md/AGENTS.md queued-execution wording).
2. Watch #593: review outcome (approve -> infra Tester read-only -> PAT merge; fix/lab findings -> route accordingly). On merge: verify main contains the ladder + verify steps; fold the ladder into MODEL-WATCH; close #591.
3. #592: if no fix dispatch has landed by then (run 39023486016 may have done it), dispatch `{"action": "fix", "pr": 592}`. After the fix push, dispatch `test-macos` on #582; when that arm's handoff has passed, dispatch `test-windows` (sequential rule). Both clean -> flip/verify the parity rows and plan the #582 close.
4. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
5. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the reviewer want the bot-actor `pull_request` maintainer arm made a clean no-op inside #593 (revive #427/#429's preflight) or accept red-per-bot-PR as the loud signal?
 - Will the Lab Engineer drop the peros workflow-level concurrency group, scope it, or adopt `queue: max`?
 - Does the Windows native arm on the fixed #592 head surface its own defects beyond the macOS pair?
 - Owner live-terminal confirmation on #552 still outstanding.
 - Are the PR-preview pages failures (earlier, on PR refs) a systematic defect or platform blips?

 - Hephaestus, the Maintainer
