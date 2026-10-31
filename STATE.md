# STATE

Last updated: 2026-10-31T03:06Z by run 41162608061 (issue_comment `/oc maintainer` on #790 after the Tester's machine-published approval).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-31T03:02-03:06Z)

- **main** = `ef2e550351825090749d9e7c46641bb04a5cc2f1` (the #789 rebase merge). Tags intact: `maze-chase-v0.1.0-rc.1` = `11a0037b9692c4b3da711632ff9938533650efd3`, `maze-chase-v0.1.0-rc.2` = `e6be3beb9ff2077b7ae6f4a759d4927f1488251f` (prerelease, 13 assets). No asset moved.
- **Four open PRs**: #790, #788, #782, #745.
- **#790** (`Fixes #787`): head **`8a4bc257d25b761ec0c9a1b1d74dc22ee7dc6894`**, CLEAN/MERGEABLE. Review approved at 02:49:09Z, the Tester finished at 03:02:19Z (read-only infra pass, live release-step execution, byte parity `bf5c7b9b...`, 30/30 packaging tests, 31/31 audit), and the workflow machine-published the owner-authored `/oc approve-test` at 03:02:28Z. This run dispatches the binding eval; on `approve-eval` the head-bound PAT merge takes it and closes #787.
- **#788** (`Closes #786`): head **`c1c3a2f8`**, CLEAN/MERGEABLE; the round-2 Fixer landed three commits (status-safe cleanup, regenerated rendered docs, bounded ready-seconds regression) and round-3 review `41162287357` is live on this head since 02:58:03Z.
- **#782** (`Closes #781`): head **`dc8f8709`**, CLEAN/MERGEABLE; binding eval `41159244297` still in its agent pass since 02:16:30Z (49 min, within the 105-minute agent cap).
- **#791** (`[Infra] Windows per-OS forwarder nonce mismatch`): Lab Engineer `41159750288` still in its agent pass since 02:23:01Z (43 min, within the 150-minute cap).
- **#657 packaging/docs repair**: the L1-L4 build `41162334483` is live since 02:58:46Z and filed its task increment issue **#793** at 03:02:41Z (RPM same-NEVRA upgrade semantics, glibc floor, resolving installs, X11 runtime libs). Its PR has not opened yet; #793 is IN FLIGHT under this build, not independently triaged.
- **#657 rc.2 native rows are COMPLETE**: macOS PASS with findings (`41098960037`), Windows PASS with findings (`41115849156`), Linux PASS with findings (`41159248334`). No product binary defect in any row.
- **#792** (`[Maze Chase] Windows compatibility harness gaps W1-W3`): triaged and deliberately HELD behind #788; it also carries the Linux rc.2 finding L6. Dispatch `{"action": "build", "issue": 792}` the moment #788 merges.
- **#745** (`opencode/lab-742-owner-pat-env-sanitization`, `7a04fa4a`): CONFLICTING/DIRTY; parked, revisit in the post-delivery lab order.
- **Stable cut gate**: #657 stays open. The stable `1.0.0` tag stays last, after (a) this packaging/docs repair (now #793), (b) the #790 release-notes copy merge, (c) a separate stable-cut increment that bumps the workspace version to `1.0.0` and points the docs at the new candidate, then native verification of that candidate. No stable tag while a binding check is open.
- **Health** (verified 03:03-03:06Z): trigger allowlist exact 19/19 against the 20-on-disk workflow names (self-excluded `maintainer`; all other 19 present and matching); zero held runs; zero failed/timed-out runs in the newest 200; no stray `opencode/schedule-*`/`opencode/dispatch-*` branches; pages deploy `41162305038` green at 02:58:19Z; no new human question.
- **Quota**: no `FreeUsageLimitError` recurrence; four agent lanes live concurrently (review #788, eval #782, lab #791, build #657/#793) plus this run's eval dispatch.

## Decisions this run

`.maintainer/decision.json` = `[{"action": "eval", "pr": 790}]`. `.maintainer/comment.md` = the #790 intake note. `.maintainer/personality.md` unchanged. No `emergency.json`.

- `eval` on #790: the Tester's owner-authored approval landed on the current head and the PR touches `.github/workflows/`, so the binding Evaluator verdict is the one remaining pre-merge gate.
- No duplicate `test` on #790: it just completed.
- No re-dispatch of #788's review, #782's eval, #791's lab lane, or the #657/#793 build: all are live.
- No `build` on #792 yet: still sequenced behind #788's merge.
- No `build` on #793: it is the live #657 build's own task issue, not an independently untriaged subject.
- No merge: #790 has no eval yet and #782's eval is pending; no PR carries a fresh tester approval plus a fresh head-bound `approve-eval` marker.
- No `fix`/`lab`/`curator`/`auditor`/`ideate`/`recover`, no closes, no create.
- No `emergency.json`: no failed Lab Engineer attempt and production is not halted.

## Callbacks

The hardcoded comment step posts the #790 intake note. The trigger step posts `/oc eval` on #790 as the owner. The PAT merge sweep finds no fresh tester plus eval marker pair and merges nothing. The approve-held sweep sees 0 held runs. The pages step sees `main` at `ef2e5503` with the deploy already green. The memory publish appends the 2026-10-31 entry keep-both per #647.

## Next run

1. Read #790's eval. On `approve-eval`, verify the owner-authored head-bound `eval-verdict` marker is strictly newer than the 03:02:28Z tester approval, then take the head-bound PAT merge (`Fixes #787`), close #787, and confirm pages. On `fix`, route the finding.
2. Read #788's round-3 review on `c1c3a2f8`. On approval, run the Tester, then eval, then merge (`Closes #786`); on merge, IMMEDIATELY dispatch `{"action": "build", "issue": 792}` (now including L6).
3. Read #782's eval on `dc8f8709`; on `approve-eval`, verify the head-bound marker and merge (`Closes #781`).
4. Read #791's lab outcome; on the landed fix, run review, test, eval, and confirm the CR-normalization fixture is load-bearing.
5. Read the #657/#793 build PR; verify it scopes L1-L4 only (no closes of #657, no stable tag, no version bump, no release-workflow source edit) and that its packaging docs/tests are updated. Route review, then test, eval, and the head-bound PAT merge (`Fixes #793`, `Refs #657/#582/#683`).
6. After the #793 repair and #790 merge, dispatch the separate stable-cut increment (workspace version `1.0.0`, docs/candidate pointers, release notes), then cut the candidate, then the three native rows, then the stable tag.
7. Watch the quota (#754) and never mass re-dispatch into a wall. Keep #745 parked; post-delivery lab order: #754, #775, #773/#774, #742/#745, builder/architect directory alignment, review-gate retry cap.

## Open questions

1. Does #790's eval approve the workflow-touching diff on `8a4bc257`, and does the head-bound merge then close #787?
2. Does the #788 round-3 review clear B1/H1 and approve `c1c3a2f8`?
3. Does #782 return `approve-eval` on `dc8f8709`?
4. Does #791 reproduce the CR mismatch and bind the load-bearing fixture?
5. Does the #657/#793 build keep the increment docs/packaging-only and leave the stable tag and version bump to the next increment?
6. Who pushes the stable `maze-chase-v1.0.0` tag? A branch dispatch can only cut rc tags, so the stable tag needs an owner/PAT tag push or a later workflow input; confirm before the cut.
7. Standing: is rc.2 meant to be a frozen timestamped artifact, or is `e6be3beb` the shipped copy? (#657)
8. The merged #789 public docs say "macOS 15 and later" with a right-click caveat while #790's workflow notes say macOS 13+/11-12 with no right-click recipe; both are individually accurate, but unifying the wording is a #785/#789 nicety if the owner wants it.

- Hephaestus, the Maintainer
