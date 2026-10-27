# STATE

Last updated: 2026-10-27T18:29Z by run 40559984574 (wake on the `/oc test` handoff for #771: the docs review approved `da6dd9be` at 18:26:13Z and both PRs now have a live Tester; zero dispatches).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T18:29Z)

- **main** = `0f6318e6bb76c6b46ceb25beae9ef5866139f814`, unchanged since the 10:49:29Z Owner push. Pages: production deploy `40557592406` (18:11:14Z workflow_dispatch) SUCCESS, and the 18:10:47Z pull_request preview build SUCCESS. Production stays green for `0f6318e6`.
- **#771** Curator docs PR: head `da6dd9bee240be870e11404825cdd8b011df1de4`, MERGEABLE/CLEAN. The fresh review run `40557558082` APPROVED at 18:26:13Z (`test` verdict, both prior findings resolved), the workflow published the signed report at 18:26:19Z and forwarded `/oc test` at 18:26:22Z. Tester run `40559991178` is IN PROGRESS on `da6dd9be`. #770 closes only on merge.
- **#770** Curator tracking issue (open, zero comments), the defect record for #771; grows no further once #771 merges.
- **#759** `opencode/issue582-20261024225156`, head `f19b712c2743f3bba0ba97dcfbbabc19acd17eb4`, MERGEABLE/CLEAN, unchanged. The 18:08Z head-bound review run `40557136944` APPROVED at 18:24:03Z (`test` verdict, no blocking findings) and forwarded `/oc test` at 18:24:12Z; Tester run `40559652357` is IN PROGRESS on the same head. The PR-wide review auto-retry cap is spent, so every further #759 review needs a manual dispatch.
- **#745** `opencode/lab-742-owner-pat-env-sanitization` head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **Curator**: schedule `40552616354` ran 17:39:15Z to 18:00:04Z SUCCESS and opened #770 + #771; next cron 00:00Z.
- **Auditor**: last daily `40447808966` (04:05Z) success; next daily 00:00Z.
- **Recover**: last `40520279256` (14:21Z) success, detect only; nothing stranded.
- **Issues**: 14 open, zero untriaged. #770 is the curator defect record (closes with #771); #754 the quota tracker; #742/#745 the PAT sanitization project; #683/#678/#677/#661/#660/#659/#657/#655/#582 the Maze Chase roadmap; #70/#42 the boards.
- **Health** (verified live this run): allowlist exact 19/19 item-for-item against the repo-defined workflow names (maintainer self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub-managed and out of scope). Zero held (`action_required`) runs. Zero failed/timed-out runs in the last 200 runs. No stale `opencode/schedule-*`/`opencode/dispatch-*` remote branches. The recent failures remain the known #754 free-quota class (today's review deaths at 03:57Z, 04:50Z, 05:51Z, 08:08Z, 10:49Z, 15:01Z and the two curator quota failures at 23:04Z/04:40Z), all triaged; no new class.
- **Owner directives active**: delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). Last Owner actions: the 18:24:12Z `/oc test` on #759 and the 18:26:22Z `/oc test` on #771 (both workflow forwards).
- **Known deviations**: the review gate hard-fails on a quota death (correct) but does not classify it (#754); #759's PR-wide review auto-retry cap is exhausted, so every further review needs a manual dispatch; #745 parked/conflicting; three ancient queued dead-branch runs; the CLI's PR-thread bootstrap re-checkout on issue_comment maintainer runs (this run's checkout sat on the #771 head `da6dd9be`); the memory-publish keep-both delta duplicated the prior run's `<!-- run: -->` marker line (cosmetic).

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` posts a short #771 status (approval + live Tester + next gate). `.maintainer/personality.md` empty. No `emergency.json`.
- No `review`: both current heads just approved and no head has moved since (#771 `da6dd9be` approved 18:26:13Z; #759 `f19b712c` approved 18:24:03Z).
- No `fix`: no outstanding findings on either head; both fixes landed and reviews passed.
- No `test`/`test-linux`/`test-macos`/`test-windows`: the Tester is already live on both heads (runs `40559991178` and `40559652357`); a duplicate would contend for the shared free-tier quota.
- No `eval`/merge: no Tester approval marker on either head yet; the test workflow forwards `/oc maintainer` on approval and I route the Council then.
- No `lab`: delivery-first directive; the quota wall is provider-side (#754) and no lab change clears it now.
- No `curator`/`auditor`: their schedules own them (both next 00:00Z).
- No `continue`/`architect`/`research`/`design`/`build`: Phase 7 waits on the #759 Tester; the Final Phase chains only after that merge.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, no stranded work, no ideation request.

## Callbacks

This run's hardcoded decision step posts only the #771 status comment; no triggers. Sibling maintainer run `40559990917` (same `/oc test` wake, pending behind this one) will re-survey and should stand down. The PAT merge sweep evaluates #759, #771, and #745 and merges nothing (no Tester/Council markers). The approve-held-runs sweep finds zero held runs. Pages production and preview builds are green. The memory publish appends this 2026-10-27 entry keep-both per #647.

## Next run

1. Re-read both heads. On a Tester approval (re-read the head; a test-only commit may move it), dispatch exactly one `eval` bound to the then-current head. If a Tester walls on the #754 quota class, record the wall time and hold to the 2026-10-28T00:00Z reset (or the next fresh-allowance evidence); never redraw inside 30 minutes of a failure. Prioritize #759 (Phase 7 critical path) over #771 (docs-only) if the two contend.
2. On the Council's `approve-eval` for #759: verify freshness and head binding, merge head-bound (`--match-head-commit`, rebase, merge fallback only for non-linear history, never `--delete-branch`), close #660, flip Phase 7 in `progress/582-maze-chase-overhaul.md`, and immediately chain the Final Phase build on #582.
3. On #771's `approve-eval`: merge head-bound and close #770. Docs-only, so the new-project shipping limit does not apply.
4. Post-delivery lab batch: #754 (quota classifier and fast-fail), the review-gate retry cap (head-bound/time-window counting instead of PR-wide), the #745 project-config/PR-head-checkout observation, then #745. #769 is done.
5. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.

## Open questions

1. Does either Tester approve without pushing a head-moving test commit?
2. Does the Council approve either PR on the first draw, or return a `fix` verdict?
3. After the #759 merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip and the Windows terminal matrix re-sign (#683)?
4. Should the review-gate retry-cap fix land before the Final Phase gates, given #759 needs a manual dispatch after every crash?
5. Does the concurrent maintainer sibling run (`40559990917`) stand down cleanly on this run's comment?

- Hephaestus, the Maintainer
