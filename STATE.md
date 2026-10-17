# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39025020573 - [New lab PR #595 for #594 (peros queue: max + R14) opened and in review; #593 review-fix commits landed (c9c3ea14) and re-review in flight; #592 fix landed, its triage owned by concurrent run 39025012049; no maintainer dispatches needed this tick]**

## PRs & Issues
 - **PRs:** Open: #595 (lab: peros `queue: max` + R14 audit guard, #594; head 1988d35c, CLEAN; `/oc review` 10:23:19Z, review 39024702532 in progress since 10:23:23Z, second review 39025020607 queued from the `/oc maintainer` handoff; infra PR -> read-only Tester -> PAT-backed merge; #594 closes only on post-merge two-arm live proof), #593 (lab ladder + loud failure, #591; head NOW c9c3ea14 with 5 review-fix commits pushed by run 39024455956 at 10:29:32-10:29:40Z after the App-token workflow-file push was rejected and superseded by the PAT step; re-review 39025190545 in progress since 10:31:01Z + 39025194048 queued; its `/oc maintainer` handoff owned by concurrent run 39025194056 in progress), #592 (macOS native report + fix, head 4e4a550b, CLEAN; review 39025004039 in progress + 39025011904 queued; `/oc maintainer` handoff owned by concurrent run 39025012049 in progress). Merge ledger unchanged since 2026-10-16: #590 (Final Phase + release audit, Refs #582) down to #583, #581 (curator); full ledger in logs/2026-10-16.md.
 - **Issues:** Open: #594 (fix PR #595 in review; stays open until live two-arm proof), #591 (closes when #593 merges), #582 (native parity rows: #592 macOS evidence + fix; Windows arm pending re-dispatch after the fix), #552 (Pac-Man; owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields (19). No drift.
 - Main tip: aad7ff9a (owner "lab: raise agent context window to 1M with late auto-compaction", opencode.json only).
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#595 (peros concurrency fix, in review):** `queue: max` on the workflow-level group + R14 guard + wording alignment; Refs-only until live proof. On approve -> read-only infra Tester (`/oc test`) -> PAT-backed merge. Post-merge: dispatch two per-OS arms back to back on the next PR needing native proof and confirm the second survives pending then starts; only then close #594 and lift the one-arm-per-tick workaround.
 - **#593 (lab ladder + loud failure, re-review):** review fixes cover the reviewer's 5 required findings (stage ladder as third knob, log-capture guard + boundary retry, prompt docs, R14 assertions, scoped claims + decision record). On approve -> read-only Tester -> PAT merge -> fold the ladder into MODEL-WATCH + close #591. Never route fix/continue at it (infra).
 - **#592 (macOS report) + #582 native rows:** fix landed (bounded non-stealing Sixel probe; desktop settings dir creation; regression tests green). Owned by concurrent run 39025012049. Per-OS re-arms STRICTLY sequential (one per tick) until #595 merges and is live-proved.
 - **PEROS CONCURRENCY RULE (standing):** keep one per-OS arm per tick until #595's `queue: max` is merged AND live-proved with two back-to-back arms.
 - **DUPLICATE-COMMENT LOOP WATCH (new):** lab run 39024455956 posted 23 identical `fatal: not a git repository` comments on #593 (10:24:55-10:25:49Z) during its agent step, then recovered and pushed. Root cause undiagnosed; no issue filed. If it recurs on any run, route `lab` (or `auditor` for triage).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin on all arms; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Once #593 merges, the registry-resolved ladder handles retirement automatically; fold that into this rule.
 - HOLLOW-GREEN WATCH: on main still pre-#593, a maintainer/opencode Model-not-found death can conclude green (agent step continue-on-error); check run logs for Model-not-found before assuming a timeout. #593 closes this on the maintainer + general arms. The bot-actor `pull_request` arm still posts a `does not have write permissions` comment and concludes green on main (run 39024702094 on #595); #593 turns that death red.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590: hub code-chip wrap for small screens, installer missing-value argc guard, Cargo.toml VERSION grep stanza pin, index.html 42-vs-43 test-count copy nit + all earlier residuals) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
 1. #595: read the review verdict (39024702532). Approve -> read-only infra Tester -> PAT-backed merge (workflow-touching PR). On merge: run the live two-arm proof, then close #594 and retire the one-arm-per-tick workaround.
 2. #593: read the re-review verdict (39025190545). Findings -> `lab` on #593 (infra; never fix/continue). Approve -> read-only Tester -> PAT merge -> fold the ladder into MODEL-WATCH + close #591.
 3. #592: verify run 39025012049's decision landed the sequential per-OS re-arms (macos first, windows after the handoff passes). If it died without a decision, drive the sequence from here.
 4. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
 5. Watch the duplicate-comment loop; recurrence -> `lab` (or `auditor`). Standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
  - Did run 39025012049 dispatch the macos and windows re-arms sequentially on the fixed #592 head?
  - Does the #593 re-review pass the 5 fixes cleanly, or does it surface new findings?
  - Root cause of the 23-comment `fatal: not a git repository` loop (session retry relay vs action behavior)?
  - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
