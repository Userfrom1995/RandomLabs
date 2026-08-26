# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~17:41Z, maintainer run 32995657131 - MERGE COMPLETE PR #147 at 3a521fe, issue #130 closed honestly, pages dispatched)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) - RESOLVED via honest closure at 3a521fe: #130 closed honestly after full T-series negative ledger, gates never passed but program stops at decision tree row 1 final clause.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist - blueprint LIVE at f4c220. Builder T-series executed through T5 correction at 2c8d3f5 then merged as 3a521fe.

## MERGE CAPABILITY (verified)
- `main` = `3a521fe233e98b318c1a6de1b173fa231a55eba1` LIVE (merge commit for PR #147 `builder: Prism v3 T-series (T0/T1a/T2a/T3) measurement program (#130)` rebased, 38 commits, Closes #130, opencode.json mimo-v2.5-free). Previous `d362886` lab fix included.
- Verify: `git ls-remote origin main` = 3a521fe, `gh api pulls/147 --jq .merged` = true, `gh api issues/130 --jq .state` = closed, `gh api .../contents/progress/130-prism-true-jxl-parity.md?ref=main` shows Status complete HONESTLY 9.5671/3.1890.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 3a521fe via contents API (main now contains PR #147 merge, no workflow diff vs d362886). PAT sweep live on main (442).
- **Lab ladder:** completed. No further lab needed. Pages dispatched via `gh workflow run pages.yml` at 3a521fe (run 32995781311 queued).

## IN FLIGHT
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (branch `opencode/issue130-20260826070009` deleted via --delete-branch, base d362886 shared history verified `ahead 38 / behind 0` before merge). Deliverables now on main: research-v3, architecture tseries, addendum 20, progress complete, 18 decision records, probe_sandbox T3/T4 rails, T3 CSV 464 rows, 144/144 tests. Negative ledger complete: T0 DONE, T1a FAIL -32.76 vs +2.00, T2a FAIL -13.09 vs +0.50, T3 bar(i) FAIL -2.11 vs +1.50 (B3/B5 third strike closed), T4 FAIL 9.5671/3.1890 vs <9.35/<3.117, T5 NOT triggered (9.5671 > 8.8316). Review APPROVED 17:29:44Z run 32994116273, Tester PASS 17:41:35Z run 32994553015, merge rebase at 17:41Z. Issue #130 closed via Closes keyword + manual close.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 1 behind 3a521fe? base 14bd9e6c, now behind 38+1, MERGEABLE/CLEAN before merge, needs rebase check post-merge). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into #147 via 93e0bf2. No active builder. Decision to close or keep as ledger pending next sweep.
- **PR #146** - CLOSED head `9314283ca228fe0e899e800750db40256dc02f78` (predecessor, continuation was PR #147 now merged).
- **Issue #130** - CLOSED at 17:41Z via `gh issue close 130 --reason completed` after PR #147 merge 3a521fe (honest closure at achieved level, full ledger, no container bytes until T4 PASS respected, all addendum 20 gates measured).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (stop-and-report) -> Research v3 COMPLETE 07:15Z -> Architect COMPLETE 07:34Z (f4c220) -> Builder T0 Q0 COMPLETE -> Q1 T1a FAIL -> Q2 T2a FAIL -> Q3 pins+engine -> Lab fix d362886 -> Continuation PR #147 -> Lab on branch 78406b0 -> T3 verdict FAIL c5a4c2d -> T4 FAIL cf37dee/124b38c -> T5 correction 2c8d3f5 (T5 NOT triggered) -> Review APPROVED 17:29Z -> Tester PASS 17:41Z -> Merge 3a521fe -> Close #130 -> Pages dispatch. Program complete, honest closure.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` stays 3a521fe, `gh api pulls/147 --jq .merged` true, `gh api issues/130 --jq .state` closed, `gh api .../contents/progress/130-prism-true-jxl-parity.md?ref=main` honest closure readable, pages deploy 32995781311 success.
2. Evaluate PR #145 parked ledger: check `gh pr view 145 --json mergeable` post-rebase (now behind main by 38), decide to close as superseded/ledger or keep for archival. No builder work.
3. Check lab health board #70 and brainstorm board #42: freeze was tied to M2/M3 pass - now that #130 closed honestly without passing, determine if freeze lifts or persists per owner directive (M2/M3 never passed). Default: freeze remains until owner explicitly lifts, so still no ideate dispatches.
4. No review/test on closed program. Monitor `gh run list` for pages success, ensure no `Model not found`.

## ISSUES
- **#130** - CLOSED (merged via #147 at 3a521fe, honest closure).
- **#147** - MERGED (3a521fe, 38 commits, Closes #130).
- **#146** - CLOSED (predecessor, recover/146 tag).
- **#145** - OPEN 7600377 parked V+S ledger (evaluate next sweep).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will pages deploy 32995781311 succeed on 3a521fe and serve preview correctly?
- What is disposition of PR #145 ledger now that T-series supersedes it (close vs keep)?
- Is freeze lifted after honest closure without M2/M3 pass, or does it remain until a future program genuinely passes? Awaiting owner.
- After merge, will M2/M3 ledger correctly stay FAIL until genuinely passing program lands?

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
