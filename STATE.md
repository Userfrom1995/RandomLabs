# STATE

Last updated: 2026-10-27T18:13Z by run 40557293390 (quiet wake: #771 fix landed at `da6dd9be` and its fresh review is live; #759 review still live on `f19b712c`; zero dispatches).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T18:13Z)

- **main** = `0f6318e6bb76c6b46ceb25beae9ef5866139f814`, unchanged since the 10:49:29Z Owner push. The 18:11:14Z workflow_dispatch Pages deploy is in progress (the #771 fix push's preview rebuild); production stays green for `0f6318e6`.
- **#771** Curator docs PR: head is now `da6dd9bee240be870e11404825cdd8b011df1de4` (was `f26e6c19`), MERGEABLE. The 17:59Z review (run `40555802764`) returned `fix` at 18:09:13Z on two findings: (1) the new "only automated direct-to-main path" claim is still false because the Maintainer's declared emergency revival also pushes to `main` (`.github/workflows/maintainer.yml`), and "never code" is unenforced because the fast track stages whole workflow YAML (`.github/workflows/lab.yml`); (2) the PR body lacked the required skills line. The Fixer ran from the owner `/oc fix` at 18:09:22Z and pushed `da6dd9be` at 18:11:07Z: the docs paragraph now names BOTH direct-to-main paths (Lab Engineer model-pin fast track, scoped by its agent contract to model configuration, plus the Maintainer's `.maintainer/emergency.json` revival gated on a linkable failed lab attempt and halted production), and the PR body carries the skills line. The workflow's own `/oc review` handoff posted at 18:10:58Z; review run `40557558082` is live since 18:11:01Z on the new head. Only `docs/index.html` and `docs/index.md` changed.
- **#770** Curator tracking issue (open, zero comments), the defect record for #771; `.maintainer/comment.md`'s Fixes #770 closes it only on merge, never before.
- **#759** `opencode/issue582-20261024225156`, head `f19b712c2743f3bba0ba97dcfbbabc19acd17eb4`, MERGEABLE/CLEAN, unchanged. The 18:08:17Z manual head-bound dispatch started review run `40557136944` at 18:08:21Z, still live. The PR-wide review auto-retry cap is spent, so every further #759 review needs a manual dispatch.
- **#745** `opencode/lab-742-owner-pat-env-sanitization` head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **Curator**: schedule `40552616354` ran 17:39:15Z to 18:00:04Z SUCCESS and opened #770 + #771; next cron 00:00Z.
- **Auditor**: last daily `40447808966` (04:05Z) success; next daily 00:00Z.
- **Recover**: last `40520279256` (14:21Z) success, detect only; nothing stranded.
- **Issues**: 14 open, zero untriaged. #770 is the curator defect record (closes with #771); #754 the quota tracker; #742/#745 the PAT sanitization project; #683/#678/#677/#661/#660/#659/#657/#655/#582 the Maze Chase roadmap; #70/#42 the boards.
- **Health** (verified live this run): allowlist exact 19/19 against the repo-defined workflow names (maintainer self-excluded; the three GitHub-managed workflows out of scope). Zero held (`action_required`) runs. No stale `opencode/schedule-*`/`opencode/dispatch-*` remote branches. Recent failures remain the known #754 free-quota class (today's review deaths at 03:57Z, 04:50Z, 05:51Z, 08:08Z, 10:49Z, 15:01Z and the two curator quota failures at 23:04Z/04:40Z), all triaged; no new class since the 15:01Z review death.
- **Owner directives active**: delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). Last Owner actions: the 18:09:22Z `/oc fix` on #771 and the 18:11:07Z `/oc maintainer` from the fix workflow.
- **Known deviations**: the review gate hard-fails on a quota death (correct) but does not classify it (#754); #759's PR-wide review auto-retry cap is exhausted, so every further review needs a manual dispatch; #745 parked/conflicting; three ancient queued dead-branch runs; the CLI's PR-thread bootstrap re-checkout on issue_comment maintainer runs.

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` = the #771 status (both heads and both live gates). `.maintainer/personality.md` empty. No `emergency.json`.
- No `review` on either PR: #759's dispatch is live (`40557136944`, 18:08:21Z on `f19b712c`) and #771's fresh review is live (`40557558082`, 18:11:01Z on `da6dd9be`) from the fix workflow's own `/oc review`; a duplicate would only contend for the shared quota.
- No `fix`: the #771 fix already landed both findings and re-triggered review automatically.
- No `test`/`test-linux`/`test-macos`/`test-windows`/`eval`/merge: no review verdict on either current head and no Tester or Council marker on either PR; the workflows forward automatically on approval.
- No `lab`: delivery-first directive; the quota wall is provider-side (#754) and no lab change clears it now.
- No `curator`/`auditor`: their schedules own them (both next 00:00Z).
- No `continue`/`architect`/`research`/`design`/`build`: Phase 7 waits on the #759 review; the Final Phase chains only after that merge.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, no stranded work, no ideation request.

## Callbacks

No new owner `/oc` trigger from this run. The hardcoded decision step posts nothing (empty list); my `comment.md` posts on #771. The PAT merge sweep evaluates #759, #771, and #745 and merges nothing (no Tester/Council markers). The approve-held-runs sweep finds zero held runs. Pages is rebuilding the #771 preview; production is green for `0f6318e6`. The memory publish appends this 2026-10-27 entry keep-both per #647.

## Next run

1. Re-read both heads. #771: the fresh review on `da6dd9be` approves (workflow forwards `/oc test`) or returns `fix` (workflow forwards one bounded fix round). #759: the 18:08Z review approves (workflow forwards `/oc test`) or returns `fix`. If either draw walls on the #754 quota class, record the wall time and hold to the 2026-10-28T00:00Z reset (or the next fresh-allowance evidence); never redraw inside 30 minutes of a failure.
2. On Tester approval (re-read the head; a test-only commit may move it), dispatch exactly one `eval` bound to the then-current head.
3. On the Council's `approve-eval` for #759: verify freshness and head binding, merge head-bound (`--match-head-commit`, rebase, merge fallback only for non-linear history, never `--delete-branch`), close #660, flip Phase 7 in `progress/582-maze-chase-overhaul.md`, and immediately chain the Final Phase build on #582.
4. On #771's `approve-eval`: merge head-bound and close #770. Docs-only, so the new-project shipping limit does not apply.
5. If the two concurrent reviews contend for a shared quota bucket and one walls, prioritize #759 (Phase 7 critical path) over #771 (docs-only) in the next wake.
6. Post-delivery lab batch: #754 (quota classifier and fast-fail), the review-gate retry cap (head-bound/time-window counting instead of PR-wide), the #745 project-config/PR-head-checkout observation, then #745. #769 is done.
7. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.

## Open questions

1. Does the fresh #771 review approve the two-file docs correction on `da6dd9be`, or return another finding?
2. Does the #759 review carry to a verdict on this draw, or wall again at the same ~43-minute mark?
3. Do the two concurrent reviews contend for the same quota bucket?
4. Does the Tester approve either PR without pushing a head-moving test commit?
5. Does the Council approve on the first draw, or return a `fix` verdict?
6. After the #759 merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip and the Windows terminal matrix re-sign (#683)?
7. Should the review-gate retry-cap fix land before the Final Phase gates, given #759 needs a manual dispatch after every crash?

- Hephaestus, the Maintainer
