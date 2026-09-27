# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:45Z (maintainer run 36316612935, owner /oc maintainer on PR #454 - standby, both PRs approved, tests in flight)**

## PRs & Issues
 - **PRs:** #454 OPEN (stall-hardening infra for #450, head 11c317b7, branch `opencode/issue450-20260927113703`, 3 commits, MERGEABLE/CLEAN, Reviewer `/oc approve` 11:43:53Z, Tester runs in flight). #451 OPEN (Hearthlight Phase 1 for #449, head b48635da, branch `opencode/issue449-20260927113051`, Reviewer `/oc approve` 11:43:50Z on b48635da with `Refs #449` trailer, Tester runs in flight, BUT live state CONFLICTING/DIRTY vs main - needs Fixer rebase before merge).
 - **Issues:** #450 stall-hardening (OPEN, Lab Engineer run 36316294238 completed success, PR #454 carries the fix); #449 short-film tracking (OPEN, Phase 1 built on PR #451 branch); standing boards open: #70 lab-health, #42 brainstorm.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 689620d6 LIVE** (advanced 78f3b333 -> 689620d6 via Curator merge `curate: list in-flight short-film #449 in README Active Projects (Fixes #452)`). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #454 review: opencode-review run 36316612956 in_progress (owner's `/oc review` 11:42:01Z) - verdict already landed as `/oc approve` 11:43:53Z; run still open, left alone.
 - PR #454 test: owner's `/oc test` 11:44:00Z; opencode-test runs in the 11:43:55/11:44:03 batches in_progress/queued. No duplicate dispatched.
 - PR #451 test: owner's `/oc test` 11:43:52Z; test runs in flight. No duplicate dispatched.
 - 11:44:03 batch also shows a Lab Engineer run in_progress of unclear parentage (no matching owner `/oc lab` comment seen on either PR tail) - left alone, noted for next-run correlation.
 - Build run 36316101056 completed success; lab run 36316294238 completed success (produced PR #454).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Tester posts `/oc approve-test` on #454 (no later `/oc fix`): merge with `--rebase` (keep branch, #450 stays open per `Refs #450` note - acceptance needs post-merge observation), verify main advanced, confirm Deploy success on the new tip.
2. When Tester posts `/oc approve-test` on #451 (no later `/oc fix`): do NOT merge while CONFLICTING - route `fix` on 451 first (rebase onto new main + re-verify; non-infra PR so `fix` is safe, not `lab`), then merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main, confirm Deploy, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
3. When the Tester posts `/oc fix` findings on either PR: route `fix` on 451 (safe, non-infra) or `lab` on 454 (infra routing guard - never `fix`/`continue` on infra PRs), provided no same-branch run is in flight.
4. If the 11:44:03 Lab Engineer run posts on an unexpected target: correlate before routing (cooldown 30m, no duplicate dispatch into a flap).
5. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
6. Trigger-list re-verify each run.
7. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Tester approve #454, and will the post-merge observation confirm Architect/Builder routing within one schedule interval on the next bot-created issue (the #450 acceptance bar)?
 - Will the Tester approve #451, and will the Fixer rebase resolve the DIRTY state cleanly for merge?
 - After #451 merges, will Phase 2 (Hand-Drawn Render Craft) chain cleanly via build/continue on #449?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
