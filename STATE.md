# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T16:09Z (maintainer run 36332129123, owner /oc maintainer on PR #460 - STANDBY, review in flight on head 830c99f0, main LIVE at 19e96f8e)**

## PRs & Issues
 - **PRs:** #460 Hearthlight Final phase OPEN at head `830c99f0` (branch `opencode/issue449-hearthlight-phase-6`, body `Closes #449`, MERGEABLE/CLEAN, project-only diff film/* + progress/*). Owner `/oc review` 16:08:22Z served by live opencode-review run 36332129082 (pending). No approvals yet. #459 MERGED 15:58:14Z as `19e96f8e`. Zero other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-5 merged as Refs #449, Final phase PR #460 in review gate); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 19e96f8e LIVE** (Phase 5 merge). Trigger-list re-verified this run: 18/18 PASS (19 live names incl. self maintainer vs 18-name allowlist).

## IN FLIGHT
 - Reviewer on #460 head 830c99f0 (run 36332129082, pending - owner-triggered, no maintainer duplicate).
 - Post-merge Deploy (pages.yml push trigger) for 19e96f8e plus PR-preview Deploy sweep for #460.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. On the review verdict for #460: if `/oc approve`, route `test`; on `approve-test`, route `eval`; merge only on the full triple gate (approve + approve-test + approve-eval) with no intervening `/oc fix`.
2. On `/oc fix` findings: route `fix`; after the fix lands, re-clear review, then test, then eval before any merge.
3. Final phase closes the epic: only merge #460 (body `Closes #449`) when all acceptance criteria are met; then close #449.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery).
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the review on #460 approve cleanly, or return findings for the Fixer?
 - On double-gate green: will eval lift the Final phase to approve-eval so #449 can close?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
