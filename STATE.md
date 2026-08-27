# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~21:33Z, maintainer run 33118692144 - PR #161 Route 2 Research+Architect delivered, Builder dispatched)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (R0 1-21, 192/192 tests, 6 findings fixed). Route 3 R1 FAIL +194.22% at 593cfae (via PR #157 MERGED at 26d51c4). Route 1 acoder Research MERGED 7b07f7f (spec e327484) + Architect+Build PR #159 MERGED at 2549b36 (R1-0 harness 18/18 COMPLETE). Route 1 R1-1 FAIL +2.27% MERGED at 86606d3 (R1-1a PASS R1-1b FAIL R1-1c PASS, 193/193) - Route 1 CLOSED per blueprint. Route 2 hybrid-uint Research+Architect now delivered on PR #161 (research spec + addendum 24 + blueprint + progress tracker), Builder dispatched this run.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified through PR #160 at c08be2f retained.
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved, R1 FAIL ledger +194.22% and Route 1 R1-1 FAIL +2.27% preserved on main.

## MERGE CAPABILITY (verified at 86606d3)
- `main` = `86606d34969e7de0b7185bfa225a702e667e63a4` LIVE (`git ls-remote origin main` = 86606d3). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (two-knob verified). Pages deploy success at 33118700093 on 86606d3.
- PR #160 MERGED at 86606d3 (rebase, head c08be2f retained). PR #159 at 2549b36, PR #158 at 7b07f7f, PR #157 at 26d51c4, PR #156 at 9f51d21.
- Merge for workflow-touching PRs via PAT sweep; non-workflow merges via GITHUB_TOKEN rebase verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 86606d3.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0 ancestor of 86606d3), `maintainer.yml` PAT sweep.
- **Open PRs:** 1 - PR #161 `opencode/issue130-20260827211413` at 1fe581a OPEN MERGEABLE (Route 2 hybrid-uint research 602 lines + addendum 24 + architect blueprint + progress R2-0..R2-3). Owner `/oc architect` 21:23:11Z dispatched architect (success run 33117902327), owner `/oc build this` 21:33:19Z queued builder.
- **Open issues:** #130 (Prism, OPEN - cascade ACTIVE, Route 3 FAIL, Route 1 FAIL, Route 2 R2-0 pending build), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last green 07:26:11Z run 33049525883, next 00:00Z 2026-08-28. No held action_required on main.
- **Lab nominal:** no orphan, no CreditsError, no workflow-blocking.

## IN FLIGHT
- **PR #161 - OPEN at 1fe581a** (branch `opencode/issue130-20260827211413`, 2 commits research + architect adds, 4 files: `prism/docs/research-route2-hybrid-uint.md`, `prism/docs/addendum-24-pinned-constants-route2.md`, `ideas/2026-08-27-prism-route2-hybrid-uint.md`, `progress/130-prism-route2-hybrid-uint.md`). Research delivered by Dr. Mob (run cPsK7C8l, 602 lines, invariants I21-I24, R2-0..R2-3, honest arithmetic conservative 10.1210 optimistic 9.72). Architect delivered blueprint (run UuFidXWx, ACModelsHybrid, token binary tree T_ESC={4,8,16}, flag bit6 0x40, decoder dispatch, R2-0 11-step checklist BLOCKING). Refs #130. Next: Builder R2-0 harness (this run dispatched).
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET) ledger on main via 26d51c4.
- **Route 1 R1-1 VERDICT: FAIL** (+2.27% median regression, R1-1a PASS R1-1b FAIL R1-1c PASS) MERGED at 86606d3 - Route 1 CLOSED, R1-2..R1-5 SKIPPED.
- **Route 2:** R2-0 pending, gate R2-1 >=+0.5% NET hybrid vs ZFF, R2-2 bar(i) >=+1.50% for B3 reopen, R2-3 threshold <9.35/<3.117.

## PIPELINE POSITION
Honest closure 3d76bdb -> no-pause d31f9b0 -> cascade directive 08:19:10Z -> Route 3 Research+Architect+Build R0/R1 -> PR #156/#157 MERGED (R1 FAIL) -> Route 1 Research PR #158 at 7b07f7f -> PR #159 at 2549b36 (R1-0 18/18) -> PR #160 at 86606d3 (R1-1 FAIL ledger) -> **Route 2 Research PR #161 at 1fe581a (Research+Architect delivered, Builder dispatched 21:33Z)**. Next: Builder R2-0 harness -> Reviewer/Test gate -> R2-1 measurement.

## NEXT-RUN PLAYBOOK
1. Verify Builder run for Route 2 on PR #161: `gh run list --limit 10` for opencode build, `gh pr view 161 --json headRefOid` for new SHA. If delivered, dispatch review (`{"action":"review","pr":161,"head":"<sha>"}`) when push stabilizes.
2. If build stalls/no push, trigger `continue` on PR #161 after 3-day evaluation or on explicit continue signal.
3. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly. Both-units gates M2/M3 remain binding; merges use `Refs #130` until gates pass.
4. Verify branch retention after eventual merge: `git ls-remote origin opencode/issue130-20260827211413` and merge-base check.
5. Monitor Route 2 arithmetic: R2-1 hybrid vs ZFF, R2-2 predictor factorial (MED/GAP/W under hybrid-uint), R2-3 composition projection.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 FAIL MERGED, Route 1 FAIL MERGED/closed, Route 2 R2-0 pending build on PR #161)
- **#161** - OPEN at 1fe581a (Route 2 Research+Architect, Refs #130, awaiting Builder R2-0)
- **#70** - Lab Health & Audit Logs - green 07:26:11Z
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Route 2 hybrid-uint R2-0 harness deliver VB-R2 rails green and self-check on pinned quad, or require fix iterations?
- Will R2-1 show >=+0.5% NET gain for hybrid-uint over ZFF under ACoderV2 (unlike T3 under static ANS)?
- Will R2-2 predictor factorial under hybrid-uint achieve bar(i) >=+1.50% for non-MED family (B3 reopen third test)?
- Will R2-3 composition approach M2/M3 thresholds or require further exotic composition beyond Route 2?
- Will pages/preview stay green after PR #161 build pushes?

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
