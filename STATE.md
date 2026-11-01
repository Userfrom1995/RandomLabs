# STATE

Last updated: 2026-11-01T10:31Z by run 41297231445 (duplicate `/oc maintainer` wake: the Tester returned `fix` on `a9130b0d`, and the Fixer `41297010587` is live on that head).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T10:23-10:31Z)

- **`main` = `0e61decc`** (the #801 rebase merge), unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages for `0e61decc` is green: the hardcoded dispatch run `41297230294` completed success at 10:22:46Z. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the lab-authored workflow names (`maintainer` self-excluded; the three remaining live names are GitHub dynamic workflows). Zero held `action_required` runs, and zero failure/timed_out/startup_failure in the newest 120 runs.
- **#788 is the only delivery lane; head `a9130b0d`** (MERGEABLE/CLEAN, 16 files, all `maze-chase/` harness/tests/docs plus `progress/786-harness-determinism.md`; PR uses `Refs #786`). The fresh Tester `41294133237` completed success at 10:19:55Z with verdict `fix` and pushed `a9130b0d`: F1 a relative `--outdir` into `run-linux.sh` makes `drive.sh` resolve the relative `--transcript` twice (false `unverified` after a 30s stall), F2 `run-browser-e2e.sh --help` truncates after `8fbfea38` added two header lines, F3 the progress file records 680 vs 678 assertions and still claims the 320x568 assertion is unchanged. Positive evidence: the macOS high-contrast repaint fix passed 7/7 Linux `browser-e2e` runs (2 under CPU load), the five-suite runner and deployed-preview crawl are green at 680 site assertions, and the real xterm row passed (readiness 347ms, 11 checkpoints).
- **The Fixer `41297010587` is in its agent step on `a9130b0d`** (started 10:20:06Z), so the workflow's forward from the Tester is already carrying the findings. No duplicate fix was dispatched.
- This run was woken by the owner `/oc maintainer` at 10:22:44Z, 14 seconds after the previous intake run `41297008788` posted its two notes (10:22:17Z decisions summary and 10:22:30Z intake). It is a duplicate wake with no new information, so this run is intake only.
- Review round 5 approved `8fbfea38` at 09:50:05Z; the head has since moved by a test-only Tester commit, so that approval is stale. The post-fix review round re-binds to whatever head the Fixer settles.
- **The only eval verdict on #788 is the stale `34571cce` rejection** (09:30:22Z, fix 9.5/10), superseded and never usable for a merge. No owner-authored `eval-verdict: approve-eval` marker exists on any PR.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged. Lab queue: #754 first (FreeUsageLimitError classification), #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Nothing else needs me.** No untriaged issue (the newest are #799 and #798, both triaged and queued), no new human question after the 10:19:50Z fix forward, no stray branch, no merge-ready PR.

## Decisions this run

`.maintainer/decision.json` = `[]` (intake only). `.maintainer/comment.md` empty: the previous run's intake note is 14 seconds old, so a second note on the same thread would be pure noise. No `emergency.json`.

- No `fix` #788: the Fixer lane `41297010587` is already live on the Tester's findings; a duplicate would double-push and burn quota.
- No `test`/`test-linux`/`test-macos`/`eval` #788: the head is unsettled while the Fixer works; the Tester, the native rows, and the binding eval all re-bind to the settled head. The macOS row remains the delegated acceptance for the harness fixes.
- No merge: no fresh owner-authored `eval-verdict: approve-eval` marker; the stale `34571cce` rejection must never be used.
- No `lab`: delivery-first. The Fixer is the heavy lane this window and #754 stays the first post-delivery infra item (#798 second, #799 third). Free-tier quota is shared per egress IP.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`/`ping`: schedules own the recurring passes (today's arms are green), no request, nothing stranded.
- No `emergency.json`: the lab is healthy; no production-stopping defect.

## Next run

1. **#788 first.** Read the Fixer's result on `a9130b0d`. The fix workflow forwards review; on review approval the Tester re-runs; on Tester approval dispatch `test-linux` + `test-macos` together on the settled head, then the binding eval on the native-settled head, then merge with the branch kept and close #786 on the native evidence. If the Fixer or Tester pushes, every later lane re-binds to the moved head.
2. **If the Fixer or Tester stalls again:** do NOT loop a second fresh lane inside the 30-minute window. Hold #788, dispatch `lab` on #754 (the burn/classification fix) and wait for a clean provider window; a repeat stall on the same head is a provider-class issue, not a code finding.
3. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS fix (`36defc54`) and the height pin (`51d6863b`) must be in the merged diff.
4. **The PR body is stale** (673 assertions, no macOS repaint or F1/F2 mention); a Builder/Fixer wording pass or the final Tester report must correct it before merge.
5. **Lab queue after #788 settles:** #754 first, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain and keeps its `ubuntu-latest` pinning observation.
6. **Pages:** verified green for `0e61decc` (run `41297230294`); the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does the Fixer clear F1/F2/F3 cleanly and does review round 6 approve the settled head?
2. Does the Tester plus both native rows plus the binding eval converge on one head, or does another push re-sequence the chain?
3. Which lane corrects the stale PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?
4. Is the persistent provider-stall class (two stalls in the earlier Tester run, no quota line) worth folding into #754 as a separate classification, or is the #653 watchdog already the right ceiling?
5. Does the deferred lab queue (#754/#798/#799) get a clean quota window once #788's native rows and eval settle?

- Hephaestus, the Maintainer
