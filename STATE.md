# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~20:30Z, maintainer run 33010759794 - issue_comment on PR #151, `/oc maintainer` at 20:30:33Z, Hephaestus re-survey, v4 transform research delivered, architect+review dispatched)

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
- **Open PRs:** 2 (`gh pr list --state open` = [150] `opencode/issue130-20260826200948` head 4617232 Refs #130 + [151] `opencode/issue130-v4-research` head 300c8f9 Refs #130, base main, parent 2bd51b shared history not orphan). Branches retained: `opencode/issue130-20260825153143` at 7600377, `opencode/issue130-20260826070009` at 2c8d3f5, `opencode/issue148-retain-pr-branches` at 91dc672 via `git ls-remote`.
- **Open issues:** #130 (Prism, REOPENED active - v4 research delivered awaiting architect), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d, #130 reopened 20:01:21Z.

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 DELIVERED at `2026-08-26T20:24:50Z` as PR #151 (300c8f9). Genuine breakthrough spec: `prism/docs/research-v4-transform-domain.md` 448 lines locating unmeasured source-domain gap (spatial residual vs block frequency transform), 15-25% residual entropy literature, zero side-info distinction from rejected C4/C5 wavelet lifting, honest T4 arithmetic (15% -> 8.132/2.711 PASS), risk factors priced (rounding, domain mismatch, block boundaries, color), U-series pre-registered U0 BLOCKING harness addendum 21, U1 DCT gate >=+1.50 pct NET, U2 hybrid, U3 dual-unit gate, invariants I13/I14, handoff architect. Prior ledger: V1 C-series + D4c -1.65 pct (e1 10.1210/3.3737), E-series, V+S (S4 FAIL 9.5638/3.1879), T-series (T0 GREEN, T1a FAIL -32.76 vs +2.00, T2a FAIL -13.09 vs +0.50, T3 bar(i) FAIL -2.11 vs +1.50, T4 9.5671/3.1890 FAIL, T5 NOT triggered) - all with committed CSVs, 144/144 tests, honest closure at 3a521fe superseded by v4. Next: Architect blueprint + addendum 21, then Builder U0-U3 until M2/M3 pass.
- **PR #151 - researcher: Prism v4 research - the unmeasured transform domain (#130)** - OPEN head `300c8f9ea8c9faa83b3e26688feecaf7544c091f` (`opencode/issue130-v4-research`, base main, `Refs #130` not Closes, parent 2bd51b shared history). Adds `prism/docs/research-v4-transform-domain.md` 448 lines. Commit `researcher: Prism v4 research - the unmeasured transform domain and U-series program (#130)` with handoff architect. Awaiting Architect (dispatched this run) and Review (dispatched this run at head 300c8f9). Merge not intended until U-series measures; branch retained after future merge.
- **PR #150 - researcher: confirm research complete, T-series ready for builder (#130)** - OPEN head `461723236c13144b4611d828fc2afb30bdb789ea` (`opencode/issue130-20260826200948`, base main, `Refs #130` not Closes, parent 2bd51b shared history). Adds `prism/docs/research-status-20260826.md` 40 lines accurate ledger but stale for v4 handoff. Architect assessed stale at 20:15:10Z (T-series complete via T4 FAIL), Owner `/oc build this` 20:15:28Z superseded by v4 research. Pinged 20:15Z redirecting to #130 research. Now superseded by genuine PR #151; retain open as ledger until v4 architect lands, then close as superseded if Owner agrees. No merge, no build/fix/continue.
- **PR #149** - MERGED at `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` (rebase, 1 commit lab, Closes #148, branch retained 91dc672).
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (rebase, 38 commits, Closes #130 originally, branch retained 2c8d3f5). Ledger preserved on main.
- **PR #145** - CLOSED superseded `7600377b48f4760156ec3a005b0de060221f3dbf` (branch preserved).
- **Issue #148** - CLOSED via PR #149 at aa2285d (retain branches).
- **#70** - Lab Health & Audit Logs - current (49 comments).
- **#42** - Brainstorm Board FROZEN for new projects (Prism exempt under re-activation).

## PIPELINE POSITION
Research v4 DONE (PR #151 300c8f9, 448-line transform spec, U-series pre-registered, I13/I14) -> Architect QUEUED this run via `{"action":"architect","issue":130}` + Review QUEUED on PR #151 -> Builder U0 BLOCKING harness extension (addendum 21) -> U1-U3 measurement -> dual-unit gate. T-series honest closure 3a521fe retained as v4 baseline (10.1210/3.3737 e1, 9.5671/3.1890 T4). Pages green on 2bd51b.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` stays 2bd51b, `gh pr list --state open --json` includes 150 4617232 + 151 300c8f9, `gh api issues/130 --jq .state` = open, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep Hephaestus` present.
2. Watch Architect run on #130: expect blueprint `prism/docs/architecture-v4-*` or `prism/docs/architecture-v4-transform-domain.md` + spec addendum 21 at `prism/docs/spec-addendum-21-*` or `progress/130-prism-true-jxl-parity.md` reactivated to in_progress with module map, U0 blocking tasks, decision-tree rows, harness extension spec. Verify via `gh api issues/130/comments --paginate | grep -i architect` and `gh api pulls/151/files`.
3. Watch Reviewer on PR #151 head 300c8f9: expect `/oc approve` or `/oc fix` with file:line citations; if fix, dispatch Fixer via `{"action":"fix","pr":151}` (docs-only, App-token safe, no workflows).
4. After architect lands, dispatch Builder `{"action":"build","issue":130}` or `{"action":"continue","pr":<new-builder-pr>}` for U0 harness, then U1-U3 until dual-unit M2 AND M3 pass both units with fresh `prism bench --kodak` CSVs byte-identical.
5. PR #150: do not merge; may close as superseded after PR #151 merges architect blueprint, or retain as ledger. Do not trigger build/fix/continue on it.
6. No merge of any Prism v4 PR until dual-unit M2 AND M3 pass both units; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free`.

## ISSUES
- **#130** - REOPENED active - Prism v4 research delivered PR #151 300c8f9, architect+review dispatched this run (awaiting blueprint + addendum 21).
- **#151** - OPEN 300c8f9 Refs #130 - genuine v4 transform research, 448 lines, U0-U3 pre-registered, awaiting architect+review.
- **#150** - OPEN 4617232 Refs #130 - stale status doc superseded by #151, pinged 20:15Z, retain until architect replaces.
- **#149** - MERGED at aa2285d (91dc672 retained, Closes #148).
- **#148** - CLOSED via #149 at aa2285d.
- **#147** - MERGED at 3a521fe (38 commits, Closes #130 originally).
- **#145** - CLOSED superseded 7600377 (branch preserved).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Architect deliver v4 blueprint with U0 blocking harness spec (addendum 21) and module boundaries that keep transform zero-side-info invariant intact?
- Will Reviewer approve PR #151 300c8f9 cleanly or request doc fixes before Builder starts U0?
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
