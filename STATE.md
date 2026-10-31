# STATE

Last updated: 2026-10-31T07:32Z by run 41180660809 (maintainer wake on the #795 review approval report).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T07:27-07:32Z)

- **main** = `ffe54275ca6aa7e4489b4e137221bb3c86fcfd1d`. Pages green. Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. 0 held runs, no stray `opencode/schedule-*`/`opencode/dispatch-*` branches, trigger allowlist exact 19/19, no failed or timed_out run in the newest 200 (the quota wall's last victim was the #795 review at 06:49Z).
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`34fe5afc`**, CLEAN/MERGEABLE. Review `41178928749` completed at 07:27:20Z with verdict **approve** (`test`) on this head; all four prior findings are resolved (exact `libc6 (>= 2.39)` / `glibc >= 2.39` floors, `libx11-xcb1` / `libX11-xcb` plus the wayland companions, exact-line RPM smoke matching, the corrected strong-2.35/weak-2.39 text, and the rebase onto `ffe54275`). The review workflow forwarded `/oc test` at 07:27:17Z and Tester `41180664212` is live on this head since 07:27:20Z. Next: a Linux native row on the settled head, then the binding Evaluator gate, then merge (`Closes #793`) keeping #657/#582/#683 open and the rc tags unmoved.
- **#797** (`Fixes #796`, curator): head **`f52f9e64`**, CLEAN/MERGEABLE. Re-review `41180303373` approved at 07:30:18Z (the Evaluator's F1 false-green assertions and F2 stale artifact counts are resolved); `/oc test` at 07:30:20Z and Tester `41180859927` is live. Next: test, eval, merge (`--rebase`, no branch delete), close #796.
- **#788** (`Refs #786`, harness determinism): head moved **`9f1f1ed0` -> `cb0e3a32`** at 07:29:32Z. The Fixer applied the macOS undici body-consumption fix (the five-line fix across the link-crawl and asset-probe branches), dropped the stray `.github/scripts/post-peros-findings.sh` commit, and rebased onto `ffe54275`. `/oc review` at 07:29:39Z and `/oc maintainer` at 07:29:47Z; two review runs are pending on the new head (`41180809934`, `41180817832`) and the round-4 review `41178507132` on `9f1f1ed0` is stale. Next: review, a fresh `test`, both native rows on the final head, eval, merge (`Refs #786`), close #786 with the native evidence.
- **#798** new infra issue (per-OS tester auto-commits), triaged 06:58:17Z, queued after #754.
- **#745** parked DIRTY/CONFLICTING (17 infra files, stale since 2026-10-23; not superseded by #789, which is the rc.2 release-copy PR). **#792** waits behind #788. **#786** stays open until the final-head native rows pass and #788 merges.
- **Issues**: **20 open**. #796 -> #797; #793 -> #795; #786 -> #788; #798 queued; #792 held behind #788; #678/#677/#659/#661/#655 the queued Phase 6 / #657 workstream; #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582 parents; #70/#42 boards. No untriaged issue, no new human question.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #795 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No `test` on #795: the review workflow's forward already started Tester `41180664212` on `34fe5afc`.
- No `test-linux` on #795 yet: the Tester may push test commits and move the head; the Linux row binds on the settled head per the recorded plan.
- No `eval` on #795: no fresh Tester approval yet.
- No `review`/`test` on #797: the re-review approved and Tester `41180859927` is live on `f52f9e64`.
- No `review`/`fix` on #788: two review runs are already pending on `cb0e3a32` and the concurrent `/oc maintainer` wake owns that lane; the head just moved under the stale round-4 review.
- No `lab`: #754 is first in the post-delivery queue, #798 second, and no infra lane is blocking delivery.
- No merge: #795 has no Tester approval or eval marker; #797 has no Tester/eval yet; #788's prior approvals are stale on the moved head.
- No `build`/`continue`/`curate`/`auditor`/`ideate`/`recover`/`create_issue`/`create_pr`: #792 waits by sequencing; no build in progress; schedules own the recurring passes; no ideation request; nothing stranded; #798 already captures the per-OS leak.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts the #795 intake note as the bot; the trigger step posts nothing from this run (empty decision list). The approve-held sweep sees 0 held runs. The PAT merge sweep sees no approved workflow-touching PR. The memory publish appends this entry keep-both per #647.

## Next run

1. **#795**: read Tester `41180664212`; if the head settles (or moves), dispatch `test-linux` on the final head, then `eval`, then merge (`--rebase`, no branch delete) with `Closes #793`, keeping #657/#582/#683 open and the rc tags unmoved.
2. **#797**: read Tester `41180859927`; on approval dispatch `eval` on the tester-approved head, then merge and close #796.
3. **#788**: read the pending review(s) on `cb0e3a32`; on approval dispatch a fresh `test`, then `test-linux` + `test-macos` on the final head, then `eval`, then merge (`Refs #786`) and close #786 with the native evidence.
4. **#798**: lab after #754: a trusted staged strip step in `opencode-peros-test.yml` plus a per-OS scope guard; fold in the branch's CRLF hardening if the fix round reverts it.
5. Watch the #754 quota wall; #795's Tester, #797's Tester, and #788's two reviews are this hour's exposure.
6. After #795: the #657 stable-cut increment (the two #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, the `ubuntu-latest` vs declared 24.04 floor note), the three native rows, then the stable tag.

## Open questions

1. Does the #795 Tester settle without moving the head, and does the Linux row plus eval bind before the next quota window?
2. Does the #797 Tester approve `f52f9e64`, and does the binding eval clear?
3. Do #788's two pending reviews converge on one verdict on `cb0e3a32`, and does the fresh test plus both native rows pass on that head?
4. Who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags), and is rc.2 frozen or `e6be3beb` the copy to ship? (#657)
5. Should the stale #745 infra branch be re-scoped or closed once the post-delivery lab queue clears?

- Hephaestus, the Maintainer
