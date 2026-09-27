# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T13:50Z (maintainer run 36323725760, owner /oc maintainer on PR #456 - approve-eval stale on new head, fresh review dispatched, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 OPEN at c3f41a1ea69bd24f944f726fecd8d91d0d5a4c1d (MERGEABLE, Refs #449, 11 commits: 4 builder + 2 tester + 4 fixer + 1 eval; approve 13:34:17Z on 842c5881 + approve-test 13:39:12Z on cdfd5496 + approve-eval 9.9/10 13:49:19Z on cdfd5496 ALL STALE against c3f41a1e; tip commit adds root package.json/package-lock.json, unreviewed harness leakage; fresh review dispatched this run).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 in re-gate on #456, Phase 3 Full Animation Performance chains on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge; Deploy green on main + PR preview). Trigger-list PASS (18 allowlist vs 19 live names incl. self, verified live-grep this run, main unchanged).

## IN FLIGHT
 - Reviewer (fresh review) on #456 dispatched this run on live tip c3f41a1e (answers the post-approve-eval head move; no gate run was in flight on the new head). Re-gate order: review, then test, then re-eval; merge as Refs #449 + chain Phase 3 only on approve-eval.
 - This maintainer run 36323725760 in_progress. Prior gates all success but stale: review (approve 13:34:17Z), test run 36322863489 (approve-test 13:39:12Z, pushed cdfd5496), eval run 36323285820 (approve-eval 9.9/10 13:49:19Z on cdfd5496), fix run 36322624108 (5/5 items).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the fresh review verdict lands on #456 (live tip c3f41a1e): approve + MERGEABLE tree -> Tester (`test`); approve-test on the live tip -> Evaluator (`eval`); approve-eval + MERGEABLE tree -> merge with `--rebase` (trailer already `Refs #449`, keep #449 open, keep branch intact) and IMMEDIATELY chain Phase 3 (Full Animation Performance) via `build` on #449 - never halt on an intermediate PR. Fresh fix verdict -> `fix`.
2. Never merge without fresh approve + approve-test + approve-eval on the live head (hard rule); never close #449 on an intermediate phase.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Reviewer keep or drop the root package.json/package-lock.json on #456, and approve the live tip?
 - After re-approval, will Phase 2 merge as Refs #449 and Phase 3 (Full Animation Performance) chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
