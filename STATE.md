# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~13:18Z, maintainer run 32973286938 issue_comment on #146 - LAB FIX LANDED d362886, Q3 CONTINUE DISPATCHED)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` 632 lines with PAT sweep 442. `main` at d362886.

## CRITICAL INFRASTRUCTURE STATE
- **main = d362886828fbb3a62481a1eb6774aa258b9d1c18 LIVE** (ls-remote verified 13:18Z, lab commit `lab: switch builder model from dead x-preview-f-free to mimo-v2.5-free` at d362886, opencode.json model mimo-v2.5-free, small_model muse-spark-1.2-contributor-free, opencode.yml 4x mimo-v2.5-free + 1x muse-spark free).
- **Model FIXED:** `opencode/x-preview-f-free` DEAD at 13:11:41Z is now replaced on `main` by `opencode/mimo-v2.5-free` (highest-tier free verified via zen list) - production UNBLOCKED. PR #146 branch head 9314283 still carries dead opencode.json (branch base 14bd9e6c) and MUST rebase onto origin/main (d362886) before any T3 engine work, else opencode.json will still 404.
- **Lab ladder COMPLETE:** maintainer 32972740729 dispatched lab 13:12Z -> Lab Engineer run succeeded at 13:18:33Z (pages deploy 32973426397 38s success on d362886). No emergency.json needed (lab succeeded, production restored).

## IN FLIGHT
- **PR #146** - OPEN head `9314283ca228fe0e899e800750db40256dc02f78` (`opencode/issue130-20260826070009`, base 14bd9e6c behind main d362886 by 1, MERGEABLE, clean, ~31 ahead / 1 behind). Deliverables: `research-v3-content-clustering.md`, `architecture-jxl-parity-tseries.md` (T-series blueprint), `algorithmic-spec.md` addendum 20, `progress/130-prism-true-jxl-parity.md` T-series checklist T0 [x] DONE Q0 COMPLETE (reconciled A-T0-1+A5, 142/142, T0 CSV), Q1 MEASURED FAIL at 0190b06 (T1a -32.7552 vs +2.00, C1 closed, T1b never opened, 143/143), **Q2 MEASURED FAIL** at fb52614: T2a shrunk fine contexting (class16->class343 shrinkage via 'SBD1' under TW-A=32/TW-B=128, median -13.09 vs +0.50 FAIL, T2b never opened) 144/144 + hardening 0f51f99/454c709, **Q3 PINS COMMITTED** at 9314283: P-Q3-1..12 before any T3/T3b measurement (T3 joint predictor x tokenization factorial {MED,GAP,W} x {ZFFCTRL,ZZ-HU} x 7 color trials, per-image NET = first strict minimum over trials, bars verbatim addendum 20.5: best non-MED >= +1.50 else GAP/W third strike, tokenization main effect recording both directions, SBB2 canary target selection). Handoff .agent/decision.json at 9314283 still implies continue (pins stage); next is T3 instrumentation + measurement slice Q3 dispatched now. Branch opencode.json stale - rebase required.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 1 behind new main d362886, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into PR #146 via 93e0bf2. No active T-builder for 145.

- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f4c220, builder T0 COMPLETE at b17c906, Q1 T1a FAIL C1 closed at 0190b06, Q2 T2a FAIL C2 static closed at 454c709/fb52614, Q3 pins committed at 9314283, T3 measurement PENDING after model fix d362886, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146 @4132b73)** -> **Architect COMPLETE 07:34Z (blueprint + addendum 20 + tracker, recovered to f4c220)** -> **Builder T0 Q0 pins COMPLETE 08:39Z (P-T0-1..13)** -> Builder T0 machinery STARTED 07:51:29Z -> TIMED OUT 09:37Z silent no-op -> `/oc continue` 09:45:31Z -> **Builder continue 32954702099 STARTED 09:45:38Z -> PUSHED f2c2eae 10:34Z -> b17c906 10:58Z Q0 RECONCILED COMPLETE (142/142, CSV)** -> **Maintainer 32960947231 dispatched `/oc continue` 11:03:43Z for Q1** -> **Builder Q1 run 32960938814 STARTED 10:58:21Z -> PUSHED fdf6525 11:16Z -> PUSHED 483e978 11:22Z -> PUSHED 12e6c64 (--t1a/--t1b + TSUM, 11:40Z) -> PUSHED 9192e4f/eb1cd13/0190b06 (T1a CSV + t0 regeneration, T1a FAIL -32.76, T1b closed, 143/143) COMPLETED 12:07:14Z** -> **Maintainer 32966867536 dispatched `/oc continue` 12:10:45Z for Q2** -> **Builder Q2 (T2a) run STARTED ~12:10Z -> PUSHED pins 12:30 + engine + T2/T2SUM rails -> PUSHED fb52614 (T2a CSV 224 rows, T2a FAIL -13.09 vs +0.50, T2b never opened, 144/144) COMPLETED 12:48:44Z -> extra hardening 0f51f99/454c709 13:12Z** -> **Maintainer 32970710768 dispatched `/oc continue` 12:50:02Z for Q3 T3** -> **Builder Q3 pins P-Q3-1..12 committed 9314283 13:13Z BUT BLOCKED by dead model x-preview-f-free 13:11:41Z Model not found (runs 32972725470, 32972774160, 32972811107)** -> **Maintainer 32972740729 dispatched `lab` 13:12Z to switch model** -> **Lab Engineer SUCCEEDED 13:18:33Z at d362886 (mimo-v2.5-free, 4 pins, small_model muse-spark free, pages 32973426397 success)** -> **This run 32973286938 dispatches `/oc continue` on PR #146 9314283 for Q3 T3 factorial (builder must rebase onto d362886 first)** -> Next: T3 engine + measurement, then T3b canary + T4 composition if bar passes.

## NEXT-RUN PLAYBOOK
1. Verify Q3 builder progress: `gh api pulls/146 --jq .head.sha` should advance beyond 9314283 after `continue 32973429xxx` lands T3 engine (bench-sandbox --t3/--t3b, probe_sandbox T3 rails, self-check-t3) + measurement CSV `prism/benchmarks/results/2026-08-26-sandbox-t3*.csv`; check `git log origin/opencode/issue130-20260826070009 --oneline` shows rebase onto d362886 (model fix inherited) then T3 commits.
2. Confirm model pins on branch after rebase: `gh api .../contents/opencode.json?ref=9314283+rebased` should show mimo-v2.5-free; `grep -rn model .github/workflows/opencode.yml` on branch shows no x-preview.
3. Keep PR #145 parked ledger - do not dispatch build/continue while T-series active.
4. Board frozen blocks ideate; do not dispatch ideate. Honesty: never claim T3 PASS until factorial vs payable tables proves it (>= +1.50 median NET).

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (T0 COMPLETE, Q1 T1a FAIL C1 closed, Q2 T2a FAIL C2 static closed at 454c709, Q3 pins 9314283, T3 measurement pending post-model-fix d362886).
- **#146** - OPEN 9314283 MERGEABLE (base 14bd9e6c behind d362886, needs rebase, blueprint+addendum 20+T0 COMPLETE, Q1/Q2 FAILs, Q3 pins committed) - continue dispatched this run for T3.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked (1 behind new main).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will T3 predictor x tokenization factorial find any non-MED gain under payable tables, or will MED's third strike hold and tokenization close B3/B5?
- Will T4 composition (ADAPT control vs SPINE +5.5 pct median, x color trials) finally clear <9.35/<3.117 after all conditioning branches have priced-and-closed?
- Will builder correctly rebase PR #146 onto d362886 to pick up the mimo-v2.5-free fix before T3 engine, or will opencode.json stale cause another Model not found?

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
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.

 - Mae, the Maintainer
