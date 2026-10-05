# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37337985299 - pipeline fully engaged, stand down ([]); #533 double-gated but sequenced behind #534 (Fixer in flight), design-poster lab queued, manual /oc design pinged**

## PRs & Issues
 - **PRs:** Open: #534 (Terminal Browser Phase 1, head b7d89de, branch `opencode/issue532-terminal-browser-phase-1`, MERGEABLE, Refs #532) - Reviewer found 15 findings + follow-ups, Fixer in_progress (opencode run 37338121733). Open: #533 (Browser epic blueprint, head ac058d3, branch `opencode/issue532-20261005154527`, body now Refs #532) - Reviewer APPROVED 16:06:10Z + Tester approve-test 16:07:18Z, both on final head, MERGEABLE; merge HELD for #534-first sequencing. Merged earlier: #531 (Curator blob-directory docs links, d35730ba), #529 (Design Council lab implementation, c42f7760), #527 (Desktop Pet graduation, b624188b).
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 in fix, blueprint double-gated, design ping posted 16:07:38Z awaiting owner manual /oc design or lab poster fix; stays open until final phase), #70 lab-health (lab run 37338390312 queued for decision-poster design mapping), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST verified (7 sweepable workflows incl. pet-release, maintainer.yml:528).
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: Phase 1 in Fixer hands on #534 (15 findings); blueprint #533 double-gated and parked behind #534. Merge order once #534 clears: #534 then #533 (#534 branch carries the epic files). #532 stays open; Phase 2 starts only after both merge + design tokens land.
 - Design Council: decision-poster missing design-action mapping (found by 16:07:30 run); Lab Engineer queued on #70 to add it; manual unblock ping posted on #532. No council deliberation yet.
 - Main tip d35730ba (unchanged, verified via ls-remote this run).
 - Pages: presumed green - previews posted for #533/#534; no re-dispatch needed.
 - Run sweep: zero failure/timed_out needing triage (in-progress self arm 37337985299 + opencode fix + opencode-test tail + queued lab + skipped/cancelled maintainer workflow_run arms from per-PR concurrency fan-out + successes). Owner auto-retry loop on #533 (`/oc build this (auto-retry 2)`) is benign: builder safe-noops with clean tree.
 - Maintainer error-dump wart (lab-routed, coverage TBD): PR-triggered maintainer runs 37336172303 (#533) and 37336984111 (#534) both posted raw `User github-actions[bot] does not have write permissions` as public bot comments; both jobs success, neither committed memory entries. The queued lab run (poster mapping) may or may not cover the original wart - next run verifies lab report and folds the wart in if uncovered.
 - Eval-gate calibration note (for future self): #531 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical single-file docs-link fix). #533 is the same class (2-file blueprint/roadmap docs, no code) and now carries the same double gate; treat as merge-ready on sequencing alone, Evaluator optional. Product/research/phase deliverables (#534 and beyond) keep the mandatory triple gate.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release; sweep 7 incl. pet-release).
2. Terminal Browser #532: merge #534 then #533 once #534 clears its gates (review re-approve on fixed head, tester approve-test; evaluator per calibration for Phase 1 product code; #533 trailer already Refs #532); then chain Phase 2 build per the epic roadmap + council design tokens. Issue stays open until final phase passes acceptance.
3. Verify queued Lab run 37338390312 delivered the decision-poster design mapping; confirm whether it also covered the error-dump wart, else fold the wart into a follow-up lab dispatch.
4. Council: if owner posts manual /oc design on #532, let deliberation run; if lab lands the poster mapping first, re-dispatch design via decision.
5. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
6. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Will the Fixer clear all 15 Reviewer findings on #534, and will re-review + Tester + Evaluator pass the fixed head?
 - Lab finding on the decision-poster design mapping (+ original error-dump wart coverage)?
 - Will the Owner post manual /oc design on #532, or will the lab poster fix land first?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
