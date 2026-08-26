# STATE - Random factory checkpoint
 - **Updated:** 2026-08-26 (~10:36Z, maintainer run 32959074359 on PR #146 - builder T0 repair landed f2c2eae, continue 32954702099 in_progress, quiet watch, main 14bd9e6c LIVE)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate, may be independent codec family.
- **OWNER PIVOT AUTHORIZATION (2026-08-25T21:53:15Z, on #145) + AUTONOMOUS PIVOT (re-affirmed 2026-08-26T07:12:57Z):** Mae has free hand regarding all architectural decisions, redesigns, and pivots without pausing for owner permission when approach hits mathematical ceiling. ONLY hard restriction is performance gates (M2/M3 dual-unit) - never lifted, bypassed, or altered.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on exact Kodak PPMs.
- **NEW RESEARCH PROGRAM V3 (2026-08-26T06:59Z):** Owner dispatched `/oc research` after V+S stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117). Researcher delivered `prism/docs/research-v3-content-clustering.md` on PR #146; Architect delivered `prism/docs/architecture-jxl-parity-tseries.md` + addendum 20 + tracker checklist (commits 93e0bf2/4745487/fb4db14/4132b73) - blueprint LIVE at f4c220 despite 07:51:24 fetch-first push failure (recovered via builder push chain a7c237f/7f4d969/e2d7d1a then f4c220). Builder T0 Q0 pins committed (reconciled verbatim 08:39Z, P-T0-1..13).

## MERGE CAPABILITY (verified)
- `workflows` is NOT a valid GITHUB_TOKEN scope. PAT-backed merge sweep LIVE at `maintainer.yml:442-509` (632 lines), verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` 632 lines with PAT sweep 442. `main` at 14bd9e6c.

## CRITICAL INFRASTRUCTURE STATE
- **main = 14bd9e6cd64b45ec3467e25098f806fd12d65174 LIVE** (ls-remote verified 10:36Z, PAT sweep 442 live, 632 lines).
- **Model:** opencode/x-preview-f-free (model) + opencode/muse-spark-1.2-contributor-free (small_model) per opencode.json; all workflows on free pins. Builder 32954702099 (`/oc continue` on PR #146) in_progress since 09:45:38Z (build job in_progress) - already advanced branch to f2c2eae (repair T0 core A-T0-1a..f + 13 binding unit tests) verified via `git ls-remote origin opencode/issue130-20260826070009` f2c2eae and pull_request CI success 32958903873/32958903867 at 10:34Z; head f2c2eae MERGEABLE/CLEAN.

## IN FLIGHT
- **PR #146** - OPEN head `f2c2eaee7d7ba583d97bf4b1efcf4944a2068322` (`opencode/issue130-20260826070009`, base 14bd9e6c, MERGEABLE/CLEAN, UNSTABLE is pages/pr-trigger action_required). Deliverables: `research-v3-content-clustering.md` (S4 FAIL, B1+5.81 stranded, oracle 56.4-73.9 pct), `architecture-jxl-parity-tseries.md` (T-series blueprint: composition thesis KJOINT on sandbox, integer Lloyd, SBC1/SBA1, ceiling bypass K_MAX 1536 stacks, shrinkage a_c 192/128, ZZ-HU=HYB_C, 8 failable self-checks, gates verbatim, Q0-Q4 slicing), `algorithmic-spec.md` addendum 20 (13 constant slots pinned BEFORE any measurement, gates verbatim), `progress/130-prism-true-jxl-parity.md` T-series checklist + Q0 pins (T0 still BLOCKING). Handoff at head `.agent/decision.json` = `{"action":"build"}`. Builder chain: 32944809993 TIMED OUT 09:37Z silent no-op (f4c220 preserved via recover/146); **continue 32954702099 RESUMED 09:45:38Z and already pushed f2c2eae (T0 core repair, A-T0-1a..f)**; build job still in_progress at 10:36Z per `gh api actions/runs/32954702099 --jq status` in_progress - quiet watch, no duplicate continue.
- **PR #145** - OPEN head `7600377b48f4760156ec3a005b0de060221f3dbf` (`opencode/issue130-20260825153143`, 39 ahead / 0 behind, base 14bd9e6c, MERGEABLE/CLEAN). V+S program COMPLETE stop-and-report (S4 FAIL 9.5638/3.1879 vs 9.35/3.117, S1 -1.45 B3 closed, S3 -8.09 B2 closed). Parked as ledger preservation; snapshot-imported into PR #146 via 93e0bf2. Auto-retry builder 32952548417 (09:21:16Z) was in_progress for PR #145 - now completed/cancelled per run list, no action needed; PR remains parked.
- **Issue #130** - OPEN, Prism v3 T-series ACTIVE (research+architect COMPLETE at f2c2eae, builder T0 machinery in_progress beyond pins, gates M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit, T4 <9.35/<3.117).

## PIPELINE POSITION
Research v2 DONE -> Architect S-pivot DONE -> Builder S1/S3/S4 COMPLETE FAIL (9.5638/3.1879 stop-and-report) -> **Research v3 COMPLETE 07:15Z (PR #146 @4132b73)** -> **Architect COMPLETE 07:34Z (blueprint + addendum 20 + tracker, 93e0bf2/4745487/fb4db14/4132b73, push 07:51:24 rejected fetch first but RECOVERED via builder pushes to e2d7d1a then f4c220)** -> **Builder T0 Q0 pins COMPLETE 08:39Z (a7c237f/7f4d969/e2d7d1a reconciled, P-T0-1..13 verbatim)** -> Builder T0 machinery STARTED 07:51:29Z (32944809993) -> TIMED OUT 09:37Z silent no-op (1h45m, advanced=no, has_decision=no, recover tag f4c220) -> maintainer 32953950293 dispatched `/oc continue` 09:45:31Z -> **Builder continue 32954702099 STARTED 09:45:38Z -> PUSHED f2c2eae 10:34Z (T0 core repair A-T0-1a..f + 13 binding tests, group keyings KGROUP64/128, integer Lloyd, SBC1 mirror, SBP2, shrinkage SBD1, ZZ-HU, pull_request CI 32958903873/32958903867 success)** -> builder still in_progress at 10:36Z per API, T0 instrument not yet green (checklist still [ ] T0).

## NEXT-RUN PLAYBOOK
1. Verify continue 32954702099 completion: `gh api repos/Userfrom1995/RandomLabs/actions/runs/32954702099 --jq status` should become completed/success within ~30m, `gh api pulls/146 --jq .head.sha` should stay f2c2eae or advance further, `progress/130-prism-true-jxl-parity.md?ref=f2c2eae` checklist [ ] T0 still blocking until 8 self-checks + SPINEREF anchors pass (probe_tseries.sh, --self-check-t0, VB-proto-roundtrip / VB-assign-mirror / net-audit-t). No T1a ceiling rows until T0 green.
2. Keep `git ls-remote origin main` == 14bd9e6c, `gh api pulls/146 --jq .mergeable` true (UNSTABLE is pages preview action_required, not merge block), `gh pr list --state open` 2 PRs until T-series needs merge. Gates invariant (M2 <9.498/<3.166, M3 <8.655/<2.885 dual-unit vs real cjxl; T4 bar <9.35/<3.117). Board frozen blocks ideate; do not dispatch ideate.
3. PR #145 remains parked ledger - do not dispatch build/continue while T-series active; monitor only if independent failure requires auto-heal.
4. Honesty: never claim T-series PASS or M2/M3 PASS until `bench_gate.sh` both units vs real cjxl proves it. Fetch-first recovery verified at f4c220, now f2c2eae linear history verified via `git log origin/opencode/issue130-20260826070009 --oneline -n 5`.

## ISSUES
- **#130** - Prism v3 T-series ACTIVE (research+architect DONE at f2c2eae, builder T0 repair pushed, instrument in_progress).
- **#146** - OPEN f2c2eae MERGEABLE/CLEAN (pages preview action_required), blueprint+addendum 20+T0 pins+T0 repair delivered, continue 32954702099 in_progress.
- **#145** - OPEN 7600377 MERGEABLE/CLEAN, S-series ledger parked.
- **#70** - Lab Health & Audit Logs - current.
- **#42** - Brainstorm Board FROZEN.

## OPEN QUESTIONS
- Will resumed Builder's T0 instrument (now at f2c2eae) pass the 8 failable self-checks and SPINEREF anchors without inventing float or skipping NET after continue resume?
- Will 32954702099 complete cleanly or time out again, and does f2c2eae need a second continue if it hangs?

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
