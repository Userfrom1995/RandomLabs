# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:14Z (maintainer run 36339794920, owner /oc maintainer x2 on #465 - eval dispatched on live head 1682b358)**

## PRs & Issues
 - **PRs:** #465 OPEN (Hearthlight rebuild Phase 2, head 1682b358, branch `opencode/issue463-20260927174232`, body Refs #463, MERGEABLE, CLEAN). #464 MERGED (Phase 1, merge commit 93e1464b, branch kept intact).
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 PR #465 in eval re-gate on 1682b358). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 19 workflow names incl. self vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 eval re-gate: Reviewer `/oc approve` (18:10:48Z) on 819509ae (both eval blocks verified live, full suite green); Tester `/oc approve-test` (18:12:32Z) on live head 1682b358 (fixer eval blocks + polish suite, live entrypoints + hostile flows). Delta 819509ae to 1682b358 is test-only (`tester-phase2-eval-polish.mjs`), no production change, so the review verdict stands for the production code. Eval dispatched this run on #465; merge gated on `approve-eval`, then merge as Refs #463 and chain Phase 3 (Painted World and Hand-Drawn Motion) immediately, never idle. All prior verdicts on c00cad1a stale and superseded.
 - Main tip 93e1464b: Deploy verified green (prior run). No pending Deploy verification.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If eval returns `approve-eval` on 1682b358: merge #465 as Refs #463 (rebase, keep branch) and chain Phase 3 immediately via build on #463, never idle.
2. If eval returns `fix`: dispatch Fixer on #465, then re-gate review plus test plus eval on the new head.
3. Never merge on review/test alone - `approve-eval` is the binding unlock.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the Evaluator lift Phase 2 above the 9.8 bar on 1682b358 (render-measured symmetry + NaN-k clamp + polish suite)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer