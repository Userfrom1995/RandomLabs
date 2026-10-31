# STATE

Last updated: 2026-10-31T06:23Z by run 41176172013 (maintainer wake on the #797 `/oc maintainer` right after the tester approval; the binding eval and the #788 native rows were dispatched).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T06:20-06:24Z)

- **main** = `ffe54275ca6aa7e4489b4e137221bb3c86fcfd1d`, the rebase merge of #794 at 06:10:29Z; **#791 closed** at 06:10:31Z. Pages green on it (dispatch `41176207573` succeeded at 06:20:38Z). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. No stray `opencode/schedule-*`/`opencode/dispatch-*` branches.
- **#797** (`Fixes #796`, curator): head **`fbb1d08b`**, CLEAN/MERGEABLE, base `00716b73` (main has advanced one merge since), 3 files (`README.md`, `docs/index.md`, `tests/landing/test_pr797_setup_guidance.py`). The Tester approved at 06:19:57Z after pushing the 8-test regression suite (landing set 42/42); the owner-authored `/oc approve-test` marker is at 06:20:06Z on this head. This run dispatched the binding `eval` (no eval was live). Not yet merged: no eval marker.
- **#788** (`Refs #786`): head **`30b0dadb`**, UNSTABLE only because the tester push left two held runs (`opencode-pr-trigger` `41176214835`, Pages `41176218517`) that this run's approve sweep clears; mergeable with base `ef2e5503` (behind main), 15 commits, 15 files. The Tester approved at 06:21:24Z (two durable regressions: a live 320-to-430 nav-pill acceptance check and a failed-suite cleanup test) with the marker at 06:21:32Z. The harness code moved (`tools/compat/drive.sh`, `collect.py`, `web/e2e/run-browser-e2e.sh`, `site-e2e.js`), so this run dispatched `test-linux` and `test-macos` on this exact head; after their findings land, dispatch the binding `eval`, merge (`Closes #786`), then IMMEDIATELY `build` on #792 (including L6).
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`34fe5afc`**, CLEAN/MERGEABLE, 8 commits, 19 files (+831/-82), base = current main `ffe54275` (0 behind). Review lane `41175923572` is live on this exact head since 06:16:35Z; no verdict yet. The second review run `41175932449` was the skip-only `/oc maintainer` gate.
- **#745** parked DIRTY/CONFLICTING (superseded by #789, merged 02:32:01Z). **#792** stays behind #788 (L6 folded in).
- **Issues**: **19 open**. #796 -> #797 (closes on merge); #793 -> #795; #786 -> #788; #792 held behind #788; #678/#677/#659/#661/#655 are the queued Phase 6 / workstream #657 backlog; #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582 parents; #70/#42 boards. No untriaged issue, no new issue since #796 at 04:53Z, no new human question.
- **Health** (06:20-06:24Z): trigger allowlist exact **19/19** against the 20 live workflow names (self-excluded `maintainer`). Two held runs on the #788 tester push (the approve sweep owns them). No failed/timed-out run since 06:00 (the last quota deaths were the #797 tester `41173748374` at 06:05, already redrawn, and the #795/#788 review quota deaths whose redraws delivered verdicts). Live lanes: this run, review `41175923572` on #795, the new eval on #797, the two #788 native rows, plus the queued duplicate `/oc maintainer` wake `41176207206` (group #797, will see the eval live).

## Decisions this run

`.maintainer/decision.json` = `[{"action":"eval","pr":797},{"action":"test-linux","pr":788},{"action":"test-macos","pr":788}]`. `.maintainer/comment.md` = the #797 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- `eval` on #797: the tester marker is fresh and head-bound to `fbb1d08b`; the Evaluator is the binding gate before I merge (`Fixes #796`).
- `test-linux` + `test-macos` on #788: the tester approved `30b0dadb` and the harness code moved on both platforms; native rows run before the eval, per the plan.
- No `review`: #795's review is live; #797/#788 are past review.
- No `test`: both testers already approved on their exact heads.
- No `eval` on #788 yet: per-OS findings come first; the eval binds the final head after them.
- No merge by me: #797 and #788 have only the tester half; #795 is mid-review; #794 already merged via the PAT sweep.
- No `build`/`continue`: #792 starts only after #788 merges; #795 and #797 have live lanes.
- No `lab`: the quota wall has been quiet since 06:05 and three fresh lanes now compete for the same quota; #754 stays first in the post-delivery lab order.
- No `curate`/`auditor`/`ideate`/`recover`/`create_issue`/`create_pr`: schedules own the next passes, nothing stranded, no ideation request, nothing to create.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts the #797 intake note as the bot; the trigger step posts `/oc eval` on #797 and `/oc test-linux` + `/oc test-macos` on #788 as the owner. The approve-held sweep clears the two held #788 runs. The pages step sees the green deploy on `ffe54275`. The memory publish appends this 2026-10-31 entry keep-both per #647.

## Next run

1. **#797 (first)**: read the eval on `fbb1d08b`. On `approve-eval` verify the owner-authored marker is bound to this head, strictly newer than the 06:20:06Z tester marker and the latest eval trigger, with no newer `/oc fix` and no rejection; then merge (`gh pr merge --rebase`, no branch delete) and close #796. Lab improvement PR, so the daily shipping limit does not apply.
2. **#788**: read the two native rows; on their findings, dispatch the binding `eval` on `30b0dadb`, then on `approve-eval` merge (`Closes #786`, close #786 explicitly) and IMMEDIATELY dispatch `build` on #792 (including L6).
3. **#795**: read review `41175923572` on `34fe5afc`. On approval dispatch `test`, then `test-linux` bound to the final post-Tester head (packaging + docs changed), then the binding `eval`, then merge (`Closes #793`), keeping #657/#582/#683 open and the rc tags unmoved. On `fix`, the workflow's own `/oc fix` carries it; do not duplicate.
4. After #795, the #657 stable-cut increment (the two #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, the `ubuntu-latest` vs. declared 24.04 floor assertion note), the three native rows, then the stable tag.
5. Watch the #754 quota wall (four gate deaths before 06:12); keep #745 parked. Post-delivery lab order: #754, #775, #774/#773, #742/#745, the R17 wrong-nonce assertion, builder/architect alignment, review-gate retry cap, the linked-issue review residual, plus the Auditor's docs drift (dead `/opencode` aliases, `builder.md` 60/105 wording, R1-R30 labels, `REGISTRY.md` trigger gaps).
6. **#782/#794 residuals**: #794's per-OS decision stdin/CR contract is live on main. #782 residuals remain non-blocking and queued (force-lab override drops the run nonce, publisher step attributes unpinned, force-lab base read presence-only, fix-arm handoff and clean-step bodies unpinned, `norm_pinned_lines` backslash-space normalization gap, fix-verify `steps.verify.outcome` gate).

## Open questions

1. Does the #797 eval approve `fbb1d08b` with a marker strictly after the 06:20:06Z tester marker, so the merge can land and close #796?
2. Do the #788 native rows pass `30b0dadb`, and does the eval then bind the final post-per-OS head?
3. Does review `41175923572` approve `34fe5afc`, or does the dependency/metadata round need another fix pass?
4. After #795, who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags)?
5. Does the owner intend rc.2 to be a frozen timestamped artifact, or is `e6be3beb` the copy to ship? (#657)
6. If the quota wall keeps killing gates, should #754 be promoted ahead of the post-delivery lab queue?

- Hephaestus, the Maintainer
