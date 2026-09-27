# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T15:58Z (maintainer run 36331376049, owner /oc maintainer on PR #459 - MERGED as 19e96f8e, Final integration chained, main LIVE)**

## PRs & Issues
 - **PRs:** #459 Hearthlight Phase 5 MERGED 15:58:14Z as `19e96f8e` via `--rebase` (head `e13cf28d`, body `Refs #449`, orphan-main merge-base check passed on `265c498f`, branch kept intact). Triple gate: approve 15:45:32Z on 82a66cf2 (production cover; delta test-only pin), approve-test 15:49:46Z on live tip e13cf28d, approve-eval 15:56:20Z score 9.8/10. Zero other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-5 merged as Refs #449 at c43c56dd/59656315/f06141bf/265c498f/19e96f8e, Final integration build dispatched this run); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 19e96f8e LIVE** (Phase 5 merge; Deploy pages run to confirm on next survey). Trigger-list re-verified this run: 18/18 PASS (19 live names incl. self maintainer vs 18-name allowlist).

## IN FLIGHT
 - Builder Final integration on #449 (dispatched this run via `build`; eval advisories ride along: DOM-parse wiring assertions, trailer hero-frame hash vs film twin, extra vttStamp boundary pin).
 - Post-merge Deploy (pages.yml push trigger) for 19e96f8e to confirm on next survey, plus PR-preview Deploy sweep.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. On the Final-phase build PR: route `review` when work looks complete on a fresh head (dedupe against existing `/oc review (head <sha>)` comments); then `test`, then `eval` on double-gate green; merge only on the full triple gate with no intervening fix.
2. Final phase closes the epic: only a Final PR with `Closes #449` and all acceptance criteria met closes #449. Never close #449 on anything less.
3. On a second eval `fix` verdict on any future phase: dispatch `fix`; after the fix lands, re-clear review, then test, then eval before any merge.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery).
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Final integration build scope cleanly (semantic phase name, unified docs, no milestone leakage)?
 - Will #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
