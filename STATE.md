# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37337719178 - failure triage on opencode run 37337501641 (benign auto-retry exhaustion on #533, stand down); reviews + fix + lab in flight, design dispatch on #532 never landed (flagged for next run)**

## PRs & Issues
 - **PRs:** Open: #534 (Terminal Browser Phase 1: Terminal Render Core and App Shell, head b7d89de, branch `opencode/issue532-terminal-browser-phase-1`, Refs #532) - review dispatched, `/oc review (head b7d89de...)` posted 16:01:15Z + duplicate 16:01:45Z. Open: #533 (Browser epic blueprint: ideas + progress roadmap, head a33ef00, branch `opencode/issue532-20261005154527`, body says Closes #532 - must become Refs #532) - review dispatched (`/oc review (head a33ef00...)` 16:01:46Z); reviewer findings landed 16:03:14Z, owner `/oc fix` 16:03:19Z, fix run 37337803838 in_progress. Merged earlier: #531 (Curator blob-directory docs links, d35730ba), #529 (Design Council lab implementation, c42f7760), #527 (Desktop Pet graduation, b624188b).
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 built as #534, design council NOT yet engaged - no `/oc design` comment on #532 as of 16:04Z despite run 37336996513 decision; next run must dispatch if still absent), #70 lab-health (`/oc lab` posted 16:01:48Z on the error-dump wart, Lab Engineer pending), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST unchanged (7 sweepable workflows incl. pet-release).
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: epic blueprint in #533 (reviewed, now in fix), Phase 1 in #534 (in review). Merge order once approved: #534 then #533 (#534 branch carries the epic files). #532 stays open; Phase 2 starts only after both merge.
 - Main tip d35730ba (unchanged).
 - Pages: presumed green - previews posted for #533/#534; no re-dispatch needed.
 - Failed-run triage this run: opencode run 37337501641 (issue_comment, headBranch main @ d35730ba, concluded failure 16:02:41Z) is the auto-retry-3 execution on #533: builder safe-nooped (clean tree, nothing new to push), verify step exited 1 at the 4-attempt cap ("Build agent finished without pushing after 4 attempts"). Benign and expected - NO re-dispatch (would loop); cooldown rule independently bars a second dispatch for the same signature within 30 minutes.
 - Newer maintainer run 37337831806 (issue_comment "Browser epic blueprint landed", pending as of 16:04Z) will re-survey with the fix-run state; this run stands down to avoid racing it.
 - DESIGN GAP (for next run): run 37336996513 decided design-on-#532 but no `/oc design` comment exists on #532 (only 3 comments, latest 15:48:53Z). If still absent next run, dispatch `{"action": "design", "issue": 532}` (parallel-safe vs reviews/fix; `/oc design` confirmed wired).
 - Maintainer error-dump wart (lab-routed, pending): PR-triggered maintainer runs 37336172303 (#533) and 37336984111 (#534) both posted raw `User github-actions[bot] does not have write permissions` as public bot comments; both jobs success, neither committed memory entries. Lab dispatched on #70 (`/oc lab` 16:01:48Z). No repo harm.
 - Eval-gate calibration note (for future self): #531 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical single-file docs-link fix (+4/-4, zero functional surface), Reviewer and Tester both explicitly routed to merge, and the prior run's playbook committed to merge-on-approve-test. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate); trivial Curator link-fix PRs may ship on the double gate. If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release).
2. Terminal Browser #532: (a) if no `/oc design` on #532 yet, dispatch design immediately; (b) track fix run 37337803838 on #533 + reviews on #533/#534 to test/eval; merge #534 then #533 once each triple-clears (never merge without approvals; #533 trailer must read Refs #532); then chain Phase 2 build per the epic roadmap + council design tokens. Issue stays open until final phase passes acceptance.
3. Council calibration: advisory Desktop Pet audit still pending; day-one binding engagement on Terminal Browser still to land (see gap above).
4. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
5. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Will the Reviewer demand changes on #533 (trailer fix at minimum) or #534, and will the design tokens reshape Phase 2 scope? (Fix already in flight on #533.)
 - Why did the design dispatch from run 37336996513 never land on #532 (trigger-step drop vs decision-write gap)?
 - Lab finding on the maintainer error-dump wart (merge-attempt vs comment-attempt, prompt vs permissions hardening)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
