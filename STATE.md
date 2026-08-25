# STATE - Random factory checkpoint
 - **Updated:** 2026-08-25 (~22:31Z, maintainer run 32906575013 - S-series S1 build continuation at 304da8c)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) Still active for Prism v2 S-series.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect for overall Prism project (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145):** Owner acknowledges V1 STOP, authorizes pivot; instructs Architect to re-engage and design source-side-only pivot (or any architecture deemed necessary). V2/V3/V4 reopened as S-series under new blueprint with fresh pre-registered gates.
- **NEW STANDING ORDER - AUTONOMOUS PIVOT (2026-08-25T21:53:15Z, on #145):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 vs JPEG XL/WebP/PNG, dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), merged #144/#139 via PAT.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 22:31Z). 82 commits from PR #131 now on main (ledger at 14bd9e6). PAT sweep live.
- **Model:** openrouter/muse-spark-1.2-contributor-free active for Prism v2 S-series.

## IN FLIGHT
- **PR #145** - OPEN head `304da8ceb3873027ef9033cda5c802886be3c674` (`opencode/issue130-20260825153143`, 25 commits, base 14bd9e6c, MERGEABLE/CLEAN, merge_base 14bd9e6c). Deliverables: research v2 clean-slate (B1-B5, L-C1..9/R-1..4, I11, V-series), V-series blueprint + addendum 17/18 (V1 FAIL STOP), V0/V1 complete with dated CSVs, S-series blueprint (`architecture-jxl-parity-sourcepivot.md`) + spec addendum 19 (FRAME-A/FRAME-S dual-frame controls, all S-gates pre-registered, zero container until S4 PASS), Builder S1 pins P-S1-1..11 + amendment A4 (GAP gradient repair dh/|W-WW| dv/|N-NN|) + predictor families GAP (amended) + W ensemble causal replay with 5 unit tests. Pending: bench-sandbox --s1 dual-frame sweep extension, six VB rails re-green, dated s1 CSV, verdicts vs S1 gate >=+1.5 RELPCT median FRAME-S. Zero container bytes throughout.
- **Issue #130** - OPEN, Prism v2 S-series in progress (S1 predictor slice). V1 ledger on main at 14bd9e6c (e1 10.1210/3.3737, M2/M3 FAIL both units). S-pivot authorized, architect delivered, Builder S1 continuation dispatched this run.

## PIPELINE POSITION
Research (v2 clean-slate DONE 15:44Z dd55a34/7a6d6dc) -> Architect V-series (DONE 15:59Z dcc2b31/2898ae2/464b2dc) -> Builder V0 (COMPLETE 20:05Z 13f73dd, 6 VB rails PASS) -> V1 pins fb9b8e7 -> V1 sweep COMPLETE 21:39Z 3bc11dd (V1a PASS +74.60 / V1b FAIL +5.81 vs +37.30 => STOP, B1 closed) -> OWNER PIVOT 21:53Z authorized -> Architect S-pivot (DONE, addendum 19 + sourcepivot blueprint + tracker S-series) -> Builder S1 P1 pins + GAP/W families at 304da8c (22:19Z) -> **Builder S1 sweep pending (this run dispatches continue at 304da8c)** -> S2 canary (conditional) -> S3 properties -> S4 composition threshold.

## NEXT-RUN PLAYBOOK
1. Builder S1 slice dispatched via continue at 304da8c - watch `gh api pulls/145 --jq .head.sha` advance past 304da8c with bench-sandbox --s1 dual-frame rows, VB rails green, dated CSV `2026-08-25-s1-*.csv`, gate readout; do NOT dispatch second build/continue until it lands; watch `gh run list` for opencode in_progress on PR head.
2. If S1 PASS (median >=+1.5 RELPCT FRAME-S), next is S2 canary; if FAIL => MED ships, B3 closed-with-numbers per tracker, proceed to S3. Respect pins-before-measurement (A4 already committed), I10/I12 accounting, zero container until S4 PASS.
3. Verify live each run: `gh api pulls/145 --jq .mergeable` true, `git ls-remote origin main` == 14bd9e6c, issue #130 OPEN, PAT 442 live.
4. No review/test - blocked until S4 threshold (<9.35/<3.117 projected) then fresh format-program blueprint; no lab/auditor/recover/ideate (PAT live, board frozen, PR open/CLEAN).

## ISSUES
- **#130** - Prism M2/M3 continuation - Prism v2 S-series active (S1 predictors, dual-frame, FRAME-S gating).
- **#145** - OPEN 304da8c 25 commits, MERGEABLE/CLEAN, S-pivot blueprint + S1 families landed, sweep pending.
- **#70** - Lab Health & Audit Logs (universal audit).
- **#42** - Brainstorm Board FROZEN by owner directive.

## OPEN QUESTIONS
- Will bench-sandbox --s1 dual-frame sweep show GAP/W >=1.5 median FRAME-S vs MED on pinned quad, or will B3 close with MED retained?
- Will S2 one-shot bias canary open, and will property list P_ext in S3 beat flat-16?
- Will S4 composition project inside M3 reach?

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
