# STATE

Last updated: 2026-11-08T03:36Z by run 42442926140 (intake: the #829 Tester approved `48bb2dc4` at 03:29:22Z and the binding Evaluator gate is dispatched; #833 eval, #832 lab, and #804 review remain live). Next-run priorities: read the #829 Evaluator verdict and the other three verdicts, merge on `approve-eval` (PAT sweep for #829, in-session for #833), keep #821 parked, check the wall and held runs.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 03:30-03:36Z on 2026-11-08)

- **main** = `5b69960172409a8e224358afba5b8d1816fc5ae0` (`git ls-remote` verified at 03:31Z, unchanged). Pages is green on that tip (main deploy 42441496734 at 03:09:13Z; the #833 preview 42440433185 completed success at 03:29Z).
- **The wall**: no lane has hit it since the 02:19Z tick. The per-egress-IP lottery still applies: a fresh pass after a death is the recovery lane, with no lab dispatch and no ladder advance.
- **Open PRs** (6):
  - **#829** `48bb2dc494dab4d06910d5460be391d417e967d0` MERGEABLE/CLEAN, 8 commits on `5b699601`, the curator cap/durability PR (`Closes #827`, branch `opencode/lab-827-curator-cap-headroom`). Review round 5 approved at 2026-11-07T05:54:50Z. Tester 42439068095 completed SUCCESS at 03:29:29Z: the signed report posted at 03:29:22Z approves `48bb2dc4` (full R1-R34 audit 34/34 on the real head, YAML 120/90, the pre-commented-timeout tolerance and every R25 guard reproduced, no blocking findings), the workflow published the owner-authored `/oc approve-test` marker at 03:29:24Z, and the `/oc maintainer` handoff posted at 03:29:26Z. No `/oc eval` had ever been posted; this run dispatches it. On `approve-eval` the PAT sweep merges (workflow-touching PR) and #827 closes.
  - **#833** `6d858a0d425c6c44afa7681dc52d31b80c6410e7` MERGEABLE/CLEAN, 4 commits on `5b699601`, the Curator archived-README remediation (`Fixes #825`, branch `opencode/issue825-curate-archive-readme-links`). Tester approved at 03:02:52Z on this head (live Chromium 55/55 and 52/52, landing suite 72/72, evidence scope standard); eval 42441516641 has been live since 03:09:30Z (per-PR group, queue max). On `approve-eval` merge in-session (docs-and-test-only PR) and #825 closes.
  - **#832** `e260536aa7cf05a12e1f5d25d8e69f324311c0eb` MERGEABLE/CLEAN, 6 commits on `5b699601`, the project-config opt-out PR (`Closes #831`, branch `opencode/lab-831-project-config-optout`). Review approved at 02:56:43Z; Tester 42440624640 completed at 03:28:29Z with a `lab` verdict: the opt-out pair is present on all 21 agent steps and every static check passes, but shipped CLI 1.19.5 still imports project `.opencode/plugin/*.js` under `OPENCODE_DISABLE_PROJECT_CONFIG=true` (import-time code execution with the job token and provider keys in the write-scoped arms). The workflow posted `/oc lab` at 03:28:35Z and Lab Engineer 42442877355 has been live on `e260536a` since 03:28:37Z. #831 stays open for the scratch canary.
  - **#804** `efb1784e7553251624deaf7612e4307e034392da` MERGEABLE/CLEAN, 2 commits on `5b699601`, 11 files, the per-OS commit-scope guard (`Closes #798`, branch `opencode/issue798-20261102035359`). Review 42439783880 live since 02:44:14Z on the rebased head (about 50 minutes at survey; agent cap 90 under the 120 job).
  - **#821** `dce109e4479b3cf2801a1b0127ea98778e58c398` MERGEABLE/CLEAN but behind main (15 commits, base `86570af1`), the Maze Chase harness PR (`Closes #792`). Parked on the Owner capacity decision since the 2026-11-07T04:49:27Z note; no fresh pass.
  - **#745** `7a04fa4a96e1982ac307ca40973fed29379def0b` CONFLICTING/DIRTY (5 commits, base `e73bd7a2`), parked behind #803.
- **Open issues** (22): #827 closes with #829, #831 with #832, #825 with #833, #798 with #804, #792 with #821, #742 with #745. #812/#814/#815/#803/#773/#774/#683/#678/#677/#661/#659/#657/#655/#582 remain the known held follow-ups; #70 and #42 are the boards. No untriaged issue and nothing newer than #831.
- **Held runs**: zero `action_required` (the two #833 preview/trigger runs from the 02:53:52Z tester push were approved and completed success).
- **Queued runs**: the four documented inert runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the only extra active names are GitHub-managed: Dependabot Updates, Dependency Graph, pages-build-deployment). No lab fix needed.
- **Model watch**: the registry serves 81 models; the pin `opencode/deepseek-v4.1-flash-free` and all three ladder rungs (`mimo-v2.6-flash-free`, `glm-5.3-flash-free`) resolve (the registry lists them unprefixed; the resolver adds the provider prefix). No retirement.
- **Failures**: none since the wall lifted. The newest red is the Nov 7 wall cluster (last maintainer death 23:02Z). The maintainer cancellations at 03:29Z are the deliberate single-pending-slot supersede noise from the comment-triggered skip clones, not crashes.
- **Concurrent wakes**: maintainer 42442875742 on #832 (in progress since 03:28:36Z, woken by the `/oc lab` comment) with 42442877470 pending behind it, and 42442929748 pending on #829 behind this run. Separate per-PR concurrency groups; keep-both memory handles the overlap. The #832 run owns the #832 lane; this run owns #829's eval dispatch.

## The live lanes (do not duplicate)

1. **#829** - eval dispatched this run at `48bb2dc4`. Next: read the Evaluator verdict; on `approve-eval` the hardcoded PAT sweep merges in a later run (workflow-touching PR) and #827 closes; on `fix` read the exact findings and route the `lab` lane (infra PR, never `fix`/`continue`).
2. **#833** - eval 42441516641 live since 03:09:30Z on `6d858a0d`. Next: the Evaluator verdict; on `approve-eval` the next Maintainer run merges in-session (`gh pr merge --rebase --match-head-commit 6d858a0d`, docs-and-test PR with no protected paths), verifies the Pages deploy, and #825 closes; on `fix` route the fix lane (`fix` is valid on this docs/product lane).
3. **#832** - Tester returned `lab` at 03:28:29Z on the plugin import gap; lab 42442877355 live on `e260536a`. Next: the lab push restarts the review/test/eval cycle; #831 stays open for the scratch canary.
4. **#804** - review 42439783880 live at `efb1784e`. Next: the review verdict; on approve the Tester, eval, and PAT sweep follow; on findings route `lab`.
5. **#821** - parked. Do not spend a fresh review until the Owner capacity decision is given.
6. **#745** - parked behind #803.

## The serialized infra queue

1. #833: eval live; then the in-session merge; on approve #825 closes and the Curator lane is done.
2. #829: eval live; then the PAT sweep; on approve #827 closes.
3. #832: lab live on the plugin import gap; then review, test, eval, PAT sweep; #831's canary stays open.
4. #804: review live; then the Tester, eval, PAT sweep; on approve #798 closes.
5. #803: needs a fresh head-bound review after the queue; its lifetime review budget is spent, so a manual fresh pass is the recovery lane.
6. #821 is parked on the Owner capacity decision; #745 behind #803.
7. After the infra merges: reconcile #812/#815 plus the #822 round-4 residuals and the #804 env-seam lessons into one scoped audit pass; then the deferred docs follow-ups (#773/#774); then #814 with #803; then #803 and #745 (and #742 closes).

## Loose ends board

1. **#827 (live via #829 eval)**: curator cap fix; the Tester approved and the binding Evaluator is the gate. After merge, no new curator dispatch is needed because #833 carries the #825 remediation.
2. **#831 (live via #832 lab)**: PR-head project-instruction loading; the Tester found the remaining plugin-import hole and the Lab Engineer is fixing it.
3. **#798 (live via #804 review)**: per-OS commit-scope guard; the rebase landed and the fresh review is the gate.
4. **#825 (live via #833 eval)**: the Curator remediation PR; the Tester approved and the binding Evaluator is the gate.
5. **#792 (parked with #821)**: Maze Chase harness gaps; the lane is parked on the Owner capacity decision.
6. **#745 (parked)**: owner-PAT env extension, CONFLICTING at `7a04fa4a`, behind #803.
7. **The wall**: per-egress-IP daily allowance, fresh-run recovery class; no lab dispatch, no ladder advance; the Owner capacity decision remains the critical path while it recurs. The Nov 7 wall persisted the whole day and every chain capped; the recovery contract held (markers, caps, no loops). The 02:19Z tick proved fresh runners viable again.
8. **#833 review residual (deferred, Curator follow-up)**: command examples in four touched archived READMEs still use pre-archive root paths (`archive/arpeggio/README.md:37,102`, `archive/automatrium/README.md:34,118`, `archive/homunculus/README.md:40,109`, `archive/granite/README.md:43`), `archive/rush/README.md:103` cites a `docs/index.md` that never existed there, the rush layout block and test count (20 vs 21) are stale, the orrery test count says 43 vs 57, and non-README archived docs still advertise retired `/Random/` URLs (`archive/orrery/docs/index.md:6`, `archive/orrery/docs/index.html:108`, `archive/halcyon/docs/index.md:23`, `archive/obsidian/docs/architecture.md:702`). Recorded for a Curator pass; no issue created (the Curator owns its tracking issues).
9. **#812/#815**: held behind the infra queue (R11/R17 overlaps).
10. **#817/#819 merged leftovers**: the deferred Curator docs pass and Lab Engineer docs pass.
11. **#773/#774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Queued-run anomaly**: four permanently queued runs with no jobs (37344324101, 36101155868, 36101155851, 36101155844); inert, recorded for the Auditor.
13. **Model watch**: the 1M-context free models noted by the Auditor; benchmark pass after the infra queue clears.
14. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes; cancellations stay rare and justified.
15. **Board pin**: #70 is pinned and verified.
16. **Missed auditor round**: the Nov 7 daily audit died on the wall; the Nov 8 daily schedule is due about 05:00Z today. If it caps again, dispatch `auditor` on #70 as the manual recovery.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#829, #832, #804) never take `fix`/`continue`; route `lab`. #821 and #833 are docs/product lanes, so `fix` is valid there.
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
2. Read the #833 Evaluator verdict; on `approve-eval` merge `6d858a0d` in-session, verify the Pages deploy, and close #825; on `fix` route the findings.
3. Read the #804 review verdict at `efb1784e`; on approve the Tester, eval, and PAT sweep follow; on findings route `lab` with the exact file:line citations.
4. Watch #832's lab push at `e260536a`; its new head restarts the review/test/eval cycle and #831 stays open for the scratch canary.
5. Keep #821 parked on the Owner capacity decision; keep #745 behind #803.
6. Confirm zero held runs and re-check the four permanently queued runs.
7. After the infra merges: the reconcile pass (#812/#815/#822 residuals/#804 env-seam), then the deferred docs follow-ups (including the #833 review residual), then #814 with #803, then #803 and #745 (and #742 closes).
8. Record the Owner capacity decision when given; it remains the critical path against the daily wall.
9. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the Evaluator approve #829 and unlock the PAT-sweep merge, closing #827?
2. Does the Evaluator approve #833 and unlock the in-session merge, closing #825?
3. Does #832's lab fix close the plugin-import hole and restart its review/test/eval chain?
4. Does #804 clear review on `efb1784e` and restart its tester/eval chain, closing #798?
5. Will the daily wall recur today and cap the new lanes?
6. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? It remains the critical path while the daily wall recurs.
