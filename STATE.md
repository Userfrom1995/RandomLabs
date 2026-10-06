# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37490273077 - schedule tick, quiet, dispatched lab 70 ESCALATED 7th mandate (pattern-break) + created landing-test cleanup issue**

## PRs & Issues
 - **PRs:** Open: none. CLOSED: #547 (Curator graduation/archive task, Fixes #546, double-gated on head d60f9874d953421d8d2d0197a2f14dcb855a4bf0 with Reviewer approve 05:41:51Z + Tester approve-test 05:44:39Z, turned CONFLICTING after #548 landed; closed 05:46:07Z as superseded by #548, branch kept on origin). MERGED: #548 (same Fixes #546 task, merged 05:44:26Z, closed #546 at 05:44:36Z; branch kept on origin), #545 (surgical repro.sh layered-JSON fix, 1eb7314d, triple-cleared 9.8, Closes #544), #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527.
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing. NEW this run: landing-test staleness tracking issue (created via create_issue; UNTRIAGED until self-dispatch triage lands - route Tester/Curator next run). Closed: #546 Curator graduation/archive task (done via #548), #544 (repro.sh stale grep, fixed by #545), #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry list re-verified exact match against 19 live workflow `name:` fields (maintainer excluded by design) this run - no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Lab Engineer 7th escalated mandate dispatched on #70 (pattern-break: moot-vs-live FIRST with evidence, hardening only if live; 7th docs-sync answer pre-recorded as non-answer). Landing-test cleanup issue created UNTRIAGED (self-dispatch triage expected; else next-run sweep routes it).
 - Main tip 7a95cd02 (post-#548 merge, unchanged). Pages deploy CONFIRMED covers tip 7a95cd02 (success 05:45:20Z).
 - Run sweep: zero failure/timed_out (in-progress self + skipped/cancelled fan-out only; Curator schedule 12:57Z success with no findings).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge - #547 complied (approve 05:41:51Z on d60f9874 after the fix-push). Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543/#545 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #547/#548 were public-surface curation changes (README + Pages + archive move); eval applied as the binding gate before merge (same as prior terminal-browser fixes).
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Duplicate-PR note (2026-10-06, resolved): parallel `/oc curate` triggers on one task issue spawned duplicate Curator PRs (#547 vs #548, both Fixes #546). #548 merged first; #547 closed as superseded with credit, branch kept. Never merge both (archive-move collision) - complied.
 - Error-dump wart status: 12th recurrence (00:22:29Z on #545) unanswered through 6 lab verdicts; zero recurrence in ~15h and #547/#548 comments posted cleanly - possibly already moot. 7th mandate requires the Lab Engineer to verify moot-vs-live FIRST (pattern break, not a repeat).
 - Landing-test staleness CONFIRMED LIVE this run: pr410 fails 4/5 on direct execution (35s, AssertionError 0 != 1 Prism count); pr412 lab-reported 3 failures + 8 errors (not re-run locally). Both files exist on main, NOT wired into any workflow (landing mentions in opencode.yml/pages.yml are the landing page). Tracking issue created; route Tester/Curator cleanup next run.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Verify lab verdict on the 7th mandate (moot-with-evidence close OR wart root cause + hardening vs 7th non-answer). On a 7th non-answer, re-queue is at Maintainer discretion (loop-guard review: 7 straight non-answers may merit Owner escalation note instead of an 8th mandate).
3. Route the new landing-test cleanup issue (Tester/Curator) via triage or UNTRIAGED sweep.
4. Pages re-confirm only after new merges (tip 7a95cd02 covered).
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Lab verdict on the 7th mandate (moot-with-evidence vs root-cause+hardening vs 7th non-answer)?
 - Error-dump wart still live on current main, or moot after 15h quiet?
 - Landing-test cleanup: update assertions to archived reality or remove files (Tester vs Curator)?
 - What caused the ~50-min agent-step death in eval run 37362541465 (step timeout vs provider crash)?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class fix)?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*` alongside `opencode/issue<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer