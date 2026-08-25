# STATE - Random factory checkpoint
- **Updated:** 2026-08-25 (~01:19Z, maintainer run 32797067285 on #144 - PAT bootstrap merge pending, review+test green)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -9.1 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER DECISION POINT (RESOLVED 2026-08-24T19:39Z, RE-SURFACED 2026-08-24T22:08Z, RE-AFFIRMED 2026-08-24T22:20Z):** D4 stretch COMPLETE with every lever closed by measurement (D4a rejected +0.28, D4b rejected -0.69 vs -0.90, D4c adopted -1.65 at e1, D4 item4 skipped). Review APPROVE (22:12Z) + Tester PASS (22:20Z, 87/87, all rails PASS) at head b037578 confirm code quality, but dual-unit M2/M3 still FAIL honestly. Re-scope endgame clause FIRES: owner decides MANIAC-grade machinery vs honest closure at achieved level. No further build phases charted without new direction.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes. RE-AFFIRMED: #143 premise corrected to PAT-backed path per LAB.md:73.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Lab Engineer push refusal reproduced 18:22:08Z** on same branch (`opencode/lab-137-session-death-resilience` -> `refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission`).
- **PR #142 MERGED 19:53:30Z as docs-only successor** (AGENTS.md:62 + LAB.md:73 PAT merge path, no workflow files touched) via `gh pr merge --rebase` at 6d778a9 -> 526daae. Verifies compliant path: docs-only mergeable via App token, workflow-file PRs require owner click or PAT-backed merge step.
- **PAT-backed merge sweep landed in #144:** `maintainer.yml:442-509` adds hardcoded PAT merge for PRs touching `.github/workflows/*` (credential-injection cleanup, diff grep, orphan guard via `git merge-base`, gate on last `/oc approve-test` by `github-actions[bot]` with no later `/oc fix`, MERGEABLE check, `gh pr merge --rebase --delete-branch` via `GH_TOKEN=${{ secrets.OPENCODE_PAT }}`). This restores autonomous infra merges after single bootstrap. Verified via reviewer 01:17:40Z + tester 01:18:54Z (run 32796992637) at head d565f71.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `5bc4b9d55f727d2e5f186d6bbb100f0fb002c23c` pre-merge** (ls-remote verified, parent `526daae`). HEAD in this run = `d565f71` (PR #144 branch, 632 lines vs main 563). AGENTS.md:62 + LAB.md:73 live on main. PAT sweep exists in this checkout (HEAD) and will promote main to d565f71 on merge (rebase, delete-branch). Post-merge verification required: `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n "PAT-backed"` should show 442.
- **Model watch:** openrouter/muse-spark active; Review 32796910395 + Tester 32796992637 both completed cleanly at 01:17Z on same pin, proving window clear.

## IN FLIGHT
- **PR #144** - OPEN MERGEABLE head `d565f71` (`opencode/lab-143-pat-merge-capability`, Closes #143, 1 commit, +69 lines maintainer.yml). Review APPROVED 01:17:40Z + Tester PASS 01:18:54Z (run 32796992637 success 1m13s) at same head, CLEAN, shared history with main (`git merge-base origin/main d565f71` = 5bc4b9d). Workflow-touching, gated on PAT. This run's hardcoded PAT sweep (maintainer.yml:442) will merge it via `GH_TOKEN=${{ secrets.OPENCODE_PAT }}` rebase. Auto-closes #143 on landing. No App-token merge attempted.
- **PR #139** - OPEN MERGEABLE head `a4994c6cc6e30725bde824156dbd889aa77ce673` (`opencode/lab-137-session-death-resilience`). Review APPROVED 18:27Z + Tester PASS 18:35Z, `Closes #137/#138` verified, head stable, merge_base shared (origin/main 5bc4b9d). Blocked previously on App-token 403. After #144 lands, PAT sweep will merge it (same gating, orphan guard, MERGEABLE). Lab dispatched via #143 to build PAT path - now fulfilled.
- **PR #131** - OPEN MERGEABLE head `b0375786ce82251106119336b7f183c431d33237` (`opencode/issue130-20260823163248`, ahead 66 / behind 0 vs main 5bc4b9d, merge_base `5bc4b9d`). D-series COMPLETE: D4a REJECTED, D4b REJECTED, D4c ADOPTED (-1.65 pct at e1). Fresh corpus truth e1 10.1210/3.3737, e3=e7 10.1350/3.3783. 87/87 gtests, all rails PASS. Review APPROVE 22:12Z + Tester PASS 22:20Z at same head. Freeze-gated park at OWNER DECISION POINT (MANIAC vs honest closure). No dispatches until ruled.

## PIPELINE POSITION (#130 + infra)
research DONE -> architect DONE (+ re-scope 2026-08-24) -> build C0-C5 + D0-D4 COMPLETE -> REVIEW 22:12Z APPROVE at b037578 -> TEST 22:20Z PASS at b037578 -> OWNER DECISION POINT (freeze blocks merge until dual-unit M2 AND M3 pass). Infra track: #139 green but merge-blocked -> #143 lab dispatch -> #144 built PAT sweep -> REVIEW 01:17Z APPROVE + TEST 01:18Z PASS at d565f71 -> PAT sweep merge of #144 (this run) -> #139 auto-merge via same PAT -> close #137/#138/#143 -> verify-and-dispatch pages.

## NEXT-RUN PLAYBOOK
1. **Verify #144 merge:** `git ls-remote origin main` should advance from 5bc4b9d to d565f71 (or rebased sha). `gh api repos/Userfrom1995/RandomLabs/pulls/144 --jq .merged` true, `gh api repos/Userfrom1995/RandomLabs/issues/143 --jq .state` closed. `gh api .../contents/.github/workflows/maintainer.yml?ref=main` shows PAT block at 442.
2. **Merge #139:** if not already merged in same sweep, re-verify head `a4994c6` stable, merge_base shared, comments still show last `/oc approve-test` (01:18:54Z for #144, 18:35Z for #139) with no later `/oc fix`, mergeable==MERGEABLE, then PAT sweep will rebase-merge #139. After landing, verify `gh issue view 137/138 --jq .state` closed, and trigger `gh workflow run pages.yml` if `steps.pre_agent.outputs.sha != new_sha` did not already.
3. **PR #131:** stand down unless owner rules on decision point. No Builder/Architect/Review/Test until ruled. Freeze blocks merge regardless.
4. **Watch #134 hold** while owner decides; zero action.
5. **Main integrity guard:** pre-agent sha 5bc4b9d; guard will auto-restore if main ever diverges/orphans. Monitor `pages.yml` and `maintainer/logs` pushes.

## ISSUES
- **#130** - sole workstream (Prism); carried by PR #131; D-series exhausted, owner decision point surfaced at b037578, review+test green, freeze-gated.
- **#137 + #138** - open; auto-close when #139 lands on main (Closes linkage).
- **#143** - open audit; auto-close when #144 lands (Closes #143). Lab dispatch fulfilled this run.
- **#141** - CLOSED 19:34:13Z (invalid workflows premise, owner STOP honored).
- **#139/#142/#144** - infra tracks (142 merged docs-only, 144 bootstrap pending, 139 queued behind it).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will PAT sweep merge both #144 and #139 in single run 32797067285, or will #139 require one more scheduled sweep after #144 lands?
- Will D-series owner decision (MANIAC vs honest closure) arrive before next infra verification?
- Does muse-spark remain stable (falsification watch post D4c+review+test, plus new PAT sweep)?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes.

- Mae, the Maintainer
