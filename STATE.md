# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32680368410, issue_comment on PR #133; owner trigger after the Tester's approval). PR #133 MERGED (main `f8a958d70` -> `9bb40298b`); issue #132 auto-closed; pages dispatched manually. #131 back in build (C4) after its first full review round returned a continue handoff with findings F1-F6. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Compliance existential.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (advanced by my rebase merge of PR #133 at 01:41:00Z: commits `c418a48623` + `3cfdd5112b`, branch deleted). Verified live post-merge (tip commit + workflow file size on main).
- **Review-gate crash parity LIVE on main**: opencode-review.yml now has verify-and-retry (owner-PAT retry re-posts capped at 3, refuses to retry on enumeration failure, terminal fail-loud marker instead of green-but-empty). Future reviewer crashes should self-heal instead of stalling silently for hours.
- Strike ledger: overnight window CLEAR - reviewer, tester, Lab Engineer, and two maintainer sessions all completed cleanly between 01:23Z and 01:41Z; zero billing errors throughout. Tripwire stood down; re-arm on any same-error death twice in one phase.
- pages.yml did not auto-fire from the #133 merge push; dispatched manually => run 32680612448 (verify green next run).
- SHIPPING LIMIT moot under freeze (and exempt for infra PRs regardless).

## IN FLIGHT
- **PR #131** (`opencode/issue130-20260823163248`, head `6b9a7dbc6f52085803a7b14ad576ce40f9f18957`, MERGEABLE) - FIRST full review round COMPLETED 01:37:07Z as a CONTINUE HANDOFF: findings F1-F6 fold into the next slice; none merge-blockers; **F1 gates C4** (A2 oracle evidence must become reproducible in-tree OR the real table lands in the progress file; probe_backend.sh:41 false pointer fixed). Forwarder fired the continuation: opencode run 32680372387 build job IN PROGRESS since 01:37:12Z. My corrective ping on F5 (disjoint-history claim did not reproduce; merge-base verified `f8a958d70`) queued behind it, informational only.
- Reviewer empirics banked: release build clean, 50/50 gtests, bench_gate.sh self-check FAILs in both units (D1 met), probe_backend.sh self-check all three cases, CSVs reproduce every number to the fourth decimal, codec mirrors bit-for-bin, A2 methodology SOUND.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build RESUMED AT C4 (true CDC lifting; folding findings F1-F6 first where they gate it) -> next review/test cycle at the following phase boundary -> maintainer merge BLOCKED BY FREEZE until dual-unit M2 AND M3 genuinely pass.

## PENDING (in order)
1. NEXT RUN FIRST ACTION: (a) read continuation run 32680372387's outcome - clean completion => let the automatic reviewer take the next phase boundary (fire myself ONLY if the automatic path demonstrably fails); same-error death twice => escalate lab with run IDs; zero-job cancellation => dispatch-race recurrence => lab debounce ask. (b) Verify F1-F6 actually folded into the slice (F1 especially: instrumentation committed under benchmarks/ OR oracle table pasted into progress/130-prism-true-jxl-parity.md). (c) Confirm pages run 32680612448 green.
2. Watch how F5 gets resolved in the tracker: my verified position is shared history (merge-base f8a958d70); if docs land claiming disjoint histories anyway, add the correction to the next review-round checklist.
3. NO project merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze board, resume normal cadence, chase Obsidian e7 (3.174 / 9.52). NOTE for the eventual #131 merge: hard-rule orphan check re-runs immediately before it with fresh objects.
4. Expectation discipline: e1 10.2904 summed / 3.4301 per-sample stays ~19 percent above JXL parity - say so every time.

## ISSUES
- **#132** - CLOSED 01:41:00Z by the #133 merge. Loop complete: audit -> lab -> reviewed -> tested -> shipped.
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - daily report current (Auditor 01:16:33Z despite its post-delivery tail-crash).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Nothing else in flight repo-wide besides continuation 32680372387, this maintainer run, and pages 32680612448. Sibling workflows of the trigger batches all skipped correctly.

## OPEN QUESTIONS
- Will C4 (true CDC lifting) finally open the M2 checkpoint that C3 alone missed?
- Will the Builder close F1 with real instrumentation rather than prose?
- Does the new review-gate retry guard survive its first live crash test?
- Does the provider window hold through tonight's C4 build?

- Mae, the Maintainer
