# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~20:46Z, maintainer run 33012065326 - issue_comment on PR #152, `/oc maintainer` at 20:46:12Z, Hephaestus re-survey + fix verification, reviews in_progress at new head)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Maintainer is now **Hephaestus** (succeeds Mae, lineage preserved). Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. All progress preserved verbatim. (Previous freeze 2026-08-23T16:22Z superseded for Prism: board remains frozen for new projects, Prism is active priority.)
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130 and orders Prism v4 ignition using all V1/V2/V3 learnings, iterating versions until M2/M3 genuinely pass. "From now on, we keep iterating on versions and approaches until we achieve the target performance gates."
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. LIVE at c300005 via `.github/agents/maintainer.md:107` `gh pr merge <N> --rebase` without --delete-branch verified (PR #151 merged with branch retained: `git ls-remote origin opencode/issue130-v4-research` = e1e6a89, `gh pr view 151 --json merged` true).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Historical - merge PR #131 as ledger only. Superseded by T-series honest closure at 3a521fe and v4 reopen.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z) + AUTONOMOUS PIVOT (2026-08-26T07:12:57Z):** Mae had free hand on architectural pivots. Inherited by Hephaestus with Anti-Surrender escalation. Hard restriction remains: M2/M3 dual-unit gates never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement.

## MERGE CAPABILITY (verified at c300005)
- `main` = `c30000547391b37fda9e656c3ca7332b8cf58373` LIVE (rebase-merge PR #151, parents `7fac086` + `2bd51b`, grandparent `aa2285d` retain fix, great-grandparent `3a521fe` honest closure). Verify: `git ls-remote origin main` = c300005, `gh api .../commits/c300005 --jq .parents[0].sha` = 7fac086, `gh api .../contents/prism/docs/research-v4-transform-domain.md?ref=main --jq .sha` = 8d605a present (465 lines research v4 on main).
- PAT sweep live on main (632 lines, PAT-backed merge at 442) verified via contents API at c300005 (carryover from 2bd51b); App-token merge for docs-only safe, workflow-touching still requires PAT. `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Hephaestus"` present, `grep -n "Do NOT use --delete-branch"` present.
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (4x opencode.yml `mimo-v2.5-free`, 1029 `muse-spark`), pages deploy success on 33012025922 (branch pr-152 preview), next dispatch via `c300005` advance guard.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at c300005 (no workflow diff vs 2bd51b except research merge).
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, seed Hephaestus with Mae lineage, Anti-Surrender Doctrine 27, `.github/workflows/maintainer.yml` retains PAT sweep. All verified on main at c300005.
- **Retain fix LIVE + verified on PR151 merge:** `AGENTS.md:61` + corpus mirrors verified at c300005; branch `opencode/issue130-v4-research` retained at e1e6a89 after rebase (no --delete-branch, `gh pr view 151 --json headRefName` still present via ls-remote).
- **Open PRs:** 2 (`gh pr list --state open` = [150] `opencode/issue130-20260826200948` head 4617232 Refs #130 superseded stale (UNKNOWN mergeable) + [152] `opencode/issue130-20260826203346` head 5b2456c Refs #130 architect blueprint+fix, base `2bd51b` -> `c300005`, parent `2bd51b` shared history not orphan, MERGEABLE/CLEAN at new head). PR #151 CLOSED/MERGED at c300005 (Refs #130, ledger on main, branch retained e1e6a89). Branches retained: `opencode/issue130-20260825153143` at 7600377, `opencode/issue130-20260826070009` at 2c8d3f5, `opencode/issue148-retain-pr-branches` at 91dc672 via `git ls-remote`.
- **Open issues:** #130 (Prism, REOPENED active - v4 research merged + architect fix pending review), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d, #130 reopened 20:01:21Z.

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 DELIVERED at `2026-08-26T20:24:50Z` as PR #151 -> MERGED at `2026-08-26T20:42:43Z` to `c300005` (2 commits 7fac086 + c300005, APPROVED 20:37:48Z + approve-test 20:39:32Z, 144/144 tests, Refs #130, branch retained), architect v4 DELIVERED at `2026-08-26T20:38:47Z` as PR #152 (aaa4fc5, U-series blueprint + addendum 21) -> FIXED at `2026-08-26T20:46:00Z` to `5b2456c` (Fixer applied all 4 findings: integer-reversible + 0 bytes delta byte-exact pins, VB-transform-lossless, test matrix + checklist). Genuine breakthrough spec: research 465 lines locating unmeasured source-domain gap, 15-25% residual entropy literature, zero side-info distinction from rejected C4/C5 lifting, honest T4 arithmetic (15% -> 8.132/2.711 PASS), risk factors priced, U-series pre-registered U0 BLOCKING harness addendum 21, U1 DCT gate >=+1.50 pct NET, U2 hybrid, U3 dual-unit gate, invariants I13/I14. Blueprint `prism/docs/architecture-jxl-parity-useries.md` 366 lines + algorithmic-spec addendum 21 134 lines. Prior ledger V1 C-series + D4c -1.65 pct etc superseded by v4. Next: Review PR #152 at 5b2456c -> merge after approve+test -> Builder U0 BLOCKING harness extension (addendum 21) -> U1-U3 measurement -> dual-unit gate.
- **PR #152 - architect: U-series blueprint + addendum 21 (#130)** - OPEN head `5b2456cd981a7290cb30cbc96921b2fd69567c32` (`opencode/issue130-20260826203346`, base `2bd51b` -> `c300005`, `Refs #130` not Closes, parent `2bd51b` shared history, 1 behind c300005 post-fix, parent still 2bd51b). Adds `prism/docs/architecture-jxl-parity-useries.md` 366 lines + modifies `prism/docs/algorithmic-spec.md` +134 addendum 21 (now byte-exact integer-reversible, Q=0 lossless 0 bytes delta, slot 3a) + `progress/130-prism-true-jxl-parity.md` +46 U-series checklist (U-pivot Architect phase [x]). Fixes applied: `Fixer` 5b2456c verified integer-reversible (3), 0 bytes delta (3), byte-exact (11). Awaiting Review verdict at new head 5b2456c (runs 33012057125 in_progress + 33012065331 pending, dispatched by `/oc review` 20:46:03Z/20:46:15Z). Merge not intended until review + approve-test; branch retained after future merge.
- **PR #151 - researcher: Prism v4 research - the unmeasured transform domain (#130)** - MERGED at `c30000547391b37fda9e656c3ca7332b8cf58373` (`opencode/issue130-v4-research`, base main `2bd51b`, `Refs #130` not Closes, 2 commits `7fac086` + `c300005`, parents `[7fac086,2bd51b]` chain). Adds `prism/docs/research-v4-transform-domain.md` 465 lines (8d605a on main) + `.agent/decision.json`. Reviewed APPROVED at e1e6a89 20:37:48Z + Tested `/oc approve-test` 20:39:32Z (144/144, no regression, em dash 0, VarDCT fix, byte-exact VB rails), merge via `gh pr merge --rebase` (App-token docs-only). Ledger on main, branch retained e1e6a89, issue #130 remains open per Refs.
- **PR #150 - researcher: confirm research complete, T-series ready for builder (#130)** - OPEN head `461723236c13144b4611d828fc2afb30bdb789ea` (`opencode/issue130-20260826200948`, base main, `Refs #130` not Closes, parent 2bd51b shared history). Adds `prism/docs/research-status-20260826.md` 40 lines accurate ledger but stale for v4 handoff. Architect assessed stale at 20:15:10Z, Owner `/oc build this` 20:15:28Z superseded by v4 research. Pinged 20:15Z redirecting to #130 research. Now superseded by genuine PR #151 merge; retain open as ledger until v4 architect merges, then close as superseded if Owner agrees. No merge, no build/fix/continue.
- **PR #149** - MERGED at `aa2285dc0fbe33c8e3eea6f3af7ee12ea2293b58` (rebase, 1 commit lab, Closes #148, branch retained 91dc672).
- **PR #147** - MERGED at `3a521fe233e98b318c1a6de1b173fa231a55eba1` (rebase, 38 commits, Closes #130 originally, branch retained 2c8d3f5). Ledger preserved on main (now superseded reopen).
- **PR #145** - CLOSED superseded `7600377b48f4760156ec3a005b0de060221f3dbf` (branch preserved).
- **Issue #148** - CLOSED via PR #149 at aa2285d (retain branches).
- **#70** - Lab Health & Audit Logs - current (49 comments).
- **#42** - Brainstorm Board FROZEN for new projects (Prism exempt under re-activation).

## PIPELINE POSITION
Research v4 MERGED to `c300005` (PR #151 e1e6a89 approve + approve-test -> rebase `c300005`) -> Architect review FIXED at `5b2456c` (Fixer applied 4 findings, runs 33012057125 + 33012065331 in_progress at new head) -> Merge architect after approve+test -> Builder U0 BLOCKING harness extension (addendum 21, VB rails byte-exact 0 bytes delta) -> U1 block-DCT measurement (gate >=+1.50 pct NET) -> U2 hybrid -> U3 dual-unit gate (M2 <9.498/<3.166, M3 <8.655/<2.885, both units, fresh cjxl -d0 -e9). T-series honest closure 3a521fe retained as v4 baseline (10.1210/3.3737 e1, 9.5671/3.1890 T4). Pages success on 33012025922 (pr-152 preview), next deploy via c300005 advance guard after architect merge.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` = c300005 (post-merge), `gh api pulls/151 --jq .merged` true, `gh api pulls/152 --jq .head.sha` = 5b2456c, `gh pr view 152 --json mergeable` = MERGEABLE CLEAN (merge-base 2bd51b shared, 1 behind c300005), `gh api .../contents/prism/docs/research-v4-transform-domain.md?ref=main --jq .sha` = 8d605a, `gh api issues/130 --jq .state` = open, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep Hephaestus` present.
2. Watch Reviewer on PR #152 head 5b2456c: expect `/oc approve` or `/oc fix` with file:line citations for byte-exact verification; if `/oc fix`, dispatch Fixer via `{"action":"fix","pr":152}` (docs-only, App-token safe, no workflows). If `/oc approve`, watch Tester `{"action":"test","pr":152}` or auto-approve via workflow, then verify addendum 21 constants survive, `prism/docs/` vs root `docs/` separation holds.
3. After PR #152 approves + tests pass (`/oc approve-test` with no later fix, MERGEABLE CLEAN), rebase-merge it via `gh pr merge 152 --rebase` (App-token docs-only, Refs #130, branch retained). Then dispatch Builder `{"action":"build","issue":130}` for U0 harness (BLOCKING addendum 21 VB rails byte-exact 0 bytes delta) -> U1-U3 until dual-unit M2 AND M3 pass both units with fresh `prism bench --kodak` CSVs byte-identical.
4. PR #150: do not merge; may close as superseded after PR #152 merges, or retain as ledger. Do not trigger build/fix/continue on it. PR #151 branch retained e1e6a89 verified.
5. No merge of any Prism v4 Builder PR until dual-unit M2 AND M3 pass both units; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free` + `muse-spark`.

## ISSUES
- **#130** - REOPENED active - Prism v4 research MERGED to c300005 (PR #151 e1e6a89), architect PR #152 5b2456c FIXED awaiting review approval (runs 33012057125 + 33012065331 in_progress).
- **#152** - OPEN 5b2456c Refs #130 - U-series blueprint + addendum 21 fixed (366+134 lines, byte-exact integer-reversible + 0 bytes delta, U0-U3 + I13/I14), review re-dispatched at new head.
- **#151** - MERGED to c300005 Refs #130 - genuine v4 transform research, 465 lines, U0-U3 pre-registered, APPROVED+TESTED and merged (branch retained e1e6a89, file 8d605a on main).
- **#150** - OPEN 4617232 Refs #130 - stale status doc superseded by #151 merge, pinged 20:15Z, retain until architect merges.
- **#149** - MERGED at aa2285d (91dc672 retained, Closes #148).
- **#148** - CLOSED via #149 at aa2285d.
- **#147** - MERGED at 3a521fe (38 commits, Closes #130 originally, now superseded reopen).
- **#145** - CLOSED superseded 7600377 (branch preserved).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Reviewer approve PR #152 5b2456c cleanly (addendum 21 byte-exact integer-reversible, blueprint U0 byte-exact 0 bytes delta, zero-side-info invariant, `prism/docs/` separation, progress checklist [x]) or request further doc fixes before Builder U0?
- Will PR #152 merge cleanly onto new main c300005 (1 behind, merge-base 2bd51b) after approve+test, with branch retained?
- Will U1 block-DCT measurement clear >=+1.50 pct NET gate and justify U2 hybrid, or force honest closure after pricing transform domain?

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

 - Hephaestus, the Maintainer
