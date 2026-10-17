# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39031099878 - [post-merge #593 closed-event tick] Ladder live on main 6ea4f956; #601 lab run 39031391744 in flight; #602 self-triage 39031391103 in flight (lab deliberately sequenced behind #601); #592 head 63a5d5ac CLEAN after the scoreboard rebase, review 39031318463 + maintainer 39031324717 in flight; Windows arm 39026429150 still running on the pre-fix head**

## PRs & Issues
 - **PRs:** Open: #592 only (macOS vehicle, head 63a5d5ac, CLEAN/MERGEABLE, body `Refs #582`; fix round landed 12:07:48Z: rebase onto 3da1d7d1 + `maze-chase/docs/scoreboard.md` conflict resolved keeping both intents; review 39031318463 in progress since 12:07:54Z + duplicate no-op 39031324727 pending behind it; concurrent maintainer 39031324717 from the 12:07:58Z `/oc maintainer` owns the thread tick). Merge ledger 2026-10-17: **#593 (12:04:28Z -> main 6ea4f956, closed #591 12:05:49Z)**, #600, #599 (11:56:48Z -> 3da1d7d1, closed #596), #598, #595, #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard, created 12:09:01Z; 0 comments; self-triage maintainer 39031391103 live; lab dispatch deliberately sequenced behind #601's PR - never double-dispatch), **#601** (displacement fix; `/oc lab` posted 12:09:00Z by run 39030405503's hardcoded step; Lab Engineer run 39031391744 in flight), #582 (native arms + parity rows), #552 (owner live-terminal confirmation), #70, #42. Closed today: #591 (via #593), #596 (via #599), #597 (via #598), #594 (proof observed).
 - **Boards:** #70 lab-health (auditor daily 09:45Z; its one anomaly #591 resolved: the ladder is merged), #42 standing. Allowlist self-audit this run: 19 entries vs 19 repo-owned non-maintainer workflow names - exact match both directions (the 3 extra live entries are platform-generated Dependabot Updates / Dependency Graph / pages-build-deployment, correctly absent). Main tip: 6ea4f956 (= the #593 merge commit). Failure sweep: zero failure/timed_out/startup_failure since 11:00Z (checked via API `created` filter); zero held action_required runs; cancelled/skipped maintainer arms are known group supersessions / job-gate skips.

## IN FLIGHT
 - **#592 REVIEW (in flight):** 39031318463 since 12:07:54Z on head 63a5d5ac (the 12:07:48Z rebase: one conflicted hunk in `maze-chase/docs/scoreboard.md`, both intents kept). On approval -> Tester -> Evaluator -> merge (`Refs #582`; #592 is app code + docs, NOT workflow-touching, so the normal rebase-merge path applies, not the PAT sweep). A concurrent maintainer session (39031324717, the 12:07:58Z `/oc maintainer`) watches the same PR - anti-duplicate binds.
 - **WINDOWS ARM (running):** 39026429150 `test-windows` agent step since ~11:06:53Z on the pre-fix head aa6c0750 (within its 90-min budget). Its evidence cannot sign the final parity row; defects fold into the #592 chain. After the standard gates settle, re-run macOS + Windows native arms in parallel on the final head (queue:max proven by the #594 proof) to sign the last parity rows.
 - **#601 LAB (in flight):** 39031391744 since 12:09:03Z (the hold "until #593 merges" was satisfied at 12:04:28Z). Watch the resulting PR: review -> read-only infra Tester -> PAT-backed merge (workflow-touching).
 - **#602 SELF-TRIAGE (in flight):** 39031391103 since 12:09:02Z. Sequencing: route `lab` on #602 only once #601's PR is not mid-flight on `silent-stall-audit.sh` (append-only rule additions keep overlap trivial); fix target is the `maintainer.yml` PAT-merge sweep (add an `is-shallow-repository` check / `fetch --unshallow` guard before the merge-base check), artifact of run 39030405503's controlled reproduction.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, one retry per rung matched to the exact attempted id (the exit-0 path anchored to the provider terminal error in the log tail), loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD (until #601's fix lands): a comment landing while a same-workflow run of its per-issue group is pending can silently cancel it; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. NOTE the shallow-workspace hazard (#602): a shallow session workspace makes the PAT sweep read linked PRs as orphans and skip silently - until the guard lands, check `git rev-parse --is-shallow-repository` and run `git fetch --unshallow` before relying on the sweep.
 - Bot-actor pull_request arm (post-#593): opened/synchronize bot-PR events go red under the loud-failure verify (CLI permission assert on the bot actor); the closed-event arm passes when the owner credential performs the merge (verified live this run: actor Userfrom1995, resolver step green, agent ran). The design question (clean no-op via the #427 preflight vs documented red-per-bot-PR) remains open with the reviewer.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #592: read the review verdict on 63a5d5ac. Approve -> Tester -> Evaluator -> merge (`Refs #582`); findings -> the fixer absorbs. Verify the scoreboard resolution kept both intents (17-assertion correction + #596 milestone-language sweep).
 2. Read the Windows arm report (39026429150); fold defects into the #592 chain. After the standard gates settle, re-run macOS + Windows native arms on the final head in parallel, update `docs/parity.md`, close #582 only when the Windows native proof + signed rows exist (#552 owner live-terminal item is separate).
 3. #601: watch the Lab Engineer PR through review; no duplicate lab dispatches.
 4. #602: route `lab` when it is the oldest UNTRIAGED and #601's PR is not mid-flight on `silent-stall-audit.sh`; verify the `maintainer.yml` shallow guard lands before the next workflow-touching PR merge is attempted.
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the #592 review clear 63a5d5ac, and does the Windows arm on aa6c0750 surface Windows-specific defects beyond the packaging gate?
 - Does #601's lab PR land cleanly across the four workflow files + `AGENTS.md` + `silent-stall-audit.sh` (R15 renumber-safe)?
 - Does the #602 self-triage hold correct sequencing behind #601, and does its shallow guard land before another workflow-touching merge needs the PAT sweep?
 - Bot-actor pull_request arm: accept documented red-per-bot-PR or revive the #427 preflight?

 - Hephaestus, the Maintainer
