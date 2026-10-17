# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39025271060 - Milestone-language sweep #596 triaged and dispatched to the Builder; four PRs (#592, #593, #595, #598) all carry review runs in flight under sibling maintainer sessions; allowlist 19/19 verified**

## PRs & Issues
 - **PRs:** Open: #598 (Curator public-surface sync, Fixes #597; head a3cb6fc1; review 39025270632 in progress + 39025280159 pending; sibling maintainer 39025280123 owns its /oc maintainer handoff), #595 (lab peros `queue: max` + R14, #594; head 1988d35c, CLEAN; review 39025020607 pending; sibling 39025020573 posted decisions [] and a triage note - do not duplicate), #593 (lab ladder + loud failure, #591; head c9c3ea14 carries the five review fixes as d575dbff..c9c3ea14; re-review 39025190545 in progress + 39025194048 pending; sibling 39025194056 owns), #592 (macOS report for #582; both defects fixed at head 4e4a550b; review 39025004039 in progress + 39025011904 pending; sibling 39025012049 owns).
 - **Issues:** Open: #596 (Builder swept dispatched this run), #597 (covered by PR #598, Fixes #597), #594 (lab PR #595 in review), #591 (closes when #593 merges), #582 (native parity rows; macOS fix landed, Windows arm re-dispatch pending), #552 (Pac-Man; owner live-terminal confirmation outstanding), #70 lab-health, #42 brainstorm. No untriaged issues remain.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` allowlist: 19 entries, exact set match re-verified this run against the 19 live non-maintainer workflow `name:` fields. No drift.
 - Main tip: aad7ff9a (unchanged; owner opencode.json context commit).
 - Design v2 (Harbor Overlay System v2) spec + tokens on main (PR #536).

## IN FLIGHT
 - **#596 sweep (Builder dispatched this run):** one docs PR across umbra, doom, tor-cli, maze-chase; replace milestone codes with capability names, rewrite per-milestone headers as unified product sections, mark historical ledger rows final. Overlap with #592 is limited to maze-chase/docs/feature-matrix.md + docs/scoreboard.md adjacent rows; rebase if #592 merges first.
 - **#598 (Curator sync, Fixes #597):** review in flight; docs class -> Reviewer + live Tester approve-test -> merge; closes #597. The bot-actor PR arm's red `maintainer` check / "no write permissions" comment is the #591 loud-failure contract firing (expected), not a defect.
 - **#593 (lab ladder + loud failure, #591):** branch already carries the five review fixes (head c9c3ea14); re-review in flight. Do not merge without approve-test; merge via the PAT-backed step (workflow-touching PR). On merge: fold the ladder into MODEL-WATCH, close #591.
 - **#595 (lab peros `queue: max` + R14, #594):** review in flight; infra PR -> read-only Tester -> PAT-backed merge. On merge: verify two per-OS arms dispatched together both survive (durable peros concurrency proof).
 - **#592 (macOS report) + #582 native rows:** both defects fixed and pushed (head 4e4a550b), review in flight. After approval/test: dispatch test-macos first, then test-windows strictly sequentially (one per tick) on the fixed head; findings -> fix.
 - **NEW WATCH (this run):** lab run 39024455956 ended success and its PAT push landed, but it emitted 20 duplicate `fatal: not a git repository` comments on #593 (action auto-commit retry loop; app-token push was rejected first). If it recurs or goes unaddressed, file a lab issue next tick.
 - **PEROS CONCURRENCY RULE (standing):** one per-OS arm per tick; a second concurrent arm's queued run was displaced under GitHub's one-pending-slot rule (Windows 39021803178). Durable fix in PR #595.
 - TEST-CRASH RULE (standing): a silent test death (no decision file, no Tester comment) retries once; a second consecutive silent death routes `lab`; never a third.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin; retry once on death/rate-limit, then route `{"action": "lab"}`. Fold the #593 registry ladder in once it merges.
 - HOLLOW-GREEN WATCH: pre-#593 a Model-not-found death could conclude green; #593 closes that on the maintainer + general arms. The loud-failure contract already fires on bot-actor PR arms (#593/#595/#598 show the permissions-refusal red check).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Evaluator/gate calibration unchanged: docs-class merges on Reviewer + Tester approve-test; product/research/phase deliverables require the binding approve-eval. Test-only Tester commits do not void a review gate.
 - Infra routing guard active: any `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` work routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to intermediate Refs phases or lab PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.

## NEXT-RUN PLAYBOOK
1. #596: watch the Builder sweep PR (docs class: review -> test -> approve-test -> merge, closes #596); rebase if #592 merged first.
2. #592/#582: read the review verdict; on approve, ensure test-macos lands first, then test-windows once the macOS handoff has passed (sequential rule). Findings -> fix.
3. #593: read the re-review verdict; approve -> read-only infra Tester -> PAT merge -> fold the ladder into MODEL-WATCH, close #591.
4. #595: read the review verdict; approve -> read-only Tester -> PAT merge; then verify two per-OS arms survive together.
5. #598: read the review verdict; approve -> test -> merge; closes #597.
6. Watch the lab-run comment-spam class; file a lab issue only if it recurs or stays unaddressed.
7. #552 closes only on owner live-terminal confirmation; never auto-close on `Refs #552`.
8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the sweep land before #592 merges, and does the maze-chase docs overlap auto-merge or need a rebase?
 - Does the peros fix settle on `queue: max` (PR #595 direction) or a dropped workflow-level group?
 - Does the reviewer want the bot-actor `pull_request` maintainer arm made a clean no-op inside #593 (revive #427/#429's preflight) or accept red-per-bot-PR as the loud signal?
 - Does the Windows native arm on the fixed #592 head surface its own defects beyond the macOS pair?
 - Does the action repeat the raw-stderr comment spam on another failed internal auto-commit?
 - Owner live-terminal confirmation on #552 still outstanding.

- Hephaestus, the Maintainer
