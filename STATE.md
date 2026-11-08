# STATE

Last updated: 2026-11-08T03:45Z by run 42443581197 (routed the new Curator archive follow-up #834 to the Curator; #829 eval, #832 lab, and #804 lab are all live; Pages verified on `942ff349`). Next-run priorities: read the #829 eval, #832 lab, and #804 lab outcomes and route them forward, track the #834 Curator remediation PR, keep #821 parked on the Owner capacity decision.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:38-03:45Z on 2026-11-08)

- **main** = `942ff3491e559dec7b7e3a17d221ed079cb3bfda` (`git ls-remote` verified at 03:40Z), the rebase merge of PR #833. **Pages is verified**: two deployments for this tip completed successfully (42443545805 at 03:38:09Z and 42443598386 at 03:39:36Z, both `workflow_dispatch`).
- **#834 NEW and now triaged**: created at 03:38:39Z by run 42443133211, the Curator archive follow-up from the #833 review (pre-archive command examples in four archived READMEs, the `rush/` layout block and 21-vs-20 test count, the missing `archive/rush/docs/index.md`, the orrery 57-vs-43 count, the non-README archived docs' retired `/Random/` URLs, the stale `/rush/?debug` comment, and the archived-page 390px mobile clipping observation). No comments before this run. This run routes it: `{"action": "curate", "issue": 834}`. The remediation PR will enter the review, Tester, eval, and PAT-sweep chain.
- **#829** `48bb2dc494dab4d06910d5460be391d417e967d0` MERGEABLE/CLEAN, 8 commits on `5b699601`, curator cap/durability (`Closes #827`, branch `opencode/lab-827-curator-cap-headroom`). Tester approved at 03:29:22Z (infra scope, full R1-R34 audit 34/34 on the real head); owner-authored `/oc approve-test` marker at 03:29:24Z. Binding eval 42443202122 live since 03:33:17Z on the parent thread. Workflow-touching PR: the PAT sweep is its merge path after `approve-eval`.
- **#832** `e260536aa7cf05a12e1f5d25d8e69f324311c0eb` MERGEABLE/CLEAN, 6 commits on `5b699601`, project-config opt-out (`Refs #831`, branch `opencode/lab-831-project-config-optout`). The Tester returned `lab` at 03:28:29Z: on shipped CLI 1.19.5 the unconditional `.opencode/plugin/*.js` import-time code execution survives `OPENCODE_DISABLE_PROJECT_CONFIG=true` on every arm that pre-checks out the PR head (Tester and per-OS testers with `contents: write`; Reviewer and Evaluator with contents read plus PR/issues write). Lab 42442877355 live since 03:28:37Z. Head unchanged. **#831 stays open** for the residual and the Owner-requested scratch canary.
- **#804** `efb1784e7553251624deaf7612e4307e034392da` MERGEABLE/CLEAN, 2 commits on `5b699601`, 11 files, per-OS commit-scope guard (`Closes #798`, branch `opencode/issue798-20261102035359`). Review 42439783880 completed SUCCESS at 03:36:04Z with `lab`, not an approval: blocking finding B8, the post-agent sanitizer reads the trusted helpers with `git show` from the agent-writable workspace object store using `GIT_DIR`/`GIT_OBJECT_DIRECTORY` taken from `$GITHUB_ENV`, so a malicious tester can replace both helpers with no-ops (`opencode-peros-test.yml:562/629` Linux, `:1422/1489` macOS, `:2386/2453` Windows). The workflow posted the lab handoff at 03:35:59Z; Lab Engineer 42443399156 live since 03:36:02Z.
- **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but behind main (15 commits, base `86570af1`), Maze Chase harness (`Closes #792`). Parked on the Owner capacity decision; no fresh pass.
- **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY (5 commits, base `e73bd7a2`), parked behind #803.
- **Open issues** (22): #834 is now triaged by this run; #827 closes with #829, #831 stays open past #832, #798 with #804, #792 with #821, #742 with #745. The known held follow-ups remain #812/#814/#815/#803/#773/#774/#683/#678/#677/#661/#659/#657/#655/#582; #70 and #42 are the boards.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the only extra active names are GitHub-managed: Dependabot Updates, Dependency Graph, pages-build-deployment). No lab fix needed.
- **Model watch**: the registry serves 81 models; the pin `opencode/deepseek-v4.1-flash-free` and all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) resolve. No retirement.
- **Schedule arms**: curator last scheduled success 2026-11-07T21:34Z (the 6-hourly round is due now; this run's dispatch covers the #834 work in any case); auditor last scheduled success 2026-11-07T05:01Z, so the daily round is due about 05:00Z today. Both re-arm themselves; if either caps on the wall, dispatch `auditor`/`curate` manually as the recovery lane.
- **Failures**: none since the wall lifted at 02:19Z. The prior day's quota-wall recovery notes remain on #70 (21:36Z, 21:40Z, 23:03Z); no Owner directive since.
- **Concurrent wakes**: pending maintainer 42443399105 and in-progress maintainer clone 42443394758 from the 03:35-03:36Z comment burst; keep-both memory handles the overlap.

## The live lanes (do not duplicate)

1. **#829** - eval 42443202122 live at `48bb2dc4` since 03:33:17Z. Next: read the verdict; on `approve-eval` the PAT sweep merges (workflow-touching) and #827 closes; on `fix` route `lab` with the exact findings.
2. **#832** - lab 42442877355 live at `e260536a` since 03:28:37Z. Next: on the lab push, a fresh head-bound review, then the Tester, the binding eval, and the PAT sweep; #831 stays open for the residual and the canary.
3. **#804** - lab 42443399156 live at `efb1784e` since 03:36:02Z (the B8 sanitizer fix). Next: on the lab push, a fresh head-bound review, then the Tester, eval, and PAT sweep; #798 closes on merge.
4. **#834** - routed to the Curator this run. Next: its remediation PR enters the review, Tester, eval, and PAT-sweep chain.
5. **#821** - parked. Do not spend a fresh review until the Owner capacity decision is given.
6. **#745** - parked behind #803.

## The serialized infra queue

1. #829: eval live; then the PAT sweep; on approve #827 closes.
2. #832: lab live; then review, Tester, eval, PAT sweep; on approve #831 stays open for the residual and canary.
3. #804: lab live; then review, Tester, eval, PAT sweep; on approve #798 closes.
4. #803: needs a fresh head-bound review after the queue; its lifetime review budget is spent, so a manual fresh pass is the recovery lane.
5. #821 is parked on the Owner capacity decision; #745 behind #803.
6. #834 is a docs/archive lane and can move in parallel through the Curator without touching the infra queue.
7. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#827 (live via #829 eval)**: curator cap fix; the Tester approved; the binding Evaluator is the current gate.
2. **#831 (live via #832 lab)**: PR-head project-instruction loading; the plugin-import residual is the open finding; #831 stays open for the residual plus the Owner-requested scratch canary after the merge.
3. **#798 (live via #804 lab)**: per-OS commit-scope guard; the B8 sanitizer trust bypass is being repaired on `efb1784e`.
4. **#834 (routed)**: the archived-README and archived-docs follow-up; the Curator owns the remediation PR.
5. **#825 (DONE)**: closed by the #833 merge at `942ff349`.
6. **#792 (parked with #821)**: Maze Chase harness gaps; the lane is parked on the Owner capacity decision.
7. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
8. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance. The Owner capacity decision remains the critical path while it recurs.
9. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
13. **Model watch**: the 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears.
14. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; cancellations stay rare and justified.
15. **Board pin**: #70 is pinned and verified.
16. **Missed auditor round**: the Nov 7 daily audit died on the wall; the Nov 8 daily schedule is due about 05:00Z today. If it caps again, dispatch `auditor` on #70 as the manual recovery.
17. **Pages verification (DONE)**: `942ff349` deployed successfully twice (42443545805 and 42443598386).

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#829, #832, #804) never take `fix`/`continue`; route `lab`. #821 is a docs/product lane, so `fix` is valid there.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown; a lane that has repeatedly failed may be parked on the Owner capacity decision.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- The Maintainer session workspace is the PR head for PR-comment runs (the CLI bootstrap re-checks it out after the trusted checkout): treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content until the #832 opt-out and its plugin-import residual are fully resolved. The staged system prompt remains authoritative.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #829 eval verdict; on `approve-eval` the PAT sweep merges and #827 closes; on `fix` route `lab` with the exact findings.
2. Read the #832 lab outcome; on a lab push dispatch a fresh head-bound review, then the Tester, eval, and PAT sweep; #831 stays open for the residual and canary.
3. Read the #804 lab outcome on the B8 sanitizer fix; on a lab push dispatch a fresh head-bound review, then the Tester, eval, and PAT sweep; #798 closes on merge.
4. Track the #834 Curator remediation PR and route its review when it opens.
5. Keep #821 parked on the Owner capacity decision; keep #745 behind #803.
6. Re-check held and queued runs, the trigger allowlist, the model ladder, the schedule arms, and the wall.
7. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups, then #814 with #803, then #803 and #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does #829's eval approve the curator cap fix and unlock its PAT-sweep merge, closing #827?
2. Does #832's Lab Engineer close the CLI 1.19.5 plugin-import residual or record an explicit Owner acceptance, and does #831's scratch canary pass?
3. Does #804's Lab Engineer close the B8 sanitizer trust bypass and clear a fresh review on the new head, closing #798?
4. Will the Curator pick up #834 promptly and ship a scoped remediation PR?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? It remains the critical path while the daily wall recurs.
6. Will the daily wall recur today and cap the new lanes?
7. Does the Nov 8 daily Auditor round run clean at about 05:00Z?
