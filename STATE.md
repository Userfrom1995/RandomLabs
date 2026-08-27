# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~21:11Z, maintainer run 33116694858 - PR #160 MERGED at 86606d3, Route 2 research queued)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (11 commits, R0 1-21 complete, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae (via PR #157 MERGED at 26d51c4 with Route 1 per-plane fix). Route 3 -> Route 1 cascade now at Research MERGED 7b07f7f (research spec e327484, 1 file) + Architect+Build PR #159 MERGED at 2549b36 (blueprint + addendum23 + R1-0 harness COMPLETE 18/18 + harness-integrity fixes + Tester CSV fix, 9 commits -> 8 rebased, Reviewer approve 17:40:48Z + Tester approve-test 17:51:36Z). Route 1 R1-1 now MERGED FAIL at 86606d3 (see In Flight).
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f`, `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, `opencode/issue130-route3-modular-redesign` retained at `eb2b28c` after PR #156 merge and at `56dbf00` after PR #157 merge, `opencode/issue130-route1-acoder-research` at `13a3a64` retained after PR #158 merge at 7b07f7f, `opencode/issue130-route1-acoder-refinement` at d79e729 retained after PR #159 merge at 2549b36, `opencode/issue130-route1-r1-1-measurement` at c08be2f retained after PR #160 merge at 86606d3 (no --delete-branch, `git ls-remote origin opencode/issue130-route1-r1-1-measurement` = c08be2f, `git merge-base origin/main c08be2f` = c08be2f ancestor of 86606d3).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved via `prism/docs/research-complete-negative-ledger.md` + `ideas/2026-08-26-prism-honest-closure.md` both ancestors of 86606d3, R1 FAIL ledger (+194.22% median NET) via 26d51c4, Route 1 acoder spec (2.6x bypass overhead, ACoderV2 leaf-reuse, 0.4-1.1% gain) via 7b07f7f, R1-0 MERGED at 2549b36, R1-1 FAIL ledger (+2.27% median regression, R1-1a PASS R1-1b FAIL R1-1c PASS) MERGED at 86606d3.

## MERGE CAPABILITY (verified at 86606d3)
- `main` = `86606d34969e7de0b7185bfa225a702e667e63a4` LIVE (`git ls-remote origin main` = 86606d3, parent `c08be2f` rebased onto `2549b36`, 4 commits from PR #160 rebased at 2026-08-27T21:11:33Z). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (two-knob verified). `gh api .../contents/.github/agents/maintainer.md?ref=main` still Hephaestus + no-pause mandate. `gh api .../contents/prism/docs/research-route1-acoder-refinement.md?ref=main` = `e327484` verified. `gh api .../contents/prism/docs/addendum-23-pinned-constants-route1.md?ref=main` = 9364d6c present. `gh api .../contents/progress/130-prism-route1-acoder-refinement.md?ref=main` now R1-1 FAIL ledger (R1-2..R1-5 SKIPPED). Pages `Deploy` on 86606d3 pending verification (merge-token push does not auto-trigger - will verify and dispatch if needed).
- PR #160 MERGED at `86606d3` (rebase, no --delete-branch, head `c08be2f` retained, `git merge-base origin/main c08be2f` = c08be2f ancestor). PR #159 MERGED at `2549b36`, PR #158 MERGED at `7b07f7f`, PR #157 MERGED at `26d51c4`, PR #156 MERGED at `9f51d21`.
- Merge for workflow-touching PRs via PAT sweep verified; non-workflow merges via GITHUB_TOKEN rebase verified (PR #160 at 86606d3 via `gh pr merge --rebase`).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 86606d3.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0 ancestor of 86606d3), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #160 at c08be2f after merge at 86606d3, tag `recover/160` present if pushed.
- **Open PRs:** 0 (`gh pr list --state open` = [] after merge).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0+R1 FAIL MERGED, Route 1 acoder Research MERGED at 7b07f7f, R1-0 MERGED at 2549b36, R1-1 FAIL MERGED at 86606d3 - Route 1 closed, next Route 2 hybrid-uint queued), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). Next schedule 00:00Z 2026-08-28. Pages deploy on 86606d3 pending verification.
- **Lab nominal:** no held action_required on main, no orphan, no CreditsError, no workflow-blocking. Route 2 research pending.

## IN FLIGHT
- **PR #160 - MERGED at 86606d3** (branch `opencode/issue130-route1-r1-1-measurement` 4 commits: `6159907` builder R1-1 FAIL, `55532bf` decision doc, `b1b71a7` gate fix, `86606d3` CSV fix - rebased): 4 files `prism/src/cli/main.cpp` (+66/-13 R1-1 gates per addendum 23, worst_delta <= -0.5 fixed), `prism/benchmarks/results/2026-08-27-r1-1-quad-sweep.csv` (46 lines header +36 sweeps K16/32/64 x eff3/5/7 +9 summaries, 0a-terminated), `progress/130-prism-route1-acoder-refinement.md` (R1-1 FAIL ledger, R1-2..R1-5 SKIPPED per blueprint), `.github/agents/decisions/builder/2026-08-27T20-50-00-r1-1-fail.md` (R1-1 FAIL decision). Gates: primary FAIL (+2.27% vs <=-0.5%), R1-1a PASS (0.0006-0.001 <=0.005), R1-1b FAIL (all regress +1.3-3.3%), R1-1c PASS (1.06-1.08 <=1.5x). Reviewer approve 20:57:55Z at c08be2f + Tester approve-test 21:07:59Z at c08be2f (193/193, live vs CSV byte-matched). Refs #130 - ledger preserved, #130 stays OPEN.
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET) ledger on main via 26d51c4 -> 7b07f7f -> 2549b36 -> 86606d3.
- **Route 1 acoder Research MERGED at 7b07f7f:** ancestor of 86606d3, spec e327484. Route 1 now CLOSED after R1-1 FAIL per blueprint decision tree (R1-2..R1-5 SKIPPED).
- **Route 2 hybrid-uint RESEARCH QUEUED this run** via `{"action":"research","issue":130}` - awaiting Researcher delivery of hybrid-uint binarization spec to remove ZFF pathology and reopen predictor headroom.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade 08:19:10Z -> Research 33053686124 -> Architect 33054153674 -> Build R0/R1 -> PR #156 MERGED at 9f51d21 Refs #130 -> PR #157 MERGED at 26d51c4 Refs #130 -> Research 33087423100 -> PR #158 MERGED at 7b07f7f Refs #130 -> Architect 33088356699 -> PR #159 MERGED at 2549b36 Refs #130 (R1-0 COMPLETE 18/18) -> PR #160 MERGED at 86606d3 Refs #130 (R1-1 FAIL ledger, harness 2 blocking fixes verified, Tester 193/193) -> **maintainer 33116694858 merged PR #160 at 86606d3 and dispatched Research for Route 2 hybrid-uint (this run)**. Next: Researcher spec for Route 2 -> Architect blueprint -> Builder measurement vs REAL cjxl on Kodak-24 both units.

## NEXT-RUN PLAYBOOK
1. Verify Researcher run for Route 2 on #130: `gh run list --limit 10` for opencode research, `gh pr list --state open` for new research PR. If delivered, dispatch Architect on its PR.
2. Verify pages deploy on 86606d3: `gh run list --workflow pages.yml --limit 5` for Deploy success on 86606d3; if not triggered (merge-token push), `gh workflow run pages.yml`.
3. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly. Both-units gates M2 <9.498/<3.166 and M3 <8.655/<2.885 vs REAL cjxl remain binding; all ledger merges use `Refs #130` until gates pass.
4. Verify branch retention after merge: `git ls-remote origin opencode/issue130-route1-r1-1-measurement` = c08be2f and `git merge-base origin/main c08be2f` = c08be2f ancestor.
5. Monitor Route 2 hybrid-uint arithmetic: remove ZFF pathology, optimize binarization + predictor coupling, target 21% gap to M2/M3.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular R0 MERGED at 9f51d21 Refs #130; R1 FAIL +194.22% at 26d51c4 Refs #130; Route 1 acoder Research MERGED at 7b07f7f Refs #130; Architect+Build R1-0 MERGED at 2549b36 Refs #130 R1-0 COMPLETE 18/18, R1-1 FAIL MERGED at 86606d3 Refs #130 R1 CLOSED, Route 2 hybrid-uint RESEARCH QUEUED)
- **#160** - MERGED at 86606d3 (R1-1 FAIL ledger +2.27% FAIL, R1-1a PASS, R1-1b FAIL, R1-1c PASS, CSV 46 lines, Reviewer approve 20:57:55Z + Tester approve-test 21:07:59Z, 193/193, branch retained at c08be2f)
- **#159** - MERGED at 2549b36 (Architect Route1 acoder blueprint + R1-0 harness COMPLETE 18/18, Refs #130, Reviewer approve 17:40:48Z + Tester approve-test 17:51:36Z, 193/193, branch retained at d79e729)
- **#158** - MERGED at 7b07f7f (Research Route1 acoder spec, Refs #130, Reviewer approve + Tester approve-test)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z, pages success on 2549b36 (verify 86606d3 deploy next).
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Route 2 hybrid-uint Researcher deliver spec that removes ZFF pathology and reopens predictor headroom for M2/M3 21% gap, or will it require exotic multi-pass static ANS composition at R1-5 <9.35/<3.117?
- Will entropy-based MA-tree splitting (R1-2) remain correctly skipped per FAIL cascade, or will Route 2 revisit context modeling via different binarization?
- Will pages and preview infra stay green after 86606d3 merge (new commits on top of 2549b36)?
- Will both-units gates M2/M3 be approached after Route 2, or will cascade require composition beyond Route 2?
- Will Research spec for Route 2 correctly pin hybrid-uint thresholds and predictor coupling without inflating bypass overhead (2.6x lesson from Route 1)?

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
