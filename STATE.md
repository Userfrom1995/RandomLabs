# STATE

Last updated: 2026-10-27T18:26Z by run 40559643272 (review-approval wake on #759: the head-bound review approved `f19b712c` and the Tester is live; one short status posted, zero dispatches).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-27T18:26Z)

- **main** = `0f6318e6bb76c6b46ceb25beae9ef5866139f814`, unchanged since the 10:49:29Z Owner push. Pages production is green for it; the 18:11:14Z deploy `40557592406` succeeded (Preview rebuild for #771).
- **#759** `opencode/issue582-20261024225156`, head `f19b712c2743f3bba0ba97dcfbbabc19acd17eb4`, MERGEABLE/CLEAN. **The head-bound review APPROVED it** (run `40557136944`, 18:08:21Z to 18:24:16Z, verdict `test`, no blocking findings; report at 18:24:09Z). The workflow posted `/oc test` at 18:24:12Z and `opencode-test` run `40559652357` is live on the same head (agent step in progress at 18:26Z). Non-blocking docs drift only (stale 2026-10-24 progress counts, `web/e2e/README.md` redirect wording). This is the Phase 7 critical path. The PR-wide review auto-retry cap stays spent, so any further #759 review is a fresh manual head-bound dispatch.
- **#771** Curator docs PR, head `da6dd9bee240be870e11404825cdd8b011df1de4`, MERGEABLE/CLEAN. The fresh review run `40557558082` (18:11:01Z) is IN PROGRESS; a duplicate review trigger from the same minute is queued as run `40557583363` (18:11:11Z), harmless. #770 closes only on merge.
- **#770** Curator tracking issue (open, zero comments), the defect record for #771.
- **#745** `opencode/lab-742-owner-pat-env-sanitization` head `7a04fa4a`, CONFLICTING/DIRTY, parked post-delivery.
- **Curator**: schedule `40552616354` ran 17:39:15Z to 18:00:04Z SUCCESS and opened #770 + #771; next cron 00:00Z.
- **Auditor**: last daily `40447808966` (04:05Z) success; next daily 00:00Z.
- **Recover**: last `40520279256` (14:21Z) success, detect only; nothing stranded.
- **Issues**: 14 open, zero untriaged. #770 is the curator defect record (closes with #771); #754 the quota tracker; #742/#745 the PAT sanitization project; #683/#678/#677/#661/#660/#659/#657/#655/#582 the Maze Chase roadmap; #70/#42 the boards.
- **Health** (verified live this run): allowlist exact 19/19 item-for-item against the repo-defined workflow names (maintainer self-excluded; Dependabot Updates, Dependency Graph, pages-build-deployment are GitHub-managed and out of scope). Zero held (`action_required`) runs. Zero new failed/timed-out runs; the last three review failures (08:08Z, 10:49Z, 15:01Z) are the known #754 free-quota class, all triaged. No stale `opencode/schedule-*`/`opencode/dispatch-*` branches reported.
- **Owner directives active**: delivery-first (message 6358553065: delivery first, no unnecessary infra churn, lab changes only when genuinely necessary to unblock); Pages contrast fix (6349584523); terrain/river textures (6349595081); Browser/PWA smoothness guardrail (6350485765); no extra sweep (6358553065). Last Owner actions: the 18:08:17Z `/oc review (head f19b712c)` and the 18:24:12Z `/oc test` on #759.
- **Known deviations**: the review gate hard-fails on a quota death (correct) but does not classify it (#754); #759's PR-wide review auto-retry cap is exhausted, so every further review needs a manual dispatch; #745 parked/conflicting; the CLI's PR-thread bootstrap re-checkout on issue_comment maintainer runs; the memory-publish keep-both delta duplicated the prior run's `<!-- run: -->` marker line (cosmetic).

## Decisions this run

`.maintainer/decision.json` = `[]`. `.maintainer/comment.md` carries one short #759 status (review approved `f19b712c`, Tester live, next steps). `.maintainer/personality.md` empty. No `emergency.json`.
- No `review`: #759's review just approved and forwarded the Tester; #771's review is live with a queued duplicate.
- No `test`/per-OS/`eval`/merge: the #759 Tester run is live; no Tester or Council marker on any current head; per-OS arms are not needed for this browser-agnostic fix surface (the Final Phase owns deployed cross-platform acceptance).
- No `fix`: the current heads carry no pending findings.
- No `lab`: delivery-first directive; the only recent failures are the provider-side #754 quota class.
- No `curator`/`auditor`: their schedules own them (next 00:00Z).
- No `continue`/`architect`/`research`/`design`/`build`: Phase 7 waits on the Tester then Council; the Final Phase chains only after the merge.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, no stranded work, no ideation request.

## Callbacks

This run's hardcoded decision step posts nothing (empty list). The public status comment is posted on #759 by the hardcoded step. The PAT merge sweep evaluates #759, #771, and #745 and merges nothing (no Tester/Council markers). The approve-held-runs sweep finds zero held runs. Pages deploy `40557592406` succeeded. The memory publish appends this 2026-10-27 entry keep-both per #647.

## Next run

1. Watch the live #759 Tester run `40559652357`. On approval (re-read the head; a test-only commit may move it and force one fresh review), dispatch exactly one `eval` bound to the then-current head. On a Tester `fix` verdict the workflow's own handoff owns the fix round; do not duplicate.
2. Read #771's review verdict on `da6dd9be`: on approval the workflow posts `/oc test`; dispatch exactly one `eval` after the Tester approves and the head is re-read. The queued duplicate review run binds the same head and changes nothing.
3. On the Council's `approve-eval` for #759: verify freshness and head binding, merge head-bound (`--match-head-commit`, rebase, merge fallback only for non-linear history, never `--delete-branch`), close #660, flip Phase 7 in `progress/582-maze-chase-overhaul.md`, and immediately chain the Final Phase build on #582.
4. On #771's `approve-eval`: merge head-bound and close #770 (docs-only, no shipping-limit issue).
5. If a draw walls on the #754 class, record the wall time and hold 30 minutes before a fresh manual head-bound dispatch; the manual lane is not bounded by the spent PR-wide auto-retry count.
6. Post-delivery lab batch: #754 (quota classifier and fast-fail), the review-gate retry cap (head-bound/time-window counting), then #745. #769 is done.
7. Keep #683 open for the Final Phase released-artifact re-sign and the Windows terminal matrix; fold #677/#678 into the Final Phase roadmap and close #659/#655 there, not before.

## Open questions

1. Does the live Tester approve `f19b712c` without moving the head, or push a test-only commit that forces one more review draw?
2. Does #771's review approve `da6dd9be`, or return another docs finding?
3. Do the queued duplicate #771 review runs contend for the same quota bucket as the #759 Tester session?
4. Does the Council approve on the first draw for #759, or return a `fix` verdict?
5. After the #759 merge, does the Final Phase build start immediately and carry #655/#661/#582 to the stable `1.0.0` sign-off, including the real per-OS install/upgrade/uninstall round trip and the Windows terminal matrix re-sign (#683)?
6. Should the review-gate retry-cap fix land before the Final Phase gates, given #759 needs a manual dispatch after every crash?

- Hephaestus, the Maintainer
