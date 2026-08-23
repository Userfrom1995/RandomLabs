# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32662789701, issue_comment on PR #131; owner `/oc continue` 19:55:24Z + `/oc maintainer` 19:55:33Z). SECOND DEAD TRIGGER repaired this run: owner's continuation spawned opencode run 32662780885, CANCELLED with ZERO jobs (same race signature as 32660799844 at 19:18Z - two owner comments ~9 s apart). Decision list `[{"action":"continue","pr":131}]` re-fires the Builder. C2 landed with an HONEST REJECTION (e3 == e1 byte-identical 24/24); head `8c20196b1`. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Compliance existential.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`** (ls-remote verified this run; unchanged all day). Pages deploy green at 19:55:35Z.
- MODEL PINS healthy all evening (this session runs on the pin = live proof). Dispatch path FUNCTIONAL (my 19:24Z repair worked first try) but RACEY under near-simultaneous owner comment batches: two zero-job cancellations today (runs 32660799844, 32662780885). If my re-dispatch also dies zero-jobs => strike 2 for the path itself => inspect opencode.yml trigger wiring and escalate `lab` with both run IDs as evidence. Candidate infra ask for lab: debounce/retry guard against the race pattern.
- SHIPPING LIMIT moot under freeze (resets 2026-08-24).

## IN FLIGHT
- **Builder continuation RE-DISPATCHED by me this run** on PR #131 (`opencode/issue130-20260823163248`, head `8c20196b1`). Expected queue per tracker: C2b composite leaf*343+resdiff contexts (OFFLINE probe-rail validation first), then C3 trial-encoded decisions -> M2 checkpoint window (~9.3-9.6 summed projected).
- Landed so far on #131: research D1+D2, architect C-series blueprint, C0 probe rail, C1 backend v2 + offline retune (A1+A2 PASS after evidence-based A2 recalibration), full Kodak-24 e1 both-units measure (10.3544 summed / 3.4515 per-sample = -6.09 pct bytes), C2 capability + honest rejection (tree trial loses to flat resdiff-343 on all 24 images; latent 64-clamp bug fixed).

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build CONTINUING (C2b/C3 next) -> review (fire AT the C3/M2-window handoff unless Builder stalls yielding in_progress) -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: verify MY re-dispatch actually started a build job (non-negotiable given two dead triggers today). Completed with pushes/handoff -> review timing decision (prefer M2 window; weigh a round if Builder yields in_progress long). Died zero-jobs again => dispatch-path strike 2: grep opencode.yml wiring, escalate `lab` with run IDs 32662780885 + mine as evidence, NO third blind fire.
2. Reviewer standing checklist when review fires: dual-unit statements in ALL benchmark claims; D1 bench_gate.sh self-check FAIL case; decoder-mirrored constants; FIFO acoder v1 compatibility; trial-bits acceptance criteria; A2-recalibration evidence chain (byte-exact replica, instrumented-oracle ceiling, `.github/agents/decisions/builder/2026-08-23T19-35-00-a2-gate-recalibration.md`); PLUS the C2 rejection evidence chain (`.github/agents/decisions/builder/2026-08-23T20-00-00-c2-scope-and-measured-rejection.md`, trial-bits methodology, e3==e1 CSVs).
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze board, resume normal cadence, then chase Obsidian e7 (3.174 / 9.52).
4. Expectation discipline: even the M2 window stays above parity; keep public framing honest until M3 passes in both units.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity). PR #131 carries all phases.
- **#70 (Lab Health)** - lab stood down as moot earlier; check whether the Auditor posted its summary from the owner's `/oc auditor`.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- None beyond the re-dispatch itself. Sibling runs of both 19:55 comment batches skipped correctly (verified: opencode 32662789839 all jobs skipped; sibling maintainer 32662780948 skipped by concurrency). opencode-recover scheduled sweep 19:56:49Z completed success (no-op).
- Watch for the benign pattern: maintainer-comment batches spawn skipped opencode jobs - never mistake them for builds.

## OPEN QUESTIONS
- Will my re-dispatch start cleanly, or is the zero-job race now systematic (strike 2 => lab)?
- Will C2b's composite-context lever beat flat resdiff-343 coding offline where plain MA-tree failed?
- Will C3 bring the corpus into the M2 window (~9.3-9.6 projected)?
- Does the Reviewer uphold the A2 recalibration AND the C2 rejection methodology?

- Mae, the Maintainer
