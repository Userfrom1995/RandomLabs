# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~22:28Z, maintainer run 33019804152 - issue_comment on PR #153, Userfrom1995 /oc maintainer 22:28:12Z, Hephaestus re-survey: PR #153 f20709f APPROVED+TESTED, merge dispatched)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Maintainer is now **Hephaestus** (succeeds Mae, lineage preserved). Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. All progress preserved verbatim. (Previous freeze 2026-08-23T16:22Z superseded for Prism: board remains frozen for new projects, Prism is active priority.)
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130 and orders Prism v4 ignition using all V1/V2/V3 learnings, iterating versions until M2/M3 genuinely pass. "From now on, we keep iterating on versions and approaches until we achieve the target performance gates."
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. LIVE at 2283012 via `.github/agents/maintainer.md:107` `gh pr merge <N> --rebase` without --delete-branch verified (PR #154 merged with branch retained: `git ls-remote origin opencode/lab-153-ignore-agent-state` = 34d2df3, `gh pr view 154 --json merged` true).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Historical - merge PR #131 as ledger only. Superseded by T-series honest closure at 3a521fe and v4 reopen.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z) + AUTONOMOUS PIVOT (2026-08-26T07:12:57Z):** Mae had free hand on architectural pivots. Inherited by Hephaestus with Anti-Surrender escalation. Hard restriction remains: M2/M3 dual-unit gates never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement.

## MERGE CAPABILITY (verified at 2283012)
- `main` = `2283012af02b518c9c1ba13202852b23166f39a6` LIVE pre-merge of 153 (parents `43f0e58` -> `2283012` on top of `c1bffa7`, grandparent `8723dff` architect, great-grandparent `c300005` research). Verify: `git ls-remote origin main` = 2283012, `gh api .../pulls/153 --jq .merged` false pre-merge, `gh pr view 153 --json mergeable` MERGEABLE CLEAN, `git merge-base origin/main f20709f` = 2283012 shared.
- Merge for PR #153 is App-token safe (no `.github/workflows/*` in diff - 10 files prism-only), so `gh pr merge 153 --rebase` via App token will succeed (no PAT needed, `workflows` guard not triggered). Branch retained per directive.
- `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Hephaestus"` present.
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2283012.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2283012.
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender Doctrine, `maintainer.yml` PAT sweep for workflows.
- **Retain fix LIVE + verified on PR154 merge:** `AGENTS.md:61` + corpus mirrors verified at 2283012; branch `opencode/lab-153-ignore-agent-state` retained at 34d2df3 after rebase (no --delete-branch).
- **Lab hygiene fix LIVE:** `.agent/decision.json` deleted from tracking (`git ls-tree` empty, `git check-ignore -v` maps to `.gitignore:34 .agent/`), future harness writes ignored.
- **Open PRs:** 1 (`gh pr list --state open` = [153] `opencode/issue130-v4-transform` head f20709f MERGEABLE, merge-base 2283012 shared, orphan resolved; pending rebase-merge this run). PR #154 CLOSED/MERGED at 2283012 (Refs #153, Refs #130, lab hygiene, branch retained 34d2df3).
- **Open issues:** #130 (Prism, REOPENED active - v4 research+architect merged, builder U0/U1 PR #153 f20709f APPROVED+TESTED awaiting merge), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt).

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 MERGED at `c300005` (PR #151), architect v4 MERGED at `c1bffa7` (PR #152), builder U0/U1 PR #153 head `f20709f06601b0bcc1a15b405380cc96cd4bf58e` APPROVED 22:19:45Z + approve-test 22:28:11Z at same head (152/152 green, VB-RT 1,1, VB-NET-AUDIT-U 1,1, FRAME-F w=0, 4-neighbor, CSV 188 rows byte-identical, U1 FAIL +28.9% median WORSE). Merge dispatched this run (Refs #130 keeps issue open).
- **PR #153 - builder: V4-0 Transform-Domain Decorrelation (#130)** - OPEN head `f20709f` (`opencode/issue130-v4-transform`, `Refs #130` not Closes, MERGEABLE per `git merge-base` = 2283012 shared, 10 ahead of 2283012). Contains transform.h/cpp (12-bit COS_BAKED + symmetric_round + 4-neighbor NE), --u0 FRAME-T/F single-context w=0, spec amendment 22 bounded <=3, 8 BlockDCT tests, CSV landed. Reviewer APPROVE + Tester approve-test at f20709f with no later fix - **merge gate satisfied**. Hardcoded sweep will `gh pr merge 153 --rebase` (branch retained) this cycle.
- **PR #154 - lab: ignore .agent runtime state (Refs #153)** - MERGED at `2283012af02b518c9c1ba13202852b23166f39a6` (`opencode/lab-153-ignore-agent-state`, base main `c1bffa7`, `Refs #153`/`Refs #130` not Closes, 2 commits `43f0e58` + `2283012`, Reviewed APPROVED at 34d2df3 22:01:11Z + Tested 22:02:13Z, merge via `gh pr merge --rebase` branch retained).
- **Issue #130** - REOPENED active - v4 research+architect MERGED to c1bffa7/hygiene to 2283012, builder U0/U1 PR #153 f20709f APPROVED+TESTED -> MERGE -> V4-1 Researcher escalation.

## PIPELINE POSITION
Research v4 MERGED to `c300005` -> Architect v4 MERGED to `c1bffa7` -> Lab hygiene MERGED to `2283012` -> Builder U0/U1 PR #153 f20709f APPROVED (22:19:45Z) + TESTED (22:28:11Z) at same head -> **MERGE dispatched this run (Refs #130)** -> valid U1 negative ledger on main -> Anti-Surrender `research` on #130 for V4-1 (non-MED entropy paradigm beyond transform) -> Architect -> Builder V4-1 until dual-unit M2 AND M3 pass both units with fresh cjxl -d0 -e9 both-units CSVs. Pages dispatch after merge via pre != new_sha guard.

## NEXT-RUN PLAYBOOK
1. Verify PR #153 merge landed: `git ls-remote origin main` advances past 2283012, `gh api repos/Userfrom1995/RandomLabs/pulls/153 --jq .merged` true, `gh api .../contents/prism/include/prism/codec/transform.h?ref=main` + `prism/src/codec/transform.cpp` present, `prism/benchmarks/results/2026-08-26-sandbox-u0.csv` 188 rows on main, `progress/130-prism-v4-transform.md` Status complete with amendment 22, `gh api pulls/153 --json head.sha` = f20709f, branch retained (`git ls-remote origin opencode/issue130-v4-transform` = f20709f).
2. After merge, Anti-Surrender escalation: `Refs #130` keeps issue open (U1 FAIL honest, not close). Dispatch Researcher `{"action":"research","issue":130}` for V4-1 entropy paradigm (transform-domain MED is dead at +28.9% WORSE 0/24 wins; next lever must be non-MED: context modeling, entropy backend, or cross-channel decorrelation beyond DCT). Do NOT dispatch Builder directly without research/architect.
3. Verify `gh api .../contents/.gitignore?ref=main | grep .agent` still present, `prism/docs/` vs root `docs/` separation intact, no PAT drift, `opencode.json` still free models.
4. No merge of any Prism v4 Builder PR until it passes Reviewer+Tester gates; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free` + `muse-spark`.
5. Verify `pages.yml` dispatched after merge (pre 2283012 != new_sha) and PR previews still CLEAN.

## ISSUES
- **#130** - REOPENED active - v4 research MERGED to c300005, architect MERGED to c1bffa7 + hygiene to 2283012, builder U0/U1 PR #153 f20709f APPROVED+TESTED -> MERGE dispatched this run (Refs #130). Next: V4-1 research.
- **#153** - OPEN f20709f Refs #130 - V4-0 transform harness (U1 FAIL ~28.9% WORSE, VB-RT 1,1 via threshold 3, CSV 188 rows landed, spec amendment 22 <=3) -> MERGE this cycle.
- **#154** - MERGED to 2283012 Refs #153 Refs #130 - lab hygiene (delete tracked .agent + .gitignore .agent/), APPROVED+TESTED and merged (branch retained 34d2df3, hygiene on main).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will PR #153 rebase-merge cleanly (10 files, 1206/+2/- diff, merge-base 2283012 shared) and land transform harness on main without conflict?
- Will V4-1 Researcher find a paradigm that actually improves M2/M3 vs transform FAIL ledger (+28.9% WORSE proves MED-on-DCT dead)?
- Will pages.yml preview deploy correctly on new main after merge?

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
