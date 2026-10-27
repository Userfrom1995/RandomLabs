# STATE

Last updated: 2026-10-27T18:38Z by run 40561343270 (wake on the #771 Tester approval: the docs Tester approved `da6dd9be` at 18:35Z with the machine-published `/oc approve-test` marker, so exactly one `eval` is dispatched).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T18:38Z)

- **main** = `0f6318e6bb76c6b46ceb25beae9ef5866139f814`, unchanged since the 10:49:29Z Owner push (verified with `git ls-remote`). Pages: production deploy `40557592406` (18:11:14Z workflow_dispatch) SUCCESS, the 18:10:47Z preview build SUCCESS, and the 17:59:37Z preview build SUCCESS. Production stays green for `0f6318e6`.
- **#771** Curator docs PR: head `da6dd9bee240be870e11404825cdd8b011df1de4`, MERGEABLE/CLEAN, base `0f6318e6`. The docs Tester run `40559991178` completed SUCCESS at 18:35:16Z; its signed report landed at 18:35:07Z and the workflow's owner-authored `/oc approve-test` marker at 18:35:09Z (machine-published, head-bound). This run dispatches exactly one `eval` on this head; on `approve-eval` I merge and close #770.
- **#770** Curator tracking issue (open, zero comments), the defect record for #771; closes only on merge.
- **#759** `opencode/issue582-20261024225156`, head `f19b712c2743f3bba0ba97dcfbbabc19acd17eb4`, MERGEABLE/CLEAN, unchanged. Its Tester run `40559652357` is IN PROGRESS since 18:24:19Z (job `test` started 18:24:19Z). No dispatch needed; on approval I route one eval.
- **#745** `opencode/lab-742-owner-pat-env-sanitization` head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **Curator**: schedule `40552616354` ran 17:39:15Z to 18:00:04Z SUCCESS and opened #770 + #771; next cron 00:00Z.
- **Auditor**: last daily `40447808966` (04:05Z) success; next daily 00:00Z.
- **Recover**: last `40520279256` (14:21Z) success, detect only; nothing stranded.
- **Issues**: 14 open, zero untriaged. #770 is the curator defect record (closes with #771); #754 the quota tracker; #742/#745 the PAT sanitization project; #683/#678/#677/#661/#660/#659/#657/#655/#582 the Maze Chase roadmap; #70/#42 the boards.
- **Health** (verified live this run): allowlist exact 19/19 item-for-item against the repo-defined workflow names (maintainer self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub-managed and out of scope). Zero held (`action_required`) runs. Zero failed/timed-out runs in the last 100 runs. No stale `opencode/schedule-*`/`opencode/dispatch-*` remote branches. Pages production and both preview builds green.
- **Owner directives active**: delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). Last Owner actions: the 18:24:12Z `/oc test` on #759, the 18:26:22Z `/oc test` on #771, and the 18:35:09Z/18:35:11Z workflow handoffs on #771.
- **Known deviations**: the review gate hard-fails on a quota death (correct) but does not classify it (#754); #759's PR-wide review auto-retry cap is exhausted, so every further review needs a manual dispatch; #745 parked/conflicting; three ancient queued dead-branch runs; the CLI's PR-thread bootstrap re-checkout on issue_comment maintainer runs (this run's checkout sat on the #771 head `da6dd9be`); the memory-publish keep-both delta duplicated an earlier `<!-- run: -->` marker line (cosmetic).

## Decisions this run

`.maintainer/decision.json` = one `{"action": "eval", "pr": 771, "head": "da6dd9bee240be870e11404825cdd8b011df1de4"}`. `.maintainer/comment.md` posts a short #771 status (Tester approval + Council dispatch). `.maintainer/personality.md` empty. No `emergency.json`.
- `eval` #771: the Tester approved `da6dd9be` at 18:35Z with the owner-authored machine marker, the head has not moved since the Fixer's 18:10:35Z push, no eval is live or queued (all recent opencode-eval runs skipped), and no newer `/oc fix` exists. The binding Council gate is the next pipeline step.
- No `review`: #771 and #759 both carry fresh approvals on unmoved heads.
- No `fix`: no outstanding findings on either head.
- No `test`/`test-linux`/`test-macos`/`test-windows`: #771's Tester already passed (docs-only static scope, no cross-platform artifact), and #759's Tester is live; a duplicate would contend for the shared free-tier quota.
- No merge yet: #771 has no Council marker; the merge sweep would correctly refuse.
- No `lab`: delivery-first directive; no lab change is needed now, and the quota wall is provider-side (#754).
- No `curator`/`auditor`: their schedules own them (both next 00:00Z).
- No `continue`/`architect`/`research`/`design`/`build`: Phase 7 waits on the #759 Tester; the Final Phase chains only after that merge.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, no stranded work, no ideation request.

## Callbacks

This run's hardcoded decision step posts the owner `/oc eval` on #771 and my status comment there. Pending sibling maintainer run `40561354356` (queued behind this one at 18:35:15Z) will re-survey and should stand down once the eval marker is live. The PAT merge sweep evaluates #759, #771, and #745 and merges nothing (no Council marker yet; #745 conflicts). The approve-held-runs sweep finds zero held runs. Pages needs no action. The memory publish appends this 2026-10-27 entry keep-both per #647.

## Next run

1. Re-read the #771 head. Watch the Council gate. On `approve-eval`, verify the marker is owner-authored, head-bound to `da6dd9be` (or the then-current head), newer than the 18:35:09Z Tester verdict and the eval trigger, then merge head-bound (`--match-head-commit`, rebase, merge fallback only for non-linear history, never `--delete-branch`), close #770, and verify the Pages deployment.
2. On #759's Tester approval (re-read the head; a test-only commit may move it), dispatch exactly one `eval` bound to the then-current head. On a Tester `fix` verdict, the workflow forwards its own fix handoff; do not duplicate.
3. If the eval or a later gate walls on the #754 quota class, record the wall time and hold 30 minutes before a fresh manual dispatch; the manual lane is not bounded by the spent PR-wide auto-retry count.
4. On #759's `approve-eval`: verify freshness/head binding, merge head-bound, close #660, flip Phase 7 in `progress/582-maze-chase-overhaul.md`, and immediately chain the Final Phase build on #582.
5. Post-delivery lab batch: #754 (quota classifier and fast-fail), the review-gate retry cap (head-bound/time-window counting instead of PR-wide), the #745 project-config/PR-head-checkout observation, then #745. #769 is done.
6. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.

## Open questions

1. Does the Council approve #771 on the first draw, or return a `fix` verdict?
2. Does #759's Tester approve `f19b712c` without pushing a head-moving test commit?
3. Do the #771 Council session and the #759 Tester contend for the same quota bucket?
4. After the #759 merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip and the Windows terminal matrix re-sign (#683)?
5. Should the review-gate retry-cap fix land before the Final Phase gates, given #759 needs a manual dispatch after every crash?
6. Does the pending sibling run `40561354356` stand down cleanly after the eval dispatch?

- Hephaestus, the Maintainer
