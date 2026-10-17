# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39036290010 - [MERGE tick on #592: Evaluator approved 9.8/10, merged at 9422b4eb; native macOS + Windows re-runs dispatched in parallel on the final head; desktop-defect issue created]**

## PRs & Issues
 - **PRs:** Open: **#604** (lab: unshallow PAT merge workspace, `Fixes #602`, head **cb82ffa8** after the fix round, CLEAN/MERGEABLE; concurrent maintainer run 39036533607 in flight forwarding the re-review). **#592 MERGED 13:24:25Z** (`9422b4eb` rebase merge by the bot session, branch kept intact, `Refs #582`, content byte-identical to evaluated `4ed7b50c`). Merge ledger 2026-10-17: #592, #603, #593, #600, #599, #598, #595, #581. Main tip: **9422b4eb**.
 - **Issues:** Open: **#582** (native proof in flight: macOS + Windows arms dispatched on the merged head; parity rows + #552 retirement remain), **#602** (fix in review on #604), #552 (owner live-terminal confirmation; last activity 2026-10-16T08:57Z; 7-day human rule not due), #70, #42, plus **NEW desktop-defect issue created this run** (silent exit 0 on window-creation failure; `--fullscreen --probe` pre-resize race; self-triage dispatched on creation, route `build` if still untriaged next tick). Closed today: #601, #591, #596, #597, #594.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit this run: 19 entries in maintainer.yml `workflows:` vs 19 live repo-owned non-maintainer workflow `name:` fields, exact match both directions. Failure sweep: zero failure/timed_out/startup_failure since 12:37Z; zero held `action_required` runs. Queued: only the four documented zombies (issue532/lab-427/two pr-trigger arms).
 - **Post-merge verification (this run):** merge commit `9422b4eb`; `git diff 4ed7b50c origin/main -- maze-chase progress/582-maze-chase-rust-migration.md` empty; Pages redeploy triggered by the hardcoded "Trigger pages deployment if main advanced" step (dispatch run 39036532649 in progress 13:26:02Z; bot-token merges emit no push runs, hence the explicit dispatch).

## IN FLIGHT
 - **NATIVE ARMS (dispatched this run):** `/oc test-macos` + `/oc test-windows` on #582; both resolve to `main` (9422b4eb) now that no open `opencode/issue582-*` PR exists. Watch the Windows arm against its 90-min budget; a repeat silent death on the final head routes `lab` (raise timeout / trim scope), never a third blind retry. On pass: sign the parity rows, then the final retirement pass (#552, `Closes #582` reserved for it).
 - **#604 LAB (in flight):** fix round pushed `cb82ffa8`; concurrent maintainer run 39036533607 (issue_comment on #604) is forwarding the re-review; then read-only infra Tester -> PAT-backed merge -> closes #602.
 - **NEW DESKTOP-DEFECT ISSUE (created this run):** window-creation failure exits 0 silently (`maze-chase/crates/desktop/src/window.rs:60-64`) plus `--fullscreen --probe` pre-resize capture race (Evaluator residual 4). Self-triage dispatched; route `{"action": "build", "issue": <N>}` if still untriaged next tick. UNTRIAGED marker: created 2026-10-17 run 39036290010.
 - Evaluator residual 2 (terminal.md Windows in-window non-character caveat): tighten after the Windows arm lands.
 - Evaluator residual 5 (scoreboard.md "macOS native pass re-ran the current harness green" wording; substantively verified): Curator's natural pass.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; ladder `.github/actions/opencode-run/model-ladder.txt`; R15 guards it. A dead rung or a better free model -> `lab`.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: merge-base verified non-empty before the #592 merge.
 - Bot-actor pull_request arm (post-#593): opened/closed bot-PR events can go red under the loud-failure verify; held runs await the PAT sweep (normal). Design question (clean no-op vs documented red-per-bot-PR) open with the reviewer (#427).
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #582: read the macOS + Windows native reports on the merged head (`9422b4eb`). Both green -> dispatch the final retirement pass (parity rows signed; #552 retirement; only that final run uses `Closes #582`). Any defect -> `fix` (project) or `lab` (infra) followed by a re-verify.
 2. #604: read the post-fix review on `cb82ffa8`; approve -> read-only infra Tester -> PAT merge; closes #602.
 3. New desktop-defect issue: confirm triage routed it; if untriaged -> `{"action": "build", "issue": <N>}`.
 4. #552 owner live-terminal confirmation outstanding (7-day human rule).
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Do both native arms pass on the merged head `9422b4eb`, and does the Windows arm finish inside its 90-minute budget?
 - Does #604's post-fix review clear `cb82ffa8` in one round?
 - Does the new desktop-defect issue get routed to a build next tick?

 - Hephaestus, the Maintainer
