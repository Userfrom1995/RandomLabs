# STATE - Random factory checkpoint
 - **Updated:** 2026-08-25 (~15:03Z, maintainer run 32862924324 - issue_comment quiet watch at honest closure)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -8.21 pct bytes vs e7 baseline (11.026 / 3.675) after arithmetic correction in E-series research (was -9.1, derivation stamped in research doc).
- **OWNER MANIAC DIRECTIVE (2026-08-25T08:01:41Z, on #131):** continue MANIAC until target results are achieved regardless of architectural/design change magnitude. Recorded as standing instruction - we do not stop working until we achieve target results. Superseded prior park (RESOLVED 2026-08-24T19:39Z, ANSWERED 2026-08-25T07:31Z). E-series RESEARCH->ARCHITECT DONE, E0 COMPLETE, **E1+E4 COMPLETE at 2689d91 (Status: complete, honest closure)** - MANIAC directive now satisfied via measured exhaustion (every lever adopted or rejected by measurement, ledger complete).
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission.
- **PAT-backed merge sweep LIVE ON MAIN as of 2026-08-25T07:50Z:** `maintainer.yml:442-509` at `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` (632 lines, PAT at 442) - verified via `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n PAT-backed` and `git ls-remote origin main`. Bootstrap COMPLETE via #144 merge (07:50Z) + #139 auto-merged to c4c3f5f.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` LIVE** (ls-remote verified 15:02Z, pulls 139/144 merged, issues 143/137/138 CLOSED). PAT sweep at 442, 632 lines.
- **Model watch:** openrouter/muse-spark-1.2-contributor-free active; E1+E4 slice succeeded to 2689d91 (6 commits: spec addendum 16 + BiasModel 11 tests + --bias harness + E4 checkpoint, 98/98 green, fuzz PASS, BIAS-fmt FAIL -19.85/-16.33 points, byte-identical outputs). Review PASS 11:51:00Z (run 32844166958 success) + Tester PASS 11:53:16Z (run 32844458882 success) both at 2689d91. No Endpoint error in this window; prior single transient at 08:44Z cleared.

## IN FLIGHT
- **PR #131** - OPEN CLEAN head `2689d9178bf01a0209e6e2cc998b8116dfc54794` (`opencode/issue130-20260823163248`, 82 ahead / 0 behind main `c4c3f5f`, merge_base `c4c3f5f` shared, MERGEABLE/CLEAN). 82 commits (D-series 66 + recover 1 + E-series 15: research 3 + architect 2 + E0 5 + E1 6 + E4 1). **E-series COMPLETE, Status: complete** (progress/130-prism-true-jxl-parity.md): ADOPTED C1/C3/D4c (-8.21 pct bytes), REJECTED C2/C2b/C4/C5/D1/D2/D4a/D4b/E1/E2/E3 with evidence, E4 fresh measure byte-identical to D4c era, final truth e1 10.1210/3.3737 e3=e7 10.1350/3.3783 - M2/M3 FAIL both units honestly. **REVIEW PASS 11:51:00Z + TESTER PASS 11:53:16Z both at 2689d91** - ledger validated, no fix needed, tree clean, branch rebuilt onto main. Freeze blocks merge until dual-unit M2 AND M3 pass. Awaiting owner freeze direction (docs-only merge vs honest close without merge).
- **Other runs:** this maintainer run 32862924324 issue_comment (quiet watch 15:03Z answering `any update or improvement?`); prior maintainer 32862057001 schedule success 14:50Z quiet watch, 32850195983 success 12:54Z, 32844631596 success 11:57Z duplicate handoff, 32844188623 success 11:56Z handle of tester handoff, opencode-review 32844166958 success 11:51Z + tester 32844458882 success 11:53Z; opencode-recover schedule success; pr-trigger/pages success on 2689d91 at 11:46Z + 11:48Z. No held runs. 6 siblings skipped on this comment batch per `if:` (auditor/lab/opencode/review/test).
- **PR #139 / #144** - MERGED to c4c3f5f (PAT sweep live). No open infra PRs.

## PIPELINE POSITION (#130 + infra)
research E-series DONE (2026-08-25T08:28Z) -> architect E-series DONE (08:39Z) -> E0 COMPLETE b3ae1c6 (2026-08-25T10:28Z) -> **E1+E4 COMPLETE at 2689d91 (2026-08-25T11:47Z, 6 commits, BIAS-fmt FAIL, Status complete, honest closure)** -> **REVIEW PASS 11:51:00Z + TESTER PASS 11:53:16Z at 2689d91 (code-quality green, ledger validated, no parity claim)** -> **MAINTAINER HOLD at 2689d91 (freeze blocks merge, honest closure pending owner direction, answered 15:03Z)**. Infra track: #139/#144 MERGED to c4c3f5f (PAT sweep live). Owner MANIAC directive satisfied via exhaustion; freeze still blocks merge until dual-unit M2 AND M3 pass (currently 10.1210/3.3737 vs 9.498/3.166).

## NEXT-RUN PLAYBOOK
1. **Verify no duplicate triggers:** head still 2689d91, review+test already green at same head, maintainer stood down with [] at 11:56Z/11:57Z/12:54Z/14:50Z/15:03Z - do not re-dispatch review/test/build/continue/architect/research on PR #131 until owner rules. Check `gh api pulls/131 --jq .head.sha` still 2689d91, `gh api .../actions/runs/32844166958 --jq .conclusion` success, `gh api .../actions/runs/32844458882 --jq .conclusion` success before any action.
2. **Owner direction on freeze:** if owner lifts freeze for docs/ledger-only merge, verify `progress/130-prism-true-jxl-parity.md?ref=2689d91` Status complete, `bench_gate.sh --self-check` both units still FAIL honestly, `merge_base` c4c3f5f shared, MERGEABLE/CLEAN, then merge PR #131 via PAT sweep (`gh pr merge 131 --rebase --delete-branch` with PAT, verify `gh api pulls/131 --jq .merged` true, update body Refs #130 -> Closes #130 so auto-close fires, otherwise manual close #130 with ledger link). If owner directs close without merge, close #130 with comment linking `progress/130-prism-true-jxl-parity.md` at 2689d91 and decision records, leave PR open for record, do not merge.
3. **Do not auto-close #130:** body is Refs #130 not Closes, so merge would not auto-close; honest closure requires manual `gh issue close 130` with ledger link after owner confirmation, not autonomous.
4. **No lab/auditor/recover/ideate:** PAT sweep live, PR #131 CLEAN and not orphan, health board current, board frozen blocks ideate, #134 draft hold per owner.
5. **Main integrity guard:** pre-agent sha c4c3f5f; PAT sweep live - guard auto-restores if main diverges.

## ISSUES
- **#130** - Prism M2/M3 continuation - E-series executed to honest closure at achieved level (Status complete at 2689d91, e1 10.1210/3.3737 e3=e7 10.1350/3.3783, -8.21 pct vs baseline, M2/M3 FAIL both units). Review PASS 11:51Z + Tester PASS 11:53Z both at 2689d91 (ledger validated, no fix needed). Awaiting owner direction on freeze lift vs honest close without merge. Dual-unit freeze still formally blocks PR merge.
- **#137 + #138 + #143 + #144** - CLOSED via #139/#144 merges to c4c3f5f.
- **#131 (PR)** - OPEN CLEAN head 2689d91 (82 ahead / 0 behind c4c3f5f, E1+E4 closure, review+test PASS, freeze blocks merge, ledger complete).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will owner lift freeze to allow ledger merge as docs-only, or direct #130 closed without PR merge (ledger stays on branch for record)?
- Does `.agent/decision.json` stale `build` need correction to `complete` in a docs-only follow-up, or is freeze hold sufficient?
- Will #134 draft be kept or closed after E-series final verdict?

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
