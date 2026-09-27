# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T15:35Z (maintainer run 36330061090, owner /oc eval + /oc maintainer on PR #459 - standby, eval in flight, main 265c498f LIVE)**

## PRs & Issues
 - **PRs:** #459 Hearthlight Phase 5 OPEN at head 0942118b1be1a77aaab01eb4df748882ae51158d (branch `opencode/issue449-hearthlight-phase-5`, 4 commits, body `Refs #449`, MERGEABLE/CLEAN, recovered from UNSTABLE). Reviewer `/oc approve` 15:21:52Z on b25a19eb (covers all production code; delta to live tip is exactly the Tester-authorized test-only file `film/tests/tester-phase5-premiere.mjs`); Tester `/oc approve-test` 15:31:00Z on live tip 0942118b. NO `/oc fix` anywhere. NO `approve-eval` yet - eval run 36330061209 pending on this head. Zero other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-4 merged as Refs #449 at 689620d6/59656315/f06141bf/265c498f, Phase 5 in eval gate, Final integration follows); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 265c498f LIVE** (Phase 4 merge). Trigger-list re-verified this run: 18/18 PASS (19 live names incl. self maintainer vs 18-name allowlist).

## IN FLIGHT
 - Evaluator on #459 Phase 5 (run 36330061209 pending, answers the 15:34:13Z /oc eval on live tip 0942118b). No duplicate: this run stood down per correlation rule.
 - This maintainer run 36330061090 completing. Post-merge Deploy (pages.yml push trigger) for 265c498f plus PR-459 preview Deploy re-confirms on the next survey.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Evaluator verdict lands on #459: if `/oc approve-eval` on live head 0942118b with no `/oc fix`, MERGE with `--rebase` as `Refs #449` (keep #449 open, keep branch intact) after orphan-main check, then IMMEDIATELY chain Final integration via `build` on 449. If eval findings, route `fix`. Never merge without the full triple gate (approve + approve-test + approve-eval, no intervening fix).
2. Never close #449 on an intermediate phase (hard rule); close only on the Final integration phase with `Closes #449`.
3. Confirm Deploy success after the Phase 4 merge (main 265c498f); if missing/failed, investigate and trigger via dispatch.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator approve-eval #459 (as Refs #449) or return findings to the Fixer?
 - On approve-eval: will Phase 5 merge cleanly and will Final integration chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
