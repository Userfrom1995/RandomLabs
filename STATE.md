# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~20:39Z, maintainer run 33011325010 + 33011524608 - issue_comment on PR #151/#152, Hephaestus re-survey, PR #151 approved e1e6a89, PR #152 architect delivered aaa4fc5, review dispatched)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Maintainer is now **Hephaestus** (succeeds Mae, lineage preserved). Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. All progress preserved verbatim. (Previous freeze 2026-08-23T16:22Z superseded for Prism: board remains frozen for new projects, Prism is active priority.)
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130 and orders Prism v4 ignition using all V1/V2/V3 learnings, iterating versions until M2/M3 genuinely pass. "From now on, we keep iterating on versions and approaches until we achieve the target performance gates."
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. LIVE at 2bd51b via `.github/agents/maintainer.md:107` `gh pr merge <N> --rebase` without --delete-branch (verified `git ls-remote origin opencode/issue148-retain-pr-branches` = 91dc672).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Historical - merge PR #131 as ledger only. Superseded by T-series honest closure at 3a521fe and v4 reopen.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z) + AUTONOMOUS PIVOT (2026-08-26T07:12:57Z):** Mae had free hand on architectural pivots. Inherited by Hephaestus with Anti-Surrender escalation. Hard restriction remains: M2/M3 dual-unit gates never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement.

## MERGE CAPABILITY (verified at 2bd51b)
- `main` = `2bd51b7b515188d172bdc412a519a6c983afb2cc` LIVE (owner push chore Hephaestus, parent `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` retain fix, grandparent `3a521fe233e98b318c1a6de1b173fa231a55eba1` prism honest closure). Verify: `git ls-remote origin main` = 2bd51b, `gh api .../commits/2bd51b --jq .parents[0].sha` = aa2285d, compare aa2285d...2bd51b status ahead 1 shared history, not orphan.
- PAT sweep live on main (596 lines, PAT-backed merge at 442) verified via contents API at 2bd51b; App-token merge for docs-only safe, workflow-touching still requires PAT. `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Hephaestus"` = 1 present, `grep -n "Do NOT use --delete-branch"` = 108 present.
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (4x opencode.yml `mimo-v2.5-free`, 1029 `muse-spark`), pages deploy success on 2bd51b.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2bd51b (no workflow diff vs aa2285d except identity).
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, seed Hephaestus with Mae lineage, Anti-Surrender Doctrine 27, `.github/workflows/maintainer.yml` retains PAT sweep. All verified on main at 2bd51b.
- **Retain fix LIVE:** `AGENTS.md:61` + corpus mirrors verified on main at 2bd51b.
- **Open PRs:** 3 (`gh pr list --state open` = [150] `opencode/issue130-20260826200948` head 4617232 Refs #130 + [151] `opencode/issue130-v4-research` head e1e6a89 Refs #130 + [152] `opencode/issue130-v4-research`? actually `architect: U-series` head aaa4fc5 Refs #130, base main, parent 2bd51b shared history not orphan). Branches retained: `opencode/issue130-20260825153143` at 7600377, `opencode/issue130-20260826070009` at 2c8d3f5, `opencode/issue148-retain-pr-branches` at 91dc672 via `git ls-remote`.
- **Open issues:** #130 (Prism, REOPENED active - v4 research approved + architect delivered awaiting review), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d, #130 reopened 20:01:21Z.

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 DELIVERED at `2026-08-26T20:24:50Z` as PR #151 (e1e6a89 after fix), architect DELIVERED at `2026-08-26T20:39:29Z` as PR #152 (aaa4fc5). Research spec `prism/docs/research-v4-transform-domain.md` 465 lines locating unmeasured source-domain gap, honest T4 15% -> 8.132/2.711 PASS, U-series U0 BLOCKING harness addendum 21, U1 >=+1.50 pct NET, U2 hybrid, U3 dual-unit gate, invariants I13/I14. Architect adds `prism/docs/architecture-jxl-parity-useries.md` + `prism/docs/algorithmic-spec.md` spec 21 + `progress/130-prism-true-jxl-parity.md` reactivated to in_progress with U-series checklist. Next: Review on PR #152, then Builder U0-U3 until M2/M3 pass.
- **PR #151 - researcher: Prism v4 research - the unmeasured transform domain (#130)** - OPEN head `e1e6a89762b8f1646c6392a6e99cdfbcf96191e5` (`opencode/issue130-v4-research`, base main, `Refs #130` not Closes, parent 2bd51b shared history). Adds `prism/docs/research-v4-transform-domain.md` 465 lines + `.agent/decision.json` architect handoff. Fix pushed 20:37:04Z verifying VarDCT->Modular, byte-exact reversibility, VB 0 delta, padding per I12. Reviewed APPROVED 20:37:48Z at e1e6a89 by github-actions[bot] (run 33011309281) with 13 checks, no new findings, ready for architect. No merge until U-series measures; branch retained after future merge.
- **PR #152 - architect: U-series blueprint + addendum 21 for transform-domain program (#130)** - OPEN head `aaa4fc5d0fba22c858c9998f94d894574a936ff8` (`architect` branch, base main, `Refs #130` not Closes, parent 2bd51b shared history, MERGEABLE/CLEAN). Adds `prism/docs/algorithmic-spec.md` + `prism/docs/architecture-jxl-parity-useries.md` + `progress/130-prism-true-jxl-parity.md` reactivated + `.agent/decision.json` continue. Awaiting Review (dispatched this run at head aaa4fc5). Merge not intended until U0-U3 measures; branch retained.
- **PR #150 - researcher: confirm research complete, T-series ready for builder (#130)** - OPEN head `461723236c13144b4611d828fc2afb30bdb789ea` (`opencode/issue130-20260826200948`, base main, `Refs #130` not Closes, parent 2bd51b shared history). Adds `prism/docs/research-status-20260826.md` 40 lines stale ledger. Superseded by PRs #151/#152; retain open as ledger until v4 review passes, then close as superseded if Owner agrees. No merge, no build/fix/continue.
- **PR #149** - MERGED at `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` (rebase, 1 commit lab, Closes #148, branch retained 91dc672).
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (rebase, 38 commits, Closes #130 originally, branch retained 2c8d3f5).
- **PR #145** - CLOSED superseded `7600377b48f4760156ec3a005b0de060221f3dbf` (branch preserved).
- **Issue #148** - CLOSED via PR #149 at aa2285d (retain branches).
- **#70** - Lab Health & Audit Logs - current (49 comments).
- **#42** - Brainstorm Board FROZEN for new projects (Prism exempt under re-activation).

## PIPELINE POSITION
Research v4 DONE (PR #151 e1e6a89 approved 20:37:48Z, 465-line transform spec, U-series pre-registered, I13/I14) -> Architect DONE (PR #152 aaa4fc5, U-series blueprint + spec 21 + progress reactivated to in_progress) -> Review QUEUED this run via `{"action":"review","pr":152,"head":"aaa4fc5"}` -> Builder U0 BLOCKING harness extension (addendum 21) -> U1-U3 measurement -> dual-unit gate. T-series honest closure 3a521fe retained as v4 baseline (10.1210/3.3737 e1, 9.5671/3.1890 T4). Pages green on 2bd51b and preview pr-151/pr-152.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` stays 2bd51b, `gh pr list --state open --json` includes 150 4617232 + 151 e1e6a89 + 152 aaa4fc5, `gh api issues/130 --jq .state` = open, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep Hephaestus` present.
2. Watch Reviewer on PR #152 head aaa4fc5: expect `/oc approve` or `/oc fix` with file:line citations; if fix, dispatch Fixer via `{"action":"fix","pr":152}` (docs-only, App-token safe), if approve then Builder via `{"action":"build","issue":130}` or `{"action":"continue","pr":152}` for U0 harness.
3. Watch Tester if dispatched on PR #151 e1e6a89 (user /oc test 20:37:52Z): research PR needs no bench, ignore unless Tester posts `/oc fix` with harness concern.
4. PR #150: do not merge; may close as superseded after PRs #151/#152 merge U-series, or retain as ledger. Do not trigger build/fix/continue on it.
5. No merge of any Prism v4 PR until dual-unit M2 AND M3 pass both units; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free`.

## ISSUES
- **#130** - REOPENED active - Prism v4 research approved e1e6a89, architect delivered aaa4fc5, review dispatched this run (awaiting blueprint approval + addendum 21).
- **#151** - OPEN e1e6a89 Refs #130 - genuine v4 transform research, 465 lines, U0-U3 pre-registered, APPROVED 20:37:48Z at e1e6a89, ready for build after architect review.
- **#152** - OPEN aaa4fc5 Refs #130 - architect U-series blueprint + spec 21, awaiting review at aaa4fc5.
- **#150** - OPEN 4617232 Refs #130 - stale status doc superseded by #151/#152, retain until review passes.
- **#149** - MERGED at aa2285d (91dc672 retained, Closes #148).
- **#148** - CLOSED via #149 at aa2285d.
- **#147** - MERGED at 3a521fe (38 commits, Closes #130 originally).
- **#145** - CLOSED superseded 7600377 (branch preserved).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Reviewer approve PR #152 aaa4fc5 cleanly or request doc fixes before Builder starts U0?
- Will U1 block-DCT measurement clear >=+1.50 pct NET gate and justify U2 hybrid, or force honest closure after pricing transform domain?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main (or branch head for branch fixes).
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer.
- Model pins must stay on free tiers in BOTH `opencode.json` (model + small_model) and `.github/workflows/*.yml` model inputs; dead/paid pins halt production with Model not found / CreditsError.
- A closed build PR with advancing branch is recovered via `recover` (cherry-pick onto main), not plain `reopen`.
- PR branches must remain intact after merge (--delete-branch never used) for archival/history/recovery.
- Anti-Surrender: never close a gated performance issue on a negative result - only Owner can halt; version-iterate until gates pass.

 - Hephaestus, the Maintainer
