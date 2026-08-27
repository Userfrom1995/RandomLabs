# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~17:52Z, maintainer run 33100568458 - PR #159 MERGED at 2549b36, R1-0 COMPLETE)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (11 commits, R0 1-21 complete, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae, Route 1 per-plane + fix PR #157 MERGED at 26d51c4 (5 commits, 193/193 tests, 6 findings 4+2). Route 3 -> Route 1 cascade now at Research MERGED 7b07f7f (research spec e327484, 1 file) + Architect+Build PR #159 MERGED at 2549b36 (blueprint + addendum23 + R1-0 harness COMPLETE 18/18 + harness-integrity fixes + Tester CSV fix, 9 commits -> 8 rebased, Reviewer approve 17:40:48Z + Tester approve-test 17:51:36Z).
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f`, `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, `opencode/issue130-route3-modular-redesign` retained at `eb2b28c` after PR #156 merge and at `56dbf00` after PR #157 merge, `opencode/issue130-route1-acoder-research` at `13a3a64` retained after PR #158 merge at 7b07f7f, `opencode/issue130-route1-acoder-refinement` at d79e729 retained after PR #159 merge at 2549b36 (no --delete-branch, `git ls-remote origin opencode/issue130-route1-acoder-refinement` = d79e729, `git merge-base origin/main d79e729` = d79e729 ancestor of 2549b36).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved via `prism/docs/research-complete-negative-ledger.md` + `ideas/2026-08-26-prism-honest-closure.md` both ancestors of 2549b36, R1 FAIL ledger (+194.22% median NET) via 26d51c4, Route 1 acoder spec (2.6x bypass overhead, ACoderV2 leaf-reuse, 0.4-1.1% gain) via 7b07f7f, R1-0 adaptively coded multi-pass MERGED at 2549b36 (harness integrity + fresh CSV 538244/545910 median 2.30% total 2.04% FAIL expected baseline, model 0.00025-0.00177 bpp well under 0.005).

## MERGE CAPABILITY (verified at 2549b36)
- `main` = `2549b36c6d469e37e66ce52638e5b69c592e1776` LIVE (`git ls-remote origin main` = 2549b36, parent `7b07f7f20c6c500b950740dcf48c0401128dbe0b`, 8 commits from PR #159 rebased at 2026-08-27T17:52:39Z). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (two-knob verified). `gh api .../contents/.github/agents/maintainer.md?ref=main` still Hephaestus + no-pause mandate. `gh api .../contents/prism/docs/research-route1-acoder-refinement.md?ref=main` = `e327484` verified. `gh api .../contents/prism/docs/addendum-23-pinned-constants-route1.md?ref=main` = 9364d6c present. `gh api .../contents/progress/130-prism-route1-acoder-refinement.md?ref=main` 18/18 complete. Pages `Deploy` on 2549b36 triggered via 33100661848 workflow_dispatch.
- PR #159 MERGED at `2549b36` (rebase, no --delete-branch, head `d79e729` retained, branch `opencode/issue130-route1-acoder-refinement` at d79e729, `git merge-base origin/main d79e729` = d79e729 ancestor of 2549b36, 11 files two-dot vs 7b07f7f, research file preserved e327484, MERGEABLE CLEAN before merge).
- PR #158 MERGED at `7b07f7f` (rebase, no --delete-branch, head `13a3a64` retained), PR #157 MERGED at `26d51c4`, PR #156 MERGED at `9f51d21`.
- Merge for workflow-touching PRs via PAT sweep verified; non-workflow merges via GITHUB_TOKEN rebase verified (PR #159 at 2549b36 via `gh pr merge --rebase`).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2549b36.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0 ancestor of 2549b36), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #159 at d79e729 after merge at 2549b36 (no --delete-branch, `git ls-remote` = d79e729, `git merge-base origin/main d79e729` = d79e729 ancestor, tag `recover/159` present).
- **Open PRs:** 0 (`gh pr list --state open` = [] after merge of 159).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0+R1 FAIL MERGED, Route 1 acoder Research MERGED at 7b07f7f, R1-0 MERGED at 2549b36 COMPLETE 18/18, next R1-1 ≥+0.5% NET), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). Next schedule 00:00Z 2026-08-28. Pages deploy on main 2549b36 triggered 33100661848.

## IN FLIGHT
- **PR #159 - MERGED at 2549b36** (branch `opencode/issue130-route1-acoder-refinement` retained at d79e729): 9 commits (a56e621 blueprint+addendum23+progress, f62a386 R1 encoder core causal decode MED+bd_max fix, 98f4e82 CLI probes, c675316 progress 15/18, c1cdfab doc fixes + probe_sandbox.sh + dated CSV 18/18 COMPLETE, 290228a model_bpp fix+dead flag, 1285f7c research spec e327484, 6ad7dd4 CSV 0.0041 bpp, d79e729 fresh CSV 538244/545910) -> 8 rebased commits on main. Body `Refs #130` verified - issue remains OPEN. Reviewer 17:40:48Z approve on d79e729 + Tester 17:51:36Z approve-test on d79e729 (193/193, 4/4 self-check 0.00092 bpp, probe CSV byte-matched).
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET, best_K=32 eff=5, R1b 0.006 PASS) ledger on main via 26d51c4 -> 7b07f7f -> 2549b36.
- **Route 1 acoder Research MERGED at 7b07f7f:** ancestor of 2549b36.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade 08:19:10Z -> Research 33053686124 -> Architect 33054153674 -> Build R0/R1 -> PR #156 MERGED at 9f51d21 Refs #130 -> build 33077311849 -> PR #157 MERGED at 26d51c4 Refs #130 -> Research 33087423100 -> PR #158 MERGED at 7b07f7f Refs #130 -> Architect 33088356699 -> PR #159 created at a56e621 -> Reviewer 33089141198 fix -> fix 33089275849 (MED+bd_max) -> continue 33094428004 (18/18 COMPLETE c1cdfab) -> Reviewer 33096411186 fix (4 findings at c1cdfab) -> fix 33096612362 (6ad7dd4) -> Reviewer 33097446746 approve at 6ad7dd4 -> Tester 33097589856 fix (stale CSV 709847->538244) -> fix 33098978942 (d79e729 fresh CSV) -> Reviewer 33099524893 approve at d79e729 17:40:48Z -> Tester 33099644642 approve-test at d79e729 17:51:36Z -> **maintainer 33100568458 MERGED PR #159 at 2549b36 Refs #130** (this run). Next is Builder R1-1 (adaptive vs adaptive baseline, gate ≥+0.5% NET).

## NEXT-RUN PLAYBOOK
1. Verify new main 2549b36: `git ls-remote origin main` = 2549b36, `gh api .../contents/prism/docs/addendum-23-pinned-constants-route1.md?ref=main` = 9364d6c, `gh api .../contents/prism/docs/research-route1-acoder-refinement.md?ref=main` = e327484, `progress/130-prism-route1-acoder-refinement.md` 18/18, pages deploy 33100661848 success.
2. Dispatch Builder for R1-1: sweep K in {16,32,64,128} x effort {3,5,7} on pinned quad, adaptive vs adaptive NET, gate ≥+0.5%. Update `progress/130-prism-route1-acoder-refinement.md` R1-1 section, commit dated CSV, failable self-check. If FAIL, cascade to Route 2 hybrid-uint per directive (research on #130).
3. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly. Verify `git merge-base origin/main <pr-head>` non-empty before any future merge.
4. Both-units gates M2 <9.498/<3.166 and M3 <8.655/<2.885 vs REAL cjxl remain binding; all ledger merges use `Refs #130` until gates pass. Honest arithmetic: Route 1 alone projects 0.4-1.1% (needs 6.15% more for M2), so Route 2 queued if R1-1 <+0.5%.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular R0 MERGED at 9f51d21 Refs #130; R1 FAIL +194.22% at 26d51c4 Refs #130; Route 1 acoder Research MERGED at 7b07f7f Refs #130; Architect+Build R1-0 MERGED at 2549b36 Refs #130 R1-0 COMPLETE 18/18, next R1-1 ≥+0.5% NET)
- **#159** - MERGED at 2549b36 (Architect Route1 acoder blueprint + R1-0 harness COMPLETE 18/18 + 4 fixer commits, 8 rebased commits, Refs #130, Reviewer approve 17:40:48Z + Tester approve-test 17:51:36Z, 193/193, 24/24 HOLD, branch retained at d79e729)
- **#158** - MERGED at 7b07f7f (Research Route1 acoder spec, 1 file, Refs #130, Reviewer approve 15:42:35Z + Tester approve-test 15:44:39Z)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z, pages 33100661848 triggered on 2549b36.
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will R1-1 measurement (≥+0.5% NET adaptive vs adaptive) show any multi-pass gain, or will it confirm that 0.4-1.1% is insufficient and require cascade to Route 2 hybrid-uint?
- Will entropy-based MA-tree splitting beat variance-based splitting by ≥+0.3% (R1-2 gate) or will variance remain?
- Will pages and preview infra stay green after merge of PR #159 at 2549b36 (8 commits rebased, research preserved)?
- Will both-units gates M2/M3 be approached after R1-1..R1-5, or will exotic cascade require all 3 routes?

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
