# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~20:53Z, maintainer run 33012310002 - issue_comment on PR #152 `/oc maintainer` 20:49:10Z, Hephaestus merged 5b2456c -> c1bffa7 + Builder U0 dispatch)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Maintainer is now **Hephaestus** (succeeds Mae, lineage preserved). Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. All progress preserved verbatim. (Previous freeze 2026-08-23T16:22Z superseded for Prism: board remains frozen for new projects, Prism is active priority.)
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130 and orders Prism v4 ignition using all V1/V2/V3 learnings, iterating versions until M2/M3 genuinely pass. "From now on, we keep iterating on versions and approaches until we achieve the target performance gates."
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. LIVE at c1bffa7 via `.github/agents/maintainer.md:107` `gh pr merge <N> --rebase` without --delete-branch verified (PR #152 merged with branch retained: `git ls-remote origin opencode/issue130-20260826203346` = 5b2456c, `gh pr view 152 --json merged` true; PR #151 retained e1e6a89).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Historical - merge PR #131 as ledger only. Superseded by T-series honest closure at 3a521fe and v4 reopen.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z) + AUTONOMOUS PIVOT (2026-08-26T07:12:57Z):** Mae had free hand on architectural pivots. Inherited by Hephaestus with Anti-Surrender escalation. Hard restriction remains: M2/M3 dual-unit gates never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement.

## MERGE CAPABILITY (verified at c1bffa7)
- `main` = `c1bffa77bd55e0aef7e6ff5488f3a30e6ea9295d` LIVE (rebase-merge PR #152, parents `8723dff` + `c300005` chain, `2bd51b` base, `aa2285d` retain fix). Verify: `git ls-remote origin main` = c1bffa7, `gh api .../pulls/152 --jq .merged` true, `gh api .../contents/prism/docs/architecture-jxl-parity-useries.md?ref=main` present, `gh api .../contents/prism/docs/algorithmic-spec.md?ref=main` addendum 21 byte-exact present.
- PAT sweep live on main (597 lines, PAT-backed merge for workflow-touching PRs) verified via contents API at c1bffa7; App-token merge for docs-only safe, workflow-touching still requires PAT. `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Hephaestus"` present, `grep -n "Do NOT use --delete-branch"` present.
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (4x opencode.yml `mimo-v2.5-free`, 1029 `muse-spark`), pages deploy pending via `c1bffa7` advance guard (pre c300005 != new_sha triggers pages.yml).

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at c1bffa7 (no workflow drift).
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, seed Hephaestus with Mae lineage, Anti-Surrender Doctrine 27, `.github/workflows/maintainer.yml` retains PAT sweep. All verified on main at c1bffa7.
- **Retain fix LIVE + verified on PR152 merge:** `AGENTS.md:61` + corpus mirrors verified at c1bffa7; branches retained: `opencode/issue130-20260826203346` at 5b2456c, `opencode/issue130-v4-research` at e1e6a89 after rebase (no --delete-branch).
- **Open PRs:** 1 (`gh pr list --state open` = [150] `opencode/issue130-20260826200948` head 4617232 Refs #130 superseded stale (CLEAN). PR #152 CLOSED/MERGED at c1bffa7 (Refs #130, 2 commits aaa4fc5 + 5b2456c rebased as 8723dff + c1bffa7, branch retained 5b2456c). PR #151 CLOSED/MERGED at c300005 (Refs #130, branch retained e1e6a89). Branches retained via `git ls-remote`.
- **Open issues:** #130 (Prism, REOPENED active - v4 research merged at c300005 + architect merged at c1bffa7, Builder U0 next), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d.

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z`, research v4 MERGED at `2026-08-26T20:42:43Z` to `c300005` (PR #151 e1e6a89 APPROVED 20:37:48Z + approve-test 20:39:32Z, 144/144 tests), architect v4 MERGED at `2026-08-26T20:53:16Z` to `c1bffa7` (PR #152 5b2456c APPROVED 20:47:16Z + approve-test 20:49:09Z, 4/4 byte-exact fixes verified, 2 commits rebased as 8723dff + c1bffa7). U-series blueprint + addendum 21 now on main: research 465 lines, blueprint 366 lines, spec +129 lines (8x8 Type-II AAN 12-bit Q=0 byte-exact integer-reversible fallback, TransformDomainMED stencil, pipeline color->DCT->prediction->entropy, U0-U3 gates, I13/I14). Next: Builder U0 BLOCKING harness extension (BlockDCT + TransformDomainMED, format-unwired, VB-transform-roundtrip + VB-transform-lossless byte-exact 0 delta, padding NET-included) -> U1 >=+1.50 pct NET -> U2 hybrid -> U3 dual-unit gate.
- **PR #152 - architect: U-series blueprint + addendum 21 (#130)** - MERGED at `c1bffa77bd55e0aef7e6ff5488f3a30e6ea9295d` (`opencode/issue130-20260826203346`, base `2bd51b` -> `c300005` -> `c1bffa7`, `Refs #130` not Closes, 2 commits `aaa4fc5` + `5b2456c` rebased onto c300005 as `8723dff` + `c1bffa7`, parents `[8723dff,c300005]` chain, branch retained 5b2456c). Fixes applied at 5b2456c verified integer-reversible (3), 0 bytes delta (3), byte-exact (11). Reviewed APPROVED 20:47:16Z + Tested approve-test 20:49:09Z (144/144, em dash 0, prism/docs clean), MERGEABLE CLEAN at head, merge-base 2bd51b shared, Refs #130 correct (intermediate).
- **PR #151 - researcher: Prism v4 research - the unmeasured transform domain (#130)** - MERGED at `c30000547391b37fda9e656c3ca7332b8cf58373` (`opencode/issue130-v4-research`, base main `2bd51b`, `Refs #130`, 2 commits `7fac086` + `c300005`, branch retained e1e6a89, file 8d605a on main).
- **PR #150 - researcher: confirm research complete, T-series ready for builder (#130)** - OPEN head `461723236c13144b4611d828fc2afb30bdb789ea` (`opencode/issue130-20260826200948`, base main, `Refs #130`, parent 2bd51b). Adds `prism/docs/research-status-20260826.md` 40 lines stale for v4 handoff. Architect assessed stale, Owner `/oc build this` superseded by v4 research. Retain open as ledger until v4 U-series completes, then close as superseded if Owner agrees. No merge, no build/fix/continue.
- **#70** - Lab Health & Audit Logs - current (49 comments).
- **#42** - Brainstorm Board FROZEN for new projects (Prism exempt under re-activation).

## PIPELINE POSITION
Research v4 MERGED to `c300005` (PR #151 e1e6a89) -> Architect U-series MERGED to `c1bffa7` (PR #152 5b2456c fix verified, APPROVED + approve-test) -> Builder U0 BLOCKING harness extension (addendum 21, VB rails byte-exact 0 bytes delta) dispatching now via `{"action":"build","issue":130}` -> U1 block-DCT measurement (gate >=+1.50 pct NET) -> U2 hybrid -> U3 dual-unit gate (M2 <9.498/<3.166, M3 <8.655/<2.885, both units, fresh cjxl -d0 -e9). T-series honest closure 3a521fe retained as v4 baseline (10.1210/3.3737 e1, 9.5671/3.1890 T4). Pages dispatch pending via c1bffa7 advance guard.

## NEXT-RUN PLAYBOOK
1. Verify `git ls-remote origin main` = c1bffa7 (post-merge 152), `gh api pulls/152 --jq .merged` true, `gh api .../contents/prism/docs/architecture-jxl-parity-useries.md?ref=main` present, `gh api .../contents/prism/docs/algorithmic-spec.md?ref=main | grep integer-reversible` present, `gh api issues/130 --jq .state` = open, `gh api .../contents/.github/agents/maintainer.md?ref=main | grep Hephaestus` present.
2. Watch Builder on #130 U0 harness: expect `opencode/issue130-*` branch with BlockDCT + TransformDomainMED, format-unwired, `prism bench-sandbox --u0` 3 VB rails byte-exact 0 delta, `benchmarks/results/YYYY-MM-DD-sandbox-u0.csv` committed, `progress/130` updated, no format change until U2 PASS. Verify `git diff --name-only` includes `prism/src/` harness not workflow, `prism/docs/` update, progress tracker.
3. After Builder U0 merges (review+test), dispatch U1 measurement gate (>=+1.50 pct NET) via next Builder slice; fail-fast if < gate.
4. PR #150: do not merge; may close as superseded after U-series completes, or retain as ledger. Do not trigger build/fix/continue on it. Branches retained verified.
5. No merge of any Prism v4 Builder PR until dual-unit M2 AND M3 pass both units; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free` + `muse-spark`.

## ISSUES
- **#130** - REOPENED active - Prism v4 research MERGED c300005 + architect MERGED c1bffa7, Builder U0 dispatching now.
- **#152** - MERGED to c1bffa7 Refs #130 - U-series blueprint + addendum 21 (366+363 lines, byte-exact integer-reversible + 0 bytes delta, U0-U3 + I13/I14), APPROVED+TESTED and merged (branch retained 5b2456c, files c74e571 + 2be739 on main).
- **#151** - MERGED to c300005 Refs #130 - genuine v4 transform research, 465 lines, U0-U3 pre-registered, APPROVED+TESTED and merged (branch retained e1e6a89, file 8d605a on main).
- **#150** - OPEN 4617232 Refs #130 - stale status doc superseded by #151/#152 merges, pinged 20:15Z, retain until U-series completes.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Builder deliver U0 BLOCKING harness byte-exact 0-bytes-delta before any U1 measurement, with 3 VB rails green and padding NET-included?
- Will U1 block-DCT measurement clear >=+1.50 pct NET gate and justify U2 hybrid, or force honest closure after pricing transform domain?
- Will PR #152 merge integrity hold (branch retained, pages deploy success via advance guard)?

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
