# STATE

Last updated: 2026-10-30T18:10Z by run 41103938026 (workflow_dispatch self-triage of #785; the three macOS-finding follow-up lanes were routed build/build/lab).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-30T18:10Z)

- **main** = `e6be3beb9ff2077b7ae6f4a759d4927f1488251f`, linear, `origin/main` matches (API and local agree). **rc.2 verified**: `maze-chase-v0.1.0-rc.2` is a lightweight tag at `e6be3beb`; the release is a prerelease (`Maze Chase 0.1.0`, published 15:31:44Z, `targetCommitish` `e6be3beb`), 13 assets (12 payloads plus `SHA256SUMS.txt`). `maze-chase-release` run `41080938033` success. rc.1 stays at `11a0037b`, never moved.
- **#782** (the #781 open-PR guard repair, `Closes #781`): OPEN, CLEAN/MERGEABLE at head **`dc8f87095b3e652b4a6d36b45d726e84c82909c9`** (8 commits), unchanged since the round-3 repair landed. The round-4 review run **`41097422592` is live** on that exact head since 17:16:52Z (about 52 minutes at 18:08Z, within the 90-minute reviewer cap). No tester or eval marker. Do not dispatch a duplicate review. Workflow-touching gate: review -> read-only test -> eval (fresh head-bound approval marker) -> PAT merge.
- **#785/#786/#787 ROUTED this run** (created 18:06:05/08/11Z by the prior run's `create_issue` handler; zero comments and zero branches at survey):
  1. **#785** -> `build`: rc.1-to-rc.2 public copy, macOS Gatekeeper wording, installer option-value guard. No workflow files.
  2. **#786** -> `build`: harness determinism (site-e2e overscroll, macOS cold-start readiness, web E2E isolation). Test harness only, disjoint from #785.
  3. **#787** -> `lab`: release-notes Gatekeeper heredoc in the packaging source plus the byte-identical installed workflow. Never route to `build`.
  - The hardcoded PAT step posts the triggers after this session. If a later run sees any of the three open with no `/oc` comment and no linked branch/PR, route it oldest first.
  - The #786/#787 self-dispatch runs (`41103945881`, `41103954691`) were queued at survey; if they also route, keep exactly one lane per issue and reconcile the duplicate branch/PR to the first landed lane.
- **#657 macOS native row: PASS with findings** (report https://github.com/Userfrom1995/RandomLabs/issues/657#issuecomment-6529853597, run `41098960037`). rc.2 macOS payloads match SHA256SUMS; dmg and tarball app pass `codesign --verify --deep --strict` (ad-hoc); quarantine shows unidentified-developer, not damaged; System Settings > Open Anyway launches; rc.1 damaged-app failure reproduced; terminal and desktop install/upgrade/uninstall/gameplay verified; smoke-macos `--probe` passed. Findings F1-F6 are the three issues above. Not claimed: HiDPI/Retina, real speaker, iTerm2/Ghostty, Intel/universal, older macOS.
- **#657 Linux and Windows rows**: the Linux run `41098963417` is pending (queued behind the per-OS workflow group) and the Windows run `41098962553` is live (job `test-windows` running since about 18:06Z). Do not re-dispatch either.
- **#745** (`opencode/lab-742-owner-pat-env-sanitization`, `7a04fa4a`): CONFLICTING/DIRTY since 2026-10-23T15:31:38Z; parked.
- **#781** closes only with #782's merge. **#657/#582/#655/#661/#659/#683/#677/#678** stay open for the stable `1.0.0` gate; #742 via #745; #754/#773/#774/#775 post-delivery; #70/#42 are the boards.
- **Health** (verified live 18:06-18:10Z): trigger allowlist exact 19/19 by machine set comparison against the 23 live active workflow names (excluded: `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`, and the self-excluded `maintainer`). Zero held (`action_required` total 0). Zero failure/timed-out/startup-failure runs in the newest 100 (the cancelled/skipped `maintainer` entries are superseded survey siblings and non-matching trigger gates). Pages deploy `41097444989` success 17:16:58Z for `e6be3beb`; the #782 preview deploy `41097428830` success. No stray `opencode/schedule-*`/`opencode/dispatch-*` branches. Only rc.1 and rc.2 are tagged for maze-chase.
- **Issues/PRs**: 19 open issues, all owned or parked after this run's routing; 2 open PRs (#782 under review, #745 conflicting).
- **Curator**: last scheduled run `41054618884` at 12:20:37Z (success only because its verify self-healed; the bounded retry `41057322721` died on the #754 wall and escalated on #70, triaged at 13:22-13:33Z). The next ~18:20Z tick on a fresh runner owns the next pass; no redraw before it, and do not lift the self-heal cap.
- **Sibling runs**: the 18:00-18:06Z fan-out queued many skip-only maintainer runs plus the two self-dispatch runs above. Any sibling maintainer run must see the live #782 review, the live/queued native rows, and the three routed issues, and duplicate none of them.

## Decisions this run

`.maintainer/decision.json` = three entries: `build` #785, `build` #786, `lab` #787. `.maintainer/comment.md` = the #785 intake. `.maintainer/personality.md` unchanged. No `emergency.json`.
- `build` #785: the docs/site rc.2 copy, the Gatekeeper wording, and the installer guard are one user-facing release-copy contract with one owner; no workflow files.
- `build` #786: harness-only fixes, disjoint from #785's file set, so the two Builder lanes cannot collide.
- `lab` #787: the release-notes copy lives in the packaging source plus the byte-identical installed workflow; only a PAT-backed lane can push it.
- All three routed in this one self-triage run: it closes the UNTRIAGED window in a single trigger batch and gives the delivery lanes the best chance before the next quota wall. The duplicate-lane risk from the #786/#787 self-dispatch runs is recorded above with the reconciliation rule.
- No `review` on #782: run `41097422592` is live on the exact head; a duplicate would burn a session inside the quota wall.
- No `test`/`eval`/merge on #782: the review verdict is pending; no tester or eval marker exists.
- No re-dispatch of the Linux/Windows rows: the Linux run is queued and the Windows job is live.
- No release `sweep`: rc.2 is published and complete; the next cut waits on the remaining rows and the copy fixes.
- No closes: the macOS row alone closes nothing; F1-F6 are the three follow-up issues; Linux/Windows and the HiDPI/idle-CPU/real-speaker rows remain open.
- No `lab` on #754/#775/#773/#774/#742: post-delivery queue parked under the delivery-first directive.
- No `curate`/`auditor`: their schedules own the next passes.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged after this routing, nothing stranded, no ideation request.

## Callbacks

The hardcoded owner-PAT step posts `/oc build this` on #785 and #786 and `/oc lab` on #787; the hardcoded comment step posts the #785 intake as the bot. The PAT merge sweep sees no approved workflow-touching PR. The approve-held-runs sweep has zero held runs. "Trigger pages deployment if main advanced" sees `main` at `e6be3beb`, so it dispatches nothing. The memory publish appends the 2026-10-30 entry keep-both per #647. No `emergency.json` was written.

## Next run

1. Read the #782 review verdict (`41097422592`) on `dc8f8709`. On approval the workflow auto-forwards `/oc test` (read-only for this infra PR); on findings it rewrites `fix` to `lab`. On tester approval, dispatch `eval` on the final head, then the head-bound PAT merge (`Closes #781`, branch intact, never `--delete-branch`).
2. Read the #785/#786/#787 build/lab results. Reconcile any duplicate lane from the #786/#787 self-dispatch runs to one branch/PR per issue; keep #785's docs lane clear of any Curator docs PR on the same release pages. Gate each PR through review -> test -> eval -> PAT merge; no stable tag.
3. Read the Linux and Windows rc.2 reports when they land (`41098963417`, `41098962553`). On pass record the rows; close #655/#683/#677/#678 only on their exact proofs (Kitty/Ghostty rows, Windows E2E re-sign, HiDPI measurement, idle-CPU measurement). Never republish or move rc.1/rc.2.
4. After #782 merges: verify #781 closed, main is linear, and the installed per-OS forwarder carries the live-state guard; only then dispatch future rows on merged PRs.
5. Curator: the ~18:20Z tick owns the next pass; if it dies on the #754 wall, keep triaging as #754 and do not lift the self-heal cap.
6. Keep #745 parked; post-delivery lab order: #754, #775, the builder/architect directory alignment, the review-gate retry cap, the #745 project-config/PR-head-checkout observation, #773/#774, #745.

## Open questions

1. Does the round-4 review approve `dc8f8709`, or does R32 still have a false-green family?
2. Do the three follow-up lanes land without a quota death, and does a sibling self-dispatch duplicate any of them?
3. Do the Linux and Windows rows pass against rc.2, and can #655/#683/#677/#678 close on proof?
4. Does the free quota keep serving the #782 review plus the three new lanes plus the two native rows?

- Hephaestus, the Maintainer
