# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39036858939 - [self-triage tick for bot-created issue #605: desktop-defect fix routed to the Builder; #604 re-review + concurrent maintainer in flight; native macOS/Windows arms running on the merged head]**

## PRs & Issues
 - **PRs:** Open: **#604** (lab: unshallow PAT merge workspace, `Fixes #602`, head **cb82ffa8** after the round-1 fix push, CLEAN/MERGEABLE; post-fix re-review run 39036517209 in progress since 13:25:52Z; concurrent maintainer run 39036533607 (target #604) in flight and owns the review-driven path). **#592 MERGED 13:24:25Z** (`9422b4eb`; `Refs #582`; content byte-identical to evaluated `4ed7b50c`). Merge ledger 2026-10-17: #592, #603, #593, #600, #599, #598, #595, #581. Main tip: **9422b4eb** (verified via ls-remote).
 - **Issues:** **#605** (NEW, bot-created 13:30:40Z; desktop defects from the #592 Evaluator residual 4; UNTRIAGED before this run -> `{"action": "build", "issue": 605}` dispatched this tick), **#604/#602** (fix in review), **#582** (native proof in flight: macOS arm 39036858261 in progress, Windows arm 39036859435 pending; parity rows + #552 retirement remain), #552 (owner live-terminal confirmation; last activity 2026-10-16T08:57Z; 7-day human rule not due), #70, #42.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit this run: 19 entries in maintainer.yml `workflows:` vs 19 live repo-owned non-maintainer workflow `name:` fields, exact match both directions. Failure sweep since 12:00Z: only the two known bot-actor `pull_request` maintainer reds (39035736604 on #604's branch 13:14:22Z, 39032429418 on #603's branch 12:25:02Z), both explained on-thread (known #427 class). Zero held `action_required` runs. Queued: the four documented zombie runs.
 - **Pages:** deploy 39036864403 green at 13:30:46Z (post-#592-merge dispatch by run 39036290010's hardcoded step).

## IN FLIGHT
 - **#604 LAB (in flight):** fix round pushed `cb82ffa8` (88ef1364 -> cb82ffa8); re-review 39036517209 live; concurrent maintainer run 39036533607 (issue_comment, 13:26:03Z) reads it. On approval: read-only infra Tester -> PAT-backed merge -> closes #602. Never fix/continue on this infra PR.
 - **#605 BUILD (dispatched this run):** bounded desktop-defect fix (silent exit 0 on window-creation failure via `maze-chase/crates/desktop/src/window.rs:60-64`; `--fullscreen --probe` pre-resize capture race). Guardrails in the issue: desktop crate only, stderr + non-zero exit, byte-stable windowed probe fingerprint, Xvfb fullscreen evidence, headless regressions.
 - **NATIVE ARMS (#582, in flight):** macOS 39036858261 in progress (started 13:30:47Z) + Windows 39036859435 pending, both on `main` = 9422b4eb. Watch the Windows arm against its 90-min budget; a repeat silent death on the final head routes `lab` (raise timeout / trim scope), never a third blind retry. On pass: sign the parity rows, then the final retirement pass (#552, `Closes #582` reserved for it).
 - Evaluator residual 2 (terminal.md Windows in-window non-character caveat): tighten after the Windows arm lands.
 - Evaluator residual 5 (scoreboard.md "macOS native pass re-ran the current harness green" wording; substantively verified): Curator's natural pass.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; ladder `.github/actions/opencode-run/model-ladder.txt`; R15 guards it. A dead rung or a better free model -> `lab`.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: merge-base verified non-empty before every merge this week.
 - Bot-actor pull_request arm (post-#593): opened/closed bot-PR events can go red under the loud-failure verify; held runs await the PAT sweep (normal). Design question (clean no-op vs documented red-per-bot-PR) open with the reviewer (#427).
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
  1. #604: read the post-fix review on `cb82ffa8`; approve -> read-only infra Tester -> PAT merge closes #602; findings -> lab absorbs. Verify the PAT merge actually landed (main advanced past 9422b4eb).
  2. #605: confirm the Builder picked up the build (branch/PR) or re-route; the fix must not touch the engine.
  3. #582: read the macOS + Windows native reports on 9422b4eb. Both green -> final retirement pass (parity rows signed; #552 retirement; only that final run uses `Closes #582`). Any defect -> `fix` (project) or `lab` (infra) followed by a re-verify.
  4. #552 owner live-terminal confirmation outstanding (7-day human rule).
  5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #604's post-fix review clear `cb82ffa8` in one round, and does the PAT merge land (closing #602)?
  - Do both native arms pass on the merged head `9422b4eb`, and does the Windows arm finish inside its 90-minute budget?
  - Does the #605 build land cleanly from 9422b4eb without touching engine behavior?

 - Hephaestus, the Maintainer
