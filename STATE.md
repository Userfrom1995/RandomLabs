# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37419764271 - owner /oc review + /oc maintainer on #547 post-fix, stand-down (Reviewer re-approved fixed head, Tester in flight on #547, Evaluator in flight on #548)**

## PRs & Issues
 - **PRs:** Open: #547 (Curator graduation/archive task, Fixes #546, head d60f9874d953421d8d2d0197a2f14dcb855a4bf0 MERGEABLE/CLEAN, Fixer repair of the Evaluator binding 3-URL defect in 2 modular commits; Reviewer approve 05:41:51Z on the exact fixed head = single-gated, Tester run 37419826375 in flight via owner /oc test 05:41:53Z), #548 (same Fixes #546 task, head 604438cc1b34777ac2b2c8342c714d41c0f765bf MERGEABLE/CLEAN, Reviewer approve 05:32:33Z + Tester approve-test 05:37:45Z on the exact head = double-gated, Evaluator run 37419641668 in flight since 05:39:43Z via owner /oc eval 05:39:40Z). Both heads now contain the 3-URL archive fix. MERGED: #545 (surgical repro.sh layered-JSON fix, 1eb7314d, triple-cleared 9.8, Closes #544; branch kept on origin), #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532; branch kept on origin), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527.
 - **Issues:** Open: #546 Curator graduation/archive task (in gating via #547 + #548), #70 lab-health, #42 brainstorm standing. Closed: #544 (repro.sh stale grep, fixed by #545), #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry list re-verified exact match against 19 live workflow `name:` fields (maintainer excluded by design) this run - no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Tester pass on #547 fixed head d60f9874 (run 37419826375 in_progress, owner-dispatched 05:41:53Z). Verdict expected next: on approve-test route eval re-pass on the fixed head; on fix findings route fix, then review-first re-clear.
 - Evaluator pass on #548 head 604438cc (run 37419641668 in_progress since 05:39:43Z, owner-dispatched 05:39:40Z). Verdict expected next.
 - Sibling maintainer run 37419826381 pending (05:41:56Z wave) - no duplicate dispatch from this run; per-PR concurrency settles overlapping arms.
 - Lab Engineer ESCALATED error-dump mandate dispatched run 37418258423 (5th attempt; 4 prior docs-sync non-answers recorded). No lab verdict yet (recent Lab Engineer arms skipped on non-lab triggers, not failures). Verdict expected next; re-dispatch only on a quiet run.
 - Main tip 1eb7314d (post-#545 merge, unchanged; Pages deploy success 05:41:06Z covers it).
 - Run sweep: zero failure/timed_out (in-progress self 37419764271 + in-progress test 37419826375 + in-progress eval 37419641668 + pending sibling maintainer are owner-triggered workers, not failures; rest skipped/cancelled fan-out).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge - #547 complied (approve 05:41:51Z on d60f9874 after the fix-push). Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543/#545 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #547/#548 are public-surface curation changes (README + Pages + archive move); eval still applies as the binding gate before merge (same as prior terminal-browser fixes).
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Duplicate-PR note (2026-10-06): parallel `/oc curate` triggers on one task issue spawned duplicate Curator PRs (#547 vs #548, both Fixes #546). Both heads now carry the 3-URL fix. #548 led into eval first (double-gated + eval in flight); #547 re-gated after its fix (approve + test in flight, eval re-pass next). Whichever triple-clears first merges; the trailer rebases onto main or closes as superseded - never merge both (archive-move collision).
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. On Tester approve-test for #547 head d60f9874: route eval re-pass on the fixed head. On eval FIX: route fix on #547, then review-first re-clear.
3. On Evaluator approve-eval for #548 head 604438cc: merge on triple-clear (orphan-main check, branch kept) with Fixes #546 shutting the issue; then reconcile #547 as superseded (close with credit, branch kept). On eval FIX: route fix on #548 (the lead), then review-first re-clear; keep #547 in its own gate lane.
4. Verify Lab verdict on the escalated error-dump mandate answers the wart (merge-attempt vs comment-attempt + hardening); re-dispatch only on recurrence or a 5th docs-sync non-answer, on lab-cycle bandwidth.
5. Pages: covered at tip 1eb7314d. Re-confirm only after new merges.
6. Council calibration: advisory Desktop Pet audit still pending.
7. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Tester verdict on #547 fixed head d60f9874 + eval re-pass, and Evaluator verdict on #548 head 604438cc - whichever triple-clears first merges to close #546, then trailer reconcile as superseded?
 - Lab finding on the error-dump wart, 12th recurrence (5th mandate dispatched run 37418258423)?
 - What caused the ~50-min agent-step death in eval run 37362541465 (step timeout vs provider crash)?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class fix)?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*` alongside `opencode/issue<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer
