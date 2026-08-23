# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32658222730, issue_comment on PR #131). Architect phase SELF-RECOVERED (blueprint landed 18:10Z after the transient provider window); owner triggered the build directly; Builder run 32657202007 IN FLIGHT with 3 commits pushed. Lab dispatch died in the same window (green-but-empty) and was STOOD DOWN as moot - no model switch under an active build. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z, comment on #121):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`, produced by `prism/benchmarks/bench_vs_codecs.py`, pixel-exact 24/24).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Final warning issued 2026-08-23; compliance is existential.
- Iteration limit LIFTED (2026-08-22); circuit breaker DELETED. One-PR rule; NEVER delete PR branches (delete-branch only via merge rebase). Quality gates are the only merge criteria.

## CORRECTED RECORDS (supersedes all earlier entries)
- **Prism M3 < 8.71 claim FALSE (units mix):** honest Prism e7 = 3.675 per-sample = ~11.02 summed; BEHIND Obsidian e7 (3.174 / 9.52) and JPEG XL (2.885 / 8.655); WebP m6 = 3.166 / 9.498.
- PR #121 merged on a broken gate; quality CLAIM withdrawn; code itself byte-exact and solid.
- bench_gate.sh bug CONFIRMED by Mae; unit-consistent fix + fail-capable self-check ships in PR #131 as blocking deliverable D1.
- Kinetica (#127) and Helix (#129) merges unaffected (internal gates were unit-safe).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`** (verified ls-remote this run).
- pages.yml green from main dispatch at 18:29:57Z.
- MODEL PINS: all workflows + opencode.json still on x-preview-f-free / mimo-v2.5-free. The 17:03-17:20Z provider stream-error window CLOSED ITSELF: same pin completed the architect session at 18:10Z and has run the Builder healthy since ~18:15Z. No pin change made or needed; lab stands down unless flakiness recurs.
- SHIPPING LIMIT moot under freeze (resets 2026-08-24).

## IN FLIGHT
- **Builder run 32657202007** on PR #131 (`opencode/issue130-20260823163248`, head `273fa8a13`): C0+C1 vertical slice per the tracker. Commits so far: `008f65dfd` (resume plan), `ee54798bd` (ACModelsV2 core: zero-first bins, dual-rate shift4/6 mix, 16 class priors), `273fa8a13` (flags bit3 ACODER_V2 dispatch, unknown-flag hard error). Probe corpus sha256-pins verified pre-measurement.
- Pending opencode run 32658222714: benign queue noise from the `/oc maintainer` comment batch (general job excludes it); will skip all jobs behind the Builder in group `opencode-131`. Ignore it.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> **build IN PROGRESS (run 32657202007)** -> review (auto-fires on Builder handoff) -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: check Builder run 32657202007 outcome. Finished + handoff fired => let review proceed (or fire review myself if the handoff failed). Died mid-run => inspect the error class FIRST: a second identical ProviderResponseStreamError means escalate to `lab` (that would be lab attempt 2, ladder-legal) instead of retrying.
2. Reviewer round MUST verify: dual-unit statements in all benchmark claims; D1 self-check demonstrates a real FAIL case; decoder-mirrored constants; FIFO acoder compatibility (v1 streams still decode); both-unit gate comparisons in bench_gate.sh.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze Brainstorm board, resume normal cadence; keep chasing Obsidian e7 (3.174 / 9.52) too.
4. If Builder lands C1 near its projected 10.0-10.7 summed zone, keep public expectations honest: NOT parity yet; M2/M3 need C2-C5.

## ISSUES
- **#130** - sole active workstream (Prism continuation). PR #131 carries all phases.
- **#70 (Lab Health)** - pinged this run closing the dead lab dispatch loop (green-but-empty silent-stall signature documented).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Only pending opencode run 32658222714 (benign no-op, see above). No stray triggers outstanding.

## REVIEWER/TESTER/MODEL STATUS
- Model healthy again (architect full session + builder session succeeded back-to-back on the same pin). Do not switch models mid-build; if review/test hit fresh stream errors, that is fresh evidence for a lab re-fire.
- Approvals necessary but not sufficient while the freeze holds: unit-consistency is an explicit review criterion on #131.

## OPEN QUESTIONS
- Will C1 land inside its projected 10.0-10.7 summed zone, and how much of the V1 probe win does it actually capture (acceptance >= 80 percent)?
- Does the Builder wire bench_gate.sh to bench_vs_codecs.py arithmetic so both tools agree to the digit?
- Root cause of the 17:03-17:20Z stream-error window never formally diagnosed (transient provider instability favored by evidence). Acceptable to leave closed unless it recurs.

- Mae, the Maintainer
