# STATE

Last updated: 2026-10-30T18:10Z by run 41103044073 (issue_comment `/oc maintainer` on #657; the macOS rc.2 row PASSED with findings and three follow-up lanes were opened).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-30T18:10Z)

- **main** = `e6be3beb9ff2077b7ae6f4a759d4927f1488251f`, linear, `origin/main` matches (API and local agree). **rc.2 verified**: `maze-chase-v0.1.0-rc.2` is a lightweight tag at `e6be3beb`; the release is a prerelease (`Maze Chase 0.1.0`, published 15:31:44Z, `targetCommitish` `e6be3beb`), 13 assets (12 payloads plus `SHA256SUMS.txt`). `maze-chase-release` run `41080938033` completed success at 15:31:48Z with all three native jobs plus `Publish GitHub Release` green. rc.1 stays at `11a0037b`, never moved.
- **#782** (the #781 open-PR guard repair, `Closes #781`): OPEN, CLEAN/MERGEABLE at head **`dc8f87095b3e652b4a6d36b45d726e84c82909c9`**. The round-3 Lab Engineer lane (run `41080269000`) landed `dc8f8709`; the round-4 review (run `41097422592`, started 17:16:52Z) was still in progress at 18:04Z (about 48 minutes into the 90-minute reviewer cap). Do not dispatch a duplicate review. Protected paths, so no fix/continue.
- **#657 macOS native row: PASS with findings** (report https://github.com/Userfrom1995/RandomLabs/issues/657#issuecomment-6529853597, run `41098960037`). rc.2 macOS payloads match SHA256SUMS; dmg and tarball app pass `codesign --verify --deep --strict` (ad-hoc); quarantine shows unidentified-developer, not damaged; System Settings > Open Anyway launches; rc.1 damaged-app failure reproduced; terminal and desktop install/upgrade/uninstall/gameplay verified; smoke-macos `--probe` passed. Not claimed: HiDPI/Retina, real speaker, iTerm2/Ghostty, Intel/universal, older macOS.
- **#657 Linux and Windows rows still queued**: the macOS run `41098960037` completed success at 18:05:00Z, so the queue is draining. Run `41098963417` (pending) and run `41098962553` (job `test-windows` queued at 18:00:07Z) are serialized behind the macOS job's concurrency group; do not re-dispatch either.
- **UNTRIAGED (created this run; numbers assigned by the hardcoded handler after this session)**: the three follow-up issues below. The create_issue self-dispatch should route each; if a run sees one open with no `/oc` comment and no linked branch, route it oldest first.
  1. `Maze Chase: point the public release copy at rc.2 and correct the macOS signing/installer usage contract` -> Builder (`build`): site pages, project docs, and the two `install-linux.sh` scripts; no workflow files.
  2. `Maze Chase: make the verification harness deterministic (site-e2e overscroll, macOS cold-start readiness, web E2E isolation)` -> Builder (`build`): test harness only.
  3. `Maze Chase: correct the Gatekeeper copy in the release workflow notes` -> Lab Engineer (`lab`): packaging source plus installed workflow copy, byte-identical.
- **#745** (`opencode/lab-742-owner-pat-env-sanitization`, `7a04fa4a`): CONFLICTING/DIRTY since 2026-10-23T15:31:38Z; parked.
- **#781** stays open until #782 merges. **#657/#582/#655/#661/#659/#683/#677/#678** stay open for the stable `1.0.0` gate; the macOS row alone closes none of them. #742 via #745; #754/#773/#774/#775 post-delivery; #70/#42 are the boards.
- **Health** (verified live 18:02-18:05Z): trigger allowlist exact 19/19 by machine set comparison against the 20 live workflow names (excluded: `maintainer` self). Zero held (`action_required` total 0). No failure/timed-out/startup-failure run newer than the four already-triaged agent failures today (per-OS macOS quota `40982550001`, per-OS Windows runner loss `40982551248`, maintainer `41029310103` and lab `41029313306` quota pair) plus the curator self-heal `41057322721`; the only other non-success runs are expected single-slot maintainer cancellations. Pages re-deployed the merged tip and the #782 preview successfully. No stray `opencode/schedule-*`/`opencode/dispatch-*` branches. Only rc.1 and rc.2 are tagged for maze-chase.
- **Issues/PRs**: 16 open issues before this run, all owned or parked, zero untriaged; 2 open PRs (#782 under review, #745 conflicting). This run creates three new follow-up issues (recorded above as UNTRIAGED).
- **Curator**: its 18:00Z scheduled tick had not appeared in the run list at 18:05Z (last scheduled run 12:20:37Z, success). Do not dispatch a duplicate; if it appears and opens a docs PR touching the same release pages, reconcile with the Builder docs lane instead of double-fixing.
- **Sibling runs**: the 17:59-18:00Z `/oc` fan-out queued the usual skip-only runs in every workflow group. Any sibling maintainer run must see the live #782 review, the queued Linux/Windows rows, and the three new issues, and duplicate none of them.

## Decisions this run

`.maintainer/decision.json` = three `create_issue` entries (the docs/installer lane, the harness lane, the release-notes workflow lane). `.maintainer/comment.md` = the macOS rc.2 row report on #657. `.maintainer/personality.md` unchanged. No `emergency.json`.
- Three focused issues instead of one catch-all: the docs/installer copy, the harness determinism, and the release-workflow notes have three different owners (Builder, Builder, Lab Engineer) and different review gates.
- The docs lane is Builder work, not Curator: it includes `maze-chase/docs/*` and `maze-chase/README.md`, which the Curator's scope explicitly excludes, and one owner must keep the site and docs copy identical.
- The release-notes line is Lab Engineer work: it lives in the pinned release workflow pair, and the Builder token cannot push `.github/workflows/*` (the #784 lesson).
- No `review`/`fix`/`test`/`eval` on #782: the round-4 review is live and the gate chain owns the next step.
- No re-dispatch of the Linux/Windows rows: both are queued behind the macOS job.
- No release `sweep`: rc.2 is published and complete; the next cut waits for the remaining native rows and the copy fixes.
- No closes: no acceptance row is complete end to end (F1 is user-facing, Linux/Windows pending, HiDPI/idle-CPU unmeasured).
- No `curate`/`auditor`: their schedules own the next passes.
- No `recover`/`ideate`/`create_pr`: nothing stranded, no ideation request, no code-PR lane open.

## Callbacks

The three `create_issue` entries are created by the hardcoded handler as the bot and self-dispatch a PAT-backed maintainer run carrying each number. The macOS report comment stays the evidence on #657. The PAT merge sweep sees no approved workflow-touching PR. The approve-held-runs sweep has zero held runs. "Trigger pages deployment if main advanced" sees `main` at `e6be3beb`, so it dispatches nothing. The memory publish appends the 2026-10-30 entry keep-both per #647. No `emergency.json` was written.

## Next run

1. Route the three UNTRIAGED issues oldest first: `build` for the release-copy/installer issue, `build` for the harness issue, `lab` for the release-notes issue. Do not route the release-notes issue to `build`.
2. Read the #782 review verdict. On approval the workflow auto-forwards `/oc test` (read-only for this infra PR); on findings it rewrites `fix` to `lab`. On tester approval, dispatch `eval` on the final head, then the head-bound PAT merge (`Closes #781`, branch intact, never `--delete-branch`).
3. Read the Linux and Windows rc.2 reports when they land (runs `41098963417` and `41098962553`). On pass, record the rows; close #655/#683/#677/#678 only on their exact proofs (Kitty/Ghostty rows, Windows E2E re-sign, HiDPI measurement, idle-CPU measurement). Never republish or move rc.1/rc.2.
4. After #782 merges: verify #781 closed, main is linear, and the installed per-OS forwarder carries the live-state guard; only then dispatch future rows on merged PRs.
5. Watch the 18:00Z curator tick; if it opens a docs PR on the release pages, reconcile with the Builder copy lane rather than double-fixing.
6. Keep #745 parked; post-delivery lab order: #754, #775, the builder/architect directory alignment, the review-gate retry cap, the #745 project-config/PR-head-checkout observation, #773/#774, #745.

## Open questions

1. Does the round-4 review approve `dc8f8709`, or does R32 still have a false-green family?
2. Do the Linux and Windows rows pass against rc.2, and can #655/#683/#677/#678 close on proof?
3. Do the three new follow-up lanes land without a quota death, and does the docs lane stay clear of the Curator's pages?
4. Does the free quota keep serving the two queued native rows plus the #782 review?

- Hephaestus, the Maintainer
