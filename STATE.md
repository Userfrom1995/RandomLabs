# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~10:20Z, maintainer run 33062571193 - event on PR #156, builder 70b97b4 landed + continue in_progress)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research delivered PR #156 at 08:27:57Z, architect run 33054153674 success at 08:52:55Z, builder run 33056519233 success at 09:46:43Z pushed 0956202 (R0 scaffold), builder run 33060283329 success at 10:19:43Z pushed 70b97b4 (MA-tree + escape bits). Cascade 3->1->2 active, now in Builder R0 continuation phase (wiring remaining).
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f` and `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, d31f9b0 maintains lineage. New branch `opencode/issue130-route3-modular-redesign` at 70b97b4 retained (4 commits).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of d31f9b0.

## MERGE CAPABILITY (verified at d31f9b0)
- `main` = `d31f9b0385af91fe54ba73956ebf788870a987f0` LIVE (`git ls-remote origin main` = d31f9b0, `gh api /git/refs/heads/main` = d31f9b0, parent `3d76bdb80b8c057759fe3fc187a854d66240e9b6`, message "chore: add universal no-pause mandate and architectural transparency to Maintainer"). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` now contains no-pause mandate.
- PR #155 MERGED at `3d76bdb` (head `526b71f` retained, branch `opencode/issue130-20260826225806` at 526b71f, `git merge-base origin/main 526b71f` = 2283012 shared history, non-orphan rebase, ancestor of d31f9b0).
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at d31f9b0.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), and new PR #156 branch at 70b97b4 (4 commits, retention holds).
- **Open PRs:** 1 - PR #156 `opencode/issue130-route3-modular-redesign` at 70b97b4 (researcher: Route 3 research spec - JXL-style Modular redesign, Refs #130, 19 files diff vs main, 3543 inserts, MERGEABLE CLEAN).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0 in-progress), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). No new auditor run since; next schedule 00:00Z 2026-08-28.

## IN FLIGHT
- **PR #156 - Route 3 Research + Architecture + R0 Scaffold DELIVERED** at 2026-08-27T10:19Z: Research `9473d72` (602 lines, MA-tree 30-80 clusters, ANS, hybrid-uint, wire v2, R0-R5 gates, cascade 3->1->2) + Architect `0131869` (621-line blueprint `ideas/2026-08-27-prism-route3-modular-redesign.md` with module map, data structures MultiPassEncoder/Histogram/ANSStaticModel/HybridUintProfile, wire v2 bytes, addendum 22 pinned constants, R-series gates, test matrix, 8 phases/4 weeks + progress tracker `progress/130-prism-route3-modular-redesign.md`) + Builder `0956202` (initial scaffold: 8 new codec files + 4 test files + CMakeLists, 33 new tests + 152 existing = 185 pass) + Builder `70b97b4` (builder: R0 MA-tree + escape bits + byte-exact round-trip - Feature position_y/x PropId 6/7, greedy MA-tree build_greedy with octile thresholds on QG/Activity/Position, ANS escape-bit encode/decode with bypass payload, model blob with MA-tree+histograms+cluster IDs, 12 new round-trip tests, 189/189 tests pass). Body `Refs #130` verified, merge_base d31f9b0 non-orphan, pages `33062513586` + pr-trigger `33062513608` both success on 70b97b4 via PAT sweep.
- **Builder - SUCCESS run 33060283329:** issue_comment `/oc continue` at 09:49:07Z (dispatched via maintainer 33060107757), build job success 10:19:43Z, pushed commit 70b97b4. Also run `33062558029` `in_progress` at 10:20:04Z (triggered by `/oc continue` at 10:19:49Z) - builder continuation for remaining R0 wiring (prism.cpp, --r0..--r5 CLI, probe_sandbox.sh, self-check quad, addendum 22, dated CSV).
- **Progress R0 status:** `progress/130-prism-route3-modular-redesign.md` items 1-15 checked (harness scaffold, Histogram/ANS/HybridUint/MultiPass, VB-MULTI-PASS-ROUNDTRIP/HISTOGRAM-FIDELITY/ANS-FIDELITY/NET-AUDIT, VB-SELF-CHECK byte-exact with escape+MA-tree), items 16-21 pending (Wire MultiPassEncoder into prism.cpp encode/decode path, Add --r0..--r5 to main.cpp, Update probe_sandbox.sh, Run self-check on pinned quad, Commit spec addendum 22, Commit dated reference CSV). R0 exit requires all VB rails green + addendum 22 + CSV.
- **Cascade 3->1->2 transparent:** Route 3 active per owner directive. If builder R1 gate (>=+5.0%) fails, Maintainer will cascade to Route 1 via research on #130 without pause. If R4 passes M2 but not M3, awaits Owner decision per research spec cascade clause.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade directive 08:19:10Z -> Research dispatched 08:21Z -> Research delivered PR #156 at 08:27:57Z (9473d72) -> Owner architect trigger 08:27:59Z -> Architect success 33054153674 -> PR #156 at 0131869 -> Owner build 08:52:57Z cancelled -> Maintainer re-dispatch 08:53Z -> Builder success 33056519233 at 09:46Z pushes 0956202 (R0 scaffold 16 files) -> Maintainer continue 09:47Z -> Builder success 33060283329 at 10:19:43Z pushes 70b97b4 (MA-tree+escape, 19 files, 189 tests pass) -> Owner continue 10:19:49Z -> Builder 33062558029 in_progress (remaining R0 wiring) -> This maintainer quiet watch 10:20Z (no duplicate dispatch). Lab freeze exempts #130; brainstorm FROZEN. Awaiting builder R0 completion before review.

## NEXT-RUN PLAYBOOK
1. Verify builder-continue landed: `gh run view 33062558029 --json jobs` should show success after in_progress; `gh pr view 156 --json headRefOid` should advance past 70b97b4. If run cancels/times out with no push (silent stall), check jobs for timeout string, count prior auto-retry comments (max 3), then re-dispatch `continue` once.
2. If builder pushes R0 wiring (prism.cpp + CLI + probe_sandbox + addendum 22 + CSV): verify `progress/130-prism-route3-modular-redesign.md` R0 checklist 16-21 checked, then dispatch `review` on PR #156 (`{"action":"review","pr":156,"head":"<new_sha>"}`) when work looks complete and push did not auto-trigger reviewer. Merge only after Reviewer approve + Tester approve-test, with `Refs #130` until M2+M3 pass.
3. If builder R1 gate (< +5.0%) fails: immediately dispatch Research for Route 1 (multi-pass histograms retaining Prism) per cascade, without pause, documenting transparently.
4. Keep `Refs #130` on PR #156 until M2 AND M3 both pass both units; never `Closes #130` on milestone. Only Owner halts cascade.
5. Verify main still at d31f9b0; verify pages deploys on 70b97b4 success. Watch for action_required held runs on PR #156 after builder-continue push (PAT sweep approval).
6. No Ideator (brainstorm freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular redesign: research+architect+ R0 scaffold 70b97b4 at 19 files, builder continuation in_progress for R0 wiring, gates M2 <9.498/<3.166 M3 <8.655/<2.885 both units vs REAL cjxl)
- **#156** - OPEN PR - Route 3 build in flight (Refs #130, 19 files vs main, MERGEABLE CLEAN at 70b97b4, R0 items 1-15 done, 16-21 pending, builder 33062558029 in_progress)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z (run 33049525883, R1-R5 pass, 0 failures in 200).
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass per 2026-08-23 directive, exotic Prism work is exempt sole priority).

## OPEN QUESTIONS
- Will Builder-continue 33062558029 complete prism.cpp wiring + CLI + probe_sandbox + addendum 22 + CSV, landing R0 exit?
- Will R1 measurement (>=+5.0% NET over FRAME-SINGLE on pinned quad) project inside M2/M3 reach, or trigger cascade to Route 1?
- Will review->test->merge (Refs #130) loop pass on R0-milestone without blocking on pages hold?
- Will brainstorm freeze be lifted only after M2+M3 pass per directive?

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
