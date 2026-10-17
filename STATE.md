# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39025280123 - bot-PR wake-up on #598 (Curator docs sync): review in flight, decisions `[]`; five concurrent maintainer runs surveyed, zero duplicate dispatches**

## PRs & Issues
 - **PRs:** Open: **#598** (Curator public-surface sync, head a3cb6fc1, CLEAN, `Fixes #597`; review 39025270632 in flight since 10:32:14; docs-class -> Reviewer approve -> auto `/oc test` -> merge), **#595** (lab peros `queue: max` + R14 for #594, head 1988d35c, Reviewer APPROVED 10:36:02 -> read-only infra Tester `/oc test` posted 10:36:04 -> PAT-backed merge pending; `Refs #594`), **#593** (lab model-fallback ladder + loud failure for #591, head c9c3ea14 after the review-fix round; review 39025190545 in flight; maintainer run 39025194056 in progress; **merge only via PAT-backed step**, workflow-touching), **#592** (macOS native report vehicle, fix head 4e4a550b; re-review 39025545456 in flight; body corrected to `Refs #582` by concurrent run 39025012049 at 10:35:39; test-macos dispatched 10:35:44 on the fixed head). Merges today: none (last merge 2026-10-16; ledger in logs/2026-10-16.md).
 - **Issues:** Open: #597 (Curator tracking, closes with #598), #596 (milestone-language sweep; concurrent run 39025271060 dispatched `build` at 10:37:04), #594 (closes only after #595 merges AND a live two-arm dispatch proves `queue: max`), #591 (closes when #593 merges), #582 (native parity rows; macOS re-verify running, Windows next), #552 (owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues remain.
 - **Boards:** #70 lab-health (auditor daily report 09:45; the two 03:25-03:28Z self-heal escalations already answered), #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields. No drift.
 - Main tip: aad7ff9a (owner "lab: raise agent context window to 1M with late auto-compaction", 10:06:30Z, opencode.json only). Previous 16c00979.
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#595 (peros concurrency fix, APPROVED, in Tester):** infra PR, read-only Tester gate then PAT-backed merge. Do not merge before `/oc approve-test`. After merge: verify back-to-back per-OS arms both survive (second observed pending then starting, no zero-job cancel), then close #594.
 - **#593 (lab ladder + loud failure, in review round 2):** head c9c3ea14; review 39025190545 in flight. The lab run's App-token push was refused (`workflows` permission) and the PAT-backed step landed the commit; the same run spammed 23 duplicate `fatal: not a git repository` comments on #593 (watch item below). On merge: fold the ladder into MODEL-WATCH, close #591. Infra routing guard applies (never fix/continue).
 - **#592 (macOS report) + #582 native rows:** fix landed (head 4e4a550b) with both regression suites green; re-review in flight; test-macos running on the fixed head. Windows arm STRICTLY next tick after the macOS handoff passes (sequential rule).
 - **#598 (Curator docs sync):** review in flight; docs-class merge path (Reviewer -> Tester approve-test -> merge); closes #597.
 - **#596 (milestone-language sweep):** Builder dispatched; watch for the resulting PR (docs-class, normal merge path).
 - **BOT-PR ARM NOISE (known, tracked in #593):** every bot-PR `pull_request` event spawns a maintainer arm that refuses the bot actor and posts "User github-actions[bot] does not have write permissions" (39024702094 on #595, 39025248303 on #598). Open question: revive #427/#429 preflight vs accept red-per-bot-PR.
 - **PEROS CONCURRENCY RULE (standing until #595 is live-proven):** dispatch one per-OS arm per tick only.
 - **LAB COMMENT SPAM WATCH (new):** run 39024455956 posted 23 duplicate git-error comments on #593; recurrence of that error-comment loop routes `lab`/`auditor` (deferred once).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Once #593 merges, the registry-resolved ladder handles retirement automatically; fold that into this rule.
 - HOLLOW-GREEN WATCH: on main pre-#593, a maintainer/opencode Model-not-found death can conclude green; check run logs for Model-not-found before assuming a timeout. #593 closes this on the maintainer + general arms.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590: hub code-chip wrap for small screens, installer missing-value argc guard, Cargo.toml VERSION grep stanza pin, index.html 42-vs-43 test-count copy nit + all earlier residuals) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
 1. #598: Reviewer approve -> automatic `/oc test` -> merge (docs-class) -> close #597. If findings -> Fixer.
 2. #595: `/oc approve-test` -> PAT-backed merge -> then verify the two-arm proof and close #594; on rejection -> route by finding class (infra -> lab).
 3. #593: read the review verdict on c9c3ea14; approve -> read-only Tester -> PAT merge -> close #591 and fold the ladder into MODEL-WATCH; findings -> `lab` (infra PR).
 4. #592/#582: after macOS re-verify and review complete, dispatch `test-windows` next tick (sequential); both green -> plan the natively-proved close of #582 (parity rows).
 5. Watch the #596 Builder sweep PR.
 6. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 7. Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does `queue: max` survive the real two-arm test after #595 merges?
 - Does the reviewer want the bot-actor `pull_request` maintainer arm made a clean no-op inside #593 (revive #427/#429's preflight) or accept red-per-bot-PR as the loud signal?
 - Does the Windows native arm on the fixed #592 head surface its own defects beyond the macOS pair?
 - Is the 23-comment lab error spam a recurring failure path, or did it die with the retired-model pathology?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
