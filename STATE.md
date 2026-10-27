# STATE

Last updated: 2026-10-27T05:51Z by run 40456233152 (duplicate `/oc maintainer` wake on #70; took ownership of the bounded #759 review attempt because the Maintainer cron is empirically throttled to 3-7 hour gaps, not 20 minutes).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T05:52Z)

- **main** = `7cbd23bd17e3bfe7e4efecf0979d04aec7914ab0` (unchanged since the Owner's 2026-10-26 commit; verified with `git ls-remote origin refs/heads/main`). The checkout is the trusted `main` tree this run.
- **#759 `opencode/issue582-20261024225156`** head `afba8eb9b0e3288949c72bacea2fe53208ce061f`, MERGEABLE/CLEAN, head unmoved.
  - Two head-bound reviews have died on the provider's daily free-usage wall: `40447076697` (first wall 04:34:29Z) and `40451946370` (walls 05:10:12Z and 05:20:34Z, red 05:31:10Z). Neither produced a verdict or a decision file; the head did not move.
  - The workflow's own auto-retry could not fire: the PR-wide `/oc review (auto-retry N)` enumeration read 3, so the three lifetime slots (spent 2026-10-25) are exhausted. That counter is PR-wide, not head-bound; recorded as a post-delivery lab item.
  - **This run dispatches exactly one head-bound `/oc review (head afba8eb9...)` after the 30-minute cooldown from the 05:20:34Z wall hit (trigger lands about 05:52Z).** The failure-triage run `40455774746` had planned to leave the attempt to a 06:00Z scheduled tick, but live schedule history shows the `*/20` cron firing only every 3-7 hours (last 02:24Z, then 23:20Z, 19:33Z, 13:32Z, 06:24Z), so that plan could have idled the only delivery PR for hours. If the 06:00Z tick does fire it will see the review live and hold; no duplicate.
  - No Tester or Council marker exists on `afba8eb9`; earlier approvals bind earlier heads. No merge.
- **#745 `opencode/lab-742-owner-pat-env-sanitization`** head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **Curator lane:** schedule `40448164898` walled at 04:30Z, self-healed exactly once (retry `40451063560`, walled 05:10:48Z), cap escalated 05:31:57Z. Both runs changed nothing; nothing to recover. The last completed curator audit remains 2026-10-26T12:27Z. No re-dispatch inside the cooldown; the next cron tick and a fresh bucket carry it.
- **#769 (opened 04:26:24Z by the Auditor)** PR-gated arms lose the `small_model` pin under `OPENCODE_DISABLE_PROJECT_CONFIG` (paid `gpt-5.4-nano` title runs, HTTP 402). Triage: confirmed, non-fatal, non-blocking; first item in the post-delivery lab batch. Tracking issue stays open.
- **#754** is the daily free-usage quota tracker (per egress IP per day, shared by every free rung; the reset header is not authoritative). The review retry-cap gap is recorded with it in the post-delivery batch.
- **No other open PRs; no human or fork PR.** Fourteen open issues, zero untriaged: #769 (parked), #754 (quota tracker), #742 (PAT sanitization), #683 (release-claims sweep and Windows E2E re-sign), #678/#677/#661/#659/#657/#655/#660/#582 (Maze Chase roadmap and parent graph), #70 (lab health), #42 (brainstorm). #660 closes on the Phase 7 merge; #655/#661 close in the Final Phase; #659's native speaker review re-verifies there; #677/#678 fold into the Final Phase roadmap; #683 stays open for the Final Phase remainder.
- **Wake:** `issue_comment` `/oc maintainer` on #70 at 05:35:56Z, a duplicate of the 05:31:57Z curator self-heal escalation already triaged by run `40455848449` (decision 05:40:29Z, board status 05:40:40Z). The failure-triage lane `40455774746` posted the full #759 status at 05:38:53Z. This run is a third wake on the same state; it does not re-post the triage, it advances the one blocked gate.
- **Health** (checked against `origin/main` and the live API this run): allowlist exact 19/19 (the 19 non-maintainer repo-defined workflow names in `maintainer.yml:38` against the live list; the three GitHub-managed workflows are not repo-defined and cannot be summoned). Zero held runs. Zero stale `opencode/schedule-*`/`opencode/dispatch-*` branches. No new failure since the 05:39Z survey; the newest fail set remains the two #759 review wall deaths and the curator wall death, all the #754 class. Pages production `40446903902` SUCCESS for `7cbd23bd` at 03:55:56Z; PR preview `40446870482` SUCCESS for `afba8eb9` at 03:55:34Z. The auditor's daily tick succeeded at 04:27:40Z. The general-arm `opencode` run `40455848506` (same wake) completed without side effects.
- **Owner directives active:** delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). No new human directives.
- **Known deviations:** the parked #769 title/small paid-model fallback; #754 daily free-usage quota; the PR-wide review auto-retry cap.

## Decisions this run

`.maintainer/decision.json` = `[{"action": "review", "pr": 759, "head": "afba8eb9b0e3288949c72bacea2fe53208ce061f"}]`. `.maintainer/comment.md` = the #70 status explaining the bounded dispatch and the schedule-cadence deviation. `.maintainer/personality.md` empty. No `emergency.json`.
- One `review`: the only delivery PR is gated on a head-bound review verdict and the automatic retry lane is exhausted; the trigger is timed after the 30-minute wall cooldown.
- No `curator`: the quota class is deterministic per bucket, the self-heal cap just escalated, and nothing changed. The next cron tick carries it.
- No `lab`: #754 and #769 are parked post-delivery under the Owner's delivery-first directive; no workflow is broken.
- No `test` / `test-linux` / `test-macos` / `test-windows`: no review approval on `afba8eb9`; the Final Phase owns deployed cross-platform acceptance (#683).
- No `eval`: no tester approval on this head; the Council is binding only after the Tester.
- No merge: no tester or Council marker on `afba8eb9`; #745 conflicts and stays parked.
- No `ping` on #759: the failure-triage lane posted the full status at 05:38:53Z; the review trigger carries the next step.
- No `continue`/`architect`/`research`/`design`/`build`: Phase 7 is in its final review cycle; the Final Phase chains only after the merge.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, no stranded work, no ideation request.

## Callbacks

The hardcoded comment step posts the #70 status. The decision step posts one owner-authored `/oc review (head afba8eb9...)` on #759. The PAT merge sweep evaluates #759 and #745 and merges nothing (no tester/Council markers on the current head). The approve-held-runs sweep finds zero held runs. `main` has not advanced, so Pages needs no action. The memory publish appends the new 2026-10-27 entry keep-both per #647.

## Next run

1. Verify the review run on `afba8eb9`. If it approves, the workflow publishes and forwards the Tester handoff; dispatch nothing. If it walls again, do not re-dispatch inside 30 minutes; the review failure summons failure triage and the next fresh egress bucket carries it.
2. On the Tester's approval the workflow publishes the owner-authored `/oc approve-test` marker (it may push a test-only commit, so re-read the head first) and forwards to the Maintainer; then dispatch exactly one `eval` bound to the then-current head.
3. On the Council's `approve-eval`, verify the marker is fresh and head-bound to the current head, then merge head-bound (`--match-head-commit`, rebase, merge fallback only for non-linear history, never `--delete-branch`), close #660, flip Phase 7 in `progress/582-maze-chase-overhaul.md`, and immediately chain the Final Phase build on #582.
4. If the review returns `fix`, let the workflow forward one bounded fix round; do not duplicate it.
5. The curator runs on its next cron tick; if it walls again, record it and do not re-dispatch inside the cooldown.
6. Post-delivery lab batch, in order: #769 (trusted config under the opt-out plus the guard extension), #754 (`FreeUsageLimitError` classifier and quota-wall recovery), the review auto-retry cap fix (head-bound or time-window-bound), then #745 (rebase plus a fresh head-bound review). Do not start while #759's delivery gates are live.
7. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix proof; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.
8. Never duplicate a live lane; never post a trigger token; do not re-ping a stale quota status. Trust live schedule history over the cron expression when timing a retry.

## Open questions

1. Does the bounded review attempt in this run clear the wall and approve `afba8eb9`, or return another fix round on the R1-R7 repairs?
2. If it walls again, does a fresh egress bucket appear before the 2026-10-28T00:00Z reset header (the #754 evidence says the header is not authoritative)?
3. When does the curator lane next complete a real audit, given both attempts today died at the wall and the cap escalated?
4. Does the Tester approve the fixed site on the next pass, or push a test-only commit that moves the head again?
5. Does the Council approve the fixed site on the first draw, or return a `fix` verdict?
6. After the merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip from the RC artifacts and the Windows terminal matrix re-sign (#683)?
7. Does the per-PR review retry-cap fix need to land before the Final Phase gates, given every quota death now requires a manual Maintainer dispatch?

- Hephaestus, the Maintainer
