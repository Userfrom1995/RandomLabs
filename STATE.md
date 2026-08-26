# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~20:53Z, maintainer run 33012655244 - issue_comment on PR #153, `/oc maintainer` at 20:53:12Z, Hephaestus re-survey + review dispatch)

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
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (4x opencode.yml `mimo-v2.5-free`, 1029 `muse-spark`), pages deploy success on 33012562851 (pr-153 preview), next dispatch via `c1bffa7` advance guard.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at c1bffa7.
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, seed Hephaestus with Mae lineage, Anti-Surrender Doctrine 27, `.github/workflows/maintainer.yml` retains PAT sweep.
- **Retain fix LIVE + verified on PR152 merge:** `AGENTS.md:61` + corpus mirrors verified at c1bffa7; branch `opencode/issue130-20260826203346` retained at 5b2456c after rebase (no --delete-branch).
- **Open PRs:** 2 (`gh pr list --state open` = [153] `opencode/issue130-v4-transform` head 5a8275b Refs #130 diverged 1 ahead/4 behind main merge-base 2bd51b MERGEABLE/CLEAN + [150] `opencode/issue130-20260826200948` head 4617232 Refs #130 superseded stale). PR #152 CLOSED/MERGED at c1bffa7 (Refs #130, ledger on main, branch retained 5b2456c). PR #151 CLOSED/MERGED at c300005 (Refs #130, branch retained e1e6a89). Branches retained: `opencode/issue130-20260825153143` at 7600377, `opencode/issue130-20260826070009` at 2c8d3f5, `opencode/issue148-retain-pr-branches` at 91dc672, `opencode/issue130-v4-research` at e1e6a89, `opencode/issue130-20260826203346` at 5b2456c via `git ls-remote`.
- **Open issues:** #130 (Prism, REOPENED active - v4 research+architect merged, builder U0 in review), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d, #130 reopened 20:01:21Z.

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 MERGED at `c300005` (PR #151 e1e6a89 APPROVED+approve-test, 465 lines), architect v4 MERGED at `c1bffa7` (PR #152 5b2456c APPROVED 20:47:16Z + approve-test 20:49:09Z, 366+134 lines, byte-exact integer-reversible + 0 bytes delta, U0-U3 + I13/I14, Refs #130, branch retained), builder U0 DELIVERED at `2026-08-26T20:52:08Z` as PR #153 (5a8275b, 8 BlockDCT tests, transform.h/cpp, --u0 FRAME-T/F, VB rails, addendum 21). Prior ledger V1 C-series + D4c -1.65 pct superseded by v4. Next: Review PR #153 at 5a8275b -> fix if needed -> test -> merge after approve+test (requires rebase onto c1bffa7 to resolve stale diverged base) -> U1 block-DCT measurement -> dual-unit gate.
- **PR #153 - builder: V4-0 Transform-Domain Decorrelation (#130)** - OPEN head `5a8275b9e08f316b015d6fd4affe15554f3b36b8` (`opencode/issue130-v4-transform`, base `c300005` -> `c1bffa7`, `Refs #130` not Closes, diverged 1 ahead/4 behind main merge-base 2bd51b, 8 files). Claims 152/152 green, 8 BlockDCT pass, --u0 harness. Awaiting Review verdict at new head 5a8275b (dispatched by `/oc review` 20:53Z this run). Stale base: needs `git rebase origin/main` before final merge after review+test; branch retained after future merge.
- **PR #152 - architect: U-series blueprint + addendum 21 (#130)** - MERGED at `c1bffa77bd55e0aef7e6ff5488f3a30e6ea9295d` (`opencode/issue130-20260826203346`, base main `2bd51b`, `Refs #130` not Closes, 2 commits `8723dff` + `c1bffa7`, parents `[8723dff,c300005]` chain). Adds `prism/docs/architecture-jxl-parity-useries.md` 366 lines + modifies `prism/docs/algorithmic-spec.md` +129 addendum 21 (byte-exact integer-reversible, Q=0 lossless 0 bytes delta, slot 3a) + `progress/130-prism-true-jxl-parity.md` +46 U-series checklist. Reviewed APPROVED at 5b2456c 20:47:16Z + Tested `/oc approve-test` 20:49:09Z (144/144, no regression, em dash 0), merge via `gh pr merge --rebase` (App-token docs-only). Ledger on main, branch retained 5b2456c, issue #130 remains open per Refs.
- **PR #151 - researcher: Prism v4 research - the unmeasured transform domain (#130)** - MERGED at `c30000547391b37fda9e656c3ca7332b8cf58373` (`opencode/issue130-v4-research`, base main `2bd51b`, `Refs #130` not Closes, 2 commits `7fac086` + `c300005`, 8d605a on main). Reviewed APPROVED at e1e6a89 20:37:48Z + Tested `/oc approve-test` 20:39:32Z, merge via App-token docs-only. Ledger on main, branch retained e1e6a89.
- **PR #150 - researcher: confirm research complete, T-series ready for builder (#130)** - OPEN head `461723236c13144b4611d828fc2afb30bdb789ea` (`opencode/issue130-20260826200948`, base main, `Refs #130` not Closes, parent 2bd51b shared history). Adds `prism/docs/research-status-20260826.md` 40 lines stale for v4 handoff. Architect assessed stale at 20:15:10Z, Owner `/oc build this` 20:15:28Z superseded by v4 research. Pinged 20:15Z redirecting to #130 research. Now superseded by genuine PR #151+152 merges; retain open as ledger until v4 builder progresses, then close as superseded if Owner agrees. No merge, no build/fix/continue.
- **Issue #130** - REOPENED active - Prism v4 research+architect MERGED to c1bffa7, builder U0 PR #153 5a8275b awaiting review approval.

## PIPELINE POSITION
Research v4 MERGED to `c300005` (PR #151 e1e6a89 approve + approve-test -> rebase `c300005`) -> Architect v4 MERGED to `c1bffa7` (PR #152 5b2456c approve + approve-test -> rebase `c1bffa7`) -> Builder U0 DELIVERED as PR #153 5a8275b (diverged, review dispatched this run) -> Review PR #153 -> fix if needed (rebase onto c1bffa7 to resolve stale) -> test -> merge after approve+test (Refs #130, branch retained) -> U1 block-DCT measurement (gate >=+1.50 pct NET) -> U2 hybrid -> U3 dual-unit gate (M2 <9.498/<3.166, M3 <8.655/<2.885, both units, fresh cjxl -d0 -e9). T-series honest closure 3a521fe retained as v4 baseline (10.1210/3.3737 e1, 9.5671/3.1890 T4). Pages success on 33012562851 (pr-153 preview), next deploy via c1bffa7 advance guard after builder merge.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` = c1bffa7 (post-merge), `gh api pulls/152 --jq .merged` true, `gh api pulls/153 --jq .head.sha` = 5a8275b, `gh pr view 153 --json mergeable` = MERGEABLE (diverged 1/4, merge-base 2bd51b shared), `gh api .../contents/prism/docs/research-v4-transform-domain.md?ref=main --jq .sha` = 8d605a, `gh api issues/130 --jq .state` = open, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep Hephaestus` present.
2. Watch Reviewer on PR #153 head 5a8275b: expect `/oc approve` or `/oc fix` with file:line citations for byte-exact integer-reversible, VB-transform-roundtrip/lossless 0 bytes delta, padding NET-included, `prism/docs/` separation, security, scope. If `/oc fix`, dispatch Fixer via `{"action":"fix","pr":153}` (fix + rebase onto c1bffa7 to resolve stale diverged base). If `/oc approve`, watch Tester `{"action":"test","pr":153}` or auto-approve via workflow, then verify addendum 21 constants survive, transform tests 152/152 still green.
3. After PR #153 approves + tests pass (`/oc approve-test` with no later fix, MERGEABLE CLEAN, rebased onto c1bffa7), rebase-merge it via `gh pr merge 153 --rebase` (Refs #130, branch retained). Then dispatch Builder `{"action":"build","issue":130}` for U1 measurement (U1 DCT gate >=+1.50 pct NET) -> U2-U3 until dual-unit M2 AND M3 pass both units with fresh `prism bench --kodak` CSVs byte-identical.
4. PR #150: do not merge; may close as superseded after PR #153 merges, or retain as ledger. Do not trigger build/fix/continue on it. PR #151/152 branches retained e1e6a89/5b2456c verified.
5. No merge of any Prism v4 Builder PR until dual-unit M2 AND M3 pass both units; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free` + `muse-spark`.

## ISSUES
- **#130** - REOPENED active - Prism v4 research MERGED to c300005 (PR #151 e1e6a89), architect MERGED to c1bffa7 (PR #152 5b2456c), builder U0 PR #153 5a8275b awaiting review.
- **#153** - OPEN 5a8275b Refs #130 - V4-0 transform harness (8 DCT tests, --u0 FRAME-T/F, VB rails, addendum 21), review dispatched this run.
- **#152** - MERGED to c1bffa7 Refs #130 - U-series blueprint + addendum 21 fixed (366+129 lines, byte-exact integer-reversible + 0 bytes delta, U0-U3 + I13/I14), APPROVED+TESTED and merged (branch retained 5b2456c, files on main).
- **#151** - MERGED to c300005 Refs #130 - genuine v4 transform research, 465 lines, U0-U3 pre-registered, APPROVED+TESTED and merged (branch retained e1e6a89, file 8d605a on main).
- **#150** - OPEN 4617232 Refs #130 - stale status doc superseded by #151/#152 merges, pinged 20:15Z, retain until builder progresses.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Reviewer approve PR #153 5a8275b cleanly (addendum 21 byte-exact integer-reversible, 0 bytes delta, VB rails, U0 harness per I13/I14, `prism/docs/` separation, 152/152 green) or request fixes before Builder U1? Stale base requires rebase onto c1bffa7 - will Fixer handle it cleanly?
- Will PR #153 merge cleanly onto new main c1bffa7 after approve+test and rebase, with branch retained?
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
