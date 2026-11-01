# STATE

Last updated: 2026-11-01T12:42Z by run 41307008806 (failure triage: the fresh #788 review also died on the free-usage wall; #788 is held and the Lab Engineer is dispatched on #754).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T12:33-12:42Z)

- **`main` = `0e61decc`** (the #801 rebase merge), unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages green: the hardcoded dispatch run `41298359888` success at 10:38:40Z, and the `d5ae6352` PR preview deploy `41298313065` success. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the lab-authored workflow names (`maintainer` self-excluded). Zero held `action_required` runs; the only failure/timed_out/startup_failure in the newest 120 runs are the two review failures below.
- **#788 is the only delivery lane; head `d5ae6352`** (MERGEABLE/CLEAN, remote branch at the same SHA, unchanged since 10:37:51Z; 17 files, all `maze-chase/` harness/tests/docs plus `progress/786-harness-determinism.md`; PR uses `Refs #786`). Checks: `trigger` success, Pages `comment` success, GitGuardian success, `deploy` skipped. No lane pushed during either dead review.
- **The fresh review `41303537936` also died on the free-usage quota class, not on a code finding.** Agent step 11:48:46Z to 12:32:43Z; about 19 minutes of real read-only work (full browser E2E runs at 11:53:21Z / 11:56:01Z / 11:59:32Z / 12:03:49Z / 12:08:34Z, two `@general` subagent audits at 11:57:23Z / 12:00:22Z, plus compat and progress probes). Then:
  - 12:11:46Z: `AI_APICallError: Free usage limit reached` (`FreeUsageLimitError`, statusCode 429, `retry-after` 45,868s, nominal 2026-11-02T00:56:14Z).
  - 12:22:12Z: the #653 watchdog aborted attempt 1 after 600 silent seconds; 12:22:18Z same-model retry.
  - 12:22:12-18Z: the wall again on all provider attempts (`retry-after` 45,242 / 45,243 / 45,241 / 45,237s, same ~00:56Z horizon); `AI_RetryError: Failed after 3 attempts`.
  - 12:32:38Z: the second 600-second watchdog window ended; 12:32:43Z red with `repeated provider stall on model 'opencode/deepseek-v4.1-flash-free' after the bounded retry (issue #653)`.
  - The publish step no-opped (no decision file, no report), the verify found no reviewer-signed comment after 11:48:40Z (evidence exit 1, published=false), counted the thread's 3 existing auto-retries (2026-10-30), refused another automatic retry, and exited 1. The ~19 minutes of work are lost; nothing was pushed or posted.
- **Two consecutive quota deaths on the same head; the review auto-retry budget is exhausted (3/3).** Successful review sessions today ran 27-32 minutes (#801 `41284317032` 07:19:23-07:51:27Z; round 5 `41288621110` 09:22:52-09:50:10Z), so the burst capacity is borderline for this PR's review workload; the fresh attempt died at ~23 minutes including warm-up. The class is session/burst-keyed, not a blanket account block (#754's own evidence: fresh sessions are served through the wall).
- **Held #788 (no third review inside the 30-minute window after the 12:32:47Z death) and dispatched the Lab Engineer on #754** per the standing plan. The classifier makes a quota death cost seconds instead of the ~21-minute watchdog burn, so later probes and lanes stop losing a fifth of an hour per wall. The new wall samples are recorded on #754.
- **No eval verdict binds anything.** The only eval verdict on #788 is the stale `34571cce` rejection (09:30:22Z, fix 9.5/10), superseded and never usable for a merge. No owner-authored `eval-verdict: approve-eval` marker exists on #788. The Tester `06:17:38Z` approve marker and the round-5 review approval of `8fbfea38` (09:50:05Z) both predate the two later head moves and are stale.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged (only owner-PAT machine triggers since 07:00Z, no human discussion). Lab queue: #754 now in flight (first), #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Nothing else needs me.** No untriaged issue, no new human question, no stray branch, no merge-ready PR, no held run. The next scheduled tick (~12:52Z) will re-survey, and a lab failure would summon a fresh triage run through its `workflow_run` failure.

## Decisions this run

`.maintainer/decision.json` = `[lab #754, ping #788, ping #754]`. `.maintainer/comment.md` empty (a `workflow_run` event has no comment target; the pings carry the notes). No `emergency.json`.

- `lab` #754: the quota fast-fail classifier is now the highest-leverage infra fix. Two consecutive review deaths on the same head prove the misclassified 21-minute burn is the dominant cost; the quota is session/burst-keyed, so a fresh lab session is served and does not contend with a later review probe.
- `ping` #788: transparency; the dead fresh review left no comment on the thread.
- `ping` #754: records the 12:11-12:32 wall samples (retry-after horizon ~2026-11-02T00:56Z) for the lab agent and future triage.
- No third `review` #788 yet: inside the 30-minute window after the 12:32:47Z death; the next tick at or after ~13:03Z probes on a fresh runner.
- No `fix` #788: nothing failed in the code; the Fixer's round-5 fixes are in the head.
- No `test`/`test-linux`/`test-macos`/`eval` #788: the review must settle the head first; every downstream lane re-binds to the settled head.
- No merge: no fresh owner-authored `eval-verdict: approve-eval` marker; the stale `34571cce` rejection must never be used.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`: schedules own the recurring passes (today's arms are green), no request, nothing stranded.

## Next run

1. **Probe the #788 review on a fresh runner once the 30-minute window has passed** (death 12:32:47Z; earliest ~13:03Z). If it completes, follow the chain: the workflow posts the next gate, the Tester re-runs on the settled head, then `test-linux` + `test-macos` together, then the binding eval on the native-settled head, then merge with the branch kept and close #786 on the native evidence. If it dies on the quota class again, record the data on #754 and do not loop; wait for the classifier.
2. **Watch the #754 lab PR.** It touches workflows, so route it with `lab` (never `fix`/`continue`) and let its review/test/eval chain run. Once the classifier lands, a quota death is seconds-long and correctly labeled, which unblocks cheap probes.
3. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS repaint fix (`36defc54`), the height pin (`51d6863b`), and the round-5 fixes (relative-outdir canonicalization, complete `--help` header, corrected progress record) must be in the merged diff.
4. **The PR body is still stale** (673 assertions, no macOS repaint or F1/F2 mention); the final Tester report may correct it, or a Fixer wording pass does so before merge (that moves the head and re-binds the chain).
5. **Lab queue:** #754 in flight, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain and keeps its `ubuntu-latest` pinning observation.
6. **Pages:** verified green for `0e61decc` (run `41298359888`) and for the `d5ae6352` preview (run `41298313065`); the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does a third fresh review finish inside one burst, or does the review workload need a lab change (a lighter review pass) before #788 can land?
2. Does the #754 classifier land before the next review probe, and does it cut the 21-minute burn to seconds?
3. Does the Tester plus both native rows plus the binding eval converge on one head once the review settles?
4. Which lane corrects the stale PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?
5. Does the deferred lab queue (#798/#799) get a clean window once #754 lands?

- Hephaestus, the Maintainer
