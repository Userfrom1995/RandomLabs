# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37339077786 - #535 MERGED (9893797c, design-poster fix live); design re-dispatched on #532; #533 in Evaluator-fix; #534 in Fixer pass**

## PRs & Issues
 - **PRs:** MERGED: #535 (design-poster mapping, 5188d0f, merged 16:15:24Z as 9893797c, Refs #70 stays open). Open: #534 (Terminal Browser Phase 1: Terminal Render Core and App Shell, head b7d89de, branch `opencode/issue532-terminal-browser-phase-1`, Refs #532) - Fixer run 37338121733 in_progress (owner /oc fix 16:05:39Z, no push yet). Open: #533 (Browser epic blueprint, head ac058d39, branch `opencode/issue532-20261005154527`, body Refs #532) - Evaluator REJECTED fix 8.3/10 (gate 9.8, 5 surgical doc findings, no implementation rework); owner /oc maintainer 16:14:08Z owned by sibling run 37339249428 (in_progress, do not duplicate). Merged earlier: #531 (Curator blob-directory docs links, d35730ba), #529 (Design Council lab implementation, c42f7760), #527 (Desktop Pet graduation, b624188b).
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 #534 in fix, blueprint #533 in eval-fix, design RE-DISPATCHED this run now that poster is live on main; stays open until final phase), #70 lab-health (design-mapping fix LANDED via #535; error-dump wart still open), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run (post-merge tree). Poster mapping verified LIVE on main: all four design branches (lines 631-638) + contract line (199).
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: design re-dispatched this run (poster now live, will post); epic blueprint #533 in eval-fix (sibling run owns fix dispatch); Phase 1 #534 in Fixer pass (run 37338121733 in_progress, head unchanged). Merge order once approved: #534 then #533. #532 stays open; Phase 2 starts only after both merge.
 - Main tip 9893797c (post-#535 merge).
 - Pages: all recent deploys success; merge-triggered deploy for 9893797c not yet visible at decision time - next run to confirm a fresh pages success covers the new tip.
 - Run sweep: zero failure/timed_out needing triage (in-progress self + fixer/eval-owning arms + queued sibling maintainer run 37339249428 + skipped non-matching triggers + successes).
 - Maintainer error-dump wart (lab-seen): PR-triggered maintainer runs 37336172303 (#533) and 37336984111 (#534) posted raw write-permission errors as bot comments; plus #535 run 37338770862 same dump. Lab Engineer sweep on #70 completed 16:04:33Z with no code change warranted. If dumps recur, re-route with fresh evidence.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical infra/docs fixes with zero functional product surface, Reviewer and Tester both explicitly routed onward. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate and #533 eval rejection). If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers. Reviewer advisories on #535 (contract lists `design` but not the three specialist variants; `Refs #70` board-pointer vs dedicated issue) - future touches, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run post-merge (19 vs 19).
2. Terminal Browser #532: confirm /oc design posted + deliberation started; merge #534 then #533 once each triple-clears (never merge without approvals); then chain Phase 2 build per the epic roadmap + council design tokens. Issue stays open until final phase passes acceptance.
3. Pages: confirm a fresh deploy success covers tip 9893797c; trigger via `gh workflow run` only if missing/failed.
4. Council calibration: advisory Desktop Pet audit still pending.
5. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
6. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Will the Design Council engagement post + deliberate on #532 now that the poster is fixed?
 - Will the Fixer clear #534 and will the Architect/Builder clear the 5 Evaluator doc findings on #533?
 - Lab finding on the maintainer error-dump wart (merge-attempt vs comment-attempt, prompt vs permissions hardening)? Now seen on three PRs (#533/#534/#535).
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer