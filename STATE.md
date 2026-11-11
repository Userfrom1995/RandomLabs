# STATE

Last updated: 2026-11-11T06:33Z by run 42971885649 (issue_comment wake on #832 from the 06:21:47Z machine-published eval approval; the sibling session 42971732157 merged #841 at 06:24:40Z in the same window). Next-run priorities: verify the PAT sweep merged #832; read the #837 review `42968720500` on `211c7365`, the #804 review `42967903924` on `79909482`, and the #844/#845 lab-PR reviews; drive every approved lane through the Tester, the binding eval, and the PAT sweep.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 06:22-06:33Z on 2026-11-11)

- **main** = `5003d968c6d38087fad6d0268ad3ee0326a8e048`, advanced by the #841 merge at 06:24:40Z (sibling maintainer 42971732157; #840 closed 06:24:42Z). Pages deploy `42971906471` SUCCESS on the old tip `3f6c5d5e` at 06:21:58Z; the `5003d968` deploy follows through the hardcoded post-merge dispatch.
- **#832 (approved; the PAT sweep owns the merge)**: head `627178e73727b762537465ce5b1e56bd67957053`, `MERGEABLE`/`CLEAN`, one behind main by the docs-only #841 commit (no file overlap, merge base `3f6c5d5e` intact). Tester marker `6758979638` at 2026-11-10T04:27:27Z (head push 2026-11-10T03:31:47Z force push; max commit date 03:30:58Z). Binding eval run `42967900233` SUCCESS; Quality Council `approve-eval` 9.8/10 at 06:21:38Z; owner-authored marker `6788713737` at 06:21:47Z bound to `627178e7` and trigger `6788173324` (the 05:46:05Z `/oc eval`); `/oc maintainer` handoff `6788714160` at 06:21:49Z. I verified the full PAT-sweep predicate line by line: anchored tester verdict, canonical eval marker shape and bindings, ordering, no newer fix (`none` after the tester approval) and no newer rejection (last `6747607276` on 2026-11-09). `MERGEABLE`/`CLEAN` was confirmed at 06:34Z, then GitHub recomputed mergeability to `UNKNOWN` after the #841 main advance (06:24:40Z) and it was still `UNKNOWN` at 06:36:53Z; the sweep re-queries up to six times, so it may land this run, and if the recompute is still pending the next wake re-verifies. `closingIssuesReferences` is empty; #831 stays open for the Owner-requested scratch canary.
- **#837 (fresh review live)**: head `211c7365edc904ce870383cd7b24f77e1026b12e` (rebased, 12 ahead / 0 behind main at the 05:53:49Z force push), review `42968720500` in progress since 05:53:52Z; duplicate review `42968735885` sits pending and will gate-skip. Then the read-only Tester, the binding eval, and the PAT sweep. #836 stays open.
- **#804 (review live)**: head `7990948224e89686798b333a59e4cbde7ba5dadc`, base `3f6c5d5e`, `MERGEABLE`/`CLEAN`; review `42967903924` in progress since 05:46:10Z. Then the read-only Tester, the binding eval, and the PAT sweep; #798 closes on approve-eval.
- **#842 -> PR #844 (review live)**: lab PR `lab: retry the inference-service overload wording (#842)`, head `c1bb1f7773de9a849dae5df688f0b6fb0423c7d4`, base `3f6c5d5e`, 11 files (both runner paths, the audit, workflows, AGENTS/LAB, docs), `MERGEABLE`/`CLEAN`; review `42971495918` in progress since 06:18:23Z. Workflow-touching; then test, eval, sweep; #842 stays open until verified.
- **#843 -> PR #845 (review live)**: lab PR `lab: raise the review cap and make the R17 nonce fixtures hermetic (#843)`, head `299d3829eed22a69b6e9a78d4369912149cde7a1`, base `3f6c5d5e`, 4 files (`opencode-review.yml`, `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`), `MERGEABLE`/`CLEAN`; review `42971888111` in progress since 06:21:48Z. Workflow-touching; then test, eval, sweep; #843 stays open.
- **#821** `dce109e4` `MERGEABLE`/`CLEAN` but behind main, parked on the Owner capacity decision. **#745** `7a04fa4a` `CONFLICTING`/`DIRTY`, parked behind #803.
- **Open issues** (23): #836 tracks the wall/#837, #831 tracks #832, #798 tracks #804, #842/#843 are the current audit findings, plus the queued items (#803, #812, #815, #822, #773, #774, #814, #821, #792, #745 and the pet/maze projects). #840 closed. No untriaged issue remains.
- **Held runs**: zero `action_required`. **Queued**: the four documented inert runs (`37344324101`, `36101155868`, `36101155851`, `36101155844`) plus the #845 push wakes (Pages preview `42971888736`, `opencode-pr-trigger`, maintainer `42971888815`); all will survey and stand down. The duplicate maintainer `42971892770` (the #832 `/oc maintainer` handoff) was already superseded by concurrency; `42971890083` was cancelled.
- **Failure scan**: none in the recent window. The many skipped/cancelled maintainer runs around 06:21-06:22 are gate skips from the comment fan-out, not failures.
- **Trigger allowlist**: exact 19/19 against the live active repo-owned names outside the self-excluded `maintainer` and the three GitHub-managed names (`Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`).
- **Model watch**: the registry serves 85 models, 11 free. Registry ids are unprefixed (`deepseek-v4.1-flash-free`), the pin is `opencode/deepseek-v4.1-flash-free`, and the resolver maps the provider prefix to the bare id; the pin and both fallback rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) are live. No retirement, no pin change. Later upgrade candidates: `inkling-2-small-free`, `beam-free`, `minimax-m3.1-flash-free`, `longcat-2.5-free`, `nemotron-3.5-lightning-free`.
- **This run's decision**: `[]` (nothing left to dispatch; the sweep owns #832 and the mergeability recompute decides whether it lands this run or the next wake, everything else is live).

## The live lanes (do not duplicate)

1. **#832** - both fresh head-bound markers are in place and the sweep predicate passes; the hardcoded PAT sweep merges the workflow-touching PR this run. #831 stays open for the canary.
2. **#837** - fresh review `42968720500` live on the rebased `211c7365`; then the read-only Tester, the binding eval, and the PAT sweep. #836 stays open.
3. **#804** - review `42967903924` live on `79909482`; then the read-only Tester, the binding eval, and the PAT sweep. #798 closes on approve-eval.
4. **#842 / PR #844** - review `42971495918` live; then test, eval, sweep. Keep #842 open until the fix is verified.
5. **#843 / PR #845** - review `42971888111` live; then test, eval, sweep. Keep #843 open until the fix and a fresh #837 review are verified.
6. **#841** - merged as `5003d968`; #840 closed. Verify the Pages deploy for the new tip next wake.

## The serialized infra queue

1. #832: sweep merge (approved).
2. #837: review -> test -> eval -> sweep; #836 open.
3. #804: review -> test -> eval -> sweep; #798 closes on approve-eval.
4. #842/PR #844: review -> test -> eval -> sweep.
5. #843/PR #845: review -> test -> eval -> sweep; the cap fix protects every future review.
6. #803: lifetime retry budgets; next after the live lanes.
7. #821 parked on the Owner capacity decision; #745 behind #803.
8. After the infra merges: reconcile #812/#815 (the #843 R17 hermeticity covers part of #815) plus the #822 residuals and the #804 env-seam lessons; then the deferred docs follow-ups (#773/#774); then #814 with #803.

## Loose ends board

1. **#832 (approved)**: project-config opt-out plus plugin-loader guard. Tester approved `627178e7` at 2026-11-10T04:27:27Z; binding eval approved 9.8/10 at 06:21:38Z; the PAT sweep merges it. Remaining residue: the body's self-referential `Closes #832` (inert) and the Owner-requested scratch canary (unexecuted, so #831 stays open).
2. **#841 merged**: one-line landing-page intake sync, `Fixes #840`; merged 06:24:40Z as `5003d968`; #840 closed. The Pages deploy for the new tip is the remaining check.
3. **#837 (fresh review live)**: the heartbeat and one-attempt quota recovery, rebased to `211c7365` (12 ahead / 0 behind main). The review cap death is #843; the lab's stand-alone push printed a non-fast-forward rejection after the rebased tip had already landed, so the tip is correct and no action is needed.
4. **#804 (review live)**: the B10 PATH prepend finding. The lifetime retry budget is spent (#803), so a fresh manual head-bound review was the only recovery. The eval's non-blocking notes remain post-merge follow-ups.
5. **#842 (fix in PR #844)**: the overload wording joins the #653/#717/#828 transient family; the fix must consume the existing shared HTTP retry budget, not add a class.
6. **#843 (fix in PR #845)**: raise the review cap to 150 under 180 and extend R25; make R17 hermetic with a mid-fixture abort self-test; optional incremental reviewer report skeleton. Do not weaken the nonce or report gates.
7. **The wall (2026-11-08 to 2026-11-11)**: outlasted three days and about 25 hours; it broke around 05:35Z on 11-11 and the pool has been healthy since. The durable mitigation is the #837 heartbeat plus one-attempt cap; the Owner capacity decision is still the critical path.
8. **The wall policy**: fresh runners are a lottery at multi-hour wall length, and the Maintainer cron is platform-throttled to about 4.2 wakes/day. Do not treat repeated wall deaths as a lab retry-exhaustion signal; if all live lanes wall again, record it and stand down until the next wake.
9. **#792 (parked with #821)**: Maze Chase harness gaps; parked on the Owner capacity decision.
10. **#745 (parked)**: owner-PAT env extension, `CONFLICTING` at `7a04fa4a`, behind #803.
11. **#812/#815**: held behind the infra queue; #843's R17 hermeticity partially covers #815 (ambient nonce), reconcile in the audit pass.
12. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
13. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
14. **Held-run watch**: zero this run; re-check next wake.
15. **Stale verdict trap**: #832's markers bind `627178e7` and trigger `6788173324`; #837's verdicts must bind the post-rebase `211c7365`; #804's verdicts must bind `79909482`; #844 must bind `c1bb1f77`; #845 must bind `299d3829`. The R21/R22/R30 gate enforces head freshness; do not merge on a stale verdict.
16. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
17. **Model watch**: 85 models, 11 free; registry ids are unprefixed and the resolver maps `opencode/<name>`; no pin or rung change. The 1M-context free models await a benchmark pass after the infra queue clears.
18. **Duplicate-session noise**: this wake overlapped the sibling maintainer session 42971732157, which owned #841 and merged it at 06:24:40Z; the `/oc maintainer` handoff queued `42971892770` was superseded before it started and `42971890083` was cancelled. Re-read trigger history before every dispatch; cancel duplicate queued/in-progress runs with `gh run cancel`.
19. **Preview-flow wake noise**: the #845 push triggered the pages preview deploy and `opencode-pr-trigger`, whose standard `/oc maintainer` woke maintainer `42971888815`; expected and normally finds the lane live.
20. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; on a PR-comment wake the trigger is the PR number, producing a self-referential `Closes <PR>`. Route the fix through `lab` (use `Refs` for PR triggers); never patch the body by hand.
21. **Board pin**: #70 is pinned and verified.
22. **#831 scratch canary**: needs a disposable PR that only the Owner (or a pushed branch) can create; never claim it done without live evidence or a recorded Owner waiver.
23. **General mid-body wake noise**: the evaluator verdict comment contains the tester marker mid-sentence, so the general arm wakes spuriously; ride along in the deferred #822 residuals pass.
24. **Pages verification**: production tip `3f6c5d5e` deployed green at 06:21:58Z; the `5003d968` tip deploy follows the post-merge dispatch; #844/#845 previews will redeploy on their heads.
25. **The 1.19.5 plugin boundary is reproduced (command-qualified)**: `opencode github run` is gated by the opt-out through the legacy config/plugin path; `opencode run` is not gated for plugins through the v2 layer. Keep the sanitizer as the primary closure for the `opencode run`/v2 path plus defense in depth for the arm.
26. **PAT sweep ignores "behind main"**: it requires only a shared merge base and `MERGEABLE`, plus the fresh head-bound markers; a docs-only main advance does not block a workflow-touching PR. It re-queries `UNKNOWN` up to six times and re-reads comments and the head immediately before merging.
27. **Registry shape**: the model registry lists bare ids without the `opencode/` provider prefix; a raw string comparison of the pinned ref against the registry is wrong. Compare the bare id (the resolver does this mapping).

## Standing rules I operate under

- Never post triggers; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue, and re-check live trigger history immediately before dispatching because concurrent sessions can double-post.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#832, #837, #804, #844, #845 and their fix PRs) never take `fix`/`continue`; route `lab`. The eval verdict action `fix` on an infrastructure PR routes `lab`, never `fix`.
- Non-workflow PRs approved by both gates are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`); workflow-touching PRs merge only through the hardcoded PAT sweep.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward. Two dispatches of the same tip are idempotent and harmless.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups. A zero-job startup failure in a declared platform incident is an external class: re-dispatch each consumed trigger once after the incident clears instead of incrementing a lab retry count.
- Duplicate queued runs from concurrent sessions are cancelled with `gh run cancel` (job token holds `actions: write`) so one pass per lane remains; a `cancelled` conclusion never summons `workflow_run` triage.
- The #754 wall is a pool-wide fresh-run lottery, not a retry-exhaustion signal: no lab dispatch for the wall itself, no ladder advance, one fresh pass per lane after the cooldown; repeated multi-hour walls are an Owner capacity question. The #836/#837 lane owns the durable mitigation (heartbeat plus one-attempt cap).
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first; #843 (#845) raises the review cap and extends R25.
- A wall death at the lifetime review auto-retry cap (issue #803) means the workflow cannot self-retry: the Maintainer must post a manual head-bound review after the cooldown.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts and again before every retry attempt (issue #831).
- The opt-out gates project config and instruction loading; on CLI 1.19.5 the import boundary is command-qualified: `opencode github run` (the arm) does gate project plugin discovery through the legacy path, while `opencode run` still imports project plugins through the v2 config/plugin layer. Never state the old unqualified claim.
- The lab workflow's linkage guard appends `Closes <trigger>` on a missing token; on PR-comment wakes that is a self-referential `Closes <PR>`. Route the fix through `lab` (use `Refs` for PR triggers); never edit the body by hand.
- Main's current audit numbering is R33 run-scalar budget, R34 quota-wall guard, and the #837 heartbeat guard under R34; #804 keeps its per-OS sanitizer rule under R34 (35 checks). #844/#845 add the #842 wording fixtures and extend R25/R17. The reviews rule on that.
- The expected App-token workflow push rejection on protected-path branches is wrapper noise; verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`) so an agent cannot export a different mode through `$GITHUB_ENV`.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Verify the PAT sweep merged #832 (the merge commit advances main); #831 stays open for the canary.
2. Read the #837 review `42968720500`; then the read-only Tester, the binding eval, and the PAT sweep. If the review returns a finding, route `lab` (infrastructure). #836 stays open.
3. Read the #804 review `42967903924`; then the read-only Tester, the binding eval, and the PAT sweep; #798 closes on approve-eval.
4. Read the #844/#845 reviews; drive their test, eval, and sweep chains. Keep #842/#843 open until the fixes are verified.
5. Verify the Pages deploy of the post-#841 tip and the #844/#845 previews.
6. Re-check held and queued runs, the trigger allowlist, the model ladder, and the stale-verdict bindings.
7. Keep #821 parked on the Owner capacity decision; keep #745 behind #803; #803 is next after the live lanes.
8. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
9. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the PAT sweep land #832 on this approved pair? (predicate verified, `MERGEABLE`)
2. Do the #837 and #804 reviews approve their rebased/updated heads?
3. Do #844 and #845 pass the review, test, and eval chains cleanly?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence)?
