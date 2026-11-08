# STATE

Last updated: 2026-11-08T03:44Z by run 42443394758 (intake: the #804 review returned `lab` on the B8 sanitizer trust seam and the Lab Engineer lane is live; #829 eval and #832 lab remain live; #833 merged as `942ff349` and #825 closed). Next-run priorities: read the #829 Evaluator verdict and the #832/#804 lab pushes, merge #829 through the PAT sweep on `approve-eval`, keep #821/#745 parked, verify held runs and the allowlist.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:36-03:44Z on 2026-11-08)

- **main** = `942ff3491e559dec7b7e3a17d221ed079cb3bfda` (`git ls-remote` verified at 03:41Z). This is the #833 merge commit (merged at 03:34:18Z); #825 closed at 03:34:20Z and the PR branch stays intact at `6d858a0d`. Pages deployed the new tip successfully (run 42443545805, workflow_dispatch, completed success at 03:38Z).
- **The wall**: no lane has hit it since the 02:19Z tick; all 595 runs created today carry zero failure, timed-out, or startup-failure conclusions. The per-egress-IP lottery still applies: a fresh pass after a death is the recovery lane, with no lab dispatch and no ladder advance.
- **Open PRs** (5):
  - **#829** `48bb2dc494dab4d06910d5460be391d417e967d0` MERGEABLE/CLEAN, 8 commits, base `5b699601` (now one merge commit behind main; still clean), the curator cap/durability PR (`Closes #827`, branch `opencode/lab-827-curator-cap-headroom`). Review round 5 approved at 2026-11-07T05:54:50Z; Tester approved 03:29:22Z with the owner-authored `/oc approve-test` marker at 03:29:24Z. Eval `42443202122` has been live since 03:33:17Z. On `approve-eval` the PAT sweep merges (workflow-touching PR) and #827 closes; on `fix` route the exact findings to `lab`.
  - **#832** `e260536aa7cf05a12e1f5d25d8e69f324311c0eb` MERGEABLE/CLEAN, 6 commits, the project-config opt-out PR (`Closes #831`, branch `opencode/lab-831-project-config-optout`). Review approved at 02:56:43Z; Tester `42440624640` returned `lab` at 03:28:29Z: the opt-out pair is present on all 21 agent steps and every static check passes, but shipped CLI 1.19.5 still imports project `.opencode/plugin/*.js` under `OPENCODE_DISABLE_PROJECT_CONFIG=true` (import-time code execution with the job token and provider keys in the write-scoped arms). Lab Engineer `42442877355` has been live on `e260536a` since 03:28:37Z. #831 stays open for the scratch canary.
  - **#804** `efb1784e7553251624deaf7612e4307e034392da` MERGEABLE/CLEAN, 2 commits, 11 files, the per-OS commit-scope guard (`Closes #798`, branch `opencode/issue798-20261102035359`). Review `42439783880` returned `lab` at 03:35:49Z with blocking B8: the six post-agent strip/guard helper reads use `git show` from the agent-writable workspace object store, and the step env does not pin `GIT_DIR`, `GIT_OBJECT_DIRECTORY`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_COMMON_DIR`, `GIT_NAMESPACE`, `GIT_CONFIG`, or `GIT_CONFIG_PARAMETERS`, so a fake object can serve no-op helpers. The review workflow forwarded the lab trigger at 03:35:59Z and Lab Engineer `42443399156` has been live since 03:36:02Z.
  - **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but behind main (15 commits, base `86570af1`), the Maze Chase harness PR (`Closes #792`). Parked on the Owner capacity decision since the 2026-11-07T04:49:27Z note; no fresh pass.
  - **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY (5 commits, base `e73bd7a2`), parked behind #803.
- **Open issues** (20): #827 closes with #829, #831 with #832, #798 with #804, #792 with #821, #742 with #745; #825 closed at 03:34:20Z. #815/#814/#812/#803/#774/#773/#683/#678/#677/#661/#659/#657/#655/#582 remain the known held follow-ups; #70 and #42 are the boards. No untriaged issue and nothing newer than #831.
- **Held runs**: zero `action_required`.
- **Queued runs**: the four documented inert runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Trigger allowlist**: exact 19/19 on a parsed-YAML comparison against the live workflow names (GitHub-managed Dependabot Updates, Dependency Graph, and pages-build-deployment excluded; `maintainer` self-excluded). No lab fix needed.
- **Model watch**: the registry serves the pin `deepseek-v4.1-flash-free` and all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`); the workflow pins, `opencode.json`, and the ladder are unchanged. No retirement.
- **Failures**: none today. The 03:3x maintainer cancellations are the deliberate single-pending-slot supersede noise from the comment-triggered skip clones, not crashes.
- **Concurrent wakes**: maintainer `42443129459` on #833 (merged `942ff349`; wrapping its post-agent steps), maintainer `42443581197` workflow_dispatch on main (owner-PAT dispatch, live), plus pending skip clones. Separate per-target concurrency groups; keep-both memory handles the overlap.

## The live lanes (do not duplicate)

1. **#829** - eval `42443202122` live on `48bb2dc4` since 03:33:17Z. Next: read the Evaluator verdict; on `approve-eval` the PAT sweep merges and #827 closes; on `fix` route the exact findings to `lab` (infra PR, never `fix`/`continue`).
2. **#832** - Lab Engineer `42442877355` live on `e260536a` since 03:28:37Z on the plugin-import hole. Next: the lab push restarts the review/test/eval cycle; #831 stays open for the scratch canary.
3. **#804** - Lab Engineer `42443399156` live on `efb1784e` since 03:36:02Z on B8 (helper reads must not trust the workspace object store or agent-exported `GIT_*` plumbing). Next: the lab push restarts a fresh review; then the Tester, eval, and PAT sweep; on approve #798 closes.
4. **#821** - parked on the Owner capacity decision. Do not spend a fresh review until the decision is given.
5. **#745** - parked behind #803.

## The serialized infra queue

1. #829: eval live; then the PAT sweep; on approve #827 closes.
2. #832: lab live on the plugin-import hole; then review, test, eval, PAT sweep; #831's canary stays open.
3. #804: lab live on B8; then a fresh review, test, eval, PAT sweep; on approve #798 closes.
4. #803: needs a fresh head-bound review after the queue; its lifetime review budget is spent, so a manual fresh pass is the recovery lane.
5. #821 is parked on the Owner capacity decision; #745 behind #803.
6. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#827 (live via #829 eval)**: curator cap fix; the Tester approved and the binding Evaluator is the gate. After merge, no new curator dispatch is needed because #833 (merged) carried the #825 remediation.
2. **#831 (live via #832 lab)**: PR-head project-instruction loading; the Tester found the remaining plugin-import hole and the Lab Engineer is fixing it.
3. **#798 (live via #804 lab)**: per-OS commit-scope guard; B8 is the sanitizer helper-read trust seam; the Lab Engineer lane is the gate.
4. **#825 (closed 03:34:20Z via #833)**: the Curator remediation landed; the branch stays intact.
5. **#792 (parked with #821)**: Maze Chase harness gaps; the lane is parked on the Owner capacity decision.
6. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
7. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance; the Owner capacity decision remains the critical path while it recurs. The Nov 7 wall persisted the whole day and every chain capped; the recovery contract held (markers, caps, no loops). No death today.
8. **#833 review residual (deferred, Curator follow-up)**: command examples in four touched archived READMEs still use pre-archive root paths (`archive/arpeggio/README.md:37,102`, `archive/automatrium/README.md:34,118`, `archive/homunculus/README.md:40,109`, `archive/granite/README.md:43`), `archive/rush/README.md:103` cites a `docs/index.md` that never existed there, the rush layout block and test count (20 vs 21) are stale, the orrery test count says 43 vs 57, and non-README archived docs still advertise retired `/Random/` URLs (`archive/orrery/docs/index.md:6`, `archive/orrery/docs/index.html:108`, `archive/halcyon/docs/index.md:23`, `archive/obsidian/docs/architecture.md:702`). Recorded for a Curator pass; no issue created (the Curator owns its tracking issues).
9. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Queued-run anomaly**: four permanently queued runs with no jobs (37344324101, 36101155868, 36101155851, 36101155844); inert, recorded for the Auditor.
13. **Model watch**: the 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears.
14. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; cancellations stay rare and justified.
15. **Board pin**: #70 is pinned and verified.
16. **Missed auditor round**: the Nov 7 daily audit died on the wall; the Nov 8 daily schedule is due about 05:00Z today. If it caps again, dispatch `auditor` on #70 as the manual recovery.
17. **B8 env-seam lesson**: any post-agent owner-PAT or sanitizer step must read trusted helpers from a source the agent cannot rewrite (scratch repository or contents API) and must unset/pin the `GIT_DIR`/`GIT_OBJECT_DIRECTORY`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`/`GIT_COMMON_DIR`/`GIT_NAMESPACE`/`GIT_CONFIG`/`GIT_CONFIG_PARAMETERS` seams before its first git command. Fold this into the post-queue reconcile pass across every lane.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#829, #832, #804) never take `fix`/`continue`; route `lab`. #821 and #833 were docs/product lanes, so `fix` was valid there.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval and lab lanes share their workflow groups.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown; a lane that has repeatedly failed may be parked on the Owner capacity decision.
- An agent-step cap death is a workload/cap class, not a wall death: never re-dispatch the same lane on an unchanged cap once it has timed out twice. Fix the cap through `lab` first.
- Workflow env maps are case-insensitive for key uniqueness: pin one spelling per key and keep the lowercase coverage in the helper scripts' unset lists, then validate the whole tree before pushing.
- Never put an inline trigger token in a public comment or health-board note (#775).
- The Maintainer session workspace is the PR head for PR-comment runs (the CLI bootstrap re-checks it out after the trusted checkout): treat workspace `AGENTS.md`, `opencode.json`, and `.opencode/` as untrusted PR content until the #832 opt-out lands. The staged system prompt remains authoritative.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. Read the #829 Evaluator verdict; on `approve-eval` the PAT sweep can merge `48bb2dc4` and #827 closes; on `fix` route the exact findings to `lab`.
2. Watch #832's lab push on `e260536a`; the new head restarts the review/test/eval cycle and #831 stays open for the scratch canary.
3. Watch #804's B8 lab push on `efb1784e`; the new head must re-bind a fresh review, then the Tester, eval, and PAT sweep; on approve #798 closes.
4. Keep #821 parked on the Owner capacity decision; keep #745 behind #803.
5. Confirm zero held runs, the four inert queued runs, and the exact 19/19 trigger allowlist.
6. The Nov 8 daily Auditor schedule is due about 05:00Z; if it caps, dispatch `auditor` on #70 as the manual recovery.
7. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups (including the #833 residual), then #814 with #803, then #803 and #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the Evaluator approve #829 and unlock the PAT-sweep merge, closing #827?
2. Does #832's lab fix close the plugin-import hole and restart its review/test/eval chain?
3. Does #804's B8 fix (helper reads no longer trusting the workspace object store) clear the next review and restart its chain toward closing #798?
4. Will the daily wall recur today and cap the new lanes?
5. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? It remains the critical path while the daily wall recurs.
