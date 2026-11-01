# STATE

Last updated: 2026-11-01T10:27Z by run 41297008788 (intake: the #788 Tester returned fix on `a9130b0d` with two failing regressions, and the Fixer `41297010587` is live on that head).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T10:20-10:27Z)

- **`main` = `0e61decc`** (the #801 rebase merge), unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages for `0e61decc` is green (run `41292449406`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches; trigger allowlist exact 19/19 against the 19 lab-authored workflow names (`maintainer` self-excluded; the three remaining live names are GitHub dynamic workflows). The only failure in the newest 200 runs is the superseded Tester `41290509212` (provider stall, replaced by the successful `41294133237`).
- **#788 is the only delivery lane; head `a9130b0d`** (MERGEABLE/UNSTABLE, 16 files, all `maze-chase/` harness/tests/docs plus `progress/786-harness-determinism.md`; PR uses `Refs #786`). The fresh Tester `41294133237` completed success at 10:19:55Z with verdict `fix` and pushed the two failing regressions: F1 a relative `--outdir` into `run-linux.sh` makes `drive.sh` resolve the relative `--transcript` twice (doubled empty path, false `unverified` row after a 30s stall; regression `TestRunLinuxTranscriptPaths`); F2 `run-browser-e2e.sh --help` truncates because the slice is `sed -n '2,24p'` and `8fbfea38` added two header lines (node regression added); F3 the progress file records 680 vs 678 assertions and still claims the 320x568 assertion is unchanged. Positive evidence: the macOS high-contrast repaint fix passed 7/7 Linux `browser-e2e` runs (2 under CPU load), the full five-suite runner and deployed-preview crawl are green at 680 site assertions, and the real xterm row passed (readiness 347ms, 11 checkpoints). The **Fixer `41297010587` is live** on `a9130b0d` (started 10:19:55Z); no duplicate fix was dispatched.
- Review round 5 approved `8fbfea38` at 09:50:05Z; the head has since moved by a test-only Tester commit, so that approval is stale. The post-fix review round re-binds to whatever head the Fixer settles.
- **Held runs: 2** on `a9130b0d` (`Deploy static site to GitHub Pages` `41296788878`, `opencode-pr-trigger` `41296788877`), both from the bot-authored test push; this run's hardcoded approve sweep clears them.
- **The only eval verdict on #788 is the stale `34571cce` rejection** (09:30:22Z, fix 9.5/10), superseded and never to be used for a merge. No owner-authored `eval-verdict: approve-eval` marker exists on any PR.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged. Lab queue: #754 first (FreeUsageLimitError classification), #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #773/#774/#775 parked (the false-General class); #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Nothing else needs me.** No untriaged issue, no new human question after the 10:19:50Z fix forward, no stray branch, no merge-ready PR.

## Decisions this run

`.maintainer/decision.json` = `[]` (intake only). `.maintainer/comment.md` = a short #788 intake note. No `emergency.json`.

- No `fix` #788: the Fixer lane `41297010587` is already live on the Tester's two failing regressions; a duplicate would double-push and burn quota.
- No `test`/`test-linux`/`test-macos`/`eval` #788: the head is unsettled while the Fixer works; the Tester, the native rows, and the binding eval all re-bind to the settled head. The macOS row remains the delegated acceptance for the canvas-race fix.
- No merge: no fresh owner-authored `eval-verdict: approve-eval` marker; the stale `34571cce` rejection must never be used.
- No `lab`: delivery-first. #754 stays the first post-delivery infra item (#798 second, #799 third); the Fixer is the heavy lane this window.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`: schedules own the recurring passes (today's arms are green), no request, nothing stranded.
- No `emergency.json`: the lab is healthy; no production-stopping defect.

## Next run

1. **#788 first.** Read the Fixer's result on `a9130b0d`. The fix workflow forwards review; on review approval the Tester re-runs; on Tester approval dispatch `test-linux` + `test-macos` together on the settled head, then the binding eval on the native-settled head, then merge with the branch kept and close #786 on the native evidence. If the Fixer or Tester pushes, every later lane re-binds to the moved head.
2. **If the Tester stalls again:** do NOT loop a second fresh Tester inside the 30-minute window. Hold #788, dispatch `lab` on #754 (the burn/classification fix) and wait for a clean provider window; a repeat stall on the same head is a provider-class issue, not a code finding.
3. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS fix (`36defc54`) and the height pin (`51d6863b`) must be in the merged diff.
4. **The PR body is stale** (673 assertions, no macOS repaint or F1/F2 mention); a Builder/Fixer wording pass or the final Tester report must correct it before merge.
5. **Lab queue after #788 settles:** #754 first, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain and keeps its `ubuntu-latest` pinning observation.
6. **Pages:** verified green for `0e61decc`; the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does the Fixer clear F1/F2/F3 cleanly and does review round 6 approve the settled head?
2. Does the Tester plus both native rows plus the binding eval converge on one head, or does another push re-sequence the chain?
3. Which lane corrects the stale PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?
4. Is the persistent provider-stall class (two stalls in the earlier Tester run, no quota line) worth folding into #754 as a separate classification, or is the #653 watchdog already the right ceiling?
5. Does the deferred lab queue (#754/#798/#799) get a clean quota window once #788's native rows and eval settle?

- Hephaestus, the Maintainer
