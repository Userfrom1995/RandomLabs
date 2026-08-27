# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~22:24Z, maintainer run 33122381995 - PR #161 R2-0 9/11 at 7dc0429, VB-R2 rails pending, continue dispatched)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (R0 1-21, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae (via PR #157 MERGED at 26d51c4). Route 1 acoder Research MERGED 7b07f7f (spec e327484) + Architect+Build PR #159 MERGED at 2549b36 (R1-0 harness 18/18 COMPLETE). Route 1 R1-1 FAIL +2.27% MERGED at 86606d3 (R1-1a PASS R1-1b FAIL R1-1c PASS, 193/193) - Route 1 CLOSED per blueprint. Route 2 hybrid-uint Research+Architect PR #161 at 7dc0429 (research 75b1641 + architect 1fe581a + 5 builder commits 38ae255/6a905bc/6f1bae8/182122a/7dc0429), R2-0 9/11 pending VB-R2 rails - continue dispatched this run.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified through PR #160 at c08be2f retained, #161 branch opencode/issue130-20260827211413 retained at 7dc0429.
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved, R1 FAIL ledger +194.22% and Route 1 R1-1 FAIL +2.27% preserved on main. Route 2 honest arithmetic conservative 10.1210 optimistic 9.72 (+4% B3+B5) - alone cannot reach M2, value is B3 reopen via hybrid-uint.

## MERGE CAPABILITY (verified at 86606d3)
- `main` = `86606d34969e7de0b7185bfa225a702e667e63a4` LIVE (`git ls-remote origin main` = 86606d3). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (two-knob verified). Pages deploy success at 33122302697 on 7dc0429 preview, deploy at 33122388224 success on 86606d3 main.
- PR #160 MERGED at 86606d3 (rebase, head c08be2f retained). PR #159 at 2549b36, PR #158 at 7b07f7f, PR #157 at 26d51c4, PR #156 at 9f51d21.
- Merge for workflow-touching PRs via PAT sweep; non-workflow merges via GITHUB_TOKEN rebase verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 86606d3.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0 ancestor of 86606d3), `maintainer.yml` PAT sweep with approve-held-runs.sh (issue #137 repo-wide sweep).
- **Open PRs:** 1 - PR #161 `opencode/issue130-20260827211413` at 7dc0429 OPEN MERGEABLE (Route 2 hybrid-uint: 7 commits, 14 files, research spec 602 lines + addendum 24 + blueprint + progress R2-0..R2-3 + builder harness + tests + CSV). Verified `git merge-base origin/main 7dc0429` = 86606d3 non-orphan.
- **Open issues:** #130 (Prism, OPEN - cascade ACTIVE, Route 3 FAIL, Route 1 FAIL/CLOSED, Route 2 R2-0 in-progress 9/11), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last green 07:26:11Z run 33049525883 (R1-R5 pass, 0 failures in 200), next 00:00Z 2026-08-28. No held action_required on main.
- **Lab nominal:** no orphan, no CreditsError, no workflow-blocking.

## IN FLIGHT
- **PR #161 - OPEN at 7dc0429** (branch `opencode/issue130-20260827211413`, 7 commits: 75b1641 researcher spec + addendum24, 1fe581a architect blueprint+tracker, 38ae255 core hybrid codec ACModelsHybrid/token tree/plane helpers, 6a905bc container/prism wiring R2_HYBRID_FLAG 0x40, 6f1bae8 CLI/container T_ESC fix/7 tests, 182122a tests wiring, 7dc0429 self-check CSV + progress). 14 files (+1733/-5): docs addendum-24, research-route2 (534 lines), ideas blueprint, progress tracker, acoder.h/cpp, container.h/cpp, prism.h/cpp, main.cpp, CMakeLists, test_acoder_hybrid.cpp, reference CSV. Research Dr. Mob invariants I21-I24, R2-0..R2-3. Architect ACModelsHybrid token+T_ESC+1 binary tree (T_ESC {4,8,16} 8 nodes for 8), sign+escq, flag bit6 0x40 decoder dispatch. Refs #130. Builder R2-0 9/11: steps 1-7,9-10 done (model struct, token helpers, residual/plane, prism dispatch, container flag, CLI probe/self-check, 7 unit tests, quad self-check PASS for T_ESC 4/8/16). Steps 8 (VB-R2 rails: ROUNDTRIP, TOKEN-FIDELITY, NET-AUDIT, MODEL-OVERHEAD in probe_sandbox.sh) and 11 (dated reference CSV finalization - file at progress/references/2026-08-27-r2-hybrid-selfcheck.csv exists but progress checklist still unchecked) remain BLOCKING. Next: continue to finish VB-R2 + finalize tracker, then review.
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET R1 FAIL per-plane+static ANS overhead) ledger MERGED at 26d51c4.
- **Route 1 R1-1 VERDICT: FAIL** (+2.27% median regression adaptive vs adaptive, R1-1a PASS R1-1b FAIL R1-1c PASS, per-plane dilution + single-stream residual entropy gap) MERGED at 86606d3 - Route 1 CLOSED per blueprint, R1-2..R1-5 SKIPPED.
- **Route 2:** R2-0 in-progress 9/11 BLOCKING, gate R2-1 >=+0.5% NET hybrid vs ZFF (FRAME-HYB vs FRAME-ZFF on kodim01/05/13/19 both units), R2-2 bar(i) >=+1.50% non-MED family vs MED under hybrid-uint (B3 reopen third test), R2-3 threshold <9.35/<3.117 proceed-to-format, final M2 <9.498/<3.166 M3 <8.655/<2.885.

## PIPELINE POSITION
Honest closure 3d76bdb -> no-pause d31f9b0 -> cascade directive 08:19:10Z -> Route 3 Research+Architect+Build R0/R1 -> PR #156/#157 MERGED (R1 FAIL +194.22%) -> Route 1 Research PR #158 at 7b07f7f -> PR #159 at 2549b36 (R1-0 18/18) -> PR #160 at 86606d3 (R1-1 FAIL +2.27% ledger) -> **Route 2 Research+Architect+Build PR #161 at 7dc0429 (R2-0 9/11, self-check +0.35%/+1.27%/+2.15% summed on kodim01-04, 200 tests, roundtrip PASS)**. Next: Builder continue -> VB-R2 rails green + CSV -> Reviewer/Test gate -> R2-1 measurement on pinned quad.

## NEXT-RUN PLAYBOOK
1. Verify Builder-continue run for Route 2 on PR #161: `gh run list --limit 15 --json name,headSha,status` for opencode build, `gh pr view 161 --json headRefOid` for new SHA past 7dc0429. If delivered with R2-0 11/11 and VB-R2 green, dispatch review (`{"action":"review","pr":161,"head":"<sha>"}`) when push stabilizes.
2. If build stalls/cancels/times out with no push, re-dispatch `continue` on PR #161 once with crash-parity (count prior auto-retry, max 3) rather than retrying build from scratch.
3. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly. Both-units gates M2/M3 remain binding; merges use `Refs #130` until gates pass.
4. Verify branch retention after eventual merge: `git ls-remote origin opencode/issue130-20260827211413` and merge-base check before merge.
5. Monitor Route 2 arithmetic: R2-1 hybrid vs ZFF gate >=+0.5%, R2-2 B3 bar(i) >=+1.50%, R2-3 projection vs 9.35/3.117 threshold.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 FAIL MERGED, Route 1 FAIL MERGED/CLOSED per blueprint, Route 2 R2-0 9/11 at 7dc0429, next R2-1->R2-2->R2-3 per research spec 602 lines)
- **#161** - OPEN at 7dc0429 (Route 2 Research+Architect+Build, Refs #130, 14 files, 7 commits, MERGEABLE, non-orphan base 86606d3, awaiting R2-0 BLOCKING completion)
- **#70** - Lab Health & Audit Logs - green 07:26:11Z
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Builder-continue finish VB-R2 rails (ROUNDTRIP/TOKEN-FIDELITY/NET-AUDIT/MODEL-OVERHEAD) green on first attempt, or require fix iterations for flag bit6/MA-tree 343 contexts?
- Will R2-1 show >=+0.5% NET gain for hybrid-uint over ZFF under ACoderV2 on kodim01/05/13/19 (vs T3 static ANS verdict), and will sub-gates R2-1a (<=0.01 bpp overhead) R2-1b (no regress >-1.0%) R2-1c (decode <=1.5x) pass?
- Will R2-2 predictor factorial under hybrid-uint achieve bar(i) >=+1.50% for non-MED family (GAP/W) reopening B3 at fourth test under correct pricing?
- Will R2-3 composition reach proceed-to-format <9.35/<3.117 threshold, and will final corpus M2/M3 require composition with Routes 1/3 per honest 10.1210->9.72 arithmetic?
- Will pages/preview stay green after PR #161 continue pushes (Deploy 33122302697 success on 7dc0429, 33122388224 success on 86606d3)?

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
- Orphan-main protection: verify `git merge-base origin/main <pr-head>` exists before merging; if empty, re-link via cherry-pick before merge, never force-push to main.

 - Hephaestus, the Maintainer
