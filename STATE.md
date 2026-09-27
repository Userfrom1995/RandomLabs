# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T16:40Z (maintainer run 36334001841, owner /oc maintainer on PR #462 - standby, review approved, test in flight)**

## PRs & Issues
 - **PRs:** One open PR. #462 Curator public-surface sync (Fixes #461) OPEN at head `1f2b98d7` (branch `opencode/issue461-curate-hearthlight-graduate-kinetica-archive`, MERGEABLE/CLEAN). Reviewer `/oc approve` 16:39:42Z governs the live head (no pushes since review dispatch 16:38:34Z). Tester run 36334061134 in_progress (owner `/oc test` 16:39:43Z).
 - **Issues:** #461 curator tracking OPEN (linked PR #462 in gate); #450 stall-hardening (OPEN, self-triage proof still pending); standing boards open: #70 lab-health, #42 brainstorm. #449 short-film epic CLOSED 16:16Z (PR #460 Final merged as `a4c8aed6`).
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main a4c8aed6 LIVE** (Final merge). Trigger-list standing 18/18 PASS (re-verified this run: 19 live `name:` fields incl. self vs allowlist 18).

## IN FLIGHT
 - Tester on PR #462 (opencode-test run 36334061134 in_progress). On `/oc approve-test` with no intervening `/oc fix`: merge #462 via `--rebase` (keep branch), close #461.
 - Post-merge Deploy verification for main tip a4c8aed6 (still unconfirmed; fold into the merge run).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` (no new signal, no PR vehicle): tor-cli CI branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.
 - Sibling maintainer run 36334071951 in_progress (16:39:57Z batch): per-PR concurrency absorbs the pair; this run dispatches nothing to avoid duplicates.

## NEXT-RUN PLAYBOOK
1. If Tester approved #462 with no later findings: merge (`gh pr merge 462 --rebase`, no `--delete-branch`), close #461, confirm Deploy success on the new main tip.
2. If Tester returned findings: route `fix` on #462 (diff touches README/index/archive only - no infra files, routine path).
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed hardening machinery). Note: #461 (bot-created 16:37:41Z) did summon owner `/oc review` + `/oc maintainer` promptly - relevant evidence for #450.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Tester approve-test #462, or return findings on the archive repoint?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
