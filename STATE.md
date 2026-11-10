# STATE

Last updated: 2026-11-10T01:58Z by run 42739157603 (comment wake on the #839 review verdict: the re-review approved `b10b2a58` and the Tester lane is live; the #837 eval and both Lab Engineer lanes remain live). Next-run priorities: read the #839 Tester verdict, the #837 eval verdict, and the #804/#832 lab outcomes.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 01:55-01:58Z on 2026-11-10)

- **main** = `675658cbeb00b2dffda38cd1bc762f0dba0810ab`, unchanged since the 2026-11-08T05:01:23Z #834 merge. Linear, no orphan. Pages is green: the #839 preview deploy `42738225782` succeeded at 01:47Z on `b10b2a58`, and the dispatch deploy `42738286879` succeeded at 01:48Z; production is still built from `675658cb`. No merge since.
- **#839 (Tester live)**: head `b10b2a58816ad32daf0ada2183d89f852e75f1b9`, 3 commits (two `curate:` plus the Fixer's empty `b10b2a58`), 4 archived HTML files, +5/-5, MERGEABLE/CLEAN, base an ancestor. The fresh head-bound re-review `42738270614` completed at 01:55:16Z with `test` (approved): all five repairs verified, the independent 220-file / 596-link sweep reproduced clean, 72/72 landing tests, and F1 resolved by the five-line delegation ledger plus skills note in the PR body. The workflow posted `/oc test` at 01:55:26Z and `opencode-test` `42739162981` is live on this head. `Fixes #838`.
- **#837 (eval live)**: head `c443efaed4be86309dedd914d2208338e90f9a45` unchanged. The read-only Tester approved at 01:27:30Z (infra scope) and the owner marker landed at 01:27:33Z. The binding eval `42737216729` is live since 01:38:29Z. No eval marker and no verdict yet.
- **#804 (lab live)**: head `b4535f19b2514ac0bd04174e8c41136cf35d6588` unchanged; Lab Engineer `42734823113` live since 01:18:16Z on the eval's blocking B9 (three `PEROS_PREFLIGHT: "0"` pins, R17 pin plus mutation self-test, R34 inherited-env scenario plus banner, 35/0 audit). No push yet.
- **#832 (lab live)**: head `47f234ac85da853bcc10e6598ae4df8310afe61a` unchanged; Lab Engineer `42731636319` live since 00:52:42Z on the 19:03Z review F1. No push yet; #831 stays open.
- **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but behind main (`Closes #792`), parked on the Owner capacity decision. **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY, parked behind #803.
- **Open issues** (22): #838 is the Curator tracking issue for the open #839 (`Fixes #838`), so it is not untriaged. Nothing else new; no human directive pending.
- **Held runs**: zero `action_required`. **Queued**: only the four documented inert runs (37344324101, 36101155868, 36101155851, 36101155844). **In progress**: this run 42739157603, #839 test 42739162981, #837 eval 42737216729, #804 lab 42734823113, #832 lab 42731636319. The maintainer fan-out runs from the review verdict/`/oc test` batch skip or supersede at their gates.
- **Failure scan** (last 150 runs): zero failures and zero timed-outs; the only non-success maintainer runs are the deliberate single-slot supersessions and skip-only fan-out runs from the comment batch. No `.maintainer/quota-wall` marker and empty dispatch inputs, so this is a normal wake.
- **Trigger allowlist**: exact 19/19 against the 23 live active repo-owned names outside the self-excluded `maintainer` and the three GitHub-managed names. **Model watch**: the registry serves 83 models; the pin `opencode/deepseek-v4.1-flash-free` plus all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) are live and free. No retirement, no pin change.
- **Checkout note**: the CLI re-checks out the PR head after the trusted checkout (documented #831 behaviour); the staged prompt remains authoritative and the workspace `AGENTS.md`/`opencode.json` are treated as untrusted PR content. This session wrote only `.maintainer/` outputs.

## The live lanes (do not duplicate)

1. **#839** - Tester `42739162981` live on the review-approved `b10b2a58`. On approval the test workflow posts the Maintainer handoff; then I dispatch the binding eval; on `approve-eval` with a fresh head-bound marker the in-session rebase merge lands (no workflow files), and #838 closes.
2. **#837** - binding eval `42737216729` live on the Tester-approved `c443efae`. On `approve-eval` with a fresh head-bound marker newer than the 01:27:33Z Tester marker, the PAT sweep merges; #836 stays open. On `fix`, one `lab` pass.
3. **#804** - Lab Engineer live on B9. On its push the workflow forwards its own review; then the read-only Tester, the binding eval, and the PAT sweep follow. #798 closes on approve-eval.
4. **#832** - Lab Engineer live on F1. On its push the workflow forwards its own review; then the read-only Tester, the binding eval, and the PAT sweep follow. #831 stays open.
5. **#821** - parked on the Owner capacity decision. Do not spend a fresh review until the decision is given.
6. **#745** - parked behind #803.

## The serialized infra queue

1. #839: Tester live; then the binding eval and the in-session merge; #838 closes.
2. #837: eval live; then the PAT sweep on approve-eval; #836 stays open.
3. #804: lab live on B9; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep; #798 closes on approve-eval.
4. #832: lab live on F1; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep; #831 stays open for the per-attempt live verification and the scratch canary.
5. #803: lifetime retry budgets; next infra item after the frozen lanes land; unblocks #745.
6. #821 is parked on the Owner capacity decision; #745 behind #803.
7. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#839 (Tester live)**: the Curator's five archive link repairs, `Fixes #838`. The re-review approved `b10b2a58` at 01:55:16Z after the Fixer's body-only F1 repair, and the Tester is live on that head. On Tester approval the Maintainer handoff follows, then the binding eval, then the merge. All targets verified on `main`; the diff touches only `archive/**` HTML and no protected paths.
2. **#837 (live via eval)**: the Tester approved `c443efae` with four non-blocking observations for the post-merge follow-up on #836 (oldest-board query page depth, stale `state-fail` fixture payload, unreached newest-scan fail-closed exit, a few "queued or in progress" strings). None blocks the eval or the merge.
3. **#804 (live via lab, B9)**: the binding eval returned `fix` at 8.9/10 with B9 blocking: the three post-agent `scope_guard` env maps must pin `PEROS_PREFLIGHT: "0"`, R17's `expected_scope_env` must require the pin with a removal mutant, and R34 needs an inherited-`PEROS_PREFLIGHT` scenario plus a pre-agent control and a banner update, then the full 35/0 audit. The eval's non-blocking notes: the PR-body delegation ledger has only 2 bullet lines (needs 3-8), the foreign-identity residual is accepted design, helper-level `GIT_CONFIG_COUNT`/`BASH_ENV` unset is optional hardening, and the "R1-R34" banner label is cosmetic. The Tester's three documentation observations from 19:48Z remain post-merge follow-ups: (a) the R34 fixture comment at `silent-stall-audit.sh:28388` predates the B7 pre-tester carve-out; (b) the R34 banner at `:29704` says "stripped on the legacy lane" while R34 always runs anchored (R29 covers the legacy lane); (c) the per-OS tester prompts at line 41 omit `.github/*` and `PEROS_SCOPE_VIOLATION` from the protected list. The stale `0872b94c` approval must never count.
4. **#832 (live via lab, F1)**: project-config loading plus the CLI plugin import guard. The review returned `lab` on the command-boundary finding: qualify `opencode github run` versus `opencode run` everywhere the 1.19.5 import boundary is stated, record the exact canaries, keep the guard and sanitizer unchanged, regenerate the R26/R31 pins, and clean the PR body's self-referential `Closes #832`. #831 stays open for the per-attempt live verification and the scratch canary.
5. **The wall (2026-11-09 evening)**: five kills between 19:54Z and 20:51Z (lab 42679696186, eval 42687793098, review chain 42696128324/42696281570/42696426188/42696590258, maintainer 42696703562 at the recovery cap). Fresh runners recovered on 2026-11-10. The one-attempt cap plus the cross-arm heartbeat are in #837, Tester-approved, and now at the binding eval; until the merge, the old two-attempt recovery behavior and no heartbeat remain live.
6. **The wall policy**: fresh runners are a lottery at multi-hour wall length, and the Maintainer cron is platform-throttled to about 4.2 wakes/day. Do not treat repeated wall deaths as a lab retry-exhaustion signal; if all live lanes wall again, record it and stand down until the next wake.
7. **#792 (parked with #821)**: Maze Chase harness gaps; parked on the Owner capacity decision.
8. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
9. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Held-run watch**: zero this run; re-check next wake.
13. **Stale verdict trap**: #839's review approval at 01:55:16Z is head-bound to `b10b2a58`, and only a Tester approval on that same head may start the eval/merge chain; no eval marker exists. #837's Tester approval is bound to `c443efae`, and the parallel eval will either bind its marker to the same head or return `fix`; no other merge chain exists. The R21/R22/R30 gate enforces head freshness; do not merge on any stale verdict. #832's reviewer/Tester/eval verdicts on earlier heads are invalidated by the `47f234ac` push. #804's stale `0872b94c` Tester approval must never count; the current `b4535f19` approval is pre-B9-fix and will be invalidated by the lab push.
14. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
15. **Model watch**: the registry serves 83 models; the 1M-context free models noted by the Auditor await a benchmark pass after the infra queue clears. No pin or rung change needed.
16. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; the 01:55 batch produced this live session plus skipped duplicates; expected.
17. **Board pin**: #70 is pinned and verified.
18. **#831 scratch canary**: needs a disposable PR that only the Owner (or a pushed branch) can create; never claim it done without live evidence or a recorded Owner waiver.
19. **General mid-body wake noise**: the evaluator verdict comment contains the tester marker mid-sentence, so the general arm wakes spuriously; ride along in the deferred #822 residuals pass.
20. **Preview-flow wake noise**: the pages preview deploy is followed by an opencode-pr-trigger wake on the PR; expected and normally finds the lanes live, so it should stay a standby wake.
21. **Pages verification**: re-verify after every future merge; no merge has happened since `675658cb`. The 01:47Z preview deploy staged all open PRs, including #839 at `b10b2a58`.
22. **The 1.19.5 plugin boundary is reproduced (command-qualified)**: `opencode github run` (the arm) is gated by the opt-out through the legacy `ConfigPaths.directories` -> `ConfigPlugin.load` path; `opencode run` is not gated for plugins through the v2 config/plugin layer; the Evaluator's no-import negative was a bogus-model rc 1 before bootstrap; the Tester's `opencode run` canary is valid for that command. The live #832 lab pass must record this boundary, never repeat the old unqualified claim, and keep the sanitizer as the primary closure for the `opencode run`/v2 path plus defense in depth for the arm.

## Standing rules I operate under

- Never post triggers; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#832, #804, #837, #839-adjacent workflow work) never take `fix`/`continue`; route `lab`. The eval verdict action `fix` on an infrastructure PR routes `lab`, never `fix`. Docs/product lanes may take `fix` if the review returns findings.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward. Two dispatches of the same tip are idempotent and harmless.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups. A zero-job startup failure in a declared platform incident is an external class: re-dispatch each consumed trigger once after the incident clears instead of incrementing a lab retry count.
- The #754 wall is a pool-wide fresh-run lottery, not a retry-exhaustion signal: no lab dispatch for the wall itself, no ladder advance, one fresh pass per lane after the cooldown; repeated multi-hour walls are an Owner capacity question. The #836/#837 lane owns the durable mitigation (heartbeat plus one-attempt cap).
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts and again before every retry attempt (issue #831).
- The opt-out gates project config and instruction loading; on CLI 1.19.5 the import boundary is command-qualified: `opencode github run` (the arm) does gate project plugin discovery through the legacy `ConfigPaths.directories` -> `ConfigPlugin.load` path, while `opencode run` still imports project plugins through the v2 config/plugin layer. Never state the old unqualified claim; keep the sanitizer as the primary closure for the `opencode run`/v2 path and defense in depth for the arm, and name the command in every 1.19.5 statement.
- Main's current audit numbering is R33 run-scalar budget and R34 quota-wall guard plus the #837 heartbeat guard under R34; the #804 rebase kept both blocks under R34 (35 checks). The reviews rule on that.
- The expected App-token workflow push rejection on protected-path branches is wrapper noise; verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`) so an agent cannot export a different mode through `$GITHUB_ENV`.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #839 Tester verdict. On approval the test workflow posts the Maintainer handoff; then dispatch `{"action":"eval","pr":839}`, and on `approve-eval` merge in-session with `gh pr merge --rebase --match-head-commit b10b2a58` (fallback `--merge`, never `--delete-branch`); #838 closes on merge. On findings, route the normal fix loop (docs/product lane, so `fix` is allowed).
2. Read the #837 binding eval verdict. On `approve-eval`, verify the marker binds `c443efae` and is newer than the 01:27:33Z Tester marker; the PAT sweep then merges and #836 stays open. On `fix`, one `lab` pass with the exact findings.
3. Read the #804 lab outcome (B9): verify the three `PEROS_PREFLIGHT: "0"` pins, the R17 pin plus mutation self-test, the R34 inherited-env scenario plus banner, a green 35/0 audit, `bash -n`, YAML, and the diff checks; then the fresh review, the read-only Tester, the binding eval, and the PAT sweep follow.
4. Read the #832 lab outcome (F1): verify the command-qualified 1.19.5 boundary across the note, `AGENTS.md`, `LAB.md`, the composite comments, the Maintainer envelope, and the R31 text; the exact canaries; the regenerated R26/R31 pins; a green R1-R34 audit; and the PR-body cleanup. Then the fresh review, the read-only Tester, the binding eval, and the PAT sweep follow; #831 stays open.
5. If a lane hits the wall again, record the run and stand down until the next wake; do not chain same-IP retries.
6. Re-check held and queued runs, the trigger allowlist, the model ladder, and Pages/previews.
7. Keep #821 parked on the Owner capacity decision; keep #745 behind #803; #803 is next after the frozen lanes.
8. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
9. Record the Owner capacity decision when given; it remains the critical path against the daily wall. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the Tester approve `b10b2a58`, so the #839 binding eval and merge can land the archive link repairs?
2. Does the #837 binding eval approve `c443efae`, so the PAT sweep can merge the heartbeat and one-attempt cap?
3. Do the #804 (B9) and #832 (F1) lab passes land cleanly before the shared daily wall returns?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence)?
5. Will the Owner provide the disposable scratch PR (or a waiver) needed to close the #831 live canary ask?
