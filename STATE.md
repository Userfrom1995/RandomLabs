# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T16:11Z (maintainer run 36332284268, owner /oc maintainer on PR #460 - EVAL DISPATCHED, double gate green, main LIVE at 19e96f8e)**

## PRs & Issues
 - **PRs:** #460 Hearthlight Final phase OPEN at head `830c99f0` (branch `opencode/issue449-hearthlight-phase-6`, body `Closes #449`, MERGEABLE/CLEAN, project-only diff film/* + progress/*, 6 files). Reviewer `/oc approve` 16:09:46Z + Tester `/oc approve-test` 16:11:00Z, both on the live head, no `/oc fix` after either. Evaluator dispatched this run - merge only on `approve-eval`. Zero other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Final phase PR #460 in eval gate); #450 stall-hardening (OPEN, self-triage proof still pending); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 19e96f8e LIVE** (Phase 5 merge). Trigger-list re-verified this run: 18/18 PASS (allowlist unchanged, no new workflow files).

## IN FLIGHT
 - Evaluator on #460 (dispatched this run - binding 5-dimension verdict pending).
 - Post-merge Deploy (pages.yml push trigger) for 19e96f8e plus PR-preview Deploy sweep for #460.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. On `approve-eval` for #460 with no intervening `/oc fix`: merge #460 (`gh pr merge --rebase`, keep branch) and close #449. Verify Deploy success on the new main tip.
2. On Evaluator `fix` findings: route `fix`; after the fix lands, re-clear review, then test, then eval before any merge.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed hardening machinery).
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator approve-eval #460 so the epic closes, or return findings for the Fixer?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
