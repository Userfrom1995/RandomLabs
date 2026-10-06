# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37492702949 - MERGED #550 on triple-clear (4d95618e), Tester in flight on #551**

## PRs & Issues
 - **PRs:** Open: #551 (Builder #549 delivery: stale landing tests updated to archived reality + archive/prism link repair, head 04822bd5, MERGEABLE, body Closes #549; Reviewer APPROVED 16:02:55Z on the head, owner /oc test 16:02:59Z, opencode-test run 37492589247 in_progress, no verdict yet). MERGED: #550 (Lab Engineer 7th-mandate docs-sync: 1-line index.html archived-README links, 67a36f61, triple-cleared 9.9, Refs #70, merged 16:05:27Z, branch kept on origin), #548 (Fixes #546, merged 05:44:26Z, closed #546), #545 (1eb7314d, triple-cleared 9.8, Closes #544), #543 (c172a1ed, triple-cleared 9.8, Closes #532), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED: #547 (superseded by #548, branch kept).
 - **Issues:** Open: #549 landing-test staleness (TRIAGED, in gating via PR #551), #70 lab-health, #42 brainstorm standing. Closed: #546 (done via #548), #544 (fixed by #545), #532 (epic, full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry list vs 20 live workflow `name:` fields (maintainer excluded by design) re-verified this run - no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Tester in flight on #551 (opencode-test run 37492589247 in_progress since 16:03:01Z; Reviewer approve 16:02:55Z already on head 04822bd5).
 - Main tip 4d95618e (post-#550 merge, linear: 7a95cd02 is ancestor). Pages re-confirm pending on the new tip; preview deploys cover PR heads as staged.
 - Run sweep: zero failure/timed_out (in-progress self + in-progress opencode-test 37492589247 + skipped/cancelled maintainer workflow_run fan-out + skipped opencode arms on the maintainer trigger are not failures).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge - #550 complied (approve + approve-test + approve-eval all on 67a36f61 after the Fixer empty commit). Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543/#545 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #547/#548 were public-surface curation changes (README + Pages + archive move); eval applied as the binding gate before merge (same as prior terminal-browser fixes). #550 was a public-surface docs change - eval applied as binding gate before merge (9.9). #551 is a test-harness fix - eval applies as binding gate before merge (same as prior terminal-browser fixes).
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Duplicate-PR note (2026-10-06, resolved): parallel `/oc curate` triggers on one task issue spawned duplicate Curator PRs (#547 vs #548, both Fixes #546). #548 merged first; #547 closed as superseded with credit, branch kept. Never merge both (archive-move collision) - complied.
 - Error-dump wart status: 13th recurrence (16:00:58Z on #551, write-permissions bot comment, run 37492168035) after ~16h quiet - first since the 12th at 00:22:29Z on #545. Moot-quiet streak broken; fresh evidence for the loop-guard review (8th mandate vs Owner escalation note) on a quiet run. 7th mandate (PR #550) delivered a docs-sync answer with moot-evidence claims but still no merge-vs-comment root cause + hardening.
 - Landing-test staleness: Builder delivered the fix as PR #551 (test updates + archive/prism link repair, claims 5/5 and 13/13 live). Awaits Tester/Evaluator verification of those claims - never merge on author claims alone (Reviewer already re-verified live: 5/5 and 13/13 per its 16:02:55Z verdict).
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: RESOLVED on #550 - merged with Refs #70, #70 stays open. #551 body `Closes #549` is correct for the single-fix task.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Tester verdict next on #551 (head 04822bd5, Reviewer approve already on the head): on approve-test route eval (binding) then merge on triple-clear with Closes #549 shutting the issue; on fix findings route fix then review-first re-clear.
3. Loop-guard review on the error-dump mandate: PR #550 was the 7th docs-sync-shaped answer (with moot-evidence claims but no hardening), and the 13th recurrence at 16:00:58Z on #551 breaks the moot theory. On a quiet run, weigh an Owner escalation note over an 8th mandate instead of auto re-queueing.
4. Pages re-confirm on tip 4d95618e (post-#550 merge); PR previews staged per-PR.
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Tester verdict on #551 04822bd5 + eval + triple-clear to close #549?
 - Pages deploy covering tip 4d95618e?
 - Error-dump wart live again - 13th recurrence after 16h quiet kills the moot theory; 8th lab mandate vs Owner escalation note?
 - What caused the ~50-min agent-step death in eval run 37362541465 (step timeout vs provider crash)?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class fix)?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*` alongside `opencode/issue<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer