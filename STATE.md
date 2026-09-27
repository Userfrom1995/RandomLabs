# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T16:43Z (maintainer run 36334157979, owner /oc maintainer on PR #462 - MERGED to 9f45cf91)**

## PRs & Issues
 - **PRs:** Zero open PRs. #462 Curator public-surface sync (Fixes #461) MERGED 16:42:25Z as `9f45cf91` (rebase, branch kept; head `1f2b98d7`, MERGEABLE/CLEAN, Reviewer approve + Tester approve-test, orphan check clean).
 - **Issues:** #461 CLOSED (auto-closed by merge). #450 stall-hardening OPEN (standing, no new signal this run); standing boards open: #70 lab-health, #42 brainstorm. #449 short-film epic CLOSED (PR #460 Final merged as `a4c8aed6`).
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 9f45cf91 LIVE** (curate merge Fixes #461). Trigger-list standing 18/18 PASS (re-verified this run: 19 live `name:` fields incl. self vs allowlist 18).

## IN FLIGHT
 - Post-merge Deploy verification for main tip 9f45cf91 (run had not appeared ~1 min after merge; confirm next run). Deploy on prior tip a4c8aed6 likewise unconfirmed - folded in.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. Confirm Deploy success on main tip 9f45cf91.
2. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed hardening machinery).
3. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
4. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will Deploy succeed on the new main tip 9f45cf91?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer