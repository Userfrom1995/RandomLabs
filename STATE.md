# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T12:28Z (maintainer run 36319024284, owner /oc maintainer on PR #451 - third eval fix verdict 8.3/10, fixer dispatched, main 0dec3653 LIVE)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head 6dbe6ee2 = live branch tip, MERGEABLE/CLEAN, body `Refs #449`; fresh `approve` + `approve-test` covered 6dbe6ee2 but eval returned `fix` 8.0->9.0->8.3 across three rounds - third fix dispatched this run, no merge until fresh approve/test/approve-eval on the new head). No other open PRs.
 - **Issues:** #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); #449 short-film tracking (OPEN, Phase 1 in third fix loop after production-path 404 finding); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (infra stall-hardening merge #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 fix: dispatched this run on head 6dbe6ee2 (owner `/oc maintainer` 12:27:03Z answered; eval `fix` 8.3/10 at 12:27:01Z on the live tip - player.js:128 fetch 404 in production + player.js:218 fullscreen-reload UX defect, plus 3 non-blocking notes). Eval run 36318760901 completed.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Fixer lands on 451: route a fresh `review` on the new head (all prior verdicts stale), then `test`, then `eval` - never merge on a stale verdict.
2. When Evaluator returns `approve-eval` on the new head with tree still MERGEABLE: merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
3. When Evaluator returns new findings on 451: route `fix` again (same-repo bot PR, no infra files, `fix` is safe).
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the third fix round clear the production-path 404 + fullscreen-reload defects and lift #451 above the 9.8 bar, or return a fourth round?
 - After approval, will Phase 1 merge as Refs #449 and Phase 2 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
