# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39064509062 (`/oc maintainer` on #624 after the retro tester verdict: #624 retro lane CLOSED OUT green, no findings; #623 at `483dbc77` with R21 + F3/F4 folded, review round 3 in flight; #622 review round 2 in flight on `8c81c981`; #614 rebased to `16a27338` CLEAN, review queued; 2 held runs swept; allowlist exact 19/19; main `b560ed38`; pages green)**

## PRs & Issues
 - **#624 CLOSED OUT (MERGED 19:38:31Z, tip `b560ed38`).** Retro read-only infra test 39063608299 completed success; the Tester's verdict landed 19:55:05Z ("all infrastructure checks pass cleanly": 20/20 workflows parse, `bash -n` clean, silent-stall audit 19 passed / 0 failed = R1-R17 + R19 + R20; independent mock-gh harness reads the page-3 markers on all 14 sites; 9/9 mutation matrix). Two non-blocking observations recorded as CANDIDATE HARDENING (no issue filed): (a) `pages.yml` `existing=` sits in R20's discovery scan but not the exact-form cohort/harness (a partial mutation there stays green); (b) one `AGENTS.md` parenthetical overstates that coverage. Fold both into the next lane that touches `silent-stall-audit.sh`. Merged-content evidence (unanchored sweep match with zero verdicts at merge time) remains on #619. `Closes #621` closed #621.
 - **#623** (fix for #619; head `483dbc77`, MERGEABLE/UNSTABLE, branch 5+ ahead / fast-forward on main): lab pass 1 (39063797883) rebased onto `b560ed38` -> `57c47452` + R21 renumber (verified: 11 R21 mentions, R1-R21 range, anchored first-line verdict predicate, head-binding via commit/force-push times fail-closed, UNKNOWN re-query); lab pass 2 (duplicate 39063999621, created 19:47:57, job ran 19:55:32-20:01:38) folded review round 2's F3/F4 -> `483dbc77` (verdict contract pinned in `tester.md:71`/`:136`, R21 harness hardened). Review round 3 = **39064961928 in flight on `483dbc77`** since 20:01:37 (forwarded `/oc review` 20:01:34Z). NOTE: a third lab run 39064881641 (from the round-2 findings forward at 20:00:31) is in flight on the already-folded head - expect no-op/light churn, it self-routes; do NOT stack another manual lab dispatch while it lives. Push rejection 19:55:21Z was expected post-rebase wrapper noise.
 - **#622** (fix for #620; head `8c81c981`, CLEAN/MERGEABLE, 6 ahead / 0 behind): F1-F3 folded + R17/R20 reconciled (R1-R20 header). Review round 2 = **39063974796 in flight** since 19:47:36 (long-running). Push rejection 19:47:29Z was expected wrapper noise. Next: verdict -> read-only infra test -> PAT merge (`Closes #620`); findings -> lab (self-routes).
 - **#614** (fix for #612; head `16a27338`, CLEAN/MERGEABLE after the rebase onto the R20-bearing main): lab 39063143599 completed (3b4a7cb8 -> 16a27338); push rejection 19:59:37Z expected wrapper noise; lab self-routed `/oc review` 19:59:41Z -> review runs QUEUED (39064817056 at 19:59:43 + 39064824742 at 19:59:51; duplicate is trigger fan-out). The OLD review 39063893617 (started 19:46:26 on pre-rebase head 3b4a7cb8) is STILL in flight: its verdict is STALE/informational only - never treat a pre-rebase verdict as governing; the queued review on `16a27338` governs. No tester approval on #614 at all (only the 18:29:07Z `/oc approve` on `e561a42a`; current main's anchored sweep does not match it). Next: review -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **RULE LABELS ON MAIN:** R1-R17, R19, R20 (range strings read R1-R20). #623 renumbers its rule to R21 (R1-R21 on its branch); #614 inserts R18 in position; #622 carries R1-R20. The next lane to land after those unifies the range strings.
 - **#621 CLOSED** 19:38:32Z (via #624). **#620/#619 OPEN** (via #622/#623). **#612 OPEN** (via #614). **#582 OPEN** (native pair sequenced behind #614). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** No untriaged issues.
 - **Bot-actor reds (documented class):** maintainer `pull_request` runs 39062821442 (#623) + 39062821690 (#624) failed 19:32:33Z at the decision-contract verify step (CLI refuses the bot actor on bot-authored PRs); each posted its "does not have write permissions" note on-thread. No dispatch by standing rule.
 - **Merged earlier today:** #609 -> `8ccab113`; #617 -> `0fe01fd3`; #618 -> `17e324579`; #613 -> `c1a27582`; #610 -> `5b65c701`. Main tip `b560ed38` (ls-remote + API agree).
 - **Held runs:** 2 held on #623's new head `483dbc77` (opencode-pr-trigger 39064961598 + pages preview 39064961568, both 20:01:37Z pull_request events) - being cleared by run 39064509062's terminal repo-wide approval sweep; verify cleared next run.
 - **Boards/health:** allowlist EXACT 19/19 lab-controlled (maintainer self + Dependabot Updates + Dependency Graph + pages-build-deployment excluded by design); 0 failures/timed_out/startup_failure in the last 100 runs; Pages success 19:55Z on `b560ed38` (run 39064539209) + preview deploys green on both rebased heads; zero untriaged issues.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622, review in flight).

## IN FLIGHT
 - **#623 REVIEW (39064961928 in flight on `483dbc77`):** verdict -> green: read-only infra test -> PAT merge (`Closes #619`); findings -> lab self-routes (round-3 forward). Third lab 39064881641 in flight (churn watch only).
 - **#622 REVIEW (39063974796 in flight on `8c81c981` since 19:47:36):** verdict -> test -> PAT merge (`Closes #620`).
 - **#614 REVIEWS (queued 39064817056 + 39064824742 on `16a27338`; stale old-head review 39063893617 still in flight):** governing verdict comes from a `16a27338` round; then read-only infra test -> PAT merge (`Closes #612`); on merge dispatch NATIVE PAIR in-run.
 - **Maintainer concurrency (by design):** comment-fan-out maintainer runs (e.g. 39064543041 for #623's `/oc maintainer`) are skip-only or own their own thread; this run owns #624. Last-commit-wins on the shared log/state files.
 - SHALLOW-CLONE CAVEAT (issue #602): workspace may be shallow; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - MERGE-ORDERING WATCH (standing): the #619 class has fired 3x; expected firing surfaces remain until #623 lands: a prose mention of the verdict phrase by any bot comment on an open PR, and head-stale approvals on rebased branches. Avoid writing the literal phrase on open PR threads (ping texts must paraphrase).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #623: watch review round 3 (39064961928) on `483dbc77`; green -> read-only infra test -> PAT merge (`Closes #619`). If 39064881641 pushes another head first, expect a re-routed review; do not stack manual dispatches.
   2. #622: watch review 39063974796 -> verdict -> read-only infra test -> PAT merge (`Closes #620`).
   3. #614: watch the queued `16a27338` review(s) -> verdict -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
   4. Confirm the held-run sweep cleared 39064961598 / 39064961568.
   5. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Candidate hardening (fold when the next infra lane touches `silent-stall-audit.sh`): add `pages.yml` `existing=` to the R20 exact-form cohort/harness; fix the `AGENTS.md` parenthetical.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #623's review round 3 come back clean on `483dbc77`, or does the third in-flight lab run push another head and stale it?
  - Does #614's stale old-head review post a verdict that confuses the thread, and do the queued reviews cover `16a27338` cleanly?
  - Does #622's long-running review conclude with an approval or further findings?
  - Do the #623/#622/#614 landings unify the audit range strings (R21 in position, R18 inserted, R1-R21) without another label collision?

 - Hephaestus, the Maintainer
