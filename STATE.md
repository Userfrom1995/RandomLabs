# STATE

Last updated: 2026-11-04T04:32Z by run 41773182610. Wake: the owner-authored signed review report on #804 at 04:26:03Z. Review round 5 returned `lab` with B7 blocking, and the review workflow's `/oc lab` forward is live (`41773186820` on `098ab7f0`). `main` is `eccd93d78855a0f807f0679013c711bc8e76f114`. Live lanes: #804 lab `41773186820` on `098ab7f0`; #788 browser tester `41769156052` on `c7c3ff31`. Zero failures today, zero held runs, no merge candidate.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 04:26-04:32Z)

- **main** = `eccd93d78855a0f807f0679013c711bc8e76f114` (`git ls-remote` matches), unchanged since the 03:45 merges: #817 merged as `251c81a5` (closes #816), #819 merged as `eccd93d7` (closes #818). Both branches remain intact.
- **Trigger allowlist**: exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, and pages-build-deployment are GitHub dynamic names). No lab workflow is missing from the list.
- **Failures**: zero `failure`/`timed_out`/`startup_failure` runs on 2026-11-04 and none in the last 200 runs. Zero `action_required` runs. Only the four known permanently queued runs remain (`36101155868`, `36101155851`, `36101155844` from 2026-09-25 and `37344324101` from 2026-10-05); inert, for long-closed PRs, holding no concurrency slot.
- **#804** (host PR for #798): head `098ab7f01a8ff1ba02440325f35ea657fd6bd121`, OPEN, CLEAN/MERGEABLE, 14 ahead / 0 behind `main` `eccd93d7`; checks `trigger`, `comment`, and GitGuardian SUCCESS, `deploy` SKIPPED. Review round 5 (`41770182741`) completed SUCCESS at 04:25:56Z with a `lab` verdict: B5 (legacy unconditional strip filter for the nine non-anchored lanes), B6 (identity-independent protected scan and marker-deletion refusal), B1-B4, N10-N12, the rebase, and the delegation ledger all verify, and the audit is 34 passed / 0 failed. The blocking finding is **B7**: the identity-independent durable preflight (`peros-scope-guard.sh:175`) refuses every infrastructure PR, including the read-only per-OS infrastructure lane it is meant to protect, because the PR's own commits touch protected paths; R34 covers the adopted-foreign-edit attack but has no legitimate-infrastructure fixture. The reviewer's fix direction: exempt the PR's own read-only infrastructure history (classify the branch as infrastructure from the range diff and skip the protected scan for read-only per-OS sessions, keeping the out-of-lane tester check and the `PEROS_SCOPE_VIOLATION` hard stop; or judge protected paths only at or after the first named per-OS tester commit), add an R34 fixture for a legitimate infrastructure branch, and keep the adopted-foreign-edit refusal.
- **#804 lab**: the review workflow's hardcoded forward posted `/oc lab` at 04:26:06Z; lab.yml run `41773186820` is live since 04:26:11Z on `098ab7f0` (agent step "Run opencode lab engineer agent" in progress). The same comment batch's maintainer duplicate `41773187110` is pending and will skip at the job gate (its body is `/oc lab`, not `/oc maintainer`); this run is the owner-authored review report's own intake wake.
- **#788**: head `c7c3ff31a2aa06bc527294eebc69647d52315961`, OPEN, CLEAN/MERGEABLE. Review round 10 approved at 03:46:08Z and the workflow posted `/oc test` at 03:46:19Z; browser Tester `41769156052` is live since 03:46:24Z (agent step in progress, no verdict yet).
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Pages**: the last deploy of `eccd93d7` (`41770190026`) succeeded at 03:56:53Z; the #804 preview (`41770179409`) succeeded at 03:56:46Z. `main` is unchanged, so no new dispatch is needed.
- **Concurrent maintainer batch**: the 04:26 `workflow_run` maintainer runs are concurrency skips/cancels from the review comment batch, not failures.
- **Health**: open PRs #804, #788, #745. Open issues 21, all triaged or held (#798 via #804; #786 via #788; #812/#815/#814/#803 held behind #804; #792 after #788; #742 after #803; Maze Chase trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open). No issue or PR was created today.
- **Wall**: no provider-wall death today. The 3 November total remains twenty-four samples, last at 23:02:57Z.
- **Cron watch**: the Maintainer schedule delivered event wakes throughout the morning; the note that schedules are about five to six hours apart instead of every 20 minutes remains a watch item, not a production stop.

## The live lanes (do not duplicate)

1. **#804 lab** is live on `098ab7f0` (`41773186820`, since 04:26:11Z) with the B7 finding. On its push, dispatch a fresh head-bound review; on `lab` the review workflow forwards `/oc lab`, on approval it forwards `/oc test` (read-only infra tester). After the owner-authored `/oc approve-test` marker, dispatch the binding `eval` on the tester-settled head, then the PAT sweep (`--rebase`, fallback `--merge`, branch kept) and the #798 closure. The pending maintainer duplicate `41773187110` must no-op.
2. **#788 tester** is live on `c7c3ff31` (`41769156052`, since 03:46:24Z) after review round 10 approved at 03:46:08Z. Read its verdict. On approval, settle the head (it may push test commits): the product lane needs the macOS delegated acceptance plus a Linux row on the tester-settled head, then the binding `eval`, the marker chain, the merge, #786 closure, and `build` #792. On `fix`, route the Fixer with the exact findings; every later lane re-binds to the new head.
3. **#745** stays parked at `7a04fa4a` behind #803; no action.
4. **The Curator** recovers on its next six-hourly schedule (~04:58Z); do not dispatch a duplicate curate pass for the #754 class.
5. **The merged docs PRs need no further dispatch.** Their non-blocking follow-ups are sequenced behind #804 because #804 also edits `AGENTS.md`, `LAB.md`, and `docs/index.html`.

## The #804 chain

1. Head `098ab7f0` is CLEAN/MERGEABLE and rebased exactly onto `main` `eccd93d7` (14 ahead, 0 behind).
2. Review round 5 returned `lab` on B7 only: the durable preflight must not refuse the PR's own read-only infrastructure history. B5/B6 and the earlier B1-B4/N10-N12 behaviour verify; the audit is 34/0.
3. Lab `41773186820` is live with the B7 fix direction. On its push: fresh head-bound review, the read-only infra tester, the binding eval, the marker chain, the PAT sweep, and the #798 closure.
4. Preserve the reviewed content; no scope creep.

## The serialized infra queue

1. #804 lab is the only live infra lane; #788 tester is the only live product lane.
2. After #804 merges: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work). Only then create and dispatch the two deferred docs follow-ups (see the loose ends board), so they cannot race #804's edits to `AGENTS.md`/`LAB.md`/`docs/index.html`.
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #792 after #788 merges; #773/#774/#775 parked.

## Loose ends board

1. **#817 merged** `251c81a5`; #816 closed. Non-blocking follow-ups recorded by all three gates: explicit `Curator -> Reviewer` and `Auditor / Maintainer -> Reviewer` handoff arrows, the `tests fail` and Evaluator-rejected return routes, the duplicate tor-cli Website anchor masked by `.first`, and the module docstring wording. Defer a scoped Curator docs pass until #804 merges.
2. **#819 merged** `eccd93d7`; #818 closed. The Evaluator's advisory: pre-existing prose at `AGENTS.md:125,131` and `LAB.md:870-871,884` still implies `/oc fix` for failure routing without the `/oc lab` infrastructure override (the Infrastructure PR Guard follows immediately in both files). Defer a scoped Lab Engineer pass until #804 merges.
3. **#788**: tester live on `c7c3ff31`; then the per-OS rows, eval, merge, #786 closure, and `build` #792.
4. **#804**: review round 5 returned `lab` on B7; the lab pass is live on `098ab7f0`; #798 closes on merge.
5. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
6. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
7. **#814**: held behind #803; coordinate the same verify region.
8. **#815**: held behind #804 (direct R17 overlap).
9. **Pages**: verified. The post-merge deploy `41770190026` of `eccd93d7` succeeded at 03:56:53Z.
10. **Cron watch**: Maintainer schedules are best-effort; event wakes deliver. Watch the cadence.
11. **Wall watch**: no samples today; twenty-four on 3 November, last at 23:02:57Z.
12. **Queued-run anomaly**: four permanently queued runs from 2026-09-25/2026-10-05 with no jobs; inert, recorded for the Auditor.
13. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears, not mid-queue churn.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804) never take `fix`/`continue`; route `lab`.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the review lanes share `opencode-review`/`main`.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #804 lab outcome on `098ab7f0`. A pushed head needs a fresh head-bound review, then the read-only infra tester, the binding eval, the marker chain, the PAT sweep, and the #798 closure. Confirm the pending maintainer duplicate `41773187110` no-ops.
2. Read the #788 tester verdict on `c7c3ff31`. Approval: settle the head, dispatch the macOS acceptance plus a Linux row if needed, then the binding eval, the marker chain, the merge, #786 closure, and `build` #792. `fix`: the Fixer.
3. After #804 merges: reconcile #812/#815 against the new main and dispatch one scoped audit pass; then create and dispatch the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes), #792.
4. Watch the Maintainer cron cadence and the wall; re-check the four permanently queued runs. On every failure, verify the head and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #804 lab pass fix B7 without weakening B6's adopted-foreign-edit refusal, and does the fresh head pass review?
2. Does #788's tester approve `c7c3ff31` (or a tester-settled head), clearing the native rows and the binding eval?
3. When #804 merges, do #812 and #815 reconcile cleanly into one scoped audit pass?
4. Why is the Maintainer schedule about five to six hours apart instead of every 20 minutes?
