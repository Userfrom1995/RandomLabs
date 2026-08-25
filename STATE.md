# STATE - Random factory checkpoint
 - **Updated:** 2026-08-25 (~20:06Z, maintainer run 32893368638 - V0 complete at 13f73dd, dispatching V1 continue)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.) Still active for Prism v2.
- **OWNER PRISM V2 CLEAN-SLATE DIRECTIVE (2026-08-25T15:27:03Z, on #131):** Merge PR #131 as ledger preservation only (NOT a parity declaration, NOT a freeze lift). Issue #130 remains OPEN and M2/M3 gates remain strictly in effect for the overall Prism project (M2 summed < 9.498 AND per-sample < 3.166 vs WebP, M3 summed < 8.655 AND per-sample < 2.885 vs JPEG XL, dual-unit on exact Kodak PPMs vs REAL cjxl). Prism v2 is clean-slate: may be a completely independent codec or new architecture family, not incremental over v1, if better toward gates. Researcher and Architect must study learnings, experiment ledgers, failures, and results from BOTH Obsidian and Prism v1 before designing v2. This supersedes the honest-closure park (answered 15:03Z).
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth preserved on main at 14bd9e6c: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -8.21 pct bytes vs e7 baseline (11.026 / 3.675) after arithmetic correction in E-series research.
- **OWNER MANIAC DIRECTIVE (2026-08-25T08:01:41Z, on #131):** continue MANIAC until target results are achieved regardless of architectural/design change magnitude. Satisfied via measured exhaustion for v1 (E1+E4 honest closure); now superseded by v2 clean-slate directive (15:27:03Z) which carries the same until-target persistence into v2.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission.
- **PAT-backed merge sweep LIVE ON MAIN as of 2026-08-25T07:50Z:** `maintainer.yml:442-509` at `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` (632 lines, PAT at 442) - verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n PAT-backed` and `git ls-remote origin main`. PR #131 did NOT touch workflows, so its merge succeeded via App token rebase (non-workflow path) at 15:29:39Z. Still live at 14bd9e6c (grep PAT-backed 442).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `14bd9e6cd64b45ec3467e25098f806fd12d65174` LIVE** (ls-remote verified 20:06Z, `gh api pulls/145 --jq .merged` false). 82 commits from PR #131 now on main (ledger: ADOPTED C1/C3/D4c, REJECTED C2/C2b/C4/C5/D1/D2/D4a/D4b/E1/E2/E3 with evidence, 98/98 green). PAT sweep at 442 live at 14bd9e6c (632 lines).
- **Model watch:** openrouter/muse-spark-1.2-contributor-free active; Prism v2 researcher+architect succeeded at 464b2dc (2+3 commits) with no Endpoint error; Builder V0 kickoff b8bc87a at 16:20:29Z, run 32869523436 transient `Endpoint is unavailable` at 17:05:14Z (session TLrHNIdq, partial push only), retry 32876291587 completed SUCCESS at 18:46:18Z to 0254a6cf (5 commits), continue 32887841319 at 19:08:11Z completed SUCCESS at 20:05Z to 13f73dd (3 commits abde519/cbdc791/13f73dd, 111/111 green, all 6 VB rails green + dated CSV). No second consecutive endpoint failure - ladder stays at retry-once. Latest opencode run 32893355954 at 20:05:53Z cancelled under concurrency, next trigger skipped - no endpoint failure.

## IN FLIGHT
- **PR #131** - MERGED at `14bd9e6cd64b45ec3467e25098f806fd12d65174` (2026-08-25T15:29:39Z, `opencode/issue130-20260823163248` 82 commits, Refs #130 kept #130 open, branch deleted, tag recover/131 retained, ledger now on main). Freeze exception: ledger merge only, not parity.
- **PR #145** - OPEN head `13f73dd1756cbb71ec66fb95afa08b42504827cc` (`opencode/issue130-20260825153143`, 15 commits, base 14bd9e6c, ahead 15 / behind 0, MERGEABLE/CLEAN, pages 32893264984 + pr-trigger 32893265037 success at 20:04:57Z on same head, merge_base 14bd9e6c shared). Deliverables: `prism/docs/research-v2-clean-slate.md` (B1-B5 buckets, ledger L-C1..9 / R-1..4 with I11, V-series V0-V5, I10-I12), `prism/docs/architecture-jxl-parity-vseries.md` (V0 bench-sandbox unwired tokenize/staticmodel, 6 VB rails, V1-V5, zero container until V4 PASS), spec addendum 17 (section 18, RELPCT I10/I12, pseudo-count 32 r=15/16 sum 2^12, K<=256/4096 floors, ESC-A/B/C T_ESC 4/8/16, V2 GAP+W 16.16 /512, V4 <9.35/<3.117), tracker v2 checklist (research + A-v2 checked, V0 sandbox COMPLETE 20:05Z with all 6 VB rails green + dated CSV `prism/benchmarks/results/2026-08-25-sandbox-v0.csv` + self-check PASS). `.agent/decision.json` at head still `{"action":"build"}` (Builder comment records `{"action":"continue"}` handoff for V1). Builder V1 continue dispatched this run at 13f73dd (opencode run 32893355954 cancelled, re-dispatching).
- **Issue #130** - OPEN with Prism v2 pipeline active (research DONE -> architect DONE -> builder V0 COMPLETE at 13f73dd, V0 exit condition met, V1 measurement phase next). E-series ledger at progress/130-prism-true-jxl-parity.md on main at 14bd9e6c (Status complete, e1 10.1210/3.3737 e3=e7 10.1350/3.3783, M2/M3 FAIL both units).
- **Other runs:** this maintainer run 32893368638 issue_comment 20:06:01Z dispatching V1 continue at 13f73dd; opencode 32893355954 cancelled at 20:05:53Z (duplicate `/oc continue` at 20:05:50Z), opencode skipped at 20:06:01Z; prior builder runs: 32887841319 completed success 20:05Z (push 13f73dd, 3 commits), 32876291587 success 18:46Z (5 commits to 0254a6cf), transient 32869523436 endpoint failure at 17:05Z (TLrHNIdq, partial b8bc87a). pr-trigger/pages on 13f73dd SUCCESS at 20:04:57Z; recover schedules success. No held runs.

## PIPELINE POSITION (#130 + infra)
E-series v1 COMPLETE via merge (research 2026-08-25T08:28Z -> architect 08:39Z -> E0 b3ae1c6 10:28Z -> E1+E4 2689d91 11:47Z -> review 11:51Z + test 11:53Z -> HOLD 15:03Z) -> **LEDGER MERGED to main 14bd9e6c 15:29:39Z (Refs #130, #130 kept open)** -> **PRISM V2 KICKOFF: research dispatched 15:29Z -> researcher delivered 2 commits dd55a34/7a6d6dc at 15:44Z -> architect dispatched 15:45Z -> architect delivered 3 commits dcc2b31/2898ae2/464b2dc at 15:59Z -> BUILDER V0 DISPATCHED 16:02:18Z -> BUILDER V0 KICKOFF b8bc87a at 16:20:29Z -> BUILDER V0 FAILED transient 17:05:14Z endpoint (run 32869523436, TLrHNIdq, partial push b8bc87a) -> BUILDER V0 RETRY 17:10:12Z via continue at b8bc87a (run 32876291587) -> COMPLETED 18:46:18Z to 0254a6cf (tokenize + staticmodel + bench-sandbox CLI, 5 commits) -> CONTINUE 19:08:11Z at 0254a6cf (run 32887841319) -> ENGINE INTEGRITY FIXES abde519 at 19:49:15Z (amendment A2 TOKEN spill + RAWBITS, 111/111 green) -> V0 COMPLETE 20:05Z at 13f73dd (probe_sandbox.sh all six VB rails green + dated CSVs + self-check PASS, 111/111 green, 3 commits abde519/cbdc791/13f73dd, SANDBOX GATE PASS)** -> next: Builder V1 measurement phase (tokenization x keying x backend sweep, V1a/V1b verdicts per addendum 18.1, STOP rule binding, zero container bytes until V4 PASS) -> V2 predictors -> V2b/V3/V4 gated -> review/test at container boundary.

## NEXT-RUN PLAYBOOK
1. **Verify Builder V1 continue advancing:** `gh api pulls/145 --jq .head.sha` should advance past 13f73dd once V1 tokenization sweep lands (bench-sandbox V1a/V1b per addendum 18.1, RELPCT per-image-median primary, NET accounting). `gh api actions/runs/<new_run> --jq .status` should be in_progress/completed. If endpoint/AI_APICallError repeats as second consecutive failure (after 32869523436 sole transient), dispatch `{"action":"lab"}` citing both run IDs and requesting two-knob model switch.
2. **Check pages/pr-trigger:** runs 32893264984/037 on 13f73dd SUCCESS at 20:04:57Z; next push will trigger new pr-trigger/pages runs - expect success, not action_required, since head is CLEAN.
3. **Verify merge durability:** `git ls-remote origin main` == 14bd9e6c, `gh api pulls/145 --jq .merged` false (expected OPEN until V4), `gh issue view 130 --json state` == OPEN, `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n PAT-backed` == 442.
4. **No lab/auditor/recover/ideate:** PAT sweep live, no workflow PRs, health board current (lab-health #70), board frozen blocks ideate (#42), #134 draft hold per owner. No recover (PR 145 OPEN, merge_base 14bd9e6c shared).
5. **Main integrity guard:** 14bd9e6c descends from c4c3f5f (verified via `git merge-base --is-ancestor`), PAT sweep live - guard auto-restores if main diverges.

## ISSUES
- **#130** - Prism M2/M3 continuation - Prism v1 ledger merged to main at 14bd9e6c (Status complete, 10.1210/3.3737, M2/M3 FAIL both units) and Prism v2 pipeline active on PR #145 (research + architect DONE at 464b2dc, Builder V0 COMPLETE at 13f73dd with all 6 VB rails green + dated CSV, clean-slate directive, Obsidian+Prism v1 ledger carry-forward, gates strictly remain). Awaiting Builder V1 measurement phase.
- **#145** - OPEN 13f73dd 15 commits (researcher 2 + architect 3 + builder 10), MERGEABLE/CLEAN, V0 bench-sandbox complete (probe_sandbox.sh + dated CSVs + self-check PASS), next V1 backend/tokenization sweep pending via continue dispatched 20:06Z.
- **#131 (PR)** - MERGED to 14bd9e6c at 15:29:39Z (Refs #130, #130 kept open, 82 commits, review+test PASS at 2689d91).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will V1 gated measurement (tokenization ladders ESC-A/B/C x clustered vs pooled x backend) harvest B1/B2 within the 9.35 summed V4 projection threshold (<3.117 per-sample) with I10/I12 accounting and STOP rule enforcement?
- Will V2 integer-exact predictor math (GAP t80/t32 BD-scaled, W ensemble 16.16 /512) plus V2b bias canary deliver B3 headroom without breaching the +0.50 pct coder-fidelity bound?
- Will #134 draft be kept or closed after v1 merge and v2 pivot?
- Will next pr-trigger/pages on new V1 head stay CLEAN/success?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - a PR-branch-only workflow change cannot execute until that branch is merged to main (bootstrap paradox).
- Recover tag `recover/<pr>` is the ground truth for closed-but-advancing branches; orphan check is `git merge-base origin/main <pr-head>` after full fetch.

 - Mae, the Maintainer
