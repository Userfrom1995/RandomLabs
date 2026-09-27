# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T14:10Z (maintainer run 36324868585, owner /oc maintainer on PR #456 - Phase 2 MERGED as Refs #449, Phase 3 chained, main 59656315 LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 MERGED at 2026-09-27T14:10:23Z (merge commit 596563155c5c, rebased, branch `opencode/issue449-hearthlight-phase-2` kept intact; triple gate all on live tip e1e4ec0c: approve 13:56:43Z + approve-test 14:01:40Z + approve-eval 9.9/10 14:08:57Z, zero delta, MERGEABLE/CLEAN, Refs #449). No other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 merged as Refs #449, Phase 3 Full Animation Performance dispatched this run via build); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 59656315 LIVE** (Phase 2 merge; was c43c56dd). Trigger-list PASS (18 allowlist vs 19 live names incl. self, verified live-grep this run).

## IN FLIGHT
 - Builder (Phase 3, dispatched this run 36324868585) on #449: Full Animation Performance (keyframed acting, camera direction, weather/particles, 24 fps timeline lock) on a fresh phase branch.
 - This maintainer run 36324868585 in_progress.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Phase 3 build PR opens on #449: route `review`, then `test`, then `eval`; merge only on fresh approve + approve-test + approve-eval on the live head, always as `Refs #449` until the final phase.
2. Never close #449 on an intermediate phase (hard rule); close only on the final integration phase with `Closes #449`.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will Phase 3 (Full Animation Performance) scope cleanly from the merged Phase 2 tree?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
