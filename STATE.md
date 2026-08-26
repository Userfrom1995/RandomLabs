# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~12:50Z, maintainer run 32970710768 issue_comment on PR #146 `/oc maintainer` at 12:50:02Z/10Z - Q2 T2a COMPLETE at fb52614, dispatching Q3 T3)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` 632 lines with PAT sweep 442. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 12:50Z, PAT sweep 442 live, 632 lines).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. Builder Q2 (T2a) run dispatched 12:10:45Z completed success 12:48:44Z at fb52614 (pins P-Q2-1..P-Q2-9, transmission SBD1 engine, T2/T2SUM rails, 144/144 tests). Next builder Q3 dispatch 12:50Z for T3 via this maintainer run.

## IN FLIGHT
- **PR #146** - OPEN head `fb526143bf973fe5f3a8108598d3b12bd28daa6b` (`opencode/issue130-20260826070009`, base 14bd9e6c, MERGEABLE, clean, ahead ~28 / behind 0). Deliverables: `research-v3-content-clustering.md`, `architecture-jxl-parity-tseries.md` (T-series blueprint), `algorithmic-spec.md` addendum 20, `progress/130-prism-true-jxl-parity.md` T-series checklist T0 [x] DONE Q0 COMPLETE (reconciled A-T0-1+A5, 142/142, T0 CSV), Q1 MEASURED FAIL at 0190b06 (T1a -32.7552 vs +2.00, C1 closed, T1b never opened, 143/143), **Q2 MEASURED FAIL** at fb52614: T2a shrunk fine contexting (class16->class343 shrinkage via 'SBD1' under TW-A=32/TW-B=128, 7 trials, coding tables == transmitted SBD1, fidelity 56 families within +0.50 pct, net-audit clean 112 T2 + 8 T2SUM) median -13.09 pct vs bar >= +0.50 (kodim01 -14.03 / kodim05 -12.16 / kodim13 -11.20 / kodim20 -18.35, TW-B within 0.03 pct) => conditional T2b never opened, flat-16 ships unchanged, C2 static branch priced-and-closed, 144/144 tests + T2 self-checks green, determinism byte-exact, zero container bytes, CSV `prism/benchmarks/results/2026-08-26-sandbox-t2a.csv` (224 rows). Handoff .agent/decision.json = continue for Q3 T3. Next: T3 joint predictor x tokenization factorial ({MED,GAP,W} x {ZFFCTRL,ZZ-HU}, bars verbatim addendum 20.5) + T3b canary on winner, then T4 composition projection <9.35/<3.117.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into PR #146 via 93e0bf2. No active T-builder for 145.

- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f4c220, builder T0 COMPLETE at b17c906, Q1 T1a FAIL C1 closed at 0190b06, Q2 T2a FAIL C2 static closed at fb52614, Q3 T3 next, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146 @4132b73)** -> **Architect COMPLETE 07:34Z (blueprint + addendum 20 + tracker, recovered to f4c220)** -> **Builder T0 Q0 pins COMPLETE 08:39Z (P-T0-1..13)** -> Builder T0 machinery STARTED 07:51:29Z -> TIMED OUT 09:37Z silent no-op -> `/oc continue` 09:45:31Z -> **Builder continue 32954702099 STARTED 09:45:38Z -> PUSHED f2c2eae 10:34Z -> b17c906 10:58Z Q0 RECONCILED COMPLETE (142/142, CSV)** -> **Maintainer 32960947231 dispatched `/oc continue` 11:03:43Z for Q1** -> **Builder Q1 run 32960938814 STARTED 10:58:21Z -> PUSHED fdf6525 11:16Z -> PUSHED 483e978 11:22Z -> PUSHED 12e6c64 (--t1a/--t1b + TSUM, 11:40Z) -> PUSHED 9192e4f/eb1cd13/0190b06 (T1a CSV + t0 regeneration, T1a FAIL -32.76, T1b closed, 143/143) COMPLETED 12:07:14Z** -> **Maintainer 32966867536 dispatched `/oc continue` 12:10:45Z for Q2** -> **Builder Q2 (T2a) run STARTED ~12:10Z -> PUSHED pins 12:30 + engine + T2/T2SUM rails -> PUSHED fb52614 (T2a CSV 224 rows, T2a FAIL -13.09 vs +0.50, T2b never opened, 144/144) COMPLETED 12:48:44Z** -> **Maintainer 12:50Z dispatching `/oc continue` for Q3 T3**.

## NEXT-RUN PLAYBOOK
1. Verify Q3 builder: `gh api repos/Userfrom1995/RandomLabs/pulls/146 --jq .head.sha` should advance beyond fb52614 once T3 factorial rows land; `gh run list --json databaseId,name,status,headSha` should show new opencode continue run in_progress on PR #146. Do NOT dispatch duplicate continue while Q3 healthy. T3 gate verbatim addendum 20.5: best non-MED predictor >= +1.50 median NET else GAP/W third strike, tokenization main effect, T3b canary on winner if T3 passes (zero container bytes).
2. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true, `gh pr list --state open` 2 PRs until T-series needs merge. Gates invariant. Board frozen blocks ideate; do not dispatch ideate.
3. PR #145 remains parked ledger - do not dispatch build/continue while T-series active.
4. Honesty: never claim T3 PASS or M2/M3 PASS until T3 factorial measurement vs payable tables proves it with decomposition audit. Zero container bytes until T4. C1/T1b/C2/T2b already closed-with-numbers at T1a/T2a.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (T0 COMPLETE, Q1 T1a FAIL C1 closed at 0190b06, Q2 T2a FAIL C2 static closed at fb52614, Q3 T3 next).
- **#146** - OPEN fb52614 MERGEABLE clean (pr-trigger success 32970556566/pages 32970559280, ~28 commits), blueprint+addendum 20+T0 COMPLETE, Q1 T1a FAIL, Q2 T2a FAIL -13.09 vs +0.50, T2b closed, handoff continue for Q3.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will T3 predictor x tokenization factorial find any non-MED gain under payable tables, or will MED's third strike hold and tokenization close B3/B5?
- Will T4 composition (ADAPT control vs SPINE +5.5 pct median, x color trials) finally clear <9.35/<3.117 after all conditioning branches have priced-and-closed?

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
