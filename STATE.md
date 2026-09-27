# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:54Z (maintainer run 36342333513, owner /oc review + /oc maintainer on #466 - standby, review in flight)**

## PRs & Issues
 - **PRs:** #466 OPEN (Phase 3 Painted World and Hand-Drawn Motion, head `b23e25e4`, branch `opencode/issue463-20260927183851`, MERGEABLE/CLEAN, body `Refs #463`). Review run 36342333437 pending on owner's `/oc review`; no approval yet, no merge.
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged 93e1464b, Phase 2 merged c49fce45, Phase 3 vehicle #466 open). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run).

## IN FLIGHT
 - #466 review: opencode-review run 36342333437 pending (answers owner 18:53:32 `/oc review`). Next run: if verdict is `/oc approve` with head match, stand by for Tester; if `/oc fix` findings, route `fix` (single entry, no duplicates with in-flight runs).
 - Main tip c49fce45: Deploy workflow_dispatch 36342334672 success at 18:53:46Z (post-merge window); next run confirm Deploy standing on the new tip.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. If #466 carries Reviewer `/oc approve` on live head with no later `/oc fix`: stand by for Tester (owner `/oc test` or route `test` only if no test run in flight and none queued).
2. If #466 carries `/oc fix` findings: route `fix` once (correlate against in-flight runs first).
3. If #466 carries Tester `approve-test` with no later `/oc fix`: route `eval` only if no eval run in flight.
4. On Evaluator `approve-eval` on the live head with no later `/oc fix`: merge `--rebase` (keep branch, keep #463 open), then chain the next roadmap phase via `build` on #463 (never halt on intermediate Refs PRs).
5. Never merge on review/test alone - `approve-eval` is the binding unlock.
6. Confirm Deploy success on main c49fce45; if missing/failed, investigate and trigger via dispatch.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will the Reviewer approve #466 (as Refs #463) or return findings to the Fixer?
 - After review, will test + eval gates pass so Phase 3 merges and the next phase chains?
 - Will Deploy confirm on c49fce45 (verify next run)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
