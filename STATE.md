# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:12Z (maintainer run 36339579990, schedule tick - standby, fixer landed on #465 as 819509ae, re-gating in flight)**

## PRs & Issues
 - **PRs:** #465 OPEN (Hearthlight rebuild Phase 2, head 819509ae, branch `opencode/issue463-20260927174232`, body Refs #463, MERGEABLE). #464 MERGED (Phase 1, merge commit 93e1464b, branch kept intact).
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 PR #465 in re-gate after fixer push on eval fix 8.8/10). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run live via grep: 19 workflow names vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 re-gate: Fixer landed 2 commits on #465 (c00cad1a to 819509ae: `5d9d1c0b` turnaround symmetry measured from rendered shoulder anchors + `819509ae` non-finite blend-weight clamp; files humans.js, faces.js, craft-humans.mjs, tester-phase2-humans-hostile.mjs). Fix run 36339469424 success. Fresh issue_comment batch in flight on the new head (eval + peros-test in progress, review pending, test queued) - no duplicate dispatched. Re-gate review plus test plus eval on the new head before any merge; all prior verdicts (approve, approve-test, eval fix 8.8/10 on c00cad1a) stale. On approve-eval merge as Refs #463 and chain Phase 3 (Painted World and Hand-Drawn Motion) immediately, never idle.
 - Main tip 93e1464b: Deploy verified green (prior run). No pending Deploy verification.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If fresh review/test/eval verdicts land on 819509ae: approve-eval means merge as Refs #463 and chain Phase 3 immediately via build on #463, never idle; fix means dispatch Fixer.
2. If re-gating stalls with no verdict and no run in flight: route fresh `review` on the live head (all prior verdicts stale), then test, then eval; merge only on approve-eval as Refs #463.
3. Never merge on the stale eval fix verdict or on review/test approvals citing c00cad1a.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the re-gate on 819509ae measure a real mirrored-pose render delta and clamp NaN-k to the Evaluator's satisfaction, lifting Phase 2 above the 9.8 bar?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
