# STATE - Random factory checkpoint
 - **Updated:** 2026-08-25 (~15:29Z, maintainer run 32865868183 - owner-authorized ledger merge + Prism v2 pivot)

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
- **PAT-backed merge sweep LIVE ON MAIN as of 2026-08-25T07:50Z:** `maintainer.yml:442-509` at `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` (632 lines, PAT at 442) - verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n PAT-backed` and `git ls-remote origin main`. PR #131 did NOT touch workflows, so its merge succeeded via App token rebase (non-workflow path) at 15:29:39Z.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `14bd9e6cd64b45ec3467e25098f806fd12d65174` LIVE** (ls-remote verified 15:29Z, `gh api pulls/131 --jq .merged` true at 15:29:39Z, `gh pr view 131 --json merged` = true, branch deleted). 82 commits from PR #131 now on main (ledger: ADOPTED C1/C3/D4c, REJECTED C2/C2b/C4/C5/D1/D2/D4a/D4b/E1/E2/E3 with evidence, 98/98 green). PAT sweep still at 442, 632 lines (now at 14bd9e6c).
- **Model watch:** openrouter/muse-spark-1.2-contributor-free active; E1+E4 slice at 2689d91 succeeded (98/98, BIAS-fmt FAIL -19.85/-16.33, byte-identical outputs), review PASS 11:51Z + tester PASS 11:53Z at same head, no Endpoint error in this window.

## IN FLIGHT
- **PR #131** - MERGED at `14bd9e6cd64b45ec3467e25098f806fd12d65174` (2026-08-25T15:29:39Z, `opencode/issue130-20260823163248` 82 commits, Refs #130 kept #130 open, review 11:51Z + tester 11:53Z at 2689d91, branch rebased and deleted, tag recover/131 retained, ledger now on main). Freeze exception: ledger merge only, not parity.
- **Issue #130** - OPEN with Prism v2 RESEARCH DISPATCHED this run (research on #130, ping kickoff with clean-slate + Obsidian/Prism v1 study directive). E-series ledger at progress/130-prism-true-jxl-parity.md now on main at 14bd9e6c (Status complete, e1 10.1210/3.3737 e3=e7 10.1350/3.3783, M2/M3 FAIL both units). Architect will follow research handoff. No build yet.
- **Other runs:** this maintainer run 32865868183 issue_comment (owner permit 15:27:03Z on #131, executed merge + research+ping on #130); prior maintainer 32862924324 success 15:03Z quiet watch at honest closure; opencode-review 32844166958 success 11:51Z + tester 32844458882 success 11:53Z at 2689d91; opencode-recover/pr-trigger/pages successes on 2689d91 / c4c3f5f. No held runs post-merge. Pages redeploy triggered via post-merge guard (pre c4c3f5f != 14bd9e6c).
- **PR #139 / #144** - MERGED to c4c3f5f (now ancestor of 14bd9e6c). No open infra PRs. No open PRs at all post-merge (gh pr list empty).

## PIPELINE POSITION (#130 + infra)
E-series v1 COMPLETE via merge (research 2026-08-25T08:28Z -> architect 08:39Z -> E0 b3ae1c6 10:28Z -> E1+E4 2689d91 11:47Z -> review 11:51Z + test 11:53Z -> HOLD 15:03Z) -> **LEDGER MERGED to main 14bd9e6c 15:29:39Z (Refs #130, #130 kept open)** -> **PRISM V2 KICKOFF (research dispatched on #130 15:29Z, clean-slate directive, Obsidian+Prism v1 ledger carry-forward, architect pending handoff)** -> next: architect -> builder for v2 code-shape surgery. Infra track: #139/#144 merged, PAT sweep live at 14bd9e6c.

## NEXT-RUN PLAYBOOK
1. **Verify Prism v2 research dispatched cleanly:** `gh api repos/Userfrom1995/RandomLabs/issues/130/comments --paginate --jq '.[].body | select(startswith("/oc research"))'` should show new comment post-15:27Z, `gh run list --limit 10` should show opencode research run on issue 130 in_progress/success. If research dies to Endpoint/network_error, retry once then lab escalation with run IDs (graceful downgrade ladder).
2. **Dispatch architect after research completes:** Research will write `{"action":"architect"}` handoff; next maintainer verifies research commit(s) landed on a new opencode/issue130-* branch (check `gh pr list --state open` for new PR), then dispatches `{"action":"architect","issue":130}` or waits for automatic architect trigger. Do not dispatch architect concurrently with research.
3. **Verify merge durability:** `git ls-remote origin main` == 14bd9e6c, `gh api pulls/131 --jq .merged` true, `gh issue view 130 --json state` == OPEN, `gh api .../contents/progress/130-prism-true-jxl-parity.md?ref=main --jq .content | base64 -d | head` shows Status complete ledger, `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n PAT-backed` == 442.
4. **No lab/auditor/recover/ideate:** PAT sweep live, no workflow PRs, health board current, board frozen blocks ideate, #134 draft hold per owner. PR #131 branch deleted via merge, no recover needed.
5. **Main integrity guard:** pre-agent sha c4c3f5f; post-merge 14bd9e6c descends from c4c3f5f (verified via `git merge-base --is-ancestor`), PAT sweep live - guard auto-restores if main diverges.

## ISSUES
- **#130** - Prism M2/M3 continuation - Prism v1 ledger merged to main at 14bd9e6c (Status complete, 10.1210/3.3737, M2/M3 FAIL both units) and Prism v2 CLEAN-SLATE research dispatched on #130 per 15:27:03Z directive (Obsidian+Prism v1 study, new architecture family permitted, gates strictly remain). Awaiting research output then architect.
- **#131 (PR)** - MERGED to 14bd9e6c at 15:29:39Z (Refs #130, #130 kept open, 82 commits, review+test PASS at 2689d91).
- **#137 + #138 + #143 + #144** - CLOSED via #139/#144 merges to c4c3f5f (now ancestor).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will Prism v2 Research identify a code-shape-level lever (new binarization/entropy family or pipeline surgery) that clears the ~16.9 pct gap after studying Obsidian+Prism v1 rejection evidence?
- Will #134 draft be kept or closed after v1 merge and v2 pivot?
- Will architect handoff be triggered automatically by research, or require next maintainer dispatch?

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
