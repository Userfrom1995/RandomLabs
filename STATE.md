# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~20:50Z, maintainer run 33115222558 - PR #160 R1-1 FAIL ledger review dispatched)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (11 commits, R0 1-21 complete, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae (via PR #157 MERGED at 26d51c4 with Route 1 per-plane fix). Route 3 -> Route 1 cascade now at Research MERGED 7b07f7f (research spec e327484, 1 file) + Architect+Build PR #159 MERGED at 2549b36 (blueprint + addendum23 + R1-0 harness COMPLETE 18/18 + harness-integrity fixes + Tester CSV fix, 9 commits -> 8 rebased, Reviewer approve 17:40:48Z + Tester approve-test 17:51:36Z). Route 1 R1-1 now MEASURED FAIL at PR #160 (see In Flight).
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f`, `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, `opencode/issue130-route3-modular-redesign` retained at `eb2b28c` after PR #156 merge and at `56dbf00` after PR #157 merge, `opencode/issue130-route1-acoder-research` at `13a3a64` retained after PR #158 merge at 7b07f7f, `opencode/issue130-route1-acoder-refinement` at d79e729 retained after PR #159 merge at 2549b36 (no --delete-branch, `git ls-remote origin opencode/issue130-route1-acoder-refinement` = d79e729, `git merge-base origin/main d79e729` = d79e729 ancestor of 2549b36).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved via `prism/docs/research-complete-negative-ledger.md` + `ideas/2026-08-26-prism-honest-closure.md` both ancestors of 2549b36, R1 FAIL ledger (+194.22% median NET) via 26d51c4, Route 1 acoder spec (2.6x bypass overhead, ACoderV2 leaf-reuse, 0.4-1.1% gain) via 7b07f7f, R1-0 adaptively coded multi-pass MERGED at 2549b36, R1-1 FAIL ledger now on PR #160 (+2.27% median regression).

## MERGE CAPABILITY (verified at 2549b36)
- `main` = `2549b36c6d469e37e66ce52638e5b69c592e1776` LIVE (`git ls-remote origin main` = 2549b36, parent `7b07f7f20c6c500b950740dcf48c0401128dbe0b`, 8 commits from PR #159 rebased at 2026-08-27T17:52:39Z). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (two-knob verified). `gh api .../contents/.github/agents/maintainer.md?ref=main` still Hephaestus + no-pause mandate. `gh api .../contents/prism/docs/research-route1-acoder-refinement.md?ref=main` = `e327484` verified. `gh api .../contents/prism/docs/addendum-23-pinned-constants-route1.md?ref=main` = 9364d6c present. `gh api .../contents/progress/130-prism-route1-acoder-refinement.md?ref=main` 18/18 complete (R1-0 COMPLETE, R1-1 pending on main - PR #160 advances it). Pages `Deploy` on 2549b36 success via 33100661848 + 33100736247 workflow_dispatch.
- PR #159 MERGED at `2549b36` (rebase, no --delete-branch, head `d79e729` retained, `git merge-base origin/main d79e729` = d79e729 ancestor). PR #158 MERGED at `7b07f7f`, PR #157 MERGED at `26d51c4`, PR #156 MERGED at `9f51d21`.
- Merge for workflow-touching PRs via PAT sweep verified; non-workflow merges via GITHUB_TOKEN rebase verified (PR #159 at 2549b36 via `gh pr merge --rebase`).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2549b36.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0 ancestor of 2549b36), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #159 at d79e729 after merge at 2549b36, tag `recover/159` present.
- **Open PRs:** 1 - PR #160 `opencode/issue130-route1-r1-1-measurement` at `c42e417c491fb1945117c0d0255eadead0d807a8` OPEN MERGEABLE CLEAN, branch `c42e417` non-orphan (`git merge-base origin/main c42e417` = 2549b36). Body `Refs #130` (keeps #130 open).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0+R1 FAIL MERGED, Route 1 acoder Research MERGED at 7b07f7f, R1-0 MERGED at 2549b36, R1-1 FAIL measured on PR #160), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). Next schedule 00:00Z 2026-08-28. Pages deploy on main 2549b36 success.
- **Lab nominal:** no held action_required on main, no orphan, no CreditsError, no workflow-blocking. PR #160 preview deploying via Deploy static site (workflow_dispatch).

## IN FLIGHT
- **PR #160 - OPEN at c42e417** (branch `opencode/issue130-route1-r1-1-measurement` 2 commits: `5caf7ff` R1-1 probe + progress update, `c42e417` decision doc): 4 files `prism/src/cli/main.cpp` (+65/-13 R1-1 gates per addendum 23), `prism/benchmarks/results/2026-08-27-r1-1-quad-sweep.csv` (42 lines, K16/32/64 x eff 3/5/7, median +2.27% WORSE), `progress/130-prism-route1-acoder-refinement.md` (R1-1 FAIL ledger, R1-2..R1-5 skipped per blueprint decision tree), `.github/agents/decisions/builder/2026-08-27T20-50-00-r1-1-fail.md` (R1-1 FAIL decision record). Gates: primary FAIL (+2.27% vs <=-0.5%), R1-1a PASS (0.0006-0.001 bpp <=0.005), R1-1b FAIL (all regress +1.3-3.3%), R1-1c PASS (1.06-1.08x <=1.5x). Root cause: MA-tree K=16-128 leaf contexts less discriminative than v1 343 contexts + 16 priors. Refs #130 - merge preserves ledger.
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET) ledger on main via 26d51c4 -> 7b07f7f -> 2549b36.
- **Route 1 acoder Research MERGED at 7b07f7f:** ancestor of 2549b36, spec e327484.
- **Reviewer DISPATCHED this run for PR #160** on pinned head c42e417; next is Tester on same head, then merge Refs #130, then autonomous Research for Route 2 hybrid-uint per cascade.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade 08:19:10Z -> Research 33053686124 -> Architect 33054153674 -> Build R0/R1 -> PR #156 MERGED at 9f51d21 Refs #130 -> build 33077311849 -> PR #157 MERGED at 26d51c4 Refs #130 -> Research 33087423100 -> PR #158 MERGED at 7b07f7f Refs #130 -> Architect 33088356699 -> PR #159 MERGED at 2549b36 Refs #130 (R1-0 COMPLETE 18/18) -> Builder R1-1 sweep on `opencode/issue130-route1-r1-1-measurement` 331144... -> PR #160 OPEN at c42e417 (R1-1 FAIL ledger) -> **maintainer 33115222558 dispatched Reviewer on PR #160 (this run)**. Next: Tester approve-test -> merge PR #160 Refs #130 -> dispatch Research for Route 2 hybrid-uint (no-pause).

## NEXT-RUN PLAYBOOK
1. Verify Reviewer run for PR #160: `gh run list --limit 10` for opencode-review on c42e417, `gh pr view 160 --json comments` for /oc fix or /oc approve. If fix: apply on branch via Fixer (`fix`); if approve: dispatch Tester (`test`).
2. After Tester approve-test with no newer fix: merge PR #160 via `gh pr merge 160 --rebase` (no --delete-branch, verify `git merge-base origin/main c42e417` non-empty). Then verify pages deploy and dispatch Research for Route 2 hybrid-uint on #130 (R1-1 FAIL closes R1-series; Route 2 is next in 3->1->2 cascade). Do not dispatch Route 2 research before PR #160 merge lands on main.
3. Pages auto-deploy: verify `Deploy static site to GitHub Pages` success on merged main SHA; if not triggered, `gh workflow run pages.yml`.
4. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly. Both-units gates M2 <9.498/<3.166 and M3 <8.655/<2.885 vs REAL cjxl remain binding; all ledger merges use `Refs #130` until gates pass.
5. Verify branch retention after merge: `git ls-remote origin opencode/issue130-route1-r1-1-measurement` = c42e417 and `git merge-base origin/main c42e417` = c42e417 ancestor.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular R0 MERGED at 9f51d21 Refs #130; R1 FAIL +194.22% at 26d51c4 Refs #130; Route 1 acoder Research MERGED at 7b07f7f Refs #130; Architect+Build R1-0 MERGED at 2549b36 Refs #130 R1-0 COMPLETE 18/18, R1-1 FAIL ledger on PR #160 OPEN at c42e417 awaiting review->test->merge, then Route 2 hybrid-uint queued per cascade)
- **#160** - OPEN - PR #160 R1-1 FAIL ledger (adaptive vs adaptive baseline, pinned quad K16/32/64 x eff3/5/7, primary +2.27% FAIL, R1-1a PASS, R1-1b FAIL, R1-1c PASS, CSV dated 2026-08-27, Reviewer dispatched this run on c42e417, Refs #130)
- **#159** - MERGED at 2549b36 (Architect Route1 acoder blueprint + R1-0 harness COMPLETE 18/18, Refs #130, Reviewer approve 17:40:48Z + Tester approve-test 17:51:36Z, 193/193, branch retained at d79e729)
- **#158** - MERGED at 7b07f7f (Research Route1 acoder spec, Refs #130, Reviewer approve + Tester approve-test)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z, pages success on 2549b36.
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Reviewer+Tester approve PR #160 ledger (gates correctly measured per addendum 23, CSV byte-matched, no workflow touches)? Merge must stay `Refs #130`.
- Will Route 2 hybrid-uint (remove ZFF pathology, reopen predictor headroom) after R1-1 FAIL deliver the M2/M3 21% gap, or will it require exotic multi-pass static ANS composition?
- Will entropy-based MA-tree splitting (R1-2) have been worth testing if R1-1 had passed +0.5%; now skipped per blueprint, was skipping correct vs exploring feature-add path?
- Will pages and preview infra stay green after PR #160 merge (new commits on top of 2549b36)?
- Will both-units gates M2/M3 be approached after Route 2, or will cascade require composition at R1-5 <9.35/<3.117 threshold?

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
