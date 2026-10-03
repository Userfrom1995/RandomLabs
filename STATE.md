# STATE - Random factory checkpoint
 - **Updated: 2026-10-03T~22:12Z (pull_request closed run 37157588211 on PR #529 - OWNER MERGED, eval bypassed, standby)**

## PRs & Issues
 - **PRs:** Open: none. Merged: #529 (Design Council lab implementation: 4 prompt files `.github/agents/design-council.md` + `design-ux.md` + `design-visual.md` + `design-motion.md`, `docs/design-council-protocol.md`, REGISTRY.md + squad awareness + universal docs sync, `ideas/2026-10-03-design-council.md`, `progress/528-design-council.md`, plus live `opencode.yml` wiring +690 via lab commit bc503255; merged 22:11:37Z by Userfrom1995 via rebase as c42f7760, branch kept intact; Reviewer approve 22:08:26Z + Tester approve-test 22:09:34Z both on bc503255 with zero fix findings, NO approve-eval - eval run 37157581662 still in flight at merge, bypass recorded with dissent). Merged earlier: #527 (Curator: graduate Desktop Pet + archive Tabula; MERGED 04:35:43Z as b624188b via rebase, branch kept intact; triple-gated approve + approve-test + approve-eval 9.9/10).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing. Closed: #528 Design Council tracking (auto-CLOSED 22:11:38Z via the PR body `Closes` trailer - premature per the standing Refs ruling, dissent recorded, owner call respected; superseded by the merged #529 implementation). Closed earlier: #526 curator task, #515 Desktop Pet follow-up, #518 curator sync task, #504 Desktop Pet Platform, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run (no new workflow files in #529 - the 4 design jobs live inside opencode.yml under the existing `opencode` name). SWEEP_ALLOWLIST carries pet-release.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Design Council #528/#529: DONE via owner merge. Evaluator run 37157581662 (opencode-eval, queued 22:11:32Z by owner `/oc eval`) still in_progress at merge - verdict to be recorded on arrival only; no rework routing (nothing left to gate, merge already landed).
 - Main tip c42f7760 (post-#529 merge; merge_commit equals live tip, verified this run).
 - Pages health: Deploy Pages workflow_dispatch run 37157589300 success 22:11:41Z on c42f7760; PR #529 preview staging retired with the merge.
 - Run sweep: zero failure/timed_out needing triage (only skipped/cancelled maintainer workflow_run arms + expected skips + in-progress self arm + successes). No lab/opencode runs in flight besides the post-merge eval tail.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate).
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Record the post-merge Evaluator verdict on bc503255 when run 37157581662 lands (informational only - merge already consumed; route any genuine defect finding to lab as follow-up work on a fresh issue).
2. Council calibration: advisory Desktop Pet audit first, then day-one binding engagement on the next new project (owner/maintainer to dispatch `/oc design` when the first project arrives).
3. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release).
4. Confirm Pages stays green on c42f7760.
5. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
6. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Post-merge Evaluator verdict on bc503255 (record-only)?
 - Council calibration shape (advisory Desktop Pet audit scope, then day-one binding engagement mechanics)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
