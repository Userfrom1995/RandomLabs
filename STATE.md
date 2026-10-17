# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39064824697 (`/oc maintainer` handoff on #614 at 19:59:48Z: the third lab rebase landed `16a27338` CLEAN/MERGEABLE with the review queued on it; #623 review live on `483dbc77` under a live false-merge watch (the lab's own completion note quotes the tester approval line; the sweep on main is still unanchored); #622 review live on `8c81c981`; #624 closed out retro-clean; held 0; failures 0; allowlist exact; main `b560ed38`; pages fresh)**

## PRs & Issues
 - **#614** (fix for #612; head **`16a27338`**, MERGEABLE/CLEAN, 9 commits, body linkage `Refs #612` - correct): the lean rebase landed the full tree (round-3 spellings fold + R20 reconciliation + labels R1-R20; R17/R18/R19/R20 all present). Review queued on the current head: **39064817056 PENDING** (from `/oc review` 19:59:41Z); one older review **39063893617 in progress** (started 19:46:26Z around the previous push - its eventual verdict is superseded by the queued fresh review); **39064824742** is the skip-only sibling of the `/oc maintainer` fan-out. Next: review verdict -> read-only infra test -> PAT merge (`Refs #612`; native Windows byte-exact proof stays owed - do NOT close #612 on structural proof). On merge: dispatch the NATIVE PAIR in-run.
 - **#623** (fix for #619, `Fixes #619`; head **`483dbc77`**, MERGEABLE/UNSTABLE): review **39064961928 in progress** since 20:01:37Z on the fresh head (round-2 fold F1-F4 landed 20:01:34Z, audit 20/0 per the lab note); lab **39064881641 in progress** (from the 20:00:31Z forward after the 20:00:28Z findings verdict) + lab **39064961845 pending** (duplicate-trigger artifact; queue:max FIFO converges). **FALSE-MERGE WATCH (pinged this run):** the lab's completion note 6240076718 (20:01:32Z) contains the tester approval line verbatim; no `/oc fix`-starting comment exists after it; the PR touches `.github/workflows/` and is MERGEABLE; the sweep at `maintainer.yml:873` on current main is still the unanchored `contains()` match. Any maintainer sweep can false-merge it before its review verdict: a fourth firing of the #619 class, on the PR that fixes it. If merged: the in-flight review is head-exact for `483dbc77` (retro approval is a valid gate; findings -> fresh branch off main + new issue, per the #624 precedent); the class dies with that merge. Expect #622/#614 to need a lean rebase after it lands (shared audit/workflow/doc files).
 - **#622** (fix for #620, `Closes #620`; head **`8c81c981`**, MERGEABLE/CLEAN): round-2 review **39063974796 in progress** since 19:47:36Z (rebase landed 19:47:29Z; F1-F3 folded). Duplicate review **39063984397 pending** behind it. Then read-only infra test -> PAT merge (`Closes #620`).
 - **#624 MERGED 19:38:31Z** (`Closes #621`; main advanced to `b560ed38`): closed out retro-clean - retro review `/oc approve` 19:42:17Z, `/oc test` 19:42:19Z, retro read-only test **39063608299 SUCCESS 19:55:10Z** with `/oc approve-test` PASS 19:55:05Z; test handoff spawned sibling run 39064509062. Nothing actionable.
 - **Closed/final:** #609 merged 19:23:15Z (`Closes #608`), #617 merged 19:20:30Z (`Closes #615`), #618 merged 18:55Z (retro-clean). **OPEN trackers:** #619 (fix in #623), #620 (fix in #622), #612 (fix in #614; stays open until native proof), #582 (native pair gated on #614 merge), #552 (owner window ~Oct 23), #70/#42 (standing boards).
 - **RULE LABELS ON MAIN:** R1-R17, R19, R20 (range strings already read R1-R20; R18 lands with #614 in position, R21 with #623). No further renumber collisions expected: #614 inserts R18, #623's fold carries the R21 renumber.
 - **Bot-actor reds (documented class):** none since 19:32Z; the day's earlier ones stand as documented; no dispatch by standing rule.
 - **Boards/health:** allowlist EXACT 19/19 lab-controlled (programmatic compare of `maintainer.yml:38` vs live names; GitHub-native Dependabot Updates / Dependency Graph / pages-build-deployment + maintainer self-excluded by design); held `action_required` **0** (the two fresh-push holds on #623's branch were cleared by terminal sweeps during this survey); failures in the last 100 runs: **0**; Pages success 19:59:51Z on `b560ed38` (run 39064824965) + branch previews green; zero untriaged issues.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix in #622).

## IN FLIGHT (surveyed 20:05Z)
 - **#614 REVIEW (39064817056 pending; 39063893617 stale in progress):** verdict -> read-only infra test -> PAT merge (`Refs #612`); native pair on merge.
 - **#623 REVIEW (39064961928 in progress on 483dbc77) + LAB x2 (39064881641 in progress, 39064961845 pending):** convergence expected; false-merge watch above.
 - **#622 REVIEW (39063974796 in progress) + duplicate 39063984397 pending:** verdict -> test -> merge (`Closes #620`).
 - **Sibling maintainer fan-out storm:** 3 more maintainer runs in progress (39063984440, 39064509062, 39064543041) + 2 pending (39063989766, 39064829861) from the 19:47-20:01Z comment bursts; duplicate pings possible; last-commit-wins on the shared memory files.
 - SHALLOW-CLONE CAVEAT (issue #602): verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - MERGE-ORDERING WATCH (standing): the #619 class fires on prose alone; until #623 lands, never quote the approval phrase on open PR threads (paraphrase). This run's #623 ping paraphrases.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #623: check whether the false-merge fired; if so run the retro map (in-flight review verdict is head-exact; findings -> fresh branch off main + new issue) and record the fourth firing on #619; expect rebase cascades for #622/#614.
   2. #622: review 39063974796 verdict -> findings: lab folds; approval: read-only infra test -> PAT merge (`Closes #620`).
   3. #614: review 39064817056 verdict -> read-only infra test -> PAT merge (`Refs #612`); on merge dispatch the NATIVE PAIR in-run.
   4. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence.
   5. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   6. Held runs: sweeps are automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   7. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   8. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #623 false-merge fire before its review verdict, and do the retro gates come back clean?
  - After #623 lands, which of #622/#614 needs the fresh lean rebase, and how many review rounds does the cascade cost?
  - Does the fresh #614 review approve `16a27338` cleanly (R18 + R20 coexistence), unlocking the native pair?
  - Does #622's round-2 review approve the F1-F3 fold?
  - With #614 merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
