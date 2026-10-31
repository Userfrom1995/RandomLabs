# STATE

Last updated: 2026-10-31T06:29Z by run 41176521995 (maintainer wake on the #788 `/oc maintainer` right after the Tester's approval; both native rows live, eval sequenced).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T06:25-06:29Z)

- **main** = `ffe54275ca6aa7e4489b4e137221bb3c86fcfd1d`, the rebase merge of #794. Pages green on it (dispatch `41176520469` succeeded 06:25:49Z; the cancelled `41176508549` is the preview-build supersede, expected). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. 0 held runs, no stray `opencode/schedule-*`/`opencode/dispatch-*` branches, trigger allowlist exact 19/19.
- **#788** (`Refs #786`, harness determinism): head **`30b0dadb`**, CLEAN/MERGEABLE, base `ef2e5503` (behind main, no overlap). Tester approved 06:21:24Z (owner `/oc approve-test` 06:21:32Z) after live five-suite CDP, the deployed preview crawl (674 assertions), and a real xterm compat run (`disposition=pass`); it pushed two test-only regressions. Native acceptance live: `test-linux` `41176553396` (agent pass) and `test-macos` `41176554918` (queued in the per-OS group), both bound to this head. The binding eval is deliberately NOT dispatched yet so it binds the final head (macOS is the delegated acceptance; per-OS findings would move the head).
- **#797** (`Fixes #796`, curator): head **`fbb1d08b`** (Tester's test commit), CLEAN/MERGEABLE, base `00716b73`. Tester PASS 06:19:57Z, `/oc approve-test` 06:20:06Z. Binding eval `41176552156` live since 06:25:37Z (dispatched by the concurrent #797 intake). No verdict yet.
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`34fe5afc`**, CLEAN/MERGEABLE, 8 commits, 19 files, base = current main `ffe54275` (0 behind). Review `41175923572` still in its agent pass since 06:16:37Z; no verdict yet. The head closes the four round-3 findings (libx11-xcb + wayland deps in both packages, exact-line RPM smoke, truthful 2.35-strong/2.39-weak forced-install text, full rebase onto main).
- **#745** parked DIRTY/CONFLICTING (superseded by #789, merged 02:32:01Z). **#792** stays behind #788 (L6 folded in). **#786** stays open until the macOS row passes and #788 merges.
- **Issues**: **19 open**. #796 -> #797 (closes on merge); #793 -> #795; #786 -> #788; #792 held behind #788; #678/#677/#659/#661/#655 are the queued Phase 6 / workstream #657 backlog; #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582 parents; #70/#42 boards. No untriaged issue, no new issue since #796 at 04:53Z, no new human question.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #788 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No `test-linux`/`test-macos` on #788: both are already live on `30b0dadb` (dispatched 06:25:35-06:25:36Z).
- No `eval` on #788 (deliberate sequencing): the macOS row is the delegated acceptance; a finding moves the head and stales the eval. The eval is first once both rows sign green; the per-OS workflow forwards its own `/oc maintainer`, so no stall.
- No `eval` on #797: `41176552156` is live on `fbb1d08b`.
- No `review`/`fix` on #795: `41175923572` is already in its agent pass on `34fe5afc`.
- No merge: #797 has no eval verdict, #788 has no eval marker, #795 has no tester approval.
- No `build`/`continue`: #792 waits behind #788 by sequencing; no build needs resume.
- No `lab`: no new failure and a fifth lane would compete with the four live delivery lanes for the same quota; #754 stays first in the post-delivery lab order.
- No `curate`/`auditor`/`ideate`/`recover`/`create_issue`/`create_pr`: schedules own the next passes, nothing stranded, no ideation request, nothing to create.
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts the #788 intake note as the bot; the hardcoded trigger steps post nothing from this run (empty decision list). The PAT merge sweep sees no workflow-touching approved PR. The approve-held sweep sees 0 held runs. The pages step sees the green deploy on `ffe54275`. The memory publish appends this 2026-10-31 entry keep-both per #647.

## Next run

1. **#788 (first)**: read `test-linux` `41176553396` and `test-macos` `41176554918` on `30b0dadb`. Both green: dispatch the binding `eval`; on `approve-eval` merge (`Refs #786`) and IMMEDIATELY dispatch `build` on #792 (including L6). The PR uses `Refs #786` on purpose, so after the merge close #786 with the harness evidence summary (the native rows' verdicts bind it). Any native finding: its forward carries the Fixer, then re-review, re-test, re-bind.
2. **#797**: read eval `41176552156` on `fbb1d08b`; on `approve-eval` merge (rebase, no branch delete) and close #796. Lab improvement PR; the daily shipping limit does not apply.
3. **#795**: read review `41175923572` on `34fe5afc`. On approval dispatch `test`, then `test-linux` bound to the final post-Tester head (packaging + docs changed), then the binding `eval`, then merge (`Closes #793`), keeping #657/#582/#683 open and the rc tags unmoved. On `fix`, the workflow's own `/oc fix` carries it.
4. After #795: the #657 stable-cut increment (the two #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, the `ubuntu-latest` vs. declared 24.04 floor assertion note), the three native rows, then the stable tag.
5. Watch the #754 quota wall (four gate deaths before the previous window; clean this window so far); keep #745 parked. Post-delivery lab order: #754, #775, #774/#773, #742/#745, the R17 wrong-nonce assertion, builder/architect alignment, review-gate retry cap, the linked-issue review residual, plus the Auditor's docs drift.
6. **#782/#794 residuals**: #794's per-OS decision stdin/CR contract is live on main. #782 residuals remain non-blocking and queued.

## Open questions

1. Do both native rows pass `30b0dadb`, and does the eval then approve so #788 merges and #792 starts?
2. Does eval `41176552156` approve `fbb1d08b` so #797 can merge and close #796?
3. Does review `41175923572` approve `34fe5afc`, or does the dependency/metadata round need another fix pass?
4. After #795, who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags)?
5. Does the owner intend rc.2 to be a frozen timestamped artifact, or is `e6be3beb` the copy to ship? (#657)
6. If the quota wall returns, should #754 be promoted ahead of the post-delivery lab queue?

- Hephaestus, the Maintainer
