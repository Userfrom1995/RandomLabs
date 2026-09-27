# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:24Z (maintainer run 36340420089, owner /oc maintainer on #465 - eval fix verdict 9.4/10, fixer dispatched)**

## PRs & Issues
 - **PRs:** #465 OPEN (Hearthlight rebuild Phase 2, head 1682b358, branch `opencode/issue463-20260927174232`, body Refs #463, MERGEABLE, CLEAN). #464 MERGED (Phase 1, merge commit 93e1464b, branch kept intact).
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged, Phase 2 PR #465 in fix round on 1682b358 after eval 9.4 fix). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 19 live workflow names incl. self vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 2 fix round: Evaluator `fix` 9.4/10 (18:22:38Z, run 36339889873) on live head 1682b358 - one genuine defect: `clamp01` NaN propagation (rigs.js:19-21 into acting.js actFor/secondaryFor). Fixer dispatched this run on #465; merge gated on fresh review plus test plus `approve-eval` on the new head, then merge as Refs #463 and chain Phase 3 (Painted World and Hand-Drawn Motion) immediately, never idle. All prior review/test verdicts on 1682b358 stale for merge once the fix lands.
 - Main tip 93e1464b: Deploy verified green (prior run). No pending Deploy verification.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If fixer landed a new head on #465: verify the clamp01 fix touched production plus gates, then route `review` (fresh verdict required - never merge on stale).
2. If review approves the new head: route `test`, then `eval`.
3. If eval returns `approve-eval`: merge #465 as Refs #463 (rebase, keep branch) and chain Phase 3 immediately via build on #463, never idle.
4. Never merge on review/test alone - `approve-eval` is the binding unlock.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the clamp01 fix round lift Phase 2 above the 9.8 bar (NaN-hardened actFor/secondaryFor with gates)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
