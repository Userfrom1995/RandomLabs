# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39021488755 - model-retirement outage resolved; native per-OS proof dispatched for #582**

## PRs & Issues
 - **PRs:** Open: none. Latest merged: #590 (Final Phase packaging verification + release audit for #582, eval head 68b27b09, merged 2026-10-16 15:04:40Z as f1ecb537 via --rebase, branch kept; Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1 of the #582 epic, all merged Refs-only), #581 (curator landing fix). Full merge ledger in logs/2026-10-16.md.
 - **Issues:** Open: #582 (Rust-migration parent tracker; Phases 1-7 + Final on main; the last open rows are the Windows/macOS native E2E + packaged-artifact proof in docs/parity.md, now being produced by dispatched per-OS testers), #552 (Pac-Man terminal arcade; OPEN, awaiting owner live-terminal confirmation; also the migration gameplay reference and removal-blocked until #582 native rows are signed), #70 lab-health, #42 brainstorm standing only.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run (against live non-maintainer workflow `name:` fields). No drift.
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## OUTAGE & RECOVERY (2026-10-17, closed)
 - Provider retired pinned free model `opencode/muse-spark-1.3-contributor-free` at ~03:25Z. Every agent arm crashed `Model not found`. auditor + curator schedule arms self-heal-exhausted and escalated on #70 (03:25:05Z, 03:28:40Z); maintainer arms through 08:23Z all died (bot error comments on #70; schedule ticks 38999770178 and 39017154198 hollow-green with no decision/log; today's log stub carries 8 silent-run markers).
 - 09:31:37Z: commit 16c00979 landed on main (owner-applied under the chicken-and-egg case): all 20 workflow model pins + maintainer.yml MODEL env + opencode.json model/small_model -> `opencode/deepseek-v4.1-flash-free`, `variant: max` at all 20 composite sites. Verified: zero muse-spark refs in `.github/` or `opencode.json`; 20 pins vs 20 variant sites. Main tip: 16c00979.
 - 09:31:56Z: this run (39021488755, owner "Why halt?" on #582) is the first maintainer arm on the new pin: recovery proven live.

## IN FLIGHT
 - #582 native proof: `/oc test-macos` + `/oc test-windows` dispatched on #582 (2026-10-17 run 39021488755). peros-test falls back to `main` (no open `opencode/issue582-*` PR). Testers build/stage/drive natively and report; both runs share the workflow-level concurrency slot (windows queues behind macos). Outcomes: rows flip or native defect evidence routes to Fixer.
 - #70 auditor sweep dispatched (re-baseline health on the recovered pins; close the crash escalations).
 - #582 stays OPEN until a natively-proved step flips the parity rows; #552 closes ONLY on owner live-terminal confirmation (working code stays until the Rust replacement is verified; retirement after the native rows are signed).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (new): deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}` for the model-fallback ladder. Never self-edit workflows/prompts/config.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590: hub code-chip wrap for small screens, installer missing-value argc guard, Cargo.toml VERSION grep stanza pin, index.html 42-vs-43 test-count copy nit + all earlier residuals) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate (precedent through #590 68b27b09).
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
1. Read the macOS + Windows tester reports on #582. Both clean -> plan the natively-proved close path for #582 (parity row flip mechanism: tester commits are PR-only, so likely a small docs/verification phase) and then the #552 retirement step after owner live-terminal confirmation. Any native failure -> Fixer with exact native repro, then fresh gate.
2. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
3. Model watch per the rule above; the outage taught that a dead pin kills every arm silently (hollow-green schedule runs).
4. Future lab/hardening work needs a fresh scoped owner order; residuals stay queued.
5. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Can hosted macOS/Windows runners drive the desktop GUI probe, or will the testers honestly scope to headless E2E + packaging?
 - What mechanics flip docs/parity.md rows to signed: tester issue reports plus a small docs phase, or a retest on a PR?
 - Owner live-terminal confirmation on #552 still outstanding.
 - Are the PR-preview pages failures (earlier, on PR refs) a systematic defect or platform blips?

 - Hephaestus, the Maintainer
