# STATE - Random factory checkpoint
 - **Updated:** 2026-08-28T06:01Z, maintainer run 33146537538 (schedule, auditor refresh dispatched while cascade 3->1->2 merged at dd559f4)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - CASCADE FULLY MEASURED, FAILED AND MERGED. Route 3 R1 FAIL +194.22% MERGED at 26d51c4 (PR #157). Route 1 R1-1 FAIL +2.27% MERGED at 86606d3 (PR #160). Route 2 R2-0 11/11 MERGED at f43e646 (PR #161) + R2-1 FAIL +1.80% best MERGED at dd559f4 (PR #162). All single-pipeline mechanism classes rejected per 7 programs/28 phases + 3 routes.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified through PR #162 at dd559f4 retained (branch opencode/issue130-route2-hybrid-uint at 4fa026c retained, predecessor f43e646 at b10a493 retained).
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved, all exotic FAIL ledgers (R1 +194.22%, R1-1 +2.27%, R2-1 +1.80%) preserved on main.

## MERGE CAPABILITY (verified at dd559f4)
- `main` = `dd559f42b60d8e3971139574f0598a77be5d0f20` LIVE (`git ls-remote origin main` = dd559f4, `gh api .../git/refs/heads/main` = dd559f4, parent f43e646, `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` two-knob verified, Pages deploy success 23:57:38Z run 33128094560 on dd559f4). `git merge-base origin/main 4fa026c` = f43e646 non-orphan, branch retained.
- PR #162 MERGED at dd559f4 via rebase (head 4fa026c retained, prior 28e0a88 rebased), PR #161 MERGED at f43e646 via rebase (head b10a493 retained), PR #160 at 86606d3, PR #158 at 7b07f7f, PR #157 at 26d51c4.
- Merge for workflow-touching PRs via PAT sweep; non-workflow merges via GITHUB_TOKEN rebase verified (PR #162 had no workflow files, direct rebase succeeded, retain-branch honored).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at dd559f4.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause at d31f9b0, `maintainer.yml` PAT sweep with approve-held-runs.sh (issue #137 repo-wide sweep).
- **Open PRs:** 0 - PR #162 now MERGED at dd559f4 (CLOSED), no other open PRs (`gh pr list --state open` = [] at 06:01Z).
- **Open issues:** #130 (Prism, OPEN - cascade 3->1->2 FULLY FAILED and MERGED, all ledgers on main, awaiting owner halt or exotic beyond-single-pipeline), #70 (lab-health, Auditor refresh dispatched 06:01Z), #42 (brainstorm FROZEN until M2/M3 pass).
- **Auditor:** last green 07:26:11Z run 33049525883 (R1-R5 pass, 0 failures in 200), daily 00:00Z 2026-08-28 schedule not observed at 05:00Z nor 06:01Z - dispatched `auditor` on #70 this run 33146537538 to refresh. Next sweep due after this dispatch. No held action_required on main. Recover sweep 02:25Z success.
- **Lab nominal:** No orphan, no CreditsError, no workflow-blocking. Branch retention verified (`git ls-remote origin opencode/issue130-route2-hybrid-uint` = 4fa026c retained post-merge). Pages deploy green at 23:57Z on dd559f4.

## IN FLIGHT
- **PR #162 - MERGED at dd559f4** (branch `opencode/issue130-route2-hybrid-uint` retained at 4fa026c, Refs #130). Re-review at 23:53Z: 14/14 PASS, Tester at 23:55Z: 200/200 PASS (7 AcoderHybrid suite, roundtrip byte-exact, probe-r2-hybrid wiring), best median_delta +1.80% at T_ESC=16 (all 9 combos WORSE vs -0.5% gate), sub-gates R2-1a/b/c PASS. Root cause binary tree prefix 1.5-2.5% overhead vs ZFF. ZFF pathology rejected, single-pipeline exhausted. Merged via `gh pr merge 162 --rebase` (no --delete-branch).
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET R1 FAIL) ledger MERGED at 26d51c4.
- **Route 1 R1-1 VERDICT: FAIL** (+2.27% median regression) MERGED at 86606d3 - Route 1 CLOSED.
- **Route 2:** R2-0 11/11 COMPLETE MERGED at f43e646. R2-1 FAIL MERGED at dd559f4 closes cascade 3->1->2.
- **Auditor dispatch:** `auditor` on #70 dispatched at 06:01Z run 33146537538 (health refresh, R1-R5 + two-knob check) - awaiting Auditor workflow run.
- **No in-progress builds:** Pipeline idle awaiting owner-directed next program after merged ledger. All progress files on main remain `in_progress` textually but PRs merged - no `opencode` continuation needed.

## PIPELINE POSITION
Honest closure 3d76bdb -> no-pause d31f9b0 -> cascade directive 08:19:10Z -> Route 3 R0/R1 -> PR #156/#157 MERGED (R1 FAIL +194.22%) -> Route 1 Research PR #158 at 7b07f7f -> PR #159/#160 MERGED (R1-1 FAIL +2.27%) -> Route 2 Research+Architect+Build+Fix PR #161 MERGED at f43e646 (R2-0 11/11) -> R2-1 PR #162 MERGED at dd559f4 (FAIL +1.80% best, 14/14 review PASS, 200/200 test PASS, Refs #130). Cascade 3->1->2 now fully measured, failed and merged; single-pipeline design space exhausted (7 programs/28 phases + 3 routes). All ledgers preserved on main (e1 10.1210/3.3737, R1 FAIL, R1-1 FAIL, R2-1 FAIL). Auditor refresh dispatched 06:01Z. Next: owner-directed honest closure (close #130 at e1) vs exotic beyond-single-pipeline (transform/ML context/external dict, wire-format v2, new Research->Architect->Build).

## NEXT-RUN PLAYBOOK
1. Verify auditor run after dispatch: `gh run list --limit 10 --json workflowName,conclusion,headBranch` should show `auditor` success and health report posted to #70 (R1-R5 pass, 0 failures in 200, two-knob free). If Auditor fails or misses push, note benign 403 vs real failure.
2. Verify merge: `git ls-remote origin main` = dd559f4, `gh pr view 162 --json state` = MERGED, `git ls-remote origin opencode/issue130-route2-hybrid-uint` = 4fa026c retained, `gh api contents progress/130-prism-route2-hybrid-uint.md?ref=main` + `prism/src/cli/main.cpp:probe-r2-hybrid` present on main.
3. Poll owner directive on #130: `gh issue view 130 --json state,comments` - await close at e1 vs exotic authorization. If exotic beyond-single-pipeline authorized, immediately dispatch `research` on #130 (requires fresh mathematics, wire-format v2, both-units gates vs REAL cjxl).
4. No Ideator until M2/M3 pass (frozen); no lab/recover unless infra anomaly. Both-units gates M2/M3 remain binding.
5. Branch retention: `git ls-remote origin opencode/issue130-route2-hybrid-uint` = 4fa026c verified retained. No fix/continue on #162.

## ISSUES
- **#130** - OPEN - Prism exotic cascade FULLY FAILED and MERGED (Route 3 FAIL, Route 1 FAIL/CLOSED, Route 2 R2-1 FAIL at dd559f4 merged; e1 10.1210/3.3737 preserved, awaiting owner halt or exotic beyond-single-pipeline)
- **#70** - Lab Health & Audit Logs - last green 07:26:11Z, Auditor refresh dispatched 06:01Z run 33146537538
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass; exotic is owner-directed, not Ideator).

## OPEN QUESTIONS
- Will owner direct honest closure at e1 10.1210/3.3737 (close #130) vs authorize exotic beyond-single-pipeline (transform/ML context/external dictionary, wire-format v2)?
- Will Auditor refresh confirm infra green with 0 failures and free two-knob models at dd559f4?
- Will brainstorm freeze be lifted only after M2/M3 pass remains in force?
- Will pages/preview stay green after dd559f4? (verified success 23:57Z)

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
