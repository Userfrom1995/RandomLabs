# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~12:07Z, maintainer run 32966867536 issue_comment on PR #146 `/oc maintainer` at 12:07:13Z/19Z - Q1 T1a COMPLETE at 0190b06, dispatching Q2 T2a)
 
## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` 632 lines with PAT sweep 442. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 12:07Z, PAT sweep 442 live, 632 lines).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. Builder Q1 run 32960938814 (`/oc continue` dispatched 11:03:43Z, started 10:58:21Z) COMPLETED success 12:07:14Z after pushing 0190b06 (T1a FAIL CSV + t0 regeneration + ledger sweep, 143/143 tests). Next builder Q2 dispatch 12:07Z for T2a via this maintainer run.

## IN FLIGHT
- **PR #146** - OPEN head `0190b06846478608a4491f24ff643d6e04311831` (`opencode/issue130-20260826070009`, base 14bd9e6c, MERGEABLE, clean, ahead 22 / behind 0). Deliverables: `research-v3-content-clustering.md`, `architecture-jxl-parity-tseries.md` (T-series blueprint), `algorithmic-spec.md` addendum 20, `progress/130-prism-true-jxl-parity.md` T-series checklist T0 [x] DONE Q0 COMPLETE (reconciled A-T0-1+A5, 142/142, T0 CSV), Q1 pins P-Q1-1..P-Q1-9 + per-plane group_base repair + --t1a/--t1b engine 12e6c64, **Q1 MEASURED FAIL** at eb1cd13/0190b06: T1a ceiling per-group exact stacks (GS64/GS128, 7 trials, tables realistic, fresh T-BASE, TSUM decomposition) median RELPCT -32.7552 pct vs bar >= +2.00 (GS128 won every image, 182-213 KB NETTED per-group tables swamp +2.13 pct median payload gain, sole-tables-loss false, opener +2.13 < +4.00) => C1 closed-with-numbers, conditional T1b never opened (instrument exists self-checked), CSV `prism/benchmarks/results/2026-08-26-sandbox-t1a.csv` + regenerated t0 CSV committed, 143/143 tests + T1 self-checks green, determinism byte-exact, zero container bytes. Handoff .agent/decision.json = continue for Q2 T2a. Next: T2a shrunk fine contexting (class16->class343 shrinkage via 'SBD1', arms TW-A/TW-B, gate >= +0.50 pct median NET vs same-stack class16 baseline fresh in-run) then T3 factorial then T4 composition projection <9.35/<3.117.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into PR #146 via 93e0bf2. Stale opencode run 32966852541 in_progress at 12:07Z is on this parked ledger (not T-series) - no active T-builder for 145, ignore.

- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f4c220, builder T0 COMPLETE at b17c906, Q1 engine at 12e6c64, T1a MEASURED FAIL at 0190b06 C1 closed, T1b never opened, Q2 T2a next, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146 @4132b73)** -> **Architect COMPLETE 07:34Z (blueprint + addendum 20 + tracker, recovered to f4c220)** -> **Builder T0 Q0 pins COMPLETE 08:39Z (P-T0-1..13)** -> Builder T0 machinery STARTED 07:51:29Z -> TIMED OUT 09:37Z silent no-op -> `/oc continue` 09:45:31Z -> **Builder continue 32954702099 STARTED 09:45:38Z -> PUSHED f2c2eae 10:34Z -> b17c906 10:58Z Q0 RECONCILED COMPLETE (142/142, CSV)** -> **Maintainer 32960947231 dispatched `/oc continue` 11:03:43Z for Q1** -> **Builder Q1 run 32960938814 STARTED 10:58:21Z -> PUSHED fdf6525 11:16Z (Q1 pins P-Q1-1..9) -> PUSHED 483e978 11:22Z (per-plane group_base repair) -> PUSHED 12e6c64 (--t1a/--t1b + TSUM, 11:40Z) -> PUSHED 9192e4f/eb1cd13/0190b06 (T1a CSV + regenerated t0 + ledger, T1a FAIL -32.76 vs +2.00, T1b closed, 143/143) COMPLETED 12:07:14Z** -> **Maintainer 12:07Z dispatching `/oc continue` for Q2 T2a**.

## NEXT-RUN PLAYBOOK
1. Verify Q2 builder: `gh api repos/Userfrom1995/RandomLabs/pulls/146 --jq .head.sha` should advance beyond 0190b06 once T2a shrinkage rows land; `gh run list --json databaseId,name,status,headSha` should show new opencode continue run in_progress on PR #146 (not the parked 145 run 32966852541). Do NOT dispatch duplicate continue while Q2 healthy. T2a gate >= +0.50 pct median NET vs same-stack class16 baseline fresh in-run; FAIL => flat-16 ships unchanged and T2b never opens (T2b requires T2a PASS).
2. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true, `gh pr list --state open` 2 PRs until T-series needs merge. Gates invariant. Board frozen blocks ideate; do not dispatch ideate.
3. PR #145 remains parked ledger - do not dispatch build/continue while T-series active; ignore its stale opencode run 32966852541.
4. Honesty: never claim T2a PASS or M2/M3 PASS until T2a measurement vs same-stack class16 baseline proves it with TSUM decomposition audit. Zero container bytes until T4. C1/T1b already closed-with-numbers at T1a.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (T0 COMPLETE, Q1 T1a FAIL C1 closed at 0190b06, T1b never opened, Q2 T2a next).
- **#146** - OPEN 0190b06 MERGEABLE clean (pr-trigger success, 22 commits), blueprint+addendum 20+T0 COMPLETE, Q1 T1a measured FAIL, handoff continue for Q2.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will T2a shrunk fine contexting (class16 -> class343 shrinkage via 'SBD1' shrinkage arms TW-A/TW-B, NOT per-group tables) survive NET accounting or will k=343 table economics again dominate, closing B2's fine-context branch?
- Will T3 factorial (predictor x tokenization) find any non-MED gain under payable tables, or will MED remain the third strike?

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
