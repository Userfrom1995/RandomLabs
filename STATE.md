# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32730292781, woken by owner ping 13:01:41Z seconds after the D3 dispatch died ~108s in to a transient provider stream error, run 32730117593). ONE clean retry fired per the downgrade ladder; tripwire armed; zero other triggers.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. No parity claim exists; e1 truth (~10.2904 / 3.4301) is ~19 percent above JXL parity.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (ls-remote this run). Main still serves the OLD pin `x-preview-f-free`; provider stream strikes remain bursty (latest: ~13:01Z window killed the D3 dispatch) but every session between strikes completes clean - including THIS one.
- **PR #134** (`opencode/issue70-20260824084626`, head `c6adb5a6d4`, MERGEABLE, DRAFT): two-knob model switch to `deepseek-v4-flash-free` (13 pins + opencode.json `model`; `small_model` stays `mimo-v2.5-free`). Review lineage complete and clean (finding resolved, rounds approved-as-is); progression owner-frozen. NOTHING to do until owner acts.
- **PR #131** (`opencode/issue130-20260823163248`, MERGEABLE/CLEAN, head `ca5ce5e53ddda6534b81a0d8d853bf30be746f14` unchanged since 12:49:02Z): D-series so far: re-scope DONE (D0-D4 plan, I7 harness invariant), D0 DONE (committed bench-ideal harness + probe_ideal.sh; MATERIAL FINDING: old A2 oracle aggregates nonreproducible + information-theoretically impossible, magnitudes RETRACTED with decision record), D1 DONE (adaptive blended prediction REJECTED offline, +0.25 pct WORSE than MED), D2 DONE (K=4 mixer + SSE REJECTED offline, -0.90 pct aggregate vs >= 3 gate; key negative: ~7-point static headroom is ML-fit-with-future-information, unreachable causally). Both re-scope levers closed by measurement. Mae verdict recorded last sweep: #130 CONTINUES through the D-series; D3 checkpoint dispatched.

## IN FLIGHT
- RETRIED Builder continuation on #131 (D3 measurement checkpoint) - trigger posted via hardcoded step from this run's decision list. Mandate: fresh bench at all efforts, sha256 pins verified first, durable CSVs, bench_gate BOTH units, tracker update, ZERO format work. NEXT RUN reads its outcome FIRST.
- Strike ledger for the D3 phase: strike 1 = run 32730117593 (~108s death, zero side effects). Same-error death on the retry => LAB escalation with run-ID chain immediately; no third blind fire.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (C-series + D-series rescope) -> build IN PROGRESS: D0 DONE, D1 DONE (offline rejection), D2 DONE (offline rejection), D3 DISPATCHED-RETRY (dual-unit measurement checkpoint) -> REVIEW ROUND 2 takes the D3 stable handoff boundary (automatic-first; manual fire ONLY if demonstrably failed; crash-parity guard armed; checklist MUST add: A2-magnitude-retraction record scrutiny, I7 harness citability of every number, D1/D2 rejection chains + G-anchor invariants, mixer library mirrors stretch/squash/APM, spec addendum 12 consistency, standing dual-unit/self-check/decoder-mirrors-bits-3-6/topology-b50935ae2 items) -> then gated D4 items (zero-run mode first, one honest extended-mixer-bank test, reversible color rotations; squeeze-under-mixer stays dead) -> BINDING formal owner stop-and-decide if M3 still open after exhaustion -> freeze blocks any merge until dual-unit M2 AND M3 genuinely pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read the retried D3 continuation outcome on #131 (posted COMMENT plus JOB LOG, never green status alone; paginate full comment timeline). Clean handoff => verify automatic review round 2 fired within a reasonable window; manual fire only if demonstrably failed. Same-error death => LAB escalation with run-ID chain (32730117593 + the retry's run ID); error class differs => inspect first, then decide.
2. If D3 confirms e1 unchanged at 10.2904/3.4301 (expected yes; no format bytes spent since C3), review round 2 proceeds against the stable head; D4 stays gated behind its per-item offline bars.
3. #134: NO action of any kind while the owner hold stands. On release: automatic-first review => approve-test => merge `--rebase --delete-branch` with fresh-object orphan check => verify main > `9bb40298b` => pages check => falsification watch on the new pin (same strike signature post-switch kills pin-instability theory => retry-parity ask).
4. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Eventual #131 merge preconditions: dual-unit pass + review approve + test approve + orphan check (server-side evidence says PASS; base f8a958d70e48).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - daily Auditor report current (01:16:33Z); board quiet since yesterday evening.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will D3's fresh both-units measure confirm e1 10.2904/3.4301 unchanged (expected: yes)?
- Will the zero-run mode clear its offline harness bar where blending and mixing failed? Last independent lever with a literature-grounded expectation.
- When will the owner release the #134 hold, and does the new pin change strike behavior?
- Will the owner rule early on honest closure vs stretch before D4 exhausts? Either answer is executable within one run.

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline over the whole window before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone (continue-on-error masking has fooled six checks across two days); topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until its root cause is fixed; ephemeral numbers are not evidence (I7).

- Mae, the Maintainer
