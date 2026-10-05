# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37341226318 - #534 MERGED (c06166ab 16:30:38Z); #533 CONFLICTING post-merge, fix dispatched for rebase; decision [fix 533]**

## PRs & Issues
 - **PRs:** MERGED: #534 (Terminal Browser Phase 1, head 4ff839eb, merged 16:30:38Z as c06166ab via --rebase, branch kept, Refs #532 stays open). MERGED earlier: #535 (design-poster mapping, 5188d0f, merged 16:15:24Z as 9893797c), #531 (Curator blob-directory docs links, d35730ba), #529 (Design Council lab implementation, c42f7760), #527 (Desktop Pet graduation, b624188b). Open: #533 (Browser epic blueprint, head 06555c14, branch `opencode/issue532-20261005154527`, Refs #532) - was TRIPLE-CLEARED (approve 16:19:53Z + approve-test 16:21:16Z + approve-eval 9.8/10 16:27:24Z on 06555c14) but went MERGEABLE/CLEAN UNKNOWN then DIRTY/CONFLICTING after the #534 merge (both rewrote progress/532-terminal-browser.md + ideas/2026-10-05-terminal-browser.md); Fixer dispatched this run for rebase + reconcile.
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 MERGED, blueprint #533 in rebase, design IN FLIGHT via owner manual `/oc design` triggers; stays open until final phase), #70 lab-health (design-mapping fix LANDED via #535; error-dump wart still open), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. Design runs live on #532 via owner manual unblock.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: Phase 1 MERGED (c06166ab). Epic blueprint #533 in Fixer rebase (dispatched 16:31Z; must reconcile progress + ideas files, keeping Phase-1 completion record from main + blueprint rigor from branch). Design Council deliberating on #532 (owner manual triggers). Order: #533 merge, then chain Phase 2 build per epic roadmap + council design tokens.
 - Main tip c06166ab (post-#534 merge; #534 merge verified via gh pr view state MERGED + ls-remote).
 - Pages: deploy coverage of the new tip to confirm next run (last deploy 37340372896 success 16:22:48Z predates the merge).
 - Run sweep: zero failure/timed_out needing triage (skipped/cancelled maintainer workflow_run fan-out + successes).
 - Maintainer error-dump wart (lab-seen): PR-triggered maintainer runs 37336172303 (#533) and 37336984111 (#534) posted raw write-permission errors as bot comments; plus #535 run 37338770862 same dump. Lab Engineer sweep on #70 completed 16:04:33Z with no code change warranted. If dumps recur, re-route with fresh evidence. NOTE: in-session `gh pr merge` (API merge, no git push) works cleanly from this workflow - merges remain the Maintainer's own action.
 - Rebase-gate rule (new this run): a rebase that rewrites a triple-cleared PR's head voids its gate - #533's approve/approve-test/approve-eval sit on 06555c14, so after the Fixer pushes the rebased head the Reviewer must re-confirm (at minimum a review pass on the new head) before any merge. Never merge the rebased head on stale approvals.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical infra/docs fixes with zero functional product surface, Reviewer and Tester both explicitly routed onward. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate, #533/#534 eval approvals). If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers. Reviewer advisories on #535 (contract lists `design` but not the three specialist variants; `Refs #70` board-pointer vs dedicated issue) - future touches, not blockers. Reviewer non-blocking nits on #534 re-review (`isBasic` gating bright colors to 256-path, unreachable `ev.Ctrl && ev.Key == "c"` branch) - fold into a later phase if desired. Evaluator non-blocking follow-ups on #534 (sync stale PR-body byte counts, hub back-link and table scope/overflow, dead Ctrl+C branch shell.go:220-223, rendered docs path, live Playwright screenshots in Final UX phase) - later phases.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19).
2. Terminal Browser #532: check #533 Fixer push. On rebased head: route review first (rebase voids the old gate), then test/eval as needed, then merge, then chain Phase 2 build per epic roadmap + design tokens. If fix stalls, evaluate per 3-day/7-day triggers. Issue stays open until final phase passes acceptance.
3. Pages: confirm deploy coverage of tip c06166ab; trigger via `gh workflow run` only if missing/failed.
4. Council calibration: advisory Desktop Pet audit still pending.
5. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Will the Fixer rebase #533 cleanly and will the Reviewer re-confirm the rebased head?
 - After #533 merges, does Phase 2 start cleanly on the combined base, and are design tokens ready?
 - Is design deliberation progressing on #532, and has the duplicate design run settled?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class)?
 - Lab finding on the maintainer error-dump wart (merge-attempt vs comment-attempt, prompt vs permissions hardening)? Now seen on three PRs (#533/#534/#535).
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
