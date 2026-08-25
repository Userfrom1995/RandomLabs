# STATE - Random factory checkpoint
- **Updated:** 2026-08-25 (~08:06Z, issue_comment maintainer run 32824929558 on #131 - research provider failure, retry dispatched)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -9.1 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER MANIAC DIRECTIVE (2026-08-25T08:01:41Z, on #131 - DIRECTS RESUMPTION):** continue MANIAC until target results are achieved regardless of architectural/design change magnitude. Try everything - research new approaches, experiment with different architectures, redesign components when necessary, keep iterating and benchmarking until target. Recorded as standing instruction: we do not stop working on this project until we achieve the target results. Supersedes the prior OWNER DECISION POINT park (RESOLVED 2026-08-24T19:39Z, ANSWERED 2026-08-25T07:31Z) which had paused dispatches pending ruling. D4 stretch COMPLETE was the park point; now RESEARCH resumes. **Retry note 08:06Z:** same directive, first research attempt (32824762955, 08:04:41Z) died to transient `Endpoint is unavailable` - retry dispatched this run per ladder (once, then lab escalation).
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes. RE-AFFIRMED: #143 premise corrected to PAT-backed path per LAB.md:73 (now closed via #144 merge).
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Lab Engineer push refusal reproduced 18:22:08Z** on same branch (`opencode/lab-137-session-death-resilience` -> `refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission`).
- **PR #142 MERGED 19:53:30Z as docs-only successor** (AGENTS.md:62 + LAB.md:73 PAT merge path, no workflow files touched) via `gh pr merge --rebase` at 6d778a9 -> 526daae.
- **PAT-backed merge sweep LIVE ON MAIN as of 2026-08-25T07:50Z:** `maintainer.yml:442-509` in `main` at `9cebba3` now contains the hardcoded PAT merge for workflow-touching PRs (credential-injection cleanup, diff grep, orphan guard via `git merge-base`, gate on last `/oc approve-test` by `github-actions[bot]` with no later `/oc fix`, MERGEABLE check, `gh pr merge --rebase --delete-branch` via `GH_TOKEN=${{ secrets.OPENCODE_PAT }}`). Verified live this run: `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n "PAT-backed"` = 442, `wc -l` = 632 (was 563). Post-agent hardcoded step executes the sweep.
- **Bootstrap COMPLETE:** owner merged #144 via UI/PAT at 07:50Z (`9cebba3 lab: restore PAT-backed merge for workflow-touching PRs (Fixes #143)`, parents [5bc4b9d]). Closes #143 auto-closed (state CLOSED). After bootstrap, PAT sweep auto-merges #139 on this or next sweep (verified via push event run 32823548928 deploy success 07:50:46Z, branch opencode/lab-143-pat-merge-capability deleted).
- **Shallow-clone caveat observed 08:04Z:** sweep in run 32824509098 evaluated PR #139 as `does not touch workflows` due to `git merge-base` failure in shallow checkout (`origin/main...origin/opencode/lab-137-session-death-resilience: no merge base`). Verified after `git fetch --unshallow`: diff correctly shows 5 workflow files plus AGENTS.md/LAB.md, merge_base aa94ae4 shared. Next sweep with fuller history will merge; if not, next schedule will.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9cebba3a050c787c1719d91bc9086046e24d85c0` LIVE** (ls-remote verified 08:06Z, `gh api pulls/144 --jq .merged` true, `gh api issues/143 --jq .state` closed). HEAD on main = 632 lines with PAT sweep. PR #144 branch deleted. Verify: `gh api .../pulls/144 --jq .merged` true, `grep -n "PAT-backed"` on main shows 442.
- **Model watch:** openrouter/muse-spark active; previous review+test at 01:17Z clean. Provider transient `Endpoint is unavailable` hit research at 08:06:30Z (run 32824762955) - same model, isolated window; one retry dispatched, second strike would escalate to lab per ladder.

## IN FLIGHT
- **PR #139** - OPEN CLEAN head `a4994c6cc6e30725bde824156dbd889aa77ce673` (`opencode/lab-137-session-death-resilience`, base 9cebba3, Closes #137/#138). Review APPROVED 18:27:11Z + Tester PASS 18:35:27Z at same head, CLEAN, shared history (`git merge-base origin/main a4994c6` succeeds after unshallow). Workflow-touching (5 files), gated on PAT. Last sweep skipped due to shallow diff; will rebase-merge via `GH_TOKEN=${{ secrets.OPENCODE_PAT }}` on this or next schedule; orphan guard passes, MERGEABLE, last approve-test with no later fix.
- **PR #131** - OPEN CLEAN head `b0375786ce82251106119336b7f183c431d33237` (`opencode/issue130-20260823163248`, ahead 66 / behind 1 vs main 9cebba3, merge_base `5bc4b9d` chain, CLEAN). D-series COMPLETE: D4a REJECTED, D4b REJECTED, D4c ADOPTED (-1.65 pct at e1). Fresh corpus truth e1 10.1210/3.3737, e3=e7 10.1350/3.3783. 87/87 gtests, all rails PASS. Review APPROVE 22:12Z + Tester PASS 22:20Z at same head. Freeze still gates merge until dual-unit M2 AND M3 pass. **RESEARCH RE-DISPATCHED 08:04Z (failed endpoint unavailable 08:06:30Z, 0 commits) -> RE-RE-DISPATCHED 08:06Z (this run, one retry)** - Architect will translate research into next blueprint after it lands.

## PIPELINE POSITION (#130 + infra)
research DONE -> architect DONE (+ re-scope 2026-08-24) -> build C0-C5 + D0-D4 COMPLETE -> REVIEW 22:12Z APPROVE at b037578 -> TEST 22:20Z PASS at b037578 -> OWNER DECISION POINT -> **OWNER RULED MANIAC 08:01Z** -> **RESEARCH DISPATCHED 08:05Z (failed provider endpoint unavailable 08:06:30Z, 0 commits -> retry)** -> **RESEARCH RETRY DISPATCHED 08:06Z on PR #131 (MANIAC phase)** -> architect -> builder. Infra track: #139 green but merge-blocked (403) -> #143 lab dispatch -> #144 built PAT sweep -> REVIEW 01:17Z APPROVE + TEST 01:18Z PASS at d565f71 -> **MERGED 07:50Z to main 9cebba3 via owner bootstrap (Closes #143)** -> PAT sweep live -> **#139 queued for PAT rebase-merge this/next sweep (shallow-skip 08:04Z noted)** -> close #137/#138 -> verify-and-dispatch pages.

## NEXT-RUN PLAYBOOK
1. **Verify #139 merge:** after this run's PAT sweep, `gh api repos/Userfrom1995/RandomLabs/pulls/139 --jq .merged` should be true, `gh api repos/Userfrom1995/RandomLabs/issues/137 --jq .state` and `138` closed, `git ls-remote origin main` advances past 9cebba3 if #139 lands, then trigger `gh workflow run pages.yml` if pre sha != new sha. If #139 still open (shallow ordering), next scheduled sweep will merge it - do not re-dispatch lab/fix/continue on it (infra guard). Verify via `git diff --name-only origin/main...origin/opencode/lab-137-session-death-resilience` and `git merge-base` after unshallow fetch.
2. **PR #131 MANIAC research:** watch research retry on PR #131 (run after 08:06Z, model muse-spark). Verify it respects MANIAC directive - new approaches, architectural redesigns, continuous benchmarking, no premature parity claims, harness-citable numbers (I7) with both-unit gates. On completion, dispatch Architect to blueprint the findings before Builder resumes. If retry dies with same `Endpoint is unavailable` / provider stream error, escalate to Lab Engineer via `lab` with both run IDs (32824762955 + new) - no third blind fire. Do NOT dispatch review/test until the post-research build slice lands.
3. **PR #131:** freeze still blocks merge until dual-unit M2 AND M3 pass (10.1210/3.3737 vs 9.498/3.166). Owner MANIAC directive explicitly overrides park - keep iterating. No ideate (board frozen).
4. **Watch #134 hold** while owner decides; zero action.
5. **Main integrity guard:** pre-agent sha 9cebba3; PAT sweep live - guard will auto-restore if main ever diverges/orphans. Monitor `pages.yml` and `maintainer/logs` pushes.

## ISSUES
- **#130** - sole workstream (Prism); carried by PR #131; D-series exhausted, MANIAC research retry 08:06Z per provider retry ladder. Dual-unit M2/M3 still FAIL (10.1210/3.3737 vs required), ~16.9 pct above parity.
- **#137 + #138** - open; auto-close when #139 lands via PAT sweep (Closes linkage).
- **#143** - CLOSED 2026-08-25T07:50Z via #144 rebase merge (Closes #143).
- **#144** - MERGED 2026-08-25T07:50Z to main 9cebba3 (PAT capability restored).
- **#141** - CLOSED 19:34:13Z (invalid workflows premise, owner STOP honored).
- **#139** - infra track, queued for PAT merge (shallow-skip 08:04Z, retry next sweep).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will PAT sweep in this run (32824929558) merge PR #139, or require one additional unshallow fetch cycle?
- Will the retried MANIAC research (second attempt after endpoint unavailable) produce genuinely new levers, or reveal that deeper architectural surgery is required?
- Does muse-spark endpoint instability recur (second strike would trigger lab escalation with run IDs)?
- Will #134 draft be kept or closed after MANIAC produces new architecture?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - a PR-branch-only workflow change cannot execute until that branch is merged to main (bootstrap paradox).

- Mae, the Maintainer
