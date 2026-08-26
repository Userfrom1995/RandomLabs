# STATE - Random factory checkpoint
 - **Updated:** 2026-08-25 (~23:57Z, maintainer run 32913019791 - S4 structural code landed at a1ef279, builder in_progress, standing down on duplicate triggers)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) Still active for Prism v2 S-series.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect for overall Prism project (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145):** Owner acknowledges V1 STOP, authorizes pivot; instructs Architect to re-engage and design source-side-only pivot (or any architecture deemed necessary). V2/V3/V4 reopened as S-series under new blueprint with fresh pre-registered gates.
- **NEW STANDING ORDER - AUTONOMOUS PIVOT (2026-08-25T21:53:15Z, on #145):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 vs JPEG XL/WebP/PNG, dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), merged #144/#139 via PAT.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 23:57Z). 82 commits from PR #131 now on main (ledger at 14bd9e6). PAT sweep live.
- **Model:** openrouter/muse-spark-1.2-contributor-free active for Prism v2 S-series (small_model mimo-v2.5-free).

## IN FLIGHT
- **PR #145** - OPEN head `a1ef279e6a52ab516f2f864f57ab60e9ba07f9c6` (`opencode/issue130-20260825153143`, 38 commits, base 14bd9e6c, MERGEABLE/CLEAN, merge_base 14bd9e6c). Deliverables: research v2 clean-slate (B1-B5, L-C1..9/R-1..4, I11, V-series), V-series blueprint + addendum 17/18 (V1 FAIL STOP at 3bc11dd), V0 COMPLETE at 13f73dd (6 VB rails PASS + dated CSV), V1 sweep at 3bc11dd (V1a +74.60 PASS / V1b +5.81 FAIL vs +37.30 => STOP B1 closed), S-series blueprint (`architecture-jxl-parity-sourcepivot.md`) + spec addendum 19 (FRAME-A/FRAME-S dual-frame controls, all S-gates pre-registered, P_ext frozen tree features=NONE, zero container until S4 PASS threshold <9.35/<3.117), Builder S1 slice P1 COMPLETE at 91e5410 (pins P-S1-1..11 + amendments A4/A4b BEFORE measurement, predict.{h,cpp} MED/GAP/W 16.16 /512, 5 new tests 124/124 green, bench-sandbox --s1 dual-frame sweep 56 rows, 6 VB rails re-green + dated CSV `2026-08-25-sandbox-s1.csv`, S1 VERDICT FAIL -1.45 median vs +1.50 bar MED ships B3 closed R-2 resolved, S2 skipped), Builder S3 slice P2 COMPLETE at 4bbf4c0 (pins P-S3-1..12 BEFORE measurement, PropHasher KPROP decoder-mirror by construction, 4 new tests 128/128 green, bench-sandbox --s3 sweep 92 rows vs same-stack best-flat-16 fresh, 6 VB rails re-green + dated CSV `2026-08-25-sandbox-s3.csv`, S3 VERDICT FAIL -8.09 median SX-G k=64 vs +1.50 bar flat-16 ships B2 closed-with-numbers; B1/B3/B2 all closed), Builder S4 slice P3 IN_PROGRESS at a1ef279 (pins P-S4-1..12 + composition driver `bench-sandbox --s4` dual-candidate {ADAPT,SPINE} x D4c 7 trials + probe_sandbox --s4 rails + verbatim-18.5 projection + failable self-check, 3 commits bdfeebc/7ea5a5d/a1ef279, no dated CSV yet, measurement sweep pending on pinned quad, zero container bytes until S4 PASS). Pending: S4 measurement + projection readout vs committed e1 CSV (10.1210/3.3737, need <9.35/<3.117 summed/per-sample to hand to fresh format-program blueprint). Zero container bytes throughout.
- **Issue #130** - OPEN, Prism v2 S-series in progress (S4 composition in_progress). V1 ledger on main at 14bd9e6c (e1 10.1210/3.3737, M2/M3 FAIL both units). S-pivot authorized, architect delivered, Builder S4 structural code landed.

## PIPELINE POSITION
Research (v2 clean-slate DONE 15:44Z dd55a34/7a6d6dc) -> Architect V-series (DONE 15:59Z dcc2b31/2898ae2/464b2dc) -> Builder V0 (COMPLETE 20:05Z 13f73dd, 6 VB rails PASS) -> V1 pins fb9b8e7 -> V1 sweep COMPLETE 21:39Z 3bc11dd (V1a PASS +74.60 / V1b FAIL +5.81 vs +37.30 => STOP, B1 closed) -> OWNER PIVOT 21:53Z authorized -> Architect S-pivot (DONE 22:08Z addendum 19 + sourcepivot blueprint) -> Builder S1 P1 COMPLETE 22:49Z 91e5410 (A4/A4b, MED/GAP/W, dual-frame 56 rows, S1 FAIL -1.45 vs +1.50 => B3 closed, S2 skipped) -> Builder S3 P2 COMPLETE 23:26Z 4bbf4c0 (P-S3-1..12, PropHasher, --s3 sweep 92 rows, S3 FAIL -8.09 vs +1.50 => B2 closed, flat-16 ships) -> **Builder S4 P3 IN_PROGRESS at a1ef279 (pins+driver+rails landed, 128/128 tests, pending measurement CSV + 18.5 projection vs <9.35/<3.117) -> S5 reserve**.

## NEXT-RUN PLAYBOOK
1. Builder S4 measurement pending at a1ef279 (S4 driver + rails landed, no CSV yet) - watch `gh api pulls/145 --jq .head.sha` advance past a1ef279 with dated `2026-08-25-sandbox-s4.csv` + S4 COMPOSITION READOUT + 18.5 projection (summed <9.35 / per-sample <3.117 vs committed e1 10.1210/3.3737, non-regressing vs e1 by construction over {adaptive control, spine +5.81} x D4c 7 trials, zero container until PASS). PASS => fresh format-program blueprint; FAIL => stop-and-report expected honest outcome per research midpoint ~9.5-9.8; S5 opens only if inside M3 reach but short (<8.8316/<2.9438 while failing S4 bar).
2. Verify live each run: `gh api pulls/145 --jq .mergeable` true, `git ls-remote origin main` == 14bd9e6c, issue #130 OPEN, PAT 442 live, no review/test until S4 threshold then fresh blueprint. Duplicate /oc maintainer at 23:57:10/17/24 already covered by 23:33Z dispatch (32910861718); standing down avoids concurrency cancel (prior cancel 32869164616).
3. No lab/auditor/recover/ideate (PAT live, board frozen but S-pivot exempt, PR open/CLEAN, health board current).

## ISSUES
- **#130** - Prism M2/M3 continuation - Prism v2 S-series active (S4 in_progress after S1/S3 FAIL B3/B2 closed, S2 skipped, B1 closed at V1).
- **#145** - OPEN a1ef279 38 commits, MERGEABLE/CLEAN, S4 structural code landed (pins+driver+rails), measurement + projection pending.
- **#70** - Lab Health & Audit Logs (universal audit).
- **#42** - Brainstorm Board FROZEN by owner directive.

## OPEN QUESTIONS
- Will S4 composition (spine +5.81 x D4c 7 color trials, all NET per I12, I10 per-image-median RELPCT, winner = argmin NET per image, relpct_composed >=0 by construction) project inside <9.35/<3.117 vs e1 10.1210/3.3737 for honest M2 PASS / M3 contingency, or will it stop-and-report per midpoint ~9.5-9.6 summed?
- Will S5 reserve need to open (only if S4 projects inside M3 reach <8.8316/<2.9438 while failing S4 bar)?

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
