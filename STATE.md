# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39025556596 - [In-flight tick] #592 fix handoff (head 582de170) re-review + macOS re-verify running; #595 approved, read-only test in flight; #593 re-review + lab post-mortem in flight; #598 review in flight; #596 build dispatched; decisions `[]`, allowlist exact match**

## PRs & Issues
 - **PRs:** Open: #598 (Curator sync for #597, head a3cb6fc1, CLEAN; review 39025270632 in progress + 39025280159 queued duplicate), #595 (lab queue:max for #594, head 1988d35c, CLEAN; reviewer APPROVED 10:36:02Z after reproducing the live incident; read-only infra test 39025520459 in progress; hardcoded PAT merge step handles the workflow-touching merge), #593 (lab ladder + loud failure, head c9c3ea14, CLEAN; re-review 39025190545 in progress; lab post-mortem dispatched 10:40:05Z on a NEW branch, barred from touching this one mid-review), #592 (macOS vehicle, head 582de170 = 4e4a550b tree + empty commit; re-review 39025545456 in progress; macOS re-verify 39025499533 in progress, ETA ~10:56Z). Merge ledger since 2026-10-16: #590 (Final Phase packaging verification, Refs #582), #589/#588/#587/#586/#585/#584/#583 (Phases 7 down to 1), #581 (curator). Full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #597 (closes via #598), #596 (build dispatched 10:37:09Z, opencode 39025589665 queued; dedicated docs PR), #594 (closes via #595), #591 (closes via #593 + ladder fold), #582 (macOS re-verify in flight; Windows arm strictly after its handoff), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries, exact set match re-verified this run vs live non-maintainer workflow `name:` fields. No drift.
 - Main tip: aad7ff9a (owner "lab: raise agent context window to 1M with late auto-compaction" on opencode.json). Previous pin-switch commit 16c00979.
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#592 / #582 native rows:** fix round on 4e4a550b (bounded non-stealing terminal probe + PTY regression `tester_probe.rs`; desktop `create_dir_all` + `tester_persistence.rs` green; 357 workspace tests, verify 19/19, fmt/clippy clean). Review found only the PR-body `Closes #582` (corrected by the 10:35Z run); Fixer pushed empty commit 582de170 to satisfy the push gate; re-review 39025545456 running; macOS re-verify 39025499533 running on the fixed head. Windows arm dispatched ONLY after the macOS handoff passes (one per-OS arm per tick until #595 merges).
 - **#595 (lab peros queue:max, head 1988d35c):** APPROVED 10:36:02Z (reviewer reproduced the live incident and verified the fix); read-only infra test 39025520459 in flight. On `/oc approve-test` -> hardcoded PAT merge step (maintainer.yml:697) -> close #594 -> run the two-arm peros proof (dispatch two per-OS arms back to back; the second must stay pending then start).
 - **#593 (lab ladder + loud failure, head c9c3ea14):** re-review 39025190545 in flight (+queued dup 39025194048). A lab post-mortem is in flight (run 39025773224) on a NEW branch for the agent self-push app-token rejection + 19-comment subagent error storm; it must not touch this branch mid-review. On approve -> read-only infra Tester -> PAT-backed merge -> close #591; fold the ladder into MODEL-WATCH.
 - **#598 (Curator sync, head a3cb6fc1):** `Fixes #597`; review 39025270632 in flight. Gates -> merge -> closes #597.
 - **#596 (milestone-language sweep):** build dispatched 10:37:09Z (opencode 39025589665 queued), dedicated docs PR, explicitly not #592. Watch for a maze-chase docs conflict with #592's doc edits at merge time.
 - **PEROS CONCURRENCY RULE (standing until #595 merges):** dispatch one per-OS arm per tick only; any new comment on the issue queues a no-op peros run that evicts a PENDING arm (the 09:57Z Windows loss).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Once #593 merges, the registry-resolved ladder handles retirement automatically; fold that into this rule.
 - HOLLOW-GREEN WATCH: on main still pre-#593, a maintainer/opencode Model-not-found death can conclude green (agent step continue-on-error); check run logs for Model-not-found before assuming a timeout. #593 closes this on the maintainer + general arms.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590: hub code-chip wrap for small screens, installer missing-value argc guard, Cargo.toml VERSION grep stanza pin, index.html 42-vs-43 test-count copy nit + all earlier residuals) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases, docs, or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; no required check affected. Auditor territory if it recurs.

## NEXT-RUN PLAYBOOK
 1. #582: read the macOS re-verify report when 39025499533 lands (~10:56Z). Clean + handoff passed -> `{"action": "test-windows", "issue": 582}` (one arm, now safe). Any native defect -> `{"action": "fix", "pr": 592}` with the exact repro, then re-run both arms sequentially.
 2. #595: on `/oc approve-test` the hardcoded PAT merge step lands it; then the two-arm peros proof closes #594.
 3. #593: re-review verdict; approve -> read-only infra Tester -> PAT merge -> close #591, fold ladder into MODEL-WATCH. Read the lab post-mortem branch/PR when it appears.
 4. #598: gates -> merge -> closes #597.
 5. #592: re-review -> test -> eval -> merge after the gates (body already `Refs #582`; parent stays open).
 6. #596: watch the build's docs PR; check maze-chase docs overlap vs #592 before merging either.
 7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 8. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the macOS re-verify reproduce zero native defects on the fixed head 582de170?
 - Does the #592 re-review (39025545456) clear it now that its only finding (PR body) is fixed?
 - Does #593's 4-commit fix round clear its re-review?
 - Does #595's read-only Tester approve, and does the PAT-backed merge step land cleanly?
 - What does the #593 lab post-mortem conclude about the agent self-push pattern and the subagent comment storm?
 - Will #596's docs PR and #592 overlap on maze-chase docs and need a rebase?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
