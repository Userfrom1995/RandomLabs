# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~23:03Z, maintainer run 33124881038 - PR #161 MERGED at f43e646, R2-0 11/11, Builder dispatched R2-1)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (R0 1-21, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae (via PR #157 MERGED at 26d51c4). Route 1 acoder Research MERGED 7b07f7f (spec e327484) + Architect+Build PR #159 MERGED at 2549b36 (R1-0 harness 18/18 COMPLETE). Route 1 R1-1 FAIL +2.27% MERGED at 86606d3 (R1-1a PASS R1-1b FAIL R1-1c PASS, 193/193) - Route 1 CLOSED per blueprint. Route 2 hybrid-uint Research+Architect+Build+Fix PR #161 MERGED at f43e646 (research 75b1641 + architect 1fe581a + 9 builder/fixer commits, R2-0 11/11 COMPLETE 200 tests, 8 findings fixed, Reviewer approve b10a493 + Tester approve-test b10a493, VB-R2 rails green).
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified through PR #161 at f43e646 retained (branch opencode/issue130-20260827211413 at b10a493 retained, git ls-remote confirms).
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved, R1 FAIL ledger +194.22% and Route 1 R1-1 FAIL +2.27% preserved on main. Route 2 honest arithmetic conservative 10.1210 optimistic 9.72 (+4% B3+B5) - alone cannot reach M2, value is B3 reopen via hybrid-uint.

## MERGE CAPABILITY (verified at f43e646)
- `main` = `f43e646e6225f81445d16791f6aa275083f7fbe1` LIVE (`git ls-remote origin main` = f43e646, `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (two-knob verified, to re-verify at f43e646 via gh api contents), Pages deploy pending verification via push trigger on pages.yml (branches [main] + PR closed types). `git merge-base origin/main b10a493` = 86606d3 non-orphan verified before merge.
- PR #161 MERGED at f43e646 via rebase (head b10a493 retained, 11 commits rebased linear: 75b1641->...->f43e646, non-orphan). PR #160 MERGED at 86606d3, PR #159 at 2549b36, PR #158 at 7b07f7f, PR #157 at 26d51c4, PR #156 at 9f51d21.
- Merge for workflow-touching PRs via PAT sweep; non-workflow merges via GITHUB_TOKEN rebase verified (PR #161 had no workflow files, direct GITHUB_TOKEN rebase succeeded).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 86606d3, to re-verify at f43e646.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0 ancestor of f43e646), `maintainer.yml` PAT sweep with approve-held-runs.sh (issue #137 repo-wide sweep).
- **Open PRs:** 0 after merge (PR #161 closed merged at f43e646, branch retained b10a493). Next Builder for R2-1 will open new PR.
- **Open issues:** #130 (Prism, OPEN - cascade ACTIVE, Route 3 FAIL, Route 1 FAIL/CLOSED, Route 2 R2-0 11/11 MERGED, R2-1 dispatched), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last green 07:26:11Z run 33049525883 (R1-R5 pass, 0 failures in 200), next 00:00Z 2026-08-28. No held action_required on main post-merge (pages push pending).
- **Lab nominal:** no orphan, no CreditsError, no workflow-blocking. Merge performed via gh pr merge --rebase, retain-branch confirmed.

## IN FLIGHT
- **PR #161 - MERGED at f43e646** (branch `opencode/issue130-20260827211413` retained at b10a493, 11 commits: 75b1641 researcher spec + addendum24, 1fe581a architect blueprint+tracker, 38ae255 core hybrid codec ACModelsHybrid/token tree/plane helpers, 6a905bc container/prism wiring R2_HYBRID_FLAG alias 0x02, 6f1bae8 CLI/container T_ESC fix/7 tests, 182122a tests wiring, 7dc0429 self-check CSV, 7f75e06 VB-R2 rails, db681a9 fixer 7 findings, 9576304 prism.h bit1 fix, b10a493 abs+sign variant + SQUEEZE_LIFT mask). 15 files: docs addendum-24 (0x02 alias + abs+sign variant), research-route2, ideas blueprint (0x02), progress tracker, acoder.h/cpp, container.h/cpp, prism.h/cpp (bit1), main.cpp (gate 1e9 fix), CMakeLists, test_acoder_hybrid.cpp, reference CSV. Reviewer approve b10a493 (run 33124386874) + Tester approve-test b10a493 (run 33124513553, 200 tests, synthetic+Kodak+probe). Refs #130. Main now f43e646. Branch retained post-merge.
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET R1 FAIL per-plane+static ANS overhead) ledger MERGED at 26d51c4.
- **Route 1 R1-1 VERDICT: FAIL** (+2.27% median regression adaptive vs adaptive, R1-1a PASS R1-1b FAIL R1-1c PASS, per-plane dilution + single-stream residual entropy gap) MERGED at 86606d3 - Route 1 CLOSED per blueprint, R1-2..R1-5 SKIPPED.
- **Route 2:** R2-0 11/11 COMPLETE MERGED at f43e646 (200 tests, VB-R2 rails green, 8 findings fixed, self-check kodim01 eff5 T_ESC 4 +1.50861% /8 +2.47174% /16 +2.06969% vs ZFF). R2-1 DISPATCHED this run via build on #130 (FRAME-HYB vs FRAME-ZFF on kodim01/05/13/19 both units, T_ESC {4,8,16} x effort {3,5,7}, gate >=+0.5% NET + sub-gates a/b/c). R2-2 bar(i) >=+1.50% non-MED vs MED under hybrid-uint (B3 reopen) PENDING after R2-1, R2-3 threshold <9.35/<3.117 proceed-to-format, final M2 <9.498/<3.166 M3 <8.655/<2.885.

## PIPELINE POSITION
Honest closure 3d76bdb -> no-pause d31f9b0 -> cascade directive 08:19:10Z -> Route 3 Research+Architect+Build R0/R1 -> PR #156/#157 MERGED (R1 FAIL +194.22%) -> Route 1 Research PR #158 at 7b07f7f -> PR #159 at 2549b36 (R1-0 18/18) -> PR #160 at 86606d3 (R1-1 FAIL +2.27% ledger) -> **Route 2 Research+Architect+Build+Fix PR #161 MERGED at f43e646 (R2-0 11/11 COMPLETE, 200 tests, VB-R2 rails green, 8 findings fixed, Reviewer approve+Tester approve-test)** -> **R2-1 measurement DISPATCHED (build on #130) next**. Honest arithmetic 10.1210->9.72 preserved, Refs #130 until gates pass.

## NEXT-RUN PLAYBOOK
1. Poll Builder run for R2-1 on #130 (build dispatched this run 33124881038): `gh run list --event issue_comment` for opencode build on #130, then `gh pr list --state open` for new PR head (R2-1 measurement branch). Await Builder push of FRAME-HYB vs FRAME-ZFF sweep CSV on kodim01/05/13/19.
2. If Builder opens PR for R2-1, dispatch Reviewer via `{"action":"review","pr":<new>}` after push, then Tester via `{"action":"test"}` after approval. Gate R2-1 median >=+0.5% NET must pass both units before R2-2 bar(i) >=+1.50% factorial.
3. Verify pages deploy on f43e646: `gh api actions/runs?event=push` for head f43e646; if missing or failed, `gh workflow run pages.yml` via workflow_dispatch. Verify `git ls-remote origin main` stays f43e646 non-orphan.
4. Verify branch retention: `git ls-remote origin opencode/issue130-20260827211413` = b10a493. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly. Both-units gates M2/M3 remain binding; never close #130 on R2-1 unless gates pass.
5. If Builder stalls >3 days (bot), ping and/or takeover per STALLS policy; if human fork >7 days, evaluate.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 FAIL MERGED, Route 1 FAIL MERGED/CLOSED per blueprint, Route 2 R2-0 11/11 MERGED at f43e646, R2-1 DISPATCHED via build)
- **#70** - Lab Health & Audit Logs - green 07:26:11Z
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will R2-1 on kodim01/05/13/19 both units show >=+0.5% NET under ACoderV2 (vs T3 static ANS verdict)? Formal quad decides - self-checks +0.35% to +2.47% ambiguous.
- Will sub-gates R2-1a (<=0.01 bpp aspirational vs 0.093 actual) R2-1b (no image >+1.0% regress) R2-1c (decode <=1.5x) pass?
- Will R2-2 predictor factorial under hybrid-uint achieve bar(i) >=+1.50% for GAP/W families reopening B3 at fourth test?
- Will R2-3 composition reach proceed-to-format <9.35/<3.117 given honest 9.72 optimistic, and final M2/M3 require composition with Routes 1/3?
- Will pages/preview stay green after merge at f43e646 (push trigger on pages.yml)?

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
