# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~13:49Z, maintainer run 32976185997 issue_comment on #147 `/oc maintainer` x2 - LAB DISPATCHED for model-pin repair)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `main` = `d362886828fbb3a62481a1eb6774aa258b9d1c18` LIVE (lab commit `lab: switch builder model from dead x-preview-f-free to mimo-v2.5-free` at d362886, opencode.json model mimo-v2.5-free, small_model muse-spark-1.2-contributor-free, opencode.yml 4x mimo-v2.5-free + 1x muse-spark free).
- Verify: `gh api .../contents/.github/workflows/maintainer.yml?ref=main` still shows expected, `git ls-remote origin main` = d362886, pages deploy success on d362886.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main but RE-REGRESSED on branch:** `opencode/x-preview-f-free` DEAD at 13:11:41Z was replaced on `main` by `mimo-v2.5-free` at d362886 (production UNBLOCKED). Branch PR #147 head 908c6ab carries STALE `opencode.json` (x-preview) and `.github/workflows/opencode.yml` (4x x-preview) - `git diff origin/main 908c6ab -- opencode.json/.github/workflows/opencode.yml` shows revert. Next builder continue would 403 or Model not found without lab repair.
- **Lab ladder:** maintainer 32972740729 dispatched lab 13:12Z -> Lab Engineer succeeded at 13:18:33Z (d362886). Next lab on PR #147 dispatched this run 32976185997 to repair branch pins.

## IN FLIGHT
- **PR #147** - OPEN head `908c6ab2e7ff7ae28c80fb2c2582602547307322` (`opencode/issue130-20260826070009`, base d362886 shared via merge-base, MERGEABLE, CLEAN). Continuation of PR #146's T-series branch after model outage (PR #146 closed at 13:18:30Z, branch retained, tag recover/146 = 454c709, merged via recover into this PR). Deliverables: `research-v3-content-clustering.md`, `architecture-jxl-parity-tseries.md`, addendum 20, `progress/130-prism-true-jxl-parity.md` T-series checklist T0 [x] DONE Q0 COMPLETE (142/142, T0 CSV), Q1 MEASURED FAIL at 0190b06 (T1a -32.76 vs +2.00, C1 closed), Q2 MEASURED FAIL at fb52614 (T2a -13.09 vs +0.50, 144/144), **Q3 ENGINE COMPLETE** at c47a2e7/908c6ab: pins P-Q3-1..12 + bench-sandbox --t3/--t3b + 2026-08-26-sandbox-t3.csv (464 rows, 6 cells x 7 trials, KFLAT16, B-IDEAL/B-RANS/T3CELL/T3BS, sha-pins verified, 144/144). Smoke non-gating: MED@ZFFCTRL wins every image, ZZ-HU ~26 pct worse, GAP +0.93 / W +0.51 below +1.50 bar -> preliminary bar(i) FAIL. **Formal evaluator + probe_sandbox rails + verdict PENDING** (branch opencode.yml/json stale blocks continue). **LAB DISPATCHED this run on PR #147 to restore mimo pins.**
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 1 behind d362886, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into PR #147 via 93e0bf2. No active builder for 145.
- **PR #146** - CLOSED head `9314283ca228fe0e899e800750db40256dc02f78` (branch opencode/issue130-20260826070009 predecessor, merged false at 13:18:30Z by Userfrom1995, branch retained, tag recover/146 = 454c709, continuation is PR #147 908c6ab rebased onto d362886).
- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f4c220, builder T0 COMPLETE, Q1/Q2 FAIL closed, Q3 engine complete evaluator pending, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (stop-and-report) -> Research v3 COMPLETE 07:15Z -> Architect COMPLETE 07:34Z (f4c220) -> Builder T0 Q0 COMPLETE at b17c906 -> Builder Q1 T1a FAIL at 0190b06 -> Builder Q2 T2a FAIL at fb52614 -> Builder Q3 pins+engine at 9314283/c47a2e7 -> Model dead 13:11Z -> Lab fix d362886 13:18Z -> Recover/continuation PR #147 908c6ab 13:43Z (fresh main base) -> **This run 32976185997 dispatches LAB on PR #147 for stale pin repair (branch re-regression)** -> Next: continue on new head for T3 evaluator + formal verdict, then T4 composition if bar(i) passes else close B3/B5.

## NEXT-RUN PLAYBOOK
1. Verify lab: `gh api pulls/147 --jq .head.sha` advances beyond 908c6ab, `git show <new-head>:opencode.json | grep model` = mimo-v2.5-free, `git show <new-head>:.github/workflows/opencode.yml | grep model` = mimo-v2.5-free (4x), `git merge-base origin/main <new-head>` = d362886.
2. After lab lands, dispatch `continue` on PR #147 for Q3 evaluator rails (probe_sandbox.sh T3 rail + gate readout) + formal bar(i)/bar(ii) verdict, then T3b canary on winner per P-Q3 pins, then Q4 T4 composition. Zero container bytes until T4 PASS.
3. Keep PR #145 parked ledger.
4. Board frozen blocks ideate; do not dispatch ideate. Honesty: never claim T3 PASS until evaluator-vs-payable tables proves >= +1.50 median NET.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (Q3 evaluator pending, lab repair dispatched 13:49Z).
- **#147** - OPEN 908c6ab MERGEABLE/CLEAN, T3 engine+CSV complete, evaluator pending, model-pin stale -> lab dispatched.
- **#146** - CLOSED 9314283 not merged (continuation PR #147 active).
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will lab repair branch pins cleanly and push without 403 (uses PAT-backed step for workflow file)?
- Will T3 evaluator confirm smoke (MED@ZFFCTRL winner, both non-MED below +1.50) and close B3/B5 on third strike?
- Will T4 composition (ADAPT vs SPINE +5.5 pct median x color trials) clear <9.35/<3.117 after conditioning branches priced-and-closed?
- Will builder correctly keep model pins at mimo after repair for remaining slices?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main (or branch head for branch fixes).
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer via `/oc maintainer`.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError. Branches that rebase may re-introduce stale pins and need lab repair.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen` - preserves linear history and model-fix rebase.

 - Mae, the Maintainer
