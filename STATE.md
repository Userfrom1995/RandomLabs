# STATE

Last updated: 2026-10-31T04:58Z by run 41170452821 (PR-created wake on the #797 Curator docs fix; every gate lane is live, no new dispatch).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T04:55-04:58Z)

- **main** = `c28215a1f8138b66f3efebed9790957a993defcc`, the rebase merge of #790 at 03:28:21Z. Pages green on it (preview rebuild `41170454368` success at 04:54:45Z). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b`, `maze-chase-v0.1.0-rc.2` = `e6be3beb`. No asset moved.
- **Six open PRs**: #797, #795, #794, #788, #782, #745.
- **#797** (`Fixes #796`, Curator docs fix): NEW at 04:54:20Z, head **`1658993c930a292de7dfae3f3378112cfa722379`**, CLEAN/MERGEABLE, docs-only (`README.md`, `docs/index.md`): the first-run quickstart now says `bash setup.sh --secrets --dispatch` and the setup summary names `--secrets`/`--dispatch`/`--check`, matching `setup.sh:5-8/103-104` and `docs/index.html:213-215`. The Curator's own `/oc review` at 04:54:33Z started review **`41170444288`** live since 04:54:35Z (the pending `41170452829` is the skip-only sibling from the `/oc maintainer` comment). #796 closes on merge.
- **#795** (`Closes #793`, `Refs #657/#582/#683`): head **`ef841e2b`**, CLEAN/MERGEABLE, 19 files. Review retry 3 `41169674257` completed success at 04:55:20Z with verdict **fix**: F1 missing delegation ledger/skills note in `progress/793-maze-chase-linux-package-floor.md`, F2 the forced-install claim is false (a forced install aborts at startup with a missing `GLIBC_2.39` symbol, not warnings), F3 rebase onto `c28215a1` (main's #787 touched `tester_packaging.rs`) and re-run the packaging suite plus smoke. The workflow published the report at 04:55:14Z and posted `/oc fix` at 04:55:16Z; fix lane **`41170493455`** live since 04:55:19Z.
- **#794** (`Fixes #791`): head **`6b495e8e`**, CLEAN/MERGEABLE, 6 files. Tester approved at 04:48:24Z (infra read-only lane, 32/32 primary plus 30/30 independent cases, audit 31/0). Binding eval **`41170419022`** live since 04:54:10Z; no approve-eval marker yet.
- **#788** (`Refs #786`): head **`c1c3a2f8`**, CLEAN/MERGEABLE, 14 commits. Explicit head-bound review **`41170420781`** live since 04:54:12Z after the round-3 quota death and the spent auto-retry cap.
- **#782** (`Closes #781`): head **`dc8f8709`**, CLEAN/MERGEABLE. Owner-authored tester marker `6531136130` at 18:59:19Z. Fresh binding eval **`41167401695`** live since 04:09:46Z (about 46 minutes at this survey, inside the 105-minute agent cap).
- **#745** parked DIRTY/CONFLICTING (superseded by #789).
- **Issues**: 21 open. #796 -> #797; #793 -> #795; #791 -> #794; #786 -> #788; #781 -> #782; #792 held behind #788 (L6 recorded); #754/#775/#774/#773/#742 ordered for post-delivery lab; #657/#582/#683 stay open for the stable gate; #70/#42 are the boards. Zero untriaged, no new human question.
- **Health** (04:55-04:58Z): 0 held runs; trigger allowlist exact **19/19** against the 23 live active workflow names (self-excluded `maintainer`; non-dispatch `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`); 0 stray `opencode/schedule-*`/`opencode/dispatch-*` branches; no failed/timed-out/startup-failure runs in the newest 100; pages green on `c28215a1`; rc tags unmoved. Five agent lanes live: #797 review, #795 fix, #794 eval, #788 review, #782 eval.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #797 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No duplicate `review` on #797: `41170444288` is live on the docs-only head from the Curator's own `/oc review`.
- No duplicate `fix` on #795, `eval` on #794 or #782, or `review` on #788: all are live on their exact heads.
- No `test`: no approved review is waiting on QA (#797 review live, #795 fix live, #794 eval, #788 review, #782 eval).
- No merge: no PR carries a fresh tester approval plus a fresh head-bound `approve-eval` marker.
- No per-OS dispatch: no PR has a fresh Tester pass awaiting a per-OS row.
- No `build`/`continue` on #793/#657 (their build produced #795) or on #792 (behind #788's merge).
- No `curate`/`auditor`/`ideate`/`recover`/`create_issue`/`create_pr`: schedules own the next passes, nothing stranded, no ideation request, nothing to create (#796 is linked to #797).
- No `emergency.json`: the Lab Engineer lane is healthy and production is not halted.

## Callbacks

The hardcoded comment step posts the #797 intake note. The trigger step posts nothing. The PAT merge sweep finds no fresh tester-plus-eval pair and merges nothing. The approve-held sweep sees 0 held runs. The pages step sees `main` at `c28215a1` with the last deploy green. The memory publish appends this 2026-10-31 entry keep-both per #647.

## Next run

1. **#797 (first)**: read review `41170444288` on `1658993c`. On approval, let the Tester run, then the binding eval, then the head-bound PAT merge (`Fixes #796`), closing #796.
2. **#794**: read eval `41170419022` on `6b495e8e`. On `approve-eval`, verify the owner-authored canonical marker is bound to `6b495e8e` and strictly newer than the 04:48:19Z tester marker and the latest eval trigger, then the head-bound PAT merge (`Fixes #791`), closing #791. If it dies on the #754 quota class at cap, redraw once on a fresh runner (never advance the ladder or change the head).
3. **#782**: read eval `41167401695` on `dc8f8709`; on `approve-eval`, verify the marker is strictly newer than the 18:59:19Z tester marker, merge head-bound (`Closes #781`), closing #781. If the redraw dies on the same quota class at cap, dispatch one more fresh explicit eval on a new runner.
4. **#795**: read the Fixer outcome; its push auto-triggers review. On a clean review, test; decide `test-linux` re-verification after the Tester's final head; then eval; then the head-bound PAT merge (`Closes #793`), keeping #657/#582/#683 open and the rc tags unmoved.
5. **#788**: read the explicit review `41170420781` on `c1c3a2f8`; then test, `test-macos` (and `test-linux` if harness code moved), eval, merge (`Closes #786`), close #786 explicitly, then IMMEDIATELY dispatch `build` on #792 (including L6).
6. After #795, the #657 stable-cut increment (fold in the two #787 pin-hardening leftovers, the R17 wrong-nonce coverage note, and the #795 review's `ubuntu-latest`/GLIBC-symbol observation), the three native rows, then the stable tag.
7. Watch the #754 quota wall; keep #745 parked. Post-delivery lab order: #754, #775, #773/#774, #742/#745, the R17 wrong-nonce assertion, builder/architect alignment, review-gate retry cap.

## Open questions

1. Does the #797 review approve the docs-only Curator fix, and does #796 close on merge?
2. Does the #794 eval approve `6b495e8e` and land its marker strictly after the Tester's 04:48:19Z marker?
3. Does the #782 eval `41167401695` survive the quota wall and approve `dc8f8709`?
4. Does the #795 Fixer close F1/F2, rebase onto `c28215a1`, and pass the next review?
5. Does the explicit #788 review approve `c1c3a2f8`, and does the macOS row then bind the final post-Tester head?
6. After #795, who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags)?
7. Does the owner intend rc.2 to be a frozen timestamped artifact, or is `e6be3beb` the copy to ship? (#657)

- Hephaestus, the Maintainer
