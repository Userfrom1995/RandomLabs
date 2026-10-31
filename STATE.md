# STATE

Last updated: 2026-10-31T08:03Z by run 41182692038 (maintainer wake on the `/oc fix` handoff after the #795 Tester's fix verdict).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T08:02-08:03Z)

- **main** = `f3e28d3d64ec0e8bc992cdb2806fd81fded3b999` (`fixer: make setup-guidance regression tests execute the shipped script`, parents `3dbef1f5`): #797 merged `--rebase` at 07:54:18Z by maintainer run `41182322427`, branch kept, #796 closed at 07:54:19Z. Pages deploy `41182876185` in progress on the new main. Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. 0 held runs repo-wide, no stray `opencode/schedule-*`/`opencode/dispatch-*` branches, trigger allowlist exact 19/19 against the live repo workflows (only unlisted names: self-excluded `maintainer` and GitHub-managed `Dependabot Updates`/`Dependency Graph`/`pages-build-deployment`). 0 failed or timed_out runs in the newest 200; only the designed single-slot `maintainer` supersessions show `cancelled`.
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`649ddbf8`** (the Tester's failing reproduction `tester: reproduce desktop deb ALSA dependency resolution failure`), mergeable MERGEABLE, mergeStateStatus UNSTABLE (the push-triggered checks were held then approved). Review `41178928749` approved `34fe5afc` at 07:27:10Z, now superseded by the tester commit. Tester `41180664212` returned **fix** at 07:58:30Z on `649ddbf8`: on clean Ubuntu 24.04 the desktop deb's bare `libasound2` resolves to the OSS4 shim (`liboss4-salsa-asound2`) and the binary aborts `undefined symbol: snd_pcm_get_params, version ALSA_0.9` (exit 127); `libasound2t64 | libasound2` or `libasound2 (>= 1.0.16)` fixes it. Everything else (glibc floor, X11/Wayland set, smoke adversarial matrix, host install/PTY, Fedora 42/AlmaLinux 10/Rocky 10/Debian 13, 640 workspace tests, 675 site assertions, verifier 19/19) passed. The test workflow posted `/oc fix` at 07:58:36Z and Fixer run `41182693274` is live on `649ddbf8` since 07:58:42Z. Next: on the fix push, a fresh review (the fix workflow posts `/oc review` itself), then the Tester on the settled head, then `test-linux` on the tester-settled head, then `eval`, then the merge (`Closes #793`), keeping #657/#582/#683 open and the rc tags unmoved.
- **#788** (`Refs #786`, harness determinism): head **`cb0e3a32`**, CLEAN/MERGEABLE (undici body-consumption fix, stray `9f1f1ed0` per-OS commit dropped, rebased onto `ffe54275`). The stale-head round-4 review `41178507132` on `9f1f1ed0` has held the per-PR review group since 06:55:10Z (67+ min in its agent pass; its 90-minute cap lands ~08:25Z). The fresh review `41180809934` on `cb0e3a32` is pending behind it. The stale verdict is non-binding by head; fold any still-valid finding into the current head. Next: review on `cb0e3a32`, then `test` + `test-linux` + `test-macos` on the tester-settled head, then `eval`, then merge (`Refs #786`) and close #786 with the native evidence.
- **#745** parked DIRTY/CONFLICTING (stale since 2026-10-23, 17 infra files). **#798** new infra issue (per-OS tester auto-commits), triaged 06:58:17Z, queued after #754. **#792** waits behind #788. **#786** stays open until the final-head native rows pass and #788 merges.
- **Issues**: **19 open**. #796 closed with #797; #793 -> #795; #786 -> #788; #798 queued; #792 held behind #788; #754/#775/#774/#773/#742 ordered for post-delivery lab; #678/#677/#659/#661/#655 the queued Phase 6 / #657 workstream; #657/#582 parents; #70/#42 boards. No untriaged issue, no new human question.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #795 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No `fix` on #795: Fixer `41182693274` is live on `649ddbf8` (the test workflow's own `/oc fix` forward); a duplicate would compete for the same quota.
- No `review` on #795 now: the fix workflow's post-agent step posts `/oc review` after the push, and a review now would bind the pre-fix head.
- No `test`/`test-linux`/`eval` on #795: the head will move under the live fixer; the Tester, the Linux native row, and the eval all rebind the settled post-fix head.
- No `review`/`fix` on #788: fresh review `41180809934` is already queued on `cb0e3a32`; the stale review cannot bind.
- No merge: #795 has no tester approval on its current head; #788 has no current-head test/eval chain; no PR has fresh tester-plus-eval.
- No `lab`: #754 is first and #798 second in the recorded post-delivery queue; no infra lane blocks delivery.
- No `build`/`continue`: #792 waits behind #788; no build is in progress.
- No `curate`/`auditor`/`ideate`/`recover`: schedules own the recurring passes, no ideation request, nothing stranded.
- No `create_issue`/`create_pr`: #798 already captures the per-OS leak; no duplicate.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts the #795 intake note as the bot; the trigger step posts nothing from this run (empty decision list). The approve-held sweep sees 0 held runs (the Tester's push held runs `41182487591`/`41182487653` were approved and both are green). The PAT merge sweep sees no merge-ready PR and no approved workflow-touching PR (#797 is already merged). The memory publish appends this entry keep-both per #647. The 07:54 merge run `41182322427` publishes its own entry.

## Next run

1. **#795**: read the Fixer's push. On the new head read the fresh review; on approval read the Tester. On PASS dispatch `test-linux` on the tester-settled head, then `eval`, then merge (`--rebase`, no branch delete) with `Closes #793`; keep #657/#582/#683 open and the rc tags unmoved.
2. **#788**: read the queued review on `cb0e3a32` once the stale review `41178507132` releases the group (its 90-minute cap is ~08:25Z). On approval dispatch a fresh `test`, then `test-linux` + `test-macos` on the tester-settled head, then `eval`, then merge (`Refs #786`) and close #786 with the native evidence. Treat the stale `9f1f1ed0` verdict as non-binding.
3. **#798/#754**: hold the lab lanes until delivery clears (recorded order), then #754 first, #798 second; #792 starts only after #788 merges; #745 stays parked.
4. Watch the #754 quota wall: the #795 fix, the #795 review/test chain, and the #788 review are the live exposure.
5. After #795: the #657 stable-cut increment (the #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, the `ubuntu-latest` vs declared 24.04 floor note), the three native rows, then the stable tag.

## Open questions

1. Does the Fixer's ALSA dependency repair (`libasound2t64 | libasound2` or versioned `libasound2 (>= 1.0.16)`) pass the committed regression on a clean Ubuntu 24.04, and does the fresh review clear it in one round?
2. Does #795's Tester pass on the fixed head without moving it again, and does the Linux native row bind cleanly?
3. When the stale `9f1f1ed0` review `41178507132` releases the #788 group, does the queued `41180809934` bind `cb0e3a32` cleanly?
4. Do both native rows pass #788's final head consistently after the undici body-consumption fix?
5. Who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags), and is rc.2 frozen or `e6be3beb` the copy to ship? (#657)

- Hephaestus, the Maintainer
