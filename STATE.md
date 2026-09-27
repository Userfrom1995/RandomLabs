# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T13:18Z (maintainer run 36321867709, owner /oc maintainer on PR #456 - approve + approve-test in, eval dispatched, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 OPEN at 4d64e6e3dc46c467b03cc16f3e45281cea6edeb0 (MERGEABLE, Refs #449, approve 13:15:27Z via run 36321666992 + approve-test 13:17:10Z via run 36321770397, delta test-only, eval dispatched this run).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 in eval gate on #456, Phase 3 chains on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge; Deploy green on the tip; PR preview held action_required, branch-scoped). Trigger-list PASS (18 live names vs allowlist 18, verified live this run).

## IN FLIGHT
 - Evaluator on #456: dispatched this run (`eval`, answers the lifted approve + approve-test chain on live tip 4d64e6e3) - pending.
 - This maintainer run 36321867709 in_progress. Review run 36321666992 success; test run 36321770397 success; sibling review arm 36321676350 cancelled (absorbed, stood down).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Evaluator verdicts on #456: `approve-eval` with a MERGEABLE tree -> merge #456 with `--rebase` (trailer already `Refs #449`, keep #449 open, keep branch intact) and IMMEDIATELY chain Phase 3 (Full Animation Performance) via `build` on #449 - never halt on an intermediate PR. Findings -> Fixer (`fix`).
2. Never merge without approve + approve-test + approve-eval (hard rule); never close #449 on an intermediate phase.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator return `approve-eval` on #456, or a round of findings for the Fixer?
 - On approve-eval with a MERGEABLE tree: will Phase 2 merge as Refs #449 and Phase 3 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
