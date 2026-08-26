# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~07:36Z, maintainer run 32943542078 - issue_comment on #146 architect+maintainer, main 14bd9e6c LIVE)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146 (head 4132b73) - post-mortem with numbers, decisive instrumentation finding (ClusterMap::raw_at replaces vs refines), T-series program pre-registered (T0-T5, zero container until T4 passes, proceed bar <9.35/<3.117 unchanged).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified 07:36Z via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` vs branch, and `git ls-remote origin main` at 14bd9e6c. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 07:36Z, PAT sweep 442 live, 632 lines implicitly via prior verification; current main still 14bd9e6c - no advance since 07:13Z).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. No CreditsError in this window; one Architect run transient pending.

## IN FLIGHT
- **PR #146** - OPEN head `4132b7349ecb7fcf6a2fadda692053cb463b2e19` (`opencode/issue130-20260826070009`, 37 files +11388/-14, 6 commits, base 14bd9e6c, MERGEABLE/CLEAN, merge_state clean). Deliverables: `research-v3-content-clustering.md` (post-mortem S4 FAIL, B1 +5.81 stranded, B2/B3 closed-with-scope, D1 done), instrumentation finding (KGRID128 replaces context, KTREE refines context, oracle 56.4-73.9 pct below realistic), T-series pre-registered (T0 rails, T1a ceiling kill, T1b K<=24 delta codebook, T2a shrunk tables, T2b E0+I11, T3 predictor x tokenization, T4 composition <9.35/<3.117, T5 reserve, midpoint ~9.23/3.077). Handoff conflict: doc says `{"action":"architect"}` but `.agent/decision.json` at head is `{"action":"build"}` (verified via contents API and `git show FETCH_HEAD:.agent/decision.json`). Owner dispatched `/oc architect` at 07:33:31Z (run 32943354907 opencode in_progress at 07:33:34Z) - architect phase ACTIVE. No container bytes by construction until T4. **Next: Architect blueprint.**
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117, S1 -1.45 B3 closed, S3 -8.09 B2 closed). Parked as ledger preservation (merge-blocked until dual-unit M2/M3 pass); superseded by v3 research but retained as evidence.
- **Issue #130** - OPEN, Prism v3 research COMPLETE (researcher Dr. Mob delivered v3 doc on PR #146). S-series stop-and-report remains ledger; T-series is next family under autonomous pivot.

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146, `research-v3-content-clustering.md`, T-series pre-registered, handoff architect)** -> **Architect DISPATCHED 07:33:31Z run 32943354907 in_progress** -> this maintainer 07:36Z (issue_comment on #146 /oc maintainer at 07:35:58Z) stands down to avoid duplicate dispatch (cancel-in-progress false queues sequential).

## NEXT-RUN PLAYBOOK
1. Verify Architect run 32943354907 (`gh run view 32943354907 --log`, `gh run list --limit 10`); expect Architect to deliver `prism/docs/architecture-jxl-parity-tseries.md` (or update) with T0-T4 blueprints, pins-before-measurement, zero-container discipline, and proceed-to-format bar <9.35/<3.117. Do NOT dispatch duplicate `architect` while that run is in_progress.
2. After Architect completes, verify `gh api pulls/146 --jq .head.sha` still 4132b73 plus new commits, `gh api .../contents/prism/docs/architecture-jxl-parity-tseries.md?ref=4132b73` updated, `progress/130-prism-true-jxl-parity.md` shows T-series. Next maintainer should dispatch `build` (or respect `{"action":"build"}` if Architect leaves it) only after blueprint lands; respect one-entry-per-PR.
3. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true, `gh pr list --state open` 2 PRs (146,145) until build creates new commits. Gates invariant (M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit vs real cjxl; T4 bar <9.35/<3.117). Board frozen blocks ideate; do not dispatch ideate.
4. Honesty: never claim T-series PASS or M2/M3 PASS until `bench_gate.sh` both units vs real cjxl proves it. Handoff mismatch (doc architect vs file build) is noted - trust doc+owner dispatch (architect) as binding; file will be overwritten by Architect.

## ISSUES
- **#130** - Prism v3 research COMPLETE (T-series pre-registered), architect in_progress 32943354907 at 07:33:34Z.
- **#146** - OPEN 4132b73 MERGEABLE/CLEAN, research v3 delivered, architect in_progress.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series stop-and-report parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will the Architect's T-series blueprint price the joint locality-context prize (cluster K<=24 on top of class16) within the pre-registered fail-fast gates, and will T1a ceiling kill correctly gate T1b machinery?
- Should PR #145 ledger be merged preservation-only or held as branch-only evidence after T-series begins?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.

 - Mae, the Maintainer
