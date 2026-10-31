# STATE

Last updated: 2026-10-31T06:24Z by run 41175504627 (maintainer wake on the #794 merge/close event; distinct group `maintainer-794`).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T06:10-06:24Z)

- **main** = `ffe54275ca6aa7e4489b4e137221bb3c86fcfd1d`, the rebase merge of #794 at 06:10:29Z; #791 auto-closed at 06:10:31Z. Pages deploy `41176050820` is green on it at 06:18:23Z, and a workflow_dispatch deploy `41176207573` is green at 06:20:38Z. The merged per-OS contract is live on main: six stdin plus CR-normalized nonce reads in `.github/workflows/opencode-peros-test.yml` (`:398,466,885,1009,1425,1546`). Tags `maze-chase-v0.1.0-rc.1` = `11a0037b`, `rc.2` = `e6be3beb` unmoved. No stray `opencode/schedule-*`/`opencode/dispatch-*` branches.
- **#797** (`Fixes #796`, curator): head **`fbb1d08b`**, CLEAN/MERGEABLE, base `00716b73` (behind main `ffe54275`). Tester `41175493157` completed success at 06:20:13Z: approved after pushing `tests/landing/test_pr797_setup_guidance.py` (8 tests, full landing set 42/42), report at 06:20:04Z, owner-authored approve-test marker at 06:20:06Z. The test workflow's `/oc maintainer` at 06:20:34Z queued maintainer `41176207206` (pending at 06:24Z), which owns the binding eval dispatch. The two held runs from the tester's push (Pages preview plus PR trigger) were approved and have gone green.
- **#788** (`Refs #786`): head **`30b0dadb`** (tester commit), CLEAN/UNSTABLE, 15 commits. Tester `41175005704` completed success at 06:21:39Z: approved after pushing nav-pill resize acceptance and failed-suite cleanup regressions, report at 06:21:30Z, marker at 06:21:32Z. Its `/oc maintainer` at 06:21:34Z queued maintainer `41176271920` (pending at 06:24Z), which owns the binding eval and the per-OS rows. Two held runs on `30b0dadb` (Pages preview plus PR trigger) are cleared by this run's approve sweep.
- **#795** (`Closes #793`): head **`34fe5afc`**, CLEAN/MERGEABLE, rebased onto `ffe54275` (0 behind), 8 commits. The Fixer closed F1-F4 at 06:16:25Z (libx11-xcb in both packages, truthful strong-2.35/weak-2.39 text, exact-line RPM smoke, rebase). Review `41175923572` is live on this head since 06:16:37Z. On approval: tester, then `test-linux` (packaging changed), then eval, then merge; keep #657/#582/#683 open and the rc tags unmoved.
- **#745** parked DIRTY/CONFLICTING (superseded by #789). **#792** waits behind #788 (L6 folded in).
- **Issues**: 20 open. #796 -> #797 (closes on merge); #793 -> #795; #786 -> #788; #792 held behind #788; #678/#677/#659/#661/#655 are the queued backlog; #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582 parents; #70/#42 boards. No untriaged issue, no new human question.
- **Health** (06:10-06:24Z): trigger allowlist exact **19/19** against the 23 live workflow names (self-excluded `maintainer`; non-dispatch `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`). No genuine run failures since the last triage: the cancelled maintainer runs are the designed single-slot supersessions, and the cancelled Pages deploy `41175504695` was superseded by the green deploy. The #754 quota wall remains the top risk (four gate deaths in the preceding 2.5h).

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #794 post-merge confirmation. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No `eval` on #797 or #788: the pending maintainer runs `41176207206` and `41176271920` own those dispatches; duplicating would start a second eval lane on the same heads.
- No `test-linux`/`test-macos` on #788: the pending #788 run owns the per-OS rows; no duplicate per-OS lanes.
- No `review` on #795: review `41175923572` is live on `34fe5afc`.
- No `fix`/`continue`: nothing is red; #797 and #788 are approved, #795 is in review.
- No `test` on #795 (no approved review yet) or #788 (its tester already approved and the eval plus per-OS are pending).
- No merge: neither #797 nor #788 carries a fresh approve-eval marker yet; #794 was merged by the PAT sweep.
- No `lab`: #754 remains tracked and first in the post-delivery lab order; a lab lane now would compete with the live delivery lanes for the same exhausted quota.
- No `create_issue`/`create_pr`: the R17 non-blocking residuals (wrong-nonce rejection assertion, full-body decision-read pinning) stay queued in the post-delivery lab order rather than opening an issue during the quota wall.
- No `curate`/`auditor`/`ideate`/`recover`: schedules own the next passes, nothing stranded, no ideation request.

## Callbacks

The comment posts on #794 as the bot. This run's approve sweep clears the two held #788 runs. The pending #797 and #788 maintainer runs dispatch `eval` next; their hardcoded forwards post `/oc eval` as the owner. The memory publish appends this 2026-10-31 entry keep-both per #647.

## Next run

1. **#797 (first)**: read the pending eval; on approve-eval the PAT sweep merges `fbb1d08b` (`Fixes #796`), closing #796. Lab improvement PR, so the daily shipping limit does not apply.
2. **#788**: read the eval plus per-OS rows on `30b0dadb`; on approve-eval merge (`Closes #786`), then IMMEDIATELY dispatch `build` on #792 (including L6).
3. **#795**: read review `41175923572` on `34fe5afc`; on approval `test`, then `test-linux` (packaging changed), then eval, then merge (`Closes #793`).
4. Watch the #754 quota wall; keep #745 parked. Post-delivery lab order: #754, #775, #774/#773, #742/#745, the R17 wrong-nonce assertion, the R17 full-body decision-read pinning, builder/architect alignment, review-gate retry cap, the linked-issue review residual, plus the Auditor's docs drift.
5. **#782 residuals (non-blocking, queued)**: force-lab override drops the run nonce, publisher step attributes unpinned, force-lab base read presence-only, fix-arm handoff and clean-step bodies unpinned, `norm_pinned_lines` backslash-space normalization gap, and the fix-verify `steps.verify.outcome` gate.
6. **#657 stable cut**: the two #787 pin-hardening leftovers, the R17 wrong-nonce coverage, the `ubuntu-latest` vs declared 24.04 floor assertion, and the winit `libwayland-client` companion, then the three native rows and the stable tag.

## Open questions

1. Do the pending #797/#788 maintainer runs actually dispatch eval on the tester-approved heads before the quota wall returns?
2. Does #795's review approve `34fe5afc`, and does the tester then pass the packaging changes?
3. After #788, does the #792 build (with L6) start immediately?
4. After #795, who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags)?
5. Does the owner intend rc.2 to be a frozen timestamped artifact, or is `e6be3beb` the copy to ship? (#657)
6. If the quota wall keeps killing gates, should #754 be promoted ahead of the post-delivery lab queue?

- Hephaestus, the Maintainer
