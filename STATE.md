# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32661970460, issue_comment on PR #131, owner ping 19:40:08Z). REPAIR VERIFIED: my re-dispatched continuation (run 32661129376, build job active since 19:24:27Z) landed the full Kodak-24 both-units re-measure (`71dbe16f8`: 10.3544 summed / 3.4515 per-sample = -6.09 pct bytes) and is implementing C2 right now. Quiet stand-down this run - decision list `[]`. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Compliance existential.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`** (ls-remote verified this run; unchanged all day).
- MODEL PINS healthy on x-preview-f-free / mimo-v2.5-free all evening; this session runs on the pin = live proof. Dispatch-path strike tracking CLEARED (my repaired re-dispatch worked first try). No lab needed.
- SHIPPING LIMIT moot under freeze (resets 2026-08-24).

## IN FLIGHT
- **Builder continuation run 32661129376** on PR #131 (`opencode/issue130-20260823163248`, head `71dbe16f8`) ACTIVELY WORKING since 19:24:27Z. Done this run: Kodak-24 e1 both-units re-measure with 24/24 sha pins verified pre-measurement; fresh CSV committed; pre-change CSVs archived as *-pre-c1.csv. In progress now: C2 MA-tree always-on (depth<=10/leaves<=256/min-samples 512/quantile thresholds; evalGuard hasLevels deleted; acceptance = trial bits incl model bytes). Tracker queue after: C3 trial-encoded decisions -> M2 window (~9.3-9.6 projected) -> C4 true CDC lifting -> C5 cross-band prediction -> M3 gate.
- Milestone reference: C1 closed with A1+A2 PASS after evidence-based A2 recalibration (kodim01 v2 -6.40 pct of v0 / kodim13 -4.79 pct; 34/34 gtests; fuzz clean).

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build CONTINUING (run 32661129376 active, C2 under way) -> review (fires at handoff/M2 window) -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: check run 32661129376's conclusion. Completed with handoff -> time the review round (fire only if the automatic reviewer did not start; prefer the C3/M2-window handoff over mid-C-series, but weigh a review round if the Builder yields in_progress for long). Died/failed -> inspect error class FIRST, no blind refire.
2. Reviewer round MUST verify: dual-unit statements in ALL benchmark claims; D1 bench_gate.sh self-check shows a real FAIL case; decoder-mirrored constants; FIFO acoder v1-stream compatibility; trial-bits acceptance criteria; PLUS the A2-recalibration evidence chain (byte-exact replica, instrumented-oracle ceiling ~0.19 pct, decision record `.github/agents/decisions/builder/2026-08-23T19-35-00-a2-gate-recalibration.md`). Recalibration accepted provisionally, reviewer-scrutiny mandatory.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze Brainstorm board, resume normal cadence; keep chasing Obsidian e7 (3.174 / 9.52) too.
4. Expectation discipline: even the M2-window projection (~9.3-9.6 summed) stays above parity; keep public framing honest until M3 passes in both units.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity). PR #131 carries all phases.
- **#70 (Lab Health)** - lab stood down as moot; owner's `/oc auditor` there may have produced an Auditor summary - read it next sweep.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Benign pending opencode run 32661970419 (from owner's `/oc maintainer` batch): queued behind the active build by concurrency, self-skips per the workflow exclusion when dequeued - same pattern as 32659091715 and 32660807816. Do not mistake it for a duplicate build.
- All same-batch workflows (review/test/lab/recover/auditor) skipped correctly.

## OPEN QUESTIONS
- Will C2 land inside run 32661129376 or need one more continuation?
- Will C3 bring the corpus into the M2 window (~9.3-9.6 projected)?
- Does the Reviewer uphold the A2 recalibration methodology, or demand re-derivation?

- Mae, the Maintainer
