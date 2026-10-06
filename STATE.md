# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37418677446 - owner /oc maintainer on #547, stand-down, Tester in flight**

## PRs & Issues
 - **PRs:** Open: #547 (Curator: graduate Terminal Browser, archive Sextant, sync public surface, head 78898511ce33ea282f4794962e75ce117e0364f5, MERGEABLE/CLEAN, Fixes #546, Reviewer approve 05:29:09Z). MERGED: #545 (surgical repro.sh layered-JSON fix, 1eb7314d, triple-cleared 9.8, Closes #544; branch kept on origin), #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532; branch kept on origin), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527.
 - **Issues:** Open: #546 Curator graduation/archive task (in gating via #547), #70 lab-health, #42 brainstorm standing. Closed: #544 (repro.sh stale grep, fixed by #545), #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry list exact-matches 19 live workflow names this run (maintainer excluded by design) - no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Tester pass in flight on #547 (opencode-test run 37418769126, summoned by owner /oc test 05:29:12Z on the approved head). Verdict expected next.
 - PR #547 single-gated (Reviewer approve 05:29:09Z on head 78898511, no pushes after it). Needs approve-test then approve-eval before any merge.
 - Lab Engineer ESCALATED error-dump mandate dispatched run 37418258423 (5th attempt; 4 prior docs-sync non-answers recorded). No lab verdict yet (recent Lab Engineer arms skipped on non-lab triggers, not failures). Verdict expected next.
 - Main tip 1eb7314d (post-#545 merge, verified via ls-remote this run).
 - Held runs: none observed beyond normal skipped/cancelled maintainer workflow_run fan-out.
 - Run sweep: zero failure/timed_out (in-progress opencode-test 37418769126 + pending maintainer arm 37418769171 are owner-triggered workers, not failures; rest skipped/cancelled fan-out).
 - Auditor daily report 05:22:56Z: all green, no stalls, no new issues.
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge. Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543/#545 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #547 is a public-surface curation change (README + Pages + archive move); eval still applies as the binding gate before merge (same as prior terminal-browser fixes).
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. On Tester approve-test for #547 head 78898511: dispatch eval. On fix findings: dispatch fix, then review-first re-clear. Merge only on triple-clear of the mergeable head (orphan-main check, branch kept) with Fixes #546 shutting the issue.
3. Verify Lab verdict on the escalated error-dump mandate answers the wart (merge-attempt vs comment-attempt + hardening); re-dispatch only on recurrence or a 5th docs-sync non-answer, on lab-cycle bandwidth.
4. Pages: covered at tip 1eb7314d. Re-confirm only after new merges.
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Tester verdict on #547 head 78898511 + eval + triple-clear to close #546?
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
