# STATE

Last updated: 2026-10-27T18:07Z by run 40555818884 (curator PR #771 opened and handed to review; #759's post-cooldown head-bound review redrawn on fresh-allowance evidence; health 31/31).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T18:07Z)

- **main** = `0f6318e6bb76c6b46ceb25beae9ef5866139f814`, unchanged since the 10:49:29Z Owner push ("fix: honor the maintained small_model config and bind handoffs to the run nonce"). Pages production `40491482755` SUCCESS for it; the 18:00:03Z workflow_dispatch deploy `40555820624` also SUCCESS; PR preview `40555755756` SUCCESS for #771 at 18:00:05Z. I re-ran `.github/scripts/silent-stall-audit.sh` locally on this checkout this run: 31/31 (R1-R31).
- **#771** NEW (Curator, created 17:59:32Z): branch `opencode/issue770-curate-docs-reviewer-claim`, head `f26e6c192fa8a5acc6a995914c5c8a2cf575e075`, MERGEABLE/CLEAN. Docs-only: `docs/index.html` (+6/-3) and `docs/index.md` (+4/-1) qualify the absolute "Nothing reaches main without the Reviewer's approval" claim, naming the Lab Engineer's Maintainer-ordered model-pin fast track as the only direct-to-main lane (model config only, never code). `Fixes #770`. Owner `/oc review` at 17:59:51Z; review run `40555802764` is live since 17:59:56Z (the 18:00:02Z `40555818949` is the `/oc maintainer` comment's spawned run and will skip). No verdict yet.
- **#770** Curator tracking issue (open, created 17:58:58Z), the defect record for the #771 fix; closes with #771 on merge, never before.
- **#759** `opencode/issue582-20261024225156`, head `f19b712c2743f3bba0ba97dcfbbabc19acd17eb4`, MERGEABLE/CLEAN, unchanged since the 08:08Z fix push. The 15:01Z review died on the #754 free-quota wall at 15:44Z; the 30-minute cooldown expired at 16:24Z and no schedule tick fired between 14:53Z and 18:00Z. This run dispatches exactly one head-bound review on the still-live head.
- **#745** `opencode/lab-742-owner-pat-env-sanitization` head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **Curator**: schedule `40552616354` ran 17:39:15Z to 18:00:04Z SUCCESS and opened #770 + #771; last completed audit 2026-10-27T18:00Z; next cron 00:00Z.
- **Auditor**: last daily `40447808966` (04:05Z) success; next daily 00:00Z.
- **Recover**: last `40520279256` (14:21Z) success, detect only; nothing stranded.
- **Issues**: 14 open, zero untriaged. #770 is the curator defect record; #754 the quota tracker; #742/#745 the PAT sanitization project; #683/#678/#677/#661/#660/#659/#657/#655/#582 the Maze Chase roadmap; #70/#42 the boards.
- **Health** (verified live this run): allowlist exact 19/19 against the live repo-defined workflow names (maintainer self-excluded; the three GitHub-managed workflows out of scope). Zero held (`action_required`) runs. Zero stale `opencode/schedule-*`/`opencode/dispatch-*` remote branches. The last 100 runs carry exactly two failures, both the #759 review quota deaths (10:49Z and 15:01Z); no new class. Silent-stall audit 31/31 on `0f6318e6`.
- **Owner directives active**: delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). Last Owner actions: the 10:49:29Z fix push and the 17:59:51Z `/oc review` handoff on #771.
- **Known deviations**: the review gate hard-fails on a quota death (correct) but does not classify it (#754); #759's PR-wide review auto-retry cap is exhausted, so every further review needs a manual dispatch; #745 parked/conflicting; three ancient queued dead-branch runs; the CLI's PR-thread bootstrap re-checkout on issue_comment maintainer runs; no schedule tick fired between 14:53Z and 18:00Z (GitHub cron sleep).

## Decisions this run

`.maintainer/decision.json` = one `{"action": "review", "pr": 759, "head": "f19b712c..."}` plus one `ping` on #759 with the redraw status. `.maintainer/comment.md` = the #771 triage status (run target). `.maintainer/personality.md` empty. No `emergency.json`.
- `review` #759: the cooldown expired at 16:24Z, the head is unchanged, no review is live or queued on #759, and the 17:39-18:00Z curator session completed a full audit on the same free model, so the allowance is demonstrably usable again. One manual head-bound dispatch; the PR-wide auto-retry cap is spent, so this is the only path.
- No `review` on #771: run `40555802764` is already live from the owner handoff; a second dispatch would duplicate.
- No `fix`/`test`/`test-linux`/`test-macos`/`test-windows`/`eval`/merge on either PR: no review verdict on #771 and no Tester or Council marker on #759; the workflows forward automatically on approval.
- No `lab`: delivery-first directive; the quota wall is provider-side (#754) and no lab change clears it now.
- No `curator`/`auditor`: their schedules own them (both next 00:00Z); never re-dispatch inside a wall.
- No `continue`/`architect`/`research`/`design`/`build`: Phase 7 waits on the #759 review; the Final Phase chains only after that merge.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, no stranded work, no ideation request.

## Callbacks

The hardcoded decision step posts one owner `/oc review (head f19b712c...)` on #759 and one bot status ping on #759; my `comment.md` posts on #771. The PAT merge sweep evaluates #759, #771, and #745 and merges nothing (no Tester/Council markers on #759; no verdict on #771; #745 conflicts). The approve-held-runs sweep finds zero held runs. Pages already deployed `main` and the #771 preview is green, so no Pages action. The memory publish appends this 2026-10-27 entry keep-both per #647.

## Next run

1. Re-read both PR heads. On #759: if this review approves, the workflow publishes and forwards `/oc test`; dispatch nothing. On `fix`, the workflow forwards one bounded fix round. If this draw walls again, record the wall time and hold the lane to the 2026-10-28T00:00Z reset (or the next fresh-allowance evidence); never redraw inside 30 minutes of a failure.
2. On Tester approval (re-read the head; a test-only commit may move it), dispatch exactly one `eval` bound to the then-current head.
3. On the Council's `approve-eval` for #759: verify freshness and head binding, merge head-bound (`--match-head-commit`, rebase, merge fallback only for non-linear history, never `--delete-branch`), close #660, flip Phase 7 in `progress/582-maze-chase-overhaul.md`, and immediately chain the Final Phase build on #582.
4. On #771: the review workflow forwards `/oc test` on approval; on Tester approval dispatch one `eval`; on `approve-eval` merge head-bound and close #770. Docs-only, so the new-project shipping limit does not apply. Never duplicate an automatic forward.
5. If the two concurrent reviews contend for a shared quota bucket and one walls, prioritize #759 (Phase 7 critical path) over #771 (docs-only) in the next wake.
6. Post-delivery lab batch: #754 (quota classifier and fast-fail), the review-gate retry cap (head-bound/time-window counting instead of PR-wide), the #745 project-config/PR-head-checkout observation, then #745. #769 is done; the optional CLI small_model assertion can ride the #754 or #745 guard work.
7. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.

## Open questions

1. Does the #759 review carry to a verdict on a fresh runner, or wall again at the same ~43-minute mark?
2. Does the #771 review approve the two-file docs qualification cleanly, or return findings?
3. Do the two concurrent reviews contend for the same quota bucket?
4. Does the Tester approve either PR without pushing a head-moving test commit?
5. Does the Council approve on the first draw, or return a `fix` verdict?
6. After the #759 merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip and the Windows terminal matrix re-sign (#683)?
7. Should the review-gate retry-cap fix land before the Final Phase gates, given #759 needs a manual dispatch after every crash?

- Hephaestus, the Maintainer
