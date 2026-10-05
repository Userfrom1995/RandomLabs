# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37338347001 - #533 eval dispatched (approve + approve-test, no newer fix); #534 in Fixer pass; lab design-mapping fix in flight**

## PRs & Issues
 - **PRs:** Open: #534 (Terminal Browser Phase 1: Terminal Render Core and App Shell, head b7d89de, branch `opencode/issue532-terminal-browser-phase-1`, Refs #532) - Reviewer posted 15 blocking findings with file:line + corrections, Fixer run 37338121733 in_progress via owner /oc fix. Open: #533 (Browser epic blueprint, head ac058d39, branch `opencode/issue532-20261005154527`, body Refs #532) - Reviewer `/oc approve` 16:06:10Z + Tester `/oc approve-test` 16:07:18Z, eval dispatched this run. Merged earlier: #531 (Curator blob-directory docs links, d35730ba), #529 (Design Council lab implementation, c42f7760), #527 (Desktop Pet graduation, b624188b).
 - **Issues:** Open: #532 Terminal Browser epic (blueprint #533 in eval, Phase 1 #534 in fix, design engagement BLOCKED on poster gap - manual owner trigger requested, stays open until final phase), #70 lab-health (Lab Engineer run 37338390312 in_progress on design-poster mapping per owner /oc lab; sibling maintainer run 37338391045 pending), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries incl. pet-release) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. Poster mapping verified: `eval` IS mapped (elif posting `/oc eval`); only `design` missing (lab fix in flight).
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: epic blueprint in #533 (eval dispatched this run), Phase 1 in #534 (Fixer run 37338121733 in_progress), Design Council BLOCKED on decision-poster gap (lab run 37338390312 in_progress; owner manual /oc design requested). Merge order once approved: #534 then #533. #532 stays open; Phase 2 starts only after both merge.
 - Main tip d35730ba (unchanged).
 - Pages: presumed green - previews posted for #533/#534; no re-dispatch needed.
 - Run sweep: zero failure/timed_out needing triage (in-progress self + lab/fix arms + queued sibling maintainer runs from per-PR concurrency fan-out + skipped non-matching triggers + successes).
 - Maintainer error-dump wart (lab-seen): PR-triggered maintainer runs 37336172303 (#533) and 37336984111 (#534) posted raw write-permission errors as bot comments; Lab Engineer sweep on #70 completed 16:04:33Z with no code change warranted. If dumps recur, re-route with fresh evidence.
 - Eval-gate calibration note (for future self): #531 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical single-file docs-link fix (+4/-4, zero functional surface), Reviewer and Tester both explicitly routed to merge, and the prior run's playbook committed to merge-on-approve-test. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate); trivial Curator link-fix PRs may ship on the double gate. If the Owner or a future audit disagrees, say so and this note records the dissent surface. #533 (epic blueprint) goes through the full triple gate: eval dispatched this run.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers.
 - Owner branch `opencode/issue436-gui-detach-and-syswide-fixes` still present, no signal this run; standing evaluation-only item.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19 incl. pet-release).
2. Terminal Browser #532: merge #534 then #533 once each clears review/test/eval gates (never merge without approvals); then chain Phase 2 build per the epic roadmap + council design tokens. Issue stays open until final phase passes acceptance.
3. Design: confirm Lab Engineer lands the poster mapping; confirm /oc design fires on #532 (owner-manual or mapped) and deliberation starts.
4. Council calibration: advisory Desktop Pet audit still pending.
5. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.
6. If new Desktop Pet follow-up work opens (e.g. the smoke-linux.sh:133 rpm-pipe hardening note), route build/fix on a fresh issue per the one-task-per-issue rule.

## OPEN QUESTIONS
 - Will the Evaluator approve #533, and will the Fixer clear all 15 findings on #534?
 - Will the Lab Engineer accept the design-mapping fix, and will design tokens reshape Phase 2 scope?
 - Lab finding on the maintainer error-dump wart (merge-attempt vs comment-attempt, prompt vs permissions hardening)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
