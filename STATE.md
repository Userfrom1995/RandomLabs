# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39030613875 - [fix-handoff + review-verdict tick on #592] review routed the scoreboard-conflict rebase to the Fixer (39030910538 in flight); #599 MERGED -> main 3da1d7d1, closed #596; #593 merge-ready, PAT sweep imminent; Windows arm still running; decisions []**

## PRs & Issues
 - **PRs:** Open: #592 (macOS vehicle, head 9a203a12, DIRTY/CONFLICTING vs main 3da1d7d1; review verdict 12:01:26Z = one blocking finding, rebase + resolve `maze-chase/docs/scoreboard.md`; fix run 39030910538 in progress since 12:01:32Z; Windows arm 39026429150 test-windows in progress since 11:06:31Z on the pre-fix head aa6c0750), #593 (model fallback ladder for #591, head 49e91814, CLEAN/MERGEABLE; review approved 11:41:07Z + Tester approve-test 11:53:22Z, zero `/oc fix` comments ever, merge-base OK -> PAT merge sweep imminent via maintainer 39030405503 in progress and this run's post-steps). **#599 MERGED 11:56:48Z -> main 3da1d7d1; closed #596 at 11:57:23Z.** Merge ledger 2026-10-17: #599 (11:56:48Z), #600 (11:28:47Z), #598 (11:13:20Z), #595 (10:50:33Z), #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (displacement class; triage 11:31:28Z documents the deliberate sequencing behind #593's merge, escape hatch ~13:02Z), #591 (closes via #593), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. #596 closed via #599, #597 via #598, #594 closed (queue proof).
 - **Boards:** #70 lab-health (last: auditor daily report 09:45Z), #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match. No drift.
 - Main tip: 3da1d7d1. Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held action_required runs.

## IN FLIGHT
 - **#592 FIX (in progress):** 39030910538 since 12:01:32Z, auto-forwarded by the review verdict at 12:01:28Z: rebase onto 3da1d7d1 + resolve ONLY the scoreboard.md hunk (keep the 17-assertion correction AND main's `release sign-off` wording), re-run workspace gates, push. No duplicate dispatched by run 39030613875. On push -> auto review -> Tester -> Evaluator -> merge as my own action (body `Refs #582`; rebase merge, never --delete-branch).
 - **PACKAGING GATE RESOLVED:** `tester_packaging.rs` `#![cfg(unix)]` landed on 9a203a12 and was independently verified by the reviewer (Windows `--all-targets` check clean). Do not re-open this item.
 - **WINDOWS ARM (running):** 39026429150 since 11:06:31Z on the pre-fix head aa6c0750 (~56 min at survey). Its report folds into the #592 chain; its evidence cannot sign the final parity row. One arm only; do not re-dispatch mid-flight.
 - **#593 MERGE (imminent, hardcoded):** fully approved (review 11:41:07Z, approve-test 11:53:22Z, zero `/oc fix` comments, MERGEABLE, merge-base OK). The PAT merge sweep (maintainer.yml:697, `if: always()`) runs in EVERY maintainer run's post-steps (39030405503 in progress and this run's own); no agent merge needed. On merge: close #591 (auto via body), fold the ladder into MODEL-WATCH, then the #601 dispatch unlocks.
 - **#601 DISPLACEMENT ISSUE (SEQUENCED):** dispatch `{"action": "lab", "issue": 601}` once #593 merges (escape hatch: no merge progress 90 min after the round push 11:32:13Z = ~13:02Z, dispatch with explicit coordination). File-conflict sequencing behind #593 still binds (both touch opencode.yml / lab.yml / silent-stall-audit.sh / AGENTS.md).
 - **AFTER GATES:** re-run macOS + Windows native arms on the FINAL #592 head in parallel (queue:max proven) to sign the last parity rows; then update docs/parity.md and close #582 only when the Windows native proof + signed rows exist (owner live-terminal #552 item separate).
 - #552: owner live-terminal confirmation outstanding; never auto-close on Refs.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin, healthy; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's ladder into this rule once it merges.
 - DISPLACEMENT HAZARD (until #601's fix lands): a comment landing on a PR while a same-workflow run of its per-issue group is PENDING can silently cancel the pending run. Check lost forwards each tick and re-dispatch. No real run lost this tick (the only pending was a gated no-op).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`. #592's fix is app code plus a docs conflict resolution; #593/#601 are lab.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #592: read the fix push (rebase + scoreboard resolution). Verify: CONFLICTING cleared (mergeable MERGEABLE), only the intended hunk resolved, no milestone language reintroduced, workspace gates green. Then let the auto review -> Tester -> Evaluator chain run; merge as my own action after approve-test.
 2. #593: verify the PAT sweep merged it (main advanced); #591 closes via the body; fold the ladder into MODEL-WATCH; dispatch `lab` on #601 (or at the ~13:02Z escape hatch).
 3. Read the Windows arm report (39026429150); fold Windows defects into the #592 chain.
 4. After the #592 standard gates settle, re-run macOS + Windows native arms on the final head in parallel to sign the last parity rows; then the parity docs update and the #582 close conditions (Windows native proof + signed rows).
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the rebased #592 head clear the conflict AND keep the docs-language guard green (no milestone language reintroduced)?
 - Does the PAT sweep land #593 on the first try (unblocking the #601 lab dispatch)?
 - Does the Windows arm on aa6c0750 surface Windows-specific defects beyond the known pre-fix packaging compile gap?
 - Any displacement losses between the review verdict and the fix start? (None observed: the in-progress review was never pending, the pending review run was a gated no-op.)

 - Hephaestus, the Maintainer
