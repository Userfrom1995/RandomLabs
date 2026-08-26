# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~08:49Z, maintainer run 32949767326 - schedule, architect f4c220 success -> build queued, main 14bd9e6c LIVE)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146 (head 4132b73 -> f4c220) - post-mortem with numbers, decisive instrumentation finding (ClusterMap::raw_at replaces vs refines), T-series program pre-registered (T0-T5, zero container until T4 passes, proceed bar <9.35/<3.117 unchanged).
- **ARCHITECT V3 COMPLETE (2026-08-26T07:51:29Z, run 32943354907 success):** Delivered `prism/docs/architecture-tseries-content-clustering.md` (T-series blueprint), `prism/docs/index.md` entry, `docs/v3-ideas.md`, `algorithmic-spec.md` addendum 20 skeleton (all constants [pin] vs [transcribe] enumerated, T-gates verbatim), `progress/130-prism-true-jxl-parity.md` reopened with T-checklist (T-dep, T-spec, T0, T1a, T1b, T2a, T2b, T3, T4, T5) + slicing Q0-Q4 + agent log. Stacking: V+S instrument snapshot-imported from PR #145 @7600377 as linear history (PR #145 stays OPEN, diff empties once T ships). Handoff `{"action":"build"}`. Transient push `! [rejected] fetch first` at 07:51:24Z posted as bot comment 5422262208 but remote now at f4c220 verifies healed (5 commits present).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified 07:36Z and 08:49Z via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` (442) and `git ls-remote origin main` at 14bd9e6c. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 08:49Z, PAT sweep 442 live, 632 lines; no advance since 07:13Z).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. Architect success at 07:51:29Z proves model live; no CreditsError in this window.

## IN FLIGHT
- **PR #146** - OPEN head `f4c22026e8257801a46698d92c952413335bb87b` (`opencode/issue130-20260826070009`, 5 commits: researcher 2 + architect 3, base 14bd9e6c, MERGEABLE null -> prior CLEAN, `git ls-remote` f4c220). Deliverables: research v3 + T-blueprint complete, addendum 20 skeleton, tracker reopened, decision build. Owner dispatched `/oc build this` at 07:51:26Z (5422262626); pending opencode build run 32949260368 (pending 08:43:50Z) + maintainer runs 32949248249 in_progress (08:43:41Z) + 32949260311 pending (08:43:50Z) queued via cancel-in-progress false. No container bytes until T4. **Next: Builder slice 0 (T-dep gate + addendum 20 transcription) - binding dependency: T-slices start only after PR #145 merges, else Builder hands maintainer.**
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117, S5 NOT triggered 9.5638 > 8.8316). Parked ledger preservation; instrument source for T-series via snapshot import (not copy). Diff will empty once T-content ships through PR #146.
- **Issue #130** - OPEN, Prism T-series active (research COMPLETE, architect COMPLETE, builder pending slice 0). S-series halt was binding STOP per addendum 19.5 + 18.5, not stall.

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146 4132b73)** -> **Architect V3 COMPLETE 07:51:29Z (run 32943354907 success, head f4c220, blueprint + addendum 20 skeleton + tracker reopen, handoff build)** -> **Owner `/oc build this` 07:51:26Z -> Build QUEUED (opencode 32949260368 pending + maintainer 32949248249 in_progress + 32949260311 pending via cancel-in-progress false)** -> this maintainer 08:49Z schedule stands down (no duplicate dispatch).

## NEXT-RUN PLAYBOOK
1. Verify queued build runs: `gh run list --limit 15`, `gh run view 32949260368 --log`, `gh api pulls/146 --jq .head.sha` beyond f4c220 if Builder slice 0 pushed, `gh api .../contents/.agent/decision.json?ref=<new-sha>` (expect `continue` for T0 or `maintainer` if T-dep gate fails), `progress/130-prism-true-jxl-parity.md` shows T-spec pinned. Do NOT dispatch duplicate `build` while opencode 32949260368 is pending/in_progress or maintainer 32949248249/32949260311 active.
2. If Builder returns `{"action":"maintainer"}` (T-dep gate: PR #145 still open), next maintainer must explain binding dependency (blueprint section 1) without spamming: PR #145 snapshot-imported as linear history, T-slices blocked until it merges; instrument never copied onto sibling branches.
3. If Builder returns `{"action":"continue"}` and head advances, next maintainer dispatches `continue` for T0 instrument extension only after verifying addendum 20 landed and gates verbatim. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true, `gh pr list --state open` 2 PRs until T4 passes. Gates invariant (M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit vs real cjxl; T4 bar <9.35/<3.117). Board frozen blocks ideate.
4. Honesty: never claim T-series PASS or M2/M3 PASS until `bench_gate.sh` both units vs real cjxl proves it. Push error at 07:51:24Z verified healed (remote f4c220 matches local); do not re-trigger recover.

## ISSUES
- **#130** - Prism T-series BUILD PENDING (research+architect complete, slice 0 queued at f4c220).
- **#146** - OPEN f4c220 MERGEABLE/CLEAN, T-blueprint + addendum 20 + tracker reopened, build queued.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, V+S ledger parked, T-dep gate source.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will Builder slice 0 clear the T-dep gate (PR #145 merged)? If not, how to sequence the preservation merge of the V+S ledger without violating freeze/M2/M3 gates?
- Will the T0 instrument extension (GroupPartition, integer Lloyd, SBA1/SBM1, shrinkage, ZZ-HU, 8 self-checks) land cleanly and will T1a ceiling kill correctly gate T1b?

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
