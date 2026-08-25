# STATE - Random factory checkpoint
- **Updated:** 2026-08-25 (~08:12Z, issue_comment maintainer run 32825400821 on #131 - PR CLOSED, recover dispatched)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -9.1 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER MANIAC DIRECTIVE (2026-08-25T08:01:41Z, on #131 - DIRECTS RESUMPTION):** continue MANIAC until target results are achieved regardless of architectural/design change magnitude. Try everything - research new approaches, experiment with different architectures, redesign components when necessary, keep iterating and benchmarking until target. Recorded as standing instruction: we do not stop working on this project until we achieve the target results. Supersedes the prior OWNER DECISION POINT park (RESOLVED 2026-08-24T19:39Z, ANSWERED 2026-08-25T07:31Z) which had paused dispatches pending ruling. D4 stretch COMPLETE was the park point; now RESEARCH resumes. **Retry note 08:06Z:** same directive, first research attempt (32824762955, 08:04:41Z) died to transient `Endpoint is unavailable` - retry dispatched 08:06Z per ladder (once, then lab escalation).
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes. RE-AFFIRMED: #143 premise corrected to PAT-backed path per LAB.md:73 (now closed via #144 merge).
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Lab Engineer push refusal reproduced 18:22:08Z** on same branch (`opencode/lab-137-session-death-resilience` -> `refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission`).
- **PR #142 MERGED 19:53:30Z as docs-only successor** (AGENTS.md:62 + LAB.md:73 PAT merge path, no workflow files touched) via `gh pr merge --rebase` at 6d778a9 -> 526daae.
- **PAT-backed merge sweep LIVE ON MAIN as of 2026-08-25T07:50Z:** `maintainer.yml:442-509` in `main` at `9cebba3` now contains the hardcoded PAT merge for workflow-touching PRs (credential-injection cleanup, diff grep, orphan guard via `git merge-base`, gate on last `/oc approve-test` by `github-actions[bot]` with no later `/oc fix`, MERGEABLE check, `gh pr merge --rebase --delete-branch` via `GH_TOKEN=${{ secrets.OPENCODE_PAT }}`). Post-agent hardcoded step executes the sweep. Updated main now `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` after PR #139 merge (08:10:21Z) - sweep still at 442, 636 lines.
- **Bootstrap COMPLETE:** owner merged #144 via UI/PAT at 07:50Z (`9cebba3 lab: restore PAT-backed merge for workflow-touching PRs (Fixes #143)`, parents [5bc4b9d]). Closes #143 auto-closed (state CLOSED). PAT sweep auto-merged #139 at 08:10:21Z to `c4c3f5f` (4 commits: crash-parity, approval sweep, metadata guards, lab PR title/body) - verified via `gh api pulls/139 --jq .merged` true and `git ls-remote origin main` c4c3f5f, deployed via push run 32825255821.
- **Shallow-clone caveat resolved:** sweep now has full history; `git merge-base origin/main origin/opencode/lab-137...` succeeds (was shallow-skip 08:04Z), diff correctly shows 5 workflow files.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `c4c3f5f59d3387fb1820bcc34a757e39cfdb15e5` LIVE** (ls-remote verified 08:12Z, `gh api pulls/139 --jq .merged` true, `gh api pulls/144 --jq .merged` true, `gh api issues/143 --jq .state` closed, `gh api issues/137 --jq .state` closed, `gh api issues/138 --jq .state` closed after #139 merge). HEAD on main = `c4c3f5f` (lab: convert recover approval steps...). Verify: `gh api .../contents/.github/workflows/maintainer.yml?ref=main | grep -n "PAT-backed"` = 442, `wc -l` ~636.
- **Model watch:** openrouter/muse-spark active; previous review+test at 01:17Z clean. Provider transient `Endpoint is unavailable` hit research at 08:06:30Z (run 32824762955) - same model, isolated window; one retry dispatched (32825245616 pending) and second dispatch 32825400771 pending on main head due to closed PR - both will be superseded by recovered PR; second strike would still escalate to lab per ladder.

## IN FLIGHT
- **PR #139** - MERGED 08:10:21Z at `c4c3f5f` via PAT sweep (rebase, branch deleted). Closes #137/#138 auto-closed. No further action.
- **PR #131** - CLOSED (not merged) at 08:10:23Z by Userfrom1995 (API: `state: closed`, `merged: false`, `closed_by: Userfrom1995`, `closed_at: 2026-08-25T08:10:23Z`, head `b0375786ce82251106119336b7f183c431d33237`, branch `opencode/issue130-20260823163248` still exists at same sha, tag `recover/131` same sha). 66 commits of Prism work unmerged (D-series COMPLETE, D4c ADOPTED -1.65%, 87/87 gtests, review APPROVE 22:12Z + Tester PASS 22:20Z at same head, corpus e1 10.1210/3.3737, e3=e7 10.1350/3.3783, ~16.9% above parity). Merge-base with current main `c4c3f5f` is `5bc4b9d` (shared history, not orphan but diverged by 4 commits on main + 66 on branch). **RECOVER DISPATCHED 08:12Z via `{"action":"recover","pr":131}`** - opencode-recover will restore from `recover/131` and re-link onto `c4c3f5f` via cherry-pick, opening continuation PR for existing work only. Auto-detect recover at 08:10:23Z had skipped (in_progress runs 32825255443 skipped), so manual dispatch ensures it.
- **Research runs:** 32825245616 in_progress and 32825400771 pending (both `opencode` on `main` head after PR closed) - parked / will be superseded; fresh MANIAC research will be re-dispatched on the recovered PR once it is OPEN/MERGEABLE.

## PIPELINE POSITION (#130 + infra)
research DONE -> architect DONE (+ re-scope 2026-08-24) -> build C0-C5 + D0-D4 COMPLETE -> REVIEW 22:12Z APPROVE at b037578 -> TEST 22:20Z PASS at b037578 -> OWNER DECISION POINT -> **OWNER RULED MANIAC 08:01Z** -> **RESEARCH DISPATCHED 08:04Z (failed endpoint unavailable 08:06:30Z -> retry 08:06Z)** -> **PR #131 CLOSED 08:10:23Z (not merged, accidental close 2s after #139 merge, branch retained)** -> **RECOVER DISPATCHED 08:12Z on PR #131** -> (next: recover completes -> research on continuation PR -> architect -> builder). Infra track: #139 green but merge-blocked (403) -> #143 lab dispatch -> #144 built PAT sweep -> REVIEW 01:17Z APPROVE + TEST 01:18Z PASS at d565f71 -> **MERGED 07:50Z to main 9cebba3 (Closes #143)** -> **PAT sweep MERGED #139 at 08:10:21Z to c4c3f5f (Closes #137/#138)** -> Pages deploy via push run 32825255821.

## NEXT-RUN PLAYBOOK
1. **Verify recovery:** after opencode-recover run, `gh api pulls/<new> --jq .state` OPEN, `gh api pulls/131 --jq .state` remains closed (old PR), `git ls-remote origin --tags | grep recover/131` still b037578, `gh api repos/.../pulls --paginate | grep opencode/issue130` shows new continuation PR OPEN with head re-linked onto `c4c3f5f` (verify `git merge-base origin/main <new-head>` succeeds and equals `c4c3f5f` or its parent, not empty), MERGEABLE/CLEAN, branch `opencode/issue130-*` exists. If recovery PR not yet open, next schedule's auto-detect should catch it - do not fire duplicate recover if one is already in_progress.
2. **Re-dispatch MANIAC research on recovered PR:** once continuation is OPEN, dispatch `{"action":"research","pr":<new>}` for MANIAC gap re-derivation (same scope as 08:01Z: entropy families, meta-adaptive structures, pipeline surgery, harness I7 brackets, both-unit gates). If the pending research runs on main (32825245616/32825400771) completed with zero commits, ignore; if the new research dies with same `Endpoint is unavailable` / `finish_reason: network_error`, escalate to Lab Engineer via `lab` with both run IDs - no third blind fire.
3. **PR #131 continuation:** freeze still blocks merge until dual-unit M2 AND M3 pass (10.1210/3.3737 vs 9.498/3.166). Owner MANIAC overrides park - keep iterating. No ideate (board frozen).
4. **Verify #139 closure side-effects:** `gh api issues/137 --jq .state` closed, `138` closed, `gh workflow run pages.yml` if needed (push deploy already succeeded at 08:10:23Z). No action on #134 hold.
5. **Main integrity guard:** pre-agent sha c4c3f5f; PAT sweep live - guard auto-restores if main ever diverges/orphans.

## ISSUES
- **#130** - sole workstream (Prism); carried by PR #131 branch (now recovering to continuation); D-series exhausted, MANIAC research queued for recovered PR. Dual-unit M2/M3 still FAIL (10.1210/3.3737 vs required), ~16.9 pct above parity.
- **#137 + #138** - CLOSED 2026-08-25T08:10:21Z via #139 merge (Closes linkage).
- **#143** - CLOSED 2026-08-25T07:50Z via #144 merge.
- **#144** - MERGED 2026-08-25T07:50Z to main 9cebba3.
- **#139** - MERGED 2026-08-25T08:10:21Z to main c4c3f5f.
- **#131 (PR)** - CLOSED 08:10:23Z not merged; pending recover to continuation PR (branch + tag retained at b037578, merge_base 5bc4b9d).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive (Prism priority until parity).

## OPEN QUESTIONS
- Will recover of PR #131 succeed in one cycle (cherry-pick onto c4c3f5f) or require manual re-link due to behind-by-4 divergence?
- Will the re-dispatched MANIAC research on the continuation produce genuinely new levers, or reveal that deeper architectural surgery is required?
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
- Recover tag `recover/<pr>` is the ground truth for closed-but-advancing branches; orphan check is `git merge-base origin/main <pr-head>` after full fetch.

- Mae, the Maintainer
