# STATE - Random factory checkpoint
 - **Updated:** 2026-08-27 (~08:19Z, maintainer run 33053509699 - owner directive to continue #130 via Route 3 cascade)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause: when multiple routes exist, document transparently and autonomously select most promising path, state cascade order, and immediately dispatch squad (/oc research or /oc architect) - never stall waiting for Owner to choose. This re-activation fulfills that mandate.
- **PRISM EXOTIC CASCADE (2026-08-27T08:19:10Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130 without waiting for me. Execute Route 3 (JXL-style Modular redesign) first. If Route 3 fails, cascade immediately to Route 1 (multi-pass with transmitted histograms), and then Route 2 (hybrid-uint binarization). Keep documentation transparent, merge completed milestones into main with `Refs #130`, and do not stop until M2 and M3 pass." - THIS RUN EXECUTES IT. Route 3 -> 1 -> 2 cascade active.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f` and `opencode/issue130-20260826225806` retained at `526b71f` after PR #155 merge, d31f9b0 maintains lineage.
- **BINDING TARGET (dual-unit, unchanged, re-activated):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 (-8.21% vs 11.026 baseline, ~14.48% to M3) preserved as baseline, not a gate lift.
- **BRAINSTORM FREEZE (2026-08-23T16:22Z via #130):** All other lab work FROZEN (Brainstorm board frozen, no Ideator) until M2/M3 genuinely pass - remains in force per cascade directive; Prism #130 is sole priority.

## MERGE CAPABILITY (verified at d31f9b0)
- `main` = `d31f9b0385af91fe54ba73956ebf788870a987f0` LIVE (`git ls-remote origin main` = d31f9b0, `gh api /git/refs/heads/main` = d31f9b0, parent `3d76bdb80b8c057759fe3fc187a854d66240e9b6`, message "chore: add universal no-pause mandate and architectural transparency to Maintainer"). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged). `gh api .../contents/.github/agents/maintainer.md?ref=main` now contains no-pause mandate.
- PR #155 MERGED at `3d76bdb` (head `526b71f` retained, branch `opencode/issue130-20260826225806` at 526b71f, `git merge-base origin/main 526b71f` = 2283012 shared history, non-orphan rebase, ancestor of d31f9b0). No orphan-divergence on current merge.
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified; d31f9b0 merge used appropriate path.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at d31f9b0.
- **Hephaestus transition LIVE + no-pause codified:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender + No-Pause Mandate (d31f9b0), `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153 (f20709f) and PR #155 (526b71f).
- **Open PRs:** 0 (`gh pr list --state open` = [] at 08:19Z).
- **Open issues:** #130 (Prism, OPEN - re-activated for exotic cascade Route 3->1->2), #70 (lab-health), #42 (brainstorm frozen).
- **Auditor (run 33049525883) HEALTHY:** pipeline all green (0 failures in last 200, R1-R5 pass), two-knob free, no `CreditsError`/`network_error`, report posted to #70 at 07:26:11Z. Benign push 403 on auditor's empty push remains safely ignored.

## IN FLIGHT
- **Issue #130 - Prism EXOTIC CASCADE RE-ACTIVATED at d31f9b0** - Owner directive 08:19:10Z orders immediate continuation without waiting. Cascade order: Route 3 (JXL-style Modular redesign) ACTIVE FIRST, then Route 1 (multi-pass histograms), then Route 2 (hybrid-uint binarization). Binding dual-unit gates M2/M3 unchanged. Prior honest closure at 3d76bdb (e1 10.1210/3.3737, T4 9.5671/3.1890, M2 FAIL, M3 FAIL, U1 +20.32% WORSE, 7 programs/28 phases, 5 adopted/18 rejected) remains committed as baseline via `prism/docs/research-complete-negative-ledger.md` (311cd97) + `ideas/2026-08-26-prism-honest-closure.md` (1062117) both ancestors of d31f9b0. This run dispatches `research` on #130 to blueprint Route 3.
- **Research dispatch - Route 3 Modular redesign (this run):** `{"action": "research", "issue": 130}` queued via decision.json. Expect Researcher to produce `prism/docs/research-v5-modular` spec covering MA-tree clustering, histogram transmission, ANS static coding, wire-format bump, and pre-registered gates that can actually fail, honoring L-C1..C9 and I10/I11/I12 invariants.
- **Auditor - green at 07:26:11Z** - Run 33049525883 posted `## Daily Audit Report - 2026-08-27` to #70 (all green, R1-R5 pass, 0 failures in 200, models free, 0 PRs, no orphan). Health board current. No new bug issues.

## PIPELINE POSITION
Honest closure MERGED at 3d76bdb -> Owner summary at 07:02Z answered -> Auditor green 07:23Z -> Maintainer quiet watch 07:26Z -> Main advanced to d31f9b0 (no-pause mandate codified) -> Owner cascade directive at 08:19:10Z (/oc maintainer) re-activates Prism. Hephaestus now executes cascade: Research (Route 3) -> Architect -> Builder -> Review -> Test -> Maintainer merge (Refs #130) loop until M2 AND M3 pass both units, with transparent fallback to Route 1 then Route 2 if Route 3 fails per directive. Lab freeze exempts #130 exotic work; brainstorm stays frozen. No PRs in flight at dispatch; lab transitions from idle quiet watch to active exotic iteration.

## NEXT-RUN PLAYBOOK
1. Verify dispatch landed: `gh api repos/Userfrom1995/RandomLabs/issues/130/comments --jq '.[-1].body'` should show research dispatch acknowledgement; `gh run list --limit 10` should show `opencode` research run on #130 with head d31f9b0.
2. Verify main at d31f9b0: `git ls-remote origin main`, `gh api .../contents/prism/docs/research-complete-negative-ledger.md?ref=main` still 311cd97, `gh api .../contents/ideas/2026-08-26-prism-honest-closure.md?ref=main` still 1062117, `gh api .../contents/.github/agents/maintainer.md?ref=main` contains no-pause mandate.
3. Monitor Researcher output PR for Route 3 spec - must state both units on every measurement, include self-check gate that can fail, and document cascade transparently. When Architect completes, ensure build measures on exact Kodak PPMs vs REAL cjxl with byte-exact decode and fuzz clean.
4. If Route 3 Research fails to launch (no run within 30 min), re-dispatch `research` on #130 (check for crash/timeout with `continue-on-error` silent stall before re-triggering).
5. Keep `Refs #130` on all milestone PRs until M2 AND M3 both pass; never `Closes #130` on negative result. Only Owner halts.
6. Pages: verify `Deploy static site` on d31f9b0 succeeded; if not, `gh workflow run pages.yml`.
7. No Ideator dispatches (brainstorm freeze until M2/M3 pass). No lab/auditor/recover unless infra anomaly.

## ISSUES
- **#130** - OPEN - Prism exotic cascade RE-ACTIVATED (Route 3 Modular redesign dispatched 08:19Z, cascade 3->1->2, gates M2 <9.498/<3.166 M3 <8.655/<2.885 both units vs REAL cjxl)
- **#70** - Lab Health & Audit Logs - current, Auditor green at 07:26:11Z (run 33049525883, R1-R5 pass, 0 failures in 200).
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass per 2026-08-23 directive, exotic Prism work is exempt sole priority).

## OPEN QUESTIONS
- Will Researcher deliver a viable Modular redesign spec that breaks single-pass table-economics and clears 14.48% gap to M3?
- Will Route 3 blueprint pass Architect gate and Builder measurement vs REAL cjxl on Kodak-24?
- If Route 3 fails measurement, will cascade to Route 1 (multi-pass histograms) trigger automatically per directive?
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
