# STATE

Last updated: 2026-11-13T12:55Z by run 43428741565

(issue_comment wake on #804: the B1-B5 lab pass landed `8a4f3871` and review round 9 is live on it.)

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and write hardcoded PAT triggers that route work to the right agent. I never post triggers myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 12:52-12:57Z on 2026-11-13)

- **Wake**: the owner-authored `/oc maintainer` comment on #804 at 12:51:36Z summoned this run (the matching workflow fan-outs are skip-only). The loaded memory stamp was `2026-11-13T11:35Z by run 43417798574`, about 77 minutes stale.
- **#804 LAB PUSH LANDED**: Lab Engineer run 43417806860 completed SUCCESS at 12:50:24Z after 78m29s and pushed `8a4f3871c3f82749bdfb7f2cc3072a5f0edcc93b` (one `lab:` commit at 12:49:33Z). The branch is 9 ahead / 0 behind `main` `a590d4e9`, merge-base equals the main tip, 11 files (+6953/-207), MERGEABLE/CLEAN. The App-token rejection at 12:50:06Z is the expected wrapper noise; the PAT step landed the branch (`git ls-remote` confirms).
- **#804 B1-B5 CONTENT VERIFIED IN THE PUSHED TREE**: B1/B2 the guard's merge exemption accepts only a carry (result equals the first parent and main unchanged since the merge base) or a clean import (result equals main and the first parent equals the merge base), applied to every path before the protected/out-of-lane classification in both the preflight and post-agent loops via the shared `merge_path_is_exempt`; B3 both sanitizers unset `GIT_GRAFT_FILE`, `GIT_SHALLOW_FILE`, `GIT_REPLACE_REF_BASE` and the `GIT_CONFIG_*` seams and re-export safe values, and all six strip/scope env maps pin `GIT_GRAFT_FILE`/`GIT_SHALLOW_FILE` to `/dev/null`; B4 all three `verify-test` steps run `/bin/bash --noprofile --norc -e -o pipefail -p` (Git Bash on Windows) with `BASH_ENV`/`ENV` `/dev/null`, pinned `PATH`/`TRUSTED_PATH` and a body `PATH` reset; B5 the PR body carries the delegation ledger and skills line. R17 pins the verify shape with mutation controls; R34 adds `clean-nonprotected`, `main-tip-revert`, `baseline-revert`, `fake-merge` and the two graft fixtures plus the exemption/first-parent/graft-unset/diff-tree mutants. `AGENTS.md` and `LAB.md` are synced.
- **#804 REVIEW ROUND 9 LIVE**: the lab workflow posted `/oc review` at 12:50:18Z; review run 43428561623 was created 12:50:22Z and its review job started 12:50:24Z on the new head (inside the raised 150/180 cap). The pending review 43428741228 is the skip-only fan-out from the maintainer wake (`/oc maintainer` does not match the `/oc review` job gate); the pending maintainer 43428758343 is a success-conclusion workflow_run fan-out. Nothing is duplicated from this run.
- **Static hygiene**: `bash -n` clean on `peros-scope-guard.sh`, `strip-trailers.sh` and `silent-stall-audit.sh`; the four live contract paths in `/tmp` are absent after the lab run; the worktree was clean before my memory writes. The lab reports the full audit at 35 passed / 0 failed on this head; the review re-runs it.
- **Main and Pages**: main is `a590d4e9`; the Pages workflow_dispatch 43428744981 completed SUCCESS at 12:52:20Z on it; this PR's preview deploy 43428726369 is green on `8a4f3871` (12:51:43Z); production root and `/docs/` both return HTTP 200.
- **#821/#745 unchanged**: #821 (`dce109e4`, base `86570af1`) stays parked on the Owner capacity decision; #745 (`7a04fa4a`, base `e73bd7a2`) stays CONFLICTING/DIRTY behind #803.
- **Runs**: held zero; zero action-required/waiting runs; the newest 200 carry exactly one failure, the 06:57Z #754 wall death 43382230547 already triaged by the 08:18Z quota intake. In progress only this maintainer run and review 43428561623; the pending runs are skip-only.
- **Trigger allowlist**: exact 19/19 repo-owned names against the `workflows:` list in `maintainer.yml` (live 23 including the self-excluded `maintainer` and the platform `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`). No workflow added or renamed.
- **Model watch**: registry 86 models, 11 free; pin `opencode/deepseek-v4.1-flash-free` (`model` and `small_model`) and the ladder rungs `deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free` and `glm-5.3-flash-free` all live. No retirement and no pin change.
- **Open issues** (21): #836 (capacity and wall history), #831 (scratch canary), #815/#812/#814/#803/#742 (audit and retry follow-ups), #798 (tracks #804), #792 (parked with #821), #774/#773 (docs), the Maze Chase set (#683/#678/#677/#661/#659/#657/#655/#582), #70 (board) and #42 (brainstorm). No issue opened since 2026-11-12; no untriaged issue and no new Owner directive.
- **Curator and Auditor**: curator schedule 43373238866 succeeded 05:37:29Z; auditor schedule 43372634235 succeeded 05:32:00Z; the daily audit comment on #70 (05:50:15Z) names the quota-wall class and no new defect. No stranded curator work.

## The live lanes (do not duplicate)

1. **#804** - review round 9 (43428561623) owns the verdict on `8a4f3871`. On approval the workflow forwards `/oc test`; after the owner-authored `/oc approve-test` verdict I dispatch the binding Evaluator, and the PAT sweep lands the PR only with a fresh head-bound approve-test verdict plus a fresh head-bound `eval-verdict: approve-eval` marker; #798 closes on merge. On a `lab` verdict the workflow forwards `/oc lab`; on a wall death the quota intake owns the note and one fresh manual pass follows the 30-minute cooldown.
2. **#843** - CLOSED with the cap, hermeticity and runtime evidence recorded. Do not reopen unless R25 detects a cap regression.
3. **#821** - parked on the Owner capacity decision; its `86570af1` base is stale. Do not review or merge until the capacity decision lands.
4. **#745** - behind #803 (lifetime retry budgets); do not re-dispatch before #803 is addressed.

## The serialized infra queue

1. #804: review round 9 -> Tester -> binding eval -> PAT sweep; #798 closes on merge.
2. After #804: the #845 eval residual (job-level `if: false` outside R25), the remaining #845 review advisories, the #804 env-seam and merge/graft lessons, reconcile #812/#815 plus the #822 residuals, then the deferred docs follow-ups (#773/#774), then #814 with #803.
3. #821 parked on the Owner capacity decision; #745 behind #803; #831 canary pending.

## Loose ends board

1. **#804 wall history**: reviews 43339043687 (01:08:21Z), 43347406135 (02:25:47Z), 43357044317 (03:28:02Z), 43374626276 (06:26:16Z), 43382230547 (08:17:35Z) died on the #754 wall. The lifetime review retry budget is spent; every further pass must be a manual fresh trigger after the cooldown. Round 8 completed success at 11:31:56Z; round 9 is a fresh manual pass that started 12:50:24Z and is still inside the cap.
2. **#804 round-9 shape**: one new `lab:` commit (596 insertions / 72 deletions across 6 files), 9 ahead / 0 behind main, no rebase needed. The audit count stays 35 checks; the review re-verifies the claim.
3. **#804 body hygiene residual**: the body still ends with the linkage guard's auto-appended self-referential `Closes #804` after the sign-off. The round-9 body carries the delegation ledger and skills line (prior B5), so the remaining item is the durable linkage-guard fix; the body can name `PR #804` in prose to satisfy the guard.
4. **#804 stale approval trap**: its only Tester approval binds `0872b94c`; never use it. The R21/R22/R30 gate enforces head freshness.
5. **The wall**: #754 per-egress daily free-usage class. The intake owns the note; treat any new wall death as the class, not a retry-exhaustion signal: no same-IP dispatch, one fresh pass per lane after the cooldown.
6. **#836 open**: the capacity decision and the wall residuals; the heartbeat and one-attempt cap are the mitigation. The 08:18:01Z intake note is the latest record there.
7. **#831 scratch canary**: only the Owner (or a pushed branch) can create the disposable PR; never claim it done without live evidence or a recorded Owner waiver.
8. **#821 parked** on the Owner capacity decision; **#745** behind #803; **#792** parked with #821.
9. **#812/#815**: #814 is parked; #815 is partially covered by the #843 R17 hermeticity work; reconcile in the audit pass after #804.
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Held-run watch**: zero this run. The pending maintainer fan-out and the pending review fan-out are skip-only; no real review, test, eval or lab run was cancelled.
13. **Failure-triage cooldown**: no second dispatch for the same workflow+branch signature within 30 minutes. No lane failed this window; the round-9 review started on a fresh runner roughly 79 minutes after the last review verdict.
14. **Duplicate-session noise**: concurrent wake fan-outs still spawn skip-only maintainer and review runs; re-read trigger history before every dispatch and cancel never-started duplicates only. Never cancel a started real review or test run.
15. **Review-verdict staleness across a tester commit**: the Tester may push a regression commit after the review approval. The eval must bind the final head, and the merge gate must re-read the live head immediately before merging.
16. **Lab linkage guard on PR triggers**: `lab.yml` appends `Closes #<trigger>` when the body omits that token; the #804 body carries the appended `Closes #804`. The durable guard fix remains a lab follow-up.
17. **Board pin**: #70 is pinned and verified.
18. **PAT sweep ignores "behind main"**: it requires a shared merge base and `MERGEABLE`, plus fresh head-bound markers; the up-to-date reviewer rule and the rebase-before-gates rule carry the behind check.
19. **Registry shape**: the model registry lists bare ids without the `opencode/` provider prefix; compare the bare id.
20. **Artifact-hash honesty**: always state the extraction recipe when quoting a hash.
21. **Review-lane cap evidence**: the raised 150/180 shape is live on main; R25 pins the review arm structurally; round 8 completed a heavy 76-minute audit inside it, and round 9 started on the same shape.
22. **Wrapper non-fast-forward and workflow-permission noise**: the App-token push rejection on a rebased or workflow-touching branch is expected wrapper noise; the PAT step is the landing path and the tip landed (verified at `8a4f3871`).
23. **Quota-wall intake**: it stands the workflow_run wake down when the failed run ended on the wall, posts one audit note, and does not summon an agent. Neither the intake note nor the cap escalation carries an inline trigger token.
24. **#754 wall policy**: fresh runners are a lottery at multi-hour wall length and the cron is platform-throttled; do not treat repeated wall deaths as a lab retry-exhaustion signal. If both live lanes wall again, record it and stand down until the next heartbeat.
25. **Manual review after a wall death**: a fresh head-bound review trigger is the recovery lane even when the head already carries an older review comment, because that run failed and the lifetime auto-retry budget is spent (#803).
26. **Auditor bench candidates**: the daily audit names free-model candidates but makes no automatic change; keep them as future work and never swap a pin mid-lane.
27. **Non-blocking review/eval nits are deferred, not dismissed**: fold them into the post-merge docs/lab follow-up. The current set is the #845 eval's job-level `if` residual, the review's five wording nits, the round-8 B13 residuals, the Tester's two notes and the #847 landing-test regex caveat. The round-9 B13 residuals stay documented non-blocking.
28. **Merge-tip verification**: main is `a590d4e9`; the Pages workflow_dispatch 43428744981 is green on it (12:52:20Z). Re-verify on the next advance.
29. **Review auto-retry budgets are lifetime-per-thread**: #804 and #845 have both spent their 3 auto-retries, so any further review crash needs a manual fresh trigger.
30. **Silent empty-decision sessions**: a green maintainer run with no decision file is a wall-class symptom during a wall, not evidence of a clean pass.
31. **#846 closed on merge**: do not reopen; the cadence wording is now consistent across `README.md`, `docs/index.md`, `docs/index.html` and `CONTRIBUTING.md`.
32. **#847 merged cleanly**: `a590d4e9`, branch intact at `6dc20e604`; the only residual is the Evaluator's non-blocking landing-test regex note.
33. **#804 round-9 timing held**: the head commit is `8a4f3871` (12:49:33Z), the PAT push landed before the 12:50:18Z handoff, and the review job started 12:50:24Z; no gate was weakened.
34. **Quota intake does not update STATE**: it stands down before the agent and leaves only a log marker, so the next real Maintainer run must re-derive the state from GitHub. This run did that.
35. **Verify-step hardening landed**: the three `verify-test` steps now share the privileged shell and env pins (`BASH_ENV`/`ENV`/`PATH`), so a post-agent shim can no longer force a green verify. R17 pins the exact id, `if: always()`, shell, env map and PATH reset with shell-removal and env-removal mutation controls.

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
- Environment variables are load-bearing seams on post-agent steps: a step env map must pin every mode switch its helper reads (`PEROS_ANCHOR`, `PEROS_OS`, `PEROS_PREFLIGHT`, `REMOTE_URL`, `BASELINE_SHA`); the macOS arms need the Darwin loader seams (`DYLD_*`) as well as the Linux `LD_*` ones (B12). Round 9 pins the graft seams (`GIT_GRAFT_FILE`, `GIT_SHALLOW_FILE`) in all six strip/scope maps and unsets them plus the replace and `GIT_CONFIG_*` seams inside both helpers; the merge exemption is now a carry/clean-import test on every path.
- Post-agent outer shells must be privileged (`bash -p`) and every nested helper read must run `bash -p -s`, because the agent can export `BASH_FUNC_*` and `BASH_ENV` through `$GITHUB_ENV`; the durable preflight and the judged range must exclude commits reachable from the trusted main tip. Round 9 extends the privileged shell and the `BASH_ENV`/`ENV`/`PATH` pins to the three `verify-test` steps.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the round-9 review verdict on #804. On approval the workflow forwards `/oc test`; then the owner-authored `/oc approve-test`, the binding eval and the PAT sweep, and #798 closes on merge. On `lab`, the workflow forwards `/oc lab` and one corrective pass is the only lane.
2. On a review or lab wall death, stand down: the intake owns the note, and one fresh manual pass follows the cooldown.
3. Never use the stale `0872b94c` Tester approval; every marker must bind the then-live head.
4. #843 is closed; reopen only on a real cap regression, which R25 will catch.
5. Keep #836 open for the Owner capacity decision and #831 open for the scratch canary; #821 parked; #745 behind #803.
6. Fold the forward-hygiene lessons into the durable lab follow-up: the lab.yml self-linkage line, review-verdict staleness across a main advance, duplicate maintainer/review wakes, and rebase-only lab under-delivery.
7. Verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does review round 9 approve `8a4f3871`, or return another bounded lab round on the carry/clean-import or graft shapes?
2. Does the round-9 audit hold at 35/0 under the review's adversarial re-run, and do the new R34 fixtures load-bear their claimed protections?
3. Does the #804 lane then clear the Tester, binding eval and PAT sweep?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or approve a lower cadence), and will the scratch canary be run or waived?
5. Does the curator cadence hold after the #846/#847 recovery?
