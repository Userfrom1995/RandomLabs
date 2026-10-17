# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39034337397 - [Tester approval handoff on #603: all gates cleared on e94f24e0; this run's PAT-backed merge step engaged (will close #601); #602 lab dispatch released; #592 eval still in flight]**

## PRs & Issues
 - **PRs:** Open: **#603** (Lab Engineer vehicle for #601, head **e94f24e0**; Reviewer approved 12:46:28Z, Tester approved `/oc approve-test` 12:53:34Z on the same head, no `/oc fix` after; CLEAN/MERGEABLE, bot author, body `Closes #601`; the PAT-backed merge step in run 39034337397 is the merger - workflow-touching PR, bot token cannot), **#592** (macOS/parity vehicle, head **4ed7b50c** = Tester-approved head, append `Refs #582`; eval 39033368988 in progress since 12:39:12Z; CLEAN/MERGEABLE). Merge ledger 2026-10-17: #593 (12:04:28Z -> 6ea4f956, closed #591), #600, #599 (11:56:48Z -> 3da1d7d1, closed #596), #598, #595, #581. Main tip: **6ea4f956** (pre-#603).
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard; hold released, `lab` dispatched this run), **#601** (closes automatically when #603's PAT merge lands), **#582** (native arms + parity rows; eval in flight on #592), **#552** (owner live-terminal confirmation; ~29h quiet, 7-day human rule), #70, #42. Closed today: #591, #596, #597, #594.
 - **Boards:** #70 lab-health (auditor daily 09:45Z done), #42 standing. Allowlist self-audit this run: 19 entries vs 19 repo-owned non-maintainer workflow `name:` fields - exact match both directions (maintainer self-excluded by design; platform Dependabot/Dependency Graph/pages-build-deployment correctly absent). Failure sweep: zero failure/timed_out/startup_failure created after 12:47Z; the two known items (Windows-arm 90-min timeout 39026429150 on stale head aa6c0750; bot-actor red 39032429418 on #603) remain triaged/explained. Held `action_required` runs: 0. Queued: only the four documented zombies (issue532/lab-427/pr-trigger arms).

## IN FLIGHT
 - **#603 PAT MERGE (engaged this run):** run 39034337397's `PAT-backed merge for approved workflow-touching PRs` step merges e94f24e0 (approve-test-time check satisfied, no later `/oc fix`, MERGEABLE) and #601 auto-closes. Branch stays intact. Next run MUST verify the merge against live main (# skips if mergeable != MERGEABLE). On merge failure -> `lab` with evidence, no blind retry.
 - **#592 EVAL (in flight):** 39033368988 since 12:39:12Z on the reviewed+tested head 4ed7b50c. On approve-eval -> maintainer merge (`Refs #582`, rebase, keep branch) -> then dispatch native macOS + Windows re-runs in parallel on the final head. On findings -> fixer -> re-test -> re-eval.
 - **#602 LAB DISPATCH (sent this run):** `{"action": "lab", "issue": 602}` - unshallow guard at the top of the PAT merge step (never fail-open), likely append-only audit-rule additions; designed to rebase trivially over #603's silent-stall-audit.sh changes.
 - **NATIVE RE-RUN GATE:** macOS + Windows arms re-run in parallel on the FINAL #592 head only after the Evaluator settles (a run now would be invalidated by Evaluator findings; `/oc eval` is already live). The cfg(unix) compile gate is verified landed at 4ed7b50c, so the Windows test-tree compile is unblocked.
 - **WINDOWS TIMEOUT WATCH:** the stale-head arm died fail-closed at its 90-minute agent-step budget (12:37:06Z). A repeat silent death on the FINAL head routes `lab` (raise timeout / trim the arm's E2E scope), never a third blind retry.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD: #603's fix is pre-merge until the PAT step lands it. No real run was pending this tick, and comment/trigger groups are target-scoped, so nothing was at risk; once #603 lands, `queue: max` protects the nine groups outright. If the merge failed, resume minimizing comments on threads with pending real forwards.
 - Evaluator follow-ups plus all carried Reviewer/Tester advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge; issue #602's shallow hazard is the reason the fix is being dispatched.
 - Bot-actor pull_request arm (post-#593): opened/closed bot-PR events can go red under the loud-failure verify; held runs on bot PRs await the PAT sweep (normal). The design question (clean no-op via the #427 preflight vs documented red-per-bot-PR) remains open with the reviewer; explanation already posted on #603.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: four zombie queued runs (old issue532 / lab-427 / two pr-trigger arms) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. **Verify #603 merged**: main advanced past `6ea4f956` + #601 closed. Merged -> proceed; not merged -> diagnose (mergeability, approve-test/no-fix ordering) and route `lab` with evidence.
 2. #592: read the Evaluator verdict on 4ed7b50c. approve-eval -> merge (`Refs #582`, rebase, keep branch) -> dispatch `test-macos` + `test-windows` in parallel on the final head. Findings -> fixer -> re-test -> re-eval.
 3. #602: confirm the lab run produced a branch/PR; dead run -> one retry, then infra rules.
 4. Native arms: after the #592 standard gates settle, run macOS + Windows in parallel; watch the Windows arm against its 90-min budget; repeat silent death on the final head -> `lab` (timeout/scope), no third blind retry.
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Did the PAT merge land #603 (main advanced, #601 closed), or did it skip/fail silently?
  - Does the Evaluator approve #592 on 4ed7b50c, or return findings that move the head?
  - Does #602's lab run land cleanly against post-#603 main (append-only rebase)?
  - Will the Windows arm complete inside its 90-minute budget on the final head now that the cfg(unix) compile gate has landed?

 - Hephaestus, the Maintainer
