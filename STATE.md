# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37393650709 - owner /oc test on #545, stand-down, Tester in flight**

## PRs & Issues
 - **PRs:** Open: #545 (surgical repro.sh layered-JSON fix, Closes #544, head eb791dcd, MERGEABLE/CLEAN, Reviewer approve 00:23:05Z, Tester run 37393724744 in_progress). MERGED: #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532; branch kept on origin), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527.
 - **Issues:** Open: #544 (repro.sh stale grep, Builder PR #545 in gating), #70 lab-health, #42 brainstorm standing. Closed: #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry inline list, last re-verified exact match run 37387505959; line re-read unchanged since - no drift signal.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - PR #545 on #544: Reviewer approve 00:23:05Z on the head, owner /oc test 00:23:08Z summoned opencode-test run 37393724744 (in_progress at survey). Gate order: Tester verdict, then eval, then merge on triple-clear (single-fix task so Closes #544 on triple-clear is fine).
 - Main tip c172a1ed (post-#543 merge, verified via ls-remote this run). No other open PRs.
 - Held runs: none observed beyond normal PR-head pr-trigger/Pages awaiting owner approval.
 - Run sweep: zero failure/timed_out (in-progress opencode-test 37393724744 + pending maintainer arm 37393724029 are owner-triggered workers, not failures; rest skipped/cancelled maintainer workflow_run fan-out + successes).
 - Lab error-dump wart: 12th recurrence at 00:22:29Z on #545 (run 37393601418 posted the raw write-permission error as a bot comment). Re-dispatch WITHHELD this run (test in flight, not a quiet run). Next quiet run dispatches `lab 70` with ESCALATED framing (merge-attempt vs comment-attempt root cause, prompt vs permissions hardening).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge. Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #545 is a surgical test-harness fix; eval still applies as the binding gate before merge (same as prior terminal-browser fixes).
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Watch Tester verdict on #545: on approve-test route eval; on fix findings route fix then review-first re-clear; merge only on triple-clear of the mergeable head with Closes #544 shutting the issue.
3. Lab error-dump wart: 12th recurrence logged. Re-dispatch WITHHELD (test in flight, not a quiet run). Next QUIET run dispatches `lab 70` with ESCALATED framing if no verdict addressed error-dump by then.
4. Pages: confirm a deploy covers tip c172a1ed (deploy success 00:17:31Z this cycle; PR #545 preview staged under /preview/pr-545/).
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Tester verdict on #545 eb791dcd + eval bar clearance + merge to close #544?
 - Lab finding on the error-dump wart, 12th recurrence (merge-attempt vs comment-attempt, prompt vs permissions hardening)?
 - What caused the ~50-min agent-step death in eval run 37362541465 (step timeout vs provider crash)?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class)?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*` alongside `opencode/issue<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

  - Hephaestus, the Maintainer