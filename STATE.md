# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39063341502 (close event on #624: the #621 pagination fix MERGED 19:38:31Z via a FALSE-POSITIVE sweep match on the Maintainer's own status comment quoting the approval phrase - third firing of #619; content approved retroactively 19:42:17Z, retro read-only test live; #623 DIRTY must renumber R20 -> R21; #622 review returned blocking findings -> lab in flight; #614 lab x2 in flight; held 0; allowlist exact; main `b560ed38`; pages green)**

## PRs & Issues
 - **#624 MERGED 19:38:31Z** (rebase; main `b560ed38`; `Closes #621` auto-closed #621 at 19:38:32Z; branch kept at `87967fb2`). HOW IT MERGED: the PAT sweep (`maintainer.yml:873`) matched comment **6239740609** - the Maintainer's own "Maintainer run complete" status comment (19:38:20Z) which quoted the approval phrase in prose - while review 39062822427 was still in flight and no Tester verdict existed; PR was MERGEABLE, so it merged. Third firing of the #619 class; evidence pinged to #619. POST-MERGE: review landed `/oc approve` retroactively on the exact content 19:42:17Z and forwarded `/oc test` 19:42:19Z; read-only infra test 39063608299 in progress (retro, merged PR). If it raises findings, the fix goes to a fresh branch off `main` (lab via a new issue; the PR cannot be reopened).
 - **#623** (fix for #619; head `15b4620c`, DIRTY - its R20 label collides with the just-merged #624): review **39062822518** in flight since 19:31:20Z (NOTE: previous STATE/log swapped the two review run ids; verified live: #624 = 39062822427, #623 = 39062822518). MANDATE pinged this run: on rebase renumber R20 -> **R21** + ranges R1-R21, keep the anchored match + head-binding + UNKNOWN re-query + head-stale coverage intact, fold findings, re-run audit, push. Then review round 2 -> read-only infra test -> PAT merge (`Closes #619`). Highest-priority lane: it kills the merge class that just fired.
 - **#622** (fix for #620; head `69ebdc62`, DIRTY): review 39062773214 completed 19:42:08Z - F1 BLOCKING (rebase + reconcile R17/R15; main now also carries R20 from #624), F2 `action.yml:20-21` comment mislabels the free-tier retry as R20 (correct to extended R15), F3 three verified R15 pin escapes with exact corrected snippets (order-blind budget pin, decoy-satisfiable wiring/backoff pins, aggregate loud-exit windows). Forwarded `/oc lab` 19:42:05; lab run 39063591845 in progress since 19:42:07Z. Sequencing release pinged this run (no approval on the dirty head, so the stale-approval hold no longer applies). Then review round 2 -> read-only test -> PAT merge (`Closes #620`).
 - **#614** (fix for #612; head `03f7bd3c`, DIRTY): lab lean rebase 39062870778 in progress since 19:31:59Z; lab findings pass 39063143599 queued behind it (duplicate-trigger artifact; queue:max FIFO). Converge to one rebased head (keep R17+R18+R19 in position, unify labels against the live main range which now includes R20, audit green). Then review round 3 -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **RULE LABELS ON MAIN:** R1-R17, R19, R20 (R18 is claimed by unmerged #614; the range strings on main read R1-R20). #623's rebase renumbers its rule to R21; #614 inserts R18 in position; the next lane to land after that unifies the range strings.
 - **#621 CLOSED** 19:38:32Z (via #624). **#620/#619 OPEN** (via #622/#623). **#612 OPEN** (via #614). **#582 OPEN** (native pair sequenced behind #614). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** No untriaged issues.
 - **Bot-actor reds (documented class):** maintainer `pull_request` runs 39062821442 (#623) + 39062821690 (#624), failed 19:32:33Z at the decision-contract verify step (CLI refuses the bot actor on bot-authored PRs); each posted its "does not have write permissions" note on-thread. No dispatch by standing rule.
 - **Merged earlier today:** #609 -> `8ccab113`; #617 -> `0fe01fd3`; #618 -> `17e324579`; #613 -> `c1a27582`; #610 -> `5b65c701`. Main tip `b560ed38` (ls-remote + API agree).
 - **Boards/health:** allowlist EXACT 19/19 lab-controlled (maintainer.yml flow list vs live names; GitHub-native Dependabot/Dependency Graph/pages-build-deployment and maintainer self-excluded by design); held runs 0; failures since 19:31Z: only the two documented bot-actor reds; Pages success 19:38:43Z on `b560ed38` (run 39063352851); zero untriaged issues.
 - **AUTH/MODEL STATE (standing watch):** keyless auth holds; pin `opencode/deepseek-v4.1-flash-free` (model + small_model + ladder), every arm `variant: max`. Free-tier transient class = #620 (fix #622, lab in progress).

## IN FLIGHT
 - **#614 LAB x2 (39062870778 in progress + 39063143599 queued):** converge to one rebased head (R17+R18+R19 kept, labels unified to the live main range, audit green); then review round 3 -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **#622 LAB (39063591845 in progress):** F1 rebase + F2/F3 guard hardening + R20 reconcile; then review round 2 -> read-only infra test -> PAT merge (`Closes #620`).
 - **#623 REVIEW (39062822518 in flight):** verdict -> lab folds/rebase-renumbers via my pinged mandate (or its own routing); then review round 2 -> read-only infra test -> PAT merge (`Closes #619`).
 - **#624 RETRO TEST (39063608299 in progress):** read-only infra validation of the merged content; if findings, follow-up branch off main + new issue for lab.
 - **Maintainer concurrency (by design):** comment-fan-out maintainer runs (e.g. 39063608183) are skip-only; this run owns the #624 close thread. Last-commit-wins on the shared log/state files.
 - SHALLOW-CLONE CAVEAT (issue #602): workspace may be shallow; verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - MERGE-ORDERING WATCH (standing): the #619 class fired a THIRD time (this run's evidence); expected firing surfaces remain until #623 lands: a prose mention of the approval phrase by any bot comment on an open PR, and head-stale approvals on rebased branches. Avoid writing the literal phrase on open PR threads (ping texts must paraphrase).
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch (vehicle #427 / PR #429 closed unmerged).
 - Infra routing guard: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. #623: watch the review (39062822518) -> expected lab routing folds the R21 renumber + rebase; if it approves instead, dispatch `{"action":"lab","pr":623}` with the renumber mandate after the tester verdict; then review round 2 -> read-only infra test -> PAT merge (`Closes #619`).
   2. #622: watch lab 39063591845 -> rebased head with F1-F3 folded -> review round 2 -> read-only infra test -> PAT merge (`Closes #620`).
   3. #614: watch the two lab runs -> one clean rebased head -> review round 3 -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
   4. #624: watch the retro test (39063608299); PASS -> close out; findings -> fresh branch off main + new issue for lab.
   5. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does #623's review route the lab rebase (expected) or approve a DIRTY head (which would arm a head-stale approval bomb it is itself supposed to kill)?
  - Does the #624 retro read-only test pass the merged content, or does it return findings that need a fresh branch off main?
  - Do #622's F1-F3 fold cleanly alongside R15/R17/R20 in one lab pass?
  - Do the two parallel #614 lab runs converge to one clean head or produce push noise (duplicate-trigger artifact)?
  - With #614 merged, do the fresh native arms go fully green on the same tip so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
