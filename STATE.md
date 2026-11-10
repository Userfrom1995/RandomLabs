# STATE

Last updated: 2026-11-10T03:14Z by run 42744008606 (issue_comment wake from the #839 `/oc maintainer` handoff at 02:36:39Z, superseded by the merge session 42743961520; surveyed fresh at 03:02-03:14Z, verified the #839 Pages deploy green, found that two concurrent sessions had double-dispatched the three lanes, and cancelled the three queued duplicate runs so each lane keeps exactly one live pass). Next-run priorities: read the #804 review verdict and the #832/#837 lab pushes, keep exactly one pass per lane, and keep the merge chain gated on fresh head-bound markers.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:02-03:14Z on 2026-11-10)

- **main** = `3f6c5d5e66a1f33a92cb81ab09d71ecee5ca32eb`, unchanged since the #839 rebase merge at 02:38:34Z. Linear on `675658cb`, no orphan.
- **#839 (MERGED)**: `b10b2a58` merged as `3f6c5d5e`; #838 closed at 02:38:35Z. The post-merge Pages dispatch `42746749291` completed SUCCESS at 03:02:11Z on `3f6c5d5e`; production root and `/docs/` return HTTP 200. `archive/` is not staged by the deploy workflow by design, so its 503 there is expected. The branch stays intact.
- **#804 (review live)**: head `947482ca527db4ae8feab779a1517e4dcf145ad7` unchanged, MERGEABLE/CLEAN. Review `42746415740` has been live since 02:59:14Z with its agent step running; the queued duplicate review `42746715635` from the merge session's 03:01:50Z trigger was cancelled by this run, so exactly one review pass is live.
- **#832 (lab live)**: head `47f234ac85da853bcc10e6598ae4df8310afe61a` unchanged, MERGEABLE/CLEAN. Lab `42746416750` has been live since 02:59:15Z with its agent step running under the 19:03Z review F1 instruction; the queued duplicate `42746717703` from the 03:01:51Z trigger was cancelled by this run, so exactly one lab pass is live.
- **#837 (lab live)**: head `c443efaed4be86309dedd914d2208338e90f9a45` unchanged, MERGEABLE/CLEAN. Lab `42746412553` has been live since 02:59:12Z with its agent step running on the eval's two blocking defects; the queued duplicate `42746719925` from the 03:01:53Z trigger was cancelled by this run, so exactly one lab pass is live.
- **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but behind main, parked on the Owner capacity decision. **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY, parked behind #803.
- **Open issues** (21): #836 tracks #837, #831 tracks #832, #798 tracks #804; no new untriaged issue and no human directive pending.
- **Held runs**: zero `action_required`. **Queued**: only the four documented inert runs (37344324101, 36101155868, 36101155851, 36101155844). **In progress**: the three lanes above and this run. No other maintainer run is pending.
- **Failure scan**: zero `failure`/`timed_out`/`startup_failure` runs since 02:55Z. The only cancellations are the three duplicate agent runs this run cancelled (deliberate) and the earlier single-slot maintainer supersede noise.
- **Trigger allowlist**: exact 19/19 against the 19 live active repo-owned names outside the self-excluded `maintainer` and the three GitHub-managed names (`Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`). **Model watch**: the registry serves 84 models; the pin `opencode/deepseek-v4.1-flash-free` plus all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) resolve to live free registry entries (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`). No retirement, no pin change.
- **Dispatch hygiene note**: two concurrent Maintainer sessions held through their cooldowns and both dispatched the same three lanes: session 42744565708 at 02:59:10-12Z (run 42746412553/42746416750/42746415740) and the merge session 42743961520 at 03:01:50-53Z (queued runs 42746719925/42746717703/42746715635). This run cancelled the three queued duplicates so one pass per lane remains. Future sessions must check the lane's trigger history immediately before dispatching: a sibling session may act while a session sleeps through a cooldown.
- **Checkout note**: this is a PR-comment wake on the merged PR #839, so the CLI may re-check out the PR head after the trusted checkout (documented #831 behaviour); the staged prompt remains authoritative. This session wrote only `.maintainer/` outputs.

## The live lanes (do not duplicate)

1. **#804** - review live on `947482ca` (42746415740, agent step). On approval the workflow forwards the read-only Tester; after the owner-authored approve-test marker dispatch `{"action":"eval","pr":804}`, and the PAT sweep lands it only with both fresh head-bound markers. #798 closes on approve-eval. On findings, one lab pass with the exact list. The stale `b4535f19` approval and all earlier verdicts must never count.
2. **#832** - lab live on `47f234ac` (42746416750) with the command-qualified 1.19.5 F1 instruction. On its push the workflow forwards its own review; then the read-only Tester, the binding eval, and the PAT sweep follow; #831 stays open. Verify the command-qualified boundary across the note, `AGENTS.md`, `LAB.md`, the composite comments, the Maintainer envelope, and the R31 text; the exact canaries; the regenerated R26/R31 pins; a green R1-R34 audit; and the PR-body cleanup.
3. **#837** - lab live on `c443efa` (42746412553) with the eval's two defects. Its push invalidates the 01:27:33Z Tester approval and the eval rejection on the old head; the fresh review, Tester, binding eval, and PAT sweep follow; #836 stays open. Keep the one-attempt cap and the heartbeat's ordering, dedupe, rollback, and token-free note intact.
4. **#839** - merged as `3f6c5d5e`; Pages `42746749291` green at 03:02:11Z and production root/docs serve 200. Nothing further.
5. **#821** - parked on the Owner capacity decision. Do not spend a fresh review until the decision is given.
6. **#745** - parked behind #803.

## The serialized infra queue

1. #804: review live; then the read-only Tester, the binding eval, and the PAT sweep; #798 closes on approve-eval.
2. #832: lab live; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep; #831 stays open for the per-attempt live verification and the scratch canary.
3. #837: lab live; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep; #836 stays open.
4. #803: lifetime retry budgets; next infra item after the frozen lanes land; unblocks #745. The #804 review cap death is a live instance of this class.
5. #821 is parked on the Owner capacity decision; #745 behind #803.
6. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#804 (review live)**: the B9 lab pass landed `947482ca` (three post-agent `PEROS_PREFLIGHT: "0"` pins, R17 expected-env pin plus removal self-test, R34 `inherited-preflight` scenario plus mutant and clean-branch control, banner/docs sync). The wall-dead review `42740212917` died at the lifetime auto-retry cap (issue #803); a manual head-bound review was posted after the cooldown and `42746415740` is live. The eval's non-blocking notes remain post-merge follow-ups (PR-body delegation ledger length, foreign-identity residual, helper-level `GIT_CONFIG_COUNT`/`BASH_ENV` unset, "R1-R34" banner label), as do the Tester's three documentation observations from 19:48Z.
2. **#832 (lab live)**: project-config loading plus the CLI plugin import guard. The 19:03Z review returned `lab` on the command-boundary finding (F1): qualify `opencode github run` versus `opencode run` everywhere the 1.19.5 import boundary is stated, record the exact canaries, keep the guard and sanitizer unchanged, regenerate the R26/R31 pins, and clean the PR body's self-referential `Closes #832`. Two prior lab attempts died on the wall (19:54Z and 00:52Z); the third is live after the cooldown.
3. **#837 (lab live)**: the heartbeat and one-attempt quota recovery. The binding eval rejected at 9.7/10 on two defects: the run-list read fails open on structurally invalid JSON, and R34 does not pin the effective cutoff or the minutes arithmetic (three mutants stayed green). The lab pass also takes the non-blocking residuals (oldest-board pagination, marker-quoting cooldown extension, self-referential close keyword, malformed comment entries).
4. **#839 (merged)**: the Curator's five archive link repairs shipped as `3f6c5d5e`; the Evaluator approved 9.9/10 and the marker was fresh and head-bound. Pages verified green this run.
5. **The wall (2026-11-09 evening and 2026-11-10T02:21-02:28Z)**: the 2026-11-09 evening run killed five lanes; fresh runners recovered on 2026-11-10. At 02:21Z the #804 review died after 16 minutes of real work, and at 02:27Z the #832 lab died after about 95 minutes. The one-attempt cap plus the cross-arm heartbeat are in #837, now in a fresh lab fix round; until it lands, the old two-attempt recovery behavior and no heartbeat remain live.
6. **The wall policy**: fresh runners are a lottery at multi-hour wall length, and the Maintainer cron is platform-throttled to about 4.2 wakes/day. Do not treat repeated wall deaths as a lab retry-exhaustion signal; if all live lanes wall again, record it and stand down until the next wake.
7. **#792 (parked with #821)**: Maze Chase harness gaps; parked on the Owner capacity decision.
8. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
9. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Held-run watch**: zero this run; re-check next wake.
13. **Stale verdict trap**: #804's review, Tester, and eval verdicts must all bind `947482ca`; #832's must bind the new lab head; #837's must bind the new lab head (the 01:27:33Z Tester approval and the 9.7 eval rejection are stale). #839 is merged and closed. The R21/R22/R30 gate enforces head freshness; do not merge on any stale verdict.
14. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
15. **Model watch**: the registry serves 84 models; the 1M-context free models noted by the Auditor await a benchmark pass after the infra queue clears. No pin or rung change needed.
16. **Overlap and duplicate-dispatch noise**: this run cancelled the three queued duplicates (`42746715635`, `42746717703`, `42746719925`) created by the two concurrent sessions. Keep-both memory is expected for duplicate maintainer wakes. Before any dispatch, re-read the target thread's trigger history; a sibling session may have dispatched while an earlier session slept through a cooldown.
17. **Board pin**: #70 is pinned and verified.
18. **#831 scratch canary**: needs a disposable PR that only the Owner (or a pushed branch) can create; never claim it done without live evidence or a recorded Owner waiver.
19. **General mid-body wake noise**: the evaluator verdict comment contains the tester marker mid-sentence, so the general arm wakes spuriously; ride along in the deferred #822 residuals pass.
20. **Preview-flow wake noise**: the pages preview deploy is followed by an opencode-pr-trigger wake on the PR; expected and normally finds the lanes live, so it should stay a standby wake.
21. **Pages verification**: the current production tip is `3f6c5d5e` (deploy `42746749291` green at 03:02:11Z; root and `/docs/` 200). The prior tip `675658cb` deployed green at 02:04Z (`42740225845`/`42740210720`).
22. **The 1.19.5 plugin boundary is reproduced (command-qualified)**: `opencode github run` (the arm) is gated by the opt-out through the legacy `ConfigPaths.directories` -> `ConfigPlugin.load` path; `opencode run` is not gated for plugins through the v2 config/plugin layer; the Evaluator's no-import negative was a bogus-model rc 1 before bootstrap; the Tester's `opencode run` canary is valid for that command. The live #832 lab pass must record this boundary, never repeat the old unqualified claim, and keep the sanitizer as the primary closure for the `opencode run`/v2 path plus defense in depth for the arm.

## Standing rules I operate under

- Never post triggers; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue, and re-check live trigger history immediately before dispatching because concurrent sessions can double-post.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#832, #804, #837) never take `fix`/`continue`; route `lab`. The eval verdict action `fix` on an infrastructure PR routes `lab`, never `fix`. Docs/product lanes may take `fix` if the review returns findings.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward. Two dispatches of the same tip are idempotent and harmless.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups. A zero-job startup failure in a declared platform incident is an external class: re-dispatch each consumed trigger once after the incident clears instead of incrementing a lab retry count.
- Duplicate queued runs from concurrent sessions are cancelled with `gh run cancel` (job token holds `actions: write`) so one pass per lane remains; a `cancelled` conclusion never summons `workflow_run` triage.
- The #754 wall is a pool-wide fresh-run lottery, not a retry-exhaustion signal: no lab dispatch for the wall itself, no ladder advance, one fresh pass per lane after the cooldown; repeated multi-hour walls are an Owner capacity question. The #836/#837 lane owns the durable mitigation (heartbeat plus one-attempt cap).
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- A wall death at the lifetime review auto-retry cap (issue #803) means the workflow cannot self-retry: the Maintainer must post a manual head-bound review after the cooldown.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts and again before every retry attempt (issue #831).
- The opt-out gates project config and instruction loading; on CLI 1.19.5 the import boundary is command-qualified: `opencode github run` (the arm) does gate project plugin discovery through the legacy `ConfigPaths.directories` -> `ConfigPlugin.load` path, while `opencode run` still imports project plugins through the v2 config/plugin layer. Never state the old unqualified claim; keep the sanitizer as the primary closure for the `opencode run`/v2 path and defense in depth for the arm, and name the command in every 1.19.5 statement.
- Main's current audit numbering is R33 run-scalar budget and R34 quota-wall guard plus the #837 heartbeat guard under R34; the #804 block keeps its per-OS sanitizer rule under R34 (35 checks). The reviews rule on that.
- The expected App-token workflow push rejection on protected-path branches is wrapper noise; verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`) so an agent cannot export a different mode through `$GITHUB_ENV`.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #804 review verdict (42746415740). On approval the workflow forwards the read-only Tester; after the owner-authored approve-test marker dispatch `{"action":"eval","pr":804}`, and the PAT sweep lands it only with both fresh head-bound markers. On findings, one lab pass with the exact list.
2. Read the #832 lab push (42746416750) and its forwarded review; on a green head the read-only Tester, the binding eval, and the PAT sweep follow; #831 stays open. Verify the command-qualified 1.19.5 boundary and the regenerated pins.
3. Read the #837 lab push (42746412553) and its forwarded review; on a green head the Tester, the binding eval, and the PAT sweep follow; #836 stays open. Verify the two eval defects are closed and the residuals addressed.
4. If a lane hits the wall again, record the run and stand down until the next wake; do not chain same-IP retries. Do not dispatch a second pass while one is in progress; re-read the trigger history first.
5. Re-check held and queued runs, the trigger allowlist, the model ladder, and Pages/previews.
6. Keep #821 parked on the Owner capacity decision; keep #745 behind #803; #803 is next after the frozen lanes.
7. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #804 review approve `947482ca`, so the Tester/eval chain can close B9 and land the per-OS sanitizer work?
2. Do the #832 and #837 lab passes land cleanly, and do their fresh review/Tester/eval chains approve the new heads?
3. Will the wall clear long enough for the three fresh passes to land, or does the lab need the Owner capacity decision first?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence)?
5. Will the Owner provide the disposable scratch PR (or a waiver) needed to close the #831 live canary ask?
