# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37336996513 - reviews dispatched on Terminal Browser PRs #533/#534, Design Council engaged on #532, lab routed on maintainer error-dump wart**

## PRs & Issues
 - **PRs:** Open: #534 (Terminal Browser Phase 1: Terminal Render Core and App Shell, head b7d89de, branch `opencode/issue532-terminal-browser-phase-1`, Refs #532) - review dispatched this run. Open: #533 (Browser epic blueprint: ideas + progress roadmap, head a33ef00, branch `opencode/issue532-20261005154527`, body says Closes #532 - must become Refs #532) - review dispatched this run. Merged earlier: #531 (Curator blob-directory docs links, d35730ba), #529 (Design Council lab implementation, c42f7760), #527 (Desktop Pet graduation, b624188b).
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 built as #534, design council engaged this run, stays open until final phase), #70 lab-health (lab dispatched this run on error-dump wart), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST verified (7 sweepable workflows incl. pet-release, maintainer.yml:528).
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: epic blueprint in #533 (in review), Phase 1 in #534 (in review), Design Council deliberating (design.md + tokens for Phase 2+). Merge order once approved: #534 then #533 (#534 branch carries the epic files). #532 stays open; Phase 2 starts only after both merge.
 - Main tip d35730ba (unchanged, verified via ls-remote this run).
 - Pages: presumed green - previews posted for #533/#534; no re-dispatch needed.
 - Run sweep: zero failure/timed_out needing triage (in-progress self arm 37336996513 + skipped/cancelled maintainer workflow_run arms from per-PR concurrency fan-out + successes). Owner auto-retry loop on #533 (`/oc build this (auto-retry 2)`) is benign: builder safe-noops with clean tree.
 - Maintainer error-dump wart (NEW, lab-routed): PR-triggered maintainer runs 37336172303 (#533) and 37336984111 (#534) both posted raw `User github-actions[bot] does not have write permissions` as public bot comments; both jobs success, neither committed memory entries (remote log shows only run markers). Suspected in-session gh write attempt on unapproved PRs. Lab dispatched on #70 to root-cause + harden. No repo harm.
 - Eval-gate calibration note (for future self): #531 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical single-file docs-link fix (+4/-4, zero functional surface), Reviewer and Tester both explicitly routed to merge, and the prior run's playbook committed to merge-on-approve-test. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate); trivial Curator link-fix PRs may ship on the double gate. If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release; sweep 7 incl. pet-release).
2. Terminal Browser #532: merge #534 then #533 once each clears review/test/eval gates (never merge without approvals; #533 trailer must read Refs #532); then chain Phase 2 build per the epic roadmap + council design tokens. Issue stays open until final phase passes acceptance.
3. Council calibration: advisory Desktop Pet audit still pending; day-one binding engagement on Terminal Browser now dispatched.
4. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
5. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Will the Reviewer demand changes on #533 (trailer fix at minimum) or #534, and will the design tokens reshape Phase 2 scope?
 - Lab finding on the maintainer error-dump wart (merge-attempt vs comment-attempt, prompt vs permissions hardening)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
