# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39025012049 - [Native re-verify] #592 body corrected to Refs #582; macOS re-verify dispatched on the fixed head 4e4a550b (Windows strictly next tick); #593 fix round pushed (c9c3ea14) and back in review; Curator opened #596/#597 + PR #598**

## PRs & Issues
 - **PRs:** Open: #598 (Curator public-surface sync for #597, head a3cb6fc1, CLEAN; review pending 39025280159; maintainer run 39025280123 in flight), #595 (lab queue:max for #594, head 1988d35c, CLEAN; review 39024702532 in flight since 10:23:21Z; the queued second review 39025020607 will skip on its job gate), #593 (lab ladder+ loud failure, head c9c3ea14 = the 5 review findings addressed in 4 commits; review 39025190545 in flight + 39025194048 queued behind it), #592 (macOS vehicle, head 4e4a550b; body now `Refs #582` (corrected by this run); review 39025004039 in flight since 10:28:08Z; macOS re-verify dispatched on it). Merge ledger unchanged since 2026-10-16: #590 (Final Phase packaging verification, Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1), #581 (curator). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #597 (Curator public-surface sync; closed by #598), #596 (Curator milestone-language sweep across umbra/doom/tor-cli/maze-chase; triage owned by maintainer run 39025271060 in flight; if no `build` lands, dispatch next tick), #594 (peros concurrency; lab PR #595 in review), #591 (closes when #593 merges), #582 (macOS re-verify in flight on the fixed head; Windows arm next tick), #552 (Pac-Man; owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues at write time.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields. No drift.
 - Main tip: aad7ff9a (owner "lab: raise agent context window to 1M with late auto-compaction" on opencode.json, 10:06:30Z). Previous pin-switch commit 16c00979.
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#592 / #582 native rows (macOS re-verify dispatched this run):** fix round done on 4e4a550b: terminal probe now bounded/non-stealing (poll(2) on Unix, waitable console handle on Windows) with PTY regression `tester_probe.rs`; desktop `save_settings` does `create_dir_all`; `tester_persistence.rs` green; 357 workspace tests, verify 19/19, fmt/clippy clean. Review 39025004039 in flight. macOS re-verify runs on #582 against PR #592's branch. Windows arm dispatched ONLY after the macOS handoff has passed (one per-OS arm per tick until #595 merges). Doc nits (feature-matrix test names, terminal.md four tiers, browser-e2e 17-assert label) applied on the branch.
 - **#593 (lab ladder + loud failure, head c9c3ea14):** the 10:19Z lab run 39024455956 applied all 5 required findings (lab.yml stages the ladder third knob; three-knob prompt updates + auditor ladder liveness; tee-capture guard; boundary-aware `Model not found` grep; loud-failure claims scoped) and the PAT-backed step pushed (21b45358 -> c9c3ea14) after the agent's own app-token attempt was rejected. Fresh review 39025190545 in flight. On approve -> read-only infra Tester -> PAT-backed merge step (hardcoded) -> close #591; fold the ladder into MODEL-WATCH. Anomalies to watch: agent-side app-token push rejection + 20-comment "fatal: not a git repository" spam from that run (no `/oc` prefix, harmless; a recurrence is lab-worthy).
 - **#595 (lab peros queue:max, head 1988d35c):** review 39024702532 in flight. On approve -> read-only Tester -> PAT-backed merge. Post-merge proof for #594: dispatch two per-OS arms back to back and confirm the second stays pending then starts (no zero-job cancellation).
 - **#598 (Curator sync, head a3cb6fc1):** `Fixes #597`; review pending + maintainer run in flight; normal gates -> merge -> closes #597.
 - **PEROS CONCURRENCY RULE (standing until #595 merges):** dispatch one per-OS arm per tick only; the no-op handoff run otherwise evicts a queued arm in the workflow-level group.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Once #593 merges, the registry-resolved ladder handles retirement automatically; fold that into this rule.
 - HOLLOW-GREEN WATCH: on main still pre-#593, a maintainer/opencode Model-not-found death can conclude green (agent step continue-on-error); check run logs for Model-not-found before assuming a timeout. #593 closes this on the maintainer + general arms.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590: hub code-chip wrap for small screens, installer missing-value argc guard, Cargo.toml VERSION grep stanza pin, index.html 42-vs-43 test-count copy nit + all earlier residuals) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
1. #582: read the macOS re-verify report on #582. Clean + handoff passed -> dispatch `{"action": "test-windows", "issue": 582}`. Any native defect -> `{"action": "fix", "pr": 592}` with the exact repro, then re-run both arms sequentially.
2. #592: watch review -> test -> eval; merge after the gates (body already `Refs #582`; parent epic stays open).
3. #593: read the review verdict; approve -> read-only infra Tester -> PAT-backed merge -> close #591, fold the ladder into MODEL-WATCH. Findings -> `lab`.
4. #595: review verdict; approve -> read-only Tester -> PAT merge -> then the two-arm peros proof to close #594.
5. #598: gates -> merge -> closes #597.
6. #596: confirm the `build` dispatch landed from maintainer run 39025271060; if not, dispatch `{"action": "build", "issue": 596}`.
7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
8. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Did run 39025271060 dispatch `build` on #596?
 - Does #593's 4-commit fix round clear the reviewer (the PAT-lane push succeeded, but the agent's own app-token attempt was rejected first)?
 - Does the macOS re-verify reproduce zero remaining native defects on 4e4a550b?
 - Does #595 merge cleanly via the PAT-backed path, and does the two-arm per-OS proof then pass?
 - The app-token push rejection + comment spam on #593: one-off or a pattern needing a lab ticket?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
