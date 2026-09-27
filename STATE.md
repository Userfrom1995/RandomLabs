# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T15:10Z (maintainer run 36328406146, owner /oc maintainer on PR #458 - TRIPLE GATE GREEN, MERGED Phase 4, Phase 5 chained, main 265c498f LIVE)**

## PRs & Issues
 - **PRs:** #458 Hearthlight Phase 4 MERGED at 15:10:12Z as 265c498f (rebase, branch `opencode/issue449-hearthlight-phase-4` kept intact, body `Refs #449`). Triple gate on live head 5148d2e: Reviewer approve 14:58:18Z (35aaa29c, all production code; test-only delta to tip) + Tester approve-test 15:00:30Z (live render + hostile probes green) + Evaluator approve-eval 15:07:36Z (9.8/10, success run 36328151828; duplicate eval arm 36328166955 cancelled by concurrency, not a defect). No `/oc fix` after any approval. Zero other open PRs.
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-4 merged as Refs #449 at 689620d6/59656315/f06141bf/265c498f, Phase 5 premiere cut chained this run via build, Final integration follows); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 265c498f LIVE** (Phase 4 merge). Trigger-list to re-verify next run (no infra touched by #458: film/ + progress/ only).

## IN FLIGHT
 - Builder on #449 Phase 5 (Premiere Cut, Trailer and Theatre Polish) chained this run via `build` decision (hardcoded PAT step posts `/oc build this` as owner). Never halt on an intermediate merge.
 - This maintainer run 36328406146 completing. Post-merge Deploy (pages.yml push trigger) re-confirms on the next survey.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Phase 5 build PR lands on #449: route `review` on the live head (dedupe against existing `/oc review (head <sha>)` comments).
2. Never close #449 on an intermediate phase (hard rule); close only on the Final integration phase with `Closes #449`.
3. Confirm Deploy success after this merge (main 265c498f); if missing/failed, investigate and trigger via dispatch.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will Phase 5 (premiere cut) build cleanly on the fresh 265c498f main?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
