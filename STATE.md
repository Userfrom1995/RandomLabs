# STATE

Last updated: 2026-11-02T06:36Z by run 41400191276 (failure triage: the round-8 #788 review died on the daily free-usage wall; the review is redrawn head-bound on `9a22e75c`; #806 is in review; #804's lab lane still live).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (surveyed 2026-11-02T06:29-06:35Z)

- **`main` = `eab27e422a880db5300c97e00b39119af53d6550`**, unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names).
- **#788 head `9a22e75c`**, MERGEABLE/CLEAN, 17 files, `Refs #786`. **The round-8 review `41398178861` FAILED at 06:29:08Z on the provider's daily free-usage wall**: the reviewer agent ran from 06:09:42Z and was cut at 06:28:55Z by `AI_APICallError: Free usage limit reached` (`FreeUsageLimitError`, issue #754 / #754 daily-wall fast-fail), before writing a decision file or publishing a report. The verify step found no published verdict and reported `Review gate still dead after 4 attempts (1 initial + 3 auto-retries)` because the lifetime review retry budget was already spent (#803). This is a provider-class fast-fail, not a code finding; fresh-run recovery is the designed lane, so this run dispatches `review` head-bound on `9a22e75c`. The Tester marker `6569023690` (04:24:56Z on `8723172c`) and the round-7 review approval are stale after the fix push; the chain restarts at review.
- **#806 (the #805 lab PR)** head `fb8a36e8`, created 06:21:23Z, 11 files, workflow-touching, MERGEABLE; `mergeStateStatus` is `UNSTABLE` only because its three branch runs are held (`41399394785` Pages preview, `41399394929` pr-trigger, `41399394946` maintainer) at 06:21:27Z, and this run's hardcoded approve sweep clears them. Body: child-aware #653 watchdog (a live descendant resets idle accounting, one poll-window grace after the child exits, portable `ps` fallbacks, 64-hop bound, `ps` failure treated as no descendant, unchanged 600s/30s threshold), R15 gains exact-form tripwires plus `hang-live-child` / `hang-child-exits` fixtures, audit 33/33, docs synced. The App-token push rejection comment `6570562024` is the expected wrapper noise; the PAT-backed push landed `fb8a36e8`. **Review `41399396712` is live** since 06:21:31Z.
- **#804 (the #798 lab PR)** head `b794217d`, 2 commits, MERGEABLE/CLEAN, 9 files, workflow-touching. Review `41389927049` returned **`lab`**: blocking F1 (the restore step's dirty delta is auto-committed and the guard drops the tester range) and F2 (strip rewrites the captured baseline, so the guard refuses in the incident state), plus F3-F9. **Lab run `41393863548` is LIVE** since 05:24:40Z (150-minute cap, so it can run until about 07:54Z).
- **#805 lab run `41395241489` completed SUCCESS at 06:21:29Z**, opening #806. The Owner's summon is satisfied; the remaining work is the #806 review lane.
- **Interlock:** #806 is based on `eab27e42` and was not rebased over #804; both edit `.github/scripts/silent-stall-audit.sh`, so whichever merges second must rebase. Note this when routing the next review/lab round.
- **Lab queue:** #804 live, #806 in review, then #799, then #803. #745 stays CONFLICTING/DIRTY at `7a04fa4a`, parked after the queue. #792 waits behind #788. #773/#774/#775 parked.
- **Open issues: 20**, all triaged: #805, #803, #799, #798, #792, #786, #775, #774, #773, #742, trackers #683/#678/#677/#661/#659/#657/#655/#582, boards #70/#42. **Open PRs: 4** (#806, #804, #788, #745).
- **Schedules:** curator, auditor, and recover last surveyed green (curator `41391253241` 04:57Z, auditor `41390987022` 04:54Z plus the 05:30Z daily report, recover `41374312993` 01:47Z). Only failure in the newest window is the review above; no timed-out or startup-failure run.
- **No new owner request** since 06:19Z. The only new owner comments are the #806 `/oc review` at 06:21:25Z (already consumed by the live review) and the earlier #788 chain.
- **Concurrency note:** the 06:21 comment batch spawned the designed skip fan-out and one cancelled maintainer run (`41399403475`, single-slot superseding by design). This run is the `workflow_run` failure triage for `41398178861` (no PR target, so `comment.md` is empty and the two pings carry the record).
- **Workspace provenance observation (unchanged):** the CLI PR-session bootstrap can move the checkout to a PR head while the staged prompt stays trusted; #745 carries the `OPENCODE_DISABLE_PROJECT_CONFIG` fix for the maintainer arm. Recorded for a lab pass after the queue.

## Decisions this run

`.maintainer/decision.json` = `[{"action":"review","pr":788,"head":"9a22e75cc5d1787254531ce78f2c3def7a816e19"},{"action":"ping","target":788,...},{"action":"ping","target":803,...}]`. `.maintainer/comment.md` empty (the workflow_run event has no target). No `emergency.json`.

- `review` #788 head-bound: the round-8 review never produced a verdict (the provider wall killed it) and the automatic retry budget is spent, so this is the only path back into the gate. Fresh-run recovery is the documented recovery for the #754 wall.
- No `test` / `test-linux` / `test-macos` #788: the review is the next gate; the review workflow forwards `/oc test` on approval, and the macOS row stays blocked behind #805/#806 (no third row on a watchdog-class death).
- No `fix` #788: the macOS portability fix is in; the review is the next gate.
- No `eval` #788: the binding eval must bind the Tester-settled head after the native rows.
- No `review` #806: its review is live; a second trigger would queue a duplicate.
- No `lab` #804/#806: both lanes are live.
- No `lab` #799/#803/#745: serialized queue; #745 parked.
- No `build` / `research` / `architect`: #792 waits behind #788; #657's next increment waits for the delivery chain.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: the schedules are green, no request, nothing stranded.
- No merge: no owner-authored `eval-verdict: approve-eval` marker exists for #788, and #804/#806 have no approve-test or eval marker.

## Next run

1. **Read the re-dispatched #788 review on `9a22e75c`.** On approval the workflow posts `/oc test`; on `fix` it forwards the Fixer. If it dies again on the daily free-usage wall, re-dispatch on a fresh runner and record it; only a persistent multi-runner rejection escalates to the provider-plan/Owner lane (#754). Any other death class is the #803 lifetime-budget class: redraw head-bound and keep #803 queued.
2. **After the Tester approves the settled head and #805's fix (#806) lands**, dispatch `test-macos` (plus `test-linux` if the Tester's Linux evidence does not suffice), then the binding eval on the settled head; on `approve-eval` verify the owner-authored marker is head-bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix/rejection, then merge `--rebase` (fallback `--merge`, branch kept) and close #786 with the native evidence (the PR body uses `Refs #786`).
3. **Watch #806's review `41399396712`.** On `lab` the workflow forwards the Lab Engineer; on approval route `test` then the binding eval and the PAT sweep (fresh head-bound approve-test verdict plus a fresh head-bound eval marker). Rebase over #804 if #804 lands first (shared audit script).
4. **Watch #804's lab run `41393863548`:** on push the review re-binds; then the Tester, the binding eval, and the PAT sweep.
5. Then #799, then #803, serially; #792 after #788 merges; revive #745 only after the queue; #773/#774/#775 parked.
6. **Curator/auditor:** both schedules are green today; triage a fresh crash as the wall unless it names a new class.

## Open questions

1. Does the redrawn #788 review get a fresh egress bucket and approve `9a22e75c` in one round (the fix is test-only)?
2. Does #806's child-aware accounting pass review without weakening the #653/#754 retry and fast-fail semantics, and does it unblock the macOS row?
3. Does #804's lab clear F1/F2 and pass the re-review?
4. Does the daily free-usage wall spare the redrawn review, the Tester, and the eval lanes today?
5. Does #803 (lifetime retry budgets) get its lab lane after #799 without another gate dying first?

- Hephaestus, the Maintainer
