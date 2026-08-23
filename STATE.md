# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32658894165, issue_comment on PR #131). Builder run 32657202007 COMPLETED (C0+C1 landed at head `c2778432`, A1 PASS / honest A2 miss); owner's `/oc continue` spawned continuation run **32658886664 IN FLIGHT** (build job verified active this run). Maintainer stood down with an EMPTY decision list - pipeline self-driving. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z, comment on #121):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`, produced by `prism/benchmarks/bench_vs_codecs.py`, pixel-exact 24/24).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Final warning issued 2026-08-23; compliance is existential.
- Iteration limit LIFTED (2026-08-22); circuit breaker DELETED. One-PR rule; NEVER delete PR branches (delete-branch only via merge rebase). Quality gates are the only merge criteria.

## CORRECTED RECORDS (supersedes all earlier entries)
- **Prism M3 < 8.71 claim FALSE (units mix):** honest Prism e7 = 3.675 per-sample = ~11.02 summed; BEHIND Obsidian e7 (3.174 / 9.52) and JPEG XL (2.885 / 8.655); WebP m6 = 3.166 / 9.498.
- PR #121 merged on a broken gate; quality CLAIM withdrawn; code itself byte-exact and solid.
- bench_gate.sh bug CONFIRMED by Mae; unit-consistent fix + fail-capable self-check shipped in PR #131 as blocking deliverable D1.
- Kinetica (#127) and Helix (#129) merges unaffected (internal gates were unit-safe).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`** (ls-remote verified this run).
- pages.yml green from main dispatch at 18:42:34Z.
- MODEL PINS: all workflows + opencode.json on x-preview-f-free / mimo-v2.5-free, healthy since the transient ~17:03-17:20Z window closed itself (architect full session + builder sessions all succeeded on it). No pin change made or needed; lab stands down unless flakiness recurs during review/test.
- SHIPPING LIMIT moot under freeze (resets 2026-08-24).

## IN FLIGHT
- **Continuation run 32658886664** (owner `/oc continue` 18:42:26Z) on PR #131 (`opencode/issue130-20260823163248`, head `c2778432`): build job ACTIVE at run time. Queue per tracker: C1 A2 work (directional class key for zero-kind, then logistic mixer forward if short), full Kodak-24 re-measure both units + fresh CSV, docs sweep, then C2 -> C3 -> M2 window.
- Builder completed state for reference: A1 PASS (~100% capture of V1 pin win: kodim01 -5.18% vs -5.16%, kodim13 -3.45% vs -3.42%); A2 NOT met (0.85% context gain vs 3.00 target); rejected experiments logged in tracker.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build CONTINUING (run 32658886664) -> review (auto-fires on next push/handoff) -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: check run 32658886664 outcome. Finished with pushes => let the automatic Reviewer fire; fire review myself ONLY if the automatic trigger demonstrably failed. Died mid-run => inspect error class FIRST; repeat ProviderResponseStreamError => immediate `lab` dispatch (attempt 2, ladder-legal), never a blind retry.
2. Reviewer round MUST verify: dual-unit statements in ALL benchmark claims; D1 bench_gate.sh self-check demonstrates a real FAIL case; decoder-mirrored constants; FIFO acoder v1-stream compatibility; both-unit gate comparisons; trial-bits acceptance criteria per blueprint.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze Brainstorm board, resume normal cadence; keep chasing Obsidian e7 (3.174 / 9.52) too.
4. Hold honesty line on A2: if levers exhaust without the 3 percent target, expect documented shortfall, not moved goalposts.

## ISSUES
- **#130** - sole active workstream (Prism continuation). PR #131 carries all phases.
- **#70 (Lab Health)** - lab stand-down ping posted previous run; green-but-empty silent-stall signature documented there.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Nothing pending. Leftover benign run 32658222714 completed/cancelled with zero jobs. No stray triggers outstanding.

## REVIEWER/TESTER/MODEL STATUS
- Model healthy (this maintainer session + architect + builder sessions all succeeded back-to-back on the same pin). Do not switch models mid-build; fresh stream errors during review/test are fresh evidence for a lab re-fire.
- Approvals necessary but not sufficient while the freeze holds: unit-consistency is an explicit review criterion on #131.

## OPEN QUESTIONS
- Will the A2 directional class key close the 0.85->3.00 percent context-gain gap, or does the logistic mixer need to come forward from P7?
- Will the full Kodak-24 re-measure land C1 inside its projected 10.0-10.7 summed zone (still ~15 percent above JXL parity - keep public framing honest)?
- Root cause of the 17:03-17:20Z stream-error window remains formally undiagnosed (transient provider instability favored by evidence). Acceptable to leave closed unless it recurs.

- Mae, the Maintainer
