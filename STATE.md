# STATE

Last updated: 2026-10-27T05:42Z by run 40455774746 (workflow_run failure triage: the fresh #759 review of `afba8eb9` died on the free-usage wall at 05:10Z after about 19 minutes, retried into it at 05:20Z, and red-ed at 05:31Z; the death was inside the 30-minute cooldown, so this run dispatched no review). The next scheduled tick at 06:00Z owns one bounded fresh review attempt on `afba8eb9`. The curator lane's owner-dispatched run also died on the same wall at the same minute, and a pending maintainer run owns that triage. Nothing else is moving.

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T05:42Z)

- **main** = `7cbd23bd17e3bfe7e4efecf0979d04aec7914ab0` (unchanged since the Owner's 2026-10-26 10:13:22Z commit). The checkout is the trusted `main` tree this run.
- **#759 `opencode/issue582-20261024225156`** head `afba8eb9b0e3288949c72bacea2fe53208ce061f`, MERGEABLE/CLEAN, updated 04:50:28Z.
  - The fresh head-bound review dispatched at 04:50Z (run 40451946370) did about 19 minutes of real review work, then hit `AI_APICallError: Free usage limit reached. Free models work in OpenCode (https://opencode.ai); subscribe to OpenCode Go to keep going: https://opencode.ai/go` (`FreeUsageLimitError`, HTTP 429, `retry-after` 67,789) at 05:10:12Z. The #653 watchdog killed the silent attempt at 05:20:20Z, the same-model retry hit the wall again at 05:20:34Z (`retry-after` 67,166), and the run red-ed at 05:31:07Z with no verdict and no decision file. Both headers resolve to 2026-10-28T00:00Z.
  - This was the one manual re-dispatch the previous run allowed. The workflow's PR-wide `/oc review (auto-retry N)` budget remains exhausted (the three lifetime slots were spent on 2026-10-25), so every recovery on this PR is a manual Maintainer dispatch.
  - No Tester or Council marker exists on `afba8eb9`; the earlier approvals bind earlier heads. No merge.
- **Curator 40451063560** (owner-dispatched `workflow_dispatch`, `selfheal_retry=1`) did about 29 minutes of audit work, hit the same wall at 05:10:48Z (`retry-after` 67,753), retried into it at 05:21:23Z (`retry-after` 67,117), and red-ed at 05:31:57Z with no decision file; its cap was already 1, so the verify escalated to #70 (comment 6434590711). General run 40455848506 already answered the escalation on #70 at 05:35:50Z with the correct #754 triage; the owner's `/oc maintainer` at 05:35:56Z is a routine wake, not a new defect. Do not duplicate the answer and do not re-dispatch the curator inside the wall.
- **#769** (paid `gpt-5.4-nano` title path under `OPENCODE_DISABLE_PROJECT_CONFIG`) reproduced twice in the same review session: HTTP 402 `Insufficient account funds` at 04:50:54Z and 05:20:34Z. Confirmed, non-fatal, first post-delivery lab batch item.
- **#754** (quota fast-fail) now carries today's evidence addendum: two lanes walled within 36 seconds (review 40451946370, curator 40451063560) in different Cloudflare colos, both with the same fixed midnight reset header, while a fresh Maintainer runner served normally. Per-egress bucket remains the best model; the header is not a lane-wide park horizon.
- **#745 `opencode/lab-742-owner-pat-env-sanitization`** head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **No other open PRs; no human or fork PR.** Fourteen open issues, zero untriaged: #769 (parked), #754 (quota tracker), #742 (PAT sanitization), #683 (release-claims sweep and Windows E2E re-sign), #678/#677/#661/#659/#657/#655/#660/#582 (Maze Chase roadmap and parent graph), #70 (lab health), #42 (brainstorm). #660 closes on the Phase 7 merge; #655/#661 close in the Final Phase; #659's native speaker review re-verifies there; #677/#678 fold into the Final Phase roadmap; #683 stays open for the Final Phase remainder.
- **Wake**: run 40455774746, `workflow_run` failure of `opencode-review` run 40451946370 at 05:31:07Z. This is the failure-triage lane, not a new human directive.
- **Health** (checked against `origin/main`, not the working tree): allowlist exact 19/19 (the 19 non-maintainer repo-defined workflow names plus the `maintainer` self-exclusion; the live API also exposes GitHub-managed `Dependabot Updates`, `Dependency Graph`, and `pages-build-deployment`, which are not repo-defined and cannot be summoned). Zero held runs. Exactly three real failures in the newest 200, all the quota class: review 40451946370, review 40447076697, curator 40451063560. Zero stale `opencode/schedule-*`/`opencode/dispatch-*` branches. Pages production `40446903902` SUCCESS for `7cbd23bd` at 03:55:56Z; PR preview `40446870482` SUCCESS for `afba8eb9` at 03:55:34Z; both the site root and the `pr-759` preview return HTTP 200. Silent-stall audit 31/31 (R1-R31) stands from run `40447100963` on unchanged `main`; not re-run. The auditor's daily tick succeeded at 04:27:40Z (23/23 pins on the free pin, ladder 3/3 live).
- **Owner directives active**: delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). No new human directives.
- **Known deviations**: the parked #769 title/small paid-model fallback; #754 is the daily free-usage quota tracker. The review auto-retry cap being PR-wide rather than head-bound remains a recorded post-delivery lab item.

## Decisions this run

`.maintainer/decision.json` = one `ping` on #759 (status) and one `ping` on #754 (quota evidence addendum). `.maintainer/comment.md` empty (a `workflow_run` event carries no `OC_TARGET`; the pings are the posting lane). `.maintainer/personality.md` empty. No `emergency.json`.
- No `review` re-dispatch: the wall death was 05:20:34Z and this run started 05:31Z, inside the explicit 30-minute same-workflow cooldown, and the recorded plan says do not flap into the wall. The next scheduled tick at 06:00Z (39 minutes after the death) owns one bounded fresh attempt on `afba8eb9`.
- `ping` on #759: honest status (second wall death, about 19 minutes of work lost, no verdict, no head movement, no merge, the 06:00Z retry plan, clean health).
- `ping` on #754: today's two lane deaths, the fixed midnight horizon, the different-colo datum, and the repeated #769 402 line. This is the issue's evidence-ledger lane and it had no comment there yet today.
- No `fix`: the reviewer produced no verdict and no findings on this head.
- No `test` / `test-linux` / `test-macos` / `test-windows`: no review approval exists on `afba8eb9`; the Final Phase owns deployed cross-platform acceptance (#683).
- No `eval`: no Tester approval on this head; the Council is binding only after the Tester.
- No merge: no Tester or Council marker on `afba8eb9`; #745 conflicts and stays parked.
- No `lab`: the only failures are the quota class (a classifier cannot create allowance; the Owner/provider plan is the lever) and the parked #769 defect; delivery-first holds.
- No `curate`/`auditor`: the curator dispatch failure is the same wall class and already has a pending maintainer triage; the curator schedule and auditor daily ticks are healthy.
- No `continue`/`architect`/`research`/`design`/`build`: Phase 7 is in its final review cycle; the Final Phase chains only after the merge.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged issues, no stranded work, no ideation request.

## Callbacks

The hardcoded decision step posts the two pings as the bot (there is no `comment.md` target for a `workflow_run` event). The PAT merge sweep evaluates #759 and #745 and merges nothing (no tester/Council markers on the current head). The approve-held-runs sweep finds zero held runs. `main` has not advanced, so Pages is at most an idempotent same-tree redeploy. The memory publish appends the new 2026-10-27 entry keep-both per #647.

## Next run

1. The scheduled tick at 06:00Z (or any wake at/after 05:51Z) dispatches exactly one fresh head-bound `review` on #759 bound to `afba8eb9` if no review is live. If it dies on the wall a third time, record it, do not count it against the PR (provider, not code), and space the next attempt 60+ minutes out. Do not flap.
2. The #70 curator escalation is already answered (General run 40455848506, 05:35:50Z); the owner's `/oc maintainer` at 05:35:56Z is a wake, so do not duplicate the triage and do not re-dispatch the curator inside the wall. The next scheduled curator tick owns the audit.
3. On review approval, the workflow publishes the Tester handoff; do not duplicate it. On the Tester's approval the workflow publishes the owner-authored `/oc approve-test` marker (it may push a test-only commit, so re-read the head first) and forwards to the Maintainer; then dispatch exactly one `eval` bound to the then-current head.
4. On the Council's `approve-eval`, verify the marker is fresh and head-bound to the current head, then merge head-bound (`--match-head-commit`, rebase, merge fallback only for non-linear history, never `--delete-branch`), close #660, flip Phase 7 in `progress/582-maze-chase-overhaul.md`, and immediately chain the Final Phase build on #582.
5. If the review returns `fix`, let the workflow forward one bounded fix round; do not duplicate it.
6. Post-delivery lab batch, in order: #769 (trusted config under the opt-out plus the R31/R17/R30 guard extension), #754 (`FreeUsageLimitError` classifier and quota-wall recovery), the review auto-retry cap fix (make the `/oc review (auto-retry N)` enumeration head-bound or time-window-bound so a long-lived PR recovers automatically after a quota death), then #745 (rebase plus a fresh head-bound review). Do not start while #759's delivery gates are live.
7. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix proof; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.
8. Never duplicate a live lane; never post a trigger token; keep status pings to genuinely new developments.

## Open questions

1. Does the 06:00Z fresh review get a bucket large enough to finish the review, or does the free-tier per-egress allowance keep killing heavy sessions mid-review?
2. Is today's 05:10 double failure a coincidence of two heavy buckets expiring together, or the first sign of an account-level cap? The different colos and this session's healthy model argue for the former; #754 now carries the datum either way.
3. Does the Tester approve the fixed site on the next pass, or push a test-only commit that moves the head again?
4. Does the Council approve the fixed site on the first draw, or return a `fix` verdict?
5. After the merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip from the RC artifacts and the Windows terminal matrix re-sign (#683)?
6. Does the per-PR review retry-cap fix need to land before the Final Phase gates, given every quota death now requires a manual Maintainer dispatch?
7. Does the maintainer workspace keep getting re-checked-out to the PR head by the CLI session bootstrap on other run shapes, and should the post-delivery trust fix pin it back to the trusted commit?

- Hephaestus, the Maintainer
