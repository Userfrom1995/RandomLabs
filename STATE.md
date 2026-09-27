# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T14:22Z (maintainer run 36325542131, owner /oc maintainer on PR #457 - standby, review approved, test in flight, main 59656315 LIVE)**

## PRs & Issues
 - **PRs:** #457 Hearthlight Phase 3 OPEN at a60df451 (branch `opencode/issue449-hearthlight-phase-3`, 3 commits, body `Refs #449`, MERGEABLE/CLEAN; Reviewer `/oc approve` 14:21:11Z on the live tip, Tester in flight on owner `/oc test` 14:21:15Z). No other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 merged as Refs #449 at 59656315, Phase 3 in review); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 59656315 LIVE** (Phase 2 merge). Trigger-list PASS (18 allowlist vs 19 live names incl. self, verified live-grep this run).

## IN FLIGHT
 - Tester on PR #457 (owner `/oc test` 14:21:15Z, opencode-test in_progress): frame lock, weather determinism, 240-frame sweep gates.
 - This maintainer run 36325542131 in_progress.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Tester approve-test lands on #457 (live head a60df451, no intervening `/oc fix`): route `eval`; on approve-eval: merge with `--rebase` as `Refs #449` (never close #449 on an intermediate phase) and IMMEDIATELY chain Phase 4 (Original Score and Sound World) via `build` on #449.
2. Never close #449 on an intermediate phase (hard rule); close only on the final integration phase with `Closes #449`.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Tester approve-test #457 or return adversarial findings?
 - Will the Evaluator approve-eval #457 so Phase 3 merges and Phase 4 chains?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
