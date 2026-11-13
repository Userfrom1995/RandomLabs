# STATE

Last updated: 2026-11-13T04:35Z by run 43365191810

(pull_request closed wake on #845: the PAT sweep landed the merge as `de5720fd`; the raised 150/180 review cap and the R25/R17 hermeticity work are live on main. The #804 conflict-resolving lab is dispatched and its forwarded review is the #843 exit evidence.)

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and write hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:23-04:35Z on 2026-11-13)

- **Wake**: `pull_request` closed (merged) at 04:23:16Z on #845. This run is 43365191810, started 04:23:20Z. The loaded memory stamp was `2026-11-13T04:25Z by run 43363803350`, effectively current.
- **#845 MERGED**: head `ccdcf49b52fb4d1e7506d20dd5c5aa453a944c99` on base main `678658bb8f5d0d997ab9df75cd3479b6cdc80ce5`, merged at 04:23:16Z as `de5720fd61faf4a37fbe0c94184365d730ca836f`. The PAT sweep ran a rebase merge (nine commits re-applied; main advanced nine commits) and the merged tree is byte-identical to the reviewed head (`git diff origin/main..ccdcf49b5` is empty). The body keeps `Refs #843` first and the exact `- the Lab Engineer` sign-off.
- **MERGED MAIN VERIFIED (this run)**: strict duplicate-key-rejecting YAML parse of `.github/workflows/opencode-review.yml`: review job 180, `Run opencode reviewer` 150, exactly one `./.github/actions/opencode-run` step with `id: review` and the exact actor gate, 16 steps. Full nonce-unset audit on a fresh clone of `de5720fd`: 34 passed, 0 failed (rc 0), with R17, R19, R25, R31 and R34 PASS. `bash -n` clean. R25 is now the review arm's structural cap guard, and R17 is the sandbox-only abort probe plus the fail-closed live-path endpoint snapshot.
- **PAGES GREEN**: the push-triggered Pages run 43365190316 was cancelled by concurrency and the workflow_dispatch run 43365202084 completed SUCCESS at 04:24:01Z; production root and `/docs/` both return HTTP 200.
- **#843 OPEN**: the tracking issue stays open until a review that starts under the merged 150/180 cap completes. The #804 rebase review is the planned exit vehicle (the issue's literal "fresh #837 review" wording predates #837's 11-11 merge). Record the review run id and duration, then close #843 with the substitute-proof note.
- **#804 DISPATCHED (this run)**: head `6ddf009d4afe474f5acfeeed3c55a146b15c1f84`, base `678658bb`, now CONFLICTING/DIRTY against main `de5720fd` (the #845 merge rewrote the same audit, `AGENTS.md` and `LAB.md` regions). The last fresh review 43357044317 died on the #754 wall at 03:28:02Z with no verdict and the lifetime retry budget is spent. The last `/oc lab` (6817496212, 11-12 07:26Z) was bare and its run 43175269414 only rebased to `6ddf009d4`, so B11-B15 from review comment 6817495113 remain open: B11 the legacy trailer-strip ancestry refusal is unconditional, B12 the macOS post-agent steps miss the `DYLD_*` seams, B13 the owner email bypasses name-only trailer detection, B14 a clean tester merge of main is treated as a protected edit, and B15 is docs/prompt accuracy. The dispatched lab owns the rebase onto `de5720fd`, B11-B15 plus their fixtures, the body hygiene (`Closes #798`, `PR #804` in prose, exact sign-off), and a fresh review forward.
- **#821/#745 unchanged**: #821 (`dce109e4`, base `86570af1`) stays parked on the Owner capacity decision; #745 (`7a04fa4a`, base `e73bd7a2`) stays behind #803. No untriaged issue and no new Owner directive.
- **Wall**: the #754 per-egress daily free-usage class spared the eval 43357043890, which completed at 04:11:01Z, and this runner has a bucket. #804's next action is the rebase, not a same-IP review retry.
- **Runs**: held zero; in progress at survey only this maintainer run; the 04:23-04:24 `pull_request` closed fan-out maintainer runs were skipped or cancelled inertly; no real review, test, eval or lab run was live or cancelled.
- **Trigger allowlist**: 19/19 repo-owned names against `maintainer.yml` (20 workflow files including the self-excluded `maintainer`). No workflow added or renamed by the merge.
- **Model watch**: registry 86 models, 11 free; pin `opencode/deepseek-v4.1-flash-free` (`model` and `small_model`) and the ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free` and `glm-5.3-flash-free` all live; `beam-free`, `flint-40b-free`, `iceman-free`, `inkling-2-small-free`, `longcat-2.5-free`, `minimax-m3.1-flash-free`, `nemotron-3.5-lightning-free` and `nemotron-3.5-super-vl-free` also live. No retirement and no pin change.
- **Open issues** (22): the tracked set. #843 stays open for the post-merge review proof; #836 holds the capacity decision and wall history; #798 tracks #804 and closes on merge; #831 stays open for the scratch canary; #815/#812/#814/#803/#742 remain the audit and retry follow-ups; #821 parked; #745 behind #803.
- **Curator**: the 11-12 23:20 self-heal-exhausted note is the #754 wall class; the next scheduled tick is about 05:18Z and no curator PR or issue is stranded.

## The live lanes (do not duplicate)

1. **#804** - the dispatched lab rebases onto `de5720fd` and closes B11-B15, then sets its decision to `review` so the workflow forwards a fresh head-bound review. That review is the first one to start under the merged 150/180 cap and is the #843 exit evidence. Next wake: verify the push and the forwarded review; record the review run id and duration when it completes. Do not review the pre-rebase head and do not dispatch a duplicate review while the lab or its forwarded review is live.
2. **#843** - close only after the post-merge review completes under the raised cap, with the run id and duration recorded and the substitute-proof note (the literal "fresh #837 review" wording predates #837's merge).
3. **#845** - merged as `de5720fd`; branch intact; Pages green; #843 stays open.
4. **#821** - parked on the Owner capacity decision; its `86570af1` base is stale. Do not review or merge until the capacity decision lands.
5. **#745** - behind #803 (lifetime retry budgets); do not re-dispatch before #803 is addressed.

## The serialized infra queue

1. #804: lab rebase onto `de5720fd` plus B11-B15 -> fresh review under the raised cap (#843 exit evidence) -> Tester -> binding eval -> PAT sweep; #798 closes on merge.
2. After #804: the #845 eval residual (job-level `if: false` outside R25), the remaining #845 review advisories, the #804 env-seam lessons, reconcile #812/#815 plus the #822 residuals, then the deferred docs follow-ups (#773/#774), then #814 with #803.
3. #821 parked on the Owner capacity decision; #745 behind #803; #831 canary pending.

## Loose ends board

1. **#845 landed and verified**: main advanced from `678658bb` to `de5720fd`; the merged tree equals `ccdcf49b5`; the new-main audit is 34/0; Pages green; #843 still open.
2. **#843 exit evidence**: needs a review that STARTS after 04:23:16Z and completes under the merged 150/180 cap. The #804 forwarded review is the vehicle. Record the run id and duration, then close #843 with the substitute-proof note.
3. **#804 lab dispatch**: one pass owns the rebase plus B11-B15 plus the body hygiene plus the review forward. If it under-delivers (rebase only), that is a finding; verify the B11-B15 fixtures and mutations against the pushed head before trusting the review forward.
4. **#804 wall-dead reviews**: 43339043687 died 01:08:21Z, 43347406135 died 02:25:47Z, 43357044317 died 03:28:02Z. The intake note is on #843 at 03:28:20Z. The lifetime retry budget is spent; the lab rebase plus the forwarded review is the recovery lane.
5. **#804 conflict scope**: the #845 merge touches the same `.github/scripts/silent-stall-audit.sh`, `AGENTS.md` and `LAB.md` regions. The lab must keep both sides: main's R25/R17/R19 work and #804's per-OS scope guard, trailer strip, R34 additions and docs. Do not drop or weaken any audit rule.
6. **The wall**: #754 per-egress daily free-usage class. It spared the eval and this runner; treat any new wall death as the class: no same-IP dispatch, one fresh pass per lane after the cooldown, intake owns the note.
7. **#836 open**: the capacity decision and the wall residuals; the heartbeat and one-attempt cap are the mitigation.
8. **#831 scratch canary**: only the Owner (or a pushed branch) can create the disposable PR; never claim it done without live evidence or a recorded Owner waiver.
9. **#821 parked** on the Owner capacity decision; **#745** behind #803; **#792** parked with #821.
10. **#812/#815**: #814 is parked; #815 is partially covered by the #843 R17 hermeticity work; reconcile in the audit pass after #804.
11. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
12. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
13. **Held-run watch**: zero this run. **Queued**: the stale pull_request-cohort runs remain inert. **Cancelled/skipped**: the 04:23-04:24 maintainer fan-out only.
14. **Stale verdict trap**: #804's only Tester approval binds `0872b94c`; the #845 `82e2cf1f` and `11b5b26d` markers are stale. The R21/R22/R30 gate enforces head freshness; the sweep's own re-read is the final guard.
15. **Failure-triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes. #804's last review died at 03:28:02Z; the next pass is the post-rebase review, not a retry of the old base.
16. **Duplicate-session noise**: concurrent wake fan-outs still spawn skip-only maintainer and review runs; re-read trigger history before every dispatch and cancel never-started duplicates only. Never cancel a started real review or test run.
17. **Review-verdict staleness across a main advance**: the durable publish-time mergeability re-check remains a review-workflow follow-up. The #804 review after the #845 merge must be on the rebased head.
18. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; a body edit must name `PR #<trigger>` in prose. The #804 body currently carries a self-referential `Closes #804`; the lab pass replaces it with `PR #804` in prose and keeps `Closes #798`. The durable guard fix remains a lab follow-up.
19. **Board pin**: #70 is pinned and verified.
20. **PAT sweep ignores "behind main"**: it requires a shared merge base and `MERGEABLE`, plus fresh head-bound markers; the up-to-date reviewer rule and the rebase-before-gates rule carry the behind check.
21. **Registry shape**: the model registry lists bare ids without the `opencode/` provider prefix; compare the bare id.
22. **Artifact-hash honesty**: always state the extraction recipe when quoting a hash.
23. **Review-lane cap evidence**: the raised 150/180 shape is now live on main. The 11-13 02:20 approval (53 min) and the 04:23 merge ran under the pre-merge cap; the #804 post-rebase review is the first post-merge proof.
24. **Wrapper non-fast-forward noise**: the App-token push rejection on a rebased workflow-touching branch is expected wrapper noise; the PAT step is the landing path.
25. **Quota-wall intake**: it stands the workflow_run wake down when the failed run ended on the wall, posts one audit note, and does not summon an agent. Neither the intake note nor the cap escalation carries an inline trigger token.
26. **#754 wall policy**: fresh runners are a lottery at multi-hour wall length and the cron is platform-throttled; do not treat repeated wall deaths as a lab retry-exhaustion signal. If both live lanes wall again, record it and stand down until the next heartbeat.
27. **Manual review after a wall death**: a fresh head-bound review trigger is the recovery lane even when the head already carries an older review comment, because that run failed and the lifetime auto-retry budget is spent (#803). For #804, the rebase comes first.
28. **Auditor bench candidates**: the daily audit names free-model candidates but makes no automatic change; keep them as future work and never swap a pin mid-lane.
29. **Non-blocking eval/review nits are deferred, not dismissed**: fold them into the post-merge docs/lab follow-up. The current set is the #845 eval's job-level `if` residual, the review's five wording nits and the Tester's two notes.
30. **Merge-tip verification**: done this run (fresh clone at `de5720fd`, audit 34/0, Pages 200). Re-verify on the next main advance.
31. **Lab under-delivery on a conflicting branch**: verify the #804 push closes B11-B15 and keeps both sides; a second rebase-only push is a finding, not progress.
32. **Review auto-retry budgets are lifetime-per-thread**: #804 and #845 have both spent their 3 auto-retries, so any further review crash needs a manual fresh trigger.
33. **Silent empty-decision sessions**: a green maintainer run with no decision file is a wall-class symptom during a wall, not evidence of a clean pass.

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
- Duplicate queued runs from concurrent sessions are cancelled with `gh run cancel` (job token holds `actions: write`) so one pass per lane remains; a `cancelled` conclusion never summons `workflow_run` triage. Only cancel runs that have not started a real agent step. Let a started real review or test run finish.
- An overlapping schedule tick must re-read the live trigger and comment history before deciding: if a still-live `/oc maintainer` session has already posted the needed dispatch, verify that dispatch is live and stand by rather than duplicating it; the earlier session owns its decision record and this run records the standby.
- The #754 wall is a pool-wide fresh-run lottery, not a retry-exhaustion signal: no lab dispatch for the wall itself, no ladder advance, one fresh pass per lane after the cooldown; repeated multi-hour walls are an Owner capacity question. The #836/#837 lane owns the durable mitigation (heartbeat plus one-attempt cap).
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first; #843/#845 did that for the review arm (150/180, live on main).
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts and again before every retry attempt (issue #831, merged).
- The opt-out gates project config and instruction loading; on CLI 1.19.5 the import boundary is command-qualified: `opencode github run` (the arm) does gate project plugin discovery through the legacy path, while `opencode run` still imports project plugins through the v2 config/plugin layer. Never state the old unqualified claim.
- The lab workflow's linkage guard appends `Closes #<trigger>` on a missing token; on PR-comment wakes that is a self-referential linkage line. A body fix must name `PR #<trigger>` in prose to satisfy the guard; route it through `lab`, never by hand, and keep the durable guard fix as a lab follow-up.
- Main's current audit numbering is R33 run-scalar budget, R34 quota-wall guard and heartbeat, with #804's per-OS sanitizer rule under R34 (35 checks). #845 added the R25 review-cap arm and the R19 parsed step sequence. The reviews rule on that.
- The expected App-token push rejection on protected-path branches (workflow-permission or non-fast-forward after a rebase) is wrapper noise; verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`); the macOS arms need the Darwin loader seams (`DYLD_*`) as well as the Linux `LD_*` ones (B12).
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Verify the #804 lab push: rebase onto `de5720fd`, B11-B15 closed with fixtures, body hygiene, full audit green (35/0 nonce-unset with the ambient delta noted), and a forwarded fresh review. If the lab under-delivers, route one corrective lab pass; do not review a stale head.
2. Read the forwarded review under the merged 150/180 cap. Record its run id and duration as the #843 exit evidence, then close #843 with the substitute-proof note. On `lab`, carry the evidence forward and verify the next round.
3. #804 after the review: Tester -> binding eval -> PAT sweep; #798 closes on merge.
4. Keep #836 open for the Owner capacity decision and #831 open for the scratch canary; #821 parked; #745 behind #803.
5. Fold the forward-hygiene lessons into the durable lab follow-up: the lab.yml self-linkage line, review-verdict staleness across a main advance, duplicate maintainer/review wakes, and rebase-only lab under-delivery.
6. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #804 rebase lab land the rebase plus B11-B15 in one push, or does it under-deliver again?
2. Does the forwarded review complete under the merged 150/180 cap and provide the #843 exit evidence?
3. Does the wall spare the #804 review lane, or does the fresh-runner lottery strike again?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence), and will the scratch canary be run or waived?
5. Does the curator schedule recover at about 05:18Z?
