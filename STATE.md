# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~22:15Z, maintainer run 33018969698 - issue_comment on PR #153, Userfrom1995 /oc review 22:15:15Z + /oc maintainer 22:15:24Z, Hephaestus re-survey: PR #153 fix at f20709f, reviews pending)

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER DOCTRINE (2026-08-27 01:30 IST via 2bd51b):** Maintainer is now **Hephaestus** (succeeds Mae, lineage preserved). Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. All progress preserved verbatim. (Previous freeze 2026-08-23T16:22Z superseded for Prism: board remains frozen for new projects, Prism is active priority.)
- **PRISM RE-ACTIVATION (2026-08-26T20:01:21Z reopened #130 + 20:05:46Z directive on #147):** Owner reopened #130 and orders Prism v4 ignition using all V1/V2/V3 learnings, iterating versions until M2/M3 genuinely pass. "From now on, we keep iterating on versions and approaches until we achieve the target performance gates."
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. LIVE at 2283012 via `.github/agents/maintainer.md:107` `gh pr merge <N> --rebase` without --delete-branch verified (PR #154 merged with branch retained: `git ls-remote origin opencode/lab-153-ignore-agent-state` = 34d2df3, `gh pr view 154 --json merged` true).
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Historical - merge PR #131 as ledger only. Superseded by T-series honest closure at 3a521fe and v4 reopen.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z) + AUTONOMOUS PIVOT (2026-08-26T07:12:57Z):** Mae had free hand on architectural pivots. Inherited by Hephaestus with Anti-Surrender escalation. Hard restriction remains: M2/M3 dual-unit gates never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement.

## MERGE CAPABILITY (verified at 2283012)
- `main` = `2283012af02b518c9c1ba13202852b23166f39a6` LIVE (rebase-merge PR #154, parents `43f0e58` -> `2283012` on top of `c1bffa7`, grandparent `8723dff` architect, great-grandparent `2bd51b` Hephaestus transition). Verify: `git ls-remote origin main` = 2283012, `gh api .../pulls/154 --jq .merged` true, `git ls-tree -r HEAD -- .agent` empty, `gh api .../contents/.gitignore?ref=main | grep -n .agent` = 34, pages deploy pending via pre != new_sha guard.
- App-token merge for docs/.gitignore safe, workflow-touching still requires PAT. `gh api .../contents/.github/agents/maintainer.md?ref=main | grep -n "Hephaestus"` present.
- `gh api .../contents/opencode.json?ref=main` = `mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2283012.

## CRITICAL INFRASTRUCTURE STATE
- **Model FIXED on main:** `opencode/mimo-v2.5-free` + `muse-spark-1.2-contributor-free` verified at 2283012.
- **Hephaestus transition LIVE:** `.github/agents/maintainer.md:1` Hephaestus, Anti-Surrender Doctrine, `maintainer.yml` PAT sweep for workflows.
- **Retain fix LIVE + verified on PR154 merge:** `AGENTS.md:61` + corpus mirrors verified at 2283012; branch `opencode/lab-153-ignore-agent-state` retained at 34d2df3 after rebase (no --delete-branch).
- **Lab hygiene fix LIVE:** `.agent/decision.json` deleted from tracking (`git ls-tree` empty, `git check-ignore -v` maps to `.gitignore:34 .agent/`), future harness writes ignored.
- **Open PRs:** 1 (`gh pr list --state open` = [153] `opencode/issue130-v4-transform` head f20709f MERGEABLE, merge-base 2283012 shared, orphan resolved). PR #154 CLOSED/MERGED at 2283012 (Refs #153, Refs #130, lab hygiene, branch retained 34d2df3).
- **Open issues:** #130 (Prism, REOPENED active - v4 research+architect merged, builder U0/U1 PR #153 f20709f awaiting review), #70 (lab-health), #42 (brainstorm frozen for new projects, Prism exempt).

## IN FLIGHT
- **Issue #130 - Prism v4 transform domain** - REOPENED at `2026-08-26T20:01:21Z` by Userfrom1995, research v4 MERGED at `c300005` (PR #151), architect v4 MERGED at `c1bffa7` (PR #152), builder U0/U1 PR #153 head `f20709f06601b0bcc1a15b405380cc96cd4bf58e` (10 files, U1 FAIL +20.32% median WORSE 0/24 wins gate +1.50% FAIL). Reviewer BLOCKED at 96ce762 21:57Z with 4 findings (VB-RT RED threshold 2 vs live 3 on YCoCgR Co/Cg 477..639, spec byte-exact vs bounded amendment 22, missing dated CSV per spec 21.5, progress honesty). Fix pushed f20709f 22:15:13Z claims 4/4 fixed (threshold >3 at main.cpp:4439, spec 22 <=3 YCoCgR, CSV 2026-08-26-sandbox-u0.csv 188 rows, progress honesty). Awaiting Reviewer re-check.
- **PR #153 - builder: V4-0 Transform-Domain Decorrelation (#130)** - OPEN head `f20709f` (`opencode/issue130-v4-transform`, `Refs #130` not Closes, MERGEABLE per `git merge-base` = 2283012 shared, 10 ahead of 2283012). Contains transform.h/cpp (12-bit COS_BAKED + symmetric_round + 4-neighbor NE), --u0 FRAME-T/F single-context w=0, spec amendment 22 bounded <=3, 8 BlockDCT tests 152/152 claim, CSV landed. Reviewer pending on f20709f (runs 22:15:19Z in_progress + 22:15:27Z pending via User /oc review 22:15:15Z). No merge until Reviewer approve + Tester.
- **PR #154 - lab: ignore .agent runtime state (Refs #153)** - MERGED at `2283012af02b518c9c1ba13202852b23166f39a6` (`opencode/lab-153-ignore-agent-state`, base main `c1bffa7`, `Refs #153`/`Refs #130` not Closes, 2 commits `43f0e58` + `2283012`, Reviewed APPROVED at 34d2df3 22:01:11Z (review run 33017847400, 11/11) + Tested `/oc approve-test` 22:02:13Z (run 33017909002), merge via `gh pr merge --rebase` (App-token non-workflow, branch retained 34d2df3). Adds `.agent/` to .gitignore, removes tracked runtime file.
- **Issue #130** - REOPENED active - v4 research+architect MERGED to c1bffa7/hygiene to 2283012, builder U0/U1 PR #153 f20709f awaiting review re-check (4 findings claimed fixed). No close until dual-unit M2/M3 pass.

## PIPELINE POSITION
Research v4 MERGED to `c300005` -> Architect v4 MERGED to `c1bffa7` -> Lab hygiene MERGED to `2283012` (PR #154 34d2df3 approve+approve-test -> rebase 2283012) -> Builder U0/U1 PR #153 f20709f FIXED 22:15:13Z (claims VB-RT 1,1, CSV landed) -> Review re-check pending 22:15:19Z in_progress + 22:15:27Z pending -> Test -> merge Refs #130 -> valid U1 negative ledger -> Anti-Surrender Researcher dispatch for V4-1 (non-MED entropy paradigm beyond transform) -> Architect -> Builder V4-1 until dual-unit M2 AND M3 pass both units with fresh cjxl -d0 -e9 both-units CSVs. Pages success on 2283012 pending dispatch.

## NEXT-RUN PLAYBOOK
1. Watch Reviewer on PR #153 `f20709f`: two runs already queued (22:15:19 in_progress + 22:15:27 pending via User /oc review 22:15:15Z). Poll `gh pr view 153 --json headRefOid` for new head and `gh api repos/.../issues/153/comments --paginate --jq '.[].body | select(contains("/oc fix") or contains("/oc approve"))'` for verdict. Do NOT dispatch duplicate review while queued/in_progress per cancel-in-progress false.
2. After Reviewer verdict: if `/oc fix: file:line` with blocking findings, dispatch Fixer `{"action":"fix","pr":153}`. If `/oc approve` with no later fix, dispatch Tester `{"action":"test","pr":153}` or wait for auto-test trigger, then on `/oc approve-test` with no later fix and MERGEABLE + orphan guard `git merge-base` = 2283012, rebase-merge `gh pr merge 153 --rebase` (Refs #130, branch retained).
3. After merge, Anti-Surrender escalation: even if valid U1 still FAIL (+20.32% median worse, 0/24 wins) confirming DCT+MED dead, do NOT close #130; dispatch Researcher `{"action":"research","issue":130}` for next paradigm -> Architect -> Builder V4-1 until dual-unit M2 AND M3 pass.
4. Verify `git ls-remote origin main` = 2283012, `gh api pulls/154 --jq .merged` true, `gh api .../contents/.gitignore?ref=main | grep .agent` present, pages.yml dispatched (pre c1bffa7 != 2283012).
5. No merge of any Prism v4 Builder PR until it passes Reviewer+Tester gates; no success claim without fresh both-units measurement. Brainstorm ideate stays blocked; lab/auditor only on infra need; model pins stay `mimo-v2.5-free` + `muse-spark`.

## ISSUES
- **#130** - REOPENED active - v4 research MERGED to c300005, architect MERGED to c1bffa7 + hygiene to 2283012, builder U0/U1 PR #153 f20709f awaiting review re-check (4 findings claimed fixed at f20709f). Next: review -> test -> merge Refs.
- **#153** - OPEN f20709f Refs #130 - V4-0 transform harness (U1 FAIL +20.32% WORSE, VB-RT claimed 1,1 via threshold 3, CSV 188 rows landed, spec amendment 22 <=3). Review pending.
- **#154** - MERGED to 2283012 Refs #153 Refs #130 - lab hygiene (delete tracked .agent + .gitignore .agent/), APPROVED+TESTED and merged (branch retained 34d2df3, hygiene on main).
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN (new projects blocked, Prism exempt).

## OPEN QUESTIONS
- Will Reviewer approve f20709f (152/152 green, VB-RT threshold 3, spec 22 <=3, CSV landed, progress honesty) or request fifth-round fixes (byte-exact vs bounded, tolerance, ideas entry)?
- Will valid U1 re-measurement with correct geometry still FAIL (+20.32% median worse 0/24 wins) confirming DCT+MED dead, triggering Anti-Surrender V4-1 entropy paradigm?
- Will pages.yml preview deploy correctly on new main 2283012?

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
