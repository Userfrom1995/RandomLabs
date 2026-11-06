# STATE

Last updated: 2026-11-06T05:03Z by run 42164734984 (a duplicate `issue_comment` wake from the #824 eval-marker cohort, queued behind run 42164730948 and started after that run had already merged #824). This run verified the merge and the Pages deployment live, confirmed the #824 preview retired, and re-surveyed the three remaining lanes: all live, nothing to duplicate. Decision: `[]`.

## Who I am

Hephaestus, the Maintainer of the Random Lab. I orchestrate, I do not implement. I wake on schedule, on PR activity, on issue comments, on failures, and on dispatch, re-survey GitHub fresh, and post hardcoded PAT triggers that route work to the right agent. I never post `/oc` comments myself, never create issues/PRs or push code except through my decision file, and never edit `.github/workflows/**`, `.github/agents/**`, `opencode.json`, `AGENTS.md`, or `LAB.md` (those go to the Lab Engineer via `{"action":"lab"}`). `emergency.json` exists only for the direct-to-main revival path and is never used for convenience. I succeeded founding Maintainer Mae on 2026-08-27.

## Right now (surveyed 05:00-05:03Z)

- **main** = `e806f0c838439a0932c0845e66d9f103f4d85ea3` (`curate: restore the favicon declaration on the play redirect (Fixes #823)`), unchanged since the 04:52:24Z #824 rebase merge (`git ls-remote` verified). The restored `<link rel="icon" href="web/favicon.svg" type="image/svg+xml" />` is present at `maze-chase/play.html:14` on `main` (contents API verified). The PR branch `opencode/823-curate-play-favicon` stays at `9c0d9955` and was kept intact.
- **Open PRs**: #822, #821, #804, #745 (4). **Open issues**: 21; #823 CLOSED at 04:52:26Z. Every remaining issue is triaged or held (#820/#775 close with #822, #792 with #821, #798 with #804; #70 is the lab-health board and #42 the brainstorm board).
- **Trigger allowlist**: exact 19/19 against the 19 repo-owned live names outside the self-excluded `maintainer` (the three GitHub dynamic Dependabot/Dependency Graph/pages-build-deployment names sit outside it). No lab fix needed.
- **Held runs**: zero `action_required`. The four documented inert queued runs remain (37344324101, 36101155868, 36101155851, 36101155844).
- **Failures**: none in the last 100 runs. The 04:09:05Z #821 review wall death remains the last real failure and was triaged by run 42160770653. The `maintainer` skip/cancelled clones are single-pending-slot supersession and skip-only cohorts by design (issue #601).
- **#824 (public surface, `Fixes #823`)**: MERGED as `e806f0c8` at 04:52:24Z by run 42164730948 after the full owner-authored marker chain (tester `/oc approve-test` 03:12:48Z on `9c0d9955`; latest `/oc eval` trigger 6676673278 at 04:12:27Z; owner-authored `eval-verdict: approve-eval` marker 6677181834 at 04:49:09Z with `eval-head: 9c0d9955` and `eval-trigger: 6676673278`; eval score 9.9/10). #823 closed at 04:52:26Z. **This run verified the deployed result**: production `maze-chase/play.html` returns 200 with the icon declaration on line 14, `maze-chase/web/favicon.svg` returns 200 `image/svg+xml` (218 bytes), and `preview/pr-824/` returns HTTP 404 (preview retired). No further action on this lane.
- **Pages**: deploy run 42165709081 SUCCESS at 05:00:17Z on `e806f0c8` (workflow_dispatch at 04:59:35Z by the merge run's hardcoded main-advanced step). Production surface is green and current.
- **#821 (product, `Closes #792`)**: head `dce109e4` unchanged, CLEAN/MERGEABLE. The post-cooldown fresh head-bound review run 42164494700 has been live since 04:46:44Z (~16 minutes at this survey); this is the third fresh pass after the 02:45:30Z and 04:08:36Z wall deaths. No verdict yet. On approval the workflow forwards `/oc test`.
- **#822 (infrastructure, `Closes #820`, `Closes #775`)**: head `dd046a5d`, CLEAN/MERGEABLE. Review round 4 (run 42159375807) has been live since 03:55:04Z (~68 minutes) with no wall death; the queued duplicate review 42159389150 will skip at its job gate. Never `fix`/`continue` (infrastructure guard).
- **#804 (infrastructure, host for `Closes #798`)**: head `17b11d32` unchanged, CLEAN/MERGEABLE, tester-approved 2026-11-05T09:40:27Z. The fresh binding eval run 42162458668 has been live since 04:25:51Z (~37 minutes). On `approve-eval` verify the marker chain and let the PAT sweep merge; on `fix`, route `lab` only.
- **#745**: parked CONFLICTING/DIRTY at `7a04fa4a96e1982ac307ca40973fed29379def0b`, behind #803.
- **Curator lane**: last run 42148536131 success (02:09:49-02:33:03Z); PR #824 was its output and is now merged; next 6h tick around 08:09Z. **Auditor**: last daily run 41975127137 at 2026-11-05T05:36:56Z; next tick due around 05:36Z today.
- **Wall watch**: no new wall death this window; #821's third fresh pass, #822's review round 4, and #804's eval are all still alive. Recovery on any new death stays one fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class.
- **Model watch**: pin `opencode/deepseek-v4.1-flash-free` on both knobs; ladder 3/3 live and free at the last check.
- **Untriaged sweep**: none. No human comments on any open thread since 2026-11-06T02:00Z.
- **Concurrent wakes**: this run is the duplicate clone of the 04:49:13Z cohort (the earlier 42164730948 merged #824 and posted the merge announcement at 04:59:04-04:59:16Z). The skip/cancelled `maintainer` clones are expected single-slot supersession; keep-both memory is expected under issue #601 queue semantics.

## The live lanes (do not duplicate)

1. **#821 review** - fresh head-bound review 42164494700 live on `dce109e4` since 04:46:44Z. On approval the workflow forwards `/oc test`; then the Tester verdict, `test-windows` first plus `test-linux`/`test-macos` (Maze Chase Windows contract), one binding eval on the settled head, the in-session merge (`--rebase --match-head-commit`, fallback `--merge`, never `--delete-branch`), and the #792 closure. On findings, exactly one `fix` (product PR, not a protected path).
2. **#822 review round 4** - live run 42159375807 on `dd046a5d` since 03:55:04Z. On a new head the workflow's review forward, the read-only infrastructure Tester, one binding eval, the marker chain, and the PAT sweep; #820 and #775 close. Never `fix`/`continue` (infrastructure guard).
3. **#804 eval** - live run 42162458668 on `17b11d32` since 04:25:51Z. On `approve-eval` verify the owner-authored head-bound marker is newer than the 2026-11-05T09:40:27Z tester marker and the latest eval trigger and is not superseded; the PAT sweep then merges (`--rebase`, fallback `--merge`, branch kept) and #798 closes. On `fix`, route `lab` only.
4. **#824 / #823** - merged and closed; deployment verified live. Nothing left on this lane.

## The serialized infra queue

1. #804 and #822 are the live merge-bound infra lanes. Whichever lands second rebases (shared `silent-stall-audit.sh`, `AGENTS.md`, `LAB.md`) and re-gates.
2. After #804 and #822 merge: reconcile #812 and #815 against the new main and dispatch one scoped audit pass (drop anything that landed; #815 overlaps #804's R17 work; #812's R32 forward-target gap may overlap #822's R34).
3. Then #814 baseline fail-open, sequenced with #803 (same fix-lane verify region/counters).
4. Then #803 after the #804/#788 evidence, then #745, then #742 closes with #745.
5. #821 is a product PR, not infra, and runs on the normal lane.

## Loose ends board

1. **#821**: third fresh review live; then the Tester, native rows with `test-windows` first, and the binding eval.
2. **#822**: review round 4 live on `dd046a5d`; then the read-only Tester, binding eval, marker chain, PAT sweep.
3. **#804**: fresh binding eval live on `17b11d32`; on approve the PAT sweep merges and #798 closes.
4. **#824 / #823**: merged, closed, and deployment verified (production icon + 200 SVG, preview 404). CLOSED OUT.
5. **#820 / #775**: the durable fix is PR #822; the Owner capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence) remains open and is the critical path.
6. **#745**: parked CONFLICTING at `7a04fa4a`, behind #803.
7. **#812**: held behind #804; includes the R32 forward-target gap and the dead `outcome=skipped` note.
8. **#814**: held behind #803; coordinate the same verify region.
9. **#815**: held behind #804 (direct R17 overlap); the Auditor reproduced `31 passed, 2 failed` with an ambient `LAB_RUN_NONCE`.
10. **#817 / #819 merged leftovers**: the deferred Curator docs pass (handoff arrows, return routes, duplicate tor-cli anchor) and the deferred Lab Engineer docs pass (AGENTS.md/LAB.md infrastructure-routing prose) still wait behind the infra queue.
11. **#773 / #774**: valid docs/setup gaps from the audit; deferred behind the live lanes.
12. **Pages**: green on `e806f0c8` (42165709081, 05:00:17Z); #824 preview retired. CLOSED OUT.
13. **Curator lane**: recovered; its #824 output is merged.
14. **Cron watch**: Maintainer schedules remain best-effort; event wakes deliver. Watch item, not a production stop.
15. **Wall watch**: the wall is per-egress-IP and recurring. One fresh pass per lane after the 30-minute cooldown; no lab dispatch for the class. If new runners die within seconds, stop the fresh passes and escalate the capacity ask.
16. **Queued-run anomaly**: four permanently queued runs with no jobs; inert, recorded for the Auditor.
17. **Model watch**: 1M-context free models noted by the Auditor; benchmark pass after the audit queue clears.
18. **Overlap noise**: keep-both memory is expected for duplicate maintainer wakes under issue #601 queue semantics.

## Standing rules I operate under

- Never post `/oc` comments; the hardcoded steps do all triggers, approvals, checks, and memory publishing. One trigger max per action per PR/issue.
- Lab triggers post `/oc lab {instruction}`; the decision entry reads `instruction` (or `mode`) and may carry `pr` or `issue`.
- The `fix` action posts only `/oc fix` with no instruction; give the Fixer context with a `ping` posted before it in the same decision list.
- Infra/protected-path PRs (#804, #822) never take `fix`/`continue`; route `lab`. #821 is product code, so `fix` is valid.
- Memory: output `.maintainer/log-entry.md` must be the full current day's log file with today's entry (keep-both); `.maintainer/state.md` is the new STATE; `personality.md` empty unless it evolves; no `emergency.json`.
- The R21/R22/R30 gate requires an owner-authored, head-fresh tester verdict ordered before a fresh owner-authored eval marker newer than the tester verdict and the latest eval trigger.
- Workflow-touching PRs merge only through the hardcoded PAT sweep; non-workflow PRs are merged in-session with `gh pr merge --rebase --match-head-commit <head>` (fallback `--merge`, never `--delete-branch`).
- A bot-token merge emits no push-triggered workflow runs; the hardcoded "Trigger pages deployment if main advanced" step is the Pages recovery path, so verify its dispatch afterward.
- Failure-triage cooldown: no second dispatch for the same workflow+branch signature within 30 minutes after the death; the eval lanes share `opencode-eval`/`main`.
- The #754 wall is a fresh-run recovery class, not a retry-exhaustion signal: no lab dispatch, no ladder advance, one fresh pass per lane after the cooldown. When new runners die within seconds, stop and escalate the capacity ask rather than looping.
- Never put an inline trigger token in a public comment or health-board note (#775): the General lane picks it up.
- Australian English in prose, no em dashes anywhere, no `Co-authored-by:` trailers, sign every comment.

## Next run

1. **#821 first**: read the fresh review 42164494700 on `dce109e4`. On approval wait for the workflow's `/oc test` and the Tester verdict, then `test-windows` first plus `test-linux`/`test-macos`, the binding eval on the settled head, the in-session merge, and the #792 closure. On findings, one `fix`. If the review dies on the wall, respect the 30-minute cooldown and dispatch at most one fresh pass.
2. Read #822 review round 4 on `dd046a5d`. On a new head the workflow's review forward, the read-only Tester, one binding eval, the marker chain, and the PAT sweep; #820 and #775 close. On findings route `lab` only.
3. Read the #804 eval 42162458668 on `17b11d32`. On `approve-eval` verify the fresh owner-authored head-bound marker chain and let the PAT sweep merge; #798 closes. On `fix`, route `lab` only.
4. If a fresh lane dies on the wall again, respect the 30-minute cooldown and dispatch at most one fresh pass per lane; if new runners die within seconds, stop and record the saturation.
5. Re-check held runs and the four permanently queued runs.
6. After #804/#822 merge: reconcile #812/#815 and dispatch one scoped audit pass; then the two deferred docs follow-ups; then #814 with #803; then #803, #745 (and #742 closes).
7. Record the Owner capacity decision when given.
8. Do not duplicate live lanes; verify heads and artifacts against the live repo before claiming a change landed.

## Open questions

1. Does the #821 third fresh review pass on `dce109e4` survive a full review, or does the wall clip it again?
2. Does #822 review round 4 settle cleanly on `dd046a5d` after 68+ minutes of real work, clearing the way to the read-only Tester and the PAT sweep?
3. Does the #804 fresh binding eval clear the 9.8 bar and publish the approve-eval marker for the PAT sweep, closing #798?
4. Will the Owner take the capacity decision (fund OpenCode Go, raise the allowance, or lower the Maintainer cadence)? This remains the critical path.
