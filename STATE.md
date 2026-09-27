# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T12:12Z (maintainer run 36318103629, owner /oc maintainer on PR #451 - re-eval fix verdict 9.0/10, fixer dispatched, main 0dec3653 LIVE)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head 188606bb = live branch tip, MERGEABLE/CLEAN, body `Refs #449`; fresh approve + approve-test on the live head, re-eval returned `fix` 9.0/10 with 3 narrow visual items; fixer dispatched this run). No other open PRs.
 - **Issues:** #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); #449 short-film tracking (OPEN, Phase 1 in second fix loop after 9.0/10 re-eval); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (infra stall-hardening merge #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 fix: fixer dispatched this run (eval run 36317912458 verdict: loading-veil flex layout, 3 jargon leaks, emoji/SVG mute inconsistency; head unchanged so no rebase needed).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Fixer lands on 451: route fresh `review` on the new head (never merge on a stale verdict), then `test`, then `eval` again.
2. When Evaluator returns `approve-eval` on a MERGEABLE tree: merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
3. When Evaluator returns new findings on 451: route `fix` again (same-repo bot PR, no infra files, `fix` is safe).
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the second fix round clear the 3 visual items and lift #451 above the 9.8 bar?
 - On approve-eval with a MERGEABLE tree: will Phase 1 merge as Refs #449 and Phase 2 (Hand-Drawn Render Craft) chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
