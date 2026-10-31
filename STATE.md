# STATE

Last updated: 2026-10-31T07:40Z by run 41181273817 (maintainer wake on the `/oc maintainer` handoff after the #797 tester PASS).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T07:37-07:40Z)

- **main** = `ffe54275ca6aa7e4489b4e137221bb3c86fcfd1d`. Pages green (`41180819253` deploy on it). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. 0 held runs, no stray `opencode/schedule-*`/`opencode/dispatch-*` branches, trigger allowlist exact 19/19, no failed or timed_out run in the newest 100 (only the designed single-slot `maintainer` supersessions show `cancelled`).
- **#797** (`Fixes #796`, curator): head **`f52f9e64`**, CLEAN/MERGEABLE, base `ffe54275`. Review `41180303373` approved at 07:30:11Z. Tester `41180859927` PASSED at 07:36:13Z (docs match `setup.sh`, live site clean at 1440/390, hermetic flag matrix and `--check` hostile flows, 45/45 landing tests, mutation resistance independently verified); owner-authored `/oc approve-test` marker at 07:36:21Z on this head. This run dispatched the binding `eval` via `/oc eval`. Next: on `approve-eval` (fresh marker bound to `f52f9e64`) merge `--rebase` without branch delete and close #796; on `fix`, route the next fix round.
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`34fe5afc`**, CLEAN/MERGEABLE. Review `41178928749` approved at 07:27:10Z. Tester `41180664212` in its agent pass since 07:27:32Z. No tester marker yet. Next: on PASS dispatch `test-linux` on the tester-settled head, then `eval`, then merge (`Closes #793`), keeping #657/#582/#683 open and the rc tags unmoved.
- **#788** (`Refs #786`, harness determinism): head **`cb0e3a32`** (rebased onto `ffe54275`, undici body-consumption fix applied, stray `9f1f1ed0` commit dropped). The stale-head review `41178507132` on `9f1f1ed0` has held the per-PR review group since 06:55:21Z (42+ min in its agent pass); the fresh review `41180809934` on `cb0e3a32` is queued behind it, and the skip-only `41180817832` will skip at its gate. The stale verdict is non-binding by definition; fold any still-valid finding into the current head. Next: review on `cb0e3a32`, then `test` + `test-linux` + `test-macos` on the tester-settled head, then `eval`, then merge (`Refs #786`) and close #786 with the native evidence.
- **#798** new infra issue (per-OS tester auto-commits), triaged 06:58:17Z, queued after #754. **#745** parked DIRTY/CONFLICTING (17 infra files, stale since 2026-10-23). **#792** waits behind #788. **#786** stays open until the final-head native rows pass and #788 merges.
- **Issues**: **20 open**. #796 -> #797 (eval in flight); #793 -> #795; #786 -> #788; #798 queued; #792 held behind #788; #678/#677/#659/#661/#655 the queued Phase 6 / #657 workstream; #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582 parents; #70/#42 boards. No untriaged issue, no new human question.

## Decisions this run

`.maintainer/decision.json` = `[{"action": "eval", "pr": 797}]`. `.maintainer/comment.md` = the #797 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- `eval` on #797: the Tester PASS and owner-authored approve-test marker are both bound to the current head `f52f9e64`, with no newer `/oc fix`; the binding Evaluator gate is the required next step. The prior eval rejected the superseded `fbb1d08b` and its rejection is older than the fresh tester marker.
- No `review`/`fix`/`test` on #797: review approved this head, the tester settled it, and no findings are open.
- No `test` on #795: `41180664212` is live on `34fe5afc`; a duplicate would compete for the same quota.
- No `test-linux` on #795 yet: the Tester may push durable tests and move the head, so the native row must bind the settled head after the tester verdict.
- No `review`/`fix`/`test`/native on #788: the fresh review is queued on `cb0e3a32` behind the stale in-progress one; the test and both native rows rebind after the review and Tester settle the head. The macOS findings are already applied.
- No `lab`: #754 is first and #798 second in the recorded post-delivery queue; no infra lane blocks delivery.
- No merge: #797 has no fresh head-bound `approve-eval` marker yet; #795 has no tester approval; #788's approvals bind older heads.
- No `build`/`continue`: #792 waits behind #788; no build is in progress.
- No `curate`/`auditor`/`ideate`/`recover`: schedules own the recurring passes, no ideation request, nothing stranded.
- No `create_issue`/`create_pr`: #798 already captures the per-OS leak; no duplicate.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts the #797 intake note as the bot; the trigger step posts `/oc eval` for #797. The approve-held sweep sees 0 held runs. The PAT merge sweep sees no merge-ready PR and no approved workflow-touching PR. The memory publish appends this entry keep-both per #647.

## Next run

1. **#797 (first)**: read the binding eval on `f52f9e64`. On `approve-eval` (fresh marker bound to the head and to the latest eval trigger) merge `--rebase` without deleting the branch, then close #796 and verify Pages. On `fix`, route the next fix round on the same head.
2. **#795**: read tester `41180664212`. On PASS dispatch `test-linux` on the tester-settled head, then `eval`, then merge (`Closes #793`); keep #657/#582/#683 open and the rc tags unmoved.
3. **#788**: read the queued review on `cb0e3a32` once the stale-head review `41178507132` releases the group. On approval dispatch a fresh `test`, then `test-linux` + `test-macos` on the tester-settled head, then `eval`, then merge (`Refs #786`) and close #786 with the native evidence. Treat the stale `9f1f1ed0` verdict as non-binding; fold any still-valid finding into the current head.
4. **#798/#754**: hold the lab lanes until delivery clears (recorded order), then #754 first, #798 second; #792 starts only after #788 merges; #745 stays parked.
5. Watch the #754 quota wall: the #797 eval and the #795 tester are the live exposure.
6. After #795: the #657 stable-cut increment (the #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, the `ubuntu-latest` vs declared 24.04 floor note), the three native rows, then the stable tag.

## Open questions

1. Does the binding eval approve `f52f9e64`, and does the merge sweep see the fresh tester-plus-eval marker pair?
2. Does #795's tester pass, and does the Linux native row bind cleanly on the settled head?
3. When does the stale `9f1f1ed0` review `41178507132` release the #788 group, and does it dispatch a redundant fix on `cb0e3a32`?
4. Do both native rows pass #788's final head consistently after the undici body-consumption fix?
5. Who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags), and is rc.2 frozen or `e6be3beb` the copy to ship? (#657)

- Hephaestus, the Maintainer
