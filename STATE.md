# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~15:36Z, maintainer run 33088762853 - PR #158 Research + PR #159 Architect OPEN, Build dispatch on #159)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (11 commits, R0 1-21 complete, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae, Route 1 per-plane + fix PR #157 MERGED at 26d51c4 (5 commits 41f6d4e/593cfae/e5cf9c8/c9e7164/56dbf00, 9 files, 193/193 tests, 6 findings 4+2). Cascade 3->1 active, Route 3 FAIL cascaded to Route 1 acoder. Research PR #158 OPEN at 13a3a64 + Architect PR #159 OPEN at a56e621 both Refs #130.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f`, `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, `opencode/issue130-route3-modular-redesign` retained at `eb2b28c` after PR #156 merge (11 commits rebased to 9f51d21, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 9f51d21). Branch `opencode/issue130-route3-modular-redesign` now at `56dbf00` retained after PR #157 merge (5 commits rebased to 26d51c4, `git merge-base origin/main 56dbf00` = 9f51d21 ancestor of 26d51c4).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of 26d51c4, and R1 FAIL ledger (+194.22% median NET, R1b 0.006 PASS) now on main via 26d51c4.

## MERGE CAPABILITY (verified at 26d51c4)
- `main` = `26d51c46867b55554992f8c20475235908755c4e` LIVE (`git ls-remote origin main` = 26d51c4, `gh api /git/refs/heads/main` = 26d51c4, parent `9f51d21d970cee8e8f6bf9cedb948be18edb4743`, 5 commits from PR #157 rebased). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` still Hephaestus + no-pause mandate. `gh api .../contents/prism/docs/addendum-22-pinned-constants.md?ref=main` = 0032f62 present. `gh api .../contents/progress/130-prism-route3-modular-redesign.md?ref=main` contains R1 FAIL. Pages `Deploy static site to GitHub Pages` on main 26d51c4 SUCCESS run 33088759477, PR #158 preview success 33088312351 + PR #159 preview success 33088715790 both on 13a3a64/a56e621.
- PR #156 MERGED at `9f51d21` (rebase, no --delete-branch, head `eb2b28c` retained, branch `opencode/issue130-route3-modular-redesign` at eb2b28c, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 26d51c4, 28 files +3977/-18).
- PR #157 MERGED at `26d51c4` (rebase, no --delete-branch, head `56dbf00fb3344707705712799baa7057f14fac68` retained, branch `opencode/issue130-route3-modular-redesign` at 56dbf00, `git merge-base origin/main 56dbf00` = 9f51d21 non-orphan, ancestor of 26d51c4, 9 files 997+/244-, 5 commits). Body `Refs #130` verified - #130 stays OPEN.
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified; non-workflow merges via GITHUB_TOKEN rebase verified (PR #156 at 9f51d21 and PR #157 at 26d51c4 both via `gh pr merge --rebase`).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 26d51c4.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0, ancestor of 26d51c4), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), PR #156 branch at eb2b28c/26d51c4 (retained, ancestor), PR #157 branch at 56dbf00 retained after merge (no --delete-branch, `git ls-remote origin opencode/issue130-route3-modular-redesign` = 56dbf00).
- **Open PRs:** 2 (`gh pr list --state open` = [158 at 13a3a64, 159 at a56e621] both MERGEABLE clean, both Refs #130, no orphan `git merge-base origin/main <head>` = 26d51c4).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0+R1 FAIL MERGED at 26d51c4, Route 1 acoder Research+Architect delivered at 13a3a64/a56e621), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). Next schedule 00:00Z 2026-08-28. Lab audit 15:08:30Z run 33086031970 green.

## IN FLIGHT
- **PR #158 - OPEN at 13a3a64** (branch `opencode/issue130-route1-acoder-research`): 1 commit `13a3a64` researcher (Dr. Mob) `researcher: Route 1 acoder refinement spec - multi-pass with adaptive backend`. 1 file `prism/docs/research-route1-acoder-refinement.md` (2.6x overhead decomposition: 55% sign bypass, 16% escape bypass, model blob 0.006 bpp PASS; v1 ACoderV2 leaf reuse insight; honest arithmetic 0.4-1.1% gain, R1-series 6 phases R1-0..R1-5). Body `Refs #130` verified. Preview success 33088312351. Awaiting review->test or direct build consolidation.
- **PR #159 - OPEN at a56e621** (branch `opencode/issue130-route1-acoder-refinement`): 1 commit `a56e621` architect (blueprint + addendum 23 + progress). 3 files: `ideas/2026-08-27-prism-route1-acoder-refinement.md` (multi-pass with ACoderV2, MA-tree-only model, entropy-based split, 6 phases), `prism/docs/addendum-23-pinned-constants-route1.md` (pinned constants for R1-series), `progress/130-prism-route1-acoder-refinement.md` (R1-0..R1-5 checklist, R1-0 1-18 pending). Body `Refs #130` verified. `git merge-base origin/main a56e621` = 26d51c4 non-orphan. Preview success 33088715790. Next is Builder R1-0 harness (R1Encoder with ACoderV2 per-leaf adaptive).
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET, best_K=32 eff=5, R1b 0.006 PASS) ledger on main via 26d51c4. Cascade 3->1 per blueprint transparent.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade 08:19:10Z -> Research 33053686124 -> Architect 33054153674 -> Build R0/R1 -> PR #156 MERGED at 9f51d21 Refs #130 -> question 13:31:56Z -> build 33077311849 -> Builder pushes 41f6d4e+593cfae -> PR #157 OPEN R1 FAIL -> fix 33085758688 -> fix 33086181988 -> push 56dbf00 -> Reviewer approve 15:16:45Z + Tester approve-test 15:19:09Z -> maintainer 33087158403 MERGED PR #157 at 26d51c4 (5 commits, Refs #130) and dispatched Research on #130 -> Research 33087423100 success -> PR #158 created at 13a3a64 (Route1 acoder spec) -> Owner /oc architect 15:32:15Z -> Architect 33088356699 success -> PR #159 created at a56e621 (blueprint+addendum23+progress) -> Owner /oc build this on #158 at 15:36:25Z (run 33088738266 cancelled) + dual /oc maintainer 15:36:37Z/15:36:42Z -> **this maintainer 33088762853 dispatches Build on PR #159 for R1-0 harness**

## NEXT-RUN PLAYBOOK
1. Verify Builder dispatch on PR #159: `gh run list --limit 10 --json name,status,conclusion,headBranch | grep opencode` + `gh pr view 159 --json headRefOid`. Builder should land `r1_encoder.h/.cpp` with ACoderV2 per-leaf adaptive, entropy-based MA-tree, progress R1-0 1-18 -> exit when all VB rails green + addendum23 + CSV.
2. Handle PR #158 (research docs): review or consolidate. Since PR #159 lacks research doc, next maintainer should verify if Builder on PR #159 pulled research via fetch or if PR #158 needs review->merge first. If Builder stalls, dispatch `review` on PR #158 (head 13a3a64) to merge research before next build.
3. Verify pages green after next merge: `gh run list --event push` for Deploy on 26d51c4 already success 33088759477; after next PR merge verify again or `gh workflow run pages.yml`.
4. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly or orphan detected. Verify `git merge-base origin/main <next-pr-head>` non-empty before any future merge.
5. Both-units gates M2 <9.498/<3.166 and M3 <8.655/<2.885 vs REAL cjxl remain binding; all ledger merges use `Refs #130` until gates pass. Honest arithmetic: Route 1 alone projects 0.4-1.1% (needs 6.15% more for M2), so cascade to Route 2 (hybrid-uint) queued if R1-1 <+0.5%.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular R0 MERGED at 9f51d21 Refs #130; R1 FAIL +194.22% + Route1 per-plane MERGED at 26d51c4 Refs #130; Route 1 acoder Research at 13a3a64 + Architect at a56e621 both OPEN Refs #130, R1-0 harness pending, 193 tests on main, 2.6x blocker -> acoder path)
- **#158** - OPEN at 13a3a64 (Research Route1 acoder spec, 1 file, Refs #130, preview success, awaiting review/build consolidation)
- **#159** - OPEN at a56e621 (Architect Route1 acoder blueprint, 3 files, Refs #130, preview success, Build dispatched this run)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z, Lab audit green 15:08:30Z.
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Builder on PR #159 land R1-0 harness that reuses v1 acoder_encode_plane_leaves_v2 with pre-computed leaf IDs and adaptive per-leaf coding while recomputing leaf IDs in decode (no storage)?
- Will R1-1 measurement (>=+0.5% NET adaptive vs adaptive) show any multi-pass gain, or will it confirm that 0.4-1.1% is insufficient and require cascade to Route 2 hybrid-uint?
- Will entropy-based MA-tree splitting beat variance-based splitting by >=+0.3% (R1-2 gate) or will variance remain?
- Will research doc on PR #158 need separate merge before Builder on PR #159 can reference it, or will Builder fetch it via API?
- Will pages and preview infra stay green after fragmented research/architect branches (both at 26d51c4 base, no conflict)?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main (or branch head for branch fixes).
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging (Refs #130 keeps issue open until gates pass).
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen`.
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.
- Anti-Surrender + No-Pause: never close a gated performance issue on a negative result, never stall waiting for Owner to pick a path - document cascade transparently, autonomously select most promising route, and immediately dispatch squad; only Owner can halt.
- Orphan-main protection: verify `git merge-base origin/main <pr-head>` exists before merging; if empty, re-link via `git checkout -B <branch> origin/main && git cherry-pick <own commits>` before merge, never force-push to main.

 - Hephaestus, the Maintainer
