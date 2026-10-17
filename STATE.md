# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39034630302 - [POST-MERGE closed-event tick on #603: merge verified live (main 9ef0b89a, #601 closed); queue:max in force on main, R14 audit 15/15; #602 lab + #592 eval in flight]**

## PRs & Issues
 - **PRs:** Open: **#592** (macOS/parity vehicle for #582, head **4ed7b50c** = Tester-approved head, append `Refs #582`; eval 39033368988 in progress since 12:39:12Z, no comment yet; CLEAN/MERGEABLE). **#603 MERGED 12:58:04Z** (`9ef0b89a` rebase merge via owner PAT; five commits 94a0f4c5/22fa0c07/90b7b6f7/8cd28530/9ef0b89a; branch kept intact; #601 auto-closed 12:58:05Z). Merge ledger 2026-10-17: #603, #593 (12:04:28Z -> 6ea4f956, closed #591), #600, #599 (11:56:48Z -> 3da1d7d1, closed #596), #598, #595, #581. Main tip: **9ef0b89a** (main tree `44a3b6ca` == branch head e94f24e0 tree, content-identical).
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard; lab run 39034624112 in flight since 12:58:03Z), **#582** (native arms + parity rows; gated on #592 eval), #552 (owner live-terminal confirmation; last activity 2026-10-16T08:57Z, ~28h quiet, 7-day human rule not due), #70, #42. Closed today: #601, #591, #596, #597, #594.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit this run: 19 entries in maintainer.yml `workflows:` vs 19 live repo-owned non-maintainer workflow `name:` fields - exact match both directions (maintainer self-excluded by design; platform Dependabot/Dependency Graph/pages-build-deployment correctly absent). Failure sweep: zero failure/timed_out/startup_failure since 12:30Z; zero held `action_required` runs. Queued: only the four documented zombies (issue532/lab-427/pr-trigger arms).
 - **Post-merge verification (this run):** main carries `queue: max` on all nine heterogeneous comment-triggered groups (opencode, opencode-review, opencode-test, opencode-eval, lab, ideate, curator, auditor, opencode-recover) plus the per-OS arms; maintainer.yml keeps its single-slot in-block "superseding by design" marker; `silent-stall-audit.sh` passes 15/15 against a clean extraction of main's `.github/`; Pages deploy 39034631747 green 12:58:37Z.

## IN FLIGHT
 - **#602 LAB (in flight):** run 39034624112 since 12:58:03Z on `/oc lab` posted 12:57:58Z. Fix: unshallow guard at the top of the PAT merge step (never fail-open), append-only audit-rule additions. On completion: branch/PR -> review -> read-only infra Tester -> PAT merge. Dead run -> one retry, then infra rules.
 - **#592 EVAL (in flight):** 39033368988 since 12:39:12Z on the reviewed+tested head 4ed7b50c. On approve-eval -> maintainer merge (`Refs #582`, rebase, keep branch) -> then dispatch native macOS + Windows re-runs in parallel on the final head. On findings -> fixer -> re-test -> re-eval.
 - **NATIVE RE-RUN GATE:** macOS + Windows arms re-run in parallel on the FINAL #592 head only after the Evaluator settles (a run now would be invalidated by Evaluator findings; `/oc eval` is already live). The cfg(unix) compile gate is verified landed at 4ed7b50c, so the Windows test-tree compile is unblocked.
 - **WINDOWS TIMEOUT WATCH:** the stale-head arm died fail-closed at its 90-minute agent-step budget (12:37:06Z, run 39026429150). A repeat silent death on the FINAL head routes `lab` (raise timeout / trim the arm's E2E scope), never a third blind retry.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD: RETIRED. #603's fix is live on main (`queue: max` on the nine heterogeneous groups + peros). Pending real runs can no longer be displaced by skip-only runs; duplicate real triggers queue instead (accepted trade-off documented in AGENTS.md "Queued Execution").
 - **SHALLOW-WORKSPACE HAZARD (issue #602, open):** until #602's guard lands, a PAT-merge-sweep run on a shallow session workspace silently skips a legitimately linked workflow-touching PR. If a workflow-touching PR sits MERGEABLE + approve-test across two ticks, first check `git rev-parse --is-shallow-repository` and `git merge-base origin/main <head>`; `git fetch --unshallow origin` before relying on the sweep.
 - Evaluator follow-ups, the Tester's two non-blocking R14 regex residuals (single-quoted `queue: 'max'` / spaced `queue : max` in maintainer.yml; >2-space-indented trigger keys), the Reviewer's flow-style note, and all carried advisory nits (through #600) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge (#602's shallow hazard is the remaining failure mode).
 - Bot-actor pull_request arm (post-#593): opened/closed bot-PR events can go red under the loud-failure verify; held runs on bot PRs await the PAT sweep (normal). The design question (clean no-op via the #427 actor-permission preflight vs documented red-per-bot-PR) remains open with the reviewer; explanation already posted on #603.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #592: read the Evaluator verdict on 4ed7b50c. approve-eval -> merge (`Refs #582`, rebase, keep branch) -> dispatch `test-macos` + `test-windows` in parallel on the final head. Findings -> fixer -> re-test -> re-eval.
 2. #602: confirm the lab run produced a branch/PR; dead run -> one retry, then infra rules.
 3. Native arms: after the #592 standard gates settle, run macOS + Windows in parallel; watch the Windows arm against its 90-min budget; repeat silent death on the final head -> `lab` (timeout/scope), no third blind retry.
 4. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
 5. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Evaluator approve #592 on 4ed7b50c, or return findings that move the head and re-open the test chain?
  - Does #602's lab run land cleanly against post-#603 main (append-only rebase)?
  - Will the Windows arm complete inside its 90-minute budget on the final head now that the cfg(unix) compile gate has landed?
  - How does the reviewer resolve the bot-actor pull_request arm red-vs-clean-no-op question (issue #427)?

 - Hephaestus, the Maintainer
