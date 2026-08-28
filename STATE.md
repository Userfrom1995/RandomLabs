# STATE - Random factory checkpoint
 - **Updated:** 2026-08-28T23:49Z, maintainer run 33221624626 (event `created` on PR #166, owner `/oc maintainer` + `/oc test`)
 - **Correction vs prior log 33221528011:** prior claimed PR #166 head cf8f609 (progress-only local commit) - verified via `git ls-remote origin opencode/issue130-20260828230523` and `gh pr view --json headRefOid` that remote head remains `279a79232fd847e5e08c6114235e5d4b6d17b9b9` (1 commit, 13 files). cf8f609 was never pushed; current truth is 279a792 (Reviewer approved this exact SHA).

## STANDING OWNER DIRECTIVES (active)
- **ANTI-SURRENDER + NO-PAUSE MANDATE (2026-08-27 01:30 IST via 2bd51b, codified at d31f9b0):** Hephaestus succeeds Mae. Never surrender a target. Version-by-version escalation until gates shatter. Only Owner can halt/cancel a gated project. Autonomous multi-path exploration with no-pause.
- **EXOTIC BEYOND-PREDICTIVE (2026-08-28T06:24:38Z directive on #130, /oc maintainer):** Owner orders: "Continue work on #130. Single-pipeline predictive coding is exhausted, so proceed with Option 2 (Exotic Beyond-Predictive Paradigm). Dispatch Dr. Mob to research learned neural context models or integer wavelet lifting with bitplane ANS coding. The squad has been upgraded to hy3-free for implementers and mimo-v2.5-free for orchestrators and reviewers." - ACTIVE, X0+X1+X2 MERGED, X3a PR #166 REVIEW-APPROVED awaiting Tester.
- **PRISM CASCADE 3->1->2 (2026-08-27T08:19:10Z directive on #130):** FULLY MEASURED, FAILED AND MERGED. Route 3 R1 FAIL +194.22% MERGED at 26d51c4 (PR #157). Route 1 R1-1 FAIL +2.27% MERGED at 86606d3 (PR #160). Route 2 R2-0 11/11 MERGED at f43e646 (PR #161) + R2-1 FAIL +1.80% best MERGED at dd559f4 (PR #162). All single-pipeline mechanism classes rejected per 7 programs/28 phases + 3 routes. Ledger preserved on main.
- **RETAIN-BRANCHES DIRECTIVE (2026-08-26T18:47Z, issue #148):** PR branches must never be deleted after merging. Branches retained: `opencode/issue130-20260828063310` (PR #163), `opencode/issue130-20260828112220` (PR #164), `opencode/issue130-20260828122050` (PR #165), `opencode/issue130-20260828230523` (PR #166 OPEN at 279a792).
- **BINDING TARGET (dual-unit, unchanged):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl -d0 -e9 on exact Kodak PPMs. No merge until M2 AND M3 pass both units; no success claim without fresh both-units measurement. Milestones merge with `Refs #130` until gates pass. Honest closure e1 10.1210/3.3737 preserved, all FAIL ledgers on main.
- **MODEL PINS (df97c5f):** implementers `hy3-free`, orchestrators/reviewers `mimo-v2.5-free`. Two-knob `opencode.json` updated and live on main. Small_model `muse-spark-1.2-contributor-free` restored.
- **OWNER REBUKE (2026-08-28T14:07:32Z on PR #165):** Owner rejected pausing to escalate X3a training corpus. Mandate reinforced: NEVER wait for owner authorization when a clear next phase exists. Training corpus constraints are a Builder/Lab Engineer problem, not a Maintainer escalation.

## MERGE CAPABILITY (verified)
- main = `df97c5fb` (chore models fix, prior prism merge 4e36674 PR #165 X2)
- PR #165 MERGED at 2026-08-28T13:05:46Z (branch retained) - df97c5f extends main
- PR #166 OPEN at 279a79232fd847e5e08c6114235e5d4b6d17b9b9 (1 commit, 13 files, branch `opencode/issue130-20260828230523`) - merge-base df97c5f verified via `git merge-base origin/main 279a792`, NOT orphan, MERGEABLE/CLEAN per `gh pr view --json mergeable,mergeStateStatus`
- Prior merges: PR #164 at bbb56ed, PR #163 at 26d51c4 etc, all retained.

## CRITICAL INFRASTRUCTURE STATE
- **X0+X1+X2 harness LIVE on main:** wavelet lift (Haar/53/97), EBCOT bitplane coder, 1024-context adaptive binary rANS, WAVELET_FLAG container, 8-neighbour significance pattern context. 206/206 tests green prior to X3a.
- **X3a PR #166 REVIEW-APPROVED, TESTER IN_PROGRESS:** learned fine context (307200 pools) + 10->16->1 MLP prior (learned_ctx_data.inc, trained on real Kodak-24 1.62M samples, BCE 0.317), pseudocount K=64 best. Result 3.2477/sample / 9.743 summed (+0.41% vs X2 3.2611/9.783). Byte-exact round-trip on all 24 Kodak PPMs, X0 gtests PASS. Gates M2/M3 NOT MET per honest Builder + Reviewer verdict. CSV `2026-08-28-x3a-learned-ctx-kodak24.csv` + comparison row on branch. Reviewer run 33221485344 PASSED at 23:48:27Z with `/oc approve` (strict review, 13 files, 206/206 tests, no infra touches, Refs #130 correct, 7 non-blocking advisories for X3b/X4). Tester dispatched via owner `/oc test` at 23:48:30Z.
- **Issue #130 OPEN:** gating issue, awaiting Tester verdict then `Refs #130` merge then immediate X3b/X4 escalation (stronger prior: fix train/inference parent-feature mismatch, deeper/wider net per advisories).
- **In-flight runs:** `opencode-test` 33221614796 `in_progress` (job 99016641608, step `Run opencode tester` active, checkout PR head 279a792) + `opencode-test` 33221624585 `pending` (duplicate pending, will be skipped/deduped) + `maintainer` 33221624626 this run; prior review runs 33221485344 `completed/success` + 33221528109 `skipped`. No CreditsError, no orphan, lab nominal.
- **Pages:** last deploy 33221613989 success (PR branch head 279a792), plus 33221622957 success (main df97c5f), preview pr-166 live; `opencode-pr-trigger` 33221614001 success.

## IN FLIGHT
- **PR #166 - OPEN** (X3a learned context, head 279a792, `Refs #130`, gates NOT MET - Reviewer APPROVED 23:48:27Z, Tester IN_PROGRESS 33221614796 awaiting verdict)
- **Issue #130 - OPEN** (Prism M2/M3, X3a delivered as intermediate milestone, next phase is stronger prior X3b/X4)
- **Owner triggers handled:** `/oc review` (23:45:59Z + 23:46:41Z) already resulted in Reviewer APPROVE, `/oc test` at 23:48:30Z now driving Tester 33221614796 - no duplicate needed.

## PIPELINE POSITION
Honest closure 3d76bdb -> no-pause d31f9b0 -> cascade 3->1->2 fully measured/failed/merged -> model upgrade ddeabee/df97c5f -> owner directive Option 2 exotic -> Research delivered -> Architect delivered -> Builder X0 delivered -> Fixer BD16 fix -> Review approved -> Tester 206/206 approved -> Maintainer MERGED X0 -> Builder X1 delivered -> PR #164 approved -> Tester approved -> MERGED X1 -> Builder X2 delivered -> PR #165 approved -> Tester approved -> MERGED X2 (3.261) -> **X3a BUILD retried (2 timeouts) -> Builder landed PR #166 at 279a792 (3.2477, +0.41%, Refs #130, gates NOT MET) -> Reviewer DISPATCHED (33221389850) -> Reviewer APPROVED (33221485344 at 23:48:27Z, `/oc approve`) -> Tester DISPATCHED (owner `/oc test` 23:48:30Z, run 33221614796 in_progress, this run monitors).**

## NEXT-RUN PLAYBOOK
1. Await Tester verdict on PR #166 head 279a792 (run 33221614796 in_progress + pending duplicate 33221624585) - if `/oc fix` then dispatch Fixer (infra PR? No - code-only so fix path is valid), else on `/oc approve-test` merge immediately with `Refs #130` (gates NOT MET, must NOT close #130) via `gh pr merge --rebase`, verify pages deploy.
2. On merge success: IMMEDIATELY dispatch next cascade phase per Anti-Surrender + No-Pause (never leave intermediate milestone idle) - fix advisory #2 train/inference parent mismatch (collect_samples on full subs vector) + advisory #3 K alignment + advisories #1/4-6, plus stronger prior (deeper/wider MLP, better features) via `build`/`research`/`architect` on #130. Do NOT output [] after Refs merge.
3. Issue #130 stays OPEN until M2 AND M3 pass both units (dual-unit, both thresholds) on real Kodak-24 via bench_gate.sh.
4. Respect Tester in_progress guard (33221614796 active) - do not duplicate `test`/`review`/`continue` while active.
5. No Ideator until M2/M3 pass (frozen); no lab/recover unless infra anomaly (PR diff is code-only, no workflow touches).
6. Both-units gates M2/M3 remain binding on every claim; honest ledger on main after each merge; branch retention enforced.

## ISSUES
- **#130** - OPEN - Prism M2/M3/M4 continuation (X3a PR #166 review APPROVED, tester in_progress at 279a792)
- **#70** - Lab Health & Audit Logs (last green 06:06:37Z, next sweep 00:00Z 2026-08-29)
- **#42** - Brainstorm Board FROZEN (awaiting M2/M3 pass)

## OPEN QUESTIONS
- Will Tester 33221614796 confirm byte-exact 24/24 round-trip and reproduce 3.2477 vs X2 3.2611 both-units (and 206/206 tests) before `Refs #130` merge?
- Will pending duplicate Tester 33221624585 be deduped/skipped or race the active run?
- After merge, what architecture reaches M2 (needs +2.5% from 3.2477) and M3 (needs +11.1%): fix parent-feature train/inference mismatch alone may unlock +1-2%, plus deeper MLP, chroma conditioning, deeper wavelet levels, or tokenization change?
- Are the 7 Reviewer advisories (unused cc, parent mismatch, K mismatch, decode_trace pool, stale X_CONTEXT_POOL_SIZE, dead stride no-op) all fixed in X3b without a `/oc fix` loop (reviewer explicitly said non-blocking)?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate FULL comment timeline.
- Read COMMENT plus JOB LOG, never green status alone.
- Topology facts only from commits/compare APIs or unshallowed clones.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Anti-Surrender + No-Pause: never close a gated issue on negative result, only Owner can halt.
- Both-units gating on every claim; verify-and-dispatch pages after every merge.
- Orphan-main protection via merge-base check before merge.
- Branch retention after merge (--delete-never used).
- Build cancellations must be re-dispatched promptly.
- NEVER pause for owner authorization when a clear next phase exists (owner rebuke 2026-08-28).
- Timeout annotation `.github#9013` with zero push is a silent build failure - re-dispatch immediately per no-pause.
- `Refs #N` for intermediate milestones, `Closes #N` only when binding gates genuinely pass (both units).

 - Hephaestus, the Maintainer
<!-- run: 33221624626 -->
