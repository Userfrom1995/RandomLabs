# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~20:05Z, maintainer run 33008642108 - issue_comment on #147, owner reopened #130 for Prism v4, Hephaestus ignition)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Maintainer is now **Hephaestus** (succeeds Mae, lineage preserved). Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. All progress preserved verbatim. (Previous freeze 2026-08-23T16:22Z superseded for Prism: board remains frozen for new projects, Prism is active priority.)
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130 and orders Prism v4 ignition using all V1/V2/V3 learnings, iterating versions until M2/M3 genuinely pass. "From now on, we keep iterating on versions and approaches until we achieve the target performance gates."
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. LIVE at 2bd51b via `.github/agents/maintainer.md:107` `gh pr merge <N> --rebase` without --delete-branch (verified `git ls-remote origin opencode/issue148-retain-pr-branches` = 91dc672).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Historical - merge PR #131 as ledger only. Superseded by T-series honest closure at 3a521fe.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z) + AUTONOMOUS PIVOT (2026-08-26T07:12:57Z):** Mae had free hand on architectural pivots. Inherited by Hephaestus with Anti-Surrender escalation. Hard restriction remains: M2/M3 dual-unit gates never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement.

## MERGE CAPABILITY (verified at 2bd51b)
- `main` = `2bd51b7b515188d172bdc412a519a6c983afb2cc` LIVE (owner push chore Hephaestus, parent `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` retain fix, grandparent `3a521fe233e98b318c1a6de1b173fa231a55eba1` prism honest closure). Verify: `git ls-remote origin main` = 2bd51b, `gh api .../commits/2bd51b --jq .parents[0].sha` = aa2285d, compare aa2285d...2bd51b status ahead 1 shared history, not orphan.
- PAT sweep live on main (596 lines, PAT-backed merge at 442) verified via contents API at 2bd51b; App-token merge for docs-only safe, workflow-touching still requires PAT. `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Hephaestus"` = 1 present, `grep -n "Do NOT use --delete-branch"` = 108 present.
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (4x opencode.yml `mimo-v2.5-free`, 1029 `muse-spark`), pages deploy 33008164543 success 20:00:32Z on 2bd51b.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2bd51b (no workflow diff vs aa2285d except identity).
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, seed Hephaestus with Mae lineage, Anti-Surrender Doctrine 27, `.github/workflows/maintainer.yml` retains PAT sweep. All verified on main at 2bd51b.
- **Retain fix LIVE:** `AGENTS.md:61` + corpus mirrors verified on main at 2bd51b (22-file diff vs aa2285d docs/agents only).
- **Open PRs:** 0 (`gh pr list --state open` = [] at 20:05Z). Branches retained: `opencode/issue130-20260825153143` at 7600377, `opencode/issue130-20260826070009` at 2c8d3f5, `opencode/issue148-retain-pr-branches` at 91dc672 via `git ls-remote`.
- **Open issues:** #130 (Prism, REOPENED active), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d, #130 reopened 20:01:21Z.

## IN FLIGHT
- **Issue #130 - Prism v4 ignition** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, directive `research` dispatched this run (33008642108). Prior ledger: V1 C-series + D4c -1.65 pct (e1 10.1210/3.3737), E-series, V+S (S4 FAIL 9.5638/3.1879), T-series (T0 GREEN, T1a FAIL -32.76 vs +2.00, T2a FAIL -13.09 vs +0.50, T3 bar(i) FAIL -2.11 vs +1.50, T4 9.5671/3.1890 FAIL, T5 NOT triggered) - all with committed CSVs, 144/144 tests, honest closure at 3a521fe. V4 must use all learnings, version-iterate until M2/M3 pass. Next: Researcher delivers `prism/docs/research-v4-*` with gap decomposition, harness re-derivation, binding gates, then Architect.
- **PR #149** - MERGED at `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` (rebase, 1 commit lab, Closes #148, branch retained 91dc672).
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (rebase, 38 commits, Closes #130 originally, branch retained 2c8d3f5). Ledger preserved on main.
- **PR #145** - CLOSED superseded `7600377b48f4760156ec3a005b0de060221f3dbf` (branch preserved).
- **Issue #148** - CLOSED via PR #149 at aa2285d (retain branches).
- **#70** - Lab Health & Audit Logs - current (49 comments).
- **#42** - Brainstorm Board FROZEN for new projects (Prism exempt under re-activation).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL -> Research v3 DONE -> Architect DONE -> Builder T-series T0/T1a/T2a/T3/T4 FAIL -> Lab fix d362886 -> PR #147 T5 correction 2c8d3f5 -> Review APPROVED 17:29Z -> Tester PASS 17:41Z -> Merge 3a521fe -> Close #130 honestly -> Retain fix PR #149 91dc672 -> Review APPROVED 18:51Z/53Z -> Tester PASS 18:52Z/58Z -> Merge aa2285d 19:00Z without --delete-branch -> Pages success 33002979705 -> Hephaestus transition 2bd51b 01:30 IST -> Owner reopened #130 20:01Z + directive 20:05Z -> **Maintainer run 33008642108 dispatched research on #130 for Prism v4** -> Awaiting Researcher spec.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` stays 2bd51b, `gh api issues/130 --jq .state` = open REOPENED, `gh api pulls/147 --jq .merged` true, `gh api pulls/149 --jq .merged` true, `git ls-remote origin opencode/issue148-retain-pr-branches` = 91dc672, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep Hephaestus` present.
2. Watch Researcher run on #130: `gh pr list --state open` should show new `opencode/issue130-*` or research docs PR, `gh api issues/130/comments --paginate | grep Research` for delivery, `gh run list --json` for `opencode` research success. Verify `prism/docs/research-v4-*` lands with binding gates and decision-tree rows pre-registered.
3. After research lands, dispatch Architect via `{"action":"architect","issue":130}` - verify blueprint at `prism/docs/architecture-v4-*` with module map, then Builder `build`/`continue` until M2/M3 pass.
4. No merge of any Prism v4 PR until dual-unit M2 AND M3 pass both units with fresh `prism bench --kodak` measurement byte-identical to committed CSVs; no success claim without it.
5. Brainstorm ideate stays blocked (Prism is sole priority); lab/auditor only on infra need; model pins stay `mimo-v2.5-free` - verify each sweep.

## ISSUES
- **#130** - REOPENED active - Prism v4 research dispatched (2bd51b, run 33008642108, awaiting spec).
- **#149** - MERGED at aa2285d (91dc672 retained, Closes #148).
- **#148** - CLOSED via #149 at aa2285d.
- **#147** - MERGED at 3a521fe (38 commits, Closes #130 originally).
- **#145** - CLOSED superseded 7600377 (branch preserved).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Researcher deliver Prism v4 clean-slate spec with VarDCT/transform-coding economics quantifying remaining ~14.5 pct gap to M3?
- Will Hephaestus version escalation break the ~9.52 predict-and-code ceiling where T-series stalled?
- Pages remains green on 2bd51b (33008164543 success) - no re-dispatch needed unless main advances via research/architect work.

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
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen`.
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.
- Anti-Surrender: never close a gated performance issue on a negative result - only Owner can halt; version-iterate until gates pass.

 - Hephaestus, the Maintainer
