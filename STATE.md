# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~10:39Z, maintainer run 33063982135 - R0 complete at 64e35c2, review dispatched on PR #156)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research delivered PR #156 at 08:27:57Z, architect run 33054153674 success at 08:52:55Z, builder runs 33056519233 (0956202 scaffold) + 33060283329 (70b97b4 MA-tree+escape) + builder-continue 33062558029 SUCCESS at 10:39Z landed 048f847/d88fc2f/64e35c2 (R0 wiring+CLI+probe_sandbox+addendum22+CSV). Cascade 3->1->2 active, now in Review phase on R0 milestone.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f` and `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, d31f9b0 maintains lineage. Branch `opencode/issue130-route3-modular-redesign` at 64e35c2 retained (7 commits).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of d31f9b0.

## MERGE CAPABILITY (verified at d31f9b0)
- `main` = `d31f9b0385af91fe54ba73956ebf788870a987f0` LIVE (`git ls-remote origin main` = d31f9b0, `gh api /git/refs/heads/main` = d31f9b0, parent `3d76bdb80b8c057759fe3fc187a854d66240e9b6`, message "chore: add universal no-pause mandate and architectural transparency to Maintainer"). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` now contains no-pause mandate.
- PR #155 MERGED at `3d76bdb` (head `526b71f` retained, branch `opencode/issue130-20260826225806` at 526b71f, `git merge-base origin/main 526b71f` = 2283012 shared history, non-orphan rebase, ancestor of d31f9b0).
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at d31f9b0.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), and PR #156 branch at 64e35c2 (7 commits, retention holds).
- **Open PRs:** 1 - PR #156 `opencode/issue130-route3-modular-redesign` at 64e35c2 (researcher: Route 3 research spec - JXL-style Modular redesign, Refs #130, 28 files diff vs main, 3977 inserts, MERGEABLE CLEAN).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0 COMPLETE), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). No new auditor run since; next schedule 00:00Z 2026-08-28.

## IN FLIGHT
- **PR #156 - Route 3 Research + Architecture + R0 COMPLETE** at 2026-08-27T10:39Z: Research `9473d72` (602 lines) + Architect `0131869` (621-line blueprint + progress tracker) + Builder `0956202` (initial scaffold: 16 files, 185 tests pass) + Builder `70b97b4` (MA-tree + escape bits, 189/189 tests) + Builder-continue `048f847` (multipass container wiring + CLI r3/probe-r3/self-check-r3, 192/192 tests) + `d88fc2f` (probe_sandbox.sh R-series) + `64e35c2` (addendum 22 + dated CSV + self-check PASS). Body `Refs #130` verified, merge_base d31f9b0 non-orphan, pages/pr-trigger pending on new head.
- **Builder-continue - SUCCESS run 33062558029:** triggered by owner /oc continue 10:19:49Z via maintainer 33060107757, now completed pushing 3 commits (048f847/d88fc2f/64e35c2). Progress `progress/130-prism-route3-modular-redesign.md` R0 items 1-21 all checked (R0 STATUS COMPLETE 2026-08-27). Next: review->test->merge (Refs #130) loop on milestone.
- **Review dispatched:** this maintainer dispatches `review` on PR #156 at 64e35c2 (decision.json). Reviewer will audit 28-file diff vs blueprint; Tester will verify 192 tests + self-check.
- **Cascade 3->1->2 transparent:** Route 3 active, R1 gate >=+5.0% NET over FRAME-SINGLE next measurement phase after R0 merge. If R1 fails, cascade to Route 1 via research on #130 without pause.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade directive 08:19:10Z -> Research dispatched 08:21Z -> Research delivered PR #156 at 08:27:57Z (9473d72) -> Owner architect 08:27:59Z -> Architect success 33054153674 pushes 0131869 -> Owner build 08:52:57Z cancelled -> Maintainer re-dispatch 08:53Z -> Builder success 33056519233 pushes 0956202 (R0 scaffold) -> Maintainer continue 09:47Z -> Builder success 33060283329 pushes 70b97b4 (MA-tree+escape, 19 files, 189 tests) -> Owner continue 10:19:49Z -> Builder-continue SUCCESS 33062558029 pushes 048f847/d88fc2f/64e35c2 (R0 wiring+CLI+probe+addendum+CSV, 28 files, 192 tests) -> This maintainer review dispatch 10:39Z at 64e35c2 -> Await Reviewer approve -> Tester approve-test -> Merge Refs #130. Lab freeze exempts #130; brainstorm FROZEN. R1 measurement queued post-merge.

## NEXT-RUN PLAYBOOK
1. Verify review landed: `gh api repos/Userfrom1995/RandomLabs/issues/156/comments --paginate | tail` should show review decision; `gh run view <review_run> --json jobs` check. If Reviewer requests `/oc fix: ...`, dispatch `fix` on PR #156 once.
2. If Reviewer approves (`/oc approve`): review workflow auto-forwards to Tester via `/oc test`. If not auto-forwarded, dispatch `test` on PR #156. Tester must validate 192 tests, self-check-r3, probe_sandbox --r0, and container round-trip vs REAL cjxl baseline still -8.21% (e1) before R1 measures.
3. If Tester approves (`/oc approve-test`): merge PR #156 via `gh pr merge 156 --rebase` (no --delete-branch), verify `git merge-base origin/main 64e35c2` non-empty, then close Refs issue check - keep #130 open (Refs not Closes) until M2+M3 pass. Verify pages.yml deploy on new main.
4. If builder/maintainer triggers arrive while review in_progress: emit [] (duplicate guard) - review already dispatched.
5. If review fails with infra (model/timeout): re-dispatch review once with crash-parity (max 3 retries), then escalate to lab if loop persists.
6. No Ideator (brainstorm freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly or orphan detected.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular redesign: R0 COMPLETE at 64e35c2, await review->test->merge Refs, then R1 measurement >=+5.0% gate; binding M2 <9.498/<3.166 M3 <8.655/<2.885 both units vs REAL cjxl)
- **#156** - OPEN PR - Route 3 R0 complete (Refs #130, 28 files vs main, MERGEABLE CLEAN at 64e35c2, 192/192 tests, self-check PASS, addendum 22 pinned, R0 1-21 checked, review dispatched)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z (run 33049525883, R1-R5 pass, 0 failures in 200).
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass per 2026-08-23 directive, exotic Prism work is exempt sole priority).

## OPEN QUESTIONS
- Will Reviewer approve PR #156 at 64e35c2 or request fixes (container flag, ANS LIFO, hybrid_uint T_ESC semantics)?
- Will Tester validate self-check-r3 byte-exact and probe_sandbox --r0 NET audit on 64e35c2?
- Will R1 measurement (>=+5.0% NET over FRAME-SINGLE on pinned quad) pass or trigger cascade to Route 1?
- Will merge Refs #130 preserve issue open until M2+M3 both pass?

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
