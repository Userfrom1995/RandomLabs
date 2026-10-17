# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39031324717 - [fix-handoff tick on #592] scoreboard-conflict rebase landed clean (63a5d5ac, MERGEABLE/CLEAN, review 39031318463 in flight); #593 MERGED 12:04:28Z -> closed #591, main 6ea4f956; #601 lab dispatch already in flight (39031391744); decisions []**

## PRs & Issues
 - **PRs:** Open: #592 only (macOS native vehicle, head 63a5d5ac, MERGEABLE/CLEAN vs main 6ea4f956; body `Refs #582`; review 39031318463 in progress since 12:07:56Z on this head; Windows arm 39026429150 test-windows in progress since 11:06:31Z on the stale pre-fix head aa6c0750, 90-min agent-step cap ~12:36:53Z). **#593 MERGED 12:04:28Z (owner/PAT rebase merge) -> main 6ea4f956; closed #591 12:05:49Z.** Merge ledger 2026-10-17: #593 (12:04:28Z), #599 (11:56:48Z), #600 (11:28:47Z), #598 (11:13:20Z), #595 (10:50:33Z), #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (Lab Engineer 39031391744 in progress since 12:09:06Z, owner `/oc lab` at 12:09:00Z; the sequencing behind #593's merge is satisfied), #582 (parent epic; native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. Closed: #596 (via #599), #597 (via #598), #594, #591 (via #593).
 - **Boards:** #70 lab-health (last: auditor daily report 09:45Z), #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match. No drift.
 - Main tip: 6ea4f956. Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held action_required runs.

## IN FLIGHT
 - **#592 REVIEW (in progress):** 39031318463 since 12:07:56Z on 63a5d5ac (real review; a gated no-op duplicate 39031324727 sits pending behind it - #601-class shape, in-progress runs unaffected). On approve -> `/oc test` auto-forward -> Tester -> Evaluator -> merge as my own action (rebase merge, never --delete-branch; body `Refs #582`, no Closes). On findings -> auto `/oc fix`; no duplicate dispatch.
 - **#592 REBASED HEAD VERIFIED (by me, live):** 63a5d5ac = the prescribed conflict resolution; MERGEABLE/CLEAN vs main 6ea4f956; merge-base 3da1d7d1 (non-empty); 14 files, all `maze-chase/` + `progress/`; `scoreboard.md` hunk keeps the 17-assertion correction AND `release sign-off` with zero milestone language; PR body exactly one `Refs #582`; no leaked trailers. Packaging gate (`tester_packaging.rs` `#![cfg(unix)]`) landed here; do not re-open.
 - **WINDOWS ARM (running, STALE HEAD):** 39026429150 since 11:06:31Z on aa6c0750 (pre probe-residual fix). Its report folds into the #592 chain as stale-head evidence; it cannot sign the final parity row. One arm only; do not re-dispatch mid-flight.
 - **#601 LAB (in flight):** 39031391744 since 12:09:06Z (owner `/oc lab` comment 12:09:00Z on #601), running against main 6ea4f956 which already carries #593's ladder + R15. On its PR: review -> read-only infra test -> PAT merge; verify the displacement fix and R15 assertions. The sequenced #601 dispatch is DONE - do not re-dispatch.
 - **AFTER GATES:** re-run macOS + Windows native arms on the FINAL #592 head in parallel (`queue: max` proven) to sign the last parity rows; then update `maze-chase/docs/parity.md`; close #582 only when the Windows native proof + signed rows exist. #552 owner live-terminal item is separate.
 - #552: owner live-terminal confirmation outstanding; never auto-close on Refs.
 - MODEL-WATCH RULE (updated): #593's bounded fallback ladder + R15 exit-0 terminal anchoring are merged into main; pin `deepseek-v4.1-flash-free` healthy. Provider death/rate-limit -> retry once, then route `{"action": "lab"}`; pin/model changes stay lab-only.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`. #592 is app code + docs; #601 is lab (in flight).
 - DISPLACEMENT HAZARD (#601's fix now in progress): a comment landing on a PR while a same-group run is PENDING can silently supersede the pending run. Check lost forwards each tick and re-dispatch; the #601 lab round is the durable fix.
 - Orphan-main protection holds: #592's merge-base with main is 3da1d7d1 (verified non-empty). Shipping limit does not apply (#592 is an intermediate `Refs` test-evidence vehicle).
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 sit permanently queued; zero held runs currently. A concurrent maintainer `workflow_dispatch` run 39031391103 (owner activation 12:09:02Z, separate group) is in progress; treat its outputs as a duplicate tick.

## NEXT-RUN PLAYBOOK
 1. #592: read the review verdict on 63a5d5ac. Approve -> tester -> eval chain, then merge as my own action (rebase, branch kept). Any finding -> the auto-forwarded fix owns it; no duplicate dispatch.
 2. Read the Windows arm report (39026429150); fold defects into the #592 chain and note the stale head.
 3. #601: read the lab round 39031391744 outcome; its PR -> review -> read-only infra test -> PAT merge; verify R15 + the displacement fix landed.
 4. After the #592 standard gates settle, dispatch macOS + Windows native arms on the final head in parallel to sign the last parity rows; then the parity docs update and the #582 close conditions (Windows native proof + signed rows).
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does review 39031318463 clear 63a5d5ac with no new findings?
 - Does the Windows arm finish inside its 90-min agent cap (~12:36:53Z) or time out on the stale head?
 - Does the #601 lab round land cleanly on 6ea4f956 (now carrying #593's ladder)?
 - Does the concurrent workflow_dispatch maintainer run 39031391103 stay a clean duplicate (no conflicting dispatch)?

 - Hephaestus, the Maintainer
