# STATE - Random factory checkpoint
 - **Updated: 2026-10-06 run 37491954025 - eval dispatched on PR #550 (double-gated fixed head), Builder in flight on #549**

## PRs & Issues
 - **PRs:** Open: #550 (Lab Engineer 7th-mandate docs-sync: 1-line index.html archived-README links, head 67a36f61 post-Fixer, MERGEABLE/CLEAN, Reviewer APPROVED + Tester APPROVE-TEST on the exact head, body 0x Closes / Refs #70; Evaluator dispatched this run, no verdict yet). CLOSED: #547 (Curator graduation/archive task, Fixes #546, closed 05:46:07Z as superseded by #548, branch kept on origin). MERGED: #548 (same Fixes #546 task, merged 05:44:26Z, closed #546), #545 (surgical repro.sh layered-JSON fix, 1eb7314d, triple-cleared 9.8, Closes #544), #543 (Final Phase, c172a1ed, triple-cleared 9.8, Closes #532), #541, #542, #540, #539, #538, #537, #536, #533, #534, #535, #531, #529, #527.
 - **Issues:** Open: #550 gating via PR #550 (same number, PR), #549 landing-test staleness (TRIAGED, Builder arm summoned via owner /oc build this 15:51:32Z, no PR yet), #70 lab-health, #42 brainstorm standing. Closed: #546 Curator graduation/archive task (done via #548), #544 (repro.sh stale grep, fixed by #545), #532 Terminal Browser epic (full roadmap on main), #530, #528, #526, #515, #518, #504, #507, #498, #436-GUI-detach-unknown (verify; kept from prior checklist pending owner direction).
 - **Boards:** #70 lab-health, #42 standing. `workflows:` event allowlist: 19-entry list vs 20 live workflow `name:` fields (maintainer excluded by design) re-verified this run - no drift. `SWEEP_ALLOWLIST` 7-entry unchanged.
 - Design v2 (Harbor Overlay System v2, 3-row drawer) supersedes v1 commentary on #532; PR #536 carried the spec + tokens, now on main.

## IN FLIGHT
 - Evaluator dispatched on #550 (decision eval 550 this run; no prior eval arm, no approve-eval yet). Builder arm on #549 (owner /oc build this 15:51:32Z; no Builder PR yet - still working/queued).
 - Main tip 7a95cd02 (post-#548 merge, unchanged). Pages deploy covers tip 7a95cd02 (success 15:52:22Z); preview deploy covers PR #550 pre-fix head b6f4266c (success 15:52:02Z).
 - Run sweep: zero failure/timed_out (in-progress self + skipped/cancelled maintainer workflow_run fan-out + skipped opencode arms on the maintainer trigger are not failures).
 - Rebase-gate rule: a rebase or fix-push that rewrites a gated PR's head voids its gate; the fixed head needs Reviewer re-confirmation (then test/eval as needed) before merge - #547 complied (approve 05:41:51Z on d60f9874 after the fix-push); #550 complied (approve + approve-test on 67a36f61 after the Fixer empty commit). Never merge without approve-eval on the mergeable head. Test-only Tester commits (single-file tests/, production untouched, approve-test after the push) do NOT void the review gate per #534/#537/#538/#539/#540/#541/#543/#545 precedent.
 - Eval-gate calibration note (for future self): #531 and #535 merged on Reviewer approve + Tester approve-test WITHOUT an Evaluator round (surgical infra/docs fixes). The Evaluator binding gate stays mandatory for product/research/phase deliverables. #547/#548 were public-surface curation changes (README + Pages + archive move); eval applied as the binding gate before merge (same as prior terminal-browser fixes). #550 is a public-surface docs change - eval applies as binding gate before merge.
 - Eval-crash rule (amended): an eval run that dies inside `Run evaluator agent` with no decision file and no Quality Council comment carries zero signal - retry eval once (cooldown: 30 min same-signature). A second AGENT-STEP silent death routes `lab`, never a third eval. UNACQUIRED deaths (never got a runner) do not count toward the budget and retry on cooldown expiry. Stacked exceptions disqualified: one exception per cooldown window max, never back-to-back.
 - Duplicate-eval note: maintainer dispatch + owner /oc eval within seconds spawns harmless duplicate eval arms (per-PR concurrency settles one); prefer stand-down when an eval arm is already pending/in_progress.
 - Duplicate-PR note (2026-10-06, resolved): parallel `/oc curate` triggers on one task issue spawned duplicate Curator PRs (#547 vs #548, both Fixes #546). #548 merged first; #547 closed as superseded with credit, branch kept. Never merge both (archive-move collision) - complied.
 - Error-dump wart status: 12th recurrence (00:22:29Z on #545) unanswered through 6 lab verdicts; zero recurrence in ~15.5h and #547/#548/#550 comments posted cleanly - possibly already moot. 7th mandate (PR #550) delivered a docs-sync answer with moot-evidence claims but still no merge-vs-comment root cause + hardening.
 - Landing-test staleness CONFIRMED LIVE: pr410 fails 4/5 on direct execution (35s, AssertionError 0 != 1 Prism count); pr412 lab-reported 3 failures + 8 errors (not re-run locally). Both files exist on main, NOT wired into any workflow (landing mentions in opencode.yml/pages.yml are the landing page). Tracked in #549, now with the Builder.
 - Workflow warts logged (not yet lab-routed): (1) opencode.yml verify step counts ALL historical auto-retry comments; (2) verify-step branch pattern false-negatives on non-`opencode/issue<N>-*` branch names. Lab to assess on second consecutive trigger-step failure.
 - Standing-board close guard: RESOLVED on #550 - body holds 0x `Closes #70` / Refs #70; merge (if triple-cleared) keeps #70 open.

## NEXT-RUN PLAYBOOK
1. Trigger-list re-verify each run (BOTH allowlists: `workflows:` event list AND `SWEEP_ALLOWLIST` sweep-dispatch list; watch for any new workflow drift).
2. Evaluator verdict next on #550 (head 67a36f61): on approve-eval merge on triple-clear (orphan-main check, branch kept) as Refs #70 (never Closes #70); on eval FIX route fix then review-first re-clear. Builder PR expected on #549 (Refs #549; Closes #549 acceptable on triple-clear for that single-fix task).
3. Loop-guard review on the error-dump mandate: PR #550 is the 7th docs-sync-shaped answer (with moot-evidence claims but no hardening). On a quiet run, weigh an Owner escalation note over an 8th mandate instead of auto re-queueing.
4. Pages re-confirm only after new merges (tip 7a95cd02 covered; PR #550 preview covers b6f4266c, re-check after merge).
5. Council calibration: advisory Desktop Pet audit still pending.
6. Standing rule: standby on all other fronts (no auto-ideate). Further work arrives via new issues, owner comments, or workflow failures.

## OPEN QUESTIONS
 - Evaluator verdict on #550 67a36f61 + triple-clear merge as Refs #70?
 - Builder PR contents + triple-clear path for #549 (update assertions vs remove files)?
 - Error-dump wart still live on current main, or moot after 15.5h quiet (7th answer claims moot-evidence, no hardening)?
 - 8th lab mandate vs Owner escalation note (loop-guard review after 7 docs-sync answers)?
 - What caused the ~50-min agent-step death in eval run 37362541465 (step timeout vs provider crash)?
 - Should the stale `opencode/lab-70-docs-sync` branch be deleted, or kept as archaeology?
 - Should the maintainer trigger poster re-checkout main after in-session merges before reading its own mapping (stale-checkout silent-drop class fix)?
 - Opencode verify-step warts: (1) auto-retry counter per-attempt-window vs all-time? (2) branch pattern accepting `opencode/<issue>-*` alongside `opencode/issue<issue>-*`?
 - What shape will the release pipeline take at publish time going forward?
 - Will the Owner open a PR from the `opencode/issue436-gui-detach-and-syswide-fixes` branch, or land it another way?
 - What caused the 08:34-11:26Z schedule silence on 2026-09-29?
 - Probe source of the 2026-09-25 PWNED selfheal payloads (red-team test vs unknown actor)?

 - Hephaestus, the Maintainer
