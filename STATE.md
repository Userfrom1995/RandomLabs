# STATE - Random factory checkpoint
 - **Updated: 2026-10-10 run 38025444804 - owner /oc maintainer on #70, quiet standby, Auditor green**

## PRs & Issues
 - **PRs:** Open: none. MERGED: #551 (Builder #549 delivery: stale landing tests updated to archived reality + archive/prism link repair, 04822bd5, triple-cleared 9.9, merged 16:13:41Z, main 4d95618e to 1ea24447, branch kept, #549 closed), #550 (Lab Engineer 7th-mandate docs-sync, 67a36f61, triple-cleared 9.8, merged 16:05:27Z, main 7a95cd02 to 4d95618e, branch kept, #70 stays open), #548 (Fixes #546 task, merged 05:44:26Z, closed #546), #545 (surgical repro.sh layered-JSON fix, 1eb7314d, triple-cleared 9.8, Closes #544), #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527. CLOSED: #547 (Curator graduation/archive task, Fixes #546, closed 05:46:07Z as superseded by #548, branch kept on origin).
 - **Issues:** Open: #70 lab-health, #42 brainstorm standing. Closed: #549 landing-test staleness (fixed via #551, triple-clear 9.9), #546 Curator graduation/archive task (done via #548), #544 (repro.sh stale grep, fixed by #545), #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19 entries vs 19 live lab workflow `name:` fields (maintainer excluded by design; GitHub-managed github-pages excluded) - exact set match verified this run, no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Nothing in flight. Main tip 1ea24447 (post-#551 merge, unchanged, verified via git ls-remote + local rev-parse this run). Pages deploy covers tip 1ea24447 (no new merges since, no re-verify needed).
 - Run sweep: zero new failures (last-50 sweep via gh API: zero failure/timed_out/startup_failure; only skipped/cancelled maintainer fan-out plus curator/recover/auditor successes).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge - #547 complied (approve 05:41:51Z on d60f9874 after the fix-push); #550 complied (approve + approve-test on 67a36f61 after the Fixer empty commit). Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543/#545 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #547/#548 were public-surface curation changes (README + Pages + archive move); eval applied as the binding gate before merge (same as prior terminal-browser fixes). #550 was a public-surface docs change - eval applied as binding gate before merge. #551 was a test-harness fix - eval applied as binding gate before merge (same as prior terminal-browser fixes).
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Duplicate-PR note (2026-10-06, resolved): parallel `/oc curate` triggers on one task issue spawned duplicate Curator PRs (#547 vs #548, both Fixes #546). #548 merged first; #547 closed as superseded with credit, branch kept. Never merge both (archive-move collision) - complied.
 - Error-dump wart status: 13th recurrence (16:00:58Z on #551, write-permissions bot comment, run 37492168035) logged; escalation note posted to Owner via ping on #70 (run 37552237432). 8th lab mandate withheld per loop guard - awaiting Owner direction.
 - Evaluator follow-up VERIFIED live on main (prior run): `archive/prism/benchmarks/bench_vs_codecs.py:28` sys.path resolves to nonexistent `archive/archive/obsidian/benchmarks` (file sits at archive/prism/benchmarks/, so parent.parent.parent is archive/ plus /archive/obsidian/benchmarks). In-scope test passes despite the broken import (weak assertion). Pre-existing archive-move depth bug, not user-facing. Queued as a future Builder/test-hardening vehicle (no issue/PR creation from maintainer runs per the safety net; record here until a natural vehicle appears).
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: RESOLVED on #550 - body held 0x `Closes #70` / Refs #70; merged as Refs #70, #70 stays open. #551 body `Closes #549` was correct for the single-fix task.
 - Stale landing-test watch item: RESOLVED - Auditor verified on tip that PR #551 updated both suites to archived Prism reality; nothing outstanding for Tester/Curator.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Pages already covers tip 1ea24447 (verified prior run); re-confirm only after new merges.
3. Error-dump wart: Owner escalation note posted (run 37552237432). Await Owner direction; do NOT auto-queue an 8th lab mandate.
4. Evaluator follow-up (archived bench helper path + weak assertion) queued for a future hardening vehicle; verify still present when routed.
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Owner direction on the error-dump wart (escalation posted 2026-10-07; 8th mandate withheld)?
 - Evaluator follow-up hardening vehicle (archived bench helper sys.path depth + weak assertion)?
 - What caused the ~50-min agent-step death in eval run 37362541465 (step timeout vs provider crash)?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class fix)?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*` alongside `opencode/issue<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer
