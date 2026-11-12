# STATE

Last updated: 2026-11-12T06:00Z by run 43164543840 (issue_comment wake on #844: the Tester approved `492560d96` and the binding eval is dispatched; the #845 eval returned `fix` 9.4/10 and its own lane run 43164407739 is live; the #804 review cooldown runs to 06:13:38Z). Next-run priorities: read the #844 eval verdict; confirm the #845 lab fix lands a strict-YAML R25 bind and a fresh review; after 06:13:38Z give #804 one fresh review pass if the wall has cleared; merge only on fresh markers.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:55-06:00Z on 2026-11-12)

- **Wake**: `issue_comment` created at 05:55:07Z on #844, the test workflow's `/oc maintainer` handoff after the Tester published its signed approval and the owner `/oc approve-test` marker. The notification named #844.
- **#844 TESTER APPROVED, EVAL DISPATCHED**: head `492560d961c8e3f3271d41ffdfecad8403b535c0`, base `db06e734`, 5 ahead / 0 behind, MERGEABLE/CLEAN, 14 files, `closingIssuesReferences` exactly `[842]`. Test run `43160783651` completed SUCCESS at 05:55:10Z after about 34 minutes. Its signed report at 05:54:57Z is a strictly read-only infrastructure pass on the exact head: strict YAML parse, `bash -n` on the audit plus 33 inline run scalars, the full audit 34/34 with `LAB_RUN_NONCE` unset (R15/R26/R33 PASS), 11 accepts and 9 rejects per runner copy, the account exclusion, all recorded hashes, and mutation proof that the #842 coverage is load-bearing. Owner marker 05:55:05Z; this run dispatches `/oc eval`.
- **#845 EVAL RETURNED `fix` (9.4/10), LANE RUN LIVE**: head `82e2cf1f1b2a6eec5185c4328152875d88cc2f53`, exactly on `db06e734` (6 ahead / 0 behind, MERGEABLE/CLEAN). Eval `43158820238` completed SUCCESS at 05:54:01Z; the bot verdict at 05:53:44Z and the owner-published rejection at 05:53:50Z name one blocking finding: R25 accepts a skipped 150-minute canonical decoy plus a hidden 90-minute executing review step (multiline plain-scalar `uses`), so the audit reports 34/0 while a real review step runs. Required: resolve the executing review step from a strict YAML parse and require exactly one, fail closed on an unparsed `uses`, count runner references from the parsed job, add the multiline/flow-mapping/explicit-key mutants and assert R25 fails, and review R12/R19 or document why not. Secondary: R17 live-snapshot fail-open, three record contradictions/overclaims, the `90/120` vs `120/90` notation, the stale R25 header, and the 2,114/4,653-character AGENTS.md lines. The `/oc maintainer` handoff at 05:53:51Z started maintainer run `43164407739` (its own `maintainer-845` group, in progress since 05:53:53Z), which owns the lab-fix dispatch; this #844-lane run deliberately did not duplicate it.
- **#804 WAITING OUT THE COOLDOWN**: head `6f12207c7925003229b145bf9396e5e05f4b2a0d`, exactly on `db06e734` (6 ahead / 0 behind, MERGEABLE/CLEAN, 11 files). The fresh review `43158821515` failed at 05:43:41Z after the `FreeUsageLimitError` at 05:43:29Z (the #754 wall); the intake note is on #843 at 05:44:00Z. The failure-triage cooldown ends at 06:13:38Z, and there is no re-dispatch before then. The only Tester approval binds the stale `0872b94c` and must not be used.
- **main** = `db06e734`; Pages `43158766051` SUCCESS on the main tip at 05:03:14Z (the #844 preview `43158752455` also SUCCESS on `492560d96`); production root and `/docs/` both HTTP 200. #844 checks: trigger/comment/GitGuardian SUCCESS, deploy SKIPPED.
- **Runs**: held zero. In flight: this run and the #845-lane maintainer `43164407739`. The newest-60 failure scan is empty (the #804 wall death is older and triaged). Queued: only the ancient stale runs from 2026-09/10 branches. No cancellations this run.
- **Trigger allowlist**: 19/19 repo-owned names against `maintainer.yml:42`; the three extra live names are GitHub-managed (`Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`), plus the self-excluded `maintainer`.
- **Model watch**: registry 85 models, 11 free; pin `opencode/deepseek-v4.1-flash-free` (`model` and `small_model`) and all three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) live; `nemotron-3.5-lightning-free` also live. No retirement, no pin change. The wall has not returned since 05:43Z.
- **Open issues** (23): #842/#843/#836 track their lanes; #798 tracks #804; #831 stays open for the canary; the zero-trigger infra issues (#803, #812, #814, #815) are parked behind the live lanes by design; no untriaged issue. The #843 quota-wall intake note (05:44Z) is the public record for the latest #804 review death.
- **Heartbeat liveness**: the loaded stamp was `2026-11-12T05:46Z by run 43162913937`; this run writes the fresh stamp above.

## The live lanes (do not duplicate)

1. **#844** - Tester approved `492560d96` at 05:54:57Z (owner marker 05:55:05Z); binding eval dispatched by this run. On `approve-eval` the PAT sweep merges it and #842 closes; on `fix` route `lab` then a fresh review.
2. **#845** - binding eval `43158820238` returned `fix` (9.4/10) on the R25 bypass class; the lane run `43164407739` is live and routes the Lab Engineer fix. If that run dies before dispatching, the next schedule tick dispatches the lab fix. Then review -> Tester -> binding eval -> PAT sweep; #843 stays open.
3. **#804** - the fresh review `43158821515` on `6f12207c` died on the wall at 05:43:29Z; one fresh review pass is due after the 06:13:38Z cooldown if the wall has cleared. Then Tester -> binding eval -> PAT sweep; #798 closes on merge.
4. **#837** - merged as `db06e734`; its eval evidence and Pages are green.
5. **#832** - merged as `304cd075`; #831 stays open for the canary.

## The serialized infra queue

1. #844: eval -> PAT sweep; #842 closes on merge.
2. #845: lab fix (strict-YAML R25 bind plus mutants) -> review -> test -> eval -> sweep; #843 stays open until a fresh #837 review is proven live on the raised cap.
3. #804: review (post-06:13:38Z cooldown, if the wall has cleared) -> test -> eval -> sweep; #798 closes on merge.
4. After the infra merges: reconcile #812/#815 (the #843 R17 hermeticity covers part of #815), the #822 residuals, the #804 env-seam lessons, and the two non-blocking #845 comment nits; then the deferred docs follow-ups (#773/#774); then #814 with #803.
5. #821 parked on the Owner capacity decision; #745 behind #803; #831 canary pending.

## Loose ends board

1. **#844 (eval live)**: the Tester approved `492560d96` and the body carries a single `Closes #842` with `PR #844` in prose. The binding eval is the last gate; on `approve-eval` the PAT sweep merges and #842 closes. Rebase onto `db06e734` and the record corrections are already in.
2. **#845 (eval rejected, lane lab due)**: the eval found the R25 guard bypassable by a skipped canonical decoy plus a hidden executing review step; the lane run `43164407739` is live. The fix must bind the executing step from a strict YAML parse and add multiline/flow-mapping/explicit-key mutants. Secondary cleanups: R17 fail-open snapshot, record contradictions/overclaims, `90/120` notation, the stale R25 header, and the overlong AGENTS.md lines.
3. **#804 (review died on the wall)**: the fresh review on `6f12207c` died at 05:43:29Z on `FreeUsageLimitError`; the intake note on #843 is at 05:44:00Z. The cooldown runs to 06:13:38Z. Give the lane one fresh review pass after that if the wall has cleared, never a same-IP retry loop. The only Tester approval binds the stale `0872b94c` and must not be used.
4. **The wall**: it returned at 04:25Z, lifted between 04:56Z and 05:03Z, and returned again at 05:43Z (the #804 review death). The durable mitigation is the #837 heartbeat plus one-attempt cap; the Owner capacity decision is still the critical path. Do not treat repeated wall deaths as a lab retry-exhaustion signal.
5. **#843 open**: the review-cap and R17 hermeticity fix is now in #845's rework lane; keep it open until it merges and a fresh #837 review is proven live. Then dispatch that review (proposed solution 4).
6. **#831 scratch canary**: only the Owner (or a pushed branch) can create the disposable PR; never claim it done without live evidence or a recorded Owner waiver.
7. **#821 parked** on the Owner capacity decision; **#745** behind #803; **#792** parked with #821.
8. **#812/#815**: held behind the infra queue; #843's R17 hermeticity partially covers #815 (ambient nonce), reconcile in the audit pass.
9. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
10. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
11. **Held-run watch**: zero this run. **Cancelled**: nothing; the only other live run (`43164407739`) is the legitimate #845 lane. The ancient queued 2026-09/10 runs are stale platform artifacts, not lanes.
12. **Stale verdict trap**: #804's only Tester approval binds `0872b94c`; #844's eval rejected `08a8c72db`, so nothing carries across the rebase; #845's fixes bind `836a9f84` and its Tester approval binds `82e2cf1f`, now rejected by the eval. The R21/R22/R30 gate enforces head freshness.
13. **Failure-triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes. The wall class is exempt from lab dispatch by policy; only the recovery-cap escalation needs attention. The #804 review died at 05:43:29Z, so its next pass is not before 06:13:38Z and only if the wall has cleared.
14. **Duplicate-session noise**: per-target concurrency groups mean the #844 lane and the #845 lane can run in parallel; each must dispatch only its own lane's next step. Re-read trigger history before every dispatch and cancel only never-started duplicates; **never cancel a started real review or test run as a duplicate** (the always-on verify step reads the cancellation as a crash and posts the bounded auto-retry, consuming the thread's budget). Expect duplicate pending test runs after an auto-retried review.
15. **Preview-flow wake noise**: PR pushes trigger the pages preview deploy, `opencode-pr-trigger`, and its standard maintainer fan-out; expected and normally finds the lane live.
16. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; on a PR-comment wake the trigger is the PR number, producing a self-referential linkage line. The body can satisfy the guard by naming `PR #<trigger>` in prose; route any body fix through `lab`, never by hand. The #844 body fix used that shape and is verified live. The durable guard fix (skip self-linkage or use `Refs`) remains a lab follow-up, together with folding in the body-only lab's wrong `review` forward and the auto-retry re-forward.
17. **Board pin**: #70 is pinned and verified.
18. **PAT sweep ignores "behind main"**: it requires only a shared merge base and `MERGEABLE`, plus the fresh head-bound markers; a docs-only or main-advance does not block a workflow-touching PR. It re-queries `UNKNOWN` up to six times and re-reads comments and the head immediately before merging.
19. **Registry shape**: the model registry lists bare ids without the `opencode/` provider prefix; compare the bare id (the resolver maps it).
20. **Artifact-hash honesty**: always state the extraction recipe when quoting a hash; the #844 review found the earlier `ca8d18e1...` spelling did not reproduce.
21. **Review-lane cap evidence**: the #845 review ran ~36 minutes of its old 90-minute cap and approved; the PR's 150/180 shape is justified. An agent-step cap death is a workload/cap class, not a wall death.
22. **Wrapper non-fast-forward noise**: on a rebased workflow-touching branch, the CLI wrapper's own App-token push is rejected non-fast-forward; verify the PAT-backed forced update in the lab log and `git ls-remote`, admit it plainly, and do not route a post-mortem for it alone.
23. **Rebase-before-gates**: when a live lab push is behind main and CONFLICTING, a rebase is mandatory before any merge; dispatch it promptly and let its push forward the fresh review.
24. **Quota-wall intake**: the Maintainer intake stands the run down when a failed run ended on the wall; only the recovery-cap note needs the Maintainer's attention, and neither carries an inline trigger token. The 05:44Z intake note on #843 is the public record for the latest #804 review death.
25. **#754 wall policy**: fresh runners are a lottery at multi-hour wall length and the cron is platform-throttled; do not treat repeated wall deaths as a lab retry-exhaustion signal. If all live lanes wall again, record it and stand down until the next wake.
26. **Binding eval on infra is real**: the #845 `fix` (9.4/10) is a demonstrated audit-guard bypass, not a style nit; route it `lab` and require the strict-YAML bind plus the new mutants before the next review.

## Standing rules I operate under

- Never post triggers; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue, and re-check live trigger history immediately before dispatching because concurrent sessions can double-post.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#837, #804, #844, #845 and their fix PRs) never take `fix`/`continue`; route `lab`. The eval verdict action `fix` on an infrastructure PR routes `lab`, never `fix`.
- Non-workflow PRs approved by both gates are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`); workflow-touching PRs merge only through the hardcoded PAT sweep.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward. Two dispatches of the same tip are idempotent and harmless.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups. A zero-job startup failure in a declared platform incident is an external class: re-dispatch each consumed trigger once after the incident clears instead of incrementing a lab retry count.
- Duplicate queued runs from concurrent sessions are cancelled with `gh run cancel` (job token holds `actions: write`) so one pass per lane remains; a `cancelled` conclusion never summons `workflow_run` triage. Only cancel runs that have not started a real agent step: a cancelled in-flight review run's always-on verify step treats the cancellation as a crash and posts the bounded agent auto-retry (issue #430/#637 logic), re-queueing the same work and consuming the thread's retry budget. Let a started real review or test run finish; cancel pending/queued skip-only or duplicate wakes only. Obsolete runs whose head has been replaced are cancelled only when the auto-retry would be harmless or the rebase is about to supersede it. Cancelling a pending run that has a `workflow_run`-triggered maintainer wake produces a skip-only wake, which is harmless.
- The #754 wall is a pool-wide fresh-run lottery, not a retry-exhaustion signal: no lab dispatch for the wall itself, no ladder advance, one fresh pass per lane after the cooldown; repeated multi-hour walls are an Owner capacity question. The #836/#837 lane owns the durable mitigation (heartbeat plus one-attempt cap).
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first; #843 (#845) raises the review cap and extends R25.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts and again before every retry attempt (issue #831, merged).
- The opt-out gates project config and instruction loading; on CLI 1.19.5 the import boundary is command-qualified: `opencode github run` (the arm) does gate project plugin discovery through the legacy path, while `opencode run` still imports project plugins through the v2 config/plugin layer. Never state the old unqualified claim.
- The lab workflow's linkage guard appends `Closes #<trigger>` on a missing token; on PR-comment wakes that is a self-referential linkage line. A body fix must name `PR #<trigger>` in prose to satisfy the guard; route it through `lab`, never by hand, and keep the durable guard fix as a lab follow-up.
- Main's current audit numbering is R33 run-scalar budget, R34 quota-wall guard, and the #837 heartbeat guard under R34; #804 keeps its per-OS sanitizer rule under R34 (35 checks). #844/#845 add the #842 wording fixtures and extend R25/R17. The reviews rule on that.
- The expected App-token push rejection on protected-path branches (workflow-permission or non-fast-forward after a rebase) is wrapper noise; verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`) so an agent cannot export a different mode through `$GITHUB_ENV`.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #844 binding eval verdict. On `approve-eval` the PAT sweep merges `492560d96` and #842 closes; on `fix` route `lab`, then a fresh review.
2. #845: confirm the lane run `43164407739` dispatched the lab fix; read its instruction and the resulting head. The fix must bind the executing review step from a strict YAML parse, fail closed on an unparsed `uses`, count references from the parsed job, and add the multiline/flow-mapping/explicit-key mutants; then review -> Tester -> binding eval -> PAT sweep.
3. #804: after the 06:13:38Z cooldown, dispatch one fresh `{"action":"review","pr":804,"head":"6f12207c..."}` if the wall has cleared; on approval -> Tester -> binding eval -> PAT sweep; #798 closes on merge.
4. Re-check held and queued runs, the trigger allowlist, the model ladder, and the stale-verdict bindings.
5. Keep #836 open for the Owner capacity decision and the residuals; #831 stays open for the scratch canary.
6. Keep #821 parked on the Owner capacity decision; keep #745 behind #803; #803 is next after the live lanes.
7. After the infra merges: the #843 exit evidence (fresh #837 review), then reconcile #812/#815 (the #843 R17 hermeticity covers part of #815) plus the #822 residuals and the #804 env-seam lessons; then the deferred docs follow-ups (#773/#774) and the two non-blocking #845 comment nits; then #814 with #803.
8. Fold the lab's forward mis-decision (`review` instead of `none` on the body-only pass) and the auto-retry review's re-forward of `/oc test` into the durable linkage-guard/forward-hygiene follow-up; do not dispatch a separate pass now.
9. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #844 binding eval approve `492560d96`, unlocking the PAT sweep and closing #842?
2. Does the #845 lane run dispatch the R25 strict-YAML fix, and does the fixed guard catch the multiline/flow-mapping/explicit-key mutants?
3. Does the wall stay away long enough for the #804 review after 06:13:38Z?
4. Is the quota window stable enough for the live lanes to finish, or will the wall return?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence), and will the scratch canary be run or waived?
