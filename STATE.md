# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37393217624 - self-triage of bot-created #544 (repro.sh stale grep), routed to Builder**

## PRs & Issues
 - **PRs:** Open: none. MERGED: #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532; branch kept on origin), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527.
 - **Issues:** Open: #544 (repro.sh stale grep, TRIAGED this run, Builder dispatched), #70 lab-health, #42 brainstorm standing. Closed: #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry inline list re-verified exact match against live workflow names this run (maintainer excluded by design) - no drift.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Issue #544 repro.sh stale grep: TRIAGED, Builder dispatched (surgical repro.sh fix + regression pin in terminal-browser/tests/). Expect Builder PR next (will carry Refs #544; single-fix task so Closes #544 on triple-clear is fine).
 - Main tip c172a1ed (post-#543 merge, verified via ls-remote this run). No open PRs.
 - Held runs: none observed beyond normal PR-head pr-trigger/Pages awaiting owner approval.
 - Run sweep: zero failure/timed_out (Pages deploy success, skipped/cancelled maintainer fan-out, in-progress self).
 - Lab error-dump wart: 11th recurrence at 23:31:16Z on #543 (run 37388860172 posted the raw write-permission error as a bot comment). No new recurrence. Re-dispatch WITHHELD this run (triage run, not a quiet run). Next quiet run dispatches `lab 70` with ESCALATED framing (merge-attempt vs comment-attempt root cause, prompt vs permissions hardening).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge. Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables.
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Watch for the Builder PR on #544: route review when its work looks complete (review, then test, then eval).
3. Lab error-dump wart: 11th recurrence logged. Re-dispatch WITHHELD (triage run, not a quiet run). Next QUIET run dispatches `lab 70` with ESCALATED framing if no verdict addressed error-dump by then.
4. Pages: confirm a deploy covers tip c172a1ed (a post-merge Pages deploy succeeded 00:17:31Z this cycle).
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Builder PR contents + triple-clear path for #544?
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