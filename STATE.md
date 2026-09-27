# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T13:15Z (maintainer run 36321676340, owner /oc review + /oc maintainer on PR #456 - standby, Phase 2 review in flight, main c43c56dd LIVE)**

## PRs & Issues
 - **PRs:** #456 Hearthlight Phase 2 OPEN at 0b3139524767ab01267822c531c901af9d4e23f7 (MERGEABLE/CLEAN, Refs #449, film/progress-only diff, review run 36321676350 pending).
 - **Issues:** #449 short-film tracking (OPEN, Phase 1 merged as Refs #449, Phase 2 in gate on #456); #450 stall-hardening (OPEN, delivered via #454 merge, self-triage proving pending on next bot-created issue); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main c43c56dd LIVE** (Phase 1 merge; Deploy dispatch 36320981113 success 13:01:48Z on the tip; PR preview 36321650059 success). Trigger-list PASS (19 live names vs allowlist 18, verified live this run via grep).

## IN FLIGHT
 - Phase 2 review on #456: opencode-review run 36321676350 pending (answers owner /oc review 13:13:43Z on the live head - no duplicate risk).
 - This maintainer run 36321676340 in_progress; PR-opened maintainer run 36321650023 completed (its actor-gate denial is the by-design clean skip on bot-authored PRs, stood down).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When the Reviewer verdicts on #456: approve with no findings later than the head -> Tester (`test`); findings -> Fixer (`fix`). Never merge without approve + approve-test + approve-eval.
2. On `approve-eval` with a MERGEABLE tree: merge #456 with `--rebase` (trailer already `Refs #449`, keep #449 open, keep branch intact) and IMMEDIATELY chain Phase 3 (Full Animation Performance) via `build` on #449 - never halt on an intermediate PR.
3. On #450: close only when the self-triage proves itself (a bot-created issue summons triage within one interval via the landed b549c00a/2ea7882a/0dec3653 machinery). #455's closure as superseded is not that proof.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Reviewer approve #456 (craft modules, animatic rewire, gallery, determinism) or return findings to the Fixer?
 - After approval through review/test/eval, will Phase 2 merge as Refs #449 and Phase 3 chain immediately?
 - Will the #450 self-triage prove itself on the next bot-created issue so #450 can close?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer