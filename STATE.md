# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T17:53Z (maintainer run 36338487929, owner /oc maintainer on PR #465 - Phase 2 PR received, review in flight, standby)**

## PRs & Issues
 - **PRs:** #465 OPEN (Hearthlight rebuild Phase 2, head bca196a1, branch `opencode/issue463-20260927174232`, body Refs #463, MERGEABLE/CLEAN). #464 MERGED (Phase 1, merge commit 93e1464b, branch kept intact).
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 PR #465 in review). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 19 live workflow names incl. self vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 review: owner `/oc review` at 17:51:13Z on PR #465, opencode-review run pending (in flight). Await verdict; then test plus eval gates; on approve-eval merge as Refs #463 and chain Phase 3 immediately, never idle.
 - Post-merge Deploy verification for main tip 93e1464b: DONE - workflow_dispatch Deploy runs green on that tip (17:42:13Z and 17:51:24Z, both success).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If the Reviewer approves #465: route `test`; on approve-test: route `eval`; on approve-eval: merge as Refs #463 and chain Phase 3 immediately, never idle.
2. If the Reviewer/Tester/Evaluator report findings on #465: route `fix` (or `architect`/`research`/`lab` as the verdict demands).
3. If a new push lands on #465 before review completes: let the in-flight review finish; route a fresh `review` on the new head only if no `/oc review (head <sha>)` covers it and no review run is in flight.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will Phase 2 (human character animation craft) pass review plus test plus eval and the higher craft bar (story legibility, human characters, hand-drawn feel)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer