# STATE

Last updated: 2026-11-11T05:50Z by run 42967282691 (issue_comment wake on #842 from the Auditor's provider-overload finding; sibling run 42967285377 live on #843). Next-run priorities: read the #832 eval verdict, the #837 review after the rebase, the #804 review on `79909482`, the #842 lab result, and the #841 Tester result; confirm the sibling #843 lab dispatch landed.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:41-05:50Z on 2026-11-11)

- **main** = `3f6c5d5e66a1f33a92cb81ab09d71ecee5ca32eb`, unchanged since the #839 rebase merge. Linear on `675658cb`, no orphan.
- **Pages**: production deploy `42966782043` SUCCESS at 05:35:41Z; root and `/docs/` both HTTP 200; the #841 preview `42966702466` green at 05:35:00Z.
- **#832 (eval dispatched this run)**: head `627178e73727b762537465ce5b1e56bd67957053`, `MERGEABLE`/`CLEAN`, main is an ancestor, `closingIssuesReferences` empty. The owner-authored `/oc approve-test` marker (`6758979638`, 2026-11-10T04:27:27Z) is head-fresh (head push 03:30:58Z). The 2026-11-10 binding eval `42756557860` died on the wall at 04:36:20Z with no decision file and no marker; no later eval trigger exists. This run dispatched `{"action":"eval","pr":832}`. The body keeps a self-referential `Closes #832` (API list empty) and `Refs #831`; #831 stays open for the Owner scratch canary.
- **#837 (lab rebase dispatched this run)**: head `f23877fe4e7ac6c822a578911ff584786817ffb6` (`67c892b3` fail-closed heartbeat page validation plus R34 pins, `f23877fe` docs), `MERGEABLE`/`CLEAN`, main NOT an ancestor (two archive-only curate commits behind `3f6c5d5e`; base `675658cb`). Review `42749823343` died at the reviewer step's 90-minute cap at 05:00:19Z (2026-11-10) with no report; the verify step discarded the wrong-nonce leftover decision file and the nonce gate posted no auto-retry (the #843 defect). The dispatched lab pass is a mechanical rebase onto main, then the lab hands off to review.
- **#804 (review dispatched this run)**: head `7990948224e89686798b333a59e4cbde7ba5dadc` (`lab: reset trusted PATH in per-OS post-agent steps (issue #798 review B10)`), `MERGEABLE`/`CLEAN`, main IS an ancestor. Review `42757811169` (04:44:59Z) died on the wall at 04:45:25Z after 56 seconds; the lifetime retry class (#803) posted no auto-retry. A fresh head-bound review was dispatched on `79909482`.
- **#841 (Tester live)**: Curator PR for #840, head `9c9a1d46639b444e6b727453500ae300bf7f044e`, `MERGEABLE`/`CLEAN`, one-line `index.html:336` intake sync. Review approved at 05:37:52Z; `/oc test` at 05:38:00Z; Tester `42967036946` live since 05:38:03Z. No dispatch.
- **#842 (this run's target, lab dispatched)**: the 01:49:30Z schedule run `42941706174` died at 01:52:00Z on `AI_APICallError: The inference service is overloaded. Please try again later.` after the SDK's three attempts; both runner copies of `transient_http_error_terminal()` miss the wording. Lab instruction issued for both paths plus the R15 matrix and the R33 scalar budget.
- **#843 (sibling lane)**: the #837 review cap loss plus the R17 fixture writing the live `/tmp/random-lab-decision.json` path without a trap. Sibling maintainer `42967285377` is live on it; this run deliberately did not duplicate the lab dispatch.
- **#836 (open)**: the wall lane; the durable fix is #837 (heartbeat plus one-attempt quota recovery). The daily audit at 05:39:54Z reports about 25 hours of starvation; the post-midnight window is serving runners again (Auditor pass, sibling, this session).
- **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` `MERGEABLE`/`CLEAN` but behind main, parked on the Owner capacity decision. **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` `CONFLICTING`/`DIRTY`, parked behind #803.
- **Open issues** (24): new #840 (Curator, fixed by #841), #842/#843 (Auditor, this window); #836 tracks the wall, #831 tracks #832, #798 tracks #804. No other untriaged issue and no new human directive.
- **Held runs**: zero `action_required`. **Queued**: only the four documented inert runs (`37344324101`, `36101155868`, `36101155851`, `36101155844`). **In progress**: this run, sibling `42967285377`, Tester `42967036946`.
- **Failure scan** (234 runs since 2026-11-10T05:00Z): 11 failures, all wall-class (maintainer/curator recovery caps and their intakes, recorded on #836) except `42941706174`, the overload-wording death routed to the lab. The 05:35-05:40 cancelled/skipped maintainer runs are comment fan-out, not failures.
- **Trigger allowlist**: exact 19/19 against the live repo-owned names outside the self-excluded `maintainer` and the three GitHub-managed names (`Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`).
- **Model watch**: the registry serves 85 models; the pin `opencode/deepseek-v4.1-flash-free` plus `mimo-v2.6-flash-free`, `glm-5.3-flash-free`, and `nemotron-3.5-lightning-free` are live free entries. No retirement, no pin change.
- **Checkout note**: this is an issue-comment wake on #842, so the checkout is the trusted default branch; the staged prompt remains authoritative. This session wrote only `.maintainer/` outputs.

## The live lanes (do not duplicate)

1. **#832** - binding eval dispatched on the Tester-approved `627178e7`. On `approve-eval`, the eval workflow publishes the owner-authored `eval-verdict: approve-eval` marker bound to the head and this `/oc eval` trigger; the PAT sweep lands the PR only with both fresh head-bound markers. On `fix`, route `lab` (infrastructure PR), never `fix`/`continue`. #831 stays open for the Owner canary.
2. **#837** - lab rebase onto `3f6c5d5e` dispatched; the lab pushes and hands off to the Reviewer. Then the read-only Tester, the binding eval, and the PAT sweep. #836 stays open. The 01:27:33Z Tester approval and the 9.7 eval rejection are stale for the rebased head.
3. **#804** - fresh review dispatched on `79909482` (the B10 PATH fix). Findings -> `lab`; approval -> read-only Tester, binding eval, PAT sweep. #798 closes on approve-eval. All verdicts on older heads (`947482ca`, `0872b94c`) are stale.
4. **#841** - Tester `42967036946` live; on approval the test workflow hands back `/oc maintainer`, then the binding eval, then the PAT sweep. #840 closes on merge. Do not dispatch a duplicate review/test.
5. **#842** - lab dispatched on the overload-wording detector gap and the R15 extension. Then review, Tester, eval, PAT sweep.
6. **#843** - sibling maintainer `42967285377` owns it; expect a lab dispatch for review-cap headroom plus the R17 fixture trap. Do not duplicate next wake unless the sibling died without a trigger.
7. **#821** - parked on the Owner capacity decision. Do not spend a fresh review until the decision is given.
8. **#745** - parked behind #803.

## The serialized infra queue

1. #832: binding eval live on the Tester-approved `627178e7`; on `approve-eval` the PAT sweep merges (workflow-touching PR); #831 stays open for the scratch canary.
2. #837: mechanical rebase live; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep; #836 stays open.
3. #804: fresh review live on the B10 fix; then the read-only Tester, the binding eval, and the PAT sweep; #798 closes on approve-eval.
4. #842: overload-wording lab pass; then review, Tester, eval, PAT sweep.
5. #843: review-cap headroom plus the R17 fixture trap (sibling lane).
6. #803: lifetime retry budgets; next infra item after the live lanes land; unblocks #745. The #837 review cap death is a live instance of this class.
7. #821 is parked on the Owner capacity decision; #745 behind #803.
8. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#832 (eval live)**: project-config loading plus the CLI plugin import guard. The Tester approved `627178e7` at 2026-11-10T04:27:27Z (owner-authored, head-fresh) after the command-qualified 1.19.5 boundary, the seven-row canary matrix, and the regenerated R26/R31 pins. The eval died on the wall and is re-dispatched. Residue: the body's self-referential `Closes #832` and three editorial nits; the Owner-requested scratch PR-comment canary is still unexecuted, so the PR keeps `Refs #831` and #831 stays open. If the eval returns `fix`, the forwarded lab pass takes it, never `fix`/`continue`.
2. **#837 (lab rebase live)**: the heartbeat and one-attempt quota recovery. The branch is two archive-only commits behind main, so the mechanical rebase comes first; the f23877fe content (fail-closed heartbeat run-page validation plus the R34 cutoff/divisor pins) is unchanged by the rebase. The post-rebase head needs the full fresh chain: review, Tester, binding eval, PAT sweep.
3. **#804 (review live)**: the B10 fix resets the trusted PATH in the per-OS post-agent steps. The review must verify it with a test, not just a wording change, and must clear the earlier eval notes (PR-body delegation ledger length, foreign-identity residual, helper-level `GIT_CONFIG_COUNT`/`BASH_ENV` unset, "R1-R34" banner label) as post-merge follow-ups where they remain non-blocking.
4. **#841 (Tester live)**: the Curator's one-line landing-page intake sync for #840. The review approved at 05:37:52Z on the PR preview (HTTP 200). The Tester approval then routes the binding eval and the PAT sweep lands it; #840 closes on merge.
5. **#842 (lab live)**: the overload wording (`The inference service is overloaded. Please try again later.`) must join the shared transient HTTP detector in both runner paths, with the R15 matrix extended and the #669/#754 fast-fails untouched. This is a bounded same-model retry, not a new class.
6. **#843 (sibling live)**: the reviewer 90-minute cap can be exhausted by the audit alone, and the R17 CR fixture at `.github/scripts/silent-stall-audit.sh` writes the live decision path without a trap. Both need a lab fix; the reviewer cap raise must keep the job cap above the step cap.
7. **The wall (issue #836)**: the 2026-11-09 evening and 2026-11-10 deaths killed 11 runs; the post-midnight 2026-11-11 window is serving again. Do not treat repeated wall deaths as a lab retry-exhaustion signal; if all live lanes wall again, record it and stand down until the next wake. The Owner capacity decision is the critical path.
8. **#792 (parked with #821)**: Maze Chase harness gaps; parked on the Owner capacity decision.
9. **#745 (parked)**: owner-PAT env extension, `CONFLICTING` at `7a04fa4a`, behind #803.
10. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
11. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
12. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
13. **Held-run watch**: zero this run; re-check next wake.
14. **Stale verdict trap**: #832's eval marker must bind `627178e7` and be newer than the 2026-11-10T04:27:27Z tester verdict and the new eval trigger; #837's verdicts must bind the post-rebase head (the 01:27:33Z Tester approval and the 9.7 eval rejection are stale); #804's review, Tester, and eval verdicts must all bind `79909482` at minimum. #839 is merged and closed. The R21/R22/R30 gate enforces head freshness; do not merge on any stale verdict.
15. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
16. **Model watch**: the registry serves 85 models; the 1M-context free models noted by the Auditor await a benchmark pass after the infra queue clears. No pin or rung change needed.
17. **Overlap and duplicate-dispatch noise**: the 05:35-05:40 fan-out spawned dozens of cancelled/skipped maintainer wakes and a sibling maintainer run on #843; keep-both memory and duplicate comments are expected. Before any dispatch, re-read the target thread's trigger history; a sibling session may have acted while another slept through a cooldown.
18. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; on a PR-comment wake the trigger is the PR number, producing a self-referential `Closes <PR>` in the body. #832 still shows it, though the API closing list is empty. Fix through the Lab Engineer (append `Refs` for PR triggers, keep `Closes` for issue triggers) when a review forwards the body finding; never patch the body or workflow by hand.
19. **Board pin**: #70 is pinned and verified; the Auditor's 2026-11-11 daily pass posted at 05:39:54Z and opened #842/#843.
20. **#831 scratch canary**: needs a disposable PR that only the Owner (or a pushed branch) can create; never claim it done without live evidence or a recorded Owner waiver.
21. **General mid-body wake noise**: the evaluator verdict comment contains the tester marker mid-sentence, so the general arm wakes spuriously; ride along in the deferred #822 residuals pass.
22. **Preview-flow wake noise**: the pages preview deploy is followed by an opencode-pr-trigger wake on the PR; expected and normally finds the lanes live, so it should stay a standby wake.
23. **Pages verification**: production tip `3f6c5d5e` (deploy `42966782043` green 05:35:41Z), root and `/docs/` 200; #841 preview green on `9c9a1d46`; #832 preview green on `627178e7`; #837 preview green on `f23877fe`; #804 preview green on `79909482`.
24. **The 1.19.5 plugin boundary is reproduced (command-qualified)**: `opencode github run` (the arm) is gated by the opt-out through the legacy `ConfigPaths.directories` -> `ConfigPlugin.load` path; `opencode run` is not gated for plugins through the v2 config/plugin layer; the Evaluator's no-import negative was a bogus-model rc 1 before bootstrap; the Tester's `opencode run` canary is valid for that command. Keep the sanitizer as the primary closure for the `opencode run`/v2 path plus defense in depth for the arm.

## Standing rules I operate under

- Never post triggers; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue, and re-check live trigger history immediately before dispatching because concurrent sessions can double-post.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#832, #804, #837, #842's PR) never take `fix`/`continue`; route `lab`. The eval verdict action `fix` on an infrastructure PR routes `lab`, never `fix`/`continue`. Docs/product lanes may take `fix` if the review returns findings.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward. Two dispatches of the same tip are idempotent and harmless.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups. A zero-job startup failure in a declared platform incident is an external class: re-dispatch each consumed trigger once after the incident clears instead of incrementing a lab retry count.
- Duplicate queued runs from concurrent sessions are cancelled with `gh run cancel` (job token holds `actions: write`) so one pass per lane remains; a `cancelled` conclusion never summons `workflow_run` triage.
- The #754 wall is a pool-wide fresh-run lottery, not a retry-exhaustion signal: no lab dispatch for the wall itself, no ladder advance, one fresh pass per lane after the cooldown; repeated multi-hour walls are an Owner capacity question. The #836/#837 lane owns the durable mitigation (heartbeat plus one-attempt cap).
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first (the #843 lane).
- A wall death or a nonce-gate cap death at the lifetime review auto-retry cap (issue #803) means the workflow cannot self-retry: the Maintainer must post a manual head-bound review after the cooldown.
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

1. Read the #832 binding eval verdict and its published marker. `approve-eval` -> the PAT sweep lands `627178e7`; `fix` -> route `lab`; #831 stays open.
2. Read the #837 lab rebase result and the forwarded review; then the read-only Tester, binding eval, and PAT sweep. #836 stays open.
3. Read the #804 fresh review verdict on `79909482`; findings -> `lab`; approval -> Tester, binding eval, PAT sweep. #798 closes on approve-eval.
4. Read the #842 lab result; then review, Tester, eval, PAT sweep.
5. Read the #841 Tester result; on approval the test workflow hands back `/oc maintainer`, then the binding eval and PAT sweep; #840 closes on merge.
6. Confirm the sibling #843 lane posted its lab dispatch; if it died with no trigger, dispatch `lab` on #843 next wake.
7. If a lane hits the wall again, record the run and stand down until the next wake; do not chain same-IP retries. Do not dispatch a second pass while one is in progress; re-read the trigger history first.
8. Re-check held and queued runs, the trigger allowlist, the model ladder, and Pages/previews.
9. Keep #821 parked on the Owner capacity decision; keep #745 behind #803; #803 is next after the frozen lanes.
10. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
11. Record the Owner capacity decision when given; it remains the critical path against the daily wall. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the new overload-wording retry fire on a live recurrence, and does the extended R15 stay load-bearing?
2. Does the #832 binding eval return `approve-eval` on `627178e7`, so the PAT sweep can land it without another wall death?
3. Does the #837 mechanical rebase clear, and does the fresh review approve the heartbeat/one-attempt content?
4. Does the #804 B10 PATH fix pass a fresh review, and does the per-OS chain then advance to the Tester and eval?
5. Does the sibling #843 lane close the review-cap and R17-fixture defects, and will the Owner take the capacity decision on #836?
