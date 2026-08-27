# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~08:28Z, maintainer run 33054136723 - schedule, architect in flight on #130 Route 3)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - IN FLIGHT. Route 3 research delivered PR #156 at 08:27:57Z, owner dispatched architect at 08:27:59Z, architect run 33054153674 in_progress. Cascade 3->1->2 active.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f` and `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, d31f9b0 maintains lineage. New branch `opencode/issue130-route3-modular-redesign` at 9473d72 retained.
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of d31f9b0.

## MERGE CAPABILITY (verified at d31f9b0)
- `main` = `d31f9b0385af91fe54ba73956ebf788870a987f0` LIVE (`git ls-remote origin main` = d31f9b0, `gh api /git/refs/heads/main` = d31f9b0, parent `3d76bdb80b8c057759fe3fc187a854d66240e9b6`, message "chore: add universal no-pause mandate and architectural transparency to Maintainer"). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` now contains no-pause mandate.
- PR #155 MERGED at `3d76bdb` (head `526b71f` retained, branch `opencode/issue130-20260826225806` at 526b71f, `git merge-base origin/main 526b71f` = 2283012 shared history, non-orphan rebase, ancestor of d31f9b0).
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at d31f9b0.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f), PR #155 (526b71f), and new PR #156 branch at 9473d72.
- **Open PRs:** 1 - PR #156 `opencode/issue130-route3-modular-redesign` at 9473d72 (researcher: Route 3 research spec - JXL-style Modular redesign, Refs #130, 1 file `prism/docs/research-route3-modular-redesign.md`, mergeable).
- **Open issues:** #130 (Prism, OPEN - exotic cascade ACTIVE, Route 3 architect in_progress), #70 (lab-health), #42 (brainstorm FROZEN).
- **Auditor:** last report 07:26:11Z run 33049525883 green (R1-R5 pass, 0 failures in 200). No new auditor run since.

## IN FLIGHT
- **PR #156 - Route 3 Research Specification DELIVERED** at 2026-08-27T08:27:57Z by Dr. Mob (run 33053686124 success). File `prism/docs/research-route3-modular-redesign.md` (602 lines) documents multi-pass encoder, MA-tree clustering 30-80 clusters, transmitted histograms, ANS static coding, hybrid-uint tokenization, wire format v2, R0-R5 gates, cascade logic. Body `Refs #130` verified. Owner comment `/oc architect` at 08:27:59Z on PR #156 triggered architect workflow.
- **Architect - IN PROGRESS (run 33054153674):** `opencode` workflow `architect` job in_progress at 08:28:02Z (issue_comment trigger on PR #156, head `d31f9b0`, steps: Set up job success, Checkout success, Clear runtime decision success, Run opencode architect agent in_progress). This run does NOT re-dispatch architect to avoid double-trigger (no duplicate per AGENTS.md spam guard). Next: Architect will produce blueprint + addendum 22 on PR #156 branch.
- **Cascade 3->1->2 transparent:** Route 3 active per owner directive. If architect+build R1 gate (>=+5.0%) fails, Maintainer will cascade to Route 1 (multi-pass histograms retaining Prism pipeline) via `research` on #130 without pause. If R4 passes M2 but not M3, awaits Owner decision per research spec cascade clause.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> no-pause codified at d31f9b0 -> Owner cascade directive 08:19:10Z -> Research dispatched 08:21:38Z -> Research delivered PR #156 at 08:27:57Z -> Owner architect trigger 08:27:59Z -> Architect in_progress 08:28:02Z (this maintainer schedule run observes in-flight architect, takes no new dispatch). Lab freeze exempts #130 exotic work; brainstorm stays FROZEN. No PRs to review/test until architect completes and pushes. Awaiting architect completion before review->test->merge (Refs #130) loop.

## NEXT-RUN PLAYBOOK
1. Verify architect landed: `gh run view 33054153674 --json jobs --jq '.jobs[].steps'` should show architect decision forwarded; `gh pr view 156 --json headRefOid,comments` should show architect commit(s) and ideally `/oc` forward. If run succeeded but no push, check for silent stall (continue-on-error timeout string) before re-dispatch.
2. If architect succeeds and PR #156 updated: dispatch `review` on PR #156 (`{"action":"review","pr":156,"head":"<new_sha>"}`) when work looks complete and push did not auto-trigger reviewer.
3. If architect fails/crashes (no decision file, timeout killed): re-dispatch architect on PR #156 (`{"action":"architect","pr":156}`) once, with crash-parity check (count prior auto-retry comments, max 3).
4. Keep `Refs #130` on PR #156 until M2 AND M3 both pass; never `Closes #130` on milestone. Only Owner halts cascade.
5. Verify main still at d31f9b0; verify pages deploy on d31f9b0 succeeded (`gh run list --limit 5 --json name,conclusion` for Deploy static site).
6. No Ideator dispatches (brainstorm freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly (watch for action_required held runs on PR #156 pages/pr-trigger).

## ISSUES
- **#130** - OPEN - Prism exotic cascade ACTIVE (Route 3 Modular redesign: research delivered PR #156 at 9473d72, architect in_progress run 33054153674, gates M2 <9.498/<3.166 M3 <8.655/<2.885 both units vs REAL cjxl)
- **#156** - OPEN PR - Route 3 research spec (Refs #130, awaiting architect completion, then review/test)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z (run 33049525883, R1-R5 pass, 0 failures in 200).
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass per 2026-08-23 directive, exotic Prism work is exempt sole priority).

## OPEN QUESTIONS
- Will Architect deliver blueprint + addendum 22 that breaks single-pass table-economics and clears 14.48% gap to M3 on PR #156?
- Will architect's MA-tree + ANS + hybrid-uint design pass review then builder measurement vs REAL cjxl on Kodak-24?
- If architect stalls, will re-dispatch succeed without spamming duplicate triggers?
- Will brainstorm freeze be lifted only after M2+M3 pass per directive?

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
