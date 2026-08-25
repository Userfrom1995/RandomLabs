# STATE - Random factory checkpoint
 - **Updated:** 2026-08-25 (~18:44Z, maintainer run 32885497894 - Builder V0 advancing on PR #145, quiet watch)

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
- **`main` = `14bd9e6cd64b45ec3467e25098f806fd12d65174` LIVE** (ls-remote verified 18:44Z, `gh api pulls/131 --jq .merged` true at 15:29:39Z, `gh pr view 131 --json merged` = true, branch deleted). 82 commits from PR #131 now on main (ledger: ADOPTED C1/C3/D4c, REJECTED C2/C2b/C4/C5/D1/D2/D4a/D4b/E1/E2/E3 with evidence, 98/98 green). PAT sweep at 442 live at 14bd9e6c (632 lines).
- **Model watch:** openrouter/muse-spark-1.2-contributor-free active; Prism v2 researcher+architect succeeded at 464b2dc (2+3 commits) with no Endpoint error; Builder V0 kickoff b8bc87a pushed at 16:20:29Z, run 32869523436 FAILED at 17:05:14Z with `Endpoint is unavailable` (transient, session TLrHNIdq), retry 32876291587 dispatched 17:10:12Z via continue at b8bc87a and IS ADVANCING: 5 new commits landed to 0254a6cf at 18:46:18Z (tokenize/staticmodel modules + bench-sandbox CLI), still in_progress at 18:44Z (94m wall), no second consecutive endpoint failure. Next consecutive failure would trigger lab with two-knob switch.

## IN FLIGHT
- **PR #131** - MERGED at `14bd9e6cd64b45ec3467e25098f806fd12d65174` (2026-08-25T15:29:39Z, `opencode/issue130-20260823163248` 82 commits, Refs #130 kept #130 open, review 11:51Z + tester 11:53Z at 2689d91, branch deleted, tag recover/131 retained, ledger now on main). Freeze exception: ledger merge only, not parity.
- **PR #145** - OPEN head `0254a6cf31e6de79748d4a6c904f72537e16b7a7` (`opencode/issue130-20260825153143`, 11 commits, base 14bd9e6c, ahead 11 / behind 0, MERGEABLE/UNSTABLE due to pending action_required pr-trigger/pages checks, merge_base 14bd9e6c shared). Deliverables: `prism/docs/research-v2-clean-slate.md` (B1 6.30 pct gross / B2 1.86-2.95 / B3 2-5 pct / B4 0.5-1.5 / B5 0.5-1.0, optimistic sum clears 14.48 pct M3, midpoint ~9.1-9.7, ledger L-C1..9 / R-1..4 with I11, V-series V0-V5, I10-I12), `prism/docs/architecture-jxl-parity-vseries.md` (V0 bench-sandbox unwired tokenize/staticmodel, 6 VB rails, V1-V5, zero container until V4 PASS), spec addendum 17 (section 18, RELPCT I10/I12, pseudo-count 32 r=15/16 sum 2^12, K<=256/4096 floors, ESC-A/B/C T_ESC 4/8/16, V2 GAP+W 16.16 /512, V4 <9.35/<3.117), tracker v2 checklist (research + A-v2 checked, Builder slice 1 structural pins DONE via b8bc87a, now expanded: tokenize ZFFCTRL/HYB ladders + staticmodel clustered tables + bench-sandbox CLI with config matrix/frozen-walk/corrupt injections/CSV rows per commits 56dcc54/39449c/1bdb64/44e64f/0254a6c), `.agent/decision.json`=`{"action":"build"}` at 464b2dc, plus Builder V0 run 32876291587 advancing (94m in_progress at 18:44Z, pushed 5 commits since b8bc87a, no endpoint repeat).
- **Issue #130** - OPEN with Prism v2 pipeline active (research DONE -> architect DONE -> builder V0 ADVANCING via continue on 0254a6cf after transient). E-series ledger at progress/130-prism-true-jxl-parity.md on main at 14bd9e6c (Status complete, e1 10.1210/3.3737 e3=e7 10.1350/3.3783, M2/M3 FAIL both units). No new issue creation.
- **Other runs:** this maintainer run 32885497894 schedule 18:44Z quiet watch; opencode continue 32876291587 in_progress 17:10:12Z-18:44Z advancing (5 commits to 0254a6cf at 18:46:18Z); opencode build 32869523436 completed failure 17:05:40Z (endpoint TLrHNIdq); pr-trigger/pages on 0254a6cf action_required (32885725404/409) awaiting approval, prior pages on b8bc87a succeeded; recover schedules success. No held runs besides preview action_required.

## PIPELINE POSITION (#130 + infra)
E-series v1 COMPLETE via merge (research 2026-08-25T08:28Z -> architect 08:39Z -> E0 b3ae1c6 10:28Z -> E1+E4 2689d91 11:47Z -> review 11:51Z + test 11:53Z -> HOLD 15:03Z) -> **LEDGER MERGED to main 14bd9e6c 15:29:39Z (Refs #130, #130 kept open)** -> **PRISM V2 KICKOFF: research dispatched 15:29Z -> researcher delivered 2 commits dd55a34/7a6d6dc at 15:44Z -> architect dispatched 15:45Z -> architect delivered 3 commits dcc2b31/2898ae2/464b2dc at 15:59Z -> BUILDER V0 DISPATCHED 16:02:18Z -> BUILDER V0 KICKOFF b8bc87a at 16:20:29Z -> BUILDER V0 FAILED 17:05:14Z endpoint transient (run 32869523436, TLrHNIdq) -> BUILDER V0 RETRY dispatched 17:10:12Z via continue at b8bc87a (run 32876291587) -> ADVANCING: 5 commits to 0254a6cf at 18:46:18Z (tokenize + staticmodel + bench-sandbox CLI)** -> next: Builder V0 completion (remaining VB rails green + dated CSVs + self-check) -> V1 backend/tokenization -> V2 predictors -> V2b/V3/V4 gated -> review/test at container boundary. Infra track: #139/#144 merged, PAT sweep live at 14bd9e6c.

## NEXT-RUN PLAYBOOK
1. **Verify Builder V0 continue still advancing or completed:** `gh api pulls/145 --jq .head.sha` should stay 0254a6cf or advance further if full harness lands (`prism bench-sandbox --self-check` and 6 VB rails PASS: anchors, +0.50 pct fidelity, double-count audit, corrupt injection, ranking both ways, determinism, plus dated CSVs before any V1 scoring). `gh api actions/runs/32876291587 --jq .status` should flip to completed/success when done. If endpoint/AI_APICallError repeats as second consecutive failure, dispatch `{"action":"lab"}` citing run 32869523436 + 32876291587 and requesting two-knob model switch to next best free model.
2. **Check pages/pr-trigger:** runs 32885725404/409 on 0254a6cf currently action_required (expected), prior runs on b8bc87a succeeded; approve-held-runs sweep will approve next cycle.
3. **Verify merge durability:** `git ls-remote origin main` == 14bd9e6c, `gh api pulls/145 --jq .merged` false (expected OPEN until V4), `gh issue view 130 --json state` == OPEN, `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n PAT-backed` == 442.
4. **No lab/auditor/recover/ideate:** PAT sweep live, no workflow PRs, health board current (lab-health #70), board frozen blocks ideate (#42), #134 draft hold per owner. No recover (PR 145 OPEN, merge_base 14bd9e6c shared).
5. **Main integrity guard:** 14bd9e6c descends from c4c3f5f (verified via `git merge-base --is-ancestor`), PAT sweep live - guard auto-restores if main diverges.

## ISSUES
- **#130** - Prism M2/M3 continuation - Prism v1 ledger merged to main at 14bd9e6c (Status complete, 10.1210/3.3737, M2/M3 FAIL both units) and Prism v2 pipeline active on PR #145 (research + architect DONE at 464b2dc, Builder V0 advancing at 0254a6cf via continue 32876291587 after transient, 5 commits beyond kickoff, clean-slate directive, Obsidian+Prism v1 ledger carry-forward, gates strictly remain). Awaiting Builder V0 harness completion.
- **#145** - OPEN 0254a6cf 11 commits (researcher 2 + architect 3 + builder 6), MERGEABLE/UNSTABLE, V0 bench-sandbox CLI landed, remaining VB rails pending.
- **#131 (PR)** - MERGED to 14bd9e6c at 15:29:39Z (Refs #130, #130 kept open, 82 commits, review+test PASS at 2689d91).
- **#137 + #138 + #143 + #144** - CLOSED via #139/#144 merges to c4c3f5f (now ancestor).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will Builder V0 continue 32876291587 complete the unwired bench-sandbox (remaining 6 VB rails fully green + dated CSVs) before any V1 scoring? 5/6 modules advanced to 0254a6cf; need final self-check + full rail verification.
- Will V1-V2b gated measurements harvest B1/B2/B3 within the 9.35 summed V4 projection threshold (<3.117 per-sample) for honest M2 PASS / M3 contingency?
- Will #134 draft be kept or closed after v1 merge and v2 pivot?
- Will pr-trigger/pages on 0254a6cf approve via PAT sweep or require manual approval (action_required still)?

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
