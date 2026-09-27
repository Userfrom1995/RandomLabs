# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T12:33Z (maintainer run 36319287778, owner /oc maintainer on PR #451 - standby, third fix landed, review in flight, main 0dec3653 LIVE)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head 8385ae62 = live branch tip, MERGEABLE/CLEAN, body `Refs #449`; third fix round landed all 2 load-bearing eval defects + 3 notes, owner's `/oc review` has a review run pending - no merge until fresh approve/test/approve-eval on the new head). No other open PRs.
 - **Issues:** #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); #449 short-film tracking (OPEN, Phase 1 in third re-review loop after production-path 404 + fullscreen-reload fix); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (infra stall-hardening merge #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 review: owner's `/oc review` 12:31:35Z answered by opencode-review run pending (12:31:47Z batch) on head 8385ae62; maintainer dispatch stood down per correlation rule (no duplicate).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Reviewer approves 451 on 8385ae62: route `test`, then `eval` - never merge on review+test alone, never merge without approve-eval.
2. When the Reviewer returns findings on 451: route `fix` (same-repo bot PR, no infra files, `fix` is safe).
3. When Evaluator returns `approve-eval` on the new head with tree still MERGEABLE: merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the fresh Reviewer verdict on 8385ae62 approve the production-404 + fullscreen-reload fixes or return new findings?
 - After re-approval through review/test/eval, will Phase 1 merge as Refs #449 and Phase 2 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
