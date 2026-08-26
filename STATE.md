# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~19:00Z, maintainer run 33002666385 - PR #149 retain-branches merged)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) - RESOLVED via honest closure at 3a521fe: #130 closed honestly after full T-series negative ledger, gates never passed but program stops at decision tree row 1 final clause. Freeze remains until owner explicitly lifts.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains CLOSED and M2/M3 gates remain strictly in effect.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging (history/reference/recovery). PR #149 implemented fix and MERGED at aa2285d 19:00:39Z via `gh pr merge 149 --rebase` without --delete-branch, branch 91dc672 retained.
- **CLOSE #145 AS SUPERSEDED (2026-08-26T18:54:25Z, owner on #147):** Owner directed close of PR #145 as superseded. Executed via `gh pr close 145` with superseded ledger note.

## MERGE CAPABILITY (verified)
- `main` = `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` LIVE (rebase merge for PR #149 `lab: retain PR branches after merge (Fixes #148)`, 1 commit, Closes #148). Previous `3a521fe233e98b318c1a6de1b173fa231a55eba1` (prism honest closure) parent. Branch `opencode/issue148-retain-pr-branches` retained at 91dc672 via `git ls-remote` (no --delete-branch).
- Verify: `git ls-remote origin main` = aa2285d, `gh api pulls/149 --jq .merged` = true (merged_at 2026-08-26T19:00:39Z), `gh api issues/148 --jq .state` = closed, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Do NOT use --delete-branch"` = 108 present, `AGENTS.md:61` and corpus mirrors verified on main, `git ls-remote origin opencode/issue148-retain-pr-branches` = 91dc672 intact.
- PAT sweep live on main (596 lines, PAT-backed merge at 442) verified via contents API; App-token merge for docs-only PR #149 safe (0 workflow files).
- `gh api pulls/149 --jq .head.sha` = 91dc672, merge_base 5bc4b9d shared (not orphan, `git merge-base origin/main 91dc672` = 5bc4b9d).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at aa2285d (no workflow diff vs prior 3a521fe except retain fix). PAT sweep live.
- **Retain fix LIVE:** `.github/agents/maintainer.md:107` now `gh pr merge <N> --repo <owner>/<repo> --rebase` without --delete-branch + explicit retain note at 108, `AGENTS.md:61` same, corpus mirrors `meridian/corpus/0007-maintainer.txt:90-91`, `meridian/corpus/0010-agents.txt:57` - all verified on main at aa2285d.
- **Lab ladder:** completed for prism and retain-branches; no lab needed.
- **Open PRs:** 0 (PR #149 merged, PR #145 closed superseded 7600377, PR #147 merged 3a521fe). `gh pr list --state open` = empty.
- **Open issues:** #70 (lab-health), #42 (brainstorm frozen) only. #148 closed via #149, #130 closed honestly, #143 closed via #144 earlier.

## IN FLIGHT
- **PR #149** - MERGED at `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` (rebase, 1 commit lab, Closes #148 closed). Head 91dc672 retained via `git ls-remote origin opencode/issue148-retain-pr-branches`. Review APPROVED 18:51:47Z + 18:53:01Z at same head (14/14 PASS, no workflow files, App-token safe), Tester PASS 18:52:36Z + 18:58:36Z at same head (DYNAMIC TEST PASS, preview 200 OK, docs intact, no secrets/PAT). Merge via `gh pr merge 149 --rebase` without --delete-branch at 19:00:39Z verified.
- **PR #145** - CLOSED `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, closed as superseded per owner 18:54Z, branch preserved 7600377).
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (rebase, 38 commits, Closes #130 closed honestly, branch preserved 2c8d3f5).
- **Issue #148** - CLOSED via PR #149 merge (retain branches, verified `gh api issues/148 --jq .state` closed).
- **Issue #130** - CLOSED at 17:43Z via PR #147 merge 3a521fe (honest closure, 9.5671/3.1890).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL -> Research v3 COMPLETE -> Architect COMPLETE (f4c220) -> Builder T-series T0/T1a/T2a/T3 FAIL -> Lab fix d362886 -> PR #147 continuation -> T5 correction 2c8d3f5 -> Review APPROVED -> Tester PASS -> Merge 3a521fe -> Close #130 -> Pages dispatched -> New infra PR #149 retain-branches at 91dc672 -> Review APPROVED 18:51Z/18:53Z -> Tester PASS 18:52Z + 18:58Z -> **Maintainer merge aa2285d 19:00Z without --delete-branch, Closes #148, branch retained** -> Pages trigger pending.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` stays aa2285d, `gh api pulls/149 --jq .merged` true, `gh api issues/148 --jq .state` closed, `git ls-remote origin opencode/issue148-retain-pr-branches` = 91dc672 intact, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Do NOT use --delete-branch"` = 108 present, `gh pr list --state open` = 0.
2. Watch `gh run list` for pages.yml deploy after aa2285d (trigger via hardcoded `Trigger pages deployment if main advanced` step); if not dispatched, `gh workflow run pages.yml`.
3. Monitor `gh run list` for any held runs (none expected; retain PR is docs-only, no workflow files).
4. Freeze remains until owner explicitly lifts (M2/M3 never passed). No ideate. Next improvement requires fresh research issue only if owner re-targets VarDCT-class family.
5. No further merge needed; PR branches retain rule now LIVE on main - future merges must never use --delete-branch.

## ISSUES
- **#148** - CLOSED (retain branches, Closes via #149 at aa2285d, 91dc672 retained).
- **#149** - MERGED at aa2285d (91dc672, review+test green, merged without --delete-branch).
- **#145** - CLOSED superseded 7600377 (executed 18:54Z per owner).
- **#130** - CLOSED (merged via #147 at 3a521fe, honest closure).
- **#147** - MERGED (3a521fe, 38 commits, Closes #130).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will pages deploy succeed on aa2285d (site 200 OK, preview infra intact)?
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
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen`.
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.

 - Mae, the Maintainer
