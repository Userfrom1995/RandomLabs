# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T13:00Z (maintainer run 36320758689, owner /oc maintainer on PR #451 - Phase 1 MERGED, Phase 2 chained, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** none open (PR #451 MERGED 12:59:16Z as c43c56dd; branch `opencode/issue449-20260927113051` kept intact).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 Hand-Drawn Render Craft dispatched via build this run); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge, 18 ahead / 0 behind 0dec3653, no orphan). Trigger-list PASS (19 live names vs allowlist 18, verified live this window).

## IN FLIGHT
 - Phase 2 build on #449: dispatched this run (`{"action": "build", "issue": 449}`), Builder run pending (answers the chained build, not an owner trigger - no duplicate risk).
 - This maintainer run 36320758689 in_progress; sibling issue_comment arms for the 12:58:01 batch correctly skipped; workflow_run maintainer arms skipped/cancelled as expected.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Phase 2 Builder opens a PR on #449: route `review` on its head (never merge without approve + approve-test + approve-eval).
2. Confirm a Deploy (pages) success landed on merge tip c43c56dd (push-triggered run had not appeared ~1 min after merge; PR previews all green in window).
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Phase 2 Builder deliver the ink engine + vector rigs + valley paint set + stills gallery + determinism harness cleanly?
 - Did Deploy succeed on c43c56dd (verify next run)?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
