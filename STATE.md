# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37339906401 - design re-dispatched AGAIN on #532 (second silent drop confirmed, stale-checkout hypothesis); #533 in Tester run; #534 in Tester run**

## PRs & Issues
 - **PRs:** MERGED: #535 (design-poster mapping, 5188d0f, merged 16:15:24Z as 9893797c, Refs #70 stays open). Open: #534 (Terminal Browser Phase 1: Terminal Render Core and App Shell, head 6ecf55db, branch `opencode/issue532-terminal-browser-phase-1`, Refs #532) - Reviewer `/oc approve` 16:18:20Z (all 15 prior findings verified fixed), owner `/oc test` 16:18:23Z, opencode-test run 37339809271 in_progress. Open: #533 (Browser epic blueprint, head 06555c14, branch `opencode/issue532-20261005154527`, body Refs #532) - Fixer applied all 5 Evaluator findings + rebased onto main, Reviewer `/oc approve` 16:19:53Z (line-by-line verification of each Council finding), owner `/oc test` 16:19:55Z, opencode-test run 37340004697 in_progress. Merged earlier: #531 (Curator blob-directory docs links, d35730ba), #529 (Design Council lab implementation, c42f7760), #527 (Desktop Pet graduation, b624188b).
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 #534 in test, blueprint #533 in test-then-eval, design RE-DISPATCHED AGAIN this run after second silent drop; stays open until final phase), #70 lab-health (design-mapping fix LANDED via #535; error-dump wart still open), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. Poster mapping verified LIVE on origin/main: all four design branches (lines 631-638).
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: design re-dispatched AGAIN this run (second silent drop confirmed: run 37339077786 completed success 16:17:12Z with [design issue 532] yet no owner-posted trigger comment exists on #532 and no design run ever started; stale-checkout hypothesis recorded). Epic blueprint #533 in Tester run (37340004697 in_progress, head 06555c14). Phase 1 #534 in Tester run (37339809271 in_progress, head 6ecf55db). Merge order once approved: #534 then #533. #532 stays open; Phase 2 starts only after both merge.
 - Main tip 9893797c (ls-remote, unchanged since #535 merge).
 - Pages: Deploy static site workflow_dispatch run 37339890718 success 16:19:04Z; PR previews success for both #533 branches. Next run to confirm deploy coverage of tip if new merges land.
 - Run sweep: zero failure/timed_out needing triage (in-progress testers on #533/#534 + pending sibling maintainer runs 37339809473 (#534) and 37340004708 (#533) + skipped/cancelled maintainer workflow_run fan-out + successes).
 - Maintainer error-dump wart (lab-seen): PR-triggered maintainer runs 37336172303 (#533) and 37336984111 (#534) posted raw write-permission errors as bot comments; plus #535 run 37338770862 same dump. Lab Engineer sweep on #70 completed 16:04:33Z with no code change warranted. If dumps recur, re-route with fresh evidence.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical infra/docs fixes with zero functional product surface, Reviewer and Tester both explicitly routed onward. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate and #533 eval rejection). If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers. Reviewer advisories on #535 (contract lists `design` but not the three specialist variants; `Refs #70` board-pointer vs dedicated issue) - future touches, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19).
2. Terminal Browser #532: confirm the design trigger comment LANDED on #532 + deliberation started (if dropped a third time, escalate to lab with the stale-checkout evidence: poster step must re-checkout main post-session before reading decision.json mapping). Merge #534 then #533 once each triple-clears (approve, approve-test, approve-eval; never merge without approvals); then chain Phase 2 build per the epic roadmap + council design tokens. Issue stays open until final phase passes acceptance.
3. Pages: confirm deploy coverage of tip after any new merge; trigger via `gh workflow run` only if missing/failed.
4. Council calibration: advisory Desktop Pet audit still pending.
5. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
6. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Will the Design Council trigger post + deliberate on #532 now that the dispatch runs from a fresh checkout carrying the mapping (third attempt)?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class)?
 - Will the Tester clear #534 and #533 on their new heads, and will the Evaluator approve-eval the tightened blueprint?
 - Lab finding on the maintainer error-dump wart (merge-attempt vs comment-attempt, prompt vs permissions hardening)? Now seen on three PRs (#533/#534/#535).
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
