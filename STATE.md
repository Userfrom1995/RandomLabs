# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~08:43Z, maintainer run 32949248249 - issue_comment on #146 duplicate maintainer while builder T0 active, main 14bd9e6c LIVE)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at e2d7d1a despite 07:51:24 fetch-first push failure (recovered via builder push). Builder T0 Q0 pins committed (a7c237f/7f4d969/e2d7d1a reconciled verbatim 08:39Z).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified 07:36Z via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` vs branch, and `git ls-remote origin main` at 14bd9e6c. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 08:43Z, PAT sweep 442 live, 632 lines; current main still 14bd9e6c - no advance since 07:13Z).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. No CreditsError in this window; builder 32944809993 in_progress + 6 pending builds queued at 08:43Z.

## IN FLIGHT
- **PR #146** - OPEN head `e2d7d1af07c3e33e02c0a02dc2d23d5e0b3d6dfa` (`opencode/issue130-20260826070009`, 9 commits, base 14bd9e6c, MERGEABLE/CLEAN, merge_state clean, merge_base 14bd9e6c shared). Deliverables: `research-v3-content-clustering.md` (S4 FAIL, B1+5.81 stranded, oracle 56.4-73.9 pct), `architecture-jxl-parity-tseries.md` (T-series blueprint: composition thesis KJOINT on sandbox, integer Lloyd, SBC1/SBA1, ceiling bypass K_MAX 1536 stacks, shrinkage a_c 192/128, ZZ-HU=HYB_C, 8 failable self-checks, gates verbatim, Q0-Q4 slicing), `algorithmic-spec.md` addendum 20 (13 constant slots pinned BEFORE any measurement, gates verbatim), `progress/130-prism-true-jxl-parity.md` T-series checklist + Q0 queued, builder T0 pins docs reconciled verbatim. Handoff at head `.agent/decision.json` = `{"action":"build"}`. Builder 32944809993 in_progress since 07:51:29Z (plus 6 pending queued at 08:43Z) - next is T0 instrument machinery (GroupMap, Lloyd, SBC1/SBA1, CEILING, shrinkage, ZZ-HU, probe_tseries.sh) before any T1a ceiling rows. No container bytes until T4. **Next: Builder T0 machinery (slice 1).**
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117, S1 -1.45 B3 closed, S3 -8.09 B2 closed). Parked as ledger preservation (merge-blocked until dual-unit M2/M3 pass); snapshot-imported into PR #146 via 93e0bf2 - never copy files.
- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE, builder T0 Q0 pins 08:39Z, T0 machinery next, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146)** -> **Architect COMPLETE 07:34Z (blueprint + addendum 20 + tracker, 93e0bf2/4745487/fb4db14/4132b73, push 07:51:24 rejected fetch first but RECOVERED via builder push to e2d7d1a)** -> **Builder T0 Q0 pins COMPLETE 08:39Z (a7c237f/7f4d969/e2d7d1a reconciled, P-T0-1..13 verbatim, no measurement)** -> Builder T0 machinery in_progress (32944809993) with 6 pending queue -> this maintainer 08:43Z (duplicate /oc maintainer 08:43:39Z+08:43:47Z) stands down to avoid duplicate dispatch.

## NEXT-RUN PLAYBOOK
1. Verify Builder run 32944809993 (`gh run view 32944809993 --log`, `gh run list --limit 10`) and queued 32949260368 etc; expect Builder to deliver T0 instrument (GroupMap KJOINT, Lloyd integer-only, SBC1/SBA1, CEILING with NET columns, shrinkage, ZZ-HU, probe_tseries.sh with 8 failable self-checks + SPINEREF anchors) before any T1a ceiling measurement. Do NOT dispatch duplicate `build`/`continue` while builder in_progress/pending (cancel-in-progress false queues).
2. After T0 green, verify `gh api pulls/146 --jq .head.sha` beyond e2d7d1a plus new commits, `gh api .../contents/prism/src/codec/lloyd.*` or `prism/benchmarks/probe_tseries.sh` exists, `progress/130-prism-true-jxl-parity.md` shows T0 complete. Next slices T1a (ceiling >=+2.00), T1b (K {4,8,16,24} retain half+floor +1.00), T2a (+0.50), T2b (+1.50), T3 factorial, T4 composition <9.35/<3.117, T5 reserve.
3. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true, `gh pr list --state open` 2 PRs until T-series needs merge. Gates invariant (M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit vs real cjxl; T4 bar <9.35/<3.117). Board frozen blocks ideate; do not dispatch ideate.
4. Honesty: never claim T-series PASS or M2/M3 PASS until `bench_gate.sh` both units vs real cjxl proves it. Fetch-first recovery already verified - `git log FETCH_HEAD` shows architect commits on branch.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (research+architect DONE, builder T0 Q0 08:39Z, T0 machinery in_progress).
- **#146** - OPEN e2d7d1a MERGEABLE/CLEAN, blueprint+addendum 20+T0 pins delivered, builder T0 machinery in_progress 32944809993.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will Builder's T0 instrument (Lloyd degeneracy, G64 1536-stack blowup, assignment-table feedback) pass the 8 failable self-checks and SPINEREF anchors without inventing float or skipping NET?
- Will T1a ceiling kill (+2.00) with honest SBC1 serialization correctly gate T1b, and will decomposition columns show payload gain vs table loss?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into healthy automatic chain.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names verified against GitHub's documented scope list; App-token merge refusals are server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - PR-branch-only workflow change cannot execute until merged to main.
- Fetch-first push failure is recoverable via later push with proper fetch - verify via `git log` linear history, not just push exit code.

 - Mae, the Maintainer
