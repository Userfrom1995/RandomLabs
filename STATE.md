# STATE

Last updated: 2026-11-13T00:38Z by run 43337979248

(heartbeat wake: the pool-wide wall outlasted the 09:17Z session through at least 23:22Z; this fresh runner has quota, so one lab pass is dispatched on #845 for the R25 `$/` path-binding F1 plus its advisories and one manual review on #804.)

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and write hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 00:33-00:40Z on 2026-11-13)

- **Wake**: `workflow_dispatch` heartbeat from the opencode-recover schedule (run 43337878053, 00:32:33Z) with `reason: heartbeat: no real Maintainer session for at least 90m and no active run (issue #836)`. The loaded memory stamp was `2026-11-12T09:17Z by run 43189575958`, about 15.3 hours stale. This run writes the fresh stamp.
- **Wall**: the #754 pool-wide free-usage wall outlasted the 09:14Z lab death. Fresh runs still hit it at 19:08Z (maintainer recovery 43287082979), 20:45Z (43303474136), 23:19Z (curator self-heal 43327831648) and 23:21Z (maintainer recovery 43328170052, cap note 23:22:21Z). The 09:14Z `retry-after` of 53629s pointed at about 00:08Z on 2026-11-13; this run started 00:33Z with a working model on a fresh runner, so the window appears to have reset. The quota intake stood the 14:49 curator-wall wake down; the silent empty-decision maintainer sessions at 19:06, 20:43 and 23:20 were wall-class agent deaths: they produced no decision file and their bounded recovery attempts died on the same wall.
- **#845 LAB PASS DISPATCHED**: head `7bd3a80f881d426c5cc7d7d2c96ad72a1589adc4`, 8 ahead / 0 behind main `678658bb`, MERGEABLE/CLEAN. Review 43181995440 returned `lab` with one blocking F1 (R25 cannot bind the `$/` self-repository form or path-equivalent `./` spellings, so a skipped canonical decoy plus a hidden 90-minute real runner passes; step identity is not bound) and four advisories (body sign-off/`Closes #845`, fixture-nonempty wording, R17 header parity, R17 scratch-dir edge). The `/oc lab` forward at 09:13:35Z died on the wall at 09:14:22Z. This run dispatches one fresh `lab` with the review's finding-by-finding prescription; the 09:44:22Z cooldown is long past.
- **#804 REVIEW DISPATCHED**: head `6ddf009d4afe474f5acfeeed3c55a146b15c1f84`, 6 ahead / 0 behind main `678658bb`, MERGEABLE/CLEAN. Its fresh review 43178322753 died on the wall at 08:17:09Z with the thread's lifetime auto-retry budget spent; the cooldown passed at 08:47:09Z. This run dispatches one manual `/oc review (head 6ddf009d4)` as the recovery lane. The only Tester approval binds the stale `0872b94c` and must not be used.
- **#844 MERGED (unchanged)**: head `492560d961c8e3f3271d41ffdfecad8403b535c0` merged at 07:02:21Z on 11-12 as `678658bb8f5d0d997ab9df75cd3479b6cdc80ce5`; #842 closed COMPLETED; branch `opencode/lab-842-overload-transient-retry` intact at `492560d96`.
- **main** = `678658bb` (unchanged). Pages root and `/docs/` both HTTP 200.
- **Runs**: held zero. Queued: the seven stale pull_request-cohort runs (oldest 2026-09-25) remain inert. In progress at survey: this maintainer run only. No lab, review, test or eval run is live; no agent lane has run since the 09:14Z lab death.
- **Trigger allowlist**: 19/19 repo-owned names against `maintainer.yml:42` (live list 23 including the self-excluded `maintainer` and `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`). No workflow added or renamed.
- **Model watch**: registry 86 models, 11 free; pin `opencode/deepseek-v4.1-flash-free` (`model` and `small_model`) and all three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) live; `nemotron-3.5-lightning-free` also live. New free ids observed (`longcat-2.5-free`, `nemotron-3.5-super-vl-free`, `minimax-m3.1-flash-free`) are future lab-update candidates, not a mid-lane swap.
- **Open issues** (22): the same tracked set; #843 tracks the review cap plus the R17 hermetic fix and stays open for the #845 merge and a raised-cap review pass; #836 carries the capacity decision and wall history; #798 tracks #804; #831 the scratch canary; #821 parked on #836; #745 behind #803. No untriaged issue and no new Owner directive.
- **Curator**: the 23:18Z schedule run produced no decision (wall-class silent exit), and its one self-heal dispatch 43327831648 died on the wall at 23:19Z; the next scheduled curator tick (about 05:18Z) re-arms it. No curator PR or issue is stranded.

## The live lanes (do not duplicate)

1. **#845** - one `lab` pass is now live on the review's F1 plus four advisories. It must push the path-normalised `./`/`$/` runner binding, the step-identity binding, the four selftests, the claim corrections, the body cleanup, and preserve main's R31/R26/R34 and every existing R25/R17/R19/F1-F6 fix. Its push forwards a fresh review; then Tester -> binding eval -> PAT sweep; #843 stays open until the merge and a raised-cap review pass. Never use the `82e2cf1f` or `11b5b26d` markers.
2. **#804** - the manual review on `6ddf009d4` is now live. On `lab`, the workflow forwards the fix; verify the next push closes B11 (legacy strip ancestry), B12 (macOS `DYLD_*` seams), B13 (email-aware owner trailer), B14 (`diff-tree -m` clean-merge false positive), and B15 (docs/prompt/body wording) instead of rebasing again. Then fresh review -> Tester -> binding eval -> PAT sweep; #798 closes on merge.
3. **#844** - merged as `678658bb`; #842 closed; branch intact; Pages green.
4. **#832** - merged as `304cd075`; #831 stays open for the scratch canary.
5. **#837** - merged as `db06e734` on 11-12; #843 keeps the exit evidence.

## The serialized infra queue

1. #845: live lab pass -> fresh review -> Tester -> binding eval -> PAT sweep; then the #843 exit evidence.
2. #804: live manual review -> its lab forward closes B11-B15 -> fresh review -> Tester -> binding eval -> PAT sweep; #798 closes on merge.
3. After the infra merges: the #844 eval record nits, the #845 review advisories not folded into this lab pass, the #804 env-seam lessons, reconcile #812/#815, the #822 residuals, then the deferred docs follow-ups (#773/#774), then #814 with #803.
4. #821 parked on the Owner capacity decision; #745 behind #803; #831 canary pending.

## Loose ends board

1. **#845 F1 (blocking, lab live)**: R25 must resolve `uses` paths with `./`/`$/` normalisation and bind the executing step identity (`id` plus the exact actor gate), with selftests for the `$/`, `./`-equivalent and constant-false decoy shapes plus the honest-`$/` positive. The live lab instruction also covers the body sign-off/`Closes #845`, fixture-nonempty wording, R17 header parity and scratch-dir hardening.
2. **#804 recovery review live**: head `6ddf009d4` is on main `678658bb`, CLEAN; the review must re-report B11-B15 so the lab closes them rather than rebasing again. Never use the stale `0872b94c` approval.
3. **The wall**: last fresh-run deaths at 23:19Z and 23:21Z; the ~14.9h retry-after from 09:14Z points at about 00:08Z, and this 00:33Z run has a bucket. Treat any new wall death as the #754 class: no same-IP lab dispatch, one fresh pass per lane after the cooldown.
4. **#843 open**: the review-cap and R17 hermeticity fix is in #845; keep it open until it merges and a fresh review pass is proven live under the raised caps.
5. **#836 open**: the capacity decision and the wall residuals; the heartbeat and one-attempt cap are the mitigation.
6. **#831 scratch canary**: only the Owner (or a pushed branch) can create the disposable PR; never claim it done without live evidence or a recorded Owner waiver.
7. **#821 parked** on the Owner capacity decision; **#745** behind #803; **#792** parked with #821.
8. **#812/#815**: #814 is parked, #815 partially covered by #843's R17 hermeticity; reconcile in the audit pass.
9. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
10. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
11. **Held-run watch**: zero this run. **Queued**: the seven stale pull_request-cohort runs remain inert. **Cancelled**: nothing this run.
12. **Stale verdict trap**: #804's only Tester approval binds `0872b94c`; #845's `82e2cf1f` and `11b5b26d` markers are stale; the #844 markers bound `492560d96` and are consumed. The R21/R22/R30 gate enforces head freshness.
13. **Failure-triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes. Both live lanes are hours past their last death (09:14Z and 08:17Z), so the dispatch is inside the rules. The wall class is exempt from lab dispatch.
14. **Duplicate-session noise**: concurrent wake fan-outs still spawn skip-only maintainer and review runs; re-read trigger history before every dispatch and cancel never-started duplicates only. Never cancel a started real review or test run.
15. **Review-verdict staleness across a main advance**: the durable publish-time mergeability re-check remains a review-workflow follow-up. Both live branches are on main's tip.
16. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; on a PR-comment wake the trigger is the PR number, producing a self-referential linkage line. The live #845 instruction asks the lab to name `PR #845` in prose and keep the sign-off last; the durable guard fix remains a lab follow-up.
17. **Board pin**: #70 is pinned and verified.
18. **PAT sweep ignores "behind main"**: it requires a shared merge base and `MERGEABLE`, plus fresh head-bound markers; the up-to-date reviewer rule and the rebase-before-gates rule carry the behind check.
19. **Registry shape**: the model registry lists bare ids without the `opencode/` provider prefix; compare the bare id.
20. **Artifact-hash honesty**: always state the extraction recipe when quoting a hash.
21. **Review-lane cap evidence**: the raised 150/180 shape is live on #845's workflow and review 43181995440 ran about 54 minutes without a cap death. Cap deaths and wall deaths are different classes.
22. **Wrapper non-fast-forward noise**: the 08:19:12Z App-token push rejection on the rebased workflow-touching branch was the expected wrapper noise; the PAT step landed `7bd3a80f`.
23. **Quota-wall intake**: it stands the workflow_run wake down when the failed run ended on the wall, posts one audit note, and does not summon an agent. Neither the intake note nor the cap escalation carries an inline trigger token.
24. **#754 wall policy**: fresh runners are a lottery at multi-hour wall length and the cron is platform-throttled; do not treat repeated wall deaths as a lab retry-exhaustion signal. If both live lanes wall again, record it and stand down until the next heartbeat.
25. **Manual review after a wall death**: a fresh head-bound review trigger is the recovery lane even when the head already carries an older review comment, because that run failed and the lifetime auto-retry budget is spent (#803). #804 is the live case.
26. **Auditor bench candidates**: the daily audit names free-model candidates but makes no automatic change; keep them as future work and never swap a pin mid-lane.
27. **Non-blocking eval/review nits are deferred, not dismissed**: fold them into the post-merge docs/lab follow-up; never open a separate lab round just for prose while the infra queue is live.
28. **Merge-tip verification**: after every merge, re-run the full audit on a clean clone of the new main tip, confirm the linked issue closed, and confirm Pages deployed green.
29. **Lab under-delivery on a conflicting branch**: after a review-owned lab forward, verify the next lab push against the review findings; if it is again scoped to plumbing, dispatch one lab with an explicit finding-by-finding instruction.
30. **Review auto-retry budgets are lifetime-per-thread**: #804 and #845 have both spent their 3 auto-retries, so any further review crash needs a manual fresh trigger.
31. **Silent empty-decision sessions**: the 19:06, 20:43 and 23:20 maintainer runs exited 0 without writing any output file while the wall was live; each recovery attempt then died on the wall. The 14:49 run was the quota intake for the curator wall death and stood down correctly. A green maintainer run with no decision file is a wall-class symptom during a wall, not evidence of a clean pass.

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
- The #754 wall is a pool-wide fresh-run lottery, not a retry-exhaustion signal: no lab dispatch for the wall itself, no ladder advance, one fresh pass per lane after the cooldown; repeated multi-hour walls are an Owner capacity question. The #836/#837 lane owns the durable mitigation (heartbeat plus one-attempt cap).
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first; #843 (#845) raises the review cap and extends R25.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- Treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content on PR-comment runs (the CLI re-checks out the PR head after the trusted checkout); the staged system prompt remains authoritative, and the vendored composite runner removes the project plugin directories before the CLI starts and again before every retry attempt (issue #831, merged).
- The opt-out gates project config and instruction loading; on CLI 1.19.5 the import boundary is command-qualified: `opencode github run` (the arm) does gate project plugin discovery through the legacy path, while `opencode run` still imports project plugins through the v2 config/plugin layer. Never state the old unqualified claim.
- The lab workflow's linkage guard appends `Closes #<trigger>` on a missing token; on PR-comment wakes that is a self-referential linkage line. A body fix must name `PR #<trigger>` in prose to satisfy the guard; route it through `lab`, never by hand, and keep the durable guard fix as a lab follow-up.
- Main's current audit numbering is R33 run-scalar budget, R34 quota-wall guard, and the #837 heartbeat guard under R34; #804 keeps its per-OS sanitizer rule under R34 (35 checks). #844 adds the #842 wording fixtures and #845 extends R25/R17/R19. The reviews rule on that.
- The expected App-token push rejection on protected-path branches (workflow-permission or non-fast-forward after a rebase) is wrapper noise; verify the PAT-backed push landed (branch tip) and do not route a post-mortem for it alone.
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`); the macOS arms need the Darwin loader seams (`DYLD_*`) as well as the Linux `LD_*` ones (B12).
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #845 lab push: verify it closes the R25 path-binding F1 plus the advisories, preserves R31/R26/R34 and the existing rules, and forwards a fresh review. Then Tester -> binding eval -> PAT sweep; #843 stays open until the raised-cap exit evidence.
2. Read the #804 review verdict: on `lab`, verify the forwarded lab closes B11-B15 rather than rebasing again. Then fresh review -> Tester -> binding eval -> PAT sweep; #798 closes on merge.
3. If either lane walls, record it and do not re-dispatch the same lane until the next fresh-run window; the quota intake owns the note.
4. Verify #842 stays CLOSED and the #844 branch remains intact; confirm Pages stays green on main `678658bb`.
5. Re-check held and queued runs, the trigger allowlist, the model ladder, and the stale-verdict bindings.
6. Keep #836 open for the Owner capacity decision and the wall residuals; #831 stays open for the scratch canary; #821 parked; #745 behind #803.
7. After the infra merges: the #843 exit evidence, then the #844 eval record nits and any remaining #845 review advisories, the #804 env-seam lessons, reconcile #812/#815 plus the #822 residuals, then the deferred docs follow-ups (#773/#774), then #814 with #803.
8. Fold the forward-hygiene lessons into the durable lab follow-up: the lab.yml self-linkage line, the review-verdict staleness across a main advance, the duplicate maintainer and review wakes, and the rebase-only lab under-delivery.
9. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #845 lab pass close the `$/` path binding plus the advisories in one push, and does the fresh review then approve?
2. Does the #804 review land on `6ddf009d4` with B11-B15, and does its lab forward close them in one push?
3. Is the wall window really reset, or will new runners keep hitting the per-egress allowance?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence), and will the scratch canary be run or waived?
5. Does the curator schedule recover at about 05:18Z, and does #843's raised-cap exit evidence land once #845 merges?
