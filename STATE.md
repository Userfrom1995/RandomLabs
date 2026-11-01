# STATE

Last updated: 2026-11-01T14:20Z by run 41315155460 (failure triage: the third #788 review died on the free-usage wall, blocked on its very first provider call with `retry-after` ~37100s / horizon ~2026-11-02T00:11Z; #788 held, no probe inside the cooldown or the wall; the #802 lab fix run 41313347183 is live, and the stale-head #802 review is still in progress).

## Who I am

I am Hephaestus, the Maintainer of this lab. Direct, decisive, documented. The lab is the point: every agent is a specialist I deploy, and the quality of what leaves this repo is the only verdict that matters. I own the pipeline, not the work: I survey, route, unblock, and merge. I do not post triggers in my own hand; the workflow's PAT step does. My memory is this branch.

## Right now (post-survey, 2026-11-01T14:14-14:20Z)

- **`main` = `0e61decc`** (the #801 rebase merge plus the #800 pin-refresh commits), unchanged. Tags unmoved (`maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb`). Pages green: the `0e61decc` dispatch `41298359888`, the #802 preview `41312817853` (13:46:18Z), the `3e114fbe` head deploy `41311846996`, the `d5ae6352` #788 preview `41298313065`. No stray `opencode/schedule-*` / `opencode/dispatch-*` branches. Trigger allowlist exact 19/19 against the live lab-authored workflow names (`maintainer` self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub dynamic names). Zero held `action_required` runs.
- **The only failures in the newest 100 runs are the two known ones:** the #788 review quota death `41313346410` and the invalid-workflow validation `41311839234` for #802's `3e114fbe`. No other untriaged failure.
- **QUOTA WALL IS NOW THE DOMINANT BLOCKER.** The fresh #788 review `41313346410` (the head-bound probe dispatched at 13:52:17Z) was created 13:52:32Z and got `AI_APICallError: Free usage limit reached. Free models work in OpenCode` (`FreeUsageLimitError`, HTTP 429) at **13:52:38Z on its first call**, `retry-after: 37100` (~2026-11-02T00:11Z). The #653 watchdog killed attempt 1 at 14:03:04Z; the same-model retry hit the wall again at 14:03:18Z (`retry-after: 36460`, same horizon); the second 600s window ended 14:13:44Z. The agent step ended 14:13:49Z, the verify found no published verdict, counted 3/3 auto-retries (2026-10-30T18:54:33Z / 20:22:20Z / 20:43:54Z), refused a fourth, and exited 1. Three consecutive quota deaths on `d5ae6352`: round 6 `41298346346` (served ~44 min, 11:22-11:44Z), fresh `41303537936` (served ~19 min, 12:11-12:32Z), fresh `41313346410` (blocked at the first call). The 13:52-14:03 samples give a common reset horizon of ~2026-11-02T00:11Z. This is the issue #754 class; its fix is #802.
- **PR #788 is the delivery lane; head `d5ae6352`** (MERGEABLE/CLEAN, remote tip identical, unchanged since the Fixer's 10:37:51Z push; 17 files, all `maze-chase/` harness/tests/docs plus `progress/786-harness-determinism.md`; `Refs #786`). Checks: `trigger` success, Pages `comment` success, GitGuardian success, `deploy` skipped. The dead review published nothing, so the thread's last event is the owner's 13:52:17Z `/oc review` trigger.
- **No eval verdict binds anything.** The only eval verdict on #788 is the stale `34571cce` rejection (09:30:22Z), superseded and unusable. No owner-authored `eval-verdict: approve-eval` marker exists. The Tester `06:17:38Z` approve marker and the round-5 review approval of `8fbfea38` (09:50:05Z) predate the later head moves and are stale.
- **PR #802 is the #754 lab PR; head `3e114fbe`, MERGEABLE/CLEAN, 11 files, `Closes #754`.** Its head's `.github/workflows/maintainer.yml` is **invalid to GitHub**: validation run `41311839234` failed with `Exceeded max expression length 21000` (the `Run Maintainer agent` run scalar is 22,200 bytes; the composite `Run opencode` scalar is 20,277 bytes, only 723 bytes of headroom). Merging this head would disable the whole Maintainer workflow. **The Lab Engineer fix run `41313347183` is live** (started 13:52:23Z, agent step 13:52:33Z, in progress at survey end) with the fix direction: move prose out of the run scalars into YAML comments, keep every detector/budget/anchoring intact, regenerate the R15/R30 pins, add an audit length guard, and verify the next push validation run is green.
- **The stale-head #802 review `41311846728` is still in progress** (agent step started 13:33:49Z, ~43+ min at survey end) on the invalid head `3e114fbe`; the two review runs queued behind it (`41312817419` from the 13:45:44Z `/oc maintainer`, `41313347184` from the 13:52:18Z `/oc lab`) do not start with `/oc review` and will skip at the job gate. Any verdict from the stale-head review binds a head that must move; do not route test/eval/merge on `3e114fbe`.
- **#745** stays CONFLICTING/DIRTY at `7a04fa4a`, parked (unchanged since 2026-10-23T15:31Z).
- **Open issues: 19**, all deliberately parked/triaged; no human activity beyond owner-PAT machine triggers since 13:52Z, no new issue. Lab queue: **#802 fix first**, #798 second (per-OS trailer strip), #799 third (setup.sh first-run path). #792 waits behind #788; #786 closes on #788's native evidence; trackers #657/#655/#661/#659/#678/#677/#683/#582 and boards #70/#42 stay open.

## Decisions this run

`.maintainer/decision.json` = `[ping #788, ping #754]`. `.maintainer/comment.md` empty (a `workflow_run` failure has no comment target; the pings carry the notes). No `emergency.json`.

- No `review` #788: the quota wall is certain, the auto-retry cap is exhausted, three consecutive probes have died on this head, and the death landed at 14:13:53Z, inside the 30-minute cooldown (till 14:43:53Z). A probe now can only fail and self-summon another Maintainer run on the same wall.
- No `test` / `test-linux` / `test-macos` / `eval` #788: the review must settle the head first; the wall would kill them too.
- No `lab` / `fix` #802: the lab fix run is already live (a duplicate would be spam), and `fix`/`continue` are hard-blocked on infra PRs.
- No merge on either PR: #788 has no fresh owner-authored `approve-eval` marker; #802's head is invalid and must move.
- No `build` / `research` / `architect`: #792 waits behind #788; every lane is quota-blocked.
- No `curate` / `auditor` / `ideate` / `recover` / `create_*`: schedules own the recurring passes, no request, nothing stranded.
- Pings: #788 documents the third quota death and the gating of the next probe; #754 records the new first-call wall shape (with the `retry-after` horizon) and confirms the 13:33:23Z wrapper push rejection was the expected App-token noise while the PAT push landed `3e114fbe`.

## Next run

1. **Do not probe the #788 review before 2026-11-02T00:11Z** unless the wall has demonstrably cleared (e.g. a review/test session served 20+ minutes). Check the newest failed run's log for `retry-after`. Never probe inside 30 minutes of a quota death.
2. **Read the #802 lab fix on the pushed head:** measure both run scalars from the pushed head (`maintainer.yml` `Run Maintainer agent`, the composite `Run opencode`), confirm real headroom under 21,000 bytes, the full audit green, and that the push validation run for the new head is not a failure. Only then dispatch `review` on the new head (head pushes do not auto-trigger review; the workflow is issue_comment-only).
3. **Do not route `test` / `eval` / merge on `3e114fbe`.** If the stale-head review approves it, treat the verdict as non-binding; the head must move. Never merge #802 on a head whose `maintainer.yml` validation run is a failure.
4. **#788 delivery chain** once a review settles a head: the workflow posts `/oc test`; on Tester approval dispatch `test-linux` + `test-macos` on the settled head, then the binding eval, then merge with the branch kept and close #786 on the native evidence.
5. **Never merge #788 on a `34571cce`-bound marker.** Verify the `approve-eval` marker is owner-authored, bound to the current head, newer than the Tester marker and the latest eval trigger, with no newer fix or rejection. The macOS repaint fix (`36defc54`), the height pin (`51d6863b`), and the round-5 fixes (relative-outdir canonicalization, complete `--help` header, corrected progress record) must be in the merged diff.
6. **The #788 PR body is still stale** (673 assertions, no macOS repaint or F1/F2 mention); the final Tester report may correct it, or a Fixer wording pass before merge (moves the head, re-binds the chain).
7. **Lab queue:** #802 fix first, then #798, then #799. #792 after #788; #745 parked; #773/#774/#775 parked. #657's next increment waits for the delivery chain.
8. **Pages:** verified green for `0e61decc`, the `3e114fbe` head, and both previews; the next main advance re-runs the hardcoded dispatch, and the next run confirms it.

## Open questions

1. Does the Lab Engineer land a valid #802 head (both run scalars under the cap, audit green) before the quota window closes, and does the push validation run go green?
2. Is the wall per-egress (my own Maintainer session is served while the 13:52 review was blocked at its first call), so a later probe can succeed before the ~00:11Z horizon?
3. Does the stale-head #802 review produce a verdict on the invalid `3e114fbe`, and does that spawn a test dispatch we must ignore once the head moves?
4. Does the Tester plus both native rows plus the binding eval converge on one #788 head once the wall clears?
5. Which lane corrects the stale #788 PR body (673 assertions, missing the macOS repaint and F1/F2 fixes)?

- Hephaestus, the Maintainer
