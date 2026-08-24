# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32729217942, woken by the owner's double ping 12:50:00Z + 12:50:09Z on PR #131). DECISION POINT RESOLVED by Mae verdict: #130 CONTINUES through the D-series (D3 checkpoint dispatched); PR #134 parked as draft per explicit owner hold; zero other triggers.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. No parity claim exists; e1 truth (~10.2904 / 3.4301) is ~19 percent above JXL parity.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Verified isDraft=true this run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (ls-remote this run). Main still serves the OLD pin `x-preview-f-free`; provider stream strikes remain bursty (three today: ~11:59Z, ~12:07Z, ~12:09Z windows) but every session since 12:12Z completed clean. The switch stays parked in draft #134.
- **PR #134** (`opencode/issue70-20260824084626`, head `c6adb5a6d4`, MERGEABLE, DRAFT): two-knob model switch to `deepseek-v4-flash-free` (13 pins + opencode.json `model`; `small_model` stays `mimo-v2.5-free`). Lineage complete: Lab Engineer fixed the round-1/2 blocking finding at 12:05:41Z (body now `Refs #70`, verified via API readback; empty commit `c6adb5a`). Review round 3 (after two APIError deaths at 12:07:34Z and 12:09:29Z) delivered 12:12:23-35Z: technically clean, all pins re-verified, finding resolved - but progression owner-frozen; reviewer routed to maintainer for parking only. The 12:14:19Z maintainer successor died to APIError (run 32725878132); THIS run absorbed its parking job. NOTHING to do until owner acts.
- **PR #131** (`opencode/issue130-20260823163248`, MERGEABLE, head `ca5ce5e53ddda6534b81a0d8d853bf30be746f14`): Builder run 32724563242 completed cleanly 12:49:33-54Z. D-series so far: D0 DONE (committed bench-ideal harness + probe_ideal.sh rail, invariant I7; MATERIAL FINDING: old A2 oracle aggregates nonreproducible + information-theoretically impossible, magnitudes RETRACTED with decision record, harness-citable replacements pinned). D1 DONE (adaptive blended prediction REJECTED offline per STOP rule: best case +0.25 pct WORSE than MED; zero format work). D2 DONE (K=4 logistic mixer + SSE REJECTED offline: best candidate -0.90 pct aggregate vs >= 3 gate, FAIL 3.3x; SSE harmful in every keying/rate; G-anchor fidelity -0.04 pct worst; key negative: the ~7-point static collection headroom is an ML-fit-with-future-information figure, unreachable by causal estimators). Both re-scope levers L1+L2 closed by measurement. Handoff `{"action":"maintainer"}` surfaced the section-1 decision point; tracker says "Next step: OWNER DECISION POINT... owner/Mae verdict".

## MAE VERDICT ON THE DECISION POINT (this run)
- #130 NOT closed. Rationale: freeze directive (single priority until gates pass), perseverance policy, closure of this size is the OWNER's call alone, and the evidence base for closure is not yet complete (no fresh D3 both-units numbers, no review round over D0-D2).
- Honest downside stated publicly: M2 plausible-pass projection collapsed with D2's failure; even full stretch stack likely leaves M3 open (~16 pct gap vs 1-3 pct items). When D-series exhausts with M3 open, the FORMAL stop-and-decide returns to the owner with final numbers. Owner may override with honest closure anytime.
- Dispatched: Builder continuation for **D3 checkpoint** = fresh bench --kodak at all efforts, sha pins verified first, durable CSVs, bench_gate in BOTH units, tracker update. Measurement only; zero format work authorized without new harness evidence.
- D4 pre-authorized IN PRINCIPLE behind per-item offline gates after review round 2: zero-run mode first (independent lever; 28.2 pct zeros kodim01; 1-3 pct projected), then ONE honest extended-mixer-bank test (expectations constrained), then reversible color rotations (<= 1 pct). Squeeze-under-mixer dead unless mixer revives. No silent scope creep.

## IN FLIGHT
- Builder continuation on #131 (D3 checkpoint) - trigger posted via hardcoded step from this run's decision list; NEXT RUN reads its outcome FIRST.
- Queued sibling maintainer run 32729232385 (owner duplicate ping 12:50:09Z) - expected quiet stand-down behind this run.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (C-series + D-series rescope) -> build IN PROGRESS: D0 DONE, D1 DONE (offline rejection), D2 DONE (offline rejection), D3 DISPATCHED (dual-unit checkpoint) -> REVIEW ROUND 2 takes the D3 stable handoff boundary (automatic-first; manual fire ONLY if demonstrably failed; crash-parity guard armed; checklist MUST add: A2-magnitude-retraction record scrutiny, I7 harness citability of every number, D1/D2 rejection chains + G-anchor invariants, mixer library mirrors/stretch/squash/APM, spec addendum 12 consistency, standing dual-unit/self-check/decoder-mirror/topology items) -> then gated D4 items -> BINDING formal owner stop-and-decide if M3 still open after exhaustion -> freeze blocks any merge until dual-unit M2 AND M3 genuinely pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read the D3 continuation outcome on #131 (comment thread + commits API, never green status alone). Clean handoff => verify automatic review round 2 fired within a reasonable window; manual fire only if demonstrably failed. Died => error-class inspection BEFORE any retry; one same-error retry max (strike chain grows), then lab escalation with run IDs.
2. #134: NO action of any kind while the owner hold stands. If the owner releases: verify ready-for-review state, let review fire automatic-first, approve-test => merge `--rebase --delete-branch` with fresh-object orphan check first => verify main advances past `9bb40298b` => pages deploy check => falsification watch on the new pin begins (same strike signature on new pin => retry-parity ask to lab).
3. Watch sibling 32729232385 stand down quietly.
4. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Eventual #131 merge preconditions: dual-unit pass + review approve + test approve + orphan check (server-side evidence says PASS; base f8a958d70e48).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - daily Auditor report current; board quiet thread-side.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.
- **#132** - resolved earlier (crash-parity guard shipped via #133).

## OPEN QUESTIONS
- Will D3's fresh both-units measure confirm e1 10.2904/3.4301 unchanged (expected: yes; no format bytes spent since C3)?
- Will the zero-run mode clear its offline harness bar where blending and mixing failed? It is the last independent lever with a literature-grounded expectation.
- When will the owner release the #134 hold, and does the new pin change strike behavior? Same signature post-switch kills the pin-instability theory.
- Will the owner rule early on honest closure vs stretch before D4 exhausts? Either answer is executable within one run.

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the full comment timeline over the whole window before declaring any gate silent (two fooled checks trace to partial-window/wrong-surface surveys).
- Read COMMENT plus JOB LOG, never green status alone; topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until root cause fixed; ephemeral numbers are not evidence (I7).

- Mae, the Maintainer
