# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T12:18Z (maintainer run 36318489045, owner /oc review + /oc maintainer on PR #451 - standby, second fix landed, review in flight, main 0dec3653 LIVE)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head 6dbe6ee2 = live branch tip, MERGEABLE/CLEAN, body `Refs #449`; second fix round landed per 9.0/10 re-eval verdict, owner `/oc review` has a review run pending - no duplicate dispatched). No other open PRs.
 - **Issues:** #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); #449 short-film tracking (OPEN, Phase 1 in second re-review loop after 9.0/10 re-eval); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (infra stall-hardening merge #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 review: opencode-review pending on new head 6dbe6ee2 (owner `/oc review` 12:17:13Z, run created 12:17:24Z). Fix run 36318203249 completed success (3 fixer commits).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Reviewer verdict lands on 6dbe6ee2: `approve` routes `test`, then `eval` again (never merge on a stale verdict); new findings route `fix`.
2. When Evaluator returns `approve-eval` on a MERGEABLE tree: merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
3. When Evaluator returns new findings on 451: route `fix` again (same-repo bot PR, no infra files, `fix` is safe).
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the fresh Reviewer verdict on 6dbe6ee2 approve or return new findings?
 - After re-approval through review/test/eval, will Phase 1 merge as Refs #449 and Phase 2 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
