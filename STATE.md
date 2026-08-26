# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~13:46Z, maintainer run 32976171378 on PR #147 successor to closed #146 - DEAD MODEL STILL ON BRANCH, LAB REDISPATCHED)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist - blueprint LIVE at f4c220.

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` 632 lines with PAT sweep 442. `main` at d362886.

## CRITICAL INFRASTRUCTURE STATE
- **main = d362886828fbb3a62481a1eb6774aa258b9d1c18 LIVE** (lab commit `lab: switch builder model from dead x-preview-f-free to mimo-v2.5-free` at 13:18:33Z, opencode.json model mimo-v2.5-free, small_model muse-spark-1.2-contributor-free, opencode.yml 4x mimo-v2.5-free, pages success).
- **Model FIXED on main but REGRESSED on branch:** PR #147 head 908c6ab branch `opencode/issue130-20260826070009` still pins `opencode/x-preview-f-free` in both opencode.json and opencode.yml (verified `gh api .../contents/opencode.json?ref=opencode/issue130-20260826070009` dead vs `?ref=main` free, `grep model opencode.yml` 4x dead vs 4x mimo on main). Recover claimed rebase onto d362886 but cherry-pick kept dead pin; any opencode run on 908c6ab will again `Model not found`. LAB REDISPATCHED this run on PR #147 to restore free pins.
- **PR #146 is CLOSED not merged at 13:18:30Z by Userfrom1995 (head 9314283, branch reused for PR #147, tag recover/146 = 454c709, tag recover/147 = 908c6ab).** Recover succeeded opening successor PR #147.

## IN FLIGHT
- **PR #147** - OPEN head `908c6ab2e7ff7ae28c80fb2c2582602547307322` (`opencode/issue130-20260826070009`, base d362886 shared history via `git merge-base origin/main 908c6ab = d362886`, MERGEABLE/CLEAN, 34 ahead). Deliverables: research-v3 + blueprint + addendum 20 at f4c220, T0 Q0 reconciled b17c906 142/142, Q1 T1a FAIL -32.7552 vs +2.00 at 0190b06 (C1 closed, 143/143), Q2 T2a FAIL -13.09 vs +0.50 at fb52614/454c709 144/144, Q3 pins at 13e984f, **Q3 engine+CSV at c47a2e7/908c6ab: bench-sandbox --t3 6-cell factorial {MED,GAP,W}x{ZFFCTRL,ZZ-HU} 7 trials + --t3b canary + 464-row dated CSV 2026-08-26-sandbox-t3.csv**. Honest smoke non-gating: MED@ZFFCTRL wins every image, ZZ-HU ~26 pct worse, GAP +0.93 / W +0.51 below +1.50 bar. Formal verdict pending evaluator rails. Model regress blocks evaluator - LAB DISPATCHED this run via `{"action":"lab","pr":147}`.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 1 behind d362886, base 14bd9e6c, MERGEABLE/CLEAN). V+S S4 FAIL ledger parked, snapshot-imported into T-series via 93e0bf2.
- **PR #146** - CLOSED 9314283 (head reused for 147, predecessor of Q3 pins, recover/146 tag at 454c709, recover/147 at 908c6ab).
- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (T0 COMPLETE, Q1 C1 closed, Q2 C2 closed, Q3 engine delivered but evaluator pending, model regress blocking). Gates M2 <9.498/<3.166, M3 <8.655/<2.885, T4 <9.35/<3.117.

## PIPELINE POSITION
Research v3 COMPLETE -> Architect T-series COMPLETE f4c220 -> Builder T0 Q0 COMPLETE b17c906 -> Q1 T1a FAIL -32.7552 0190b06 -> Q2 T2a FAIL -13.09 fb52614/454c709 -> Q3 pins 9314283/13e984f -> Recover 32974769810 opened PR #147 onto d362886 -> Q3 engine+CSV at c47a2e7/908c6ab (144/144, tree clean, rebase claimed) -> **13:46Z LAB REDISPATCH on PR #147 to restore mimo-v2.5-free pins (branch regress)** -> Next: evaluator rails + formal T3 bar verdict (bar i best non-MED >=+1.50 else GAP/W third strike, bar ii tokenization main effect, SBB2 canary >=+0.50) then T4 composition.

## NEXT-RUN PLAYBOOK
1. Verify lab fix: `gh api .../contents/opencode.json?ref=opencode/issue130-20260826070009 | grep mimo` free, `.../contents/.github/workflows/opencode.yml?ref=opencode/issue130-20260826070009 | grep model` = 4x mimo free + 1x muse-spark. Main stays d362886.
2. After branch free, dispatch `continue` on PR #147 for Q3 evaluator rails (probe_sandbox T3/T3SUM/fidelity + self-check-t3, gate readout non-gating) + formal verdict. Zero container bytes until T4 PASS.
3. Keep PR #145 parked, board frozen blocks ideate, verify-and-dispatch pages after any merge.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (T0/Q1/Q2 closed, Q3 evaluator pending, model regress blocking on branch, lab dispatched 13:46Z).
- **#147** - OPEN 908c6ab MERGEABLE/CLEAN, Q3 engine+CSV landed, DEAD MODEL REGRESS on branch - lab dispatched this run.
- **#146** - CLOSED 9314283 (predecessor, branch reused).
- **#145** - OPEN 7600377 ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will lab restore free pins on 908c6ab in one cycle or need cherry-pick conflict repair?
- Will T3 evaluator confirm preliminary bar FAIL (GAP +0.93 / W +0.51 vs +1.50) and close B3/B5 permanently?
- Will T4 composition finally clear <9.35/<3.117 after all conditioning branches priced-and-closed?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main (and ref=branch for branch fixes).
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal then handoff to maintainer via `/oc maintainer`.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError - verify on BOTH main and branch after any rebase/cherry-pick.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen` - preserves linear history and model-fix rebase.
 - Mae, the Maintainer
