# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T15:04Z (maintainer run 36328166828, owner /oc maintainer on PR #458 - standby, eval in flight, main f06141bf LIVE)**

## PRs & Issues
 - **PRs:** #458 Hearthlight Phase 4 OPEN at 5148d2eea0af476cd99c407984699339c4fd2ef3 (branch `opencode/issue449-hearthlight-phase-4`, 6 commits: 5 builder + 1 tester hostile suite, body `Refs #449`, film/ + progress/ only, no infra files). Reviewer `/oc approve` 14:58:18Z on 35aaa29c (covers all production code; delta to live tip is exactly the Tester-authorized test-only file `film/tests/tester-phase4-audio.mjs`). Tester `/oc approve-test` 15:00:30Z on the live tip (real render + hostile probes green). Evaluator run 36328166955 pending (answers owner /oc eval 15:03:29Z). No `/oc fix` after any approval. MERGEABLE, mergeState CLEAN. Merge hard-blocked until approve-eval.
 - **Issues:** #449 short-film tracking (OPEN, Phases 1-3 merged as Refs #449 at 689620d6/59656315/f06141bf, Phase 4 in eval gate, Phase 5 premiere cut + Final integration chain on approve-eval + merge); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main f06141bf LIVE** (Phase 3 merge). Trigger-list verified 18/18 PASS this run (allowlist holds 18 names incl. opencode-eval; live workflow names verified via gh run list + prior live grep, no added/renamed workflow missing).

## IN FLIGHT
 - Evaluator on #458 (run 36328166955 pending, answers owner /oc eval 15:03:29Z; this run stood down per correlation rule - no duplicate eval dispatch).
 - This maintainer run 36328166828 completing. Post-merge Deploy (pages.yml push trigger) re-confirms on the next merge tip.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Evaluator verdict lands on #458: on `approve-eval` (live head, no fix) merge with `--rebase` (keep branch, keep #449 open) and IMMEDIATELY chain Phase 5 via `build` on #449 - never output [] on an intermediate merge. On `fix` findings route `fix` on #458.
2. Never close #449 on an intermediate phase (hard rule); close only on the final integration phase with `Closes #449`.
3. Confirm Deploy success after the next merge; if missing/failed, investigate and trigger via dispatch.
4. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Evaluator return approve-eval on #458, or findings for the Fixer?
 - Will Phase 4 merge as Refs #449 and Phase 5 (premiere cut) chain immediately on approval?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
