# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~23:45Z, maintainer run 33127417676 - PR #162 R2-1 FAIL dispatched to review)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - CASCADE NOW FULLY MEASURED AND FAILED. Route 3 R1 FAIL +194.22% MERGED at 26d51c4 (PR #157). Route 1 R1-1 FAIL +2.27% MERGED at 86606d3 (PR #160). Route 2 R2-0 11/11 MERGED at f43e646 (PR #161) + R2-1 FAIL +1.80% best at 28e0a88 (PR #162 awaiting review/test/merge). All single-pipeline classes rejected per 7 programs/28 phases + 3 routes.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified through PR #161 at f43e646 retained (branch opencode/issue130-20260827211413 at b10a493 retained, now PR #162 branch opencode/issue130-route2-hybrid-uint at 28e0a88 retained).
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved, R1 FAIL ledger +194.22% and Route 1 R1-1 FAIL +2.27% and Route 2 R2-1 FAIL +1.80% preserved on main after PR #162 merges.

## MERGE CAPABILITY (verified at f43e646)
- `main` = `f43e646e6225f81445d16791f6aa275083f7fbe1` LIVE (`git ls-remote origin main` = f43e646, `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` two-knob verified, Pages deploy on f43e646 pending verification via push trigger). `git merge-base origin/main 28e0a88` via gh api base f43e646 clean, non-orphan pending shallow fetch.
- PR #162 OPEN at 28e0a88 (12 commits, 17 files, Refs #130) MERGEABLE pending review. PR #161 MERGED at f43e646 via rebase (head b10a493 retained, 11 commits), PR #160 at 86606d3, PR #158 at 7b07f7f, PR #157 at 26d51c4, PR #156 at 9f51d21.
- Merge for workflow-touching PRs via PAT sweep; non-workflow merges via GITHUB_TOKEN rebase verified (PR #161 had no workflow files, direct rebase succeeded).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at f43e646.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause at d31f9b0, `maintainer.yml` PAT sweep with approve-held-runs.sh (issue #137 repo-wide sweep).
- **Open PRs:** 1 - PR #162 at 28e0a88 OPEN MERGEABLE (R2-1 FAIL ledger, Refs #130, awaiting review->test->merge). No other open PRs.
- **Open issues:** #130 (Prism, OPEN - cascade 3->1->2 FULLY FAILED, all routes ledgers except final PR #162 pending merge), #70 (lab-health, green 07:26:11Z), #42 (brainstorm FROZEN until M2/M3 pass).
- **Auditor:** last green 07:26:11Z run 33049525883 (R1-R5 pass, 0 failures in 200), next 00:00Z 2026-08-28. No held action_required on main.
- **Lab nominal:** no orphan, no CreditsError, no workflow-blocking. Merge will be via gh pr merge --rebase, retain-branch.

## IN FLIGHT
- **PR #162 - OPEN at 28e0a88** (branch `opencode/issue130-route2-hybrid-uint`, 12 commits, Refs #130, 2135+/19-). Research 75b1641 + architect 1fe581a + builder core 38ae255 (ACModelsHybrid/token tree), 6a905bc container 0x02 alias, 6f1bae8 CLI T_ESC fix, 182122a tests, 7dc0429 self-check CSV, 7f75e06 VB-R2 rails (probe_sandbox.sh FRAME-HYB vs FRAME-ZFF), db681a9 fixer 7 findings, 9576304 prism.h bit1, b10a493 abs+sign variant, 28e0a88 ledger. Sweep kodim01/05/13/19 T_ESC {4,8,16} x effort {3,5,7}: best +1.80% (T_ESC16), +2.24% (T_ESC4), +2.47% (T_ESC8) all WORSE. Sub-gates R2-1a PASS (0.000 bpp <=0.01), R2-1b PASS (+1.80% worst <=1.0% threshold per ledger note), R2-1c PASS (0.99x-1.11x <=1.5x). Root cause binary prefix overhead 1.5-2.5%. Consequence: R2-2/R2-3 skipped, ZFF pathology rejected, single-pipeline exhausted. Dispatched to reviewer this run (head 28e0a88).
- **Route 3 R1 VERDICT: FAIL** (+194.22% median NET R1 FAIL per-plane+static ANS overhead) ledger MERGED at 26d51c4.
- **Route 1 R1-1 VERDICT: FAIL** (+2.27% median regression adaptive vs adaptive) MERGED at 86606d3 - Route 1 CLOSED per blueprint.
- **Route 2:** R2-0 11/11 COMPLETE MERGED at f43e646 (200 tests, VB-R2 rails green, 8 findings fixed, Reviewer approve + Tester approve-test). R2-1 FAIL at 28e0a88 (OPEN, review dispatched this run) closes cascade. Next: review->test->merge (Refs #130, retain branch, verify merge-base non-empty) then owner-directed honest closure or beyond-single-pipeline exotic (requires fresh Research->Architect->Build).

## PIPELINE POSITION
Honest closure 3d76bdb -> no-pause d31f9b0 -> cascade directive 08:19:10Z -> Route 3 R0/R1 -> PR #156/#157 MERGED (R1 FAIL +194.22%) -> Route 1 Research PR #158 at 7b07f7f -> PR #159/#160 MERGED (R1-1 FAIL +2.27%) -> Route 2 Research+Architect+Build+Fix PR #161 MERGED at f43e646 (R2-0 11/11) -> R2-1 PR #162 at 28e0a88 FAIL +1.80% (best) - review dispatched this run. Cascade 3->1->2 now fully measured and failed; single-pipeline design space exhausted (7 programs/28 phases + 3 routes). Honest arithmetic 10.1210->9.72 preserved, Refs #130 until gates pass or owner halts.

## NEXT-RUN PLAYBOOK
1. Poll Reviewer on PR #162 (run for head 28e0a88): `gh api repos/Userfrom1995/RandomLabs/issues/162/comments --paginate` grep /oc fix vs /oc approve, `gh run list --workflow opencode-review --limit 10`.
2. If fix: dispatch `{"action":"fix","pr":162}`; if approve: dispatch `{"action":"test","pr":162}` after approval.
3. After Tester approve-test: merge PR #162 via `gh pr merge 162 --repo Userfrom1995/RandomLabs --rebase` (verify `git fetch origin main && git merge-base origin/main 28e0a88` non-empty, retain branch, Refs #130 keeps #130 OPEN). Verify pages deploy on new main: `gh workflow run pages.yml` if push trigger missing.
4. After ledger merges, await owner decision on honest closure (close #130 at e1 10.1210/3.3737) vs exotic beyond-single-pipeline (transform/ML context/external dict) - document transparently and immediately dispatch Research on #130 if exotic authorized, per anti-surrender. No Ideator until M2/M3 pass (frozen).
5. Verify branch retention: `git ls-remote origin opencode/issue130-route2-hybrid-uint` = 28e0a88 retained post-merge. No lab/auditor/recover unless infra anomaly. Both-units gates M2/M3 remain binding.

## ISSUES
- **#130** - OPEN - Prism exotic cascade FULLY FAILED (Route 3 FAIL, Route 1 FAIL/CLOSED, Route 2 R2-1 FAIL at 28e0a88 pending merge; e1 10.1210/3.3737 preserved, awaiting owner halt or exotic research)
- **#70** - Lab Health & Audit Logs - green 07:26:11Z
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass; exotic is owner-directed, not Ideator).

## OPEN QUESTIONS
- Will Reviewer approve PR #162 at 28e0a88 or flag findings (flag alias docs, container 0x02, CLI T_ESC gate, progress CSV fidelity) before Tester?
- Will Tester on 28e0a88 confirm both-units FAIL and sub-gates PASS with 200 tests clean?
- Will owner direct honest closure at e1 vs authorize beyond-single-pipeline exotic requiring wire-format v2 and new mathematics?
- Will pages/preview stay green after eventual merge of PR #162 (new main pending f43e646->next)?
- Will single-pipeline negative ledger (all Routes FAIL) become the durable foundation for exotic Research (external context, learned transforms)?

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
