# STATE

Last updated: 2026-10-31T03:16Z by run 41163224781 (a queued `issue_comment` `/oc maintainer` wake on #794, re-surveyed fresh).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T03:10-03:16Z)

- **main** = `ef2e550351825090749d9e7c46641bb04a5cc2f1`, unchanged since the #789 rebase merge at 02:32:01Z. Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b9692c4b3da711632ff9938533650efd3`, `maze-chase-v0.1.0-rc.2` = `e6be3beb9ff2077b7ae6f4a759d4927f1488251f` (prerelease, 13 assets). No asset moved.
- **Six open PRs**: #795, #794, #790, #788, #782, #745.
- **#795** (`Closes #793`, `Refs #657/#582/#683`): NEW, opened at 03:11:26Z by the #657 repair build `41162334483` (success at 03:12:06Z). Branch `opencode/issue657-20261031025903`, head **`ef841e2b4631600c9f2e927043bdeefab746af9f`**, three `builder:` commits, 19 files (glibc 2.39 floor and X11 runtime deps in DEB/RPM metadata, dependency-resolving install commands, same-NEVRA upgrade docs, packaging/smoke tests, progress ledger). MERGEABLE/UNSTABLE only because the PR-event maintainer check was in flight. The build's `/oc review` posted at 03:11:52Z; review **`41163323537`** is queued on that head. Held PR runs from 03:11:30Z (maintainer, opencode-pr-trigger, pages) were approved and are green; 0 held now. On merge close #793; keep #657 open and never move rc.1/rc.2.
- **#794** (`Fixes #791`): head **`859a2562`**, CLEAN/MERGEABLE. Review **`41163041355`** is in its agent pass since 03:08:21Z on exactly this head (stdin/CR-normalized decision reads under `MSYS_NO_PATHCONV`). Workflow-touching PR: test, then a fresh head-bound eval, before the PAT merge.
- **#788** (`Refs #786`): head **`c1c3a2f8`**, CLEAN/MERGEABLE. Round-3 review **`41162287357`** is in its agent pass since 02:58:06Z on this exact head (round-2 Fixer landed `bfcf57c7`, `70c4f17b`, `c1c3a2f8`). **`Refs #786`, so the merge sweep must not close #786**: close it explicitly only after the macOS acceptance row passes.
- **#790** (`Fixes #787`): head **`8a4bc257`**, CLEAN/MERGEABLE. Owner `/oc approve-test` marker at 03:02:28Z; binding eval **`41162869566`** in its agent pass since 03:06:01Z. Workflow-touching PR: fresh head-bound eval marker required before merge.
- **#782** (`Closes #781`): head **`dc8f87095b3e652b4a6d36b45d726e84c82909c9`**, CLEAN/MERGEABLE. Owner tester marker at 18:59:19Z; binding eval **`41159244297`** still in its agent pass since 02:16:30Z (about 60 minutes, well inside the 105-minute agent cap).
- **#745** (`opencode/lab-742-owner-pat-env-sanitization`, `7a04fa4a`): CONFLICTING/DIRTY since 2026-10-23T15:31:38Z; parked, superseded by the merged #789.
- **#657 rc.2 native rows**: all three rows signed (Linux PASS with findings at 02:53:23Z). The L1-L4 repair build `41162334483` completed success and owns the new #795. No stable tag; rc.1/rc.2 untouched. After #795 merges, the separate stable-cut increment (workspace version `1.0.0`, docs/candidate pointers, release notes), the candidate cut, the three native rows, and only then the stable tag remain.
- **#792** (`[Maze Chase] Windows compatibility harness gaps W1-W3`): held behind #788 by design; L6 scope already recorded. Dispatch `{"action": "build", "issue": 792}` the moment #788 merges.
- **#793** (Builder's Linux increment task, created 03:02:41Z): no longer untriaged; PR #795 links it with `Closes #793`, so the merge closes it.
- **#785** CLOSED as completed at 02:32:17Z with the #789 merge; #787 closes with #790; #781 closes with #782; #786 stays open until the macOS acceptance row.
- **Health** (verified 03:10-03:16Z): held runs 0 (the #795 PR-event holds were approved and are green); zero failed/timed-out/startup-failure runs in the newest 100; trigger allowlist exact 19/19 against the 23 live active workflow names (self-excluded `maintainer`; non-dispatch targets `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`); no stray `opencode/schedule-*`/`opencode/dispatch-*` branches; pages green (deploy `41163321137` success on `ef2e5503` at 03:12:04Z); 21 open issues, all triaged or PR-linked; no new human question.
- **Quota**: no `FreeUsageLimitError` recurrence; six agent lanes live concurrently (review #795 queued, review #794, review #788, eval #790, eval #782, plus the queued maintainer intake for #795).

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #794 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- No `review` on #795: the build already forwarded `/oc review` and `41163323537` is queued.
- No `review` on #794 or #788: both reviews are live on the exact heads.
- No `eval` on #790 or #782: both evals are live on the exact heads.
- No `test`/per-OS dispatch: no PR has a fresh Tester pass awaiting a per-OS row; #788's macOS row stays sequenced after its Tester.
- No `build` on #793: it is fully linked to #795.
- No `build` on #792: still sequenced behind #788's merge.
- No merge: no PR carries a fresh tester approval plus a fresh head-bound `approve-eval` marker.
- No `curate`/`auditor`/`ideate`/`recover`/`create_issue`/`create_pr`: schedules own the next passes, nothing stranded, no ideation request, nothing to create.
- No `emergency.json`: no failed Lab Engineer attempt and no halted production.

## Callbacks

The hardcoded comment step posts the #794 intake note. The trigger step posts nothing (empty decision list). The PAT merge sweep finds no fresh tester plus eval marker pair and merges nothing. The approve-held sweep sees 0 held runs. The pages step sees `main` at `ef2e5503` with the last deploy green. The memory publish appends the 2026-10-31 entry keep-both per #647.

## Next run

1. Read review `41163323537` on #795 head `ef841e2b`. On approve, let the Tester run; after its final push dispatch `test-linux` (and `test-macos`/`test-windows` if the increment's docs/packaging claims need native binding), then the binding eval, then the head-bound PAT merge (`Closes #793`; keep #657 open; do not move rc.1/rc.2).
2. Read review `41163041355` on #794 head `859a2562`. On approve, test, then the binding eval, then the head-bound PAT merge (`Fixes #791`), closing #791.
3. Read review `41162287357` on #788 head `c1c3a2f8`. On approve, let the Tester run; after the Tester's final push dispatch `test-macos` (and `test-linux` if harness code moved) so the macOS acceptance binds the final head, then the binding eval, the head-bound merge, and only then close #786 and immediately dispatch `{"action": "build", "issue": 792}`.
4. Read #790 eval `41162869566` on `8a4bc257`. On `approve-eval`, verify the head-bound marker and merge (`Fixes #787`), closing #787; on `fix`, dispatch the Fixer with the exact findings.
5. Read #782's eval `41159244297` on `dc8f8709`. On `approve-eval`, verify the head-bound marker and merge (`Closes #781`), closing #781.
6. After the #795 merge, dispatch the separate stable-cut increment on #657 (workspace version `1.0.0`, docs/candidate pointers, release notes), cut the candidate, run the three native rows, then the stable tag.
7. Watch the quota (#754) and never mass re-dispatch into a wall. Keep #745 parked; post-delivery lab order: #754, #775, #773/#774, #742/#745, builder/architect directory alignment, review-gate retry cap.

## Open questions

1. Does review `41163323537` approve the #795 Linux packaging increment on `ef841e2b`?
2. Does review `41163041355` approve the #791 MSYS/stdin fix on `859a2562`?
3. Does review round 3 approve `c1c3a2f8` on #788?
4. Does #790 return `approve-eval` on `8a4bc257`, or a fix verdict?
5. Does #782 return `approve-eval` on `dc8f8709`?
6. Does the #788 Tester add tests (moving the head), and does the macOS row bind the final head?
7. After #795, is the stable-cut increment packaging/docs-only, and who pushes the stable `maze-chase-v1.0.0` tag (a branch dispatch can only cut rc tags)?
8. Standing: is rc.2 meant to be a frozen timestamped artifact, or is `e6be3beb` the shipped copy? (#657)

- Hephaestus, the Maintainer
