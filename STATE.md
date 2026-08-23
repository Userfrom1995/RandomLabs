# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32660807597, issue_comment on PR #131, owner ping after the C1 close). Continuation run 32658886664 COMPLETED: C1 phase fully closed (A1+A2 PASS after evidence-based A2 recalibration), 3 commits landed, head `83a1d0deb`, tree clean. Owner's fresh `/oc continue` (19:18:05Z) died as run 32660799844 CANCELLED WITH ZERO JOBS - dead trigger verified; THIS run re-dispatched `{"action":"continue","pr":131}` to repair it. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Compliance existential.
- Iteration limit LIFTED; circuit breaker DELETED. One-PR rule; NEVER delete PR branches. Quality gates are the only merge criteria.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`** (ls-remote verified this run). pages.yml green at 19:18:16Z.
- MODEL PINS healthy on x-preview-f-free / mimo-v2.5-free all evening; this maintainer session runs on the pin = live proof. The 17:03-17:20Z transient window stays closed. No lab needed.
- SHIPPING LIMIT moot under freeze (resets 2026-08-24).

## IN FLIGHT
- **Re-dispatched Builder continuation on PR #131** (`opencode/issue130-20260823163248`, head `83a1d0deb`) fired via decision.json this run. Expected queue per tracker: full Kodak-24 re-measure at e1 with sha256 pin verification -> fresh both-units CSV + honest codec-table row update -> C2 (MA-tree always-on) -> C3 (trial-encoded decisions) -> M2 checkpoint window (~9.3-9.6 summed projected).
- C1 completed state for reference: kodim01 v2 -6.40 percent of v0 (125 percent of V1-pin capture), kodim13 -4.79 percent (141 percent); A2 recalibrated to >=0.5 percent (kodim13) / >0.1 percent (kodim01) on instrumented-oracle evidence; 34/34 gtests; fuzz clean.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build CONTINUING (re-dispatched) -> review (fires at handoff/M2 window) -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: verify MY re-dispatched continuation actually started a build job. Dead again with zero jobs = strike 2 for the dispatch path itself: inspect opencode.yml wiring/approval flow and escalate `lab` with both run IDs; no third blind fire.
2. Reviewer round MUST verify: dual-unit statements in ALL benchmark claims; D1 bench_gate.sh self-check shows a real FAIL case; decoder-mirrored constants; FIFO acoder v1-stream compatibility; trial-bits acceptance criteria; PLUS the new item - the A2-recalibration evidence chain (byte-exact replica, instrumented-oracle ceiling ~0.19 percent, decision record `.github/agents/decisions/builder/2026-08-23T19-35-00-a2-gate-recalibration.md`). Recalibration accepted provisionally, reviewer-scrutiny mandatory.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze Brainstorm board, resume normal cadence; keep chasing Obsidian e7 (3.174 / 9.52) too.
4. Kodak-24 re-measure honesty: projected landing ~10.0-10.7 summed is still ~15 percent ABOVE JXL parity - frame it that way publicly when the CSV lands.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity). PR #131 carries all phases.
- **#70 (Lab Health)** - lab stood down as moot earlier today; owner posted `/oc auditor` there recently (Auditor summary may land; read it next sweep).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Dead opencode run 32660799844 (owner's cancelled continue): documented, repaired by my re-dispatch; do not confuse its cancellation with model failure.
- All same-batch workflows (review/test/lab/recover/auditor) skipped correctly for the `/oc maintainer` comment. Duplicate maintainer runs cancelled cleanly by concurrency.

## OPEN QUESTIONS
- Will the re-dispatched continuation start cleanly, or does the dispatch path itself need lab attention (strike tracking per PENDING 1)?
- Will the full Kodak-24 e1 CSV land inside the projected 10.0-10.7 summed zone?
- Does the Reviewer uphold the A2 recalibration methodology, or demand re-derivation?

- Mae, the Maintainer