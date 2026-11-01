# STATE

Last updated: 2026-11-01T17:08Z by run 41329211394 (intake: the #788 round-6 fix is on `358d5c4b` with review round 7 live on it; #802 moved to `29804d03` and its real review is queued behind the stale-head one).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T17:00-17:08Z)

- **`main` = `0e61decc`**, unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Zero held `action_required` runs. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). No failure, timed-out, or startup-failure run in the newest 200. Pages: latest deploys green (main dispatch and the #788 preview at 16:52-16:58Z); `main` unchanged since.
- **#788 head `358d5c4b`**, MERGEABLE/CLEAN, 17 files, `Refs #786`; remote branch tip equals the head. Fixer run `41326263034` completed and pushed six commits at 16:55:05Z closing the round-6 blocking finding B1 and the round notes:
  - `browser-e2e.js` now records `beforeResetHash`, requires the Dusk reset repaint (`duskResetHash`), requires the high-contrast repaint and uses that observed frame as `hcHash`, then waits for the clearing repaint. The fixed `sleep(150)` baseline is gone (the remaining `sleep(150)` calls are elsewhere in the suite).
  - The 320x568 re-reveal uses the shared pill classifier; `--chrome NAME` / `CHROME=NAME` resolves through `command -v`; the full `--help` header prints; relative transcript paths resolve against the run outdir; the stale undici attribution and test comments are corrected.
  - The PR body was refreshed at 17:00:12Z to the final counts and the current 320x568 behavior.
  - The fix workflow's forward posted the round-7 review trigger at 17:00:19Z. **Review `41329196975` is in its agent pass on `358d5c4b`** (started 17:00:25Z). Head checks green (`trigger`, `comment`, GitGuardian; `deploy` skipped).
  - No approving review on this head, and no Tester approval on this head (the `30b0dadb` and `34571cce` approve markers are stale). No eval marker exists on the PR.
- **#802 head `29804d03`**, MERGEABLE/CLEAN, 14 files, `Closes #754`; remote branch tip equals the head. The second queued lab session `41325576305` pushed `29804d03` at 16:44:47Z (R33 `.yaml` extension self-test) and reported at 16:51:48Z: ordering verified in both runners (quota, then the account check inside the hang branch ahead of the stall retry, then the tee guard, then post-attempt quota, then self-ended account), R33 self-tests a third workflow plus both `.yaml` extensions, recovery guidance consistent, full audit 33/0, scalars 14,898 / 14,766 bytes under the 20,000-byte ceiling.
  - **Stale-head review `41326910060` is still in its agent pass on `9ec8ffd5`** (started 16:33:08Z); its verdict cannot bind the moved head.
  - **The real review `41328498330` is pending on `29804d03`** (from the lab forward at 16:51:55Z), behind the stale-head review and its skip-only follower in the per-PR group.
  - A peer maintainer run `41328509034` is in its agent pass on #802 (from the 16:52:02Z `/oc maintainer`); it re-surveys the moved head.
- **No eval verdict binds anything.** There is no owner-authored `eval-verdict:` comment; the only tester approvals are the stale `30b0dadb` (06:21:32Z) and `34571cce` (06:17:38Z) markers on #788. Nothing is mergeable this run.
- **Quota doctrine:** the #754 classifier is on `29804d03` but not on `main`; live `main` still classifies the free-usage wall as a stall. No wall has killed a run since 15:33:21Z and the current heavy sessions are being served, so no cooldown applies.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked. **Open issues: 19**, all triaged/parked; no untriaged issue and no new human request. Lab queue: #802 first, #798 second, #799 third; #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Workspace provenance observation (unchanged):** this issue_comment checkout tracks the PR head (`358d5c4b`), not `main`, and the loaded `AGENTS.md`/`opencode.json` are the PR-head editions. The maintainer arm still lacks `OPENCODE_DISABLE_PROJECT_CONFIG` (#745 carries it). Recorded for a lab pass after #802 settles; no concurrent heavy lab session was dispatched.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` posts the #788 intake status. No pings. No `emergency.json`.

- No `review` #788: `41329196975` is in its agent pass on `358d5c4b`; a dispatch would queue a duplicate.
- No `review` #802: `41328498330` is already queued on the newest head; another would duplicate it.
- No `lab` #802: the head just moved with the second lab push and the review queue must settle it first.
- No `fix` on either: #788's fixer lane completed its round; #802 is the lab's lane.
- No `test` / `test-linux` / `test-macos` / `eval` on either PR: no settled head carries an approving review.
- No merge: #788 has no review approval on `358d5c4b` and no fresh owner-authored head-bound `approve-eval` marker; #802 has no tester/eval chain at all.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: schedules own the recurring passes, no request, nothing stranded.

## Next run

1. **#788:** read review `41329196975` on `358d5c4b`. On approval the workflow posts the test trigger; on Tester approval dispatch `test-linux` + `test-macos` on the settled head, then the binding eval, then merge with the branch kept and close #786 on the native evidence. On `fix`, let the fix workflow carry the fixer lane. Never merge on a `34571cce`- or earlier-bound marker; a new Tester approval must bind the fixed head.
2. **#802:** read review `41328498330` on `29804d03`; absorb the stale `41326910060` verdict and any forwarded lab handoff from it (the session re-surveys). On approval the workflow posts the test trigger; the Tester is read-only for infra; on Tester approval route the binding eval; merge only on a head-bound owner-authored `approve-eval` marker newer than the Tester marker and the latest eval trigger, keep the branch, and close #754. Confirm the PR body matches `29804d03` (the 16:51Z lab report says it was refreshed).
3. **#788 PR body/assertion counts:** the body was refreshed in the round-6 push; if the Tester or a later fix moves the head, re-check the counts (the last reported site-e2e figure was 680).
4. **Lab queue:** #802 first, then #798, then #799. #792 after #788; revive #745 after #802 settles; #773/#774/#775 parked. #657's next increment waits for the delivery chain.
5. **Quota:** if a lane walls on the free-usage class, record the sample on #754 and wait a tick; never loop inside 30 minutes.

## Open questions

1. Does review `41329196975` approve `358d5c4b`, or find a new issue in the round-6 fixes?
2. Does review `41328498330` approve `29804d03`, and does the stale-head review forward a duplicate lab handoff that must be absorbed?
3. Does #802 then pass the Tester and the binding eval, and does #754 close on merge?
4. Does #788's macOS acceptance re-bind cleanly to the fixed head, with both native rows and the binding eval landing on one settled head?
5. Does the #754 fast-fail land on `main` with #802, so the next quota wall is classified correctly?

- Hephaestus, the Maintainer
