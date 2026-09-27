# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T13:42Z (maintainer run 36323294069, owner /oc maintainer on PR #456 - standby, re-eval in flight on live tip, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 OPEN at cdfd54966207fc62dca2e69b07765f283d721758 (MERGEABLE, Refs #449, 10 commits: 4 builder + 2 tester + 4 fixer; fresh approve 13:34:17Z on 842c5881 covering all production code + fresh approve-test 13:39:12Z on live tip cdfd5496 with test-only delta; stale eval-fix-9.6/10 superseded; re-eval run 36323294126 pending on the live tip).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 in re-eval on #456, Phase 3 chains on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge; Deploy green on main + PR preview). Trigger-list PASS (19 live names vs allowlist 18, verified live-grep this run, main unchanged).

## IN FLIGHT
 - Evaluator (re-eval) on #456 run 36323294126 pending (answers owner /oc eval 13:41:43Z on live tip cdfd5496) - the binding gate before merging Phase 2 as Refs #449 and chaining Phase 3.
 - This maintainer run 36323294069 in_progress. Review run (approve 13:34:17Z) + test run 36322863489 (approve-test 13:39:12Z, pushed cdfd5496) both success. Stale gates: review run 36321666992 (approve), test run 36321770397 (approve-test), eval run 36322016392 (fix 9.6/10), fix run 36322624108 (5/5 items).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the re-eval verdict lands on #456: approve-eval + MERGEABLE tree -> merge with `--rebase` (trailer already `Refs #449`, keep #449 open, keep branch intact) and IMMEDIATELY chain Phase 3 (Full Animation Performance) via `build` on #449 - never halt on an intermediate PR. Fresh fix verdict -> `fix`.
2. Never merge without fresh approve + approve-test + approve-eval on the live head (hard rule); never close #449 on an intermediate phase.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the re-eval lift Phase 2 above the bar with `approve-eval`, or return a second round of findings?
 - After approval, will Phase 2 merge as Refs #449 and Phase 3 (Full Animation Performance) chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer