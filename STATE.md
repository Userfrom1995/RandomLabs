# STATE

Last updated: 2026-11-01T11:52Z by run 41303228730 (failure triage: the #788 review round 6 died on the free-usage wall at 11:22 and the review gate's auto-retry budget is exhausted; a fresh review is dispatched on the unchanged head `d5ae6352`).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T11:45-11:52Z)

- **`main` = `0e61decc`** (the #801 rebase merge), unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages is green: the hardcoded dispatch run `41298359888` completed success at 10:38:40Z, and the `d5ae6352` PR preview deploy `41298313065` completed success. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the lab-authored workflow names (`maintainer` self-excluded; the three remaining live names are GitHub dynamic workflows). Zero held `action_required` runs, and the only failure/timed_out/startup_failure in the newest 120 runs is the review run below.
- **#788 is the only delivery lane; head `d5ae6352`** (MERGEABLE/CLEAN, 17 files, all `maze-chase/` harness/tests/docs plus `progress/786-harness-determinism.md`; PR uses `Refs #786`; the Fixer's round-5 fixes are in the head: relative-`--outdir` canonicalization, complete `--help` header, corrected progress record). No lane pushed during the dead review; the head is unchanged since 10:37:51Z.
- **Review round 6 `41298346346` FAILED on the free-usage quota class, not on a code finding.** Agent step 10:38:14Z to 11:44:31Z (66 minutes), 44 minutes of real read-only work (parallel `@general` audits of the compat and web harnesses, progress-record and test-inventory probes). Then `AI_APICallError: Free usage limit reached` (`FreeUsageLimitError`, `retry-after` 48,889s / 48,828s / 48,214s, nominal 2026-11-02T00:57Z, per-egress bucket) at 11:22:44Z / 11:23:45Z / 11:33:59Z; the #653 watchdog killed attempt 1 after 600 silent seconds, retried the same model once at 11:33:56Z, killed attempt 2 after the second 600 seconds, and failed loudly at 11:44:26Z with `repeated provider stall ... after the bounded retry`. No decision file, no report, no comment: the publish step no-opped, the verify found no reviewer-signed comment after 10:37:58Z, counted the thread's 3 existing auto-retries (2026-10-30), refused another automatic retry, and exited 1. The 44 minutes of review work are lost.
- **Fresh review dispatched this run** (`{"action": "review", "pr": 788, "head": "d5ae6352..."}`): the gate's auto-retry budget is exhausted, so a plain `/oc review` is the only fresh path. Fresh runners have repeatedly been served after quota walls (07:19Z #801 review, 09:50Z round 5, 10:19Z Tester, 10:37Z Fixer), and this Maintainer session is served normally now, so a fresh egress bucket is likely. A `ping` on #788 records the death and the re-dispatch.
- **No eval verdict binds anything.** The only eval verdict on #788 is the stale `34571cce` rejection (09:30:22Z, fix 9.5/10), superseded and never usable for a merge. No owner-authored `eval-verdict: approve-eval` marker exists on any PR.
- The Tester `06:17:38Z` approve marker and the round-5 review approval of `8fbfea38` (09:50:05Z) are both stale (two head moves since).
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged (no non-bot comment on any watched issue since 07:00Z). Lab queue: #754 first (FreeUsageLimitError classification; today's 11:22-11:34 wall is a fresh datum and still burns ~21 minutes as a mislabeled stall), #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Nothing else needs me.** No untriaged issue, no new human question, no stray branch, no merge-ready PR, no held run. A second Maintainer wake `41303228785` is queued behind this run and will re-survey with the fresh review in flight.

## Decisions this run

`.maintainer/decision.json` = `[review #788, ping #788]`. `.maintainer/comment.md` empty (a `workflow_run` event has no comment target; the ping carries the note). No `emergency.json`.

- `review` #788 @ `d5ae6352`: the only fresh path after the auto-retry cap; binds the unchanged, MERGEABLE/CLEAN head and likely a clean egress bucket.
- `ping` #788: transparency; the dead session left no comment and the failed run has no public trace on the thread.
- No `fix` #788: nothing failed in the code; the Fixer's round-5 fixes are in the head.
- No `test`/`test-linux`/`test-macos`/`eval` #788: the review must settle the head first; every downstream lane re-binds to the settled head.
- No merge: no fresh owner-authored `eval-verdict: approve-eval` marker; the stale `34571cce` rejection must never be used.
- No `lab` yet: delivery-first, and a concurrent lab session would contend for the same free-tier allowance. If the fresh review also dies on the quota class, the next run holds #788 and dispatches `lab` on #754 instead of a third review.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`: schedules own the recurring passes (today's arms are green), no request, nothing stranded.

## Next run

1. **#788 first.** Read the fresh review on `d5ae6352`. If it approves, the workflow posts `/oc test` and the Tester re-runs on the settled head; on Tester approval dispatch `test-linux` + `test-macos` together on the settled head, then the binding eval on the native-settled head, then merge with the branch kept and close #786 on the native evidence. If the review returns `fix`, the workflow's `/oc fix` carries it; if any lane pushes, every later lane re-binds to the moved head.
2. **If the fresh review dies on the quota class again:** do NOT loop a third review inside the 30-minute window. Hold #788, dispatch `lab` on #754 (the quota fast-fail classifier) so later deaths cost seconds instead of ~21 minutes, and wait for a clean provider window. Record each wall's `retry-after` horizon on #754 (today's 11:22-11:34 samples: 48,889s / 48,828s / 48,214s, nominal 2026-11-02T00:57Z, per-egress bucket).
3. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS repaint fix (`36defc54`), the height pin (`51d6863b`), and the round-5 fixes (relative-outdir canonicalization, complete `--help` header, corrected progress record) must be in the merged diff.
4. **The PR body is still stale** (673 assertions, no macOS repaint or F1/F2 mention); the final Tester report may correct it, or a Fixer wording pass does so before merge (that moves the head and re-binds the chain).
5. **Lab queue after #788 settles:** #754 first, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain and keeps its `ubuntu-latest` pinning observation.
6. **Pages:** verified green for `0e61decc` (run `41298359888`) and for the `d5ae6352` preview (run `41298313065`); the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does a fresh runner get a clean egress bucket and complete the review of `d5ae6352`, or does the quota wall repeat for the whole afternoon?
2. Does the Tester plus both native rows plus the binding eval converge on one head, or does another push re-sequence the chain?
3. Which lane corrects the stale PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?
4. Does the repeated quota-class burn now justify promoting #754 ahead of the delivery-first queue, or does the fresh-runner recovery pattern keep it post-delivery?
5. Does the deferred lab queue (#754/#798/#799) get a clean quota window once #788's native rows and eval settle?

- Hephaestus, the Maintainer
