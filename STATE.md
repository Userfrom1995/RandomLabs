# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~18:48Z, maintainer run 33001671982 - issue #148 opened, PR #149 review dispatched at 91dc672)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) - RESOLVED via honest closure at 3a521fe: #130 closed honestly after full T-series negative ledger, gates never passed but program stops at decision tree row 1 final clause. Freeze remains in effect until owner explicitly lifts (closure was without M2/M3 pass).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist - blueprint LIVE at f4c220. Builder T-series executed through T5 correction at 2c8d3f5 then merged as 3a521fe.
- **BRANCH RETENTION DIRECTIVE (2026-08-26T18:47:55Z, issue #148 by Userfrom1995):** Maintainer must never delete PR branches after merging; branches preserved intact for history, reference, and recovery. PR #149 implements via removal of `--delete-branch` in `.github/agents/maintainer.md:107-108` and `AGENTS.md:61`, plus meridian corpus.

## MERGE CAPABILITY (verified)
- `main` = `3a521fe233e98b318c1a6de1b173fa231a55eba1` LIVE (merge commit for PR #147 `builder: Prism v3 T-series (T0/T1a/T2a/T3) measurement program (#130)` rebased, 38 commits, Closes #130, opencode.json mimo-v2.5-free). Previous `d362886` lab fix included.
- Verify: `git ls-remote origin main` = 3a521fe, `gh api pulls/147 --jq .merged` = true, `gh api issues/130 --jq .state` = closed, `gh api .../contents/progress/130-prism-true-jxl-parity.md?ref=main` shows Status complete HONESTLY 9.5671/3.1890.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 3a521fe via contents API (main now contains PR #147 merge, no workflow diff vs d362886). PAT sweep live on main (442) per `maintainer.yml:442` contents API.
- **Branch-retention change pending:** PR #149 at 91dc672 removes `--delete-branch` from maintainer docs; workflow diff at `maintainer.yml:439-514` removes PAT-backed merge sweep and rewrites held-run approval logic - under review, not yet on main.
- **Pages:** last dispatch run 32995781311 success on 3a521fe; current PR preview for #149 live at /preview/pr-149/ via pages.yml PR preview job (Deploy static site run 33001710192 in_progress at 18:48Z).

## IN FLIGHT
- **PR #149** - OPEN head `91dc672b9fd57e4793bb790e8fe357e8e8fd3266` (`opencode/issue148-retain-pr-branches`, 1 commit `lab: retain PR branches after merge (Fixes #148)`, author The Lab Engineer, base 3a521fe? actually git merge-base 5bc4b9d shared after unshallow, 1 ahead / 0 behind 5bc4b9d but with main 3a521fe? Need rebase check - currently `gh api pulls/149 --jq .mergeable` = MERGEABLE, files: `.github/agents/maintainer.md:104-108`, `AGENTS.md:61`, `meridian/corpus/0007-maintainer.txt`, `meridian/corpus/0010-agents.txt`, plus `.github/workflows/maintainer.yml` PAT/approval changes. Closes #148 in body. Review dispatched this run (head pin 91dc672), awaiting Tester. NOT merge-ready until approve + approve-test at same head with no later fix.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 1 behind d362886, now CONFLICTING vs 3a521fe, MERGEABLE=CONFLICTING post-merge). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger; snapshot-imported into #147 via 93e0bf2. No active builder. Decision to close as superseded vs keep as ledger pending next sweep.
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (branch `opencode/issue130-20260826070009` deleted via --delete-branch under old policy, base d362886). Issue #130 closed.
- **Issue #148** - OPEN (infra, branch retention, Userfrom1995 2026-08-26T18:47:55Z). PR #149 opened to address; review in flight.
- **Issue #130** - CLOSED at 17:41Z via PR #147 merge 3a521fe (honest closure).
- **Issues #70/#42** - Lab Health & Brainstorm Board (frozen).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL -> Research v3 COMPLETE -> Architect COMPLETE (f4c220) -> Builder T0-T5 COMPLETE honest closure 3a521fe -> Review APPROVED -> Tester PASS -> Merge 3a521fe -> Close #130 -> Pages dispatch -> **New infra lane:** Issue #148 opened -> PR #149 branch-retention fix -> Review dispatched this run (next: review approve -> test -> maintainer merge without --delete-branch, verify branch retained).

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` stays 3a521fe until PR #149 merges, then advances to new sha with maintainer.md without --delete-branch live via contents API `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Do NOT use --delete-branch"`.
2. Monitor PR #149: `gh api pulls/149 --jq '{state,merged,mergeable,headSha,mergeable_state}'` and `gh pr view 149 --json comments` for Reviewer `/oc approve` or `/oc fix` with exact file:line. If fix, dispatch `lab` via `{"action":"lab","issue":148}` per infra routing guard (never fix/continue on workflow-touching PR). If approve, dispatch `{"action":"test","pr":149}` next sweep, then merge via `gh pr merge 149 --rebase` (no delete-branch) after approve-test with orphan guard `git merge-base origin/main 91dc672`.
3. After PR #149 merge, verify `git ls-remote origin opencode/issue148-retain-pr-branches` still exists (retained) and `gh api pulls/149 --jq .merged` true with branch not deleted, then close issue #148 via Closes keyword check + manual close if needed, and verify-and-dispatch `pages.yml`.
4. Evaluate PR #145 parked CONFLICTING: `gh pr view 145 --json mergeable` now CONFLICTING; decide to close as superseded by T-series (comment rationale) vs keep archival; no builder work.
5. Freeze remains until owner lifts; no ideate dispatches despite board #42. No emergency (lab track succeeded at 3a521fe, production not halted).
6. Ensure workflow changes in PR #149 (PAT sweep removal, approval inlining) are vetted by Reviewer - do not merge if they regress PAT capability or held-run sweep (issue #137 fix).

## ISSUES
- **#148** - OPEN (branch retention, review dispatched on #149 at 91dc672)
- **#149** - OPEN (infra PR for #148, review in flight)
- **#145** - OPEN CONFLICTING 7600377 parked V+S ledger (evaluate)
- **#147** - MERGED (3a521fe, Closes #130)
- **#130** - CLOSED (honest closure)
- **#70** - Lab Health & Audit Logs - current
- **#42** - Brainstorm Board FROZEN

## OPEN QUESTIONS
- Will Reviewer approve PR #149 or request fixes for the maintainer.yml PAT/approval regressions?
- After PR #149 merges without --delete-branch, will branch `opencode/issue148-retain-pr-branches` be retained as required and will `git ls-remote` confirm it?
- What is disposition of PR #145 CONFLICTING ledger now that T-series supersedes it?
- Is freeze lifted after honest closure without M2/M3 pass, or remains until future program genuinely passes? Awaiting owner.

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
- PR branches must be retained after merge (issue #148) - never use `--delete-branch` on `gh pr merge`; recovery/orphan re-link remains via cherry-pick, not history merge.
 - Mae, the Maintainer
