# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T14:26Z (maintainer run 36325841855, owner /oc maintainer on PR #457 - eval dispatched, main 59656315 LIVE)**

## PRs & Issues
 - **PRs:** #457 Hearthlight Phase 3 OPEN at bafe4edd (branch `opencode/issue449-hearthlight-phase-3`, 4 commits: 3 builder + 1 tester hostile suite, body `Refs #449`, MERGEABLE/UNSTABLE where UNSTABLE is the by-design held PR-branch Deploy + pr-trigger runs, branch-scoped, not a merge defect). Reviewer `/oc approve` 14:21:11Z on a60df451 (covers all production code; delta to live tip verified test-only: exactly one file `film/tests/tester-phase3-hostile.mjs`). Tester `/oc approve-test` 14:25:08Z on live tip bafe4edd. No other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449 at c43c56dd, Phase 2 merged as Refs #449 at 59656315, Phase 3 in gate); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 59656315 LIVE** (Phase 2 merge). Trigger-list PASS (18 allowlist vs 19 live names incl. self, verified live-grep this run).

## IN FLIGHT
 - Evaluator on PR #457 (dispatched this run 36325841855): frame lock, weather determinism, 240-frame sweep, hostile resilience gates.
 - This maintainer run 36325841855 in_progress.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Evaluator approve-eval lands on #457 (live head bafe4edd, no intervening `/oc fix`): merge with `--rebase` as `Refs #449` (never close #449 on an intermediate phase) and IMMEDIATELY chain Phase 4 (Original Score and Sound World) via `build` on #449. If eval returns `fix`: route `fix` on 457.
2. Never close #449 on an intermediate phase (hard rule); close only on the final integration phase with `Closes #449`.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator approve-eval #457 above the bar, or return findings for the Fixer?
 - On approve-eval with a MERGEABLE tree: will Phase 3 merge as Refs #449 and Phase 4 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
