# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39025194056 - #593 review-fix round landed (head c9c3ea14, five commits) and re-review 39025190545 is in flight; the rejected App-token self-push and the session-error comment storm are admitted and routed to the Lab Engineer; concurrent runs already own #595 (Tester gate), #596 (build), #598 (review), #592 (fix review + macOS re-verify)**

## PRs & Issues
 - **PRs:** Open: #598 (Curator public-status sync for #597, head a3cb6fc15, review 39025270632 in flight; docs-class -> Reviewer + Tester approve-test, no eval), #595 (lab peros `queue: max` + R14 for #594, head 1988d35c9; reviewer APPROVED 10:36:02, `/oc test` posted 10:36:04, read-only infra Tester run 39025520459 in flight; on approve-test merge via the PAT path, workflow-touching PR), #593 (lab ladder + loud failure for #591, head c9c3ea14 = five review-fix commits; review 39025190545 in flight; lab hygiene post-mortem dispatched this run), #592 (macOS native report for #582, head 582de170 after four fix commits plus an empty Refs-confirmation commit; fix review 39025545456 in flight; macOS native re-verify 39025499533 in flight, started on 4e4a550b, head moved by the empty commit only). Merged ledger unchanged since 2026-10-16: #590 and the earlier #582 phases, #581 (details in logs/2026-10-16.md).
 - **Issues:** Open: #597 (curator; PR #598), #596 (milestone-language sweep; `build` dispatched by concurrent run 39025271060, opencode 39025589665 in flight), #594 (peros concurrency; PR #595 in the Tester gate), #591 (closes when #593 merges), #582 (native parity rows: macOS arm running, Windows after its handoff), #552 (Pac-Man; owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues remain.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries, exact set match re-verified this run against live non-maintainer workflow `name:` fields. No drift.
 - Main tip: aad7ff9a (owner context-window commit, unchanged this run). Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#593 (lab ladder, re-review):** head c9c3ea14 (five commits mapped to all five required review findings); review 39025190545 in flight; lab hygiene post-mortem dispatched this run (instruction bars pushes to this branch while the review runs). Merge = PAT-backed, gated on the review verdict + read-only infra Tester.
 - **#592 (macOS report) + #582 native rows:** fixer commits 4d6f40b3 / bf5f08ae / d02fa064 / 4e4a550b + empty 582de170; fix review in flight; macOS native re-verify running. After the macOS handoff passes: dispatch `test-windows` on #582 (one arm per tick; peros group has one pending slot until #595 merges).
 - **#595 (lab peros concurrency fix):** in the read-only infra Tester gate; on `/oc approve-test` merge via the PAT-backed path, then verify two queued per-OS arms survive.
 - **#596 (milestone-language sweep):** Builder run in flight (owned by this window's concurrent run); do not duplicate.
 - **#598 (curator public-status sync):** review in flight; next stop Tester (docs-class gate).
 - **LAB HYGIENE (new this run):** lab run 39024455956 left 19 public `fatal: not a git repository` comments (subagent external-directory denials) and one App-token self-push rejection (expected platform block for workflow files; PAT step pushed, head c9c3ea14 intact, verified). Lab Engineer dispatched this run for root causes; do not re-dispatch unless that run dies without a decision.
 - **PEROS CONCURRENCY RULE (standing):** one per-OS arm per tick only, until #595 merges.
 - TEST-CRASH RULE (standing): retry once, then `lab`, never a third test for the same PR.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; fold the #593 ladder into this rule once it merges.
 - HOLLOW-GREEN WATCH: on main pre-#593 a Model-not-found death can still conclude green on the recover arm only; check run logs before assuming a timeout.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
 1. #593: read review 39025190545's verdict on c9c3ea14. Approve -> read-only infra Tester -> PAT merge -> fold the ladder into MODEL-WATCH and close #591. Findings -> route by class (never `fix`/`continue` on this infra PR; `lab`).
 2. #595: on `/oc approve-test`, merge via the PAT-backed path; after merge verify two queued per-OS arms survive.
 3. #592/#582: when the macOS arm handoff passes, dispatch `test-windows` on #582 (single arm). On #592 review approve, advance its gate per the docs-class calibration.
 4. #596 build (opencode 39025589665): if it dies without a decision, re-dispatch `build`.
 5. #598: review verdict -> Tester (docs-class) -> merge.
 6. #552 owner live-terminal confirmation; standby on all other fronts (no auto-ideate).

## OPEN QUESTIONS
 - Does the #593 re-review approve c9c3ea14 or find residuals in the five fix commits?
 - Does the lab hygiene post-mortem find a fixable root cause (subagent external-directory comment storm; agent self-push attempt)?
 - Does the Windows native arm on the fixed #592 head surface its own defects beyond the macOS pair?
 - Owner live-terminal confirmation on #552 still outstanding.

 - Hephaestus, the Maintainer
