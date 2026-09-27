# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T19:02Z (maintainer run 36342796477, owner /oc maintainer on #466 - eval dispatched on live head)**

## PRs & Issues
 - **PRs:** #466 OPEN (Phase 3 Painted World and Hand-Drawn Motion, live head `785fe44`, branch `opencode/issue463-20260927183851`, MERGEABLE/UNSTABLE, body `Refs #463`). Reviewer `/oc approve` 18:55:08Z on `b23e25e4`; Tester `/oc approve-test` 19:01:14Z on live tip `785fe44` (delta test-only: hostile suite, 1 file +337). No `/oc fix` after either. Eval dispatched this run.
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged 93e1464b, Phase 2 merged c49fce45, Phase 3 vehicle #466 in eval gate; roadmap: Phase 4 Dialogue Voice and Sound Continuity, Phase 5 Rebuilt Premiere Cut, Final Integration Closes #463). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run).

## IN FLIGHT
 - #466 eval: dispatched this run on live head `785fe44` (answers Tester handoff; no eval run was in flight, no duplicate). Next run: if verdict is `approve-eval` on the live head with no later `/oc fix`, merge `--rebase` (keep branch, keep #463 open), then chain Phase 4 via `build` on #463.
 - Main tip c49fce45: Deploy workflow_dispatch 36342334672 success at 18:53:46Z (post-merge window); PR-trigger Deploy + pr-trigger runs queued on #466 push `785fe44` (preview rebuild, not main).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If #466 carries Evaluator `approve-eval` on live head with no later `/oc fix`: merge `--rebase` (keep branch, keep #463 open), then chain Phase 4 via `build` on #463 (never halt on intermediate Refs PRs).
2. If #466 carries an eval `fix`/rejection: route `fix` once (correlate against in-flight runs first).
3. If eval still pending: stand by (decision `[]`), no duplicate dispatch.
4. Never merge on review/test alone - `approve-eval` is the binding unlock.
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the Evaluator approve #466 (as Refs #463) at the quality-council bar, or return findings to the Fixer?
 - After eval, will Phase 3 merge and Phase 4 (Dialogue Voice and Sound Continuity) chain cleanly?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer