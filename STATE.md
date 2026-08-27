# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~15:14Z, maintainer run 33086754594 - Fixer landed 56dbf00, review pending)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (11 commits, R0 1-21 complete, 192/192 tests, 6 review findings fixed, Reviewer approve + Tester approve-test). Cascade 3->1->2 active, R1 FAIL +194.22% on real Kodak-24 at 593cfae, Route 1 per-plane cascade at c9e7164, Reviewer /oc fix at 15:06:50Z (6 findings), Fixer landed 56dbf00 at 15:14:12Z (4 applied, 2 rebutted), review pending on 56dbf00.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f`, `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, `opencode/issue130-route3-modular-redesign` retained at `eb2b28c` after PR #156 merge (11 commits rebased to 9f51d21, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 9f51d21). Branch now at 56dbf00 for PR #157 retained (ahead 5, `git merge-base origin/main 56dbf00` = 9f51d21, `gh api compare 9f51d21...56dbf00` ahead 5 behind 0).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of 9f51d21, and now R1 FAIL ledger will be appended.

## MERGE CAPABILITY (verified at 9f51d21)
- `main` = `9f51d21d970cee8e8f6bf9cedb948be18edb4743` LIVE (`git ls-remote origin main` = 9f51d21, `gh api /git/refs/heads/main` = 9f51d21, parent `d31f9b0385af91fe54ba73956ebf788870a987f0`, 11 commits from PR #156 rebased). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` still Hephaestus + no-pause mandate. `gh api .../contents/prism/docs/addendum-22-pinned-constants.md?ref=main` = 0032f62 present. Pages `Deploy static site to GitHub Pages` on main 9f51d21 SUCCESS run 33065853082, PR #157 preview success 33086717736 + 33086717679 on 56dbf00, 33083986618/33083986459 on c9e7164.
- PR #156 MERGED at `9f51d21` (rebase, no --delete-branch, head `eb2b28c` retained, branch `opencode/issue130-route3-modular-redesign` at eb2b28c, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 9f51d21, 28 files +3977/-18).
- PR #157 OPEN at `56dbf00fb3344707705712799baa7057f14fac68` (5 commits 41f6d4e/593cfae/e5cf9c8/c9e7164/56dbf00, 9 files, body Refs #130, branch `opencode/issue130-route3-modular-redesign` at 56dbf00, `git merge-base origin/main 56dbf00` = 9f51d21 non-orphan, MERGEABLE, Fixer landed, Review pending).
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified; non-workflow merges via GITHUB_TOKEN rebase verified (PR #156 merged via `gh pr merge --rebase`).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 9f51d21.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0, ancestor of 9f51d21), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), PR #156 branch at eb2b28c/9f51d21 (11 commits, retention holds), PR #157 branch at 56dbf00 advancing (fix landed, review pending).
- **Open PRs:** 1 - PR #157 `builder: R1 FAIL on real Kodak-24 - Route 3 cascade to Route 1 (#130)` at 56dbf00 OPEN, 9 files, Refs #130, Fixer 4+2, Review pending, 193 tests.
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0 MERGED Refs #130, R1 FAIL +194.22% at 593cfae, Route 1 per-plane 56dbf00 in review), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). Next schedule 00:00Z 2026-08-28. Lab audit 15:08:30Z run 33086031970 green (R1-R5 pass, no infra).

## IN FLIGHT
- **PR #157 - OPEN at 56dbf00, FIX LANDED, REVIEW PENDING** (branch `opencode/issue130-route3-modular-redesign`): commits `41f6d4e` (harness) + `593cfae` (R1 FAIL +194.22% real Kodak-24 538244 vs 1583604 bytes, 3.65 vs 10.74 bpp, K=32 eff=5) + `e5cf9c8` (Route1 per-plane ANS) + `c9e7164` (decision record) + `56dbf00` (fixer: probe-r1 best_K inversion, position-only {3,4}, dead flag removal, band_class pi). 9 files, 193 tests, body `Refs #130`. Reviewer 15:06:50Z fix (6 findings at multipass.cpp:732, multipass.h:66, multipass.cpp:265, main.cpp:5880, multipass.cpp:515, multipass.cpp:43) addressed 4+2. Lab 15:08:30Z pass. Owner /oc review at 15:14:38Z queued review runs 33086745846 in_progress + 33086754640 pending; this maintainer 33086754594 watches.
- **R1 VERDICT: FAIL** per blueprint cascade table R1 <=-5.0% NET => Route 3 skeleton infeasible. Cascade 3->1->2 transparent: Route 1 in review, next is test->merge Refs #130 -> Research for Route 1 acoder refinement if still FAIL.
- **Cascade 3->1->2 transparent:** Route 3 R1 failed, Route 1 per-plane + fix in review (static ANS vs acoder blocker preserved transparently at 15:01:51Z), Route 2 queued after. Owner cascade 08:19:10Z active, anti-surrender never closes gated issue on negative result.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade directive 08:19:10Z -> Research 33053686124 -> Architect 33054153674 -> Build R0 3306xxx -> PR #156 MERGED at 9f51d21 Refs #130 -> question 13:31:56Z -> build dispatch 33077311849 -> Builder push 41f6d4e+593cfae -> PR #157 OPEN at 593cfae R1 FAIL -> Important Context 14:10:41Z -> Owner /oc continue 14:11:53Z -> build 33080904630 success -> pushes e5cf9c8/c9e7164 at 14:44:28Z/14:45:07Z Route1 per-plane ANS -> Builder blocker note 15:01:51Z (static ANS 2.6x larger) -> Owner /oc continue 15:02:00Z + dual /oc maintainer 15:02:11Z/15:02:19Z -> maintainer 33085590502 review on c9e7164 -> Reviewer 33085758688 fix at 15:06:50Z (6 findings) -> Lab audit 33086031970 pass 15:08:30Z -> maintainer 33086181988 fix on c9e7164 -> Fixer push 56dbf00 at 15:14:12Z (4 applied + 2 rebutted, 193 tests) -> Owner /oc review 15:14:38Z + /oc maintainer 15:14:47Z -> **maintainer 33086754594 watch on 56dbf00 (review pending)**

## NEXT-RUN PLAYBOOK
1. Await Reviewer verdict on 56dbf00: `gh api repos/Userfrom1995/RandomLabs/issues/157/comments --paginate | grep -E "oc fix|oc approve"` for re-review. If `/oc approve`, dispatch `test` on PR #157; if `/oc fix`, re-dispatch `fix` (bounded).
2. After Tester `approve-test` on fixed head (both-units check vs REAL cjxl), merge PR #157 with `Refs #130` (retain branch, `git merge-base origin/main <head>` non-empty already verified 9f51d21, ahead 5), verify pages green (`gh run list --event pull_request` Deploy 33086717736 success on 56dbf00, and post-merge main), then immediately dispatch `research` on #130 for Route 1 acoder-backend refinement (v1 acoder + MA-tree clustering) without pause per Anti-Surrender + No-Pause + cascade 3->1->2. If gates still FAIL at test, ledger already merged.
3. Verify no duplicate triggers: review runs 33086745846 in_progress + 33086754640 pending already queued - do not re-dispatch `review` while pending (anti-spam).
4. Verify pages green after merge: Deploy on 56dbf00 already success, post-merge main pending.
5. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly or orphan detected.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular R0 MERGED at 9f51d21 Refs #130; R1 FAIL +194.22% at 593cfae; Route1 per-plane 56dbf00 in review, 193 tests, blocker static ANS vs acoder noted, fixer 4+2 landed)
- **#157** - OPEN - PR `builder: R1 FAIL on real Kodak-24 - Route 3 cascade to Route 1 (#130)` at 56dbf00 in review (5 commits, 9 files, Refs #130, 193 tests, review pending)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z, Lab audit green 15:08:30Z (R1-R5 pass).
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Reviewer approve 56dbf00 (position-only {3,4} fixes byte-exact, probe-r1 now correct) or request remaining entropy-cost fix?
- Will Tester measurement on 56dbf00 still show +194% or mitigated with per-plane ANS + correct probe logic, model_bpp <=0.02?
- Will residual-entropy split cost be required after position-only park, or will Route 1 acoder Research be needed to close M2/M3?
- Will Route 1 acoder-backend Research deliver transmitted-histogram + MA-tree 30-80 leaves that closes M2/M3 without 2.6x overhead?

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
