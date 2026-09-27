# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:47Z (maintainer run 36316589343, owner /oc maintainer on #453 - stale queued run, standby, main 689620d6 LIVE)**

## PRs & Issues
 - **PRs:** #453 MERGED (`689620d6`, Curator README fix, Deploy green on tip); #454 OPEN (infra stall-hardening for #450, head `11c317b7`, DOUBLE-APPROVED approve 11:43:53Z + approve-test 11:45:06Z, needs owner-click or PAT-backed merge - bot token hard-blocked on workflows); #451 OPEN (Hearthlight Phase 1, head `b48635da`, Reviewer approved 11:43:50Z, Tester run 36316679133 in flight, now CONFLICTING/DIRTY after #453 merge).
 - **Issues:** #450 stall-hardening (OPEN, fix landed as PR #454, awaiting merge); #449 short film (OPEN, Phase 1 producing on #451 branch); #452 CLOSED (fixed by #453); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 689620d6 LIVE.** Trigger-list 19/19 PASS. Deploy 36316707982 success on 689620d6.

## IN FLIGHT
 - PR #453 merged: verified `state: MERGED`, `mergedAt: 2026-09-27T11:43:01Z`; `git ls-remote origin main` = `689620d6`. Deploy success 36316707982 on the new tip closes the post-merge pages item.
 - PR #454 merge: OWNED BY SIBLING maintainer run 36316744333 (owner `/oc maintainer` on #454 at 11:45:07Z). Infra PR per the routing guard - never `fix`/`continue`; and never bot-token `gh pr merge` on workflow files (GitHub hard-blocks the App token). Owner click or PAT-backed merge only.
 - PR #451: Tester run 36316679133 in_progress (owner `/oc test` 11:43:52Z). On `approve-test` (and only then), the merge run must FIRST resolve the README conflict with main (rebase onto 689620d6, bot may push non-workflow files on same-repo branch), re-verify orphan-main check, then merge with `--rebase` and IMMEDIATELY chain Phase 2 (`build` on 449) - never halt on an intermediate PR (`Refs #449`, #449 stays open).
 - Lab Engineer run 36316706525 in_progress (11:44:27Z batch) plus maintainer pull_request run 36316797650 in_progress (11:46:07Z) - left alone, no duplicates.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.
 - THIS run is stale-queued: notification RUN 36316589343 belongs to the 11:42:11Z batch (owner `/oc maintainer` on #453 ~11:42:09Z) but executed after the 11:43:01Z merge. Verified-then-stood-down per charter.

## NEXT-RUN PLAYBOOK
1. On #454: if still open and double-approval intact with no later fix, do NOT bot-merge (workflows block) - ping the owner for a click-merge or route the PAT-backed path; after merge, close #450 (check the PR trailer) and confirm Deploy on the new tip.
2. On #451: when Tester posts `/oc approve-test` on head `b48635da`, resolve the README conflict first, then merge `--rebase` and IMMEDIATELY chain Phase 2 (`build` on 449); on `/oc fix` route `fix` (same-repo bot PR, no infra files - `fix` is safe, not `lab`).
3. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
4. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will #454 get its owner-click / PAT-backed merge, closing #450?
 - Will the Tester approve #451 Phase 1, and will the README conflict resolve cleanly?
 - Will Phase 2 chain immediately after the #451 merge?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer