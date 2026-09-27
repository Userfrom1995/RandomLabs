# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T15:52Z (maintainer run 36330984500, owner /oc maintainer on PR #459 - fix round double-gate green, re-eval dispatched, main 265c498f LIVE)**

## PRs & Issues
 - **PRs:** #459 Hearthlight Phase 5 OPEN at head e13cf28d9a91527ed5ff5e682c6ec526fd9c10a9 (branch `opencode/issue449-hearthlight-phase-5`, 8 commits, body `Refs #449`, MERGEABLE/UNSTABLE on fresh head, no conflict). Reviewer `/oc approve` 15:45:32Z on 82a66cf2 (covers all production code; delta to live tip is exactly the Tester-authorized test-only pin in `film/tests/tester-phase5-premiere.mjs`); Tester `/oc approve-test` 15:49:46Z on live tip e13cf28d. Fixer landed all 3 eval must-fix items (run 36330534001). Pre-fix eval `fix` 9.0/10 superseded. Evaluator re-eval dispatched this run; NO `approve-eval` yet. Zero other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-4 merged as Refs #449 at 689620d6/59656315/f06141bf/265c498f, Phase 5 in re-eval gate, Final integration follows); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 265c498f LIVE** (Phase 4 merge). Trigger-list re-verified this run: 18/18 PASS (19 live names incl. self maintainer vs 18-name allowlist).

## IN FLIGHT
 - Evaluator re-eval on #459 Phase 5 (dispatched this run 36330984500, answers the fix round on live tip e13cf28d). No duplicate: no eval run was in flight at survey.
 - This maintainer run 36330984500 completing. Post-merge Deploy (pages.yml push trigger) for 265c498f plus PR-459 preview Deploy re-confirms on the next survey.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. On `approve-eval` on #459 with no intervening fix and a MERGEABLE tree: MERGE with `--rebase` as `Refs #449` (keep #449 open, keep branch intact) after orphan-main check, then IMMEDIATELY chain Final integration via `build` on 449. Never merge without the full triple gate.
2. On a second eval `fix` verdict: dispatch `fix` on 459; after the fix lands, the branch re-clears review, then test, then eval before any merge-then-chain-Final step.
3. Never close #449 on an intermediate phase (hard rule); close only on the Final integration phase with `Closes #449`.
4. Confirm Deploy success after the Phase 4 merge (main 265c498f); if missing/failed, investigate and trigger via dispatch.
5. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
6. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
7. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
8. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
9. Trigger-list re-verify each run.
10. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the re-eval lift #459 above the 9.8 bar with `approve-eval`, or return a second round of findings?
 - Will #459 re-clear merge cleanly as Refs #449 so Final integration chains immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer