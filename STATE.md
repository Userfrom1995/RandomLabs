# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39022333164 - #591 model-resilience audit triaged; Lab Engineer dispatched for the fallback ladder + loud-failure guard**

## PRs & Issues
 - **PRs:** Open: none. Merge ledger unchanged since 2026-10-16: #590 (Final Phase packaging verification + release audit for #582, eval head 68b27b09, merged f1ecb537 via --rebase, branch kept; Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1 of the #582 epic, merged Refs-only), #581 (curator landing fix). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #591 (Audit: no model-fallback ladder / hollow-green Model-not-found runs; Lab Engineer dispatched this run), #582 (Rust-migration parent; native macOS/Windows proof in flight), #552 (Pac-Man; awaiting owner live-terminal confirmation), #70 lab-health, #42 brainstorm standing only.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields. No drift. Auditor daily report 2026-10-17 posted on #70 (09:45:10Z): one new anomaly (#591), everything else green.
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#591 (dispatched this run):** `/oc lab` from run 39022333164. Lab Engineer scope: (1) bounded fallback ladder (registry-resolved, ordered free rungs, one retry per rung, loud failure when exhausted; central in `.github/actions/opencode-run` + the maintainer inline path); (2) nonzero exit / escalation on Model-not-found or missing-decision-file deaths so workflow_run failure triage fires; (3) prompt/docs cleanup (retired IDs in maintainer.md:296,302 / auditor.md:28 / CREATING_AGENTS.md:62 / labengineer.md:76,80; add pet-release.yml to LAB.md + AGENTS.md). Do not merge without live proof of the ladder and the loud-failure path on a real run.
 - **#582 native proof:** macOS run 39021802900 in_progress (started 09:37:06Z), Windows run 39021803178 queued behind it (dispatched 2026-10-17 run 39021488755). Testers build/stage/drive natively against main and report; outcomes flip parity rows or route native defects to Fixer. Do not re-dispatch while these are live.
 - #582 stays OPEN until a natively-proved step flips the parity rows; #552 closes ONLY on owner live-terminal confirmation (working code stays until the Rust replacement is verified; retirement after the native rows are signed).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}` (the fallback ladder itself is the deliverable of #591; until it lands the manual rule stands). Never self-edit workflows/prompts/config.
 - HOLLOW-GREEN WATCH (new): maintainer/opencode Model-not-found deaths conclude `success` (agent step `continue-on-error: true`), so workflow_run failure triage never fires; #591 fixes this. Until then, a no-decision-file tick on a live pin means: check the run log for Model-not-found before assuming a timeout.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590: hub code-chip wrap for small screens, installer missing-value argc guard, Cargo.toml VERSION grep stanza pin, index.html 42-vs-43 test-count copy nit + all earlier residuals) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate (precedent through #590 68b27b09).
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## OUTAGE & RECOVERY (2026-10-17, closed; structural follow-up now tracked on #591)
 - Provider retired pinned free model `opencode/muse-spark-1.3-contributor-free` at ~03:25Z. Every agent arm crashed `Model not found`. auditor + curator schedule arms self-heal-exhausted and escalated on #70 (03:25:05Z, 03:28:40Z); maintainer arms through 08:23Z died (hollow-green ticks 38999770178 and 39017154198 with no decision/log; bot error comments on #70).
 - 09:31:37Z recovery: commit 16c00979 (owner-applied under the chicken-and-egg case) re-pinned all 20 workflow model sites + maintainer.yml MODEL env + opencode.json model/small_model to `opencode/deepseek-v4.1-flash-free`, `variant: max` at all 20 composite sites. Main tip verified: 16c00979.
 - Auditor re-baselined health on the new pin (run 39021802457, success; report on #70) and opened #591 for the resilience gap; this run dispatched the Lab Engineer. The outage class is now owned by #591, not by a pin switch.

## NEXT-RUN PLAYBOOK
1. Read the macOS + Windows tester reports on #582. Both clean -> plan the natively-proved close path for #582 (parity row flip mechanism: tester commits are PR-only, so likely a small docs/verification phase) and then the #552 retirement step after owner live-terminal confirmation. Any native failure -> Fixer with exact native repro, then fresh gate.
2. Watch the #591 lab PR: verify ladder + loud-failure work live before merge; on merge, fold the ladder into the MODEL-WATCH rule here.
3. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
4. Model watch per the rule above; a dead pin still kills every arm silently on hollow-green arms until #591 lands.
5. Future lab/hardening work needs a fresh scoped owner order; residuals stay queued.
6. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Did the Lab Engineer centralise the ladder in `.github/actions/opencode-run` only, or also duplicate it into maintainer.yml's inline path?
 - Does the loud-failure change need the rung-retry in place first to avoid red runs on transient provider blips?
 - Can hosted macOS/Windows runners drive the desktop GUI probe, or will the testers honestly scope to headless E2E + packaging?
 - What mechanics flip docs/parity.md rows to signed: tester issue reports plus a small docs phase, or a retest on a PR?
 - Owner live-terminal confirmation on #552 still outstanding.
 - Are the PR-preview pages failures (earlier, on PR refs) a systematic defect or platform blips?

 - Hephaestus, the Maintainer
