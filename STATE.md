# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:01Z (maintainer run 36339072162, owner /oc eval + /oc maintainer on PR #465 - standby, eval in flight)**

## PRs & Issues
 - **PRs:** #465 OPEN (Hearthlight rebuild Phase 2, head c00cad1a, branch `opencode/issue463-20260927174232`, body Refs #463, MERGEABLE/CLEAN). #464 MERGED (Phase 1, merge commit 93e1464b, branch kept intact).
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 PR #465 in eval after review plus test approvals on the live head). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 20 workflow files on disk vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 eval: opencode-eval run 36339072101 pending on #465 (answers the prior run's eval dispatch plus the owner's own /oc eval on head c00cad1a). Await Evaluator verdict; on approve-eval merge as Refs #463 and chain Phase 3 (Painted World and Hand-Drawn Motion) immediately, never idle.
 - Main tip 93e1464b: Deploy verified green (prior run). No pending Deploy verification.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If the Evaluator posts approve-eval on #465: merge as Refs #463 (never Closes on an intermediate phase) and chain Phase 3 immediately via build on #463, never idle.
2. If the Evaluator reports quality failures on #465: route `fix` (or `architect`/`research`/`lab` as the verdict demands), never merge.
3. If a new push lands on #465 before eval completes: let the in-flight eval finish; judge whether the verdict covers the new head before merging.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will Phase 2 pass eval on head c00cad1a under the higher craft bar (story legibility, human characters, hand-drawn feel)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
