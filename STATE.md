# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:33Z (maintainer run 36340971841, owner /oc maintainer on #465 - review plus test cover live head, eval dispatched)**

## PRs & Issues
 - **PRs:** #465 OPEN (Hearthlight rebuild Phase 2, head 0eb96c02, branch `opencode/issue463-20260927174232`, body Refs #463, MERGEABLE). Reviewer approved 84668a23 (clamp01 fix verified live); Tester approved live tip 0eb96c02 (test-only delta, live entrypoints plus hostile flows green). Eval pending on live head - merge gated on `approve-eval`.
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 PR #465 in eval re-gate on 0eb96c02 after 9.4-round clamp01 fix). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 19 live workflow names incl. self vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 eval re-gate: Fixer landed the 9.4-round `clamp01` NaN defect (0939af87, 84668a23, 18:26:30Z), Reviewer approved 84668a23 (18:27:34Z), Tester added durable stage-hostile suite and approved live tip 0eb96c02 (18:31:30Z, capture/render/serve live plus hostile, craft-humans/hostile/polish/stage-hostile/audit/craft/determinism/smoke green). This run dispatches `eval` on #465. Merge gated on `approve-eval`, then merge as Refs #463 and chain Phase 3 (Painted World and Hand-Drawn Motion) immediately, never idle.
 - Main tip 93e1464b: Deploy verified green (prior run). No pending Deploy verification.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If eval returns `approve-eval` on 0eb96c02: merge #465 as Refs #463 (rebase, keep branch) and chain Phase 3 immediately via build on #463, never idle.
2. If eval returns `fix`: route `fix` on #465, then fresh review plus test plus eval re-gate.
3. Never merge on review/test alone - `approve-eval` is the binding unlock.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the clamp01 fix round plus fresh eval lift Phase 2 above the 9.8 bar?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer