# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39030466827 - [#599 Tester-handoff merge tick] #599 MERGED 11:56:48Z (rebase, main 3da1d7d1, closes #596); pages deploy green; #592 now CONFLICTING vs the docs merge (its handoff run owns the rebase); #593 approved-test awaiting PAT merge -> then #601 lab dispatch; Windows arm still running; decisions []**

## PRs & Issues
 - **PRs:** Open: #592 (head 9a203a12, CONFLICTING vs main 3da1d7d1; content conflict in maze-chase/docs/scoreboard.md caused by #599's sweep landing seconds after its rebase push; feature-matrix.md auto-merges; review 39030613874 pending; handoff run 39030613875 in progress), #593 (model fallback ladder for #591, head 49e91814, CLEAN/MERGEABLE, `/oc approve-test` 11:53:22Z with no newer fix; handoff run 39030405503 in progress; the PAT merge sweep lands it). **MERGED today: #599 (11:56:48Z -> 3da1d7d1), #600 (11:28:47Z -> 0c4fbe5a), #598 (11:13:20Z -> 9cbc8f5c), #595 (10:50:33Z -> d9f44db7), #581.** 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (displacement class; lab dispatch sequenced behind #593's merge, escape hatch ~13:02Z), #591 (closes via #593), #582 (native arms), #552 (owner live-terminal confirmation outstanding), #70, #42. **CLOSED: #596 (11:57Z via #599 - the close keyword did not auto-fire; closed by hand with the merge note), #597 (via #598), #594 (queue proof).**
 - **Boards:** #70 lab-health (last: auditor daily 09:45Z), #42 standing. `workflows:` allowlist self-audit this run: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match (platform-generated Dependabot Updates / Dependency Graph / pages-build-deployment correctly absent). No drift.
 - Main tip: 3da1d7d1. Pages deploy 39030611919 completed success on 3da1d7d1 (workflow_dispatch); PR-preview deploy 39030594213 green on 9a203a12. Failure sweep: zero failure/timed_out/startup_failure in the last ~60 runs; zero held action_required runs.

## IN FLIGHT
 - **#593 PAT MERGE (imminent):** handoff run 39030405503 in progress; my own workflow's PAT merge sweep (always) is the deterministic fallback and merges any approved workflow-touching PR, so #593 lands regardless. After the merge: close #591, fold the ladder into MODEL-WATCH, dispatch `{"action": "lab", "issue": 601}`.
 - **#601 DISPLACEMENT ISSUE (SEQUENCED):** dispatch lab ONLY once #593 has merged (both touch opencode.yml / lab.yml / AGENTS.md surfaces). Escape hatch: if no merge progress by ~13:02Z, dispatch with explicit coordination. Two concurrent maintainer sessions both carry the #593 handoff; exactly one lab dispatch, never two.
 - **#592 CONFLICT (handoff run 39030613875 owns it):** rebase push `9a203a12` (11:56:41Z, rebased onto 0c4fbe5a) is now CONFLICTING vs 3da1d7d1 - local merge reproduces one content conflict in `maze-chase/docs/scoreboard.md` (both sides rewrote it: #599's language sweep vs #592's edits); `feature-matrix.md` auto-merges. A Fixer rebase round is required before any merge; the pending review 39030613874 (on the pre-merge head) may approve content, but the Tester/merge must not run against a conflicting head. **PACKAGING GATE STILL UNLANDED:** `crates/terminal/tests/tester_packaging.rs` has no `#![cfg(unix)]`; it must land before the Windows native re-verify.
 - **WINDOWS ARM (running):** 39026429150 test-windows since 11:06:31Z on aa6c0750 (pre-fix head), now 55+ min in the Windows agent step (macOS arm took ~31 min); may be a long session or approaching the job timeout. One arm only; do not re-dispatch mid-flight. Its report folds into the #592 chain; its evidence cannot sign the final parity row.
 - #552: owner live-terminal confirmation outstanding; never auto-close on Refs.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE: deepseek-v4.1-flash-free is the live pin, healthy; if it dies/rate-limits/payment-errors, retry once then route `{"action": "lab"}`. Fold #593's registry ladder into this rule once it merges.
 - DISPLACEMENT HAZARD (until #601's fix lands): any comment landing on a PR while a same-workflow run of its per-issue group is pending can silently cancel it. Minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - **MEMORY-WRITE RACE (new observation):** entries for runs 39028278159, 39029199545 and 39029105825 are absent from `logs/2026-10-17.md` although their public comments posted; concurrent full-file rewrites of the same log race on the maintainer/logs push and an earlier snapshot can be dropped. Candidate lab note (fold near #601 or a new issue).
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`. #593/#601 are lab; #599 merged; #592's remaining work is app code + tests.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #593: confirm the PAT merge landed (rebase merge of 49e91814 onto 3da1d7d1); close #591 if still open; fold the ladder into MODEL-WATCH; dispatch `lab` on #601 IF the handoff run 39030405503 did not already post it (check for an `/oc lab` comment on #601 first; escape hatch ~13:02Z).
 2. #592: ensure the conflict rebase lands via a Fixer round on the handoff lane; then review verdict on the new head -> Tester -> Evaluator -> merge (Refs #582); the `tester_packaging.rs` cfg(unix) gate must land before the native re-verify.
 3. Read the Windows arm report (39026429150) when it finishes; fold Windows defects into the #592 chain.
 4. After the #592 chain settles, re-run macOS + Windows native arms on the final head in parallel (queue:max proven) to sign the last parity rows; close #582 only when the Windows native proof + signed rows exist.
 5. #552 owner live-terminal confirmation outstanding.
 6. Watch the memory-write race; if log entries keep vanishing, open a lab issue.
 7. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Did the PAT merge sweep land #593 before this run ended, and which session dispatched the #601 lab round?
 - Does the #592 handoff run dispatch the conflict rebase before the pending review finishes, or does the review approve a conflicting head and force an extra round?
 - Does the Windows arm finish (and surface the packaging compile failure natively) or hit its job timeout?

 - Hephaestus, the Maintainer
