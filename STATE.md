# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39037970758 - [post-merge closed-event tick on #604: shallow-guard fix LIVE on main (6270703a), #602 CLOSED; #605 build + #582 native arms in flight; decisions []]**

## PRs & Issues
 - **PRs:** Open: none. **#604 MERGED** 13:46:48Z at `6270703a` (PAT-backed merge sweep of run 39036533607, rebase, linear; branch `opencode/lab-602-pat-merge-unshallow` intact at `cb82ffa8`); #602 auto-closed 13:46:49Z. The guard is verified live on main: `maintainer.yml:836` (`git fetch origin main --unshallow`) before the merge-base checks, still-shallow warning at `:839`, R16 present in `silent-stall-audit.sh`. Pages post-merge green (workflow_dispatch 39037971198 success 13:46:51Z).
 - **Issues:** Open: **#605** (Maze Chase desktop residuals; build 39037405708 in flight since 13:38:40Z; no `opencode/issue605-*` branch yet), **#582** (native arms in flight: macOS 39036858261 running since 13:30:47Z, Windows 39036859435 pending safely behind it - `queue: max` live), #552 (owner live-terminal confirmation; last owner activity 2026-10-16T08:57Z, ~29h; 7-day human rule not due), #70 (auditor daily report 09:45Z; its one anomaly #591 already closed), #42 standing. Closed today: #602, #601, #597, #596, #594, #591.
 - **Boards:** #70 lab-health, #42 standing. Allowlist self-audit this run: 19 entries in maintainer.yml `workflows:` vs 20 live workflow `name:` fields, exact match with only `maintainer` absent (self-excluded by design). Failure sweep (API `created` filter 12:00Z-14:00Z): exactly two failures, both the documented bot-actor `pull_request` maintainer reds (39035736604 on #604 at 13:14:22Z; 39032429418 on #603 at 12:25:02Z), both explained on-thread. Held `action_required` runs: 0. In flight at write time: this run (39037970758), #605 build 39037405708, macOS arm 39036858261 (+ pending Windows 39036859435). Main tip: **6270703a**.

## IN FLIGHT
 - **#605 BUILD (in flight):** opencode run 39037405708 since 13:38:40Z (build job since 13:38:42Z); binding scope on the issue (stderr error + non-zero exit on window-creation failure; fullscreen-probe resize wait; windowed PPM fingerprint must not regress). Expect a `opencode/issue605-*` branch/PR; then review -> test -> eval? (project code, infra routing N/A) -> merge. Silent build death -> one retry, then infra rules (never double-dispatch).
 - **#582 NATIVE ARMS (in flight):** macOS 39036858261 `test-macos` running since 13:30:47Z (~18 min at survey; the previous macOS pass took ~31 min); Windows 39036859435 pending behind it - safe under the live `queue: max` (#595 fix). On their signed reports: fold into `docs/parity.md` (a builder pass if needed) and plan the final pass carrying `Closes #582`. Windows arm: watch the 90-min budget; a second silent death on the final head -> `lab` (raise timeout / trim scope), never a third blind retry.
 - SHALLOW-WORKSPACE HAZARD: FIXED on main (#604, `6270703a`). Guard + R16 live; if a workflow-touching PR ever looks silently skipped, verify with `git rev-parse --is-shallow-repository` and check that the guard is present on main.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (standing): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder on `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab`.
 - BOT-ACTOR CLASS (standing): the `pull_request` maintainer arm still goes red + posts a noise comment on bot-authored PR events; #427/#429 were CLOSED unmerged by the owner on 2026-09-25. AGENTS.md/maintainer.md still describe the preflight as "pending" - stale wording, queued for the next lab hardening pass; no dispatch while the standing policy is documented red + on-thread explanation.
 - Evaluator follow-ups, the Tester's two non-blocking R14 regex residuals, the Reviewer's flow-style note, and all carried advisory nits (through #604) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #605: read the produced branch/PR when it lands and drive review -> test -> merge. Silent build death -> one retry, then infra rules (never double-dispatch).
 2. #582: read the two native arm reports; on green, fold parity rows and plan the final pass carrying `Closes #582`; on failure route fixer/builder. Watch the Windows 90-min budget.
 3. #552 owner live-terminal confirmation outstanding (7-day human rule; last owner activity 2026-10-16 08:57Z).
 4. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Do the macOS + Windows native arms sign the final #582 parity rows without new native defects?
 - Does the #605 build land a clean PR, and does the desktop-residual fix pass the standard gates?
 - What vehicle resolves the bot-actor `pull_request` arm question now that #427/#429 are closed unmerged?

 - Hephaestus, the Maintainer
