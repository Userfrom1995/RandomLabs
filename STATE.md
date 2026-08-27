# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~22:55Z, maintainer run 33124393374 - PR #161 at b10a493 fix landed, review in_progress 33124386874)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (R0 1-21, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae (via PR #157 MERGED at 26d51c4). Route 1 acoder Research MERGED 7b07f7f (spec e327484) + Architect+Build PR #159 MERGED at 2549b36 (R1-0 harness 18/18 COMPLETE). Route 1 R1-1 FAIL +2.27% MERGED at 86606d3 (R1-1a PASS R1-1b FAIL R1-1c PASS, 193/193) - Route 1 CLOSED per blueprint. Route 2 hybrid-uint Research+Architect+Build+Fix PR #161 at b10a493 (research 75b1641 + architect 1fe581a + 9 builder/fixer commits, R2-0 11/11 COMPLETE, 200 tests, VB-R2 rails green, 8 findings fixed).
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified through PR #160 at c08be2f retained, #161 branch opencode/issue130-20260827211413 retained at b10a493.
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved, R1 FAIL ledger +194.22% and Route 1 R1-1 FAIL +2.27% preserved on main. Route 2 honest arithmetic conservative 10.1210 optimistic 9.72 (+4% B3+B5) - alone cannot reach M2, value is B3 reopen via hybrid-uint.

## MERGE CAPABILITY (verified at 86606d3)
- `main` = `86606d34969e7de0b7185bfa225a702e667e63a4` LIVE (`git ls-remote origin main` = 86606d3). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (two-knob verified). Pages deploy success at 33124397057 on main/b10a493 pr-trigger 33124372394 success.
- PR #160 MERGED at 86606d3 (rebase, head c08be2f retained). PR #159 at 2549b36, PR #158 at 7b07f7f, PR #157 at 26d51c4, PR #156 at 9f51d21.
- Merge for workflow-touching PRs via PAT sweep; non-workflow merges via GITHUB_TOKEN rebase verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 86606d3.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0 ancestor of 86606d3), `maintainer.yml` PAT sweep with approve-held-runs.sh (issue #137 repo-wide sweep).
- **Open PRs:** 1 - PR #161 `opencode/issue130-20260827211413` at b10a493 OPEN MERGEABLE (Route 2 hybrid-uint: 11 commits, 15 files, R2-0 11/11 COMPLETE, fix applied, review in_progress 33124386874 + pending 33124393400).
- **Open issues:** #130 (Prism, OPEN - cascade ACTIVE, Route 3 FAIL, Route 1 FAIL/CLOSED, Route 2 R2-0 11/11 awaiting re-review gate), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last green 07:26:11Z run 33049525883 (R1-R5 pass, 0 failures in 200), next 00:00Z 2026-08-28. No held action_required on main.
- **Lab nominal:** no orphan, no CreditsError, no workflow-blocking.

## IN FLIGHT
- **PR #161 - OPEN at b10a493** (branch `opencode/issue130-20260827211413`, 11 commits: 75b1641 researcher spec + addendum24, 1fe581a architect blueprint+tracker, 38ae255 core hybrid codec ACModelsHybrid/token tree/plane helpers, 6a905bc container/prism wiring R2_HYBRID_FLAG alias 0x02, 6f1bae8 CLI/container T_ESC fix/7 tests, 182122a tests wiring, 7dc0429 self-check CSV, 7f75e06 VB-R2 rails, db681a9 fixer 7 findings, 9576304 prism.h bit1 fix, b10a493 abs+sign variant + SQUEEZE_LIFT mask). 15 files: docs addendum-24 (updated to 0x02 alias + abs+sign variant note), research-route2, ideas blueprint (updated to 0x02), progress tracker, acoder.h/cpp, container.h/cpp, prism.h/cpp (both now bit1), main.cpp (gate 1e9 fix), CMakeLists, test_acoder_hybrid.cpp, reference CSV. Research Dr. Mob invariants I21-I24, R2-0..R2-3. Architect ACModelsHybrid token (T_ESC+1 binary tree, T_ESC {4,8,16}), sign+escq, flag bit1 alias LZP 0x02 with mutual exclusion, decoder dispatch, `git merge-base origin/main b10a493` = 86606d3 non-orphan. Refs #130. Builder R2-0 11/11: all steps DONE (model struct, token helpers, residual/plane, prism dispatch, container flag alias, CLI probe/self-check, 7 unit tests, quad self-check PASS T_ESC 4/8/16 +0.35%/+1.27%/+2.15%, VB-R2 rails ROUNDTRIP/TOKEN-FIDELITY/NET-AUDIT/MODEL-OVERHEAD). Fixer 7 findings applied at db681a9 + 1 stale bit6 at b10a493 + 2 non-blocking notes incorporated. 200 tests. Awaiting Reviewer re-verdict on b10a493 (run 33124386874 in_progress + 33124393400 pending duplicate), then Tester.
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET R1 FAIL per-plane+static ANS overhead) ledger MERGED at 26d51c4.
- **Route 1 R1-1 VERDICT: FAIL** (+2.27% median regression adaptive vs adaptive, R1-1a PASS R1-1b FAIL R1-1c PASS, per-plane dilution + single-stream residual entropy gap) MERGED at 86606d3 - Route 1 CLOSED per blueprint, R1-2..R1-5 SKIPPED.
- **Route 2:** R2-0 11/11 COMPLETE at b10a493 (fix landed 22:55:32Z, 11 commits, 200 tests), gate R2-1 >=+0.5% NET hybrid vs ZFF (FRAME-HYB vs FRAME-ZFF on kodim01/05/13/19 both units) PENDING post-re-review, R2-2 bar(i) >=+1.50% non-MED family vs MED under hybrid-uint (B3 reopen), R2-3 threshold <9.35/<3.117 proceed-to-format, final M2 <9.498/<3.166 M3 <8.655/<2.885.

## PIPELINE POSITION
Honest closure 3d76bdb -> no-pause d31f9b0 -> cascade directive 08:19:10Z -> Route 3 Research+Architect+Build R0/R1 -> PR #156/#157 MERGED (R1 FAIL +194.22%) -> Route 1 Research PR #158 at 7b07f7f -> PR #159 at 2549b36 (R1-0 18/18) -> PR #160 at 86606d3 (R1-1 FAIL +2.27% ledger) -> **Route 2 Research+Architect+Build+Fix PR #161 at b10a493 (R2-0 11/11 COMPLETE, 200 tests, VB-R2 rails green, 8 findings fixed, self-check +0.35%/+1.27%/+2.15%, review in_progress 33124386874 on b10a493)**. Next: Reviewer re-verdict -> Tester -> merge Refs #130 -> R2-1 measurement.

## NEXT-RUN PLAYBOOK
1. Poll Reviewer runs 33124386874 (in_progress) + 33124393400 (pending) for PR #161 head b10a493: `gh api pulls/161/reviews` + `gh api repos/Userfrom1995/RandomLabs/issues/161/comments --paginate` for `/oc fix` or `/oc approve`. If `/oc approve` then Tester auto-forwards `/oc test`; if `/oc fix: ...` then Fixer on same branch.
2. If review approves and test approves (`/oc approve-test` with no newer fix), merge via `gh pr merge 161 --rebase` (retain branch, `Refs #130` until M2/M3 pass) after `git merge-base origin/main <head>` check. Verify pages deploy after merge.
3. Post-merge, Builder continues R2-1 FRAME-HYB vs FRAME-ZFF on kodim01/05/13/19 (T_ESC {4,8,16} x effort {3,5,7}, gates >=+0.5% + sub-gates a/b/c).
4. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly. Both-units gates M2/M3 remain binding.
5. Verify branch retention after eventual merge: `git ls-remote origin opencode/issue130-20260827211413` and merge-base check before merge.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 FAIL MERGED, Route 1 FAIL MERGED/CLOSED per blueprint, Route 2 R2-0 11/11 at b10a493 awaiting re-review)
- **#161** - OPEN at b10a493 (Route 2 Research+Architect+Build+Fix, Refs #130, 15 files, 11 commits, MERGEABLE, non-orphan base 86606d3, review in_progress 33124386874)
- **#70** - Lab Health & Audit Logs - green 07:26:11Z
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Reviewer approve b10a493 (prism.h bit1 alias corrected, addendum abs+sign variant note, SQUEEZE_LIFT explicit in hybrid mask) or raise new findings?
- Will Tester dynamic VB-R2 rails pass (roundtrip byte-exact, token fidelity <=1.0%, net-audit, model-overhead) on hybrid alias path?
- Will R2-1 show >=+0.5% NET gain for hybrid-uint over ZFF under ACoderV2 on kodim01/05/13/19 (vs T3 static ANS verdict), and will sub-gates R2-1a/R2-1b/R2-1c pass?
- Will R2-2 predictor factorial under hybrid-uint achieve bar(i) >=+1.50% for non-MED family (GAP/W) reopening B3 at fourth test?
- Will R2-3 composition reach proceed-to-format <9.35/<3.117 threshold, and will final corpus M2/M3 require composition with Routes 1/3 per honest 10.1210->9.72 arithmetic?
- Will pages/preview stay green after eventual merge (Deploy success 33124397057 on main, pr-trigger 33124372394 on b10a493)?

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
