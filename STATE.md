# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T15:21Z (maintainer run 36329205114, owner /oc review + /oc maintainer on PR #459 - standby, review queued, main 265c498f LIVE)**

## PRs & Issues
 - **PRs:** #459 Hearthlight Phase 5 OPEN at head b25a19eb69dedfda6693e3fa8b2932327f994c89 (branch `opencode/issue449-hearthlight-phase-5`, 3 commits, body `Refs #449`, MERGEABLE). Owner `/oc review` 15:20:33Z answered by queued opencode-review run 36329205171 (pending); NO verdict yet, NO `/oc fix` anywhere. Zero other open PRs (#458 merged as 265c498f).
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-4 merged as Refs #449 at 689620d6/59656315/f06141bf/265c498f, Phase 5 in review gate, Final integration follows); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 265c498f LIVE** (Phase 4 merge). Trigger-list re-verified this run: 18/18 PASS (19 live names incl. self maintainer vs 18-name allowlist).

## IN FLIGHT
 - Reviewer on #459 Phase 5 (opencode-review run 36329205171 pending, answers owner `/oc review` 15:20:33Z on head b25a19eb). No duplicate dispatched this run per correlation rule.
 - This maintainer run 36329205114 completing. Post-merge Deploy (pages.yml push trigger) for 265c498f plus PR-459 preview Deploy (workflow_dispatch 36329206143 success) re-confirms on the next survey.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Reviewer verdict lands on #459: if `/oc approve` on live head b25a19eb with no `/oc fix`, route `test`; if `/oc fix` findings, route `fix`. Never merge without the full triple gate (approve + approve-test + approve-eval, no intervening fix).
2. Never close #449 on an intermediate phase (hard rule); close only on the Final integration phase with `Closes #449`.
3. Confirm Deploy success after the Phase 4 merge (main 265c498f); if missing/failed, investigate and trigger via dispatch.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Reviewer approve #459 (as Refs #449) or return findings to the Fixer?
 - Will the Tester approve-test #459 (14-suite sweep, trailer paints, caption export) and the Evaluator approve-eval so Phase 5 merges and Final integration chains?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
