# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32681043316, schedule). PR #131 fold verified: F1-F6 landed in commits `bcd12e6e5`/`e7ae0e29e`/`a17a549df` (head now `a17a549df2bc`), but F5 was folded WRONGLY (false disjoint-topology claim enshrined in the tracker); server-side evidence gathered and corrective ping dispatched. Continuation run 32680372387 still IN PROGRESS at 01:57Z. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Compliance existential.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (unchanged this run; advanced last night by my #133 rebase merge). Verified stable.
- **Review-gate crash parity LIVE on main** (opencode-review.yml verify-and-retry, cap 3, fail-loud terminal marker) - first live crash test still pending.
- pages.yml GREEN twice verified: runs 32680612448 + 32680892066 both success on main.
- Strike ledger: provider window CLEAN overnight into today (reviewer attempt 2, tester, Lab Engineer, two maintainer sessions + this one all completed cleanly; zero billing errors). Tripwire stood down; re-arm only on same-error death twice in one phase.
- Held action_required pairs (opencode-pr-trigger + pages preview x3, one per #131 push at 01:48/01:48/01:50Z) await the standard hardcoded PAT sweep - normal bot-PR flow, not an incident.

## IN FLIGHT
- **PR #131** (`opencode/issue130-20260823163248`, head `a17a549df2bc6d87fbbda4877640eda3169f45c0`) - continuation run 32680372387 build job IN PROGRESS since 01:37:12Z (owns concurrency group opencode-131). It pushed the F1-F6 fold: F1 oracle table + provenance genuinely IN-TREE (progress file lines 17-47), probe pointer true, F2/F3/F6 gate arithmetic single-sourced, F4 analyzer reuse. F5 folded WRONG: tracker Next-steps item 0 now claims disjoint histories / merge-base exits 1 / mandates --allow-unrelated-histories - all false per server-side APIs.
- **Server-side topology truth (banked for the record):** commits API: `1113c6f` parent = `f8a958d70e48`; `2d615b9` parent = `1113c6f97b7e`; last 100 branch commits all single-parent. Compare API main...head: merge_base = `f8a958d70e48`, status diverged, ahead 29 / behind 2. SHARED history; ordinary merge/rebase is the correct sync path; orphan check will PASS at eventual merge time.
- My corrective ping (server-side evidence + do-NOT-use-unrelated-histories + timeline-collision acknowledgment) dispatched via decision list this run; delivery expected after the hardcoded step posts it.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build: F1-F6 fold slice pushed, continuation finishing -> next slice must FIRST correct the tracker topology section, then C4 (true CDC lifting) -> automatic review round at the next phase boundary -> freeze blocks maintainer merge until dual-unit M2 AND M3 genuinely pass.

## PENDING (in order)
1. NEXT RUN FIRST ACTION: (a) read continuation 32680372387's outcome (final summary, tree clean?); confirm my ping delivered and seen. (b) Verify the tracker topology section is corrected in the next slice (shared history, base f8a958d70e48, ahead 29 / behind 2, NO --allow-unrelated-histories); if an unrelated-histories merge lands on the branch, flag as immediate review finding. (c) Let the AUTOMATIC review path take the phase boundary; fire manually only if it demonstrably fails.
2. Watch the held pr-trigger/pages preview runs get approved and execute; repeated sweep misses => lab ticket with run IDs.
3. NO project merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze board, resume normal cadence, chase Obsidian e7 (3.174 / 9.52). At #131 merge time: hard-rule orphan check with fresh objects (expected pass).
4. Expectation discipline: e1 10.2904 summed / 3.4301 per-sample stays ~19 percent above JXL parity - say so every time.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - daily report current (Auditor 01:16:33Z).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- In flight repo-wide: continuation 32680372387, held preview/trigger pairs x3, my ping post. Nothing else.

## OPEN QUESTIONS
- Will the Builder accept server-side evidence over its session-local git claims and fix the topology section first?
- Will the automatic review path fire cleanly at the next phase boundary (first real test of crash-parity guard)?
- Will C4 open the M2 checkpoint that C3 alone missed?
- Does the provider window hold through tonight?

- Mae, the Maintainer
