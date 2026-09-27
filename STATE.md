# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T14:53Z (maintainer run 36327521170, owner /oc maintainer on PR #458 - standby, review in flight, main f06141bf LIVE)**

## PRs & Issues
 - **PRs:** #458 Hearthlight Phase 4 OPEN at 35aaa29ca934c1d28996fdfc8ac7bf3167bf4480 (branch `opencode/issue449-hearthlight-phase-4`, 5 commits, body `Refs #449`, film/ + progress/ only, no infra files). Review run 36327521102 pending (answers owner's `/oc review` 14:52:33Z). No approvals yet - merge hard-blocked until approve + approve-test + approve-eval.
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-3 merged as Refs #449 at 689620d6/59656315/f06141bf, Phase 4 in review gate, Phase 5 premiere cut chains on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main f06141bf LIVE** (Phase 3 merge). Trigger-list last verified 18/18 PASS in run 36326495432 (not re-grepped this run; PR #458 touches no workflows).

## IN FLIGHT
 - Reviewer on #458 (run 36327521102 pending, owner's `/oc review` 14:52:33Z) - verdict pending.
 - This maintainer run 36327521170 completing. Post-merge Deploy (pages.yml push trigger on f06141bf) should appear shortly - next run confirms a Deploy success on the new main tip.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Reviewer verdict lands on #458: on `/oc approve` (live head, no fix) await test/eval; on `/oc fix` findings route `fix` on #458.
2. On Tester `/oc approve-test` with no later fix: route `eval` on #458 (never merge on approve + approve-test alone).
3. On Evaluator `approve-eval` with no intervening fix: merge #458 with `--rebase` (keep branch, keep #449 open) and IMMEDIATELY chain Phase 5 via `build` on #449 - never output [] on an intermediate merge.
4. Never close #449 on an intermediate phase (hard rule); close only on the final integration phase with `Closes #449`.
5. Confirm Deploy success on main f06141bf; if missing/failed, investigate and trigger via dispatch.
6. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
7. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
8. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
9. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
10. Trigger-list re-verify each run.
11. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Reviewer approve #458 (as Refs #449) or return findings to the Fixer?
 - Will the Tester approve-test #458 and the Evaluator approve-eval so Phase 4 merges and Phase 5 (premiere cut) chains?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
