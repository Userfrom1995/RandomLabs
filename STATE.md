# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T14:02Z (maintainer run 36324443037, owner /oc maintainer on PR #456 - eval dispatched on live tip e1e4ec0c, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 OPEN at e1e4ec0c1ceada5eaa86773d6aa0f42e594fa19d (MERGEABLE/CLEAN, Refs #449, 12 commits; fresh approve 13:56:43Z on e1e4ec0c + fresh approve-test 14:01:40Z on e1e4ec0c both cover live head with zero delta; prior approve-eval 9.9/10 on cdfd5496 stale; re-eval dispatched this run).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 in re-eval on #456, Phase 3 Full Animation Performance chains on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge; Deploy green). Trigger-list PASS (18 allowlist vs 19 live names incl. self, verified live-grep this run, main unchanged).

## IN FLIGHT
 - Evaluator (re-eval, dispatched this run 36324443037) on #456 live tip e1e4ec0c. Re-gate order: review done, test done, eval pending; merge as Refs #449 + chain Phase 3 only on approve-eval.
 - This maintainer run 36324443037 in_progress.
 - Prior gates on live head: review run 36324072531 (approve 13:56:43Z on e1e4ec0c), test run 36324149842 (approve-test 14:01:40Z on e1e4ec0c, tree clean, no new commit).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the re-eval verdict lands on #456 (live tip e1e4ec0c): approve-eval + MERGEABLE tree -> merge with `--rebase` (trailer already `Refs #449`, keep #449 open, keep branch intact) and IMMEDIATELY chain Phase 3 (Full Animation Performance) via `build` on #449 - never halt on an intermediate PR. Fresh fix verdict -> `fix`.
2. Never merge without fresh approve + approve-test + approve-eval on the live head (hard rule); never close #449 on an intermediate phase.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator return approve-eval on the cleaned tip e1e4ec0c?
 - After approval, will Phase 2 merge as Refs #449 and Phase 3 (Full Animation Performance) chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
