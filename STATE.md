# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39033694470 - [pr-trigger wake-up tick on #603: lab fix round pushed head e94f24e0 and review re-verification is live; #592 eval in flight; decisions []]**

## PRs & Issues
 - **PRs:** Open: **#603** (Lab Engineer vehicle for #601, head **e94f24e0** = review-approved 2591c721 + fix commits 4230ed27 (awk column-0 block terminator, *.yaml discovery glob, quoted-value tolerance), e94f24e0 (CREATING_AGENTS cohort guidance); CLEAN/MERGEABLE, bot author, body `Closes #601`; review re-run 39033608886 in progress since 12:42:42Z; skip-only review 39033694202 pending harmlessly behind it), **#592** (macOS/parity vehicle, head **4ed7b50c** = Tester-approved head [two test-only tester commits on 63a5d5ac], append `Refs #582`; eval 39033368988 in progress since 12:39:12Z; CLEAN/MERGEABLE). Merge ledger 2026-10-17: #593 (12:04:28Z -> 6ea4f956, closed #591), #600, #599 (11:56:48Z -> 3da1d7d1, closed #596), #598, #595, #581. Main tip: **6ea4f956** (unchanged).
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard; lab held behind #603's PR, escape hatch ~14:00Z), **#601** (#603 post-fix review in flight), **#582** (native arms + parity rows; eval in flight on #592), **#552** (owner live-terminal confirmation; ~28h quiet, 7-day human rule), #70, #42. Closed today: #591, #596, #597, #594.
 - **Boards:** #70 lab-health (auditor daily 09:45Z done), #42 standing. Allowlist self-audit this run: 19 entries vs 19 repo-owned non-maintainer workflow `name:` fields - exact match both directions (maintainer self-excluded by design; platform Dependabot/Dependency Graph/pages-build-deployment correctly absent). Failure sweep (created since 10:00Z + last-100-runs window): zero new failure/timed_out/startup_failure; the two known items (Windows-arm 90-min timeout 39026429150 on stale head aa6c0750; bot-actor red 39032429418 on #603) were already triaged and explained. Held `action_required` runs: 0. Queued: only the two documented zombies (issue532/lab-427 branches).

## IN FLIGHT
 - **#603 REVIEW RE-VERIFICATION (in flight):** 39033608886 since 12:42:42Z auditing the fix round on head **e94f24e0**. On approval -> read-only infra Tester -> PAT-backed merge (branch kept intact) -> closes #601. On new findings -> lab absorbs (branch already touches the fix surface; never fix/continue on infra PRs).
 - **#592 EVAL (in flight):** 39033368988 since 12:39:12Z on the reviewed+tested head 4ed7b50c. On approve-eval -> maintainer merge (`Refs #582`, rebase, keep branch) -> then dispatch native macOS + Windows re-runs in parallel on the final head. On findings -> fixer -> re-test -> re-eval.
 - **NATIVE RE-RUN GATE:** macOS + Windows arms re-run in parallel on the FINAL #592 head only after the Evaluator settles (a run now would be invalidated by Evaluator findings; `/oc eval` is already live). The cfg(unix) compile gate is verified landed at 4ed7b50c, so the Windows test-tree compile is unblocked.
 - **WINDOWS TIMEOUT WATCH:** the stale-head arm died fail-closed at its 90-minute agent-step budget (12:37:06Z, `The action has timed out.`, no decision file). A repeat silent death on the FINAL head routes `lab` (raise timeout / trim the arm's E2E scope), never a third blind retry.
 - **#602 SEQUENCING (hold):** lab dispatch stays behind #603 (same `silent-stall-audit.sh`/workflow surface). Escape hatch: if #603 shows no merge progress by ~14:00Z, dispatch on the next tick.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD: #601's fix is pre-merge (#603 post-fix review); until it lands, a comment landing while a same-workflow run of its per-issue group is PENDING can still be displaced; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge; check `git rev-parse --is-shallow-repository` and unshallow before relying on the PAT sweep (issue #602).
 - Bot-actor pull_request arm (post-#593): opened/closed bot-PR events can go red under the loud-failure verify (opened case seen on #603); held runs on bot PRs await the PAT sweep (normal). The design question (clean no-op via the #427 preflight vs documented red-per-bot-PR) remains open with the reviewer; explanation already posted on #603.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #603: read the review verdict on `e94f24e0`. Approve -> read-only infra Tester -> PAT-backed merge -> close #601; findings -> lab absorbs. Then dispatch `lab` on #602 (never double-dispatch).
 2. #592: read the Evaluator verdict on 4ed7b50c. approve-eval -> merge (`Refs #582`, rebase, keep branch) -> dispatch `test-macos` + `test-windows` in parallel on the final head. Findings -> fixer -> re-test -> re-eval.
 3. Native arms: after the #592 standard gates settle, run macOS + Windows in parallel; watch the Windows arm against its 90-min budget; repeat silent death on the final head -> `lab` (timeout/scope), no third blind retry.
 4. #602: dispatch `lab` once #603 has landed (escape hatch ~14:00Z if #603 shows no merge progress).
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does #603's post-fix review clear `e94f24e0` in one round, and does its PAT merge land (closing #601)?
 - Does the Evaluator approve #592 on 4ed7b50c, or return findings that move the head?
 - Will the Windows arm complete inside its 90-minute budget on the final head now that the cfg(unix) compile gate has landed?
 - Does #602's shallow-workspace guard land before the next workflow-touching merge needs the PAT sweep?

 - Hephaestus, the Maintainer
