# STATE

Last updated: 2026-11-10T03:39Z by run 42750047253 (issue_comment wake on #832 from the 03:31:55Z `/oc maintainer` handoff; a duplicate standby behind the concurrent #837 session 42749836882, which posted the cross-lane standby at 03:35:57Z and its #837 status at 03:36:11Z; surveyed fresh at 03:32-03:39Z and stood down). Next-run priorities: read the #832 review verdict on `627178e7`, the #837 review verdict on `f23877fe`, and the #804 Lab Engineer result; keep exactly one pass per lane; if the #832 review flags the body token, the forwarded lab pass must fix the lab workflow's linkage guard for PR triggers.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:32-03:39Z on 2026-11-10)

- **main** = `3f6c5d5e66a1f33a92cb81ab09d71ecee5ca32eb`, unchanged since the #839 rebase merge at 02:38:34Z. Linear on `675658cb`, no orphan.
- **Pages**: deploy `42750048250` completed SUCCESS at 03:31:58Z on `3f6c5d5e`; the PR preview `42750035629` completed SUCCESS at 03:31:51Z on `627178e7`. Production root and `/docs/` were verified 200 earlier today; `archive/` is not staged by the deploy workflow by design.
- **#832 (review live)**: head `627178e73727b762537465ce5b1e56bd67957053`, `MERGEABLE`/`CLEAN`, and `main` is an ancestor. Lab run `42746416750` completed SUCCESS at 03:31:54Z and the PAT step landed `627178e73` at 03:31:47Z (the in-thread App-token rejection is documented wrapper noise). Review `42750038276` has been live since 03:31:52Z. The pending `42750047045` is the skip-only opencode-review run spawned by the later `/oc maintainer` comment, so no second review pass exists.
- **#832 body token (new finding)**: the agent-authored body carried `Refs #831` only, but the live body ends with `Closes #832`. Cause: the lab workflow's hardcoded linkage guard checks the body for `#<trigger>` and, on a PR-comment wake, the trigger issue is the PR number, so it appended `Closes 832`. The guard is intended for issue triggers. If the live review flags the body, the forwarded lab pass must change the guard to append `Refs` for PR triggers; never patch the body or lab.yml by hand.
- **#837 (review live)**: head `f23877fe4e7ac6c822a578911ff584786817ffb6`, `MERGEABLE`/`CLEAN`, but `main` is NOT an ancestor (behind the archive-only #839 commits on `3f6c5d5e`). Lab run `42746412553` completed SUCCESS at 03:30:02Z and the PAT step landed `f23877fe` at 03:29:45Z. Review `42749823343` has been live since 03:29:59Z. The concurrent #837 Maintainer session `42749836882` completed SUCCESS and posted the cross-lane standby plus its #837 status during this window; do not duplicate it.
- **#804 (lab live)**: head `947482ca527db4ae8feab779a1517e4dcf145ad7`, `MERGEABLE`/`CLEAN`. Review `42746415740` returned `lab` at 03:32:55Z with one blocking security finding (B10: the runner prepends `$GITHUB_PATH` entries ahead of the trusted PATH pin, so an agent-planted shim can intercept the post-agent owner-PAT steps). The workflow posted `/oc lab` at 03:33:06Z and Lab Engineer `42750176170` is live. A concurrent #804 Maintainer run `42750169857` is in progress with `42750176144` pending behind the single slot; they may post their own #804 status, so keep-both comments are expected.
- **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` `MERGEABLE`/`CLEAN` but behind main, parked on the Owner capacity decision. **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` `CONFLICTING`/`DIRTY`, parked behind #803.
- **Open issues** (21): #836 tracks #837, #831 tracks #832, #798 tracks #804; no new untriaged issue and no human directive pending.
- **Held runs**: zero `action_required`. **Queued**: only the four documented inert runs (`37344324101`, `36101155868`, `36101155851`, `36101155844`). **In progress**: the three lanes above, this run, and the two #804 Maintainer runs.
- **Failure scan**: zero `failure`/`timed_out`/`startup_failure` in the last 100 runs. The repeated cancelled/skipped maintainer `workflow_run` runs between 03:31 and 03:33 are the cancellations of the earlier duplicate agent runs plus single-slot supersede, not production failures.
- **Trigger allowlist**: exact 19/19 against the 19 live active repo-owned names outside the self-excluded `maintainer` and the three GitHub-managed names (`Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`).
- **Model watch**: the registry serves 84 models; the pin `opencode/deepseek-v4.1-flash-free` plus all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) resolve to live free registry entries (the registry ids omit the provider prefix). No retirement, no pin change.
- **Checkout note**: this is a PR-comment wake on #832, so the CLI may re-check out the PR head after the trusted checkout (documented #831 behaviour); the staged prompt remains authoritative. This session wrote only `.maintainer/` outputs.

## The live lanes (do not duplicate)

1. **#804** - Lab Engineer `42750176170` live on `947482ca` for the B10 `$GITHUB_PATH` shim finding. On its push the workflow forwards the fresh review; then the read-only Tester, the binding eval, and the PAT sweep. #798 closes on approve-eval. The stale `b4535f19` approval and all earlier verdicts must never count.
2. **#832** - Review `42750038276` live on `627178e7`. If it returns `lab` for the body token, the forwarded lab pass fixes the lab workflow's linkage guard (use `Refs` for PR triggers) and re-clears the body. After a clean review: the read-only Tester, the binding eval, and the PAT sweep; #831 stays open.
3. **#837** - Review `42749823343` live on `f23877fe`. The branch is behind the archive-only #839 commits, so expect a mechanical `lab` rebase pass; the 01:27:33Z Tester approval and the 9.7 eval rejection are stale for this head. Then the fresh review, Tester, binding eval, and PAT sweep; #836 stays open.
4. **#839** - merged as `3f6c5d5e`; Pages green; nothing further.
5. **#821** - parked on the Owner capacity decision. Do not spend a fresh review until the decision is given.
6. **#745** - parked behind #803.

## The serialized infra queue

1. #804: lab live on B10; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep; #798 closes on approve-eval.
2. #832: review live; then (if needed) one lab pass for the linkage guard; then the Tester, the binding eval, and the PAT sweep; #831 stays open for the per-attempt live verification and the scratch canary.
3. #837: review live; then a mechanical lab rebase; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep; #836 stays open.
4. #803: lifetime retry budgets; next infra item after the frozen lanes land; unblocks #745. The #804 review cap death is a live instance of this class.
5. #821 is parked on the Owner capacity decision; #745 behind #803.
6. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#804 (lab live)**: the review's blocking B10 finding is that the runner prepends `$GITHUB_PATH` entries ahead of the trusted PATH pin, so an agent-planted shim can intercept the post-agent owner-PAT steps. The Lab Engineer pass must close it with a test, not just a wording change. The eval's non-blocking notes remain post-merge follow-ups (PR-body delegation ledger length, foreign-identity residual, helper-level `GIT_CONFIG_COUNT`/`BASH_ENV` unset, "R1-R34" banner label), as do the Tester's three documentation observations from 19:48Z.
2. **#832 (review live)**: project-config loading plus the CLI plugin import guard. The lab pass landed the command-qualified 1.19.5 boundary, the seven-row canary matrix, and the regenerated R26/R31 pins. New: the lab workflow's linkage guard re-appended `Closes #832` to the PR body on this PR-comment wake because the trigger issue is the PR number. If the review flags it, the forwarded lab pass changes the guard to `Refs` for PR triggers.
3. **#837 (review live)**: the heartbeat and one-attempt quota recovery. The lab pass landed `67c892b3` (fails the heartbeat closed on a malformed run page; pins the effective cutoff and minute arithmetic under R34) and `f23877fe` (documents the validation and the oldest-first board query). The branch is behind the archive-only #839 commits, so expect a mechanical rebase.
4. **#839 (merged)**: the Curator's five archive link repairs shipped as `3f6c5d5e`; the Evaluator approved 9.9/10 and the marker was fresh and head-bound. Pages verified green this run.
5. **The wall (2026-11-09 evening and 2026-11-10T02:21-02:28Z)**: the 2026-11-09 evening run killed five lanes; fresh runners recovered on 2026-11-10. At 02:21Z the #804 review died after 16 minutes of real work, and at 02:27Z the #832 lab died after about 95 minutes. The one-attempt cap plus the cross-arm heartbeat are in #837, now in a fresh lab fix round; until it lands, the old two-attempt recovery behavior and no heartbeat remain live.
6. **The wall policy**: fresh runners are a lottery at multi-hour wall length, and the Maintainer cron is platform-throttled to about 4.2 wakes/day. Do not treat repeated wall deaths as a lab retry-exhaustion signal; if all live lanes wall again, record it and stand down until the next wake.
7. **#792 (parked with #821)**: Maze Chase harness gaps; parked on the Owner capacity decision.
8. **#745 (parked)**: owner-PAT env extension, `CONFLICTING` at `7a04fa4a`, behind #803.
9. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Held-run watch**: zero this run; re-check next wake.
13. **Stale verdict trap**: #804's review, Tester, and eval verdicts must all bind the new lab head; #832's must bind `627178e7` or its successor; #837's must bind the post-rebase head (the 01:27:33Z Tester approval and the 9.7 eval rejection are stale). #839 is merged and closed. The R21/R22/R30 gate enforces head freshness; do not merge on any stale verdict.
14. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
15. **Model watch**: the registry serves 84 models; the 1M-context free models noted by the Auditor await a benchmark pass after the infra queue clears. No pin or rung change needed.
16. **Overlap and duplicate-dispatch noise**: this window carried two concurrent Maintainer wakes on adjacent threads: the #837 session `42749836882` posted the cross-lane standby at 03:35:57Z and its status at 03:36:11Z, while this #832 session surveyed and stood down; the #804 session `42750169857` is still live with `42750176144` pending. Keep-both memory and duplicate comments are expected. Before any dispatch, re-read the target thread's trigger history; a sibling session may have acted while another slept through a cooldown.
17. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; on a PR-comment wake the trigger is the PR number, producing a self-referential `Closes <PR>` in the body. Fix through the Lab Engineer (append `Refs` for PR triggers, keep `Closes` for issue triggers) when the #832 review forwards the body finding; never patch the body or workflow by hand.
18. **Board pin**: #70 is pinned and verified.
19. **#831 scratch canary**: needs a disposable PR that only the Owner (or a pushed branch) can create; never claim it done without live evidence or a recorded Owner waiver.
20. **General mid-body wake noise**: the evaluator verdict comment contains the tester marker mid-sentence, so the general arm wakes spuriously; ride along in the deferred #822 residuals pass.
21. **Preview-flow wake noise**: the pages preview deploy is followed by an opencode-pr-trigger wake on the PR; expected and normally finds the lanes live, so it should stay a standby wake.
22. **Pages verification**: the current production tip is `3f6c5d5e` (deploy `42750048250` green at 03:31:58Z); the #832 preview `42750035629` is green on `627178e7`. The prior tip `675658cb` deployed green at 02:04Z.
23. **The 1.19.5 plugin boundary is reproduced (command-qualified)**: `opencode github run` (the arm) is gated by the opt-out through the legacy `ConfigPaths.directories` -> `ConfigPlugin.load` path; `opencode run` is not gated for plugins through the v2 config/plugin layer; the Evaluator's no-import negative was a bogus-model rc 1 before bootstrap; the Tester's `opencode run` canary is valid for that command. Keep the sanitizer as the primary closure for the `opencode run`/v2 path plus defense in depth for the arm.

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
- The lab workflow's linkage guard appends `Closes <trigger>` on a missing token; on PR-comment wakes that is a self-referential `Closes <PR>`. Route the fix through `lab` (use `Refs` for PR triggers); never edit the body by hand.
- Main's current audit numbering is R33 run-scalar budget and R34 quota-wall guard plus the #837 heartbeat guard under R34; the #804 block keeps its per-OS sanitizer rule under R34 (35 checks). The reviews rule on that.
- The expected App-token workflow push rejection on protected-path branches is wrapper noise; verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`) so an agent cannot export a different mode through `$GITHUB_ENV`.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #832 review verdict (`42750038276`) on `627178e7`. On approval the workflow forwards the read-only Tester; after the owner-authored approve-test marker dispatch `{"action":"eval","pr":832}`, and the PAT sweep lands it only with both fresh head-bound markers. If it returns `lab` for the body token, the forwarded pass fixes the linkage guard for PR triggers.
2. Read the #804 Lab Engineer result (`42750176170`) and the forwarded review; then the read-only Tester, the binding eval, and the PAT sweep. #798 closes on approve-eval.
3. Read the #837 review verdict (`42749823343`) on `f23877fe`; expect a mechanical `lab` rebase onto `3f6c5d5e`, then the fresh review, Tester, binding eval, and PAT sweep. #836 stays open.
4. If a lane hits the wall again, record the run and stand down until the next wake; do not chain same-IP retries. Do not dispatch a second pass while one is in progress; re-read the trigger history first.
5. Re-check held and queued runs, the trigger allowlist, the model ladder, and Pages/previews.
6. Keep #821 parked on the Owner capacity decision; keep #745 behind #803; #803 is next after the frozen lanes.
7. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #832 review accept the corrected claims, or does it flag the re-appended `Closes #832` and route another lab pass for the linkage guard?
2. Does the #804 Lab Engineer pass close the B10 `$GITHUB_PATH` finding with a test, so the Tester/eval chain can land the per-OS sanitizer work?
3. Do the fresh #837 and #832 passes land cleanly and advance to the Tester/eval chain, or does the wall strike again?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence)?
5. Will the Owner provide the disposable scratch PR (or a waiver) needed to close the #831 live canary ask?
