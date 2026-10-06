# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37419911589 - owner /oc maintainer on #548 post approve-eval, MERGED #548 triple-clear, closed #546, #547 reconcile pending**

## PRs & Issues
 - **PRs:** Open: #547 (same graduation/archive task, head d60f9874 after Fixer 3-URL repair + Reviewer re-approve 05:41:51Z, Tester run 37419826375 in_progress on owner /oc test 05:41:53Z; reconcile as superseded next run once verdict lands, never merge both - archive-move collision). MERGED: #548 (Curator graduate Terminal Browser + archive Sextant, 604438cc, triple-cleared 9.9, Fixes #546; merged 05:44:26Z via --rebase, main 1eb7314d to 7a95cd02, branch kept on origin), #545 (surgical repro.sh layered-JSON fix, 1eb7314d, triple-cleared 9.8, Closes #544; branch kept on origin), #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532; branch kept on origin), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527.
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing. Closed: #546 (Curator graduation/archive task, closed by #548 merge this run), #544 (repro.sh stale grep, fixed by #545), #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry list re-verified exact match against 20 live workflow names (maintainer excluded by design) this run - no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Tester run 37419826375 in_progress on #547 fixed head d60f9874 (owner /oc test 05:41:53Z, post Reviewer re-approve). Verdict expected next; then close #547 as superseded with credit (branch kept), since #548 already merged the same task.
 - Lab Engineer ESCALATED error-dump mandate dispatched run 37418258423 (5th attempt; 4 prior docs-sync non-answers recorded). No lab verdict yet (recent Lab Engineer arms skipped on non-lab triggers, not failures). Verdict expected next; re-dispatch only on a quiet run.
 - Main tip 7a95cd02 (post-#548 merge, verified via ls-remote this run).
 - Held runs: none observed beyond normal skipped/cancelled maintainer workflow_run fan-out.
 - Run sweep: zero failure/timed_out (in-progress self 37419911589 + in-progress opencode-test 37419826375 are workers, not failures; rest skipped/cancelled fan-out).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge. Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543/#545 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #547/#548 are public-surface curation changes (README + Pages + archive move); eval still applies as the binding gate before merge (same as prior terminal-browser fixes).
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Duplicate-PR note (resolved 2026-10-06): parallel `/oc curate` triggers on one task issue spawned duplicate Curator PRs (#547 vs #548, both Fixes #546). #547 led first (eval dispatched) but took eval FIX 9.2 on the 3-URL defect; #548 already contained that fix plus double-gate, took the lead, triple-cleared 9.9, and merged. #547 reconciles as superseded - never merge both (archive-move collision).
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. On Tester verdict for #547 (head d60f9874): close #547 as superseded with credit (branch kept on origin), regardless of verdict direction - the task already landed via #548. No fix/test/eval chaining on #547.
3. Verify Lab verdict on the escalated error-dump mandate answers the wart (merge-attempt vs comment-attempt + hardening); re-dispatch only on recurrence or a 5th docs-sync non-answer, on lab-cycle bandwidth.
4. Pages: confirm deploy covers tip 7a95cd02 after merge.
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Tester verdict on #547 d60f9874 + superseded reconcile (branch kept)?
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