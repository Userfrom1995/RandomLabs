# STATE - Random factory checkpoint
- **Updated:** 2026-08-25 (~11:34Z, maintainer run 32842466207 - issue_comment on PR #131, duplicate quiet watch Builder E1 mid-slice)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -8.21 pct bytes vs e7 baseline (11.026 / 3.675) after arithmetic correction in E-series research (was -9.1, derivation stamped in research doc).
- **OWNER MANIAC DIRECTIVE (2026-08-25T08:01:41Z, on #131 - DIRECTS RESUMPTION):** continue MANIAC until target results are achieved regardless of architectural/design change magnitude. Try everything - research new approaches, experiment with different architectures, redesign components when necessary, keep iterating and benchmarking until target. Recorded as standing instruction: we do not stop working on this project until we achieve the target results. Supersedes the prior OWNER DECISION POINT park (RESOLVED 2026-08-24T19:39Z, ANSWERED 2026-08-25T07:31Z) which had paused dispatches pending ruling. D4 stretch COMPLETE was the park point; now E-series RESEARCH->ARCHITECT DONE, E0 COMPLETE, E1 in flight.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes. RE-AFFIRMED: #143 premise corrected to PAT-backed path per LAB.md:73 (now closed via #144 merge).
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Lab Engineer push refusal reproduced 18:22:08Z** on same branch (`opencode/lab-137-session-death-resilience` -> `refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission`).
- **PR #142 MERGED 19:53:30Z as docs-only successor** (AGENTS.md:62 + LAB.md:73 PAT merge path, no workflow files touched) via `gh pr merge --rebase` at 6d778a9 -> 526daae.
- **PAT-backed merge sweep LIVE ON MAIN as of 2026-08-25T07:50Z:** `maintainer.yml:442-509` in `main` at `9cebba3` now contains the hardcoded PAT merge for workflow-touching PRs (credential-injection cleanup, diff grep, orphan guard via `git merge-base`, gate on last `/oc approve-test` by `github-actions[bot]` with no later `/oc fix`, MERGEABLE check, `gh pr merge --rebase --delete-branch` via `GH_TOKEN=${{ secrets.OPENCODE_PAT }}`). Post-agent hardcoded step executes the sweep. Updated main now `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` after PR #139 merge (08:10:21Z) - sweep still at 442, 632 lines.
- **Bootstrap COMPLETE:** owner merged #144 via UI/PAT at 07:50Z (`9cebba3 lab: restore PAT-backed merge for workflow-touching PRs (Fixes #143)`, parents [5bc4b9d]). Closes #143 auto-closed (state CLOSED). PAT sweep auto-merged #139 at 08:10:21Z to `c4c3f5f` (4 commits: crash-parity, approval sweep, metadata guards, lab PR title/body) - verified via `gh api pulls/139 --jq .merged` true and `git ls-remote origin main` c4c3f5f, deployed via push run 32825255821.
- **Shallow-clone caveat resolved:** sweep now has full history; `git merge-base origin/main origin/opencode/lab-137...` succeeds (was shallow-skip 08:04Z), diff correctly shows 5 workflow files.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` LIVE** (ls-remote verified 11:34Z, `gh api pulls/139 --jq .merged` true, `gh api pulls/144 --jq .merged` true, `gh api issues/143 --jq .state` closed). HEAD on main = `c4c3f5f` (lab: convert recover approval steps...). Verify: `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n "PAT-backed"` = 442, `wc -l` ~632.
- **Model watch:** openrouter/muse-spark active; E0 success at 10:28Z to b3ae1c6; E1 harness slice pushed 2 commits to e01c107 (cd8ceb9 spec addendum 16 + e01c107 --bias mode, 98/98 green, fuzz PASS) via owning run 32837686618 started 10:31:53Z. Run still in_progress at 11:34Z (~62m, build job since 10:32:05Z, log pending). No Endpoint error at survey; pr-trigger 32842221754 + pages 32842221697 success on e01c107 at 11:25Z. Prior transient at 08:44:37Z (AI_APICallError Endpoint is unavailable x2 on 32828171812) was single strike cleared by auto-retry; this session healthy so far.

## IN FLIGHT
- **PR #131** - OPEN CLEAN head `e01c107341f46e9e04189d755a814af8bb1a11b4` (`opencode/issue130-20260823163248`, 80 commits, 78 ahead + 2 E1 harness since b3ae1c6 / 0 behind main `c4c3f5f`, merge_base `c4c3f5f` shared, MERGEABLE/CLEAN). 80 commits (D-series 66 + recover 1 + E-series 13: research 3 + architect 2 + E0 6 + E1 2). E-series research DONE + Architect E-series DONE + **E0 COMPLETE at b3ae1c6** (A=0.073/MC FAIL/B_coarse -0.91, named row "M-C fails AND A < 1.5") + **BUILDER E1 IN_PROGRESS run 32837686618** (BIAS-fmt gated, spec addendum 16 + BiasModel lib 11 tests + --bias harness BIAS-anchor/BIAS-fmt gates, 98/98 green, harness landed at e01c107, no format wiring yet, verdict pending). Handoff at head = `{"action":"build"}` pending E1 scoring wire/close. Do not re-dispatch until this run completes or fails with verified push/no-push.
- **Other runs:** this maintainer run 32842466207 issue_comment on PR #131 (duplicate of 32842450943); sibling opencode 32842466240 pending behind owning pipeline will self-skip; pr-trigger/pages success 11:25Z on e01c107; recover schedule success 32842426159 at 11:28Z; prior maintainer 32842450943 success 11:33:49Z with `[]` stand-down for same build.
- **PR #139 / #144** - MERGED (see above). No open infra PRs.

## PIPELINE POSITION (#130 + infra)
research E-series DONE (2026-08-25T08:28Z) -> architect E-series DONE (2026-08-25T08:39Z) -> **E0 COMPLETE at b3ae1c6 (2026-08-25T10:28Z, 6 commits incl status header, binding verdicts)** -> **BUILDER E1 IN_PROGRESS at e01c107 (32837686618, ~62m at 11:34Z, 2 commits pushed, BIAS-fmt harness landed, gate >=1.5 points bracket drop pending; format wiring only behind never-expand per-plane trial if pass, else honest closure per named row)** -> (next: verify E1 run conclusion - head advances past e01c107 if BIAS-fmt passes and format wires, else stays with gate-FAIL recorded; gtests/fuzz, both-unit bench if wired -> review round -> test -> maintainer). Infra track: #139/#144 MERGED to c4c3f5f (PAT sweep live). Owner MANIAC continues; freeze blocks merge until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. **Verify Builder E1:** after opencode build run 32837686618 completes, `gh api pulls/131 --jq .head.sha` should advance past e01c107 if E1 passes its BIAS-fmt gate (aggregate bracket drop >=1.5 points, no mixed sign) and wires per-plane bias via never-expand trial, otherwise head stays at e01c107 with gate-FAIL and honest closure per tree row "M-C fails AND A < 1.5" (everything rides on E1). Check `progress/` E1 checklist gate verdict, `gh pr view 131 --json mergeable_state` CLEAN, `git log --oneline origin/opencode/issue130-20260823163248 -n 5` for builder commits, gtests/fuzz PASS. If run hits `Endpoint is unavailable` / `AI_APICallError`, second consecutive model failure after 08:44Z -> escalate to Lab Engineer via `{"action":"lab"}` per ladder (check `curl -s https://opencode.ai/zen/v1/models` for next best free, update `.github/workflows/*.yml` model + `opencode.json` model/small_model). If honest gate FAIL, respect closure - no re-try of dead lever.
2. **Re-dispatch research/architect only if Builder E1 demands re-scope or MANIAC lever asks:** otherwise continue per decision tree. Review/Test take next format boundary after E1 verdict.
3. **PR #131 merge freeze:** still blocks merge until dual-unit M2 AND M3 pass (10.1210/3.3737 vs 9.498/3.166). Owner MANIAC overrides park - keep iterating or close honestly per tree row if E1 fails. No ideate (board frozen).
4. **Verify no duplicate maintainer triggers:** this duplicate run 32842466207 stood down with empty decision while build 32837686618 still running ~62m; next run should not fire duplicate build if still in_progress (check `gh api actions/runs/32837686618 --jq .status` in_progress vs completed).
5. **Main integrity guard:** pre-agent sha c4c3f5f; PAT sweep live - guard auto-restores if main ever diverges/orphans.

## ISSUES
- **#130** - sole workstream (Prism); carried by PR #131 branch `opencode/issue130-20260823163248` head e01c107 (80 ahead, 2 since E0), E-series research+architect DONE, E0 COMPLETE (A=0.073/MC FAIL/B_coarse -0.91, named row "M-C fails AND A < 1.5"), builder E1 in_progress (32837686618, ~62m at 11:34Z, 2 harness commits landed). Dual-unit M2/M3 still FAIL (10.1210/3.3737 vs required), ~16.9 pct above parity.
- **#137 + #138** - CLOSED 2026-08-25T08:10:21Z via #139 merge (Closes linkage).
- **#143** - CLOSED 2026-08-25T07:50Z via #144 merge.
- **#144** - MERGED 2026-08-25T07:50Z to main 9cebba3.
- **#139** - MERGED 2026-08-25T08:10:21Z to main c4c3f5f.
- **#131 (PR)** - OPEN CLEAN head e01c107 (80 ahead / 0 behind c4c3f5f, merge_base c4c3f5f, E1 harness 98/98 landed, build in_progress 32837686618).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will Builder E1 run 32837686618 complete its BIAS-fmt scoring (biasoff/bias/biasgain) and pass the >=1.5 point bracket gate, or record honest FAIL and trigger closure per the named row?
- If E1 fails, will owner accept honest closure at achieved level or direct a new MANIAC research outside current binarization?
- Does muse-spark remain stable for the remainder of E1, or will Endpoint-transient recur (second strike triggers lab escalation per ladder)?
- Will #134 draft be kept or closed after E-series final verdict?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes.
- GitHub Actions workflow definition is resolved from `main` for schedule/issue_comment triggers - a PR-branch-only workflow change cannot execute until that branch is merged to main (bootstrap paradox).
- Recover tag `recover/<pr>` is the ground truth for closed-but-advancing branches; orphan check is `git merge-base origin/main <pr-head>` after full fetch.

- Mae, the Maintainer
