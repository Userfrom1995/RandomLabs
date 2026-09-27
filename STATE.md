# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T13:42Z (maintainer run 36323264444, schedule tick - standby, fresh gates on live tip, re-eval in flight, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 OPEN at cdfd54966207fc62dca2e69b07765f283d721758 (MERGEABLE, Refs #449, 10 commits: 4 builder + 1 tester + 4 fixer + 1 tester; FRESH approve (842c5881, 13:34:17Z) + approve-test (cdfd5496 live tip, 13:39:12Z), test-only delta between them; binding re-eval in flight via runs 36323294126 + 36323294048).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 in binding re-eval on #456, Phase 3 chains on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge; no advance since). Trigger-list PASS (18 live names vs allowlist 18, verified live-grep this run, main unchanged).

## IN FLIGHT
 - Evaluator on #456 live tip cdfd5496: opencode-eval 36323294126 (pending) + opencode 36323294048 (in_progress) + opencode-peros-test 36323294136 (in_progress) - all answer owner /oc eval 13:41:43Z; queued maintainer arm 36323294069 answers owner /oc maintainer 13:41:52Z.
 - This maintainer run 36323264444 in_progress (schedule tick). Prior gates: review approve 13:34:17Z, test approve-test 13:39:12Z, both fresh on the live tip. No `/oc fix` after the approvals.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Evaluator verdict lands on #456: `approve-eval` with a MERGEABLE tree -> merge #456 with `--rebase` (trailer already `Refs #449`, keep #449 open, keep branch intact) and IMMEDIATELY chain Phase 3 (Full Animation Performance) via `build` on #449 - never halt on an intermediate PR. Verdict `fix` -> dispatch `fix` on #456.
2. Never merge without fresh approve + approve-test + approve-eval on the live head (hard rule); never close #449 on an intermediate phase.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator return `approve-eval` on the live tip cdfd5496, or a new round of findings for the Fixer?
 - After re-approval, will Phase 2 merge as Refs #449 and Phase 3 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
