# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~23:22Z, maintainer run 33022877274 - issue_comment on PR #155 `/oc maintainer` at 23:18:47Z, merge execution)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. For Prism #130, Owner explicitly authorized honest closure path (architect blueprint `ideas/2026-08-26-prism-honest-closure.md`) after 7 programs measured and rejected.
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130, orders iteration until M2/M3 genuinely pass. Current honest-closure path is owner-authorized closure at achieved level (path 1 of 3 in blueprint) - not a gate bypass.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f` and `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge.
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Honest closure reports FAIL honestly (e1 10.1210/3.3737, -8.21% vs 11.026 baseline, ~16.9% above JXL parity at e1) - not a gate lift.
- **BRAINSTORM FREEZE (2026-08-23T16:22Z via #130):** All other lab work FROZEN (Brainstorm board frozen, no Ideator) until M2/M3 genuinely pass - exempt for honest-closure documentation PR #155 (now merged).

## MERGE CAPABILITY (verified at 3d76bdb)
- `main` = `3d76bdb80b8c057759fe3fc187a854d66240e9b6` LIVE (`git ls-remote origin main` = 3d76bdb, `gh api /git/refs/heads/main` = 3d76bdb, merge_commit `3d76bdb` from PR #155 rebase, `gh api pulls/155 --jq .merged` true). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged).
- PR #155 MERGED at `3d76bdb` (head `526b71f` retained, branch `opencode/issue130-20260826225806` at 526b71f, `git merge-base origin/main 526b71f` = 2283012 shared history, non-orphan rebase). Verify branch retention: `gh api /git/refs/heads/opencode/issue130-20260826225806` still 526b71f.
- Prior tip mismatch documented: PR #153 merge_commit `64b4006` not on current main tip lineage (exists but not ancestor of 3d76bdb), `2283012` was intermediate; now superseded by `3d76bdb`. No orphan-divergence on current merge.
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified; this merge used standard App-token rebase (no workflow files touched).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 3d76bdb.
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender Doctrine, `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f) and PR #155 (526b71f).
- **Open PRs:** 0 (`gh pr list --state open` = [] after merge).
- **Open issues:** #130 (Prism, OPEN - honest closure delivered on main, awaiting Owner to close at achieved level), #70 (lab-health), #42 (brainstorm frozen).

## IN FLIGHT
- **PR #155 - MERGED at 3d76bdb** - `researcher: complete negative ledger after U1 FAIL - path forward documented (Refs #130)` - CLOSED MERGED. Researcher `research-complete-negative-ledger.md` + Architect `ideas/2026-08-26-prism-honest-closure.md` + Builder closure (progress trackers Status complete (closed), decision records) all on main via rebase. Review 14/14 APPROVED run 33022496510 + Tester APPROVED run 33022648619 at same head 526b71f. `Refs #130` preserves issue.
- **Issue #130 - Prism honest closure DELIVERED** - OPEN, ledger + blueprint + instrument on main at 3d76bdb. Achieved corpus e1 10.1210/3.3737, T4 9.5671/3.1890, M2 FAIL (<9.498/<3.166) M3 FAIL (<8.655/<2.885) both units. Blueprint documents three owner-authorized paths; path 1 (honest closure) now on main. Awaits Owner evaluation/close or directive for paths 2/3.

## PIPELINE POSITION
Researcher COMPLETE -> Architect COMPLETE -> Builder COMPLETE -> Review APPROVE -> Test APPROVE -> Maintainer MERGED PR #155 at 3d76bdb. Honest closure is on main; next is Owner decision on #130 (close at achieved level vs authorize path 2 multi-pass histograms or path 3 JXL-Modular redesign). Lab freeze still technically in force until M2/M3 genuinely pass, but honest-closure exemption has been satisfied - awaiting Owner to lift or redirect.

## NEXT-RUN PLAYBOOK
1. Verify main at 3d76bdb: `git ls-remote origin main`, `gh api .../contents/prism/docs/research-complete-negative-ledger.md?ref=main` exists, `gh api .../contents/ideas/2026-08-26-prism-honest-closure.md?ref=main` exists.
2. Monitor `gh issue view 130 --json state` - if Owner closes #130, update STATE to reflect closure and consider lifting brainstorm freeze per Owner directive.
3. Check `gh run list --event push` for `Deploy static site to GitHub Pages` on head 3d76bdb - if not triggered within 2 min of merge, dispatch `gh workflow run pages.yml` (verify `gh api .../contents/index.html?ref=main` preserved).
4. No dispatch of Builder/Architect/Research on #130 until Owner authorizes path 2 or 3 (both require new research phases).
5. Periodic health: `gh pr list --state open` should be 0; if new PRs appear, route via research->architect->build per standing track.

## ISSUES
- **#130** - OPEN - Prism honest closure delivered on main via PR #155 (awaiting Owner close; Refs kept open honestly).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (awaiting Owner lift post-#130 decision).

## OPEN QUESTIONS
- Will Owner close #130 at achieved level or authorize path 2/3 (multi-pass or Modular redesign)?
- Will `pages.yml` deploy succeed on new main 3d76bdb? Verify `https://Userfrom1995.github.io/RandomLabs/` and preview not needed (no open PRs).
- Will brainstorm freeze be lifted after honest closure acceptance?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main (or branch head for branch fixes).
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging (Refs #130 keeps issue open).
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen`.
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.
- Anti-Surrender: never close a gated performance issue on a negative result - only Owner can halt; version-iterate until gates pass (honest closure is Owner-authorized, not a bypass).
- Orphan-main protection: verify `git merge-base origin/main <pr-head>` exists before merging; if empty, re-link via `git checkout -B <branch> origin/main && git cherry-pick <own commits>` before merge, never force-push to main.

 - Hephaestus, the Maintainer
