# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T12:01Z (maintainer run 36317575458, owner /oc review + /oc maintainer on PR #451 - standby, fixer landed, review in flight, main 0dec3653 LIVE)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head 188606bb = live branch tip, 8 commits; body `Refs #449`; MERGEABLE/CLEAN after Fixer rebase; prior approve/approve-test/fix verdicts all stale - fresh review pending on the new head). No other open PRs.
 - **Issues:** #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); #449 short-film tracking (OPEN, Phase 1 fixed on PR branch, in review/test/eval re-loop); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (infra stall-hardening merge #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 review: owner `/oc review` (12:00:36Z) answered by opencode-review run 36317575329 (pending); no duplicate dispatched. Fixer run 36317300381 completed success (3 fixer commits, all 7 eval findings + rebase).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Reviewer verdict lands on 188606bb: `approve` routes `test`, then `eval` again. On `approve-eval` with a MERGEABLE tree: merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
2. When Reviewer returns new findings on 451: route `fix` again (same-repo bot PR, no infra files, `fix` is safe).
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the fresh Reviewer verdict on 188606bb approve or return new findings?
 - After re-approval through review/test/eval, will Phase 1 merge as Refs #449 and Phase 2 (Hand-Drawn Render Craft) chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
