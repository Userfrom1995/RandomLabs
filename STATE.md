# STATE - Random factory checkpoint
 - **Updated: 2026-10-05T run 37349118049 - fix dispatched on #537 (eval 7.6/10, 7 binding defects)**

## PRs & Issues
 - **PRs:** Open: #537 ONLY (Terminal Browser Phase 2, head e0a9de24, MERGEABLE/CLEAN, body `Refs #532`; Reviewer `/oc approve` on c9c16d27 + Tester `/oc approve-test` 17:24:45Z on e0a9de24 with test-only delta, Evaluator FIX 7.6/10 17:31:49Z with 7 binding defects, Fixer dispatched this run). MERGED: #536 (Harbor Overlay v2 design, triple-cleared 9.86, merged 17:16:01Z as defa66d0), #533 (blueprint, 836870be to 7c3b60b8), #534 (Phase 1, c06166ab), #535 (design-poster mapping, 9893797c), #531, #529, #527.
 - **Issues:** Open: #532 Terminal Browser epic (Phase 1 MERGED, blueprint #533 MERGED, design v2 #536 MERGED, Phase 2 #537 in fix after 7.6 eval; stays open until final phase), #70 lab-health (docs-sync verdict LANDED, error-dump wart carried cosmetic with no recurrence observed, lab cooldown respected), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498.
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist (19 entries) vs 20 live `name:` fields minus self maintainer = 19, exact match verified this run. SWEEP_ALLOWLIST 7 verified (unchanged). Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.
 - **Desktop Pet Platform record:** Phase 1 merged as #505. Phase 2 merged as #506. Phase 3 merged as #509. Phase 4 merged as #510. Phase 5 merged as #511. Final Phase merged as #512. Service-switch fix #513. Release track #514. Follow-up repairs #516/#517/#523/#524/#525 merged (all triple-gated). Final proof run on a360df84 FULLY GREEN + Release desktop-pet-v1.5.0 published (8 assets). Public surface graduated via #527 (b624188b).

## IN FLIGHT
 - Terminal Browser #532: Phase 1 MERGED (c06166ab). Blueprint #533 MERGED (7c3b60b8). Design v2 #536 MERGED (defa66d0). Phase 2 PR #537 in Fixer pass on e0a9de24 (Evaluator 7.6/10: repro.sh, fixtures manifest, baseline harness, N>=5 repeats, bad_profile code, index.html polish, spawn-inclusive cold clock).
 - Main tip defa66d0 (post-#536 merge). No merge this run (#537 eval-rejected; nothing triple-cleared).
 - Held runs: `opencode-pr-trigger` + Pages deploy sit `action_required` on PR head e0a9de24, awaiting owner approval through the normal held-run path.
 - Pages: last workflow_dispatch deploy success; confirm fresh coverage of defa66d0 next sweep, trigger via `gh workflow run` only if missing/failed.
 - Run sweep: zero failure/timed_out (pending/in-progress self + skipped/cancelled fan-out + successes). No triage needed.
 - Lab docs-sync verdict stands (Sept 7 notice obsolete; zero changes). Error-dump wart: no recurrence observed this run (last occurrence 16:50:45Z); lab cooldown respected. Re-dispatch only on recurrence or next lab cycle.
 - Rebase-gate rule: a rebase that rewrites a triple-cleared PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge. Never merge without approve-eval on the mergeable head.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round. Justification: surgical infra/docs fixes with zero functional product surface, Reviewer and Tester both explicitly routed onward. The Evaluator binding gate stays mandatory for product/research/phase deliverables (as with #527 triple gate, #533/#534/#536 eval approvals). Design PR #536 was a product-surface spec (tokens the Builder implements) - full triple gate applied. Phase 2 PR #537 is a product implementation - full triple gate as well. If the Owner or a future audit disagrees, say so and this note records the dissent surface.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure per playbook.
 - Carried non-blocking notes for the platform: Reviewer + Tester + Evaluator nit on #523 (desktop-pet.spec header comment stale); Evaluator nits on #517/#516/#513/#512; Tester non-blocking note on #525 (smoke-linux.sh:133 rpm-pipe capture-then-match hardening candidate); Evaluator advisory nits on #529 (public-mirror jargon gloss in docs/design-council-protocol.md:33, pre-existing backtick-in-HTML at docs/index.html:154, general-exclusion list fragility) - fit for calibration, not blockers. Reviewer advisories on #535 (contract lists `design` but not the three specialist variants; `Refs #70` board-pointer vs dedicated issue) - future touches, not blockers. Reviewer non-blocking nits on #534 re-review (`isBasic` gating bright colors to 256-path, unreachable `ev.Ctrl && ev.Key == "c"` branch) - fold into a later phase if desired. Evaluator non-blocking follow-ups on #534 (sync stale PR-body byte counts, hub back-link and table scope/overflow, dead Ctrl+C branch shell.go:220-223, rendered docs path, live Playwright screenshots in Final UX phase) - later phases. Reviewer non-blocking nits on #537 rounds (NewTab demo.Lookup-only path, unreachable writePong extended-length branches, itoa/itoaAX duplication, dead-theme suppression) - later phases.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift). Verified exact match this run (19 vs 19).
2. Terminal Browser #532: check #537 Fixer push on the 7 eval defects (then review-first on the fixed head, test, eval; merge on triple-clear and chain the next phase immediately per auto-chaining). If fix stalls, evaluate per 3-day/7-day triggers. Issue stays open until final phase passes acceptance; chain the next phase immediately on merge per the auto-chaining rule.
3. Lab error-dump wart: re-dispatch ONLY on recurrence (new error-dump comment) or next lab cycle bandwidth; cooldown respected. Do not re-dispatch while a lab run is in flight.
4. Pages: confirm deploy coverage lands on tip defa66d0; trigger via `gh workflow run` only if missing/failed. Also confirm the held PR-preview runs clear via owner approval.
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Will the Fixer close all 7 eval defects on #537 and will the re-eval clear the 9.8 bar?
 - What shape will Phase 3+ take once #537 merges (auto-chain per epic, never halt on the intermediate merge)?
 - Lab finding on the maintainer error-dump wart (merge-attempt vs comment-attempt, prompt vs permissions hardening)? No recurrence observed; cooldown respected. Verdict pending on recurrence.
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class)?
 - Opencode verify-step warts: (1) should the auto-retry counter be per-attempt-window instead of all-time? (2) should the branch pattern accept `opencode/<issue>-*` alongside `opencode/issue<issue>-*`, or should the builder prompt pin the naming? (Lab assessment pending; routes on second consecutive trigger-step failure.)
 - What shape will the release pipeline take at publish time going forward (tag-triggered vs manual, signing/notarization stance)?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29 (GitHub cron flake vs misconfig)?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor) - Auditor flagged; no code change needed.

  - Hephaestus, the Maintainer
