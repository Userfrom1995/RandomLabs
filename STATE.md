# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~11:04Z, maintainer run 33065631610 - PR #156 MERGED at 9f51d21, R0 COMPLETE)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research PR #156 MERGED at 9f51d21 (11 commits, R0 1-21 complete, 192/192 tests, 6 review findings fixed, Reviewer approve + Tester approve-test). Cascade 3->1->2 active, R1 gate >=+5.0% NET next.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f`, `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, `opencode/issue130-route3-modular-redesign` retained at `eb2b28c` after PR #156 merge (11 commits rebased to 9f51d21, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 9f51d21).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of 9f51d21.

## MERGE CAPABILITY (verified at 9f51d21)
- `main` = `9f51d21d970cee8e8f6bf9cedb948be18edb4743` LIVE (`git ls-remote origin main` = 9f51d21, `gh api /git/refs/heads/main` = 9f51d21, parent `d31f9b0385af91fe54ba73956ebf788870a987f0`, 11 commits from PR #156 rebased). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` still Hephaestus + no-pause mandate.
- PR #156 MERGED at `9f51d21` (rebase, no --delete-branch, head `eb2b28c` retained, branch `opencode/issue130-route3-modular-redesign` at eb2b28c, `git merge-base origin/main eb2b28c` = d31f9b0 non-orphan, ancestor of 9f51d21, 28 files +3977/-18).
- PR #155 MERGED at `3d76bdb` (head `526b71f` retained, branch `opencode/issue130-20260826225806` at 526b71f, `git merge-base origin/main 526b71f` = 2283012 shared history, non-orphan rebase, ancestor of 9f51d21).
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified; non-workflow merges via GITHUB_TOKEN rebase verified (PR #156 merged via `gh pr merge --rebase`).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 9f51d21.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0, ancestor of 9f51d21), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), and PR #156 branch at eb2b28c/9f51d21 (11 commits, retention holds).
- **Open PRs:** 0 - PR #156 MERGED at 9f51d21. `gh pr list --state open` = [].
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0 MERGED Refs #130, awaiting R1 measurement), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). Next schedule 00:00Z 2026-08-28.

## IN FLIGHT
- **PR #156 - MERGED at 9f51d21** (2026-08-27T11:04:12Z): Research `54245f8` + Architect `e8ab680` + Builder `0d1f70b` + `88b0cab` + Builder-continue `7065975`/`6b118f9`/`a502e96` (R0 1-21 complete, 192/192 tests, addendum 22, CSV) + Fixer 4 commits `03a4c64` (histogram largest-remainder #4), `aaa58cb` (remove cluster_ids wire #2), `c687ee7` (addendum ANS_NUM_STATES=1 #1 + alphabet pin #5), `9f51d21` (progress/CSV wording #6). Body `Refs #130` verified, merge_base d31f9b0 non-orphan, Reviewer `/oc approve` 10:59:34Z run 33065273764 + Tester `/oc approve-test` 11:02:29Z run 33065411663, no newer `/oc fix` after approve-test. Merged via `gh pr merge 156 --rebase`.
- **R1 next:** Multi-pass vs single-pass baseline (attacks B1, gate >=+5.0% NET over FRAME-SINGLE on pinned quad). R-series checklist `progress/130-prism-route3-modular-redesign.md` on main now R0 STATUS COMPLETE, R1 1-8 unchecked, awaiting Build/measure after merge.
- **Cascade 3->1->2 transparent:** Route 3 active, R1 >=+5.0% gate; if R1 fails, cascade to Route 1 via research on #130 without pause.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade directive 08:19:10Z -> Research dispatched -> Research delivered PR #156 at 08:27:57Z (54245f8) -> Architect success e8ab680 -> Build re-dispatch -> Builder success 0d1f70b -> Continue -> Builder success 88b0cab -> Builder-continue SUCCESS a502e96 (R0 1-21) -> Review 33064363701 (6 findings on 64e35c2) -> Fix dispatched -> Fixer SUCCESS 03a4c64..9f51d21 (4 fixes) -> Re-Review 33065273764 approve at eb2b28c -> Tester 33065411663 approve-test at eb2b28c -> **Maintainer merge 33065631610 at 9f51d21 Refs #130** -> R1 measurement queued. Lab freeze exempts #130; brainstorm FROZEN.

## NEXT-RUN PLAYBOOK
1. Verify merge: `git ls-remote origin main` = 9f51d21, `gh pr view 156 --json state` = MERGED, `gh api contents prism/docs/addendum-22-pinned-constants.md?ref=main` exists (0032f62), branch retained. Trigger `pages.yml` if not auto-deployed: `gh workflow run pages.yml`.
2. Dispatch R1 measurement on #130: Builder continuation for R1 phase (FRAME-SINGLE vs FRAME-MULTI, NET audit, B1 gate >=+5.0%). If Builder stall, use `/oc continue`; if gate FAIL, dispatch `research` for Route 1 without pause (cascade documented).
3. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly or orphan detected. Verify no `action_required` held runs post-merge via `gh run list`.
4. If review/test infra timeout: re-dispatch `review`/`test` once with crash-parity (max 3 retries), then escalate to lab.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular redesign: R0 MERGED at 9f51d21 Refs #130, 192/192 tests, self-check PASS, addendum 22 + CSV on main; R1 measurement >=+5.0% gate next; binding M2 <9.498/<3.166 M3 <8.655/<2.885 both units vs REAL cjxl)
- **#156** - MERGED - Route 3 R0 harness merged to main at 9f51d21 (Refs #130, 28 files, 11 commits, branch retained)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z.
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will R1 measurement (>=+5.0% NET) on real Kodak quad pass or trigger cascade to Route 1?
- Will Tester validate R1 CSV with both units vs REAL cjxl after R0 harness merge?
- Will pages deploy succeed on new main 9f51d21?

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
