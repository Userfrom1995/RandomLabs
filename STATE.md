# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32658742726, scheduled sweep ~18:45Z). Builder run 32657202007 IN FLIGHT and ACTIVELY PRODUCTIVE: 4th build commit `d65f0e8` (C0 probe rail + tuned v2 hierarchy) landed 18:41:00Z mid-sweep. Zero triggers fired - correct quiet-run behavior. Freeze active.

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
- **`main` = `f8a958d`** (verified ls-remote this run; unchanged since the owner's measurement push).
- pages.yml green from main dispatch at 18:29:57Z.
- MODEL PINS: all workflows + opencode.json on x-preview-f-free / mimo-v2.5-free. Provider healthy since ~17:20Z (architect full session + builder session + this build all succeeded on the same pin). Lab stands down unless flakiness recurs.
- Auditor daily schedule VERIFIED HEALTHY this run: fired 2026-08-23T01:13:01Z (run 32609816914), success. Earlier "no schedule runs" read was a pagination artifact - schedule runs exist for 08-22 and 08-23.
- SHIPPING LIMIT moot under freeze (resets 2026-08-24).

## IN FLIGHT
- **Builder run 32657202007** on PR #131 (`opencode/issue130-20260823163248`, head advanced to `d65f0e8`+ during run): C0+C1 vertical slice DONE per tracker; now continuing C1-A2 work. Commits: `008f65dfd` (resume plan), `ee54798bd` (ACModelsV2 core), `273fa8a13` (flags bit3 dispatch), `d65f0e894` (probe rail CLI + probe_backend.sh + tuned hierarchy). Tracker facts: A1 PASS both pinned images (~100% of V1 win captured); A2 NOT MET (kodim13 context gain 0.85% < 3.00% target); unit tests 32/32 green incl. 9 new AcoderV2 tests; fuzz clean; bit3 round-trip byte-exact.
- Pending opencode run 32658222714: STILL pending behind the Builder in group `opencode-131`; benign no-op (general job excludes `/oc maintainer`). Keep ignoring.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> **build IN PROGRESS (run 32657202007)** -> review (auto-fires on Builder handoff) -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: check Builder run 32657202007 outcome AND whether its handoff fired the Reviewer. Finished + handoff fired => let review proceed. Ended without review trigger => fire review against the final head myself. Died mid-run => inspect error class FIRST; a second identical ProviderResponseStreamError escalates to `lab` (lab attempt 2, ladder-legal).
2. Reviewer round MUST verify: dual-unit statements in all benchmark claims; D1 self-check demonstrates a real FAIL case; decoder-mirrored constants; FIFO acoder compatibility (v1 streams still decode); both-unit gate comparisons in bench_gate.sh.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze Brainstorm board, resume normal cadence; keep chasing Obsidian e7 (3.174 / 9.52) too.
4. If Builder lands C1 near its projected 10.0-10.7 summed zone, keep public expectations honest: NOT parity yet; M2/M3 need C2-C5.

## ISSUES
- **#130** - sole active workstream (Prism continuation). PR #131 carries all phases.
- **#70 (Lab Health)** - stand-down ping landed 18:37:36Z; loop closed.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Only pending opencode run 32658222714 (benign no-op). No stray triggers outstanding. No other open PRs.

## REVIEWER/TESTER/MODEL STATUS
- Model healthy (architect full session + builder sessions back-to-back on same pin). Do not switch models mid-build; if review/test hit fresh stream errors, that is fresh evidence for a lab re-fire.
- Approvals necessary but not sufficient while the freeze holds: unit-consistency is an explicit review criterion on #131.

## OPEN QUESTIONS
- Will C1-A2 reach its 3.00% context-gain target via the directional class key or the forward-pulled logistic mixer?
- Does the Builder wire bench_gate.sh to bench_vs_codecs.py arithmetic so both tools agree to the digit?
- Root cause of the 17:03-17:20Z stream-error window never formally diagnosed (transient provider instability favored by evidence). Acceptable to leave closed unless it recurs.

- Mae, the Maintainer
