# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T13:33Z (maintainer run 36322772128, owner /oc maintainer on PR #456 - standby, fix landed, re-review in flight, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 OPEN at 842c5881b7896020364cb544e299dec720a9cd13 (MERGEABLE/CLEAN, Refs #449, 9 commits: 4 builder + 1 tester + 4 fixer; prior approve + approve-test + eval-fix-9.6/10 ALL STALE on the new head; re-review in flight via runs 36322765080 + 36322772073).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 in re-gate on #456, Phase 3 chains on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge; Deploy success 36322771020; PR preview held action_required, branch-scoped). Trigger-list PASS (18 live names vs allowlist 18, verified live-grep this run, main unchanged).

## IN FLIGHT
 - Reviewer on #456 post-fix head: runs 36322765080 (in_progress) + 36322772073 (pending, concurrency dedupe) - both answer owner /oc review 13:32:39Z; whichever survives covers live tip 842c5881.
 - This maintainer run 36322772128 in_progress. Fix run 36322624108 success (5/5 eval items, verdict 13:32:38Z). Stale gates: review run 36321666992 (approve), test run 36321770397 (approve-test), eval run 36322016392 (fix 9.6/10).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When fresh review lands on #456: approve -> `test`; findings -> `fix`. Then approve-test -> `eval`; re-eval fix -> `fix`.
2. On `approve-eval` with a MERGEABLE tree -> merge #456 with `--rebase` (trailer already `Refs #449`, keep #449 open, keep branch intact) and IMMEDIATELY chain Phase 3 (Full Animation Performance) via `build` on #449 - never halt on an intermediate PR.
3. Never merge without fresh approve + approve-test + approve-eval on the live head (hard rule); never close #449 on an intermediate phase.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the fresh Reviewer pass the post-fix head 842c5881, or open a new fix round?
 - After re-approval through review/test/eval, will Phase 2 merge as Refs #449 and Phase 3 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
