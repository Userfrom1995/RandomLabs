# STATE

Last updated: 2026-10-31T07:35Z by run 41180817715 (maintainer wake on the #788 `/oc maintainer` seconds after the Fixer's macOS push).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T07:29-07:35Z)

- **main** = `ffe54275ca6aa7e4489b4e137221bb3c86fcfd1d`. Pages green (`41180819253`). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. 0 held runs, no stray `opencode/schedule-*`/`opencode/dispatch-*` branches, trigger allowlist exact 19/19, 0 failed or timed_out run in the newest 200 (the quota wall's last victim was the #795 review at 06:49Z).
- **#788** (`Refs #786`, harness determinism): head **`cb0e3a32`**, MERGEABLE/CLEAN, base `ffe54275`, 15 changed files (all `maze-chase/` harness/docs plus `progress/786-harness-determinism.md`). The macOS-triggered Fixer `41180164051` completed at 07:29:32Z and pushed the rebased head: `site-e2e.js` consumes every HTTP response body (closing the Node 24 undici `Parser.finish` crash), the stray `.github/scripts/post-peros-findings.sh` commit is gone, the compat README window wait is scoped to X11, and the manual web E2E setup launches a fresh Chrome/profile per suite. The owner's `/oc review` spawned the fresh head-bound review `41180809934` (pending since 07:29:42Z), queued behind round-4 review `41178507132` (in its agent pass since 06:55:07Z on the stale head `9f1f1ed0`). Any verdict from `41178507132` is stale; the queued review is authoritative. Prior approvals (`c1c3a2f8` review, `30b0dadb` test) and both native rows (`30b0dadb` Linux pass, `9f1f1ed0` macOS fix) are stale.
- **#797** (`Fixes #796`, curator): head **`f52f9e64`** (rebased onto `ffe54275`), CLEAN/MERGEABLE, 3 files. Review approved at 07:30:11Z; `/oc test` at 07:30:20Z; Tester `41180859927` live since 07:30:23Z. Next: tester verdict, then eval, then merge and close #796.
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`34fe5afc`**, CLEAN/MERGEABLE, 19 files. Review approved at 07:27:10Z; `/oc test` at 07:27:17Z; Tester `41180664212` live since 07:27:20Z. Next: tester verdict, then `test-linux` on the final head, then eval, then merge; keep #657/#582/#683 open and the rc tags unmoved.
- **#798** new infra issue (per-OS tester auto-commits), triaged 06:58:17Z, queued after #754.
- **#745** parked DIRTY/CONFLICTING (17 infra files, stale since 2026-10-23; the earlier "superseded by #789" note was a mislabel, since #789 is the rc.2 release-copy PR). **#792** waits behind #788. **#786** stays open until the final-head native rows pass and #788 merges.
- **Issues**: **20 open**. #796 -> #797; #793 -> #795; #786 -> #788; #798 queued; #792 held behind #788; #678/#677/#659/#661/#655 the queued Phase 6 / #657 workstream; #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582 parents; #70/#42 boards. No untriaged issue, no new human question.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` empty. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No `review`/`fix` on #788: the fresh review `41180809934` is queued on `cb0e3a32`; the Fixer already completed its macOS round.
- No `test`/`test-linux`/`test-macos` on #788: no fresh review approval on the current head; all three must bind the head after the review approves (and after any Tester commit).
- No `eval` on #788: no current Tester approval.
- No `test`/`test-linux` on #797 or #795: their Testers are live.
- No `lab`: #754 is first in the post-delivery queue, #798 second, and no infra lane is blocking delivery.
- No merge: no PR has both a fresh Tester approval and an `approve-eval` on its current head.
- No `build`/`continue`/`curate`/`auditor`/`ideate`/`recover`/`create_issue`/`create_pr`: #792 waits by sequencing; no build in progress; schedules own the recurring passes; no ideation request; nothing stranded; #798 already captures the per-OS leak.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts nothing (empty comment.md and decision list). The approve-held sweep finds 0 held runs. The PAT merge sweep sees no approved workflow-touching PR. The memory publish appends this entry keep-both per #647.

## Next run

1. **#788**: read the fresh review on `cb0e3a32` (`41180809934`); ignore any verdict from the stale `41178507132`. On approval: `test`, then `test-linux` + `test-macos` on the final head, then `eval`, then merge (rebase, no branch delete) and close #786 with the native evidence. On `fix`, let its `/oc fix` forward carry the next round.
2. **#797**: tester verdict -> `eval` -> merge (rebase, no branch delete) -> close #796.
3. **#795**: tester verdict -> `test-linux` on the final head -> `eval` -> merge (`Closes #793`) with #657/#582/#683 open and the rc tags unmoved.
4. **#798**: lab after #754: a trusted staged strip step in `opencode-peros-test.yml` plus a per-OS scope guard; fold in the branch's CRLF hardening if the fix round reverts it.
5. Watch the #754 quota wall (no new deaths since 06:49Z) and the #788 stale-review race.

## Open questions

1. Does the stale round-4 review post a verdict on `9f1f1ed0` that forwards a redundant `/oc fix` or `/oc test`, and does the queued fresh review then bind `cb0e3a32` cleanly?
2. Do the #797 and #795 Testers approve without a head move that re-stales their review approvals?
3. Does the macOS undici fix hold on the final #788 head (the temp copy was 5/5 green)?
4. Who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags), and is rc.2 frozen or `e6be3beb` the copy to ship? (#657)
5. Should the stale #745 infra branch be re-scoped or closed once the post-delivery lab queue clears?

- Hephaestus, the Maintainer
