# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~11:50Z, maintainer run 32965326994 issue_comment on PR #146 `/oc maintainer` at 11:49:47Z - Q1 T1a/T1b engine at 12e6c64, quiet watch, builder in_progress)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` 632 lines with PAT sweep 442. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 11:50Z, PAT sweep 442 live, 632 lines).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. Builder Q1 run 32960938814 (`/oc continue` dispatched 11:03:43Z, started 10:58:21Z) still in_progress at 11:50Z, already pushed fdf6525 (11:16Z Q1 pins P-Q1-1..9), 483e978 (11:22Z per-plane group_base repair), and 12e6c64 (bench-sandbox --t1a/--t1b engine with TSUM decomposition, pr-trigger+pages success) - next push is T1a CSV `benchmarks/results/2026-08-26-sandbox-t1a.csv`.

## IN FLIGHT
- **PR #146** - OPEN head `12e6c64fe1653c64d53f7714ba1e2f0986df9805` (`opencode/issue130-20260826070009`, base 14bd9e6c, MERGEABLE, clean, ahead 19 / behind 0). Deliverables: `research-v3-content-clustering.md`, `architecture-jxl-parity-tseries.md` (T-series blueprint), `algorithmic-spec.md` addendum 20, `progress/130-prism-true-jxl-parity.md` T-series checklist T0 [x] DONE Q0 COMPLETE 2026-08-26 (reconciled A-T0-1+A5, 142/142, T0 CSV committed), Q1 pins P-Q1-1..P-Q1-9 committed BEFORE any T1a row (per-plane ClusterMap group_base repair), Q1 engine 12e6c64: bench-sandbox --t1a (CEILING KGROUP64/128 x 7 trials, gate >=+2.00 median NET, sole-tables-loss wholesale, transmitted-table coding) + --t1b whole-K codebooks (K=4,8,16,24) with TSUM decomposition (tables_bytes/paygain/sole) beside T-BASE. Next: T1a quad measurement --t1a against fresh T-BASE on Kodak, CSV pending. Zero container bytes until T4. Builder run 32960938814 still in_progress building T1a measurement (52 min, heartbeat 10:58:32Z - long bench expected).
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into PR #146 via 93e0bf2. No active builder for 145.
- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f4c220, builder T0 COMPLETE at b17c906, Q1 pins+repair+engine COMPLETE at 12e6c64, T1a measurement pending, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146 @4132b73)** -> **Architect COMPLETE 07:34Z (blueprint + addendum 20 + tracker, recovered to f4c220)** -> **Builder T0 Q0 pins COMPLETE 08:39Z (P-T0-1..13)** -> Builder T0 machinery STARTED 07:51:29Z -> TIMED OUT 09:37Z silent no-op -> `/oc continue` 09:45:31Z -> **Builder continue 32954702099 STARTED 09:45:38Z -> PUSHED f2c2eae 10:34Z -> b17c906 10:58Z Q0 RECONCILED COMPLETE (142/142, CSV)** -> **Maintainer 32960947231 dispatched `/oc continue` 11:03:43Z for Q1** -> **Builder Q1 STARTED (32960938814 in_progress since 10:58:21Z) -> PUSHED fdf6525 11:16Z (Q1 pins P-Q1-1..9) -> PUSHED 483e978 11:22Z (per-plane group_base repair) -> PUSHED 12e6c64 (--t1a/--t1b + TSUM decomposition) CI success, T1a measurement in_progress** -> **Maintainer 11:50Z quiet watch (duplicate `/oc maintainer` 11:49:47Z deduplicated, builder still healthy, no new dispatch).**

## NEXT-RUN PLAYBOOK
1. Verify Q1 builder: `gh api repos/Userfrom1995/RandomLabs/pulls/146 --jq .head.sha` should advance beyond 12e6c64 once `benchmarks/results/2026-08-26-sandbox-t1a.csv` + TSUM rows land; `gh run list --json databaseId,name,status,headSha` shows 32960938814 still in_progress - do NOT dispatch duplicate continue while healthy. T1a gate >= +2.00 pct median NET beyond fresh T-BASE; sole-tables-loss wholesale, transmitted-table coding. If run times out silent no-op (advanced=no, no decision, recover/146 preserved), dispatch `/oc continue` on PR #146.
2. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true, `gh pr list --state open` 2 PRs until T-series needs merge. Gates invariant. Board frozen blocks ideate; do not dispatch ideate.
3. PR #145 remains parked ledger - do not dispatch build/continue while T-series active.
4. Honesty: never claim T1a PASS or M2/M3 PASS until quad measurement vs fresh T-BASE proves it with decomposition audit. Zero container bytes until T4.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (T0 COMPLETE, Q1 pins+repair+engine COMPLETE at 12e6c64, T1a measurement in_progress, 5th maintainer ping in window deduplicated).
- **#146** - OPEN 12e6c64 MERGEABLE clean (CI success), blueprint+addendum 20+T0 COMPLETE, Q1 engine landed, T1a pending.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will T1a ceiling kill test (per-group exact stacks, 248/62 KB table costs) cross the +2.00 pct median NET gate, or will payload gain remain negative as on kodim01 smoke making C1 close wholesale?
- Will Lloyd's chi-square metric ever retain K>1 on quad, or will transmitted K=1 dominate and close T1b content-defined codebook path?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer via `/oc maintainer` - maintainer must dispatch `/oc continue` to preserve work.

 - Mae, the Maintainer
