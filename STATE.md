# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~10:57Z, maintainer run 33065282093 - Fixer 4 commits at eb2b28c, re-review pending on PR #156)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research delivered PR #156 at 08:27:57Z, architect run 33054153674 success at 08:52:55Z, builder runs 33056519233 (0956202 scaffold) + 33060283329 (70b97b4 MA-tree+escape) + builder-continue 33062558029 SUCCESS at 10:39Z landed 048f847/d88fc2f/64e35c2 (R0 wiring+CLI+probe_sandbox+addendum22+CSV) + Fixer run 33064454339 SUCCESS at 10:57:39Z landed 4 commits (2a51e75/fc2b2bd/83cdb1c/eb2b28c) addressing 6 review findings. Cascade 3->1->2 active, now in Re-Review phase on R0 milestone at eb2b28c.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f` and `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, d31f9b0 maintains lineage. Branch `opencode/issue130-route3-modular-redesign` at eb2b28c retained (11 commits).
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of d31f9b0.

## MERGE CAPABILITY (verified at d31f9b0)
- `main` = `d31f9b0385af91fe54ba73956ebf788870a987f0` LIVE (`git ls-remote origin main` = d31f9b0, `gh api /git/refs/heads/main` = d31f9b0, parent `3d76bdb80b8c057759fe3fc187a854d66240e9b6`, message "chore: add universal no-pause mandate and architectural transparency to Maintainer"). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` now contains no-pause mandate.
- PR #155 MERGED at `3d76bdb` (head `526b71f` retained, branch `opencode/issue130-20260826225806` at 526b71f, `git merge-base origin/main 526b71f` = 2283012 shared history, non-orphan rebase, ancestor of d31f9b0).
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at d31f9b0.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), and PR #156 branch at eb2b28c (11 commits, retention holds).
- **Open PRs:** 1 - PR #156 `opencode/issue130-route3-modular-redesign` at eb2b28c (researcher: Route 3 research spec - JXL-style Modular redesign, Refs #130, 28 files diff vs main, MERGEABLE CLEAN).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 R0 fix complete awaiting re-review), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). No new auditor run since; next schedule 00:00Z 2026-08-28.

## IN FLIGHT
- **PR #156 - Route 3 Research + Architecture + R0 + FIX at eb2b28c** at 2026-08-27T10:57Z: Research `9473d72` + Architect `0131869` + Builder `0956202` + Builder `70b97b4` + Builder-continue `048f847`/`d88fc2f`/`64e35c2` (R0 1-21 complete, 192/192 tests, addendum 22, CSV) + Fixer 4 commits `2a51e75` (histogram largest-remainder #4), `fc2b2bd` (remove cluster_ids wire #2, reconstruct on decode), `83cdb1c` (addendum ANS_NUM_STATES=1 #1 + alphabet pin #5), `eb2b28c` (progress/CSV wording #6 + docs). Body `Refs #130` verified, merge_base d31f9b0 non-orphan, pages/pr-trigger success on eb2b28c (runs 33065239730/740).
- **Fixer - SUCCESS run 33064454339:** triggered by owner /oc fix 10:46:09Z via reviewer /oc fix 10:46:06Z (6 findings). All 6 findings applied, 192/192 tests pass, 4 modular commits pushed to eb2b28c. Auto-posted /oc review via Fix job step 8 at 10:57:41Z.
- **Reviewer - finding at 10:46:06Z on 64e35c2:** 6 findings (ANS interleaving pin I16, cluster_ids overhead I16, feature vector stub, histogram uniform sum, alphabet constant, progress CLI wording). Fixer verified all addressed (see log). Next review pending on eb2b28c.
- **Re-Review pending:** opencode-review run 33065282112 pending at 10:57:51Z triggered by owner /oc review 10:57:41Z + fix auto-review. This maintainer run 33065282093 observes review already queued -> emits [] (duplicate guard) to avoid double dispatch.
- **Cascade 3->1->2 transparent:** Route 3 active, R1 gate >=+5.0% NET over FRAME-SINGLE next measurement phase after R0 merge. If R1 fails, cascade to Route 1 via research on #130 without pause.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade directive 08:19:10Z -> Research dispatched -> Research delivered PR #156 at 08:27:57Z (9473d72) -> Architect success 0131869 -> Build re-dispatch -> Builder success 0956202 -> Continue -> Builder success 70b97b4 -> Builder-continue SUCCESS 64e35c2 (R0 1-21) -> Review 33064363701 success -> Fix dispatched -> Fixer SUCCESS eb2b28c (4 fixes) -> Re-Review pending 33065282112 at eb2b28c -> Await Reviewer approve -> Tester approve-test -> Merge Refs #130. Lab freeze exempts #130; brainstorm FROZEN. R1 measurement queued post-merge.

## NEXT-RUN PLAYBOOK
1. Verify re-review landed: `gh api repos/Userfrom1995/RandomLabs/issues/156/comments --paginate | tail` should show review decision for eb2b28c; `gh run view 33065282112 --json jobs` check completion. If Reviewer requests fixes, dispatch `fix` once; if approves (/oc approve) review workflow auto-forwards to Tester via /oc test.
2. If Reviewer approves: dispatch `test` if not auto-forwarded. Tester must validate 192 tests, self-check-r3 byte-exact, probe_sandbox --r0, and container round-trip vs REAL cjxl baseline.
3. If Tester approves (/oc approve-test): merge PR #156 via `gh pr merge 156 --rebase` (no --delete-branch), verify `git merge-base origin/main eb2b28c` non-empty, keep #130 OPEN (Refs not Closes) until M2+M3 pass, verify pages.yml deploy on new main.
4. If review in_progress: emit [] (duplicate guard).
5. If review fails infra/timeout: re-dispatch review once with crash-parity (max 3 retries), then escalate to lab.
6. No Ideator (freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly or orphan detected.

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular redesign: R0 FIXED at eb2b28c, await re-review->test->merge Refs, then R1 measurement >=+5.0% gate; binding M2 <9.498/<3.166 M3 <8.655/<2.885 both units vs REAL cjxl)
- **#156** - OPEN PR - Route 3 R0 fixed (Refs #130, 28 files vs main, MERGEABLE CLEAN at eb2b28c, 192/192 tests, 6 findings addressed, re-review pending)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z.
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass).

## OPEN QUESTIONS
- Will Reviewer approve eb2b28c after 6 fixes (histogram remainder, cluster_ids removal, ANS pin, feature stub docs, alphabet pin, CLI wording)?
- Will Tester validate self-check-r3 and NET audit on eb2b28c without I16 overhead violation?
- Will R1 measurement (>=+5.0% NET) pass or trigger cascade to Route 1?
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
