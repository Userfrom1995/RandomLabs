# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37335088769 - architect dispatched on Terminal Browser issue #532**

## PRs & Issues
 - **PRs:** Open: none (`gh pr list --state open` empty). Merged: #531 (Curator: fix blob-directory docs links in index.html Live cards, merged 21:05:43Z as d35730ba via rebase, branch kept intact; double gate approve + approve-test, see calibration note below). Merged: #529 (Design Council lab implementation; merged 22:11:37Z as c42f7760, branch kept intact; triple gate retroactively COMPLETE). Merged earlier: #527 (Curator: graduate Desktop Pet + archive Tabula; MERGED 04:35:43Z as b624188b; triple-gated approve + approve-test + approve-eval 9.9/10).
 - **Issues:** Open: #532 Terminal Browser (NEW, triaged this run - architect dispatched), #70 lab-health, #42 brainstorm standing. Closed: #530 (auto-closed via #531 `Fixes` trailer), #528 (auto-closed via Closes trailer; superseded by merged #529, fully triple-gated). Closed earlier: #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST carries pet-release.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: architect dispatched this run (Phase Epic Roadmap with semantic phase names + per-phase gates + research spikes, per Autonomous Phase Epic Intake). Builder starts only after the epic lands.
 - Main tip d35730ba (unchanged).
 - Pages: presumed green - last verified deploys on main succeeded (runs 37234840678 + 37234916211, both `success`); no re-dispatch needed.
 - Run sweep: zero failure/timed_out needing triage (in-progress self arm 37335088769 + skipped/cancelled maintainer workflow_run arms from per-PR concurrency fan-out + successes).
 - Eval-gate calibration note (for future self): #531 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical single-file docs-link fix (+4/-4, zero functional surface), Reviewer and Tester both explicitly routed to merge, and the prior run's playbook committed to merge-on-approve-test. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate); trivial Curator link-fix PRs may ship on the double gate. If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release).
2. Terminal Browser #532: once the Architect's epic lands in `progress/`, dispatch Council day-one design engagement (`design`) then phased `build` per the epic. Issue stays open until final phase passes acceptance.
3. Council calibration: advisory Desktop Pet audit first, then day-one binding engagement on the next new project (Terminal Browser qualifies once its epic lands).
4. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
5. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Terminal Browser epic shape (render core, engine path, agent MCP/CLI parity matrix, per-OS shells)?
 - Council calibration shape (advisory Desktop Pet audit scope, then day-one binding engagement mechanics, starting with Terminal Browser)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer