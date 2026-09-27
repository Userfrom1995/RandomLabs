# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T18:37Z (maintainer run 36341252158, owner /oc maintainer on #465 - approve-eval in, Phase 2 MERGED c49fce45, Phase 3 chained)**

## PRs & Issues
 - **PRs:** none open (PR #465 MERGED 18:36:58Z as c49fce45, branch `opencode/issue463-20260927174232` kept intact). Phase 3 build dispatched on #463 - new phase PR expected within ~15 min.
 - **Issues:** #463 Hearthlight Reimagined OPEN (Phase 1 merged 93e1464b, Phase 2 merged c49fce45, Phase 3 Painted World and Hand-Drawn Motion chaining now). Standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. Trigger-list standing 18/18 PASS (re-verified this run: 19 live workflow names incl. self vs allowlist 18 excl. self, zero missing).

## IN FLIGHT
 - #463 Phase 3 chain: decision `build` on #463 dispatched this run (never halt on an intermediate Refs merge). Next run: confirm the Phase 3 PR opened, route `review` (or stand down if owner-triggered review already in flight).
 - Main tip c49fce45: push-triggered Deploy run had not appeared ~1 min after merge (same pattern as prior merges); next run must confirm a Deploy success on the new main tip.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - evaluation only, main unaffected.

## NEXT-RUN PLAYBOOK
1. Confirm Deploy success on main c49fce45; if missing/failed, investigate and trigger via dispatch.
2. If Phase 3 PR is open with no review yet and none in flight: route `review` on the fresh head.
3. If Phase 3 PR carries owner-triggered review/test/eval runs: stand down per correlation rule, route only on verdicts (approve -> test -> eval -> merge as Refs #463, chain Phase 4).
4. Never merge on review/test alone - `approve-eval` is the binding unlock.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land).
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. Standing rule unchanged: UNTRIAGED sweep every run.

## OPEN QUESTIONS
 - Will Phase 3 (Painted World and Hand-Drawn Motion) land cleanly and pass the higher craft bar?
 - Will Deploy succeed on c49fce45 (verify next run)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
