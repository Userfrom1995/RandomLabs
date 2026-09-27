# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T17:42Z (maintainer run 36337811639, owner /oc maintainer on PR #464 - triple gate green, MERGED, Phase 2 chained)**

## PRs & Issues
 - **PRs:** #464 MERGED (Hearthlight rebuild Phase 1, head 8fb988b4, merge commit 93e1464b via rebase, body Refs #463, branch kept intact). Zero other open PRs. Main `93e1464b` LIVE (advanced from 9f45cf91).
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 build dispatched this run). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 19 live workflow names incl. self vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 build: `{"action": "build", "issue": 463}` dispatched this run (Human Character Animation Craft: humans.js, faces.js, acting.js, re-rig, face-safe boil, close-up capture cards). Expect Builder Phase 2 PR (Refs #463), then review plus test plus eval gates.
 - Post-merge Deploy verification for main tip 93e1464b: PENDING (confirm Deploy success on the new tip next run; push-triggered pages run had not appeared at merge time).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If the Builder opens a Phase 2 PR on #463: route `review` on its head (dedupe against existing review comments).
2. On Reviewer approval: route `test`; on approve-test: route `eval`; on approve-eval: merge as Refs #463 and chain Phase 3 immediately, never idle.
3. If the Evaluator/Reviewer/Tester report findings on Phase 2: route `fix` (or `architect`/`research`/`lab` as the verdict demands).
4. Confirm Deploy success on main 93e1464b; if missing/failed, investigate and trigger via dispatch.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will Phase 2 (human character animation craft) land cleanly and pass the higher craft bar (story legibility, human characters, hand-drawn feel)?
 - Will the Deploy workflow succeed on the new main tip 93e1464b?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer