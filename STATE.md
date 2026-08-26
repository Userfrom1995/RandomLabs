# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~07:13Z, maintainer run 32941684477 - issue_comment on #145 duplicate pivot at 07:12:57Z handled, research in_progress on #130 at 06:59:53Z, main 14bd9e6c LIVE)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) Still active for Prism v2 S-series and next family.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect for overall Prism project (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145):** Owner acknowledges V1 STOP, authorizes pivot; instructs Architect to re-engage and design source-side-only pivot (or any architecture deemed necessary). V2/V3/V4 reopened as S-series under new blueprint with fresh pre-registered gates. **Re-affirmed 2026-08-26T07:12:57Z duplicate on #145 - already recorded, no new dispatch.**
- **NEW STANDING ORDER - AUTONOMOUS PIVOT (2026-08-25T21:53:15Z, on #145, re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 vs JPEG XL/WebP/PNG, dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified 07:13Z via contents API and confirmed live at 14bd9e6c. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 07:13Z, PAT sweep 442 live, 632 lines). Contents API confirms no `workflows:` permission trick - PAT path is canonical.
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins, zero CreditsError in this window (last transient Endpoint unavailable 2026-08-25T17:05Z resolved via one retry).

## IN FLIGHT
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind via compare API, base 14bd9e6c, MERGEABLE/CLEAN, merge_base 14bd9e6c shared). Deliverables: research v2 clean-slate (B1 5.81 realistic, B2 -8.09, B3 -1.45, B4 ~1.5 inside composition, B5 demoted, ledger L-C/R + V-program), V-series blueprint + S-series blueprint (FRAME-A/FRAME-S dual-frame controls, all S-gates pre-registered, P_ext frozen=NONE, zero container until S4 PASS threshold <9.35/<3.117), Builder S1 P1 COMPLETE at 91e5410 (S1 FAIL -1.45 vs +1.50 MED ships B3 closed), Builder S3 P2 COMPLETE at 4bbf4c0 (S3 FAIL -8.09 vs +1.50 flat-16 ships B2 closed), Builder S4 P3 COMPLETE at 7600377 (pins P-S4-1..12 BEFORE measurement, composition driver `bench-sandbox --s4` + probe_sandbox --s4 rails + verbatim-18.5 projection + failable self-check, dated CSV `prism/benchmarks/results/2026-08-25-sandbox-s4.csv` 104 rows, 6 VB rails re-green + determinism byte-identical, 128/128 tests, S4 VERDICT FAIL stop-and-report projected 9.5638/3.1879 vs 9.35/3.117, M2/M3 context FAIL, S5 NOT triggered 9.5638 > 8.8316 gateway, S-program measurement phases END, .agent/decision handoff = maintainer). Zero container bytes across entire V+S program by construction. Duplicate pivot at 07:12:57Z handled as already-recorded standing order - no new architect dispatch. PR #145 remains parked as ledger preservation (merge-blocked until dual-unit M2/M3 pass).
- **Issue #130** - OPEN, Prism v2 S-series COMPLETE with stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Ledger at main 14bd9e6c (e1 10.1210/3.3737 fails M2/M3 both units) + v2 measurements (B1 5.81 realistic, B3 -1.45, B2 -8.09, B4 ~1.5 inside composition) preserved on branch. **Next program RESEARCH IN_PROGRESS 06:59:53Z run 32940619741 on #130 (trigger Userfrom1995 /oc research at 06:59:50Z) under autonomous pivot for new architecture family** - awaiting Researcher conclusion (re-derive B1-B5 with I10/I12, fresh pins-before-measurement, zero-container-until-threshold, measurable gates before architect).
- **Duplicate pivot 07:12:57Z:** handled this run as standing-order re-affirmation, no dispatch; gates invariant re-confirmed.

## PIPELINE POSITION
Research (v2 clean-slate DONE) -> Architect S-pivot (DONE addendum 19 + sourcepivot blueprint) -> Builder S1 P1 COMPLETE 22:49Z 91e5410 (S1 FAIL) -> Builder S3 P2 COMPLETE 23:26Z 4bbf4c0 (S3 FAIL) -> **Builder S4 P3 COMPLETE 00:04Z 7600377 (S4 FAIL 9.5638/3.1879 vs 9.35/3.117 => stop-and-report, S5 NOT triggered, S-program measurement phases END)** -> parking at stop-and-report ledger (no review/test until fresh format-program blueprint after S4 PASS, never reached) -> **Auditor 01:11Z all-green + Maintainer 04:43Z/03:09Z quiet watches -> 06:32Z-06:41Z answered owner "why halt" (halt is binding STOP, not stall) -> 06:56Z dispatched fresh research on #130 under autonomous pivot -> 06:59:50Z owner /oc research -> research run 32940619741 in_progress at 06:59:53Z -> this run 07:13Z handled duplicate pivot 07:12:57Z (already-recorded standing order) with stand-down, research still in_progress.**

## NEXT-RUN PLAYBOOK
1. Verify active research: `gh run list --limit 10` should show `opencode` research run 32940619741 on #130 in_progress/completed after 06:59:53Z; `gh run view 32940619741 --log` for conclusion. `gh pr list --state open` still 145 at 7600377 MERGEABLE until research->architect->builder creates new commits/branch. `git ls-remote origin main` == 14bd9e6c, issue #130 OPEN, merge_base shared, PAT 442 live. Do NOT dispatch duplicate `research` while that run is in_progress (cancel-in-progress false queues sequential).
2. Verify live each run: `gh api pulls/145 --jq .head.sha` should stay at `7600377` until new program pushes; `gh api .../contents/prism/benchmarks/results/2026-08-25-sandbox-s4.csv?ref=7600377` 104 rows, `gh api .../contents/.agent/decision.json?ref=7600377` handoff maintainer, `progress/130-prism-true-jxl-parity.md` shows S4 COMPLETE STOP on branch.
3. Research outcome: expect Researcher to deliver new `prism/docs/research-*` with re-derived B1-B5, ledger L-C/R, invariants I10/I12, and gated prescriptions with pins-before-measurement. On success, next maintainer should dispatch `architect` (or respect Researcher's `{"action":"architect"}` handoff if via PR). Gates invariant (M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit vs real cjxl). Board frozen blocks ideate; do not dispatch ideate. If research fails with Endpoint/CreditsError, retry once then `lab` with run IDs (last transient 2026-08-25T17:05Z resolved via one retry).
4. Honesty: never claim S4 PASS or M2/M3 PASS until `bench_gate.sh` both units vs real cjxl proves it. Duplicate pivot handled - quiet watch holds unless new program evidence lands.

## ISSUES
- **#130** - Prism v2 S-series COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117, B1/B2/B3 closed, S5 closed, gates invariant) - **research in_progress 32940619741 at 06:59:53Z under autonomous pivot for new architecture family.**
- **#145** - OPEN 7600377 39 ahead, MERGEABLE/CLEAN, S4 COMPLETE FAIL stop-and-report, zero container bytes, merge-blocked until dual-unit M2/M3 pass - parked as ledger preservation (duplicate pivot 07:12:57Z handled as re-affirmation).
- **#70** - Lab Health & Audit Logs (universal audit) - current.
- **#42** - Brainstorm Board FROZEN by owner directive.

## OPEN QUESTIONS
- Will the Researcher (32940619741) produce a genuinely new family that can clear S4's ceiling (spine median +5.51 pct win left 0.21 summed gap, B1 5.81 / B2 -8.09 / B3 -1.45 all closed-with-numbers) with fresh prescriptions outside FRAME-A/FRAME-S and I10/I12 discipline?
- Should Prism's v2 ledger (B1 5.81 realistic, B2 -8.09, B3 -1.45, B4 ~1.5 inside composition) be merged as preservation-only (as PR #131 was) even though it does not meet M2/M3, or held as branch-only evidence?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.

 - Mae, the Maintainer
