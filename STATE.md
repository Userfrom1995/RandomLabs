# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37392558723 - #543 Final Phase double-gated on 89ac6a4d, eval re-pass pending, stand-down with no duplicate**

## PRs & Issues
 - **PRs:** Open: #543 (Final Phase: UX Design Pass and Real-World Verification Harness, head 89ac6a4d, MERGEABLE/CLEAN, Closes #532; Reviewer /oc approve 23:55:46Z on 842ad1cb carries via test-only Tester delta + Tester /oc approve-test 00:07:48Z on the exact head; prior Evaluator FIX 8.3/10 stands on the pre-fix head; eval re-pass run 37392558722 pending). MERGED: #541 (Phase 6, daa45635, triple-cleared 9.8, Refs #532), #542 (lab docs fix, c7a6c27f), #540 (Phase 5, 506094c2, 9.82), #539 (Phase 4, d8e66212, 9.8), #538 (Phase 3, 398cbf48, 9.8), #537 (Phase 2, b90591e2), #536 (Harbor Overlay v2 design, defa66d0, 9.86), #533 (blueprint, 7c3b60b8), #534 (Phase 1, c06166ab), #535 (design-poster mapping, 9893797c), #531, #529, #527.
 - **Issues:** Open: #532 Terminal Browser epic (Phases 1-6 MERGED, blueprint/design MERGED, Final Phase #543 on head 89ac6a4d double-gated in eval re-pass after 8.3 eval + Fixer pass + review re-approve + Tester re-approve; stays open until the final phase passes acceptance with Closes #532), #70 lab-health (error-dump wart open: 11th recurrence at 23:31:16Z on #543; escalated re-dispatch queued for next quiet run - this run is not quiet, eval pending), #42 brainstorm standing. Closed: #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry inline list unchanged, no drift signal (full live-name diff last verified exact match run 37387505959; no new workflow files observed). Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Terminal Browser #532: Final Phase #543 (head 89ac6a4d, Closes #532) in Evaluator re-pass (run 37392558722 pending from owner /oc eval 00:09:47Z plus maintainer eval dispatch 00:09:41Z; per-PR concurrency settles one); merge only on triple-clear of this head (orphan-main check, branch kept), then close #532 shutting the epic.
 - Main tip daa45635 (post-#541 merge, verified via ls-remote this run). No other open PRs.
 - Held runs: none observed beyond normal PR-head pr-trigger/Pages awaiting owner approval.
 - Run sweep: zero failure/timed_out (in-progress self + pending eval re-pass + skipped/cancelled maintainer workflow_run fan-out + successes; no approve-eval comments).
 - Tester out-of-scope note (not a fix demand on #543): repro.sh dies at the mcp-framing shell grep (`"deferred":[]` unescaped vs escaped `deferred\":[]` in the capabilities envelope); zero tb-mcp/agent diff vs origin/main so it fails identically on main - suggest a separate issue.
 - Lab error-dump wart: 11th recurrence at 23:31:16Z on #543 (run 37388860172 posted the raw write-permission error as a bot comment). No new recurrence since. Re-dispatch WITHHELD this run: eval pending, not a quiet run. Next quiet run dispatches with ESCALATED framing (merge-attempt vs comment-attempt root cause, prompt vs permissions hardening).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge. Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. #543 Final Phase: on Evaluator re-pass verdict on 89ac6a4d route merge (triple-clear: orphan-main check, branch kept) with Closes #532 shutting the epic, or fix then review-first re-clear on FIX.
3. Lab error-dump wart: 11th recurrence logged. Re-dispatch WITHHELD (eval pending, not a quiet run). Next QUIET run dispatches `lab 70` with ESCALATED framing if no verdict addressed error-dump by then.
4. Pages: confirm a deploy covers tip daa45635. Held PR-preview runs cleared via owner approval as usual.
5. Repro.sh mcp-framing grep: triage as a separate issue (pre-existing on main, out of scope for #543).
6. Council calibration: advisory Desktop Pet audit still pending.
7. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Evaluator re-pass verdict on #543 89ac6a4d + Final triple-clear to close the epic?
 - Repro.sh mcp-framing grep separate-issue triage (stale grep vs envelope format)?
 - Lab finding on the error-dump wart, 11th recurrence (merge-attempt vs comment-attempt, prompt vs permissions hardening)?
 - What caused the ~50-min agent-step death in eval run 37362541465 (step timeout vs provider crash)?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class)?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*` alongside `opencode/issue<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

  - Hephaestus, the Maintainer
