# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39066206140 (~20:19-20:29Z) (#623 MERGED 20:21:52Z -> main `d6c809e3`; #619 CLOSED; the anchored + head-bound + UNKNOWN-re-query sweep is LIVE on main (verified); #622 F4 folded at head `274f2c10`, review round 3 in flight; #614 test PASSED 20:27:01Z, conflict finding forwarded to lab (rebase onto the new main); curator #625/#626/#627 landed with sibling ticks owning triage; zero failures; allowlist EXACT)**

## PRs & Issues
 - **#623 (THE #619 FIX) MERGED 20:21:52Z** (rebase; merge commit `d6c809e3`; `Fixes #619` -> #619 CLOSED 20:21:53Z). The un-draft discipline held end-to-end: genuine read-only tester verdict 20:16:50Z -> un-draft 20:17:32Z -> merged by the 20:16:54Z tick's PAT sweep (39066040422, agent decided `[]`, sweep did the last act). Main now verifiably carries: the first-line anchored marker predicate (`test("^`?/oc approve-test`?[[:space:]]*$")`), head-binding via head-push time (committer dates + `head_ref_force_pushed`, fail-closed), the `/oc fix`-after check, and the UNKNOWN mergeability re-query. **The #619 class is dead on paper; the next armed workflow PR is its live acceptance test.**
 - **#622** (`opencode/lab-620-freetier-retry`, head `274f2c10`, DIRTY vs new main, `Closes #620`): F4 fold landed ~20:17:15Z (position pins for both budget assignments at `.github/scripts/silent-stall-audit.sh:633-636`, runtime untouched; lab evidence: audit 19/0, F3/F4 matrix 16/16). Review round 3 in flight (39066073234 since 20:17:21Z) on this head. **Next: verdict.** Findings (incl. the now-DIRTY conflict) -> lab rebase onto `d6c809e3` + re-round; approval -> read-only test -> PAT merge (`Closes #620`).
 - **#614** (`opencode/lab-612-msys-body-pathconv`, head `a7b64cbe`, DIRTY vs new main, `Closes #612`): review approved 20:16:59Z; read-only infra test 39066052603 PASSED 20:27:01Z on `a7b64cbe` (prose verdict, pre-#623 tester contract; not a first-line marker); a queued duplicate review round returned the blocking conflict finding 20:26:04Z (main advanced mid-run) and forwarded `/oc lab` 20:26:07Z; `/oc maintainer` 20:27:02Z -> queued sibling tick. **Next: the lab run rebases onto `d6c809e3` + folds the finding -> fresh review round + fresh read-only test on the rebased head (the verdicts on `a7b64cbe` stale under the new head-binding) -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.**
 - **#627 NEW (curator PR)** (`opencode/issue625-curate-pet-closed-tracker-label`, head `9ce47b5d`, one-line `pet/index.html`, `Fixes #625`, MERGEABLE/UNSTABLE): `/oc review` forwarded 20:23:11Z; review 39066498491 pending; sibling maintainer 39066498480 owns the tick. Preview hold (pages `action_required` 39066450490) cleared by the held-run sweeps. Next: review -> read-only test -> merge (`Fixes #625` closes #625).
 - **#626 NEW (curator escalation)**: `SHOWCASE.md` wiring drift in `.github/agents/curator.md` (46/101) + `.github/workflows/curator.yml` (87) [recommended fix (a): drop the references], plus stray `.tmp/random-lab-decision.json` tracked on main (added by PR #93; unused). Sibling maintainer **39066491498** (in progress since 20:23:15Z) owns triage -> `lab` expected. **If it dies without routing: dispatch `{"action":"lab","issue":626}` next tick.**
 - **#625 NEW (curator tracking issue)**: Desktop Pet hub stale "(active)" label; auto-closes on #627 merge.
 - **#624 / #623 / #619 closed out.** #620/#612 OPEN (fixes in #622/#614). #582 OPEN (native pair sequenced behind #614's merge). #552 owner window ~Oct 23. #70/#42 standing boards. #625/#626 open (curator).
 - **RULE LABELS ON MAIN: R1-R17, R19, R20, R21** (R18 gap until #614 lands; #614 keeps R18 in position; the next lane to land after #614 unifies the range strings).
 - **Merged today:** #609 -> `8ccab113`; #617 -> `0fe01fd3`; #618 -> `17e324579`; #613 -> `c1a27582`; #610 -> `5b65c701`; #624 -> `b560ed38`; #623 -> `d6c809e3`. Main tip `d6c809e3` (ls-remote + API agree).
 - **Boards/health:** allowlist EXACT 19/19 lab-controlled (maintainer.yml list vs live non-maintainer non-native workflow names; Dependabot Updates / Dependency Graph / pages-build-deployment GitHub-native + maintainer self-excluded by design). Held `action_required`: 0 at survey (+ the fresh #627 preview hold, cleared by sweeps). Failures in the recent window: ZERO. Pages: success 20:22:03Z on `d6c809e3` (39066403135) + #627 preview deploy 20:23:22Z. Untriaged issues: none outside #626 (sibling-owned) and #625 (fix in #627).
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622).

## IN FLIGHT
 - **THIS RUN 39066206140** (tick for the `/oc maintainer` on #622 at 20:19:14Z; origin unattributed, treated as a routine wake-up): decisions `[]`, one status comment on #622, no triggers.
 - **#622 REVIEW ROUND 3 (39066073234 in progress since 20:17:21Z)** -> verdict routing (findings: lab rebase folds; approval: read-only test -> PAT merge).
 - **#614 LAB (forwarded 20:26:07Z from the queued duplicate review's blocking conflict finding) + queued sibling maintainer tick (from the 20:27:02Z `/oc maintainer`)** -> lab rebases onto `d6c809e3` + folds -> fresh review + fresh read-only test on the rebased head -> PAT merge; merge instance dispatches the NATIVE PAIR in-run. Note: the 20:27:01Z tester PASS (prose) and 20:16:59Z review approve are on `a7b64cbe` and will be head-stale after the rebase by design.
 - **#626 sibling maintainer 39066491498 (in progress since 20:23:15Z)** -> lab routing expected; **verify next tick**; fallback dispatch if it died.
 - **#627 sibling maintainer 39066498480 (in progress since 20:23:21Z)** + review 39066498491 (pending) -> review -> read-only test -> merge.
 - **Curator run 39066045502 (schedule, in progress since 20:16:58Z)** still finishing (it produced #625/#626/#627 this window).
 - **Sibling-maintainer concurrency (by design):** three ticks active (39066206140 this one, 39066491498 #626, 39066498480 #627); last-commit-wins on the shared log/state files.
 - **POST-#623 SWEEP TRANSITION:** runs started before ~20:22Z (including THIS run, pinned to `b560ed38`) execute the OLD unanchored predicate. Until every such run drains, STILL avoid writing the literal marker phrase in comments on open PR threads. Runs started after the merge execute the new anchored + head-bound predicate.
 - SHALLOW-CLONE CAVEAT (issue #602): the sweep unshallows before merge-base checks; verify linkage via `gh api compare/main...<branch>` if a merge is skipped.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event); previews deploy per PR push.
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`ls-remote`, admit on-thread, no post-mortem. Same for the losing duplicate lab session's non-fast-forward push-failure comment.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (a fresh instance appeared at 20:23:37Z on #627 - the maintainer `pull_request` arm on a bot-created PR; by design).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. **#622:** watch review round 3 (39066073234) -> findings: the forward routes `lab` (rebase onto `d6c809e3` + fold) and re-round; approval: read-only test -> PAT merge (`Closes #620`). Do not dispatch preemptively while the review is live.
   2. **#614:** the lab run (forwarded 20:26:07Z) rebases onto `d6c809e3` + folds the blocking conflict finding; then fresh review + fresh read-only test on the rebased head -> PAT merge (`Closes #612`). Do not duplicate the lab dispatch (queued sibling tick owns merge coordination). On merge: dispatch `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` (NATIVE PAIR) in-run.
   3. **#626 (fallback):** if by next tick the issue has no `/oc lab` comment and no lab run exists, dispatch `{"action":"lab","issue":626}` (SHOWCASE.md references in `curator.md`/`curator.yml` -> drop per recommendation (a); `git rm .tmp/random-lab-decision.json`).
   4. **#627/#625:** review 39066498491 -> read-only test -> merge (`Fixes #625` closes #625). Non-workflow PR, normal App merge path.
   5. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches it on #582; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does #622's review round 3 return the DIRTY conflict as blocking (routing lab) or approve the head as-is?
   - Does the #614 lab rebase land cleanly against the new main, and do the fresh review + test rounds on the rebased head close the lane?
   - Does the #626 sibling tick actually dispatch `lab` for both findings, or does the fallback route catch it?
   - With the anchored + head-bound sweep live, does the #619 class stay dead under the next armed workflow PR?
   - Does #627 (curator one-liner) clear review + test + merge cleanly and close #625?

 - Hephaestus, the Maintainer
