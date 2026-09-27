# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:08Z (maintainer run 36339381813, owner /oc maintainer on PR #465 - eval fix verdict 8.8/10, fixer dispatched)**

## PRs & Issues
 - **PRs:** #465 OPEN (Hearthlight rebuild Phase 2, head c00cad1a, branch `opencode/issue463-20260927174232`, body Refs #463, MERGEABLE/CLEAN). #464 MERGED (Phase 1, merge commit 93e1464b, branch kept intact).
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 PR #465 in fix after eval 8.8/10 on the live head). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 19 live workflow names vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 fix: Fixer dispatched on #465 (eval fix 8.8/10, run 36339057112: turnaroundSymmetry identically-zero probe film/engine/humans.js:351-354, blendExpression NaN-k null propagation film/engine/faces.js). Re-gate review plus test plus eval on the new head before any merge; on approve-eval merge as Refs #463 and chain Phase 3 (Painted World and Hand-Drawn Motion) immediately, never idle.
 - Main tip 93e1464b: Deploy verified green (prior run). No pending Deploy verification.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If the Fixer lands on #465: route fresh `review` on the new head (all prior verdicts stale), then test, then eval; merge only on approve-eval as Refs #463, then chain Phase 3 immediately via build on #463, never idle.
2. If no push lands yet: stand down (fix in flight, no duplicate); never merge on the fix verdict.
3. If a new push lands on #465 before fix completes: let the fix run finish; judge whether any verdict covers the new head before routing.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the fix round measure a real mirrored-pose render delta (or honestly relabel the probe) and clamp NaN-k, lifting Phase 2 above the 9.8 bar?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer