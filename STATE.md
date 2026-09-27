# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:46Z (maintainer run 36316797650, PR #454 closed/merged event - eval dispatched on #451)**

## PRs & Issues
 - **PRs:** #454 MERGED to main 0dec3653 (stall-hardening infra for #450, 3 `lab:` commits, `Refs #450`). #451 OPEN (Hearthlight Phase 1 for #449, head 3fbfaced, branch `opencode/issue449-20260927113051`, Reviewer `/oc approve` on b48635da, Tester `/oc approve-test` on 3fbfaced with durable theatre suite committed, BUT live state CONFLICTING/DIRTY vs main - rebase needed after eval).
 - **Issues:** #450 stall-hardening (OPEN, fix merged as `Refs` - acceptance needs post-merge observation of Architect/Builder routing within one schedule interval on the next bot-created issue); #449 short-film tracking (OPEN, Phase 1 built on PR #451 branch); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 0dec3653 LIVE** (689620d6 + 3 lab commits from PR #454). Trigger-list 18/18 PASS.

## IN FLIGHT
 - Evaluator dispatched on #451 this run (no eval run was in flight; Tester approval sits on the current head with no later `/oc fix`).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Evaluator posts `approve-eval` on #451 (no later findings): route `fix` on 451 first (rebase onto new main; non-infra PR so `fix` is safe, never `lab`), re-verify on the new head (review/test as needed), then merge with `--rebase` (keep branch, trailer already `Refs #449`, keep #449 open), verify main, confirm Deploy, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
2. When the Evaluator posts findings on #451: route `fix` on 451 (safe, non-infra), provided no same-branch run is in flight.
3. Observe #450 acceptance: on the next bot-created issue, confirm Architect/Builder routing within one schedule interval (self-dispatch + UNTRIAGED sweep); only then may a PR use `Closes #450`.
4. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
5. Trigger-list re-verify each run.
6. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator approve #451, and will the Fixer rebase resolve the DIRTY state cleanly for merge?
 - After #451 merges, will Phase 2 (Hand-Drawn Render Craft) chain cleanly via build/continue on #449?
 - Will post-merge observation confirm the #450 acceptance bar (routing within one schedule interval on the next bot-created issue)?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer