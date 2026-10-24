# STATE

Last updated: 2026-10-24T16:19Z by run 40110546337 (wake from the general arm's `/oc maintainer` handoff on #757; ZERO dispatch - both live lanes already own the allowance).

## Who I am

I am Hephaestus, the Maintainer of this lab: Chief Orchestrator, in the line of Mae (repository inception through 2026-08-27). Quality is the only deadline. I do not post triggers myself, I do not push code to `main`, and I do not edit my own prompt or workflow. I survey fresh every run, and I only record what I verified.

## Right now

- **#757 (Curator root-README alias fix, `Fixes #756`) - HEAD ADVANCED BY THE TESTER, TEST RUN LIVE.** Head `d238283176287deb7c27a5306ab1779f6497b582` (the Tester's test-only commit at 16:15:21Z: "tester: add regression tests for the README /oc plan trigger alias"), up from the reviewed `1824ca99`. Test run 40110388545 (started 16:11:18Z) is still in progress. MERGEABLE/UNSTABLE; GitGuardian SUCCESS; the Tester push's `opencode-pr-trigger` and `Deploy static site to GitHub Pages` runs are `action_required` at 16:15:39Z (the workflow's hardcoded approve step sweeps them). The review approved `1824ca99`; the only delta since is the Tester's test commit (same pattern as #741's `fb7ebf5f`). No comment after 16:15:01Z. Nothing merge-ready: no Tester approval yet.
- **#741 (Phase 6 release engineering, `Refs #582`, `Refs #657`) - COUNCIL RUN LIVE ON THE APPROVED HEAD.** Head `fb7ebf5f1727c6768798c9ce520eed65015db4c8` unchanged, baseline `e73bd7a2`, MERGEABLE/CLEAN. Eval run 40110681717 (created 16:15:06Z by the owner-PAT trigger posted by run 40110129621) is in progress inside `Run evaluator agent`. The review approved `ae064dd6` at 04:51:25Z; the only delta to the current head is the Tester's test-only commit `fb7ebf5f`, and the Tester approved that head (report 6381014360 at 06:40:04Z, owner-authored marker 6381014633 at 06:40:06Z). Only the binding Council verdict is missing.
- **#745 (owner-PAT hardening, `Refs #742`) - UNCHANGED AND STILL CONFLICTING.** Head `7a04fa4a96e1982ac307ca40973fed29379def0b`, CONFLICTING/DIRTY against `main` `2275caa6` (conflicts in `.github/scripts/silent-stall-audit.sh` and `AGENTS.md` from the #755 merge). Last comment 2026-10-23T15:31:38Z. Protected-path work, so only the Lab Engineer can rebase it, and only after Phase 6 delivery under the owner's no-churn directive.
- **#754 (FreeUsageLimitError class) - TRIAGED AND PARKED**: remains the first post-delivery infrastructure dispatch with the ninth-death evidence (the 54-minute cost of two 600s watchdog stalls after a terminal quota line).
- **#756 (Curator tracking issue) - NEW, linked by #757 with `Fixes`.** Opened 2026-10-24T16:06:39Z; it closes automatically when #757 merges. No separate dispatch needed.
- **Issues / PRs**: 16 open issues, all mapped (the #582 sub-issue tree plus the parked infra and health boards, now plus #756), zero untriaged. Open PRs are #757, #741, #745; no human or fork PR. **Recovery**: none needed; no retired `opencode/schedule-*` / `opencode/dispatch-*` branch and no `recover/*` branch exists on the remote.
- **Comments since 14:23Z**: the owner's `/oc review` 6386435286 and `/oc maintainer` 6386436824 on #757, the bot preview comment, the Reviewer's signed report 6386472350, the forward `/oc test` 6386472803, the general arm's false-activation summary at 16:13:11Z, the general workflow's owner-PAT `/oc maintainer` forward at 16:13:17Z, run 40110129621's decision line at 16:14:49Z and status note at 16:15:01Z, and its owner-PAT `/oc eval` trigger on #741 at 16:15:03Z. Zero human comments after 16:07:53Z; the owner's previous delivery directive remains the 2026-10-23T06:01:42Z message on #741 (comment 6358553065).
- **Health (16:16-16:18Z)**: no new failure since the known 08:06 eval quota death; the only held `action_required` runs are the two fresh 16:15:39Z runs from the Tester push on #757 (handled by the hardcoded approve step); the four stale queued entries are unchanged (2026-09-25 maintainer/Pages/opencode-pr-trigger on the dead `opencode/lab-427-actor-permission-preflight` and 2026-10-05 opencode-pr-trigger on `opencode/issue532-20261005154527`; harmless and outside the Maintainer's documented cancellation powers). Trigger allowlist exact 18/18 item-for-item against the live non-maintainer workflow names (`auditor`, `Deploy static site to GitHub Pages`, `Lab Engineer`, `opencode-review`, `opencode-pr-trigger`, `opencode-test`, `opencode-peros-test`, `ideate`, `opencode`, `opencode-recover`, `poolduel-m1`, `poolduel-m2`, `poolduel-m9`, `poolduel-m10-soak`, `curator`, `opencode-eval`, `tor-cli`, `pet-release`; the GitHub-managed `Dependabot Updates`, `Dependency Graph`, and `pages-build-deployment` are correctly absent, and `maintainer` is self-excluded). Registry at 16:12Z: 85 models, 8 free; all three ladder rungs (`deepseek-v4.1-flash-free`, `mimo-v2.6-flash-free`, `glm-5.3-flash-free`) live and free; the pins remain (`model`, `small_model`, and the inline `REQUESTED_MODEL` all on `opencode/deepseek-v4.1-flash-free`).
- **Workspace (verified)**: PR #757 head checkout `1824ca99` on branch `opencode/issue756-curate-plan-trigger`, tree clean, `.maintainer/` gitignored. The staged `RUNNER_TEMP` prompt (from the trusted default-branch commit) is the authoritative edition.
- **The owner's delivery directive still governs**: #741 comment 6358553065 at 2026-10-23T06:01:42Z (delivery first; stop unnecessary restructuring; avoid lab infrastructure changes unless genuinely necessary to unblock). The owner's #757 comments are the newest human directive and re-opened the lane.

## Decisions this run

- `.maintainer/decision.json`: exactly `[]`. `.maintainer/comment.md`: empty (run 40110129621 already posted the #757 status note at 16:15:01Z; a second note would be noise). `.maintainer/personality.md`: empty.
- No `eval` on #757: the Tester has not approved; test run 40110388545 is live on the auto-forwarded lane. When it approves, the eval must run on the new head `d2382831`, not the reviewed `1824ca99`.
- No `review`/`test` on #757: the review approved the reviewed head and the only delta is the Tester's test-only commit; a duplicate would burn allowance.
- No `eval`/`review`/`test` on #741: Council run 40110681717 is live on the reviewed and Tester-approved head `fb7ebf5f`.
- No `test-linux`/`test-macos`/`test-windows` on #757: a one-line root-README docs change does not warrant native per-OS product QA; the Tester lane owns it.
- No `review`/`test`/`test-*` on #745: protected-path work (Lab Engineer only) and conflicted, so no gate can run before a lab rebase; parked behind Phase 6 by the no-churn directive.
- No `fix`/`continue`: no open findings on any live PR; #745 is protected-path work.
- No `lab`: nothing blocks delivery, and the #754 fast-fail, the #745 rebase, the maintainer-session trust fix, the general catch-all narrowing, and queue hygiene stay post-delivery under the no-churn directive.
- No merge: #757 has no Tester approval yet; #741 has no Council verdict yet; #745 is parked and conflicted.
- No create/close/recover/ideate/auditor/curate: zero untriaged, nothing stranded, no ideation request, no new finding; #756 is closed by #757 on merge.
- No emergency: `lab.yml` executes normally and production is not halted by a lab failure.

## Watch list

- **#757 (live test lane)**: test run 40110388545 in progress, head `d2382831`. On Tester approval the test workflow posts `/oc maintainer` and I route the binding Council gate (`eval`) on the new head, then on `approve-eval` merge head-bound to `d2382831` (`--match-head-commit d2382831...`, rebase, never `--delete-branch`) after verifying the eval marker is shot on the current head, and confirm `Fixes #756` closes. On a Tester failure, route the Fixer.
- **#741 (Council attempt live)**: eval run 40110681717. On `approve-eval`: verify the marker is head-bound to `fb7ebf5f`, merge head-bound (`--match-head-commit fb7ebf5f...`, rebase, never `--delete-branch`), verify Pages, dispatch `{"action": "lab", "issue": 657}` to install `packaging/release/maze-chase-release.yml` and its Maintainer routing, run the native Linux/macOS/Windows jobs, and cut `maze-chase-v0.1.0-rc.1`; keep #657 open for the native evidence and the stable tag in the Final Phase; then chain Phase 7 on #582. On `fix`: route one manual Fixer round (the review retry budget is spent), then a fresh review, test, and eval. A quota death triggers no blind retry before the next daily reset.
- **#745**: after Phase 6 delivery and with lane budget, dispatch the Lab Engineer to rebase `7a04fa4a` over the current `main` (conflicts in `.github/scripts/silent-stall-audit.sh` and `AGENTS.md` from the #755 merge), then one head-bound review, the read-only infrastructure Tester, the Council, and the PAT sweep; #742 closes on that merge and #743 collects the live proof.
- **#756**: closes with #757; no separate action unless #757 is closed unmerged, in which case re-triage the tracking issue.
- **Native per-OS work is post-merge on #657**: do not claim native artifacts; the installed release workflow is the vehicle.
- **Post-merge follow-ups from the #741 Tester report**: re-measure or narrow the dated scoreboard desktop-tarball digest provenance, and quote the uninstall hint in `install-linux.sh`; both are non-blocking and must not move the current head.
- **#754 fast-fail**: first post-delivery infrastructure dispatch, with the issue's exact scope and R15 fixtures plus the ninth-death evidence.
- **Maintainer-session trust gap**: post-delivery, remedy via #745's `OPENCODE_DISABLE_PROJECT_CONFIG` opt-out plus the round-27 wording correction; no mid-delivery churn.
- **General catch-all noise**: post-delivery fix under the no-churn directive; today it produced a second false activation on #757 (16:13:11Z) whose owner-PAT forward woke this run; every Maintainer comment stays trigger-token-free.
- **Recurrence watches**: the maintainer wake storm on bursty review/test bursts, the quota class (#754, now nine deaths), #620 free-tier, #717 upstream-endpoint, #669 egress-IP, #653 stall classes, the #616/#637 publication gate, the Pages preview zero-job class, #655 per-OS rows, the test-cap pattern, and the cron-drop gap.

## Open questions

1. Does #757's Tester approve cleanly on the new head `d2382831`, and does the test run finish inside the free allowance?
2. Does the reopened free lane hold through the #741 Council run 40110681717, or was the earlier reviewer window a brief opening? (The retry-after had said 2026-10-25T00:00Z.)
3. Did the owner's re-engagement signal a provider-plan change (OpenCode Go) or a rolling reset? The answer decides whether #741 and #745 can be chained without a wall.
4. After the #741 merge, does the Lab Engineer install the release workflow cleanly and do the native macOS/Windows jobs produce the `maze-chase-v0.1.0-rc.1` evidence on #657?

Resolved this run: nothing new to dispatch - both live lanes are genuinely executing (the Tester pushed its tests and its run is still going; the Council is mid-session on `fb7ebf5f`), so the correct action under the allowance discipline was to hold and duplicate nothing despite a wake caused by the general arm's false activation.

## Next steps

1. Watch #757: Tester approval -> notify -> one `eval` on head `d2382831` -> merge head-bound; `Fixes #756` closes with it.
2. Watch #741: Council verdict at `fb7ebf5f`; on `approve-eval`, merge head-bound, verify Pages, chain the release install on #657 and Phase 7 on #582; on `fix`, one manual Fixer round then a fresh review, test, and eval.
3. After Phase 6 delivery: Lab Engineer rebase of #745 (protected paths, now conflicted), then review, infrastructure Tester, Council, and PAT sweep.
4. Post-delivery: the Tester's two notes, the #754 fast-fail, the maintainer-session trust fix, the general catch-all narrowing, bounded verdict timing, queue hygiene, the cron-drop watch, and the Sunday model review.
5. Never re-dispatch an approved gate on an unchanged head; never duplicate the auto-forwarded test lane; never retry a quota death before the next daily reset; keep every comment trigger-token-free.

## Pointers

- This run's log entry: `logs/2026-10-24.md`, run 40110546337.
- #757: head `d2382831` (Tester test commit 16:15:21Z), reviewed head `1824ca99`, owner `/oc review` 6386435286 (16:07:45Z), owner `/oc maintainer` 6386436824 (16:07:53Z), review run 40110119573 (approved), report 6386472350 (16:11:13Z), `/oc test` forward 6386472803 (16:11:15Z), test run 40110388545 (live), test-workflow owner-PAT `/oc maintainer` forward 16:13:17Z (this run's wake).
- #756: Curator tracking issue, opened 16:06:39Z.
- #741: head `fb7ebf5f`, Tester report 6381014360 and owner marker 6381014633 (06:40:04Z/06:40:06Z), review at `ae064dd6` (04:51:25Z), owner `/oc eval` trigger 16:15:03Z (posted by run 40110129621), Council run 40110681717 (live).
- The #755 merge: PR #755 (merge commit `2275caa6`), #753 closed 08:06:38Z, Pages run 40076758220.
- The #745 conflict: head `7a04fa4a`, conflicts in `.github/scripts/silent-stall-audit.sh` and `AGENTS.md` against `main` `2275caa6`.
- The owner's earlier directive: #741 comment 6358553065 (2026-10-23T06:01:42Z).
- The binding rules: `.github/agents/maintainer.md` (this run) and `AGENTS.md`.
- Trusted surfaces: `.github/scripts/silent-stall-audit.sh`, `.github/scripts/publish-eval-marker.sh`, `.github/scripts/publish-tester-marker.sh`, the PAT sweep in `maintainer.yml`, and `.github/actions/opencode-run/`.
