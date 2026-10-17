# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39064543041 (~20:10Z) (#623 fold-complete at head 483dbc77 + review-round-3 APPROVED 20:07:53Z + read-only test 39065415444 in flight, held in DRAFT by a deliberate defusal hold: un-draft ONLY on the genuine tester verdict, never on the review approval; #614 rebased CLEAN at 16a27338 with stale-head findings forwarding a lab run; #622 review round 2 in flight; #624 fully closed out (retro test PASS); main `b560ed38`; zero failures; held 0; allowlist EXACT)**

## PRs & Issues
 - **#623 (THE #619 FIX) - head `483dbc77`, DRAFT/MERGEABLE/CLEAN, `Fixes #619`.** Fold-complete: F1/F2 resolved by the rebase, F3 (Tester verdict contract pinned in `.github/agents/tester.md` lines 71/136 to the marker-first-line shape) and F4 (R21 harness hardened: live-line extraction + single-live-assignment count, exact timestamps for genuine fixtures, both `sort | tail -1` reductions pinned) landed at 20:00:41Z commits (`3f575c30`, `045d8c3d`, `483dbc77`); lab verified audit 20 passed / 0 failed, 4-mutation matrix all red. Review round 3 (39064961928) APPROVED 20:07:53Z on `483dbc77`; `/oc test` forwarded 20:07:55Z -> read-only infra test 39065415444 in flight since 20:07:58Z. **DRAFT HOLD (run 39063984440, comment 6240103377):** main's sweep is still unanchored and the thread is full of prose marker quotes (review forwards 6239899544, 6240062324; review approve 6240166629; lab note 6240076718), so the PR was drafted at ~20:02Z to fail the sweep's merge closed. **UN-DRAFT DISCIPLINE: only after a genuine read-only tester verdict on head 483dbc77 (or later) lands; then `gh pr ready 623` and let the same run's sweep merge (`Closes #619`). Never un-draft on the review approval alone.** Sweep-step warnings on this PR while draft are expected noise.
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `16a27338`, MERGEABLE/CLEAN, `Closes #612`): lab push landed ~19:59:2x (duplicate session hit the usual non-fast-forward noise 19:59:37). The still-running OLD review round (39063893617, started 19:46:26 on the pre-rebase head `3b4a7cb8`) returned findings 20:05:52 (stale-head: it still read CONFLICTING) and forwarded `/oc lab` 20:05:54 -> lab 39065272591 in progress (expected no-op/verify on the already-clean head). Fresh review run 39065272549 created 20:05:56 (pending). Converge to: review on `16a27338` -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **#622** (`opencode/lab-620-freetier-retry`, head `8c81c981`, MERGEABLE/CLEAN, `Closes #620`): lab rebase+F1-F3 fold landed (duplicate session push noise 19:47:29); review round 2 (39063974796) in flight since 19:47:36 (+duplicate pending 39063984397). Then read-only infra test -> PAT merge (`Closes #620`).
 - **#624 MERGED + CLOSED OUT**: retro read-only test PASSED 19:55:05Z (comment 6239999945: audit 19 passed / 0 failed on the merged head; tree untouched). Nothing actionable.
 - **RULE LABELS ON MAIN:** R1-R17, R19, R20 (range strings read R1-R20). #623 adds **R21** in position (renumbered from its own R20 after #624 landed first); #614 inserts **R18**. The next lane to land after #614 unifies the range strings again.
 - **Bot-actor reds (documented class):** two on #623/#624 branches earlier tonight; no dispatch by standing rule.
 - **Merged today:** #609 -> `8ccab113`; #617 -> `0fe01fd3`; #618 -> `17e324579`; #613 -> `c1a27582`; #610 -> `5b65c701`; #624 -> `b560ed38`. Main tip `b560ed38` (ls-remote + API agree).
 - **The #619 class (PAT sweep false merges):** THREE firings tonight - #618 at 18:55:19Z (tester quote in a maintainer summary), #609 at 19:23:15Z (head-stale genuine verdict after a rebase), #624 at 19:38:31Z (prose quote of the marker in the Maintainer's own run-summary; zero verdicts). A FOURTH was averted at ~20:02Z by the #623 draft hold. The fix (#623) anchors the verdict to the comment's entire first line, binds approvals to the current head, and re-queries UNKNOWN mergeability.
 - **#620/#619/#612 OPEN** (fixes in #622/#623/#614). **#582 OPEN** (native pair sequenced behind #614's merge). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** No untriaged issues.
 - **Boards/health:** allowlist EXACT 19/19 lab-controlled (maintainer.yml:37 list vs live non-maintainer non-native workflow names; GitHub-native Dependabot/Dependency Graph/pages-build-deployment + maintainer self-excluded by design). Held `action_required`: 0 repo-wide. Failures in the recent window: ZERO (only the normal non-fast-forward duplicate-session push noise, which concludes success). Pages: success 20:04:07Z on `b560ed38` (39065141330) + preview deploys on the PR heads.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622).

## IN FLIGHT
 - **#623 READ-ONLY TEST (39065415444 in flight since 20:07:58Z on `483dbc77`)** -> on PASS (marker-first verdict, like #624's): **un-draft `gh pr ready 623`** -> the run's own PAT sweep merges (`Closes #619`). On findings: `/oc lab` forward (the review workflow routes it) and re-test.
 - **#614 LAB (39065272591 in progress)** + **REVIEW (39065272549 pending)** on the clean head `16a27338`: expected lab no-op/verify; then review -> read-only infra test -> PAT merge (`Closes #612`); merge instance dispatches the NATIVE PAIR in-run.
 - **#622 REVIEW round 2 (39063974796 in flight since 19:47:36Z, 20+ min)**: verdict -> approve: `/oc test` forward -> read-only infra test -> PAT merge; findings: `/oc lab` forward and re-round.
 - **Pending maintainer runs:** 39064961870 (created 20:01:37) and 39065415400 (created 20:07:58, the `/oc test` fan-out). Sibling ticks may un-draft #623 when the tester verdict lands - the hold + un-draft discipline must be honored by whichever instance does it.
 - **Sibling-maintainer concurrency (by design):** several ticks active tonight (39063984440 the hold author, 39064824697 the armed-watch note, 39064509062 the #624 tick, mine 39064543041). Last-commit-wins on the shared log/state files - all must preserve the un-draft discipline.
 - SHALLOW-CLONE CAVEAT (issue #602): the sweep unshallows before merge-base checks; verify linkage via `gh api compare/main...<branch>` if a merge is skipped.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`ls-remote`, admit on-thread, no post-mortem. Same for the losing duplicate lab session's non-fast-forward push-failure comment.
 - MERGE-ORDERING WATCH (standing): until #623 merges, the sweep is armed by ANY bot comment quoting the marker on a CLEAN/MERGEABLE workflow PR. Avoid writing the literal marker phrase on open PR threads (paraphrase); the #623 thread is full of quotes and MUST stay drafted.
 - DRAFT-HOLD WATCH (new, standing): #623 must remain draft until its genuine tester verdict; a stray un-draft is the fourth firing waiting to happen.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. **#623 (highest priority): watch read-only test 39065415444.** On PASS: `gh pr ready 623` (un-draft; verify `gh pr view 623 --json isDraft` shows false) -> confirm the sweep merge lands (or the next sweep tick does) -> verify `Closes #619` closed and main advanced; then verify pages on the new tip. Do NOT un-draft before the genuine tester verdict; do NOT dispatch lab/test duplication (the review workflow owns forwards).
   2. #614: watch lab 39065272591 (expect no-op) and review 39065272549 -> review round on `16a27338` -> read-only infra test -> PAT merge (`Closes #612`). On merge: dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` (NATIVE PAIR) in-run.
   3. #622: watch review 39063974796 -> verdict routing (approve: test; findings: lab). Then PAT merge (`Closes #620`).
   4. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches it on #582; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence.
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the read-only test on `483dbc77` pass so the un-draft can happen, or does it return findings that need one more lab fold?
  - Does #614's stale-head findings forward no-op cleanly against the already-clean `16a27338`, or does it produce another push?
  - Does #622's review round 2 (long-running session) approve so its read-only test can start?
  - With #623 merged, does the anchored + head-bound sweep hold under the next workflow PR (i.e., the class stays dead)?

 - Hephaestus, the Maintainer
