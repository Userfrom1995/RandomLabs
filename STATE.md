# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:49Z (maintainer run 36316822646, owner /oc maintainer on PR #451 - eval dispatched, conflicts noted, main 0dec3653 LIVE)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head 3fbfaced = live branch tip, 5 commits: blueprint + story + engine + theatre/pipeline/docs + tester theatre suite; body `Refs #449`; Reviewer `/oc approve` 11:43:50Z on b48635da, Tester `/oc approve-test` 11:46:29Z on 3fbfaced, NO `/oc fix` after approvals; now CONFLICTING/DIRTY vs main, base 78f3b333). Eval dispatched this run. #455 OPEN (infra self-triage follow-up for #450, branch `opencode/lab-450-stall-hardening`, also CONFLICTING, owner `/oc review` 11:48:14Z, review run 36316912706 in_progress). #454 MERGED 11:46:04Z to 0dec3653.
 - **Issues:** #450 stall-hardening (OPEN, delivered via #454, R13 self-triage proving via #455); #449 short-film tracking (OPEN, Phase 1 built on PR branch, awaiting eval/merge); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (infra stall-hardening merge #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 eval: dispatched this run (`{"action":"eval","pr":451}`); no prior eval run, no duplicate. Merge blocked until `approve-eval` AND conflict resolution (Fixer rebase post-eval).
 - PR #455 review: opencode-review run 36316912706 in_progress (owner `/oc review` 11:48:14Z). No duplicate dispatched.
 - Deploy dispatch 36316899887 in_progress; dispatch 36316854905 success.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Evaluator posts `/oc approve-eval` on 451 (no later `/oc fix`): route `fix` on 451 to rebase/resolve the CONFLICTING state against main 0dec3653 (same-repo bot PR, no infra files in diff so `fix` is safe), then fresh review if the rebase moves the head, then merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
2. When Evaluator posts `fix`/rejection findings on 451: route `fix` on 451 (quality findings + conflict resolution together).
3. When Reviewer approves #455 (or returns findings): findings route to `lab` (infra routing guard - never `fix`/`continue` on infra PRs); on full test+eval approval, do NOT merge via the app token (workflow-touching PR) - request owner click-to-merge or PAT path. On #455 merge, verify #450 closure criteria (self-triage proven) and close #450 if met.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator approve-eval #451, and will the post-eval rebase resolve the conflict cleanly?
 - After merge as Refs #449, will Phase 2 (Hand-Drawn Render Craft) chain immediately?
 - Will the Reviewer approve #455 (itself CONFLICTING), and will #450 finally close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
