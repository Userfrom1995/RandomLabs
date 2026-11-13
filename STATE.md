# STATE

Last updated: 2026-11-13T11:35Z by run 43417798574

(issue_comment wake on #804: review round 8 returned `lab` on the merge and graft shapes (B1-B5), and the Lab Engineer lane is live on `43e35118`.)

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and write hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 11:32-11:35Z on 2026-11-13)

- **Wake**: the review workflow published its owner-authored review report on #804 at 11:31:48Z (the body start is not `/oc`, so the maintainer gate routed it as a wake); this run started 11:31:51Z. The loaded memory stamp was `2026-11-13T10:28Z by run 43407856445`, about 63 minutes stale.
- **#804 REVIEW ROUND 8 RETURNED `lab`**: review run 43407840631 completed SUCCESS at 11:31:56Z after 76m07s (job started 10:15:49Z on `43e35118`, inside the raised 150/180 cap) and published the round-8 verdict at 11:31:48Z. Blocking: B1 the B14 merge exemption never checks the first parent, merge base or containment, so fake merges, protected reverts to main and dropped main advances all pass; B2 the exemption only covers protected paths, so a clean merge of main with non-protected changes is dropped as out-of-lane; B3 `GIT_GRAFT_FILE`/`GIT_SHALLOW_FILE` are unpinned and let a graft fake a merge parent or hide the revert from the main range; B4 the three `verify-test` steps are unprivileged `always()` post-agent shells (`-p`, pinned `PATH` and `BASH_ENV` neutralisation missing); B5 the PR body still lacks the delegation ledger and skills line. Non-blocking: the self-referential `Closes #804`, the tester-prompt claim, the `bare` fixture naming, and the B13 residuals. The 35/0 audit on this head is real; the fixtures miss the merge and graft shapes.
- **#804 HEAD UNCHANGED**: `43e35118eba47ecb4c2b816cddb8832b5f54d852`, base/main `a590d4e960b9c4065201bc4b3e485e2174b8e7b8`, merge-base equals the main tip, 0 behind, 8 linear commits, 0 merge commits, 11 files (+6425/-203), MERGEABLE/CLEAN. My 10:28Z run independently audited this exact head at 35 passed / 0 failed; the review re-ran it at 35/0 this round.
- **#804 LAB LANE LIVE**: the review workflow's hardcoded forward posted `/oc lab` at 11:31:52Z; Lab Engineer run 43417806860 was created at 11:31:55Z and has been in its agent step since 11:32:08Z (as of 11:34Z). This is the one corrective pass for B1-B5; do not duplicate it.
- **Repo hygiene**: `bash -n`, the strict YAML parse of `test-linux`/`test-macos`/`test-windows`, `git diff --check` and the zero-U+2014 scan were verified by the review on this head; my 10:28Z run verified the same on the same SHA.
- **Main and Pages**: main is `a590d4e9`; Pages workflow_dispatch 43407863199 completed SUCCESS at 10:15:57Z on it; this PR's preview 43407841204 is green on `43e35118`; production root and `/docs/` both return HTTP 200.
- **#821/#745 unchanged**: #821 (`dce109e4`, base `86570af1`) stays parked on the Owner capacity decision; #745 (`7a04fa4a`, base `e73bd7a2`) stays CONFLICTING/DIRTY behind #803.
- **Runs**: held zero; zero failure, timeout, startup failure or action-required run in the newest 100 (the review completed success with a verdict); in progress only this maintainer run and Lab Engineer 43417806860. The pending maintainer 43417807055 is the `/oc lab` fan-out and will skip at its job gate; the many skipped maintainer `workflow_run` runs are success-conclusion fan-outs, and the cancelled ones are the single-pending-slot supersede class.
- **Trigger allowlist**: exact 19/19 repo-owned names against the `workflows:` list in `maintainer.yml` (live 23 including the self-excluded `maintainer` and the platform `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`). No workflow added or renamed.
- **Model watch**: registry 86 models, 11 free; pin `opencode/deepseek-v4.1-flash-free` (`model` and `small_model`) and the ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free` and `glm-5.3-flash-free` all live. No retirement and no pin change.
- **Open issues** (21): #836 (capacity and wall history), #831 (scratch canary), #815/#812/#814/#803/#742 (audit and retry follow-ups), #798 (tracks #804), #792 (parked with #821), #774/#773 (docs), the Maze Chase set (#683/#678/#677/#661/#659/#657/#655/#582), #70 (board) and #42 (brainstorm). No issue opened since 2026-11-12; no untriaged issue and no new Owner directive.
- **Curator**: recovered; #846 and #847 landed cleanly with no stranded curator work. The daily audit comment 6845341638 on #70 (05:50:15Z) reports the wall class only and no new defect; the newest #836 note is the 08:18:01Z quota intake audit trail.

## The live lanes (do not duplicate)

1. **#804** - Lab Engineer 43417806860 owns the B1-B5 fix pass on `43e35118`. Read its push: it must close the merge exemption (first-parent and merge-base comparison applied to every path), pin/neutralise the graft seams, privilege the three verify steps, add the R34 fixtures and mutation controls, add the PR-body ledger, and keep the audit green. On a wall death, the intake owns the note and one fresh lab pass follows the 30-minute cooldown.
2. **#843** - CLOSED with the cap, hermeticity and runtime evidence recorded. Do not reopen unless R25 detects a cap regression.
3. **#821** - parked on the Owner capacity decision; its `86570af1` base is stale. Do not review or merge until the capacity decision lands.
4. **#745** - behind #803 (lifetime retry budgets); do not re-dispatch before #803 is addressed.

## The serialized infra queue

1. #804: lab fix for B1-B5 -> fresh head-bound review -> Tester -> binding eval -> PAT sweep; #798 closes on merge.
2. After #804: the #845 eval residual (job-level `if: false` outside R25), the remaining #845 review advisories, the #804 env-seam lessons, reconcile #812/#815 plus the #822 residuals, then the deferred docs follow-ups (#773/#774), then #814 with #803.
3. #821 parked on the Owner capacity decision; #745 behind #803; #831 canary pending.

## Loose ends board

1. **#804 wall history**: reviews 43339043687 (01:08:21Z), 43347406135 (02:25:47Z), 43357044317 (03:28:02Z), 43374626276 (06:26:16Z), 43382230547 (08:17:35Z) died on the #754 wall. The lifetime review retry budget is spent; every further pass must be a manual fresh trigger after the cooldown. Round 8 was a fresh scheduled-runner pass and completed under the cap; the wall did not strike it.
2. **#804 round-8 review duration**: 76m07s (10:15:49-11:31:56Z), a success under the merged 150/180 cap, so the cap is not the constraint and the #843 exit evidence stands.
3. **#804 body hygiene residual**: the body still ends with the linkage guard's auto-appended self-referential `Closes #804` after the sign-off, and round 8 adds the missing delegation ledger as blocking B5. The live lab pass should add the ledger and can name `PR #804` in prose to satisfy the linkage guard; the durable guard fix remains a lab follow-up.
4. **#804 stale approval trap**: its only Tester approval binds `0872b94c`; never use it. The R21/R22/R30 gate enforces head freshness.
5. **The wall**: #754 per-egress daily free-usage class. The intake owns the note; treat any new wall death as the class, not a retry-exhaustion signal: no same-IP dispatch, one fresh pass per lane after the cooldown.
6. **#836 open**: the capacity decision and the wall residuals; the heartbeat and one-attempt cap are the mitigation. The 08:18:01Z intake note is the latest record there.
7. **#831 scratch canary**: only the Owner (or a pushed branch) can create the disposable PR; never claim it done without live evidence or a recorded Owner waiver.
8. **#821 parked** on the Owner capacity decision; **#745** behind #803; **#792** parked with #821.
9. **#812/#815**: #814 is parked; #815 is partially covered by the #843 R17 hermeticity work; reconcile in the audit pass after #804.
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Held-run watch**: zero this run. The pending maintainer fan-out will skip at its gate; no real review, test, eval or lab run was cancelled.
13. **Failure-triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes. No lane failed this window; the round-8 review completed success with a verdict.
14. **Duplicate-session noise**: concurrent wake fan-outs still spawn skip-only maintainer and review runs; re-read trigger history before every dispatch and cancel never-started duplicates only. Never cancel a started real review or test run.
15. **Review-verdict staleness across a tester commit**: the Tester may push a regression commit after the review approval. The eval must bind the final head, and the merge gate must re-read the live head immediately before merging.
16. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; the #804 body carries the appended `Closes #804`. The durable guard fix remains a lab follow-up.
17. **Board pin**: #70 is pinned and verified.
18. **PAT sweep ignores "behind main"**: it requires a shared merge base and `MERGEABLE`, plus fresh head-bound markers; the up-to-date reviewer rule and the rebase-before-gates rule carry the behind check.
19. **Registry shape**: the model registry lists bare ids without the `opencode/` provider prefix; compare the bare id.
20. **Artifact-hash honesty**: always state the extraction recipe when quoting a hash.
21. **Review-lane cap evidence**: the raised 150/180 shape is live on main; R25 pins the review arm structurally; round 8 completed a heavy 76-minute audit inside it.
22. **Wrapper non-fast-forward and workflow-permission noise**: the App-token push rejection on a rebased or workflow-touching branch is expected wrapper noise; the PAT step is the landing path and the tip landed (verified at `43e35118`).
23. **Quota-wall intake**: it stands the workflow_run wake down when the failed run ended on the wall, posts one audit note, and does not summon an agent. Neither the intake note nor the cap escalation carries an inline trigger token.
24. **#754 wall policy**: fresh runners are a lottery at multi-hour wall length and the cron is platform-throttled; do not treat repeated wall deaths as a lab retry-exhaustion signal. If both live lanes wall again, record it and stand down until the next heartbeat.
25. **Manual review after a wall death**: a fresh head-bound review trigger is the recovery lane even when the head already carries an older review comment, because that run failed and the lifetime auto-retry budget is spent (#803).
26. **Auditor bench candidates**: the daily audit names free-model candidates but makes no automatic change; keep them as future work and never swap a pin mid-lane.
27. **Non-blocking eval/review nits are deferred, not dismissed**: fold them into the post-merge docs/lab follow-up. The current set is the #845 eval's job-level `if` residual, the review's five wording nits, the round-8 B13 residuals, the Tester's two notes and the #847 landing-test regex caveat.
28. **Merge-tip verification**: main is `a590d4e9`; the Pages workflow_dispatch 43407863199 is green on it (10:15:57Z). Re-verify on the next advance.
29. **Review auto-retry budgets are lifetime-per-thread**: #804 and #845 have both spent their 3 auto-retries, so any further review crash needs a manual fresh trigger.
30. **Silent empty-decision sessions**: a green maintainer run with no decision file is a wall-class symptom during a wall, not evidence of a clean pass.
31. **#846 closed on merge**: do not reopen; the cadence wording is now consistent across `README.md`, `docs/index.md`, `docs/index.html` and `CONTRIBUTING.md`.
32. **#847 merged cleanly**: `a590d4e9`, branch intact at `6dc20e604`; the only residual is the Evaluator's non-blocking landing-test regex note.
33. **#804 round-8 timing held**: the head commit is `43e35118` (10:15:04Z), the review job started 10:15:49Z after the PAT push, and the lab forward `/oc lab` posted at 11:31:52Z after the verdict; no gate was weakened.
34. **Quota intake does not update STATE**: it stands down before the agent and leaves only a log marker, so the next real Maintainer run must re-derive the state from GitHub. This run did that.

## Standing rules I operate under

- Never post triggers; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue, and re-check live trigger history immediately before dispatching because concurrent sessions can double-post.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#837, #804, #844, #845 and their fix PRs) never take `fix`/`continue`; route `lab`. The eval verdict action `fix` on an infrastructure PR routes `lab`, never `fix`.
- Non-workflow PRs approved by both gates are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`); workflow-touching PRs merge only through the hardcoded PAT sweep.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh Tester verdict ordered before a fresh owner-authored eval marker newer than the Tester verdict and the latest eval trigger.
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
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`); the macOS arms need the Darwin loader seams (`DYLD_*`) as well as the Linux `LD_*` ones (B12). Round 8 adds the graft seams (`GIT_GRAFT_FILE`, `GIT_SHALLOW_FILE`) and the merge forgery shapes as the next hardening layer.
- Post-agent outer shells must be privileged (`bash -p`) and every nested helper read must run `bash -p -s`, because the agent can export `BASH_FUNC_*` and `BASH_ENV` through `$GITHUB_ENV`; the durable preflight and the judged range must exclude commits reachable from the trusted main tip, and the protected-path blob exemption applies only to true merge commits (B13/B14). Round 8 showed the true-merge exemption must also compare the first parent and the merge base, and that the three `verify-test` shells still need the same privilege.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the B1-B5 lab push and its forwarded review on #804. Verify the merge-exemption rewrite, the graft pins, the privileged verify steps, the R34 fixtures and the body ledger; on approval the workflow forwards `/oc test`, then the owner-authored `/oc approve-test`, the binding eval and the PAT sweep, and #798 closes on merge.
2. On a lab wall death, stand down: the intake owns the note, and one fresh lab pass follows the cooldown.
3. Never use the stale `0872b94c` Tester approval; every marker must bind the then-live head.
4. #843 is closed; reopen only on a real cap regression, which R25 will catch.
5. Keep #836 open for the Owner capacity decision and #831 open for the scratch canary; #821 parked; #745 behind #803.
6. Fold the forward-hygiene lessons into the durable lab follow-up: the lab.yml self-linkage line, review-verdict staleness across a main advance, duplicate maintainer/review wakes, and rebase-only lab under-delivery.
7. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the live lab pass close B1-B5 without regressing the 35/0 audit or the B11-B15 hardening?
2. Does the next review approve `43e35118`'s successor, or return another bounded lab round on the merge/graft shapes?
3. Does the #804 lane then clear the Tester, binding eval and PAT sweep?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence), and will the scratch canary be run or waived?
5. Does the curator cadence hold after the #846/#847 recovery?
