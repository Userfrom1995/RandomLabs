# STATE - Random factory checkpoint
 - **Updated: 2026-09-27T11:45Z (maintainer run 36316579832, owner /oc review + /oc maintainer on PR #451 - standby, dual approvals, testers in flight)**

## PRs & Issues
 - **PRs:** #451 OPEN (Hearthlight Phase 1 for #449, head b48635da = live branch tip, 4 commits: `81cd7829` architect blueprint + `5fb96000` story package + `53a1001d` animatic engine + `b48635da` theatre/poster/pipeline/docs; body `Refs #449` corrected, title retitled). Reviewer `/oc approve` 11:43:50Z on this exact head (all 4 prior findings resolved, 1 non-blocking nit for Phase 2). #454 OPEN ([Infra] stall-hardening self-triage for #450, head 11c317b7854a6252217759ec6bce941afcc77c5d, branch `opencode/issue450-20260927113703`, MERGEABLE, body `Refs #450`, reviewed + approved with `{"action":"test"}` decision).
 - **Issues:** #450 stall-hardening (OPEN, Lab Engineer delivered as PR #454); #449 short-film tracking (OPEN, Phase 1 built on the PR branch, awaiting test/eval/merge); standing boards open: #70 lab-health, #42 brainstorm. Issue #452 closed by the Curator merge.
 - **Boards:** #70 lab-health, #42 brainstorm standing. **Main 689620d6 LIVE** (curate: README Active Projects entry for #449, Fixes #452). Trigger-list 18/18 PASS.

## IN FLIGHT
 - PR #451 test: opencode-test run 36316679133 in_progress (owner `/oc test` 11:43:52Z, 11:43:55 batch). No duplicate dispatched. Merge blocked until `approve-test`, then Evaluator `approve-eval`.
 - PR #454 test: opencode-test run 36316685983 in_progress (owner `/oc test` 11:44:00Z, 11:44:03 batch). Tester operates read-only on infra PRs (no commits/push).
 - Review run 36316612956 (11:42:38 batch) went pending to in_progress and delivered both approvals (451 approve 11:43:50Z, 454 approve + test decision ~11:43:58Z).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still at d905397a (no new signal, no PR vehicle): tor-cli CI still red branch-scoped. No dispatch - owner session active, no vehicle, main unaffected.

## NEXT-RUN PLAYBOOK
1. When Tester posts `/oc approve-test` on 451 (no later `/oc fix`): ensure eval is dispatched (`/oc eval` if the test workflow did not auto-forward); on `approve-eval` merge with `--rebase` (trailer already `Refs #449`, keep #449 open), verify main advanced, confirm Deploy success on the new tip, then IMMEDIATELY chain Phase 2 (`build`/`continue` on 449) - never halt on an intermediate PR.
2. When Tester posts `/oc fix` findings on 451: route `fix` on 451 (same-repo bot PR; no infra files in diff so `fix` is safe, not `lab`).
3. When Tester posts `/oc approve-test` on 454: ensure eval runs; on `approve-eval` do NOT merge via the app token (PR touches `.github/workflows/` + audit script - GitHub hard-blocks it). Request owner click-to-merge or a PAT-backed merge path, then confirm the self-triage redispatch fires on the next bot-created issue.
4. When Reviewer/Tester posts `/oc fix` findings on 454: route `lab` (infra routing guard - never `fix`/`continue` on infra PRs).
5. If a PR opens from `opencode/issue436-gui-detach-and-syswide-fixes`: route `review` (or `fix` if findings land); Windows Setsid break plus committed binary plus macOS exit-code regression must be resolved before merge.
6. If the branch keeps advancing with no PR and CI stays red: evaluate only, never seize owner work; ping only on the eventual PR/issue, never on closed #436 uninvited.
7. On any new issue/comment/push or workflow_run failure: triage per charter (correlate, cooldown 30m, route review/test/eval/fix/lab/recover/auditor/curate as demanded).
8. Trigger-list re-verify each run.
9. NEVER assume an `issues: opened` run will follow a `create_issue` decision (bot-created content suppresses it). After creating an issue, either chain the next dispatch via a dispatched follow-up or mark it UNTRIAGED in STATE.md until routed.

## OPEN QUESTIONS
 - Will the Tester approve-test #451 (living animatic, real playback) or return adversarial findings?
 - Will the Evaluator approve-eval #451 so Phase 1 merges and Phase 2 chains?
 - Will the Tester approve-test #454 in read-only infra mode, and how will its workflow-touching merge land (owner click vs PAT path)?
 - Will the Lab Engineer self-triage redispatch (R13) prove itself on the next bot-created issue?
 - What caused the 08:34-11:26Z schedule silence (GitHub cron flake vs misconfig)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged for owner-level awareness; no code change needed.

 - Hephaestus, the Maintainer
