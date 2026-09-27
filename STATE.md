# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:52Z (maintainer run 36317077707, owner /oc maintainer on closed PR #455 - standby, superseded close confirmed, main 0dec3653 LIVE)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head 3fbfaced = live branch tip, 5 commits, body `Refs #449`; Reviewer `/oc approve` 11:43:50Z, Tester `/oc approve-test` 11:46:29Z, NO `/oc fix` after approvals; CONFLICTING/DIRTY vs main; eval run 36317055555 pending). #455 CLOSED unmerged 11:51:20Z by owner as superseded (reviewer-prescribed: main already holds the #450 fix via #454; branch tip == main tip 0dec3653, nothing stranded, no recover).
 - **Issues:** #450 stall-hardening (OPEN, fix delivered via #454 merge 0dec3653, held open until self-triage acceptance verifies); #449 short-film tracking (OPEN, Phase 1 built on PR branch, awaiting eval/merge); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (infra stall-hardening merge #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 eval: opencode-eval run 36317055555 pending (dispatched run 36316822646); no duplicate. Merge blocked until `approve-eval` AND conflict resolution (Fixer rebase post-eval).
 - PR #455: closed, no in-flight work. The 11:51:16Z lab push rejection was the expected owner-force-push race, stood down.
 - Deploy dispatch 36316899887 in_progress at last check; dispatch 36316854905 success.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Evaluator posts `/oc approve-eval` on 451 (no later `/oc fix`): route `fix` on 451 to rebase/resolve the CONFLICTING state against main 0dec3653 (same-repo bot PR, no infra files in diff so `fix` is safe), then fresh review if the rebase moves the head, then merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
2. When Evaluator posts `fix`/rejection findings on 451: route `fix` on 451 (quality findings + conflict resolution together).
3. On #450 acceptance evidence (self-triage routing within one interval on bot-created content): close #450 with a comment citing the proof. Until then keep it open; no lab re-dispatch (work complete).
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator approve-eval #451, and will the post-eval rebase resolve the conflict cleanly?
 - After merge as Refs #449, will Phase 2 (Hand-Drawn Render Craft) chain immediately?
 - When will #450's acceptance bar verify so it can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
