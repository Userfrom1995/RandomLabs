# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~03:09Z, maintainer run 32925392271 - schedule, quiet watch - PR #145 parked S4 FAIL 9.5638/3.1879 vs 9.35/3.117, zero container bytes, main 14bd9e6c LIVE, no dispatch)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) Still active for Prism v2 S-series.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect for overall Prism project (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145):** Owner acknowledges V1 STOP, authorizes pivot; instructs Architect to re-engage and design source-side-only pivot (or any architecture deemed necessary). V2/V3/V4 reopened as S-series under new blueprint with fresh pre-registered gates.
- **NEW STANDING ORDER - AUTONOMOUS PIVOT (2026-08-25T21:53:15Z, on #145):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 vs JPEG XL/WebP/PNG, dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified 01:13Z via contents API. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 03:09Z, PAT sweep 442 live, 632 lines). Contents API confirms no `workflows:` permission trick - PAT path is canonical.
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins (muse-spark / x-preview), zero CreditsError per Auditor 01:11Z.

## IN FLIGHT
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind via compare API, base 14bd9e6c, MERGEABLE/CLEAN, merge_base 14bd9e6c shared). Deliverables: research v2 clean-slate (B1-B5), V-series blueprint + S-series blueprint (FRAME-A/FRAME-S dual-frame controls, all S-gates pre-registered, P_ext frozen=NONE, zero container until S4 PASS threshold <9.35/<3.117), Builder S1 P1 COMPLETE at 91e5410 (S1 FAIL -1.45 median vs +1.50 bar MED ships B3 closed), Builder S3 P2 COMPLETE at 4bbf4c0 (S3 FAIL -8.09 median SX-G k=64 vs +1.50 flat-16 ships B2 closed, flat-16 ships), Builder S4 P3 COMPLETE at 7600377 (pins P-S4-1..12 BEFORE measurement, composition driver `bench-sandbox --s4` dual-candidate {ADAPT,SPINE} x D4c 7 trials + probe_sandbox --s4 rails + verbatim-18.5 projection + failable self-check, dated CSV `prism/benchmarks/results/2026-08-25-sandbox-s4.csv` 104 rows, 6 VB rails re-green + deterministic re-run, 128/128 tests, S4 VERDICT FAIL stop-and-report projected 9.5638/3.1879 vs 9.35/3.117, M2/M3 context FAIL, S5 NOT triggered (9.5638 > 8.8316 gateway), S-program measurement phases END, .agent/decision handoff = maintainer). Zero container bytes across entire V+S program by construction.
- **Issue #130** - OPEN, Prism v2 S-series COMPLETE with stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Ledger at main 14bd9e6c (e1 10.1210/3.3737 fails M2/M3 both units) + v2 measurements (B1 5.81 realistic, B3 -1.45, B2 -8.09, B4 ~1.5 inside composition) preserved on branch. Awaiting next research program decision per autonomous pivot order; gates invariant.

## PIPELINE POSITION
Research (v2 clean-slate DONE) -> Architect S-pivot (DONE addendum 19 + sourcepivot blueprint) -> Builder S1 P1 COMPLETE 22:49Z 91e5410 (S1 FAIL) -> Builder S3 P2 COMPLETE 23:26Z 4bbf4c0 (S3 FAIL) -> **Builder S4 P3 COMPLETE 00:04Z 7600377 (S4 FAIL 9.5638/3.1879 vs 9.35/3.117 => stop-and-report, S5 NOT triggered, S-program measurement phases END)** -> parking at stop-and-report ledger (no review/test until fresh format-program blueprint after S4 PASS, never reached) -> **Auditor 01:11Z 32918041276 (all green content, job failure is git-push 403 noise, forwarded to maintainer 01:13Z) + Maintainer 01:13Z 32918166111 confirmed parking, no dispatch -> Maintainer 01:38Z 32919713090 quiet watch duplicate -> this schedule run 32925392271 quiet watch duplicate**.

## NEXT-RUN PLAYBOOK
1. PR #145 parked at S4 FAIL stop-and-report: `gh api pulls/145 --jq .head.sha` should stay at `7600377` unless owner or autonomous pivot authorizes fresh research program. Verify `git ls-remote origin main` == 14bd9e6c, issue #130 OPEN, merge_base shared, PAT 442 live. No builder dispatch; next program would be fresh research/architect on #130 (B1-B5 re-evaluated with I10/I12 discipline, B4 ~1.5, B2/B3 closed with numbers, S5 closed). Any continuation needs new pins-before-measurement and zero container rule until its own threshold. Do not dispatch builder continue on 7600377 (duplicate).
2. Verify live each run: `gh api pulls/145 --jq .mergeable` true, `gh api .../contents/prism/benchmarks/results/2026-08-25-sandbox-s4.csv?ref=7600377` 104 rows, `gh api .../contents/.agent/decision.json?ref=7600377` check handoff is {"action":"maintainer"}, `progress/130-prism-true-jxl-parity.md` shows S4 COMPLETE STOP.
3. No review/test/lab/auditor/recover/ideate: PR #145 has zero container bytes (measurement-only branch, merge blocked until dual-unit M2/M3 pass both units vs real cjxl). Review would be advisory only; dispatch only if owner requests or fresh format PR lands. Board frozen blocks ideate; PAT live; health board current (Auditor 01:11Z failure is push-403 noise, content healthy - no need to re-audit until schedule). Do not dispatch builder continue on 7600377 (would be duplicate). Auditor push failure is not production halt - no lab dispatch.

## ISSUES
- **#130** - Prism v2 S-series COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117, B1/B2/B3 closed, S5 closed, gates invariant, awaiting next program direction).
- **#145** - OPEN 7600377 39 ahead, MERGEABLE/CLEAN, S4 COMPLETE FAIL stop-and-report, zero container bytes, merge-blocked until dual-unit M2/M3 pass.
- **#70** - Lab Health & Audit Logs (universal audit) - Auditor 2026-08-26 all green content (run 32918041276 failure is 403 push noise, forwarded OK), Maintainer 01:13Z confirmed.
- **#42** - Brainstorm Board FROZEN by owner directive.

## OPEN QUESTIONS
- Will owner or Mae under autonomous pivot authorize a fresh research program beyond the S-series (new architecture family, new invariants) given S4's available-but-insufficient spine (+5.51 median, +2.98 on kodim20) and the hard M2/M3 gates? Gates remain invariant.
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
