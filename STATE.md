# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~13:52Z, maintainer run 32976777154 issue_comment on #147 `/oc maintainer` + `/oc lab` - LAB REPAIR VERIFIED, CONTINUE DISPATCHED for T3 evaluator)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `main` = `d362886828fbb3a62481a1eb6774aa258b9d1c18` LIVE (lab commit `lab: switch builder model from dead x-preview-f-free to mimo-v2.5-free` at d362886, opencode.json model mimo-v2.5-free, small_model muse-spark-1.2-contributor-free, opencode.yml 4x mimo-v2.5-free + 1x muse-spark free).
- Verify: `git ls-remote origin main` = d362886, `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep PAT-backed` = 442 (632 lines), `compare d362886...78406b0` status ahead via API, `git show origin/main:opencode.json` mimo free.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main AND on branch:** `opencode/x-preview-f-free` DEAD at 13:11Z was replaced on `main` by `mimo-v2.5-free` at d362886 (production UNBLOCKED). Branch PR #147 head `78406b0` now carries CORRECT `opencode.json` (mimo-v2.5-free) and `.github/workflows/opencode.yml` (4x mimo-v2.5-free) - verified via `git show 78406b0:` vs live main. Previous stale at 908c6ab is superseded.
- **Lab ladder:** maintainer 32972740729 dispatched lab 13:12Z -> Lab Engineer succeeded at 13:18:33Z (d362886). Maintainer 32976185997 dispatched lab on PR #147 at 13:49Z -> Lab Engineer succeeded at 13:52:01Z (78406b0) with PAT-backed push. Redundant lab 32976851355 at 13:52:50Z is in_progress but will be no-op (pins already correct).

## IN FLIGHT
- **PR #147** - OPEN head `78406b0198b84311a614e90d91ec560bfe3c847a` (`opencode/issue130-20260826070009`, base d362886 shared via compare API `ahead 33 / behind 0`, status `ahead`, MERGEABLE, UNSTABLE). Continuation of PR #146's T-series branch after model outage (PR #146 closed at 13:18:30Z, branch retained, tag recover/146 = 454c709). Deliverables: `research-v3-content-clustering.md`, `architecture-jxl-parity-tseries.md`, addendum 20, `progress/130-prism-true-jxl-parity.md` T-series checklist T0 [x] DONE Q0 COMPLETE (142/142, T0 CSV), Q1 MEASURED FAIL at 0190b06 (T1a -32.76 vs +2.00, C1 closed), Q2 MEASURED FAIL at fb52614 (T2a -13.09 vs +0.50, 144/144), **Q3 ENGINE COMPLETE** at c47a2e7/908c6ab + lab fix 78406b0: pins P-Q3-1..12 + bench-sandbox --t3/--t3b + 2026-08-26-sandbox-t3.csv (464 rows, 6 cells x 7 trials, KFLAT16, B-IDEAL/B-RANS/T3CELL/T3BS, sha-pins verified, 144/144). Smoke non-gating: MED@ZFFCTRL wins every image, ZZ-HU ~26 pct worse, GAP +0.93 / W +0.51 below +1.50 bar -> preliminary bar(i) FAIL. **Lab repair VERIFIED at 78406b0 (mimo pins correct). Formal evaluator + probe_sandbox rails + verdict DISPATCHED via continue this run.**
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 1 behind d362886, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into PR #147 via 93e0bf2. No active builder for 145.
- **PR #146** - CLOSED head `9314283ca228fe0e899e800750db40256dc02f78` (branch opencode/issue130-20260826070009 predecessor, merged false at 13:18:30Z by Userfrom1995, branch retained, tag recover/146 = 454c709, continuation is PR #147 at 78406b0 rebased onto d362886).
- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f4c220, builder T0 COMPLETE, Q1/Q2 FAIL closed, Q3 engine complete evaluator pending via continue 78406b0, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (stop-and-report) -> Research v3 COMPLETE 07:15Z -> Architect COMPLETE 07:34Z (f4c220) -> Builder T0 Q0 COMPLETE at b17c906 -> Builder Q1 T1a FAIL at 0190b06 -> Builder Q2 T2a FAIL at fb52614 -> Builder Q3 pins+engine at 9314283/c47a2e7 -> Model dead 13:11Z -> Lab fix d362886 13:18Z -> Recover/continuation PR #147 908c6ab 13:43Z (fresh main base) -> Lab on PR #147 dispatched 13:49Z for stale pin repair -> Lab success 78406b0 13:52Z (mimo pins verified) -> **This run 32976777154 dispatches CONTINUE on PR #147 for T3 evaluator + formal verdict** -> Next: T3b canary on winner if bar(i) PASS else close B3/B5, then Q4 T4 composition. Zero container bytes until T4 PASS.

## NEXT-RUN PLAYBOOK
1. Verify builder: `gh api pulls/147 --jq .head.sha` advances beyond 78406b0 with evaluator rails (probe_sandbox.sh T3 rail + T3SUM/fidelity + gate readout + formal verdict in progress file), `git show <new-head>:opencode.json | grep model` stays mimo-v2.5-free, `gh run list` shows opencode continue success with 144/144 tests and T3CELL/T3BS still green.
2. If bar(i) FAIL confirmed: verify GAP/W third strike closed in progress file and B3/B5 closed permanently; if bar(i) PASS: verify T3b canary on winner vs MED@ZFFCTRL with bias correction. Then Q4 T4 composition.
3. Keep PR #145 parked ledger.
4. Board frozen blocks ideate; do not dispatch ideate. Honesty: never claim T3 PASS until evaluator-vs-payable tables proves >= +1.50 median NET.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (Q3 evaluator dispatched at 78406b0, lab repair verified).
- **#147** - OPEN 78406b0 MERGEABLE/UNSTABLE, T3 engine+CSV complete, lab repair verified, evaluator continue dispatched.
- **#146** - CLOSED 9314283 not merged (continuation PR #147 active at 78406b0).
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will T3 evaluator confirm smoke (MED@ZFFCTRL winner, both non-MED below +1.50) and close B3/B5 on third strike?
- Will lab redundant run 32976851355 exit cleanly as no-op?
- Will builder correctly keep model pins at mimo after evaluator commit?
- Will T4 composition (ADAPT vs SPINE +5.5 pct median x color trials) clear <9.35/<3.117 after conditioning branches priced-and-closed?

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
