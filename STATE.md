# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:35Z (maintainer run 36316109294, owner /oc maintainer on PR #451 - review + lab dispatched)**

## PRs & Issues
 - **PRs:** #451 OPEN (Architect blueprint for #449, head 81cd7829, branch `opencode/issue449-20260927113051`, 2 files: ideas blueprint + progress 6-phase roadmap). No Reviewer verdict yet. Body says `Closes #449` - must become `Refs #449` (intermediate phase).
 - **Issues:** #450 stall-hardening (OPEN, Lab Engineer dispatched this run); #449 short-film tracking (OPEN, blueprint under review); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 78f3b333 LIVE.** Trigger-list 18/18 PASS. Pins `opencode/muse-spark-1.3-contributor-free` (opencode.json two-knob).

## IN FLIGHT
 - PR #451 review: Reviewer dispatched (`review` on 451 @ 81cd7829) this run. Merge blocked until `/oc approve` with no later `/oc fix`. On approval: merge with `--rebase` as `Refs #449` (keep #449 open), then immediately chain Phase 1 build (`build` on 449).
 - Owner's `/oc build this` on #451: opencode BUILD run 36316101056 in_progress (covers the trigger; no duplicate dispatched). Second opencode run 36316109279 pending (GENERAL mode for the `/oc maintainer` comment).
 - Stall-hardening #450: Lab Engineer dispatched (`lab` on 450) this run per playbook (create_issue self-follow-up + schedule-silence investigation + UNTRIAGED playbook rule).
 - Actor-gate denial on #451 thread ("github-actions[bot] lacks write", run 36316098466 ref): by-design clean skip on bot-authored PR (issue #428 class), stood down, no action.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal this run, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.
 - Post-merge pages verification DONE: Deploy run 36305874865 succeeded on 78f3b333 (2026-09-27T08:20:14Z).

## NEXT-RUN PLAYBOOK
1. When the Reviewer posts `/oc approve` on #451 (no later `/oc fix`): merge with `--rebase` ( trailer corrected to `Refs #449`), verify main advanced, confirm Deploy success on the new tip, then IMMEDIATELY chain Phase 1 (`build` on 449) - never halt on an intermediate PR.
2. When the Reviewer posts `/oc fix` findings on #451: route `fix` on 451 (same-repo bot PR; no infra files in diff so `fix` is safe, not `lab`).
3. When the Lab Engineer opens a PR for #450: route `review` on it (infra PR - never `fix`/`continue` on it per the routing guard; further infra work goes `lab`).
4. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
5. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
6. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
7. Trigger-list re-verify each run.
8. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Reviewer approve #451 (as Refs #449) or return findings, and will Phase 1 chain cleanly after merge?
 - Will the Lab Engineer land the create_issue self-follow-up so this stall class is gone?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
