# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~14:12Z, maintainer run 33080924573 - PR #157 OPEN at 593cfae R1 FAIL +194.22%, Builder continue in_progress, awaiting review)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (11 commits, R0 1-21 complete, 192/192 tests, 6 review findings fixed, Reviewer approve + Tester approve-test). Cascade 3->1->2 active, R1 gate dispatched and now FAIL +194.22% on real Kodak-24 at 593cfae.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f`, `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, `opencode/issue130-route3-modular-redesign` retained at `eb2b28c` after PR #156 merge (11 commits rebased to 9f51d21, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 9f51d21). Branch now at 593cfae for PR #157 retained.
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of 9f51d21, and now R1 FAIL ledger will be appended.

## MERGE CAPABILITY (verified at 9f51d21)
- `main` = `9f51d21d970cee8e8f6bf9cedb948be18edb4743` LIVE (`git ls-remote origin main` = 9f51d21, `gh api /git/refs/heads/main` = 9f51d21, parent `d31f9b0385af91fe54ba73956ebf788870a987f0`, 11 commits from PR #156 rebased). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` still Hephaestus + no-pause mandate. `gh api .../contents/prism/docs/addendum-22-pinned-constants.md?ref=main` = 0032f62 present. Pages `Deploy static site to GitHub Pages` on main 9f51d21 SUCCESS run 33065853082.
- PR #156 MERGED at `9f51d21` (rebase, no --delete-branch, head `eb2b28c` retained, branch `opencode/issue130-route3-modular-redesign` at eb2b28c, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 9f51d21, 28 files +3977/-18).
- PR #157 OPEN at `593cfae224df823b3e63c784dcea49b58f450f7b` (2 commits 41f6d4e/593cfae, 5 files, body Refs #130, branch `opencode/issue130-route3-modular-redesign` advancing from eb2b28c, non-orphan, MERGEABLE, awaiting Builder continue landing then review).
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified; non-workflow merges via GITHUB_TOKEN rebase verified (PR #156 merged via `gh pr merge --rebase`).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 9f51d21.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0, ancestor of 9f51d21), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), PR #156 branch at eb2b28c/9f51d21 (11 commits, retention holds), PR #157 branch at 593cfae advancing.
- **Open PRs:** 1 - PR #157 `builder: R1 FAIL on real Kodak-24 - Route 3 cascade to Route 1 (#130)` at 593cfae OPEN, 5 files, Refs #130, Builder Important Context comment + /oc continue 14:11:53Z in_progress.
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0 MERGED Refs #130, R1 FAIL +194.22% on real Kodak-24 at 593cfae, awaiting merge then Route 1 research), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). Next schedule 00:00Z 2026-08-28.

## IN FLIGHT
- **PR #157 - OPEN at 593cfae** (2026-08-27T14:07:07Z, branch `opencode/issue130-route3-modular-redesign`): Builder commits `41f6d4e` (R1 harness probe-r1/self-check-r1) + `593cfae` (R1 FAIL on real Kodak-24, K=32 effort=5: single 538244 bytes 3.65 bpp vs multi 1583604 bytes 10.74 bpp, median +194.22% FAIL, R1a FAIL, R1b 0.006 bpp PASS, R1c FAIL, root cause position-only MA-tree + basic ANS, progress cascade to Route 1). Body `Refs #130` verified - issue stays open. Builder Important Context comment at 14:10:41Z notes skeleton vs architecture (skeleton measured, not full R3). Owner `/oc continue` at 14:11:53Z dispatched opencode build run 33080904630 `in_progress` (headBranch main, issue_comment) - awaiting push. Preview deploy on PR #157 SUCCESS 33080472705.
- **R1 VERDICT: FAIL** per blueprint cascade table R1 <+5.0% NET => Route 3 architecturally infeasible at current skeleton level. Cascade 3->1->2 transparent: next is Route 1 (multi-pass with transmitted histograms + static probabilities + MA-tree 30-80 leaves) via Research dispatch immediately after PR #157 merges (Refs #130).
- **Cascade 3->1->2 transparent:** Route 3 R1 failed, Route 1 queued next, Route 2 queued after. Owner cascade 08:19:10Z active, anti-surrender never closes gated issue on negative result.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade directive 08:19:10Z -> Research dispatched -> Research delivered PR #156 at 08:27:57Z (54245f8) -> Architect success e8ab680 -> Build re-dispatch -> Builder success 0d1f70b -> Continue -> Builder success 88b0cab -> Builder-continue SUCCESS a502e96 (R0 1-21) -> Review 33064363701 (6 findings on 64e35c2) -> Fix dispatched -> Fixer SUCCESS 03a4c64..eb2b28c (4 fixes) -> Re-Review 33065273764 approve at eb2b28c -> Tester 33065411663 approve-test at eb2b28c -> **Maintainer merge 33065631610 at 9f51d21 Refs #130** -> Pages success 33065853082 on 9f51d21 -> Owner question 13:31:56Z -> **Maintainer dispatch 33077311849 build on #130 for R1** -> Builder push 41f6d4e (harness) + 593cfae (R1 FAIL +194.22% real Kodak-24) -> PR #157 OPEN at 593cfae -> Builder Important Context 14:10:41Z -> Owner /oc continue 14:11:53Z -> **Builder continue in_progress 33080904630 -> Maintainer 33080924573 watch (no duplicate dispatch, awaiting landing -> review->test->merge Refs #130 -> Research Route 1)**

## NEXT-RUN PLAYBOOK
1. Verify Builder continue `33080904630` landed: `gh pr view 157 --json headRefOid` shows new SHA beyond 593cfae, `gh run view 33080904630 --json jobs --jq` success, `git ls-remote origin opencode/issue130-route3-modular-redesign` updated. If no new push and run failed, re-dispatch `continue` once with crash-parity (max 3 retries) after checking `gh run view` log.
2. Once head stable, dispatch `review` on PR #157 head (`{"action":"review","pr":157,"head":"<sha>"}`). Do not merge until Reviewer approve + Tester approve-test both pass with Refs #130 and both-units check vs REAL cjxl note.
3. After merge (Refs #130, branch retained, verify `git merge-base origin/main <head>` non-empty), immediately dispatch `research` on #130 for Route 1 (multi-pass histograms retaining Prism pipeline) without pause, documenting failure ledger transparently. Then architect->build for Route 1.
4. Verify pages remains green after any new push/merge: `gh run list --event push` for Deploy on new head; if not triggered, `gh workflow run pages.yml`.
5. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly or orphan detected. Verify no `action_required` held runs post-dispatch via `gh run list`.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular redesign: R0 MERGED at 9f51d21 Refs #130, 192/192 tests, self-check PASS, addendum 22 + CSV on main; R1 measurement FAIL +194.22% on real Kodak-24 at 593cfae, cascading to Route 1 after PR #157 merge)
- **#157** - OPEN - PR `builder: R1 FAIL on real Kodak-24 - Route 3 cascade to Route 1 (#130)` at 593cfae (2 commits, 5 files, Refs #130, 192/192 tests, self-check-r1 PASS model_bpp 0.006, probe-r1 +194.22% FAIL per blueprint - awaiting Builder continue landing then review)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z.
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Builder continue `33080904630` push new head beyond 593cfae or report Route 1 scaffolding already? Will review gate cleanly approve the R1 FAIL ledger (Refs #130) or request fixes on harness?
- Will Route 1 Research deliver multi-pass transmitted-histogram architecture that retains Prism pipeline and closes B1 table-economics without R3 overhead?
- Will pages deploy remain green on R1 PR branch previews and post-merge main?

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
