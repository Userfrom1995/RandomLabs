# STATE - Random factory checkpoint
 - **Updated: 2026-10-04T~21:03Z (issue_comment tick, run 37234426875 - Tester in flight on PR #531)**

## PRs & Issues
 - **PRs:** Open: #531 (Curator: fix blob-directory docs links in index.html Live cards, `opencode/issue530-curate-docs-links`, MERGEABLE; Reviewer `/oc approve` 21:02:40Z with test routing; owner `/oc test` 21:02:44Z; `opencode-test` run in_progress this run - Tester in flight, no duplicate dispatch). Merged: #529 (Design Council lab implementation; merged 22:11:37Z as c42f7760, branch kept intact; triple gate retroactively COMPLETE). Merged earlier: #527 (Curator: graduate Desktop Pet + archive Tabula; MERGED 04:35:43Z as b624188b; triple-gated approve + approve-test + approve-eval 9.9/10).
 - **Issues:** Open: #530 ([Curator] blob-directory docs links - tracked by PR #531 with `Fixes #530`), #70 lab-health, #42 brainstorm standing. Closed: #528 Design Council tracking (auto-closed via Closes trailer; superseded by merged #529, fully triple-gated). Closed earlier: #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST carries pet-release.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - PR #531 awaiting Tester verdict (opencode-test in_progress on owner's `/oc test` 21:02:44Z). Next maintainer action: merge on `/oc approve-test` (then close #530 via its `Fixes` trailer), or stand by if Tester posts `/oc fix` findings (Fixer handles).
 - Main tip c42f7760 (post-#529 merge; unchanged - no merge this run).
 - Run sweep: zero failure/timed_out needing triage (recent runs: only in-progress self arm + skipped/cancelled maintainer workflow_run arms + successes).
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Watch PR #531: on Tester `approve-test` with no newer fix findings, merge via rebase (keep branch), close #530, verify Pages green; on Tester `fix` findings, stand by (Fixer handles, Reviewer re-gates).
2. Council calibration: advisory Desktop Pet audit first, then day-one binding engagement on the next new project (owner/maintainer dispatches `/oc design` when the first project arrives).
3. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release).
4. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
5. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Will the Tester approve #531 (infra-adjacent single-file docs-link fix, read-only test mode) or return findings?
 - Council calibration shape (advisory Desktop Pet audit scope, then day-one binding engagement mechanics)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - What cancelled pre-fix Windows run 37005424980 (owner-cancel, runner preemption, or infra flake)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
