# STATE

Last updated: 2026-11-01T10:42Z by run 41298358444 (intake right after the Fixer's round-5 push; review round 6 is live on the new head).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T10:38-10:42Z)

- **`main` = `0e61decc`** (the #801 rebase merge), unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages is green: the hardcoded dispatch run `41298359888` completed success at 10:38:11Z, and the PR preview deploy `41298313065` for `d5ae6352` completed success at 10:37:32Z. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the lab-authored workflow names (`maintainer` self-excluded; the three remaining live names are GitHub dynamic workflows). Zero held `action_required` runs, and zero failure/timed_out/startup_failure in the newest 200 runs.
- **#788 is the only delivery lane; head `d5ae6352`** (MERGEABLE/CLEAN, 17 files, all `maze-chase/` harness/tests/docs plus `progress/786-harness-determinism.md`; PR uses `Refs #786`; base moved to `0e61decc` by the Fixer's rebase). The Tester `41294133237` returned `fix` on `a9130b0d` at 10:19:55Z (F1 relative-`--outdir` transcript doubling, F2 `--help` truncated header, F3 stale progress record). The **Fixer `41297010587` completed at 10:37:51Z and pushed `d5ae6352`** (three fixer commits plus the Tester commit, rebased on main): `run-linux.sh` canonicalizes a relative `--outdir` before any path is built, `run-browser-e2e.sh --help` prints the complete leading comment header, and the progress record is corrected (680 assertions, the 320x568 re-reveal pins the full viewport, the round labels are honest). Its Linux verification: 72 compat tests OK, 26 node tests pass, `SITE-E2E ALL GREEN: 680 assertions`, `bash -n` clean on the three shells, `shellcheck -x` clean on `run-browser-e2e.sh` (`run-linux.sh` keeps its pre-existing SC2015 info).
- **Review round 6 `41298346346` is in its agent pass on `d5ae6352`** (job `review` in_progress since 10:38:01Z). The fix workflow's forward posted `/oc review` at 10:37:58Z, so no duplicate review was dispatched.
- This run was woken by the owner `/oc maintainer` at 10:38:07Z, nine seconds after the fix push and the review trigger. It is a duplicate wake with no new information, so this run is intake only.
- **No eval verdict binds anything.** The only eval verdict on #788 is the stale `34571cce` rejection (09:30:22Z, fix 9.5/10), superseded and never usable for a merge. No owner-authored `eval-verdict: approve-eval` marker exists on any PR.
- Review round 5 approved `8fbfea38` at 09:50:05Z; the head has moved twice since (test-only Tester commit, then the Fixer rebase), so that approval is stale. The Tester's `06:17:38Z` approve marker is likewise stale.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged (no non-bot comment on any watched issue since 07:00Z). Lab queue: #754 first (FreeUsageLimitError classification), #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.
- **Nothing else needs me.** No untriaged issue, no new human question, no stray branch, no merge-ready PR, no failed workflow run.

## Decisions this run

`.maintainer/decision.json` = `[]` (intake only). `.maintainer/comment.md` empty: the Fixer's own landing report is on the thread at 10:37:51Z and the previous intake note is 10 minutes old, so another note would be noise. No `emergency.json`.

- No `review` #788: round 6 `41298346346` is already in its agent pass on the exact head.
- No `fix` #788: the Fixer cleared F1/F2/F3; nothing is outstanding until round 6 reports.
- No `test`/`test-linux`/`test-macos`/`eval` #788: the head is unsettled until review approves, and every downstream lane re-binds to the settled head. The macOS row remains the delegated acceptance.
- No merge: no fresh owner-authored `eval-verdict: approve-eval` marker; the stale `34571cce` rejection must never be used.
- No `lab`: delivery-first. #754 stays the first post-delivery infra item (#798 second, #799 third). Free-tier quota is shared per egress IP.
- No `build`/`research`/`architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate`/`auditor`/`ideate`/`recover`/`create_*`/`ping`: schedules own the recurring passes (today's arms are green), no request, nothing stranded.

## Next run

1. **#788 first.** Read review round 6 on `d5ae6352`. If it approves, the workflow posts `/oc test` and the Tester re-runs on the settled head; on Tester approval dispatch `test-linux` + `test-macos` together on the settled head, then the binding eval on the native-settled head, then merge with the branch kept and close #786 on the native evidence. If the review returns `fix`, the workflow's `/oc fix` carries it; if the Fixer or Tester pushes, every later lane re-binds to the moved head.
2. **If a lane stalls again:** do NOT loop a second fresh lane inside the 30-minute window. Hold #788, dispatch `lab` on #754 (the burn/classification fix) and wait for a clean provider window; a repeat stall on the same head is a provider-class issue, not a code finding.
3. **Never merge #788 on a `34571cce`-bound eval marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS repaint fix (`36defc54`), the height pin (`51d6863b`), and the round-5 fixes (relative-outdir canonicalization, complete `--help` header, corrected progress record) must be in the merged diff.
4. **The PR body is still stale** (673 assertions, no macOS repaint or F1/F2 mention); the final Tester report may correct it, or a Fixer wording pass does so before merge (that moves the head and re-binds the chain).
5. **Lab queue after #788 settles:** #754 first, #798 second, #799 third. #792 starts after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain and keeps its `ubuntu-latest` pinning observation.
6. **Pages:** verified green for `0e61decc` (run `41298359888`) and for the `d5ae6352` preview (run `41298313065`); the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does review round 6 approve `d5ae6352`, or does it find anything in the round-5 fixes?
2. Does the Tester plus both native rows plus the binding eval converge on one head, or does another push re-sequence the chain?
3. Which lane corrects the stale PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?
4. Is the persistent provider-stall class (two stalls in the earlier Tester run, no quota line) worth folding into #754 as a separate classification, or is the #653 watchdog already the right ceiling?
5. Does the deferred lab queue (#754/#798/#799) get a clean quota window once #788's native rows and eval settle?

- Hephaestus, the Maintainer
