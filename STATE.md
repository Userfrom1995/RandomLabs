# STATE - Random factory checkpoint
- **Updated:** 2026-08-25 (~11:48Z, maintainer run 32844178079 - issue_comment on PR #131, review running on E-series closure)

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
- **`main` = `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` LIVE** (ls-remote verified 11:48Z, pulls 139/144 merged, issues 143/137/138 CLOSED). PAT sweep at 442, 632 lines.
- **Model watch:** openrouter/muse-spark active; E1+E4 slice succeeded to 2689d91 (6 commits: spec addendum 16 + BiasModel 11 tests + --bias harness + E4 checkpoint, 98/98 green, fuzz PASS, BIAS-fmt FAIL -19.85/-16.33 points, byte-identical outputs). Review dispatched via owner `/oc review` 11:47:53Z - opencode-review run 32844166958 in_progress (checkout PR head success, reviewer running), duplicate 32844188634 pending. No Endpoint error in this window; prior single transient at 08:44Z cleared.

## IN FLIGHT
- **PR #131** - OPEN CLEAN head `2689d9178bf01a0209e6e2cc998b8116dfc54794` (`opencode/issue130-20260823163248`, 82 ahead / 0 behind main `c4c3f5f`, merge_base `c4c3f5f` shared, MERGEABLE/CLEAN). 82 commits (D-series 66 + recover 1 + E-series 15: research 3 + architect 2 + E0 5 + E1 6 + E4 1). **E-series COMPLETE, Status: complete** (progress/130-prism-true-jxl-parity.md): ADOPTED C1/C3/D4c (-8.21 pct bytes), REJECTED C2/C2b/C4/C5/D1/D2/D4a/D4b/E1/E2/E3 with evidence, E4 fresh measure byte-identical to D4c era, final truth e1 10.1210/3.3737 e3=e7 10.1350/3.3783 - M2/M3 FAIL both units honestly. Handoff at HEAD = `{"action":"build"}` (stale, builder closed honestly but file still says build; review is the correct next step per closure). **Review RUNNING** via 32844166958 (in_progress, checkout PR head verified) - do not re-dispatch until it concludes; next is auto-test or fix round, then maintainer merge/close decision under freeze.
- **Other runs:** this maintainer run 32844178079 issue_comment (review+maintainer batch 11:47-11:48Z); sibling opencode-review 32844166958 in_progress + 32844188634 pending (both issue_comment, headSha main in payload but checkout PR head via Get PR info step - verified via job steps); pr-trigger 32844048053/48011 success on 2689d91 at 11:46Z; pages deploy success 32844048011 at 11:46Z; recover schedule success 328441... skipped correctly. No held runs.
- **PR #139 / #144** - MERGED to c4c3f5f (PAT sweep live). No open infra PRs.

## PIPELINE POSITION (#130 + infra)
research E-series DONE (2026-08-25T08:28Z) -> architect E-series DONE (08:39Z) -> E0 COMPLETE b3ae1c6 (2026-08-25T10:28Z) -> **E1+E4 COMPLETE at 2689d91 (2026-08-25T11:47Z, 6 commits, BIAS-fmt FAIL, Status complete, honest closure)** -> **REVIEW RUNNING at 2689d91 (32844166958 in_progress, owner-triggered 11:47:53Z)** -> test -> maintainer (merge blocked by freeze OR honest close of #130 without merge, per ledger). Infra track: #139/#144 MERGED to c4c3f5f (PAT sweep live). Owner MANIAC directive satisfied via exhaustion; freeze still blocks merge until dual-unit M2 AND M3 pass (currently 10.1210/3.3737 vs 9.498/3.166).

## NEXT-RUN PLAYBOOK
1. **Verify Review at 2689d91:** `gh api repos/Userfrom1995/RandomLabs/actions/runs/32844166958 --jq .status/.conclusion` -> success with decision file else auto-retry per crash-parity guard (up to 3). Check `gh api pulls/131 --jq .head.sha` still 2689d91 (review stable head), `gh api .../contents/progress/130-prism-true-jxl-parity.md?ref=2689d91` Status complete, decision records, bench_gate both units FAIL honestly, no parity claim. If reviewer posts `/oc fix` findings, dispatch fix via `{"action":"fix","pr":131}`; if `/oc approve`, dispatch `{"action":"test","pr":131}`; if silenced (no decision file), count prior auto-retry comments and re-post via crash-parity path.
2. **Reconcile handoff file:** HEAD `.agent/decision.json` still says `build` while progress says complete and builder handoff text says review - review takes precedence as phase boundary; after review, builder should not re-dispatch build unless review explicitly asks for fix/continue.
3. **PR #131 merge freeze:** still blocks merge until dual-unit M2 AND M3 pass (10.1210/3.3737 vs 9.498/3.166). Even with Status complete, do not merge without genuine dual-unit passes. Honest closure of #130 is the issue-level consequence, not an automatic PR merge. If review+test approve the closure ledger, consider merging as docs/ledger-only if freeze is lifted by owner, otherwise leave PR open for record and close #130 with comment linking ledger.
4. **Verify no duplicate triggers:** this run stood down with [] while review 32844166958 in_progress; next run should not fire duplicate review if still in_progress (check status before dispatch).
5. **Main integrity guard:** pre-agent sha c4c3f5f; PAT sweep live - guard auto-restores if main diverges.

## ISSUES
- **#130** - Prism M2/M3 continuation - E-series executed to honest closure at achieved level (Status complete at 2689d91, e1 10.1210/3.3737 e3=e7 10.1350/3.3783, -8.21 pct vs baseline, M2/M3 FAIL both units). Awaiting review at 2689d91 then test/close. Dual-unit freeze still formally blocks merge.
- **#137 + #138 + #143 + #144** - CLOSED via #139/#144 merges to c4c3f5f.
- **#131 (PR)** - OPEN CLEAN head 2689d91 (82 ahead / 0 behind c4c3f5f, E1+E4 closure, review in_progress 32844166958).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will Review at 2689d91 approve the honest-closure ledger (dual-unit FAIL restated, all rejections evidence-cited, no parity claim, branch MERGEABLE, docs preserved)?
- After review+test, will owner lift freeze to allow ledger merge, or direct #130 closed without PR merge (ledger stays on branch for record)?
- Does `.agent/decision.json` stale `build` need correction to `review`/`complete` in next slice, or is review dispatch sufficient?
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
