# STATE

Last updated: 2026-10-22T20:15Z by the maintainer run 39845894092 (the `/oc maintainer` wake on #745 at 20:06:06, forwarded by the rebase lab round; fresh survey 20:06-20:15Z).

## Who I am

I am Hephaestus, the Maintainer of this lab: Chief Orchestrator, in the line of Mae (repository inception through 2026-08-27). Quality is the only deadline. I do not post `/oc` triggers myself, I do not push code to `main`, and I do not edit my own prompt or workflow. I survey fresh every run, and I only record what I verified.

## Right now

- **#743 P0 - SECOND-ROUND FIX IN FLIGHT, ROOT CAUSE PROVEN AGAIN LIVE**: the #746 `issues: write` restore is incomplete on PR threads. Review runs 39843594629 and 39843603743 (19:50Z) and 39845873553 (20:06Z) all ran with `Issues: write` + `PullRequests: read` and were rejected at `POST /repos/.../issues/comments/<id>/reactions` (403) and `POST /repos/.../issues/<pr>/comments` (403) before any model call. PR comment/reaction writes authorize against the pull-request resource, so the four gated lanes need `pull-requests: write` (the pre-#716 working review run 39801423426 carried it). The second-round lab round is live (39845527206, started 20:03:42) with duplicate owner triggers queued (39845667837, plus a duplicate rebase round 39843606603 on #745). The repair PR will again need an owner manual merge because the lanes it repairs cannot gate it before merge.
- **#745 (owner-PAT hardening, `Refs #742`) - REBASED, RENUMBERED R32, INDEPENDENTLY VALIDATED**: head `f85ab72d0cab6155830defde168f2407c448ed96` (single squashed `lab:` commit, parent `048e0145`), MERGEABLE/CLEAN, remote tip verified. The CLI wrapper's non-fast-forward push at 20:05:47 was expected noise; the hardcoded PAT step force-pushed `28866af7..f85ab72d` at 20:05:56. Verified on this exact head: `silent-stall-audit.sh` 32 passed / 0 failed (R1-R32: main's R31 bootstrap rule plus this PR's R32 owner-PAT rule), an independent scan finds 75 owner-PAT steps each with the isolation map and the exact builtins-only `BASH_FUNC_*` preamble, 20 workflow/action YAMLs parse under `python3 -I`, `git diff --check` clean, and the redundant `issues: read -> write` lane hunks are gone (lane files show only the preamble/head-check additions). The duplicate rebase round 39843606603 completed success at 20:16:12Z without moving the head and refreshed the PR body at 20:15:21Z, so body and head now agree (R31 + R32, 75 steps). Waiting on the #743 second-round fix; then a fresh head-bound review, the read-only infra Tester, a fresh Council, and the PAT sweep.
- **#741 (Phase 6 release engineering, `Refs #582`, `Refs #657`) - WAITING**: head `5d82c7bf6b0a146ce9777d05ad3855ade15c76d4`, MERGEABLE/CLEAN, unchanged since 16:32:44Z. Its review budget is spent on the 403 class. After the #743 fix lands: one fresh head-bound review at this exact head, then Tester plus per-OS, Quality Council, and the PAT merge with the eval marker. After merge: `lab` installs the release workflow and cuts `maze-chase-v0.1.0-rc.1`; keep #657 open for native macOS/Windows staging evidence and verify #676/#677/#678/#683 against the merged tree before closing any.
- **Concurrency**: this run is the `/oc maintainer` wake 39845894092. Sibling maintainer wake-ups from the 20:06 review failure (39845945845 in progress, 39845973027 pending) survey the same state; they must not add a third lab trigger on #743. The duplicate lab runs are serialized by the per-issue group.
- **#742 issue** stays open until #745 merges; **#743 issue** stays open until all four lanes prove a live session after the `pull-requests: write` fix.

## Health (verified 20:06-20:15Z)

- Main tip `048e0145b4615e464a2f383f850ad98dba3706df`; #741 and #745 remote tips verified at survey time.
- Open PRs: #745 (CLEAN, rebased, awaiting the lane fix) and #741 (CLEAN, awaiting the lane fix). 13 open issues, all mapped (#743, #742, the Maze Chase set #683/#678/#677/#676/#661/#660/#659/#657/#655/#582, boards #70/#42); zero untriaged.
- Runs since 19:00Z: exactly three failures, all `opencode-review` and all the #743 403 class (39843594629, 39843603743, 39845873553); none after 20:06:28Z. Zero `timed_out`/`startup_failure`; zero held `action_required` runs repo-wide.
- Trigger allowlist in `maintainer.yml` is exact: the 18 repo-defined non-maintainer workflow names match item-for-item (19 live names minus `maintainer`).
- Last 12 closed PRs all merged; no closed-unmerged work needs recovery; no retired `opencode/schedule-*` / `opencode/dispatch-*` branch exists.
- Root, `/preview/pr-745/`, and `/preview/pr-741/` all HTTP 200; the #745 preview redeployed on `f85ab72d` (run 39845874493, success).
- Model pins unchanged: `opencode/deepseek-v4.1-flash-free` in `opencode.json` (`model`, `small_model`), `REQUESTED_MODEL` in `maintainer.yml`, and all three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) present and free in the live registry (unprefixed ids).
- Workspace trust anchor: the CLI bootstrap left HEAD on the PR branch `opencode/lab-742-owner-pat-env-sanitization` at `f85ab72d`; the staged prompt at `${RUNNER_TEMP}/lab-prompts/maintainer.md` remains authoritative, and main truth was read via `gh api`/`git ls-remote`.

## Decisions this run

- `decision.json = []`: no dispatch. The #743 second-round lab fix is already in flight, and a review/test/eval on #745 or #741 would reproduce the same bootstrap 403; nothing is merge-ready.
- One public comment via `comment.md` on the run target #745: the verified rebase head and its validation, the exact 403 proof from review run 39845873553, the in-flight fix, and the post-fix queue.

## Watch list

- #743: the second-round lab PR (`pull-requests: write` on the four PR-targeted lanes, R31 model correction). Owner manual merge needed again. After it lands, the first live review is the proof point.
- #745: re-verify the head after the duplicate rebase round settles; then a fresh head-bound review, the read-only infra Tester, a fresh Council, and the PAT sweep.
- #741: the fresh head-bound review after the fix; then Tester plus per-OS, Council, PAT merge with the eval marker; after merge, the release workflow and the rc.1 cut, #657 open.
- #742: close after #745 merges. #743: close only after the review, test, eval, and per-OS lanes each prove a live session.
- Duplicate lab triggers: no third trigger; the per-issue group serializes.
- Recurrence watches: #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes; the #616/#637 publication gate; the Pages preview zero-job class; the Pages-dispatch false positive; #655 per-OS rows; the test-cap pattern.
- Deferred: the maintainer wake-displacement finding (a skip-only run displacing a real `/oc maintainer` wake under the single pending slot), for a lab dispatch once the P0 lane is calm.

## Next steps

1. **#743**: read the second-round lab PR; verify `pull-requests: write` at the four lanes, the R31 model correction and mutation self-test, and a green audit; the owner merges it manually.
2. **#745**: after the fix lands, re-verify the head (the duplicate round may have moved it), then dispatch ONE fresh head-bound review; then the read-only infra Tester, a fresh Council, and the PAT sweep.
3. **#741**: after the fix lands, one fresh head-bound review at `5d82c7bf`; then Tester plus per-OS, Council, the PAT merge with the eval marker, the release-workflow lab dispatch, and the rc.1 cut, keeping #657 open.
4. **#743 closure**: record the live proof per lane; close only when all four have demonstrated a session.
5. **#742**: close after #745 merges.

## Pointers

- This run's log entry: `logs/2026-10-22.md`, run 39845894092.
- The binding rules: `.github/agents/maintainer.md` (this run) and `AGENTS.md`.
- Trusted surfaces: `.github/scripts/silent-stall-audit.sh` (R1-R32), `.github/scripts/publish-eval-marker.sh`, the PAT sweep in `maintainer.yml`, and `.github/actions/opencode-run/`.
- The #716 Council verdict: #716 comments 6345926245 and 6345928384, eval run 39809774877.
