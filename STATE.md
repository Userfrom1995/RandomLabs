# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~23:10Z, maintainer run 33022157895 - issue_comment on PR #155 `/oc maintainer` at 23:08:09Z, build cancelled -> re-dispatch)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. For Prism #130, Owner explicitly authorized honest closure path (architect blueprint `ideas/2026-08-26-prism-honest-closure.md`) after 7 programs measured and rejected.
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130, orders iteration until M2/M3 genuinely pass. Current honest-closure path is owner-authorized closure at achieved level (path 1 of 3 in blueprint) - not a gate bypass.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Verified: `opencode/issue130-v4-transform` retained at `f20709f` after PR #153 merge.
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Honest closure reports FAIL honestly (e1 10.1210/3.3737, -8.21% vs 11.026 baseline, ~16.9% above JXL parity at e1) - not a gate lift.
- **BRAINSTORM FREEZE (2026-08-23T16:22Z via #130):** All other lab work FROZEN (Brainstorm board frozen, no Ideator) until M2/M3 genuinely pass - exempt for honest-closure documentation PR #155.

## MERGE CAPABILITY (verified at 2283012)
- `main` = `2283012af02b518c9c1ba13202852b23166f39a6` LIVE (`git ls-remote origin main` = 2283012, `gh api /git/refs/heads/main` = 2283012, message "lab: add .agent to .gitignore (Refs #153)" from PR #154). `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (unchanged).
- PR #153 MERGED at `64b4006d047c237835a0df78751a03bcb3a20a24` (`gh api pulls/153 --jq .merge_commit_sha` = 64b4006, head `f20709f` retained, branch `opencode/issue130-v4-transform` at f20709f) BUT current main tip is 2283012 - 64b4006 exists (`gh api commits/64b4006` true) yet not reachable from 2283012; documented as tip mismatch/possible rewind - PR #155 correctly bases on current 2283012, no orphan merge attempted.
- Merge for workflow-touching PRs via PAT sweep in `maintainer.yml` (post-PR #144) verified.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2283012.
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender Doctrine, `maintainer.yml` PAT sweep.
- **Retain fix LIVE:** branch retention verified on PR #153.
- **Open PRs:** 1 (`gh pr list --state open` = [155 `opencode/issue130-20260826225806` 9167513 Refs #130]).
- **Open issues:** #130 (Prism, OPEN - honest closure pending Builder on PR #155), #70 (lab-health), #42 (brainstorm frozen).

## IN FLIGHT
- **PR #155 - researcher: complete negative ledger after U1 FAIL - path forward documented (Refs #130)** - OPEN at `91675132a5d9c4f7162bb6553b7e2134dbebe5ef` (base 2283012, 15 commits, 12 files). Researcher `research-complete-negative-ledger.md` + Architect `ideas/2026-08-26-prism-honest-closure.md` + progress updates landed on this branch. Architect run 33021913775 success with `{"action":"build"}` handoff. Builder run 33022138112 **CANCELLED** (no push, triggered by `/oc build this` 23:07:49Z). Preview deployed. Re-dispatched this run via `{"action":"build","pr":155}`. Awaiting Builder push of closure deliverables.
- **Issue #130 - Prism v4/U-series** - OPEN, honest closure blueprint authorizes closure at achieved level (e1 10.1210/3.3737, U1 FAIL +20.32% WORSE). Seven programs measured: C/D/E/V/S/T/U (28 phases, 5 adopted, 18 rejected, zero format bytes). Gap decomposition B1-B6 measured. Progress tracker `progress/130-prism-true-jxl-parity.md` HONEST CLOSURE COMPLETE awaiting Builder finalization + Review + Test before formal close.

## PIPELINE POSITION
Researcher COMPLETE (PR #155, Refs #130, U1 FAIL ledger) -> Architect COMPLETE (blueprint `ideas/2026-08-26-prism-honest-closure.md`, progress HONEST CLOSURE COMPLETE, 33021913775 success) -> **Builder PENDING (cancelled build 33022138112 -> re-dispatched this run as `build` on PR #155)** -> Review (gated on Builder push) -> Test (gated on Review approve) -> Maintainer merge (Refs #130, preserves #130 for Owner to close honestly). Main at 2283012; PR #155 will rebase onto 2283012 and deliver closure artifacts.

## NEXT-RUN PLAYBOOK
1. Verify Builder on PR #155 pushed: `gh pr view 155 --json headRefOid --jq .headRefOid` moved beyond 9167513, `gh api pulls/155 --jq .head.sha` updated, `gh api contents progress/130-prism-true-jxl-parity.md?ref=opencode/issue130-20260826225806` shows closure finalization.
2. If Builder again cancelled/no-push, check `gh api issues/155/comments --jq '[.[] | select(.body | startswith("/oc build this (auto-retry"))] | length'` and re-dispatch once per ladder; second failure + halted production -> lab escalation with linkable run URL.
3. Verify main-tip mismatch: `git fetch origin main && git merge-base origin/main 64b4006` - if empty, document orphan; do not attempt to merge orphan 64b4006 via App token.
4. After Builder pushes, dispatch Review via `{"action":"review","pr":155,"head":"<new_sha>"}` if not auto-triggered; verify Tester approves before merging.
5. Verify `pages.yml` preview for PR #155 served under `/preview/pr-155/` after each push; dispatch `gh workflow run pages.yml` if production deploy needed post-merge (pre != new_sha guard).

## ISSUES
- **#130** - OPEN - Prism v4 honest closure pending Builder on PR #155 (research+architect complete, blueprint documents 3 owner-authorized paths, this PR executes path 1 at achieved level).
- **#155** - OPEN - Refs #130 - researcher+architect branch awaiting Builder closure (15 commits, head 9167513, base 2283012, build cancelled -> re-dispatched).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism honest closure exempt).

## OPEN QUESTIONS
- Will Builder on PR #155 produce closure deliverables and push cleanly after the cancellation (re-dispatch queued via cancel-in-progress false)?
- Will main-tip 64b4006 orphan be investigated or owner-directed to recover/rebase?
- Will Reviewer approve the negative ledger documentation and Tester verify byte-exactness without format-byte changes?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main (or branch head for branch fixes).
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging (Refs #130 keeps issue open).
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen`.
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.
- Anti-Surrender: never close a gated performance issue on a negative result - only Owner can halt; version-iterate until gates pass (honest closure is Owner-authorized, not a bypass).
- Orphan-main protection: verify `git merge-base origin/main <pr-head>` exists before merging; if empty, re-link via `git checkout -B <branch> origin/main && git cherry-pick <own commits>` before merge, never force-push to main.

 - Hephaestus, the Maintainer
