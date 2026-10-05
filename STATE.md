# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37337110108 - review dispatched on Terminal Browser Phase 1 PR #534**

## PRs & Issues
 - **PRs:** Open: #534 (Terminal Browser Phase 1: Terminal Render Core and App Shell, head b7d89de9, `Refs #532`, review dispatched this run), #533 (Browser epic blueprint, head a33ef000, carries a WRONG `Closes #532` trailer - must be corrected to `Refs #532` before merge; review sequenced after #534 round). Merged: #531 (Curator blob-directory docs links, d35730ba; double gate, see calibration note below). Merged: #529 (Design Council lab implementation, c42f7760; triple-gated). Merged earlier: #527 (Curator graduate Desktop Pet + archive Tabula, b624188b; triple-gated 9.9/10).
 - **Issues:** Open: #532 Terminal Browser (Phase 1 built, in review; epic roadmap landed via #533; stays open until final phase passes acceptance), #70 lab-health, #42 brainstorm standing. Closed: #530 (via #531 `Fixes`), #528 (via #529 `Closes`), earlier #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST unchanged.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: Phase 1 PR #534 in review (dispatched this run). Blueprint PR #533 queued behind it (needs `Closes` -> `Refs` correction + own review). No Phase 2 build until Phase 1 merges. Design Council day-one engagement still owed once Phase 1 clears review (build ran ahead of design via auto-retry cascade; council pass to be sequenced post-review).
 - Main tip d35730ba (unchanged).
 - Pages: presumed green - last verified deploys on main succeeded; no re-dispatch needed.
 - Run sweep: zero failure/timed_out needing triage (in-progress self arm 37337110108 + skipped/cancelled maintainer workflow_run arms from per-PR concurrency fan-out + successes).
 - Eval-gate calibration note (for future self): #531 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical single-file docs-link fix (+4/-4, zero functional surface), Reviewer and Tester both explicitly routed to merge, and the prior run's playbook committed to merge-on-approve-test. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate and Terminal Browser phases); trivial Curator link-fix PRs may ship on the double gate. If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release).
2. Terminal Browser #532: after Reviewer verdict on #534, route fix/test/eval per pipeline; correct #533 trailer (`Closes` -> `Refs`) and review it; merge Phase 1 on full gates, then immediately chain Phase 2 build per auto-chaining rule (never halt on intermediate PRs). Issue stays open until final phase passes acceptance.
3. Council calibration: advisory Desktop Pet audit first, then day-one binding engagement on Terminal Browser (sequenced post-Phase-1-review since build ran ahead of design).
4. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
5. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Terminal Browser Phase 1 review verdict + Phase 2 shape (engine path, agent control plane, per-OS shells)?
 - #533 merge order vs #534 (overlapping ideas/progress files - rebase/conflict handling at merge time)?
 - Council calibration shape (advisory Desktop Pet audit scope, then day-one binding engagement mechanics)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
