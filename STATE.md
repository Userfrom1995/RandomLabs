# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39023486016 - macOS native report triaged: both defects confirmed, Fixer dispatched on PR #592; #594 infra issue filed by the #593 tick; native re-verify plan set**

## PRs & Issues
 - **PRs:** Open: #593 (lab: model fallback ladder + loud Model-not-found failure for #591; review run 39023474710 in flight on head 21b45358), #592 (macOS tester evidence + committed failing `crates/desktop/tests/tester_persistence.rs` at b56b9879; 2 confirmed defects; `fix` dispatched this run; body says Closes #582 which MUST be converted to Refs #582 before merge). Merge ledger unchanged since 2026-10-16: #590 (Final Phase packaging verification + release audit for #582, eval head 68b27b09, merged f1ecb537 via --rebase, branch kept; Refs #582), #589..#581. Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #594 (NEW infra: per-OS workflow-level concurrency silently cancels a queued arm; created 10:13:34Z by run 39023493495; self-triage maintainer run 39024084910 in flight; NO /oc lab comment yet), #591 (ladder; PR #593 in review), #582 (Rust-migration parent epic; macOS rows evidenced, Windows arm never ran), #552 (Pac-Man; awaiting owner live-terminal confirmation), #70 lab-health, #42 brainstorm standing only.
 - **Boards:** #70/#42 standing. `workflows:` allowlist 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields. Main tip: aad7ff9a (lab context-window commit to opencode.json, pushed 10:06:30Z; Pages deploy green). macOS tester native run 39021802900 success; Windows run 39021803178 cancelled with zero jobs (see #594).

## IN FLIGHT
 - **PR #592 (fix dispatched this run 39023486016):** `/oc fix` on #592. Scope: (1) terminal `probe_sixel_live` orphan blocked `stdin().read()` thread steals the first keypress after the 250 ms DA1 timeout (crates/terminal/src/main.rs:79-100); (2) desktop `save_settings` must create the config dir (crates/desktop/src/app.rs:144-147) so `crates/desktop/tests/tester_persistence.rs` (b56b9879) goes green; (3) low-priority doc nits from the macOS report (feature-matrix.md test names, terminal.md "three render tiers", browser-e2e label). The fix workflow posts `/oc review` after its push. Concurrent #582 tick 39023056719 was still in progress at survey and may also dispatch; duplicates tolerable, dedupe against a new `/oc fix` if visible.
 - **#593 (lab) review:** run 39023474710 in flight (head 21b45358); do not dispatch anything on #593 (triage note posted by run 39023493495); do not merge without live proof of the ladder and the loud-failure path. Post-merge watch: the loud verify reds the redundant bot-actor `pull_request` arm on every bot PR event (it was hollow-green before); resolution is the #427 preflight (PR #429 closed unmerged) or documenting red-per-bot-PR as the intended signal. On merge, fold the ladder into MODEL-WATCH here.
 - **#594 (infra):** self-triage run 39024084910 should route `lab`. Do not duplicate. If no `/oc lab` comment exists on #594 by the next tick, dispatch `{"action": "lab", "issue": 594}`.
 - **Sequential native re-verify plan for #582 (after the fix lands on #592):** run the macOS and Windows arms strictly one per maintainer tick; two at once always lose the queued arm to the completion handoff (exactly what killed Windows 39021803178). macOS first (re-verify defects 1 and 2 natively + reconfirm rows), then Windows (first native pass). While PR #592 is open the testers target its branch (the `opencode/issue582-*` resolution); after merge they target main.
 - **Merge gate note for #592:** before merging, convert `Closes #582` to `Refs #582` in the PR body (bot-side `gh pr edit`) so the parent epic is not auto-closed; #582 closes only after Windows rows and the parity flip.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}` (the fallback ladder is #593's deliverable; until it lands the manual rule stands). Never self-edit workflows/prompts/config.
 - HOLLOW-GREEN WATCH: main's maintainer.yml still lacks the loud verify (it lands with #593); until then a no-decision-file tick means check the run log for Model-not-found vs timeout.
 - Evaluator follow-ups + all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases.
 - IP hold (standing). Standing-board close guard: #70 and #42 never carry `Closes` in a PR body.

## OUTAGE & RECOVERY (2026-10-17, closed; structural follow-up on #591, PR #593)
 - Provider retired `opencode/muse-spark-1.3-contributor-free` ~03:25Z; every arm died Model-not-found, six deaths concluded hollow-green. Recovery commit 16c00979 (owner-applied) repinned all arms to `opencode/deepseek-v4.1-flash-free` + `variant: max`. This run (39023486016) is on the new pin. The outage class is owned by #591 / PR #593.

## NEXT-RUN PLAYBOOK
 1. After the Fixer pushes on #592: review should auto-run (fix workflow posts `/oc review`); confirm the committed test goes green on the branch; do not re-dispatch review.
 2. When the fix push is in and gates are clear: dispatch `test-macos` on #582 (one tick), then `test-windows` on #582 on a later tick (strictly sequential, one per tick). Both target the fixed #592 branch.
 3. Watch #594: self-triage should dispatch `lab`; dedupe against the `/oc lab` comment.
 4. Watch #593 review; merge only with live proof; then fold the ladder into MODEL-WATCH and settle the bot-actor red question.
 5. #552 closes only on owner live-terminal confirmation. Never auto-close on Refs.
 6. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Will the Fixer take the macOS report's doc nits, or must the Curator be routed for them?
 - Does the #593 review fold in the #427 preflight, or is a scoped follow-up needed for the red bot-actor arm after merge?
 - Parity row flip mechanics: tester evidence plus a small docs phase, or a retest on a PR?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
