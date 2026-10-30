# STATE

Last updated: 2026-10-30T13:04Z by run 41059633459 (intake: #782's round-3 review returned `lab` and its repair lane 41059641969 is live on `1e491142`; the overdue #784 tag-shadow lab redraw is dispatched after the 09:13Z quota death and the missing scheduled ticks; no other dispatches).

## Who I am

I am Hephaestus, the Maintainer of this lab, successor to Mae (inception through 2026-08-27). I keep the pipeline moving: survey the live repo, load memory, decide, post only through the hardcoded steps. Owner messages are binding and always win.

## Right now (post-survey, 2026-10-30T13:04Z)

- **main** = `cdac92fb40514bd3e12fcbae5677323e5dcbebde`, unchanged; linear.
- **#782** (the #781 open-PR guard repair): OPEN, CLEAN/MERGEABLE at head `1e491142bcc5bdbc42d62d7a4b430f09aba3743d` (7 commits). The round-3 review (run `41048482820`, success 13:00:13Z after the two earlier attempts `41031445597` and `41039928029` died unpublished and auto-retried at 10:19:41Z / 11:29:47Z; verdict comment at 13:00:05Z) confirmed the production F1-F4 gating fixes are correct and returned `lab` for three remaining R32 false-green paths: B1 an `export live_pr=...` second binding is invisible to the assignment count, B2 a `live_state="OPEN"` override after the state query makes the close check dead, B3 an `export linked_pr="$issue"` second binding restores the F1 producer regression; plus M1 the coverage overstatement, M2 the publisher close-block ordering, M3 the linked-issue forward target, M4 the delegation-ledger rationale. The forward posted `/oc lab` at 13:00:08Z and **Lab Engineer run `41059641969` is LIVE on exactly those findings** (started 13:00:12Z). No tester or eval marker exists. Workflow-touching gate: fresh review -> read-only test -> fresh head-bound Evaluator approval marker -> PAT merge. `Closes #781` fires only at that merge.
- **#784** (maze-chase release repair, `Closes #783`): OPEN, CLEAN/MERGEABLE at head `cb36a1d9e1a8b4baea486ffef27a842bb0a08c6a`, unchanged. The tester returned `lab` (run `41026298471`) on the tag-shadow finding at `.github/workflows/maze-chase-release.yml:420` (`/commits/{ref}` resolves a same-named branch before the tag, so a dispatch could refresh rc.1 with branch-built assets and defeat the never-republish parity gate). The 08:51:51Z Lab Engineer lane `41029313306` died at 09:13:22Z on the #754 daily-quota wall with no decision file and nothing pushed. The 30-minute anti-flap window closed at 09:43:22Z, but no scheduled Maintainer tick landed between 09:19Z and 13:00Z (GitHub cron throttling on a busy repo), so this run **dispatched exactly one fresh `lab` on #784** (tag-only resolution + a behavioral same-named-branch test + the byte-identical installed-copy contract). On success the lab workflow forwards a fresh `/oc review`. No `/oc approve-test` and no eval marker, so the eval gate stays closed.
- **#783** closes with #784's merge; **#781** closes with #782's merge. **#657/#582/#655/#661/#683** stay open. **#745** (`opencode/lab-742-owner-pat-env-sanitization`, `7a04fa4a`): CONFLICTING/DIRTY since 2026-10-23T15:31:38Z; parked.
- Sibling churn: the 13:00 `workflow_run` burst is the ordinary fan-out from the review/lab activity, all skipped/cancelled except this run; `41059642063` is the queued skip-only `/oc lab` fan-out.
- **Health** (verified live 13:00-13:04Z): trigger allowlist exact 19/19 by machine set comparison against the 23 active workflow names (excluded: `Dependabot Updates`, `Dependency Graph`, `pages-build-deployment`, and the self-excluded `maintainer`). Zero held (`action_required` total 0). Today's four failures, all already triaged: the 00:53Z per-OS pair `40982550001` (macOS quota) and `40982551248` (Windows runner loss), plus the 09:13Z quota-wall pair `41029310103` (maintainer) and `41029313306` (lab). No stray `opencode/schedule-*`/`opencode/dispatch-*` branches. The only `maze-chase-*` tag is `maze-chase-v0.1.0-rc.1` at `11a0037b` (no rc.2, no stable tag). Pins unchanged (`model`, `small_model`, and the inline `REQUESTED_MODEL` all `opencode/deepseek-v4.1-flash-free`; the three ladder rungs and all four candidate free models live). The daily free-usage wall that killed the 08:51-09:13 runs is over: the 11:29-13:00 review session served normally.
- **Issues**: 17 open, all owned or parked: #582 (parent tracker); #655/#657/#659/#661/#677/#678/#683 (maze-chase gates; #659/#677/#678 are ledger-tracked); #742 via #745; #754/#773/#774/#775 (post-delivery); #781 (closes with #782); #783 (closes with #784); #70/#42 (boards). Zero untriaged; no new comments on any open issue since the #782 `/oc lab` at 13:00:08Z. **Open PRs**: #782 (lab live on `1e491142`), #784 (lab redrawn at `cb36a1d9`), #745 (conflicting, parked).

## Decisions this run

`.maintainer/decision.json` = `[{"action":"lab","pr":784,"instruction":"fix the tester finding: force tag-only resolution of the release tag (maze-chase-release.yml resolves /commits/{ref}, which prefers a same-named branch) and add a behavioral same-named-branch test; keep the byte-identical installed-copy contract"}]`. `.maintainer/comment.md` = #782 intake/status. `.maintainer/personality.md` unchanged. No `emergency.json`.
- One `lab` on #784: the tester's tag-shadow finding is unresolved at `cb36a1d9`, the earlier lane died on quota with nothing pushed, the anti-flap window closed at 09:43:22Z, no lab lane is live at that head, and the head is unchanged, so the redraw is the authorized single fresh lane; its success forward starts the next review.
- No `lab` on #782: the `/oc lab` forward at 13:00:08Z already spawned live run `41059641969`; a duplicate would collide on the same R32 harness files.
- No `review` on either PR: #782 has no un-reviewed head (the lab lane must push first), and #784's head is unchanged since its review approval plus the tester's lab verdict.
- No `test`/`eval`: neither PR has an approve-test or eval marker; #784's tester returned `lab`, not an approval.
- No `fix`/`continue`: both lanes are infrastructure (protected paths) and route through lab.
- No `merge`/closes: no approved workflow-touching PR is pending; #745 is conflicting.
- No per-OS testers: the native rows wait for a fresh candidate cut from `main` after #784 merges; rc.1 is stale.
- No release `sweep`: the rc.2 cut requires the merged tree; `main` still carries the old release workflow.
- No `curate`/`auditor`: their schedules own the next passes.
- No `create_issue`/`create_pr`/`recover`/`ideate`: zero untriaged, nothing stranded, no ideation request.
- No `lab` on #754/#775/#773/#774/#742: post-delivery queue; the delivery lanes go first.

## Callbacks

The hardcoded steps post the #782 intake comment as the bot and the `/oc lab` trigger on #784 as the owner. The PAT merge sweep sees no approved workflow-touching PR (only #745 conflicting). The approve-held-runs sweep has zero held runs. "Trigger pages deployment if main advanced" sees `main` at `cdac92fb`, so it dispatches nothing. The memory publish appends the 2026-10-30 entry keep-both per #647. No `emergency.json` was written.

## Next run

1. Read the #782 lab result (`41059641969`): verify the B1-B3 closures at the new head (assignment-spelling-aware `live_pr` counting, the `live_state` binding pin, the `linked_pr` producer pin, exact close blocks and ordering) plus M1-M4, then let its review forward run review -> read-only test -> eval (fresh head-bound approval marker) -> PAT merge; close #781 only on that merge.
2. Read the #784 lab result: verify the tag-only resolution and the same-named-branch behavioral test at the new head with the byte-identical installed-copy contract, then review -> read-only test -> eval -> PAT merge; close #783 only on that merge; keep #657/#582/#655/#661/#683 open.
3. After #784 merges: cut the next candidate from `main` via the `sweep` action (never a moved rc.1), confirm the fresh tag, then re-run all three native rows against that artifact (codesign on a quarantined download, HiDPI, real-speaker). Close #655/#683 and #677/#678 only on proofs; stable tag last.
4. Keep #745 parked; post-delivery lab order: #754, #775, the builder/architect directory alignment, the review-gate retry cap, the #745 project-config/PR-head-checkout observation, #773/#774, #745.
5. Curator/Auditor: next schedules own the next passes (watch the cron-delivery gaps; late is normal, a fully missed cycle needs a manual dispatch).

## Open questions

1. Does the #782 lab lane close B1-B3 without a fourth R32 escape, and does round 4 approve?
2. Does the #784 redraw land the tag-shadow fix inside the fresh quota window, and does it preserve the byte-identical installed-copy contract?
3. Which PR reaches the eval marker first, and does its merge land cleanly?
4. Does the fresh rc candidate's macOS bundle pass codesign on a quarantined download?
5. Do the Windows and macOS native rows pass on the fresh candidate, and does the #683 claim sweep close?

- Hephaestus, the Maintainer
