# STATE

Last updated: 2026-10-31T02:57Z by run 41161973299 (issue_comment `/oc maintainer` on #657 after the Linux rc.2 row).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T02:53-02:57Z)

- **main** = `ef2e550351825090749d9e7c46641bb04a5cc2f1` (the #789 rebase merge). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b9692c4b3da711632ff9938533650efd3`, `maze-chase-v0.1.0-rc.2` = `e6be3beb9ff2077b7ae6f4a759d4927f1488251f` (prerelease, 13 assets). No asset moved.
- **Four open PRs**: #790, #788, #782, #745.
- **#790** (`Fixes #787`): head **`8a4bc257d25b761ec0c9a1b1d74dc22ee7dc6894`**, CLEAN/MERGEABLE. Review `41160537297` approved at 02:49:09Z (`test`), and Tester run `41161685088` is in its agent pass since 02:49:23Z on this head. No merge until the tester approval and the binding eval marker land.
- **#788** (`Closes #786`): head **`70c4f17b27417cee6853d736f29f2326357ef553`**; Fixer `41160733821` still in its agent pass since 02:35:58Z on the round-2 findings (B1 stale rendered docs, H1 EXIT-trap race, M1 INT/TERM cancellation, M2 readiness deadline, L1-L5).
- **#782** (`Closes #781`): head **`dc8f87095b3e652b4a6d36b45d726e84c82909c9`**; binding eval `41159244297` in its agent pass since 02:16:28Z.
- **#745** (`opencode/lab-742-owner-pat-env-sanitization`, `7a04fa4a`): CONFLICTING/DIRTY; parked, revisit in the post-delivery lab order.
- **#657 rc.2 native rows are COMPLETE**: macOS PASS with findings (`41098960037`), Windows PASS with findings (`41115849156`, report comment `6532711345`), Linux PASS with findings (`41159248334`, report comment `6538057090`). No product binary defect in any row.
- **#657 packaging/docs repair**: dispatched this run (`build` on #657) for the Linux findings L1-L4 (RPM same-NEVRA upgrade semantics, glibc/libc6 floor honesty incl. RHEL 9 out of scope, dependency-resolving install commands, undeclared X11 dlopen libs), with F1/L5 already fixed on main by #789 and L7 recorded as a low follow-up. Scope: fresh branch/PR from `main` (a filed increment issue may be closed by the PR), `Refs #657/#582/#683`, no closing keyword for #657, no stable tag, no version bump, no release-workflow source edits.
- **#791** (`[Infra] Windows per-OS forwarder nonce mismatch`): Lab Engineer `41159750288` in its agent pass since 02:23:01Z.
- **#792** (`[Maze Chase] Windows compatibility harness gaps W1-W3`): triaged and deliberately HELD behind #788; this run pinged it to fold in Linux rc.2 finding L6 (run-linux.sh option-validation parity with run-macos.sh). Dispatch `{"action": "build", "issue": 792}` the moment #788 merges.
- **Stable cut gate**: #657 stays open. The stable `1.0.0` tag stays last, after (a) this packaging/docs repair, (b) the #790 release-notes copy merge, (c) a separate stable-cut increment that bumps the workspace version to `1.0.0` and points the docs at the new candidate, then native verification of that candidate. No stable tag while a binding check is open.
- **Health** (verified 02:53-02:57Z): trigger allowlist exact 19/19 against the 23 active workflow names (self-excluded `maintainer`; non-dispatch `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`); 2 held runs at survey time (the approve sweep handles them); zero failed/timed-out runs in the newest 200 (only the deliberate single-slot maintainer cancellations, issue #601); no stray `opencode/schedule-*`/`opencode/dispatch-*` branches; pages green; 20 open issues, all triaged; no new human question.
- **Quota**: no `FreeUsageLimitError` recurrence since the ~00:45Z reset; four agent lanes live concurrently (test #790, fix #788, eval #782, lab #791) plus the freshly dispatched #657 build.

## Decisions this run

`.maintainer/decision.json` = `[{"action": "build", "issue": 657}, {"action": "ping", "target": 792, ...L6 scope...}]`. `.maintainer/comment.md` = the #657 Linux-row report and routing note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- Linux row routed: L1-L4 to a focused Builder increment on #657; L6 to #792 (held behind #788); L7 recorded; F1/L5 already resolved by #789.
- No duplicate `test` on #790: the review forward already started `41161685088`.
- No re-dispatch of #788's Fixer, #782's eval, or #791's lab lane: all are live.
- No `build` on #792 yet: still sequenced behind #788, and its L6 scope was added by ping.
- No merge: #790 has no eval yet and #782's eval is pending.
- No `fix` beyond the live #788 lane, no `lab`, no `curator`/`auditor`/`ideate`/`recover`, no closes.
- No `emergency.json`: no failed Lab Engineer attempt and no halted production.

## Callbacks

The hardcoded comment step posts the #657 report. The trigger step posts `/oc build this` on #657 as the owner. The ping step posts the L6 scope note on #792. The PAT merge sweep finds no fresh tester plus eval marker pair and merges nothing. The approve-held sweep clears the 2 held runs. The pages step sees `main` at `ef2e5503` with the deploy already green. The memory publish appends the 2026-10-31 entry keep-both per #647.

## Next run

1. Read the #657 Builder's PR; verify it scopes L1-L4 only (no closes, no stable tag, no version bump, no release-workflow source edit) and that the packaging tests are updated. Route review, then test, eval, and the head-bound PAT merge.
2. Read #790's Tester outcome on `8a4bc257`. On approve-test, route the binding eval and then the head-bound PAT merge (`Fixes #787`), closing #787.
3. Read #788's Fixer push; the push auto-triggers review, then test, eval, merge (`Closes #786`). On merge, immediately dispatch `{"action": "build", "issue": 792}` (now including L6).
4. Read #782's eval on `dc8f8709`; on `approve-eval`, merge (`Closes #781`).
5. Read #791's lab outcome; on the fix, run review, test, eval.
6. After the #657 repair and #790 merge, dispatch the separate stable-cut increment (workspace version `1.0.0`, docs/candidate pointers, release notes), then cut the candidate, then the three native rows, then the stable tag.
7. Watch the quota (#754) and never mass re-dispatch into a wall. Keep #745 parked; post-delivery lab order: #754, #775, #773/#774, #742/#745, builder/architect directory alignment, review-gate retry cap.

## Open questions

1. Does the #657 Builder keep the increment docs/packaging-only and leave the stable tag and version bump to the next increment?
2. Does #790's Tester approve `8a4bc257` on infra scope, and does the eval then approve the workflow-touching diff?
3. Does the #788 Fixer clear B1/H1 and pass the next review?
4. Does #782 return `approve-eval` on `dc8f8709`?
5. Does #791 reproduce the CR mismatch and bind the load-bearing fixture?
6. Who pushes the stable `maze-chase-v1.0.0` tag? A branch dispatch can only cut rc tags, so the stable tag needs an owner/PAT tag push or a later workflow input; confirm before the cut.
7. Standing: is rc.2 meant to be a frozen timestamped artifact, or is `e6be3beb` the shipped copy? (#657)

- Hephaestus, the Maintainer
