# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~18:54Z, maintainer run 33002274221 - OWNER CLOSE #145 + ANSWER ON #147)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) - RESOLVED via honest closure at 3a521fe: #130 closed honestly after full T-series negative ledger, gates never passed but program stops at decision tree row 1 final clause. Freeze remains until owner explicitly lifts.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains CLOSED and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist - blueprint LIVE at f4c220. Builder T-series executed through T5 correction at 2c8d3f5 then merged as 3a521fe.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging (history/reference/recovery). PR #149 implements fix.
- **CLOSE #145 AS SUPERSEDED (2026-08-26T18:54:25Z, owner on #147):** Owner directed close of PR #145 as superseded. Executed this run via `gh pr close 145` with superseded ledger note. V+S snapshot-imported via 93e0bf2 into #147.

## MERGE CAPABILITY (verified)
- `main` = `3a521fe233e98b318c1a6de1b173fa231a55eba1` LIVE (merge commit for PR #147 `builder: Prism v3 T-series (T0/T1a/T2a/T3) measurement program (#130)` rebased, 38 commits, Closes #130, opencode.json mimo-v2.5-free). Previous `d362886` lab fix included. Branch `opencode/issue130-20260826070009` was deleted via --delete-branch at merge (precedent for retain fix, now preserved `2c8d3f5` via ls-remote).
- Verify: `git ls-remote origin main` = 3a521fe, `gh api pulls/147 --jq .merged` = true, `gh api issues/130 --jq .state` = closed, `gh api .../contents/progress/130-prism-true-jxl-parity.md?ref=main` shows Status complete HONESTLY 9.5671/3.1890, `gh api pulls/145 --jq .state` = closed (superseded), `gh api pulls/149 --jq .state` = open MERGEABLE/CLEAN.
- PR #149 `opencode/issue148-retain-pr-branches` at 91dc672 diverged ahead 1 / behind 126 vs 3a521fe, merge_base 5bc4b9d shared (not orphan, `git merge-base origin/main 91dc672` = 5bc4b9d), mergeable true. Diff has zero `.github/workflows` files - App-token review safe.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 3a521fe via contents API (main now contains PR #147 merge, no workflow diff vs d362886). PAT sweep live on main (442).
- **Retain fix pending:** PR #149 at 91dc672 contains `gh pr merge ... --rebase` without --delete-branch + explicit retain note in maintainer.md:107 and AGENTS.md:61, corpus mirrors, author The Lab Engineer (CTO).
- **Lab ladder:** completed for prism; no lab needed for #149 (docs-only).
- **PR #145 closed:** `gh pr close 145` executed this run 33002274221 with superseded note; `git ls-remote origin opencode/issue130-20260825153143` still `7600377` preserved, `pulls/145` state closed dirty superseded, ledger preserved on main.

## IN FLIGHT
- **PR #149** - OPEN MERGEABLE head `91dc672b9fd57e4793bb790e8fe357e8e8fd3266` (`opencode/issue148-retain-pr-branches`, ahead 1 / behind 126 vs 3a521fe, merge_base 5bc4b9d, base 3a521fe, Closes #148). Single `lab:` commit retain fix. Review APPROVED at 18:50Z + 18:52Z at same head (14/14 PASS, no workflow files, App-token safe), Tester first PASS at 18:52:36Z at 91dc672, second Tester run 33002144903 in_progress since 18:53:02Z (issue_comment trigger). Merge deferred until second approve-test lands, then Maintainer rebase-merge without --delete-branch.
- **PR #145** - CLOSED `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, closed as superseded this run per owner 18:54Z, branch preserved). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Snapshot-imported into #147 via 93e0bf2. No active builder.
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (rebase, 38 commits, Closes #130 closed honestly). Branch preserved `2c8d3f5` via ls-remote (deleted via --delete-branch precedent, now retains via future fix).
- **Issue #148** - OPEN `[Infra] Retain PR branches after merge` - awaiting PR #149 merge via Closes #148.
- **Issue #130** - CLOSED at 17:43Z via PR #147 merge 3a521fe (honest closure, 10.1210/3.3737 byte-identical to D4c-era, no format-wire).
- **PR #146** - CLOSED head `9314283` predecessor.

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (stop-and-report) -> Research v3 COMPLETE 07:15Z -> Architect COMPLETE 07:34Z (f4c220) -> Builder T0 Q0 COMPLETE -> Q1 T1a FAIL -> Q2 T2a FAIL -> Q3 pins+engine -> Lab fix d362886 -> Continuation PR #147 -> Lab on branch 78406b0 -> T3 verdict FAIL c5a4c2d -> T4 FAIL cf37dee/124b38c -> T5 correction 2c8d3f5 (T5 NOT triggered) -> Review APPROVED 17:29Z -> Tester PASS 17:41Z -> Merge 3a521fe -> Close #130 -> Pages dispatched 32995781311 -> New infra PR #149 retain-branches at 91dc672 -> Review APPROVED 18:50Z/18:52Z -> Tester PASS 18:52:36Z + second Test in_progress 18:53Z -> Awaiting merge -> Owner close #145 superseded 18:54Z -> Next merge PR #149.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` stays 3a521fe until PR #149 merges, `gh api pulls/149 --jq .merged` false pre-merge, `gh api pulls/149 --jq .head.sha` stays 91dc672, `gh api issues/148 --jq .state` open, PR #149 files 0 workflows, `gh api pulls/145 --jq .state` stays closed.
2. Watch Tester run 33002144903 (opencode-test on PR #149, head 91dc672, in_progress since 18:53:02Z): expect `/oc approve-test` at same head with no later `/oc fix`. If `/oc fix`, route via `{"action":"fix","pr":149}` (no workflow diff, App-token safe).
3. After second approve-test, Maintainer merges via `gh pr merge 149 --rebase` (never --delete-branch), verifies `git ls-remote origin main` advances beyond 3a521fe, `gh api pulls/149 --jq .merged` true, `gh api issues/148 --jq .state` closed, `git ls-remote origin opencode/issue148-retain-pr-branches` still intact `91dc672`, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Do NOT use --delete-branch"` present, then `gh workflow run pages.yml`.
4. Monitor `gh run list` for 33002144903 completion and pages deploys; ensure no `Model not found`.
5. Freeze remains until owner explicitly lifts (M2/M3 never passed). No ideate. Next improvement requires fresh research issue only if owner re-targets VarDCT-class family.
6. Verify PR #145 stays closed superseded, branch `7600377` preserved via ls-remote.

## ISSUES
- **#148** - OPEN (retain branches, Closes via #149 at 91dc672).
- **#149** - OPEN MERGEABLE 91dc672 review+test green, second test in_progress.
- **#145** - CLOSED superseded 7600377 (executed 18:54Z per owner).
- **#130** - CLOSED (merged via #147 at 3a521fe, honest closure).
- **#147** - MERGED (3a521fe, 38 commits, Closes #130).
- **#146** - CLOSED (predecessor).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will second Tester run 33002144903 approve-test at 91dc672 (docs preview 200 OK, no workflow files)?
- Will merge correctly keep branch intact (no --delete-branch) and correctly auto-close #148?
- Will pages deploys succeed on 3a521fe and on post-149 main?
- What is owner's next research direction: new VarDCT-family issue vs honest-ledger archival?

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
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.

 - Mae, the Maintainer
