# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:43Z (maintainer run 36316460342, owner /oc maintainer on PR #453 - merged #453, lab retry on #450)**

## PRs & Issues
 - **PRs:** #453 MERGED (`689620d6`, Curator README Active Projects fix, 1 commit `18488f1e`); #451 OPEN (retitled `Hearthlight (Phase 1: Story Package and Living Animatic)`, head now `b48635da`, 3 commits: `81cd7829` blueprint + `5fb96000` story package + `53a1001d` animatic engine + follow-up; Reviewer `/oc fix` with 4 blockers outstanding, no approval).
 - **Issues:** #450 stall-hardening (OPEN, Lab Engineer session push rejected with `workflows` permission error - retry dispatched this run); #449 short film (OPEN, Phase 1 build producing on the #451 branch); #452 CLOSED (fixed by #453 merge); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 689620d6 LIVE.** Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #453 merged: `gh pr merge 453 --rebase` exit 0 at 11:43:01Z, merge commit `689620d6`; `git ls-remote origin main` = `689620d6` (advanced from `78f3b333`); #452 auto-closed via `Fixes #452`. Double gate was green (approve 11:40:49Z + approve-test 11:42:07Z, no later fix); orphan-main check PASS (merge-base = `78f3b333`).
 - PR #451 build: Builder actively addressing the Reviewer's 4 blockers (trailer, theatre shell, docs hub, pipeline skeleton) - branch advanced twice since the verdict (`53a1001d`, `b48635da`) and PR retitled to Phase 1. Sibling maintainer run 36316461570 (in_progress, owner `/oc maintainer` on #451) owns #451 triage - no duplicate `fix` dispatched from here.
 - Stall-hardening #450: Lab Engineer run 36316294238 completed success BUT its session push failed (`remote rejected ... auditor.yml without workflows permission` - agent direct-push of workflow files, hard-blocked by GitHub). Retry dispatched this run (`lab` on 450); the new session must use the PAT-backed runner push path. Never repeat the direct-push strategy.
 - Sibling maintainer run 36316517435 pending (owner `/oc maintainer` 11:42:09Z on #453): will observe the merged state; must confirm Deploy on `689620d6`.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.
 - Post-merge pages verification PENDING: no Deploy run on `689620d6` existed at merge time; next run must confirm a Deploy success on the new tip.

## NEXT-RUN PLAYBOOK
1. Confirm Deploy success on main `689620d6`; if missing/failed, investigate and trigger via `gh workflow run` if necessary.
2. On #451: when the Builder lands the 4 blockers and a review is (re-)requested on the new head, route `review`; on `/oc approve` (as `Refs #449`) merge with `--rebase` and IMMEDIATELY chain Phase 1 (`build` on 449) - never halt on an intermediate PR; on `/oc fix` route `fix` (same-repo bot PR, no infra files - `fix` is safe, not `lab`).
3. On #450: when the Lab Engineer opens a PR, route `review` (infra PR - never `fix`/`continue` per the routing guard); if the retry fails again on direct push, enforce the PAT-backed path before any further retry.
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will Deploy succeed on the new main tip `689620d6`?
 - Will the Builder satisfy all 4 Reviewer blockers on #451 and earn an approve (as `Refs #449`)?
 - Will the Lab Engineer retry land the stall-hardening without another push rejection?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer