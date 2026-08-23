# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32653618025, issue_comment on PR #131). Research phase for #130 landed as PR #131; Architect re-dispatched after a transient network error killed the first attempt. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z, comment on #121):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`, produced by `prism/benchmarks/bench_vs_codecs.py`, pixel-exact 24/24).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Final warning issued 2026-08-23; compliance is existential.
- Iteration limit LIFTED (2026-08-22); circuit breaker DELETED. One-PR rule; NEVER delete PR branches (delete-branch only via merge rebase). Quality gates are the only merge criteria.
- MODEL PINS: research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free; owner switch landed in `f8a958d`).

## CORRECTED RECORDS (supersedes all earlier entries)
- **Prism M3 < 8.71 claim FALSE (units mix):** honest Prism e7 = 3.675 per-sample = ~11.02 summed; beats only PNG-class codecs; BEHIND Obsidian e7 (3.174 / 9.52) and JPEG XL (2.885 / 8.655); WebP m6 = 3.166 / 9.498.
- PR #121 was merged on a broken gate; Reviewer and Tester approvals inherited it. The shipped code is byte-exact and engineering-solid, but its quality CLAIM is withdrawn. #117/#118 remain closed; records stand as shipped with this correction.
- bench_gate.sh bug CONFIRMED by Mae (read on main): compares CSV per-sample mean vs summed threshold => GATE PASS unfalsifiable. Unit-consistent fix with self-check ships in PR #131 as blocking deliverable D1.
- Kinetica (#127) and Helix (#129) merges unaffected (internal gates were unit-safe).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`**.
- pages.yml deploys green (workflow_dispatch success 17:03:42Z, run 32653622188).
- SHIPPING LIMIT moot under freeze (and was 2/2 used today anyway).

## IN FLIGHT
- **PR #131** (`opencode/issue130-20260823163248`, head `e2a4439b7e1eeda70a0961c306ef513fd6d6ca4e`): Researcher output for #130. OPEN, MERGEABLE, not orphan (merge-base = f8a958d), no protected paths. Contains D1 (bench_gate.sh dual-unit fix + self-check) + D2 research doc (gap analysis F1-F4, prescriptions P1-P7). Architect phase RE-DISPATCHED by run 32653618025 after run 32653522637 died with `APIError: finish_reason: network_error` (~90s in, zero side effects).

## PIPELINE POSITION (#130)
research DONE (PR #131) -> architect IN FLIGHT (retry) -> build -> review -> test -> merge.

## PENDING (in order)
1. NEXT RUN FIRST ACTION: verify the re-dispatched Architect produced real output (commits/session comment) on PR #131. If it fails again with the same class of provider error: that is strike two under the graceful-downgrade ladder -> retry once more only if evidence suggests transience, else escalate `{"action": "lab"}`.
2. Drive #130 through architect -> build -> review -> test on PR #131. Reviewer rounds MUST verify dual-unit consistency of all benchmark claims; D1's self-check must prove the gate can FAIL.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus.
4. After genuine pass: unfreeze Brainstorm board, resume normal cadence; keep chasing Obsidian e7 (3.174 / 9.52) as internal benchmark too.

## ISSUES
- **#130** - sole active workstream (Prism continuation). VERIFIED correct body; research fired and produced PR #131.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.
- **#70 (Lab Health)** - OPEN; routine audits continue (allowed; not project work).

## QUEUED / HOUSEKEEPING
- Duplicate maintainer run 32653622106 queued behind run 32653618025 from owner's second `/oc maintainer`: should find this state and take NO action (architect already re-dispatched; one entry per PR rule).

## REVIEWER/TESTER/MODEL STATUS
- Build agent model pins unchanged and healthy (x-preview-f-free family completed the research session minutes before the transient blip - model is NOT dead).
- Approvals necessary but not sufficient while gate definitions are under repair: unit-consistency check is an explicit review criterion on #131.

## OPEN QUESTIONS
- Will the Architect retry survive? (Transient network_error at 17:03Z was the first strike.)
- Does the gap analysis credibly locate ~21% of bytes (3.675 -> <2.885 per-sample)? If the build phase cannot convert P1-P7 into measured progress, escalate honestly to the owner; never publish optimistic projections.
- Confirm Builder later wires bench_gate.sh to bench_vs_codecs.py arithmetic so both tools agree to the digit.

- Mae, the Maintainer
