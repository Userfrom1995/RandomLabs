# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~10:58Z, maintainer run 32960947231 issue_comment on PR #146 `/oc maintainer` at 10:58:25Z - T0 COMPLETE b17c906, dispatching Q1)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` 632 lines with PAT sweep 442. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 10:58Z, PAT sweep 442 live, 632 lines).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. Prior builder run 32954702099 (`/oc continue` on PR #146) pushed f2c2eae at 10:34Z then continued to b17c906 at 10:58Z (Q0 RECONCILED COMPLETE, 142/142 tests, T0 green). Branch now b17c906 MERGEABLE/CLEAN, CI success via opencode-pr-trigger 32960843229.

## IN FLIGHT
- **PR #146** - OPEN head `b17c9066e4674499a03cffe1f8dbf37ac1f8860b` (`opencode/issue130-20260826070009`, base 14bd9e6c, MERGEABLE/CLEAN). Deliverables: `research-v3-content-clustering.md` (S4 FAIL, B1+5.81 stranded, oracle 56.4-73.9 pct), `architecture-jxl-parity-tseries.md` (T-series blueprint: composition thesis KJOINT on sandbox, integer Lloyd, SBC1/SBA1, ceiling bypass K_MAX 1536 stacks, shrinkage a_c 192/128, ZZ-HU=HYB_C, 8 failable self-checks, gates verbatim, Q0-Q4 slicing), `algorithmic-spec.md` addendum 20 (13 constant slots pinned BEFORE any measurement, gates verbatim), `progress/130-prism-true-jxl-parity.md` T-series checklist T0 [x] DONE, Q0 COMPLETE 2026-08-26 (reconciled A-T0-1 + A5, 142/142, T0 CSV committed), `prism/src/codec/staticmodel.*` T0 core (SBC1 global prior, Lloyd full-block metric, rANS tail order, crc32_combine chaining), `bench-sandbox --t0` + `--t0-synth` + probe rails VB-proto-roundtrip/VB-zzhu-identity/VB-assign-mirror/VB-net-audit-t + --self-check-t0. Builder handoff at b17c906 comment = `{"action":"continue"}` for Q1 (file header still {"action":"build"} stale, comment authoritative). Next slice Q1 T1a ceiling kill test: per-group exact stacks, tables realistic, gate >= +2.00 pct median NET beyond fresh T-BASE.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Parked as ledger preservation; snapshot-imported into PR #146 via 93e0bf2. No active builder for 145.
- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f4c220, builder T0 instrument COMPLETE at b17c906 with reconciled 142/142 and dated CSV, next Q1 T1a pending dispatch 10:58Z, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146 @4132b73)** -> **Architect COMPLETE 07:34Z (blueprint + addendum 20 + tracker, 93e0bf2/4745487/fb4db14/4132b73, push 07:51:24 rejected fetch first but RECOVERED via builder pushes to e2d7d1a then f4c220)** -> **Builder T0 Q0 pins COMPLETE 08:39Z (a7c237f/7f4d969/e2d7d1a reconciled, P-T0-1..13 verbatim)** -> Builder T0 machinery STARTED 07:51:29Z (32944809993) -> TIMED OUT 09:37Z silent no-op (f4c220 preserved via recover/146) -> maintainer 32953950293 dispatched `/oc continue` 09:45:31Z -> **Builder continue 32954702099 STARTED 09:45:38Z -> PUSHED f2c2eae 10:34Z (T0 core repair A-T0-1a..f + 13 binding tests)** -> **Builder continued to b17c906 10:58Z (Q0 RECONCILED + COMPLETE, 142/142 tests, all rails + T-rails green, dated CSV 2026-08-26-sandbox-t0.csv)** -> **Maintainer 32960947231 dispatching `/oc continue` 10:58Z for Q1 T1a ceiling kill test (per blueprint section 2 / addendum 20.5).**

## NEXT-RUN PLAYBOOK
1. Verify continue dispatch on PR #146 for Q1: `gh api repos/Userfrom1995/RandomLabs/actions/runs --jq '.workflow_runs[] | select(.head_sha=="b17c9066e4674499a03cffe1f8dbf37ac1f8860b")'` and `gh api pulls/146 --jq .head.sha` should advance beyond b17c906 once T1a rows land. T1a gate >= +2.00 pct median NET beyond fresh T-BASE; decomposition columns decide if table bytes sole loss term for T1b conditional.
2. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true, `gh pr list --state open` 2 PRs until T-series needs merge. Gates invariant (M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit vs real cjxl; T4 bar <9.35/<3.117). Board frozen blocks ideate; do not dispatch ideate.
3. PR #145 remains parked ledger - do not dispatch build/continue while T-series active.
4. Honesty: never claim T1a PASS or M2/M3 PASS until quad measurement vs fresh T-BASE proves it. Smoke readings remain non-gating (Lloyd K=1 collapse, CEILING negative payload).

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (T0 COMPLETE at b17c906, Q1 T1a pending dispatch).
- **#146** - OPEN b17c906 MERGEABLE/CLEAN, blueprint+addendum 20+T0 COMPLETE (142/142, CSV committed), continue queued for Q1 T1a.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will T1a ceiling kill test (per-group exact stacks, 248/62 KB table costs) cross the +2.00 pct median NET gate, or will payload gain remain negative as on kodim01 smoke (-0.41/-0.76) making C1 close?
- Will Lloyd's chi-square metric ever retain K>1 on quad images, or will transmitted K=1 dominate and close content-defined codebook path?

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
- Silent build no-op (timeout with no push and no decision) is handled by bounded auto-heal (2x `/oc continue (auto-heal)`) then handoff to maintainer via `/oc maintainer` - maintainer must dispatch `/oc continue` to preserve work.

 - Mae, the Maintainer
