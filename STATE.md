# STATE

Last updated: 2026-11-01T13:58Z by run 41312817484 (intake: PR #802 is the #754 lab PR but its maintainer.yml is invalid to GitHub; lab fix dispatched and merge blocked; fresh #788 review probe dispatched).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T13:46-13:58Z)

- **`main` = `0e61decc`** (the #801 rebase merge), unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages green: main dispatch `41298359888` (10:38:40Z), the #802 preview deploy `41312817853` success at 13:46:18Z, and the `d5ae6352` #788 preview `41298313065`. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are the GitHub dynamic names). Zero held `action_required` runs.
- **PR #802 is the #754 lab PR, head `3e114fbe`, MERGEABLE/CLEAN, 11 files, `Closes #754`.** It adds the quota-wall and account-funds fast-fails to both runner paths plus the R15 guards and docs. Its review `41311846728` is in its agent pass (started 13:33:40Z) and a skip-only duplicate is pending behind it.
- **BLOCKING FINDING: the head's `.github/workflows/maintainer.yml` is invalid to GitHub.** Push validation run `41311839234` failed with `Invalid workflow file: .github/workflows/maintainer.yml#L1` / `(Line: 361, Col: 14): Exceeded max expression length 21000` and has zero jobs. Line 361 is the `Run Maintainer agent` `run: |` scalar; it is now **22,200 bytes** (main: 16,387; the PR adds 5,813). A run scalar containing `${{ }}` expressions is one template and the cap is 21,000 bytes. Merging this head would reject the entire Maintainer workflow (schedule, failure triage, triggers, merge sweep, held approvals, memory), halting production. The composite `Run opencode` scalar is also at 20,277 bytes (main: 14,464), only 723 bytes under the cap. The full audit passes 32/0, so the audit does not catch the cap; a length guard is part of the fix.
- **Decision: `lab` #802 with the exact fix direction** (move the new and enough existing prose out of the scalar into YAML comments above the step, fold the duplicate long `::error::` strings, keep every detector and budget behavior intact, regenerate the R15/R30 pins, add an audit length guard, re-run the full audit, and confirm the next push validation run is not a failure). **MERGE BLOCKED until the file validates.**
- **#788 is the delivery lane; head `d5ae6352`** (MERGEABLE/CLEAN, unchanged since the Fixer's 10:37:51Z push; 17 files, all `maze-chase/` harness/tests/docs plus `progress/786-harness-determinism.md`; `Refs #786`). Checks: `trigger` success, Pages `comment` success, GitGuardian success, `deploy` skipped. Two consecutive review deaths on this head were the free-usage quota class (round 6 `41298346346` at 11:22-11:44Z; fresh `41303537936` at 12:11-12:32Z), and the review auto-retry budget is exhausted (3/3). The 30-minute window after the 12:32:47Z death passed, so **this run dispatches a fresh `review` at `d5ae6352`** (the only remaining probe path; the classifier lands only when #802 merges).
- **No eval verdict binds anything.** The only eval verdict on #788 is the stale `34571cce` rejection (09:30:22Z), superseded and unusable. No owner-authored `eval-verdict: approve-eval` marker exists. The Tester `06:17:38Z` approve marker and the round-5 review approval of `8fbfea38` (09:50:05Z) predate the two later head moves and are stale.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged (no human discussion today beyond owner-PAT machine triggers). Lab queue: **#802 fix first**, #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **The only failure in the recent run set** is the invalid-workflow validation run `41311839234`; the many cancelled `maintainer` `workflow_run` entries are the deliberate single-pending-slot supersede, not failures. No other untriaged failure, no merge-ready PR, no held run.

## Decisions this run

`.maintainer/decision.json` = `[review #788 @ d5ae6352, lab #802]`. `.maintainer/comment.md` = the #802 blocking finding with the measured evidence and the fix direction. No `emergency.json` (no production-stopping defect is live; the risk is prospective in an unmerged PR, and the lab lane is healthy).

- `lab` #802: the invalid workflow file is a certain, production-stopping defect in the only path the #754 classifier can land through. Routing to the Lab Engineer is mandatory (infra PR; `fix`/`continue` are hard-blocked and misrouted). The Lab Engineer has 150 minutes under a 180-minute job, and it must fix the scalar budget without weakening the guards.
- `review` #788 @ `d5ae6352`: the workflow's automatic retry is at its hard cap (3/3), so a manually posted `/oc review (head ...)` is the only way to settle the delivery lane. The 30-minute cooldown has passed (death 12:32:47Z; dispatch now ~13:58Z). The head is unchanged, MERGEABLE/CLEAN, and already carries the Fixer's round-5 fixes.
- No `fix` #802 or #788: nothing failed in code; #802 needs the lab lane, and #788's head carries the round-5 fixes.
- No `test`/`test-linux`/`test-macos`/`eval` #802: the head is being fixed and will move; every downstream lane must bind the post-fix head.
- No `test`/`test-linux`/`test-macos`/`eval` #788: the review must settle the head first; every downstream lane re-binds to the settled head.
- No merge on either PR: #802 is invalid as shipped; #788 has no fresh owner-authored `eval-verdict: approve-eval` marker.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`: schedules own the recurring passes (today's arms are green), no request, nothing stranded.

## Next run

1. **Read the lab fix on #802.** Verify the head's maintainer.yml and composite action.yml run scalars are under 21,000 bytes with headroom (measure them from the pushed head, not from a local edit), that the R15/R30 pins were regenerated and the full audit is green, and that the push validation run for the new head is not a failure. Only then let the review/test/eval chain run. **Do not merge #802 on a head whose maintainer.yml is invalid.**
2. **Read the fresh #788 review on `d5ae6352`.** On approval the workflow posts `/oc test`; on Tester approval dispatch `test-linux` + `test-macos` together on the settled head, then the binding eval, then merge with the branch kept and close #786 on the native evidence. If it dies on the quota class again, record the sample on #754 and do not loop inside the 30-minute window; the classifier is in #802.
3. **Never merge #788 on a `34571cce`-bound marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS repaint fix (`36defc54`), the height pin (`51d6863b`), and the round-5 fixes (relative-outdir canonicalization, complete `--help` header, corrected progress record) must be in the merged diff.
4. **The #788 PR body is still stale** (673 assertions, no macOS repaint or F1/F2 mention); the final Tester report may correct it, or a Fixer wording pass before merge (moves the head, re-binds the chain).
5. **Lab queue:** #802 fix first, then #798, then #799. #792 after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain and keeps its `ubuntu-latest` pinning observation.
6. **Pages:** verified green for `0e61decc` and for the `3e114fbe` #802 preview; the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does the Lab Engineer get the maintainer.yml run scalar under the cap with the detectors fully intact and the audit pins consistent, and does the next push validation run go green?
2. Does the composite action's `Run opencode` scalar (20,277 bytes) also need the budget pass before it crosses the cap at runtime?
3. Does the fresh #788 review finish inside one burst now that the classifier PR is still unmerged, or does the quota wall hit again?
4. Does the Tester plus both native rows plus the binding eval converge on one #788 head once the review settles?
5. Which lane corrects the stale #788 PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?

- Hephaestus, the Maintainer
