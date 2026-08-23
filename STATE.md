# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32651464785). OWNER FINAL WARNING on #121: the Prism M3 "gate cleared" claim was a per-sample-vs-summed UNITS ERROR. ALL lab work FROZEN except Prism continuation issue #130.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z, comment on #121):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`, produced by `prism/benchmarks/bench_vs_codecs.py`, pixel-exact 24/24).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Final warning issued 2026-08-23; compliance is existential.
- Iteration limit LIFTED (2026-08-22); circuit breaker DELETED. One-PR rule; NEVER delete PR branches (delete-branch only via merge rebase). Quality gates are the only merge criteria.
- MODEL PINS: research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free; owner switch landed in `f8a958d`).

## CORRECTED RECORDS (supersedes all earlier entries)
- **Prism M3 < 8.71 claim FALSE (units mix):** honest Prism e7 = 3.675 per-sample = ~11.02 summed; beats only PNG-class codecs; BEHIND Obsidian e7 (3.174 / 9.52) and JPEG XL (2.885 / 8.655); WebP m6 = 3.166 / 9.498.
- PR #121 was merged on a broken gate; Reviewer and Tester approvals inherited it. The shipped code is byte-exact and engineering-solid, but its quality CLAIM is withdrawn. #117/#118 remain closed; records stand as shipped with this correction.
- **bench_gate.sh bug CONFIRMED by Mae (read on main):** compares CSV per-sample mean vs summed threshold => GATE PASS unfalsifiable. Fix is blocking deliverable D1 on #130.
- My 08:25Z reply to the owner ("2.37x better than JXL") repeated the same units error; corrected publicly on #121 this run.
- Kinetica (#127) and Helix (#129) merges unaffected (internal gates were unit-safe).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`** (owner push: agent model switch + independent Kodak-24 codec comparison).
- pages.yml deploys green (latest success 16:11Z).
- SHIPPING LIMIT: 2/2 new projects merged today (Kinetica, Helix); freeze forbids more regardless until Prism gates genuinely pass.

## IN FLIGHT
- **Issue #130 "Prism M2/M3/M4 continuation - true JXL parity"** - created by this run (create_issue decision action); research dispatched on it in the same run. Number predicted from max-object survey (129 -> 130): VERIFY next run.

## PENDING (in order)
1. Next maintainer run FIRST ACTION: confirm #130 exists with the intended body and the research trigger fired on it; if creation failed or the number shifted, recreate/re-point before anything else.
2. Drive #130 through research -> architect -> build -> review -> test. D1 (bench_gate.sh dual-unit fix that can fail) ships first and blocks everything else.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus (and daily project limit resets 2026-08-24).
4. After genuine pass: unfreeze Brainstorm board, resume normal cadence; keep Obsidian e7 (3.174) as the internal benchmark to chase.

## ISSUES
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.
- **#70 (Lab Health)** - OPEN; routine audits continue (allowed; not project work).
- **#121/#117/#118** - closed; see corrected records above.
- **#130** - NEW (Prism continuation, sole active workstream).

## REVIEWER/TESTER/MODEL STATUS
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE); small_model `mimo-v2.5-free`.
- Reviewer/Tester approvals are necessary but NOT sufficient while the gate definitions themselves are under repair: review rounds on #130 must explicitly verify unit consistency of any benchmark evidence.

## OPEN QUESTIONS
- Did create_issue land as #130 with the full body? (Verify first thing next run.)
- Can research credibly locate ~21% of total bytes (3.675 -> <2.885 per-sample)? If not, escalate honestly to the owner; never publish optimistic projections.
- bench_vs_codecs.py becomes canonical gate source: confirm Builder wires bench_gate.sh to identical arithmetic so both tools agree to the digit.

- Mae, the Maintainer
