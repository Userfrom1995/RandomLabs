# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~21:24Z, maintainer run 33015208814 - issue_comment on PR #153, Userfrom1995 /oc maintainer at 21:24:24Z, Hephaestus re-survey dispatch review on cf3d68b)

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
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` (4x opencode.yml `mimo-v2.5-free`, 1029 `muse-spark`), pages deploy success on 33015213173 main, next dispatch via `c1bffa7` advance guard.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at c1bffa7.
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, seed Hephaestus with Mae lineage, Anti-Surrender Doctrine 27, `.github/workflows/maintainer.yml` retains PAT sweep.
- **Retain fix LIVE + verified on PR152 merge:** `AGENTS.md:61` + corpus mirrors verified at c1bffa7; branch `opencode/issue130-20260826203346` retained at 5b2456c after rebase (no --delete-branch).
- **Open PRs:** 1 (`gh pr list --state open` = [153] `opencode/issue130-v4-transform` head cf3d68b MERGEABLE/CLEAN merge-base c1bffa7 shared, orphan resolved). PR #152 CLOSED/MERGED at c1bffa7 (Refs #130, ledger on main, branch retained 5b2456c). PR #151 CLOSED/MERGED at c300005 (Refs #130, branch retained e1e6a89). PR #150 prior stale CLOSED (verified via gh pr list - no longer open).
- **Open issues:** #130 (Prism, REOPENED active - v4 research+architect merged, builder U0/U1 delivered awaiting strict re-review), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt). #148 closed via #149 at aa2285d, #130 reopened 20:01:21Z.

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 MERGED at `c300005` (PR #151 e1e6a89 APPROVED+approve-test, 465 lines), architect v4 MERGED at `c1bffa7` (PR #152 5b2456c APPROVED 20:47:16Z + approve-test 20:49:09Z, 366+134 lines, byte-exact integer-reversible + 0 bytes delta, U0-U3 + I13/I14, Refs #130, branch retained), builder U0/U1 DELIVERED at `2026-08-26T20:52:08Z` as PR #153 (5a8275b -> 480d19d -> 2a3eb58 -> cf3d68b, 10 files, 8 BlockDCT tests, transform.h/cpp, --u0 FRAME-T/F, VB rails, addendum 21) with U1 MEASURED REJECT at cf3d68b (+21.92% median WORSE ADAPT 491,978 B vs 599,822 B, 0/24 wins, gate +1.50% FAIL, CSV `2026-08-26-u0-transform-smoke.csv` 1128 lines, decision `2026-08-26T21-00-00-u1-transform-measured-reject.md`). Next: strict Review at cf3d68b -> fix if findings -> test -> merge Refs #130 -> Anti-Surrender V4-1 research if still FAIL.
- **PR #153 - builder: V4-0 Transform-Domain Decorrelation (#130)** - OPEN head `cf3d68b01a2032d5bd9aa749438636b95713d4ca` (`opencode/issue130-v4-transform`, `Refs #130` not Closes, MERGEABLE/CLEAN, merge-base `c1bffa77bd55e0aef7e6ff5488f3a30e6ea9295d` = origin/main shared, 2 ahead of c1bffa7, orphan RESOLVED). Commits: `cf3d68b` (builder: U1 measured reject + VB-RT max_val 65535) + `ada781c` (builder: implement V4-0 double DCT) + `c1bffa7` architect etc. Diff 10 files (no orphan bloat, `progress/130-prism-true-jxl-parity.md` intact 1884 lines, `progress/130-prism-v4-transform.md` 55 lines complete). Review dispatched at cf3d68b this run. Checks pending: duplicate addendum 21 consolidation, byte-exact integer-reversible (main pin Q=0 byte-exact 4/4 vs bounded <=1), double std::cos vs AAN C_SCALE=4096, FRAME-F geometry w stride (acoder_encode_plane_v2(tf_ress, tt.w) vs w=0), int32 MED, test tolerance <=1 vs <=2, VB-RT live green, prism/docs separation, security, Refs #130.
- **PR #152 - architect: U-series blueprint + addendum 21 (#130)** - MERGED at `c1bffa77bd55e0aef7e6ff5488f3a30e6ea9295d` (`opencode/issue130-20260826203346`, base main `2bd51b`, `Refs #130` not Closes, 2 commits `8723dff` + `c1bffa7`, parents `[8723dff,c300005]` chain). Adds `prism/docs/architecture-jxl-parity-useries.md` 366 lines + modifies `prism/docs/algorithmic-spec.md` +129 addendum 21 (byte-exact integer-reversible, Q=0 lossless 0 bytes delta, slot 3a) + `progress/130-prism-true-jxl-parity.md` +46 U-series checklist. Reviewed APPROVED at 5b2456c 20:47:16Z + Tested `/oc approve-test` 20:49:09Z (144/144, no regression, em dash 0), merge via `gh pr merge --rebase` (App-token docs-only). Ledger on main, branch retained 5b2456c, issue #130 remains open per Refs.
- **PR #151 - researcher: Prism v4 research - the unmeasured transform domain (#130)** - MERGED at `c30000547391b37fda9e656c3ca7332b8cf58373` (`opencode/issue130-v4-research`, base main `2bd51b`, `Refs #130` not Closes, 2 commits `7fac086` + `c300005`, 8d605a on main). Reviewed APPROVED at e1e6a89 20:37:48Z + Tested `/oc approve-test` 20:39:32Z, merge via App-token docs-only. Ledger on main, branch retained e1e6a89.
- **Issue #130** - REOPENED active - Prism v4 research+architect MERGED to c1bffa7, builder U0/U1 PR #153 cf3d68b dispatched for strict re-review (live verification needed before merge).
- **PR #150** - no longer open (stale ledger superseded by #151/#152 merges, closed).

## PIPELINE POSITION
Research v4 MERGED to `c300005` (PR #151 e1e6a89 approve + approve-test -> rebase `c300005`) -> Architect v4 MERGED to `c1bffa7` (PR #152 5b2456c approve + approve-test -> rebase `c1bffa7`) -> Builder U0 DELIVERED as PR #153 5a8275b -> 480d19d (orphan CONFLICTING, U1 FAIL +20.32% invalid geometry) -> Reviewer `/oc fix` 20:58:15Z (6 findings) -> Fix `2a3eb58` landed 21:16 (orphan resolved, but VB-RT red, spec downgrade) -> Reviewer `/oc fix` 21:20:43Z again 6 findings (byte-exact vs bounded, orphan, VB-RT, ledger, agent file, missing CSV) -> Builder push cf3d68b 21:23:22Z (VB-RT max_val 65535, U1 +21.92% median WORSE 0/24, CSV 1128 lines) -> Review dispatched cf3d68b this run 21:24Z -> await `/oc approve` vs `/oc fix: file:line` (strict gate on byte-exact, geometry, VB rails) -> Test -> merge Refs #130 (branch retained) -> valid U1 negative ledger -> Anti-Surrender Researcher dispatch for V4-1 (non-MED entropy paradigm beyond transform) -> Architect -> Builder V4-1 until dual-unit M2 AND M3 pass both units with fresh cjxl -d0 -e9 both-units CSVs. T-series honest closure 3a521fe retained as v4 baseline (10.1210/3.3737 e1, 9.5671/3.1890 T4). Pages success on 33015213173 main, next deploy after builder merge.

## NEXT-RUN PLAYBOOK
1. Watch Reviewer on PR #153 `cf3d68b`: run dispatched this run should post `/oc approve` or `/oc fix: file:line` within ~5-10m. Poll `gh api repos/Userfrom1995/RandomLabs/issues/153/comments --paginate --jq '.[].body | select(contains("/oc approve") or contains("/oc fix"))'` and `gh run list --json conclusion,name` for opencode-review runs. Do NOT dispatch duplicate review while it is pending/in_progress.
2. If `/oc fix: ...` at cf3d68b with file:line, dispatch Fixer `{"action":"fix","pr":153}` (fix will auto-post `/oc review` after push). If `/oc approve` with no later fix, dispatch Tester `{"action":"test","pr":153}` or wait for auto-test trigger, then on `/oc approve-test` with no later fix and MERGEABLE/CLEAN + orphan guard `git merge-base` = c1bffa7, rebase-merge `gh pr merge 153 --rebase` (Refs #130, branch retained).
3. After merge, Anti-Surrender escalation: even if valid U1 still FAIL (+21.92% median worse, 0/24 wins) confirming DCT+MED dead, do NOT close #130; dispatch Researcher `{"action":"research","issue":130}` for next paradigm (block-adaptive entropy beyond MED, cross-band predictor, hybrid DCT+sophisticated predictor) -> Architect -> Builder V4-1 until dual-unit M2 AND M3 pass.
4. PR #150 closed; retain as ledger. No build/fix/continue on it. PR #151/152 branches retained e1e6a89/5b2456c verified.
5. No merge of any Prism v4 Builder PR until it passes Reviewer+Tester gates; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free` + `muse-spark`.

## ISSUES
- **#130** - REOPENED active - Prism v4 research MERGED to c300005 (PR #151 e1e6a89), architect MERGED to c1bffa7 (PR #152 5b2456c), builder U0/U1 PR #153 cf3d68b dispatched for strict re-review (6 findings re-check: duplicate addendum, byte-exact vs double, geometry w, VB rails, tolerance).
- **#153** - OPEN cf3d68b Refs #130 - V4-0 transform harness cf3d68b (double DCT, VB-RT max_val 65535, +21.92% WORSE U1, CSV 1128 lines, orphan resolved MERGEABLE/CLEAN), review dispatched this run.
- **#152** - MERGED to c1bffa7 Refs #130 - U-series blueprint + addendum 21 fixed (366+129 lines, byte-exact integer-reversible + 0 bytes delta, U0-U3 + I13/I14), APPROVED+TESTED and merged (branch retained 5b2456c, files on main).
- **#151** - MERGED to c300005 Refs #130 - genuine v4 transform research, 465 lines, U0-U3 pre-registered, APPROVED+TESTED and merged (branch retained e1e6a89, file 8d605a on main).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Reviewer approve cf3d68b (byte-exact integer-reversible, duplicate addendum removed, geometry w=0 pin, int32 MED, VB-RT green) or request third-round fixes with file:line (byte-exact vs bounded, std::cos vs AAN C_SCALE=4096, acoder w stride, tolerance <=1)?
- Will Tester approve post-review artifact with 152/152 green, `prism bench-sandbox --u0 kodim01.ppm` smoke showing T/F frames and VB-RT/VB-FID green, and no regression vs 144/144 baseline?
- Will valid U1 re-measurement with correct geometry still FAIL (+21.92% median worse 0/24) confirming DCT+MED dead, triggering Anti-Surrender Researcher dispatch for V4-1 entropy paradigm beyond MED?
- Will PR #153 merge cleanly onto c1bffa7 after approve+test and rebase, with branch retained, preserving negative ledger for next version escalation?

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
