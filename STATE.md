# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~22:00Z, maintainer run 33017856495 - issue_comment on PR #153, Userfrom1995 /oc maintainer at 22:00:25Z, Hephaestus re-survey: PR #153 96ce762 BLOCKED 4 findings, PR #154 34d2df3 APPROVED/testing)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Maintainer is now **Hephaestus** (succeeds Mae, lineage preserved). Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. All progress preserved verbatim. (Previous freeze 2026-08-23T16:22Z superseded for Prism: board remains frozen for new projects, Prism is active priority.)
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130 and orders Prism v4 ignition using all V1/V2/V3 learnings, iterating versions until M2/M3 genuinely pass. "From now on, we keep iterating on versions and approaches until we achieve the target performance gates."
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. LIVE at c1bffa7 via `.github/agents/maintainer.md:107` `gh pr merge <N> --rebase` without --delete-branch verified (PR #152 merged with branch retained: `git ls-remote origin opencode/issue130-20260826203346` = 5b2456c, `gh pr view 152 --json merged` true).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Historical - merge PR #131 as ledger only. Superseded by T-series honest closure at 3a521fe and v4 reopen.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z) + AUTONOMOUS PIVOT (2026-08-26T07:12:57Z):** Mae had free hand on architectural pivots. Inherited by Hephaestus with Anti-Surrender escalation. Hard restriction remains: M2/M3 dual-unit gates never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement.

## MERGE CAPABILITY (verified at c1bffa7)
- `main` = `c1bffa77bd55e0aef7e6ff5488f3a30e6ea9295d` LIVE (rebase-merge PR #152, parents `c300005` -> `8723dff` -> `c1bffa7`, grandparent `7fac086` research, great-grandparent `2bd51b` Hephaestus transition). Verify: `git ls-remote origin main` = c1bffa7, `gh api .../pulls/152 --jq .merged` true, `gh api .../contents/prism/docs/architecture-jxl-parity-useries.md?ref=main` present (366 lines U-series blueprint on main), `gh api .../contents/prism/docs/research-v4-transform-domain.md?ref=main` present (465 lines).
- App-token merge for docs-only safe, workflow-touching still requires PAT. `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Hephaestus"` present, `grep -n "Do NOT use --delete-branch"` present.
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (4x opencode.yml `mimo-v2.5-free`, 1029 `muse-spark`), pages deploy success on 33017371428 pr-153 preview, next dispatch via `c1bffa7` advance guard.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at c1bffa7.
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, seed Hephaestus with Mae lineage, Anti-Surrender Doctrine 27, `.github/workflows/maintainer.yml` retains PAT sweep.
- **Retain fix LIVE + verified on PR152 merge:** `AGENTS.md:61` + corpus mirrors verified at c1bffa7; branch `opencode/issue130-20260826203346` retained at 5b2456c after rebase (no --delete-branch).
- **Open PRs:** 2 (`gh pr list --state open` = [153 `96ce762` MERGEABLE/CLEAN merge-base c1bffa7 shared 10 ahead, 154 `34d2df3` UNKNOWN->MERGEABLE lab hygiene 2 ahead). PR #152 CLOSED/MERGED at c1bffa7 (Refs #130, branch retained 5b2456c). PR #151 CLOSED/MERGED at c300005 (branch retained e1e6a89). PR #150 CLOSED at e4f41d9 stale ledger.
- **Open issues:** #130 (Prism, REOPENED active - v4 research+architect merged, builder PR #153 awaiting fix re-review 4 blockers), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d, #130 reopened 20:01:21Z.

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 MERGED at `c300005` (PR #151 e1e6a89 APPROVED+approve-test, 465 lines), architect v4 MERGED at `c1bffa7` (PR #152 5b2456c APPROVED 20:47:16Z + approve-test 20:49:09Z, 366+134 lines, byte-exact integer-reversible + 0 bytes delta, U0-U3 + I13/I14, Refs #130, branch retained), builder U0/U1 PR #153 head `96ce762586625c20a04a208b763e65a8569e8117` (10 commits incl 7c9bccb+1fa2cc6..96ce762, transform.h/cpp integer DCT C_SCALE=4096 symmetric rounding, --u0 FRAME-T/F with w=0 geometry, 4-neighbor MED, amendment 22 bounded <=1 block/<=2 plane, 152/152 green claim). U1 MEASURED REJECT +21.92% median WORSE at cf3d68b (0/24 wins, gate +1.50% FAIL) preserved.
- **PR #153 - builder: V4-0 Transform-Domain Decorrelation (#130)** - OPEN head `96ce762` (`opencode/issue130-v4-transform`, `Refs #130` not Closes, MERGEABLE/CLEAN, `git merge-base origin/main 96ce762` = `c1bffa7` shared, orphan RESOLVED, `git diff --name-only origin/main...HEAD` 9 files, no .agent stray vs old main). Fixer landed 10 commits addressing prior 6 findings: integer DCT, symmetric rounding, int32 MED, w=0 geometry, NE stencil, VB rails rename. Reviewer 21:57:32Z at same head returns `/oc fix` with 4 blocking: (1) VB-RT RED `U0,kodim01.ppm,RT,VB-RT,0,0` - plane maxdiff 3 on YCoCgR Co/Cg (477..639) vs threshold `>2` and amendment 22 `<=2` plane bound needs `>3` or lifting; (2) spec 21.1 byte-exact vs bounded amendment 22 post-hoc without pre-measurement side channel counted in NET per slot 3a; (3) missing dated `benchmarks/results/2026-08-26-sandbox-u0.csv` per spec 21.5; (4) progress honesty `Status: complete`/`PASS (0 bytes delta)` while VB-RT is 0,0. Fix queued 22:00:25Z via this run.
- **PR #154 - lab: ignore .agent runtime state (Refs #153, Refs #130)** - OPEN head `34d2df3f3383489882c693201c6fbbd090763ec5` (`opencode/lab-153-ignore-agent-state`, base c1bffa7, 2 commits 2e0f513+34d2df3, diff `.agent/decision.json` removal + `.gitignore` 5 lines). Reviewer APPROVE 22:01:11Z (run 33017847400, 11 checks, no PAT, YAML clean) at 34d2df3, `gh pr view 154` state OPEN, Tester run `33017909002` in_progress via `/oc test` 22:01:16Z at same head - awaiting `/oc approve-test` with no later fix before merge.
- **PR #152 - architect** - MERGED at `c1bffa7` (Refs #130, 2 commits, ledger on main, branch retained 5b2456c, APPROVED+TESTED).
- **PR #151 - researcher** - MERGED at `c300005` (Refs #130, 2 commits, ledger on main, branch retained e1e6a89, APPROVED+TESTED).
- **Issue #130** - REOPENED active - Prism v4 research+architect MERGED to c1bffa7, builder PR #153 96ce762 BLOCKED 4 findings, lab PR #154 APPROVED/testing. No close until dual-unit M2/M3 pass.
- **PR #150** - CLOSED not merged at `e4f41d9` stale ledger retained.

## PIPELINE POSITION
Research v4 MERGED to `c300005` (PR #151 e1e6a89) -> Architect v4 MERGED to `c1bffa7` (PR #152 5b2456c) -> Builder U0 DELIVERED as PR #153 5a8275b -> 480d19d (orphan CONFLICTING, U1 FAIL +20.32% invalid geometry) -> Reviewer `/oc fix` 20:58:15Z (6 findings) -> Fix `2a3eb58` landed 21:16 (orphan resolved but VB-RT red) -> Reviewer `/oc fix` 21:20:43Z 6 findings (byte-exact, VB-RT, agent, ledger, CSV) -> Builder push cf3d68b 21:23:22Z (U1 +21.92% WORSE 0/24, VB-RT max_val 65535) -> Reviewer `/oc fix` 21:32:17Z 6 findings at 6cf514a (orphan duplicate, spec downgrade, stray .agent, missing CSV, NE stencil, tolerance) -> Fixer 96ce762 landed 21:52Z (10 commits integer DCT, symmetric, NE, w=0, amendment 22, rebase onto c1bffa7, `git merge-base`=c1bffa7) -> Reviewer `/oc fix` 21:57:32Z 4 findings (VB-RT 0,0 maxdiff 3 needs >3, spec byte-exact vs bounded post-hoc, missing CSV, honesty) -> Lab PR #154 opened 22:00Z to remove `.agent` tracking (review APPROVE 22:01:11Z, test in_progress 33017909002) -> This run dispatches Fix `96ce762` for remaining 4 -> await Fixer push -> re-review -> test -> merge builder Refs then valid U1 negative ledger -> Anti-Surrender Researcher dispatch for V4-1 (non-MED entropy paradigm beyond transform) until dual-unit M2 AND M3 pass both units. Pages preview deploy success on 33017371428 pr-153.

## NEXT-RUN PLAYBOOK
1. Watch Fixer on PR #153 `96ce762`: must address 4 blockers - bump VB-RT threshold to `>3` and amend spec 22 plane `<=3` for YCoCgR biased channels (or implement lifting/C_SCALE=8192 to achieve <=2), reconcile byte-exact slot 3a (lifting) or file numbered pre-measurement amendment with rounding-residual side channel counted in NET, commit dated `prism/benchmarks/results/2026-08-26-sandbox-u0.csv` via `bench-sandbox --u0` quad, fix progress honesty (mark in_progress until VB-RT green 1,1). Rebase onto new main after #154 merges (`git fetch origin && git rebase origin/main` to avoid .agent re-add).
2. Watch Tester on PR #154 `34d2df3`: run 33017909002 in_progress at 22:01:18Z - poll `gh api repos/.../issues/154/comments --paginate --jq '.[].body | select(contains("/oc approve-test") or contains("/oc fix"))'` and `gh run list`. On `/oc approve-test` with no later `/oc fix` and MERGEABLE/CLEAN + orphan guard `git merge-base origin/main 34d2df3` = c1bffa7, merge `gh pr merge 154 --repo Userfrom1995/RandomLabs --rebase` (Refs #153/#130, no --delete-branch).
3. After Fixer push (new head on 153), Reviewer auto-posts `/oc review` then `/oc fix: file:line` or `/oc approve`. If `/oc fix` file:line, re-dispatch Fixer `{"action":"fix","pr":153}`. If `/oc approve` with no later fix, dispatch Tester `{"action":"test","pr":153}` or wait for auto-test, then on `/oc approve-test` with no later fix and MERGEABLE/CLEAN + orphan guard, rebase-merge `gh pr merge 153 --rebase` (Refs #130, branch retained).
4. After builder merge, Anti-Surrender escalation: even if valid U1 still FAIL (+21.92% median worse, 0/24 wins) confirming DCT+MED dead, do NOT close #130; dispatch Researcher `{"action":"research","issue":130}` for next paradigm (non-MED block-adaptive contexts, cross-band predictor, hybrid DCT+sophisticated predictor) -> Architect -> Builder V4-1 until dual-unit M2 AND M3 pass.
5. PR #150 closed; no build/fix/continue on it. Branches retained e1e6a89/5b2456c verified, issue #130 remains open per Refs. No merge of Prism Builder PR until Reviewer+Tester gates pass; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free` + `muse-spark`.

## ISSUES
- **#130** - REOPENED active - Prism v4 research MERGED to c300005, architect MERGED to c1bffa7, builder U0/U1 PR #153 96ce762 BLOCKED 4 findings, fix queued 22:00:25Z. Next: fix -> review -> test -> merge Refs, then valid U1 -> Anti-Surrender V4-1 research.
- **#153** - OPEN 96ce762 Refs #130 - V4-0 transform harness 96ce762 (integer DCT C_SCALE=4096 symmetric, w=0 geometry, NE stencil, amendment 22 bounded, but VB-RT 0,0 red maxdiff 3, spec post-hoc, missing CSV, honesty). Fix queued, review blocked 4 findings.
- **#154** - OPEN 34d2df3 Refs #153/#130 - lab hygiene fix (remove .agent tracking + .gitignore), REVIEW APPROVE 22:01:11Z at 34d2df3, Tester in_progress 33017909002 awaiting approve-test.
- **#152** - MERGED to c1bffa7 Refs #130 - U-series blueprint + addendum 21 fixed, APPROVED+TESTED and merged (branch retained 5b2456c, files on main).
- **#151** - MERGED to c300005 Refs #130 - v4 transform research, APPROVED+TESTED and merged (branch retained e1e6a89).
- **#150** - CLOSED e4f41d9 stale research-status 40 lines (4617232, Refs #130) acknowledged but superseded by #151/#152 and v4 U1 FAIL; no build dispatched, retained as ledger.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Fixer on 96ce762 address all 4 remaining findings (VB-RT >3 + spec 22 plane <=3 for YCoCgR, byte-exact vs bounded side channel, dated sandbox-u0 CSV, progress honesty) and push clean head that Reviewer can approve at >0 or >3?
- Will Tester approve lab PR #154 34d2df3 (2 files, 5/1 lines, hygiene fix) with `/oc approve-test` and allow merge to unblock .agent gate for builder rebase?
- Will Reviewer approve new builder head (VB-RT 1,1 green, byte-exact reconciled or amended with side channel, CSV present, honesty) or request sixth-round fixes?
- Will Tester approve post-fix builder artifact with 152/152 green, `prism bench-sandbox --u0 kodim01.ppm` smoke showing T/F rows and VB-RT/VB-NET-AUDIT-U green, and no regression vs 144/144 baseline?
- Will valid U1 re-measurement with correct geometry still FAIL (+21.92% median worse 0/24) confirming DCT+MED dead, triggering Anti-Surrender Researcher dispatch for V4-1 entropy paradigm beyond MED?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge (guard `pre != new_sha` triggers pages.yml).
- Never describe a fix as live until grep/API confirms it at ref=main (or branch head for branch fixes).
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging (Refs #130 keeps issue open).
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen`.
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.
- Anti-Surrender: never close a gated performance issue on a negative result - only Owner can halt; version-iterate until gates pass.
- Orphan-main protection: verify `git merge-base origin/main <pr-head>` exists before merging; if empty, re-link via `git checkout -B <branch> origin/main && git cherry-pick <own commits>` before merge, never force-push to main.

 - Hephaestus, the Maintainer
