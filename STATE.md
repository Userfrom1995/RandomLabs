# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37343900609 - Phase 2 PR #537 triaged (review dispatched on 0c9f48); #536 approve-test landed, eval next via sibling; #533 review in flight; lab re-dispatched on error-dump 5th occurrence**

## PRs & Issues
 - **PRs:** Open: #537 (Terminal Browser Phase 2, head 0c9f4826, branch `opencode/issue532-terminal-browser-phase-2`, MERGEABLE/CLEAN, body `Refs #532`, zero review comments - review dispatched this run), #536 (Harbor Overlay v2 design, head 2cfe927b, MERGEABLE/CLEAN, body `Refs #532`, Reviewer approve 16:45:57Z + Tester approve-test 16:51:08Z, eval next via sibling run 37343994589 owning owner's /oc maintainer 16:51:11Z), #533 (Browser epic blueprint, head 06555c14, CONFLICTING, triple-clear voided by post-#534 conflict, owner `/oc review` 16:50:27Z with opencode-review run 37343903486 in_progress). MERGED: #534 (Terminal Browser Phase 1, merged 16:30:38Z as c06166ab via --rebase, branch kept, Refs #532 stays open), #535 (design-poster mapping, 9893797c), #531, #529, #527.
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 MERGED, blueprint #533 in review-on-conflict, design v2 #536 awaiting eval, Phase 2 #537 in review; stays open until final phase), #70 lab-health (docs-sync verdict LANDED via lab run 37342786115; error-dump wart recurred 5th time on #537, lab re-dispatched this run with explicit mandate), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carries the spec + tokens.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: Phase 1 MERGED (c06166ab). Blueprint #533 in Reviewer pass on CONFLICTING head (run 37343903486 in_progress; conflict still needs Fixer rebase + reconcile, rebase voids old gate). Design v2 #536 double-gated (approve + approve-test on 2cfe927b; eval next via sibling run 37343994589). Phase 2 #537 in Reviewer pass (dispatched this run on 0c9f48; test/eval follow). Merge order: #533, then #536, then #537, each only on triple-clear.
 - Main tip c06166ab (post-#534 merge; unchanged). No new merge this run (no triple-cleared PR).
 - Pages: deploy 37343164552 success + pr-trigger 37343164532 success cover #536 previews; post-merge deploy 37342394718 covers tip c06166ab. `action_required` conclusions on the newest preview runs are the normal held-preview flow, not failures.
 - Run sweep: zero failure/timed_out needing triage (in-progress review on #533 + in-progress sibling maintainer on #536 + pending self fan-out + skipped non-matching triggers + successes).
 - Lab error-dump wart (now 5th occurrence): PR-triggered run 37343839508 posted raw write-permission error as bot comment on #537 at 16:50:45Z. Prior docs-sync verdict (16:43:10Z) did not cover it. Lab re-dispatched this run on #70 with the explicit error-dump mandate. NOTE: in-session `gh pr merge` (API merge, no git push) works cleanly from this workflow - merges remain the Maintainer's own action.
 - Rebase-gate rule: a rebase that rewrites a triple-cleared PR's head voids its gate - #533's approve/approve-test/approve-eval sit on 06555c14, so after the Fixer pushes the rebased head the Reviewer must re-confirm (at minimum a review pass on the new head) before any merge. Never merge the rebased head on stale approvals.
 - Review-round rule on #536: round 2 runs on the fixed head 2cfe927b; test approved 16:51:08Z, eval follows via sibling.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical infra/docs fixes with zero functional product surface, Reviewer and Tester both explicitly routed onward. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate, #533/#534 eval approvals). Design PR #536 is a product-surface spec (tokens the Builder implements) - it goes through the full triple gate including eval. Phase 2 #537 is a product phase deliverable - full triple gate including eval. If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19).
2. Terminal Browser #532: check #537 Reviewer verdict on 0c9f48 (then test/eval); check #536 eval dispatch via sibling (then merge sequencing); check #533 review outcome on CONFLICTING head (then Fixer rebase + review-first on rebased head, test/eval, merge #533, merge #536, merge #537). If any stalls, evaluate per 3-day/7-day triggers. Issue stays open until final phase passes acceptance.
3. Error-dump wart: lab re-dispatched this run with 5th-occurrence evidence; watch for the verdict, do not re-dispatch while it is in flight.
4. Pages: confirm deploy coverage stays green on tip c06166ab; trigger via `gh workflow run` only if missing/failed.
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Will the Reviewer clear Phase 2 #537 on 0c9f48, and will test/eval pass the engine fetch and text render path?
 - Will the Reviewer clear #536 eval and will the #533 conflict rebase land cleanly with Reviewer re-confirmation?
 - After #533 + #536 merge, does #537 merge cleanly on the combined base?
 - Lab finding on the maintainer error-dump wart, now 5th occurrence on #537 (merge-attempt vs comment-attempt, prompt vs permissions hardening)? Re-dispatched this run with explicit mandate.
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer