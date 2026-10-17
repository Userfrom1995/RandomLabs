# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39063984440 (PR-push wake-up on #622: F1-F3 fold + rebase landed as `8c81c981`, review round 2 live; #623 FULL F1-F4 fold landed as `483dbc77` but I DRAFT-HELD it at ~20:02Z to defuse the would-be FOURTH firing of the #619 class - review forwards quote the Tester marker and main's sweep is still unanchored; #614 duplicate lab pushed `16a27338`; #624 retro read-only test PASSED 19:55:10 and closed out; main `b560ed38`; held 0; allowlist exact)**

## PRs & Issues
 - **#623 (HIGHEST PRIORITY - DRAFT-HELD BY MAINTAINER):** head `483dbc77` (lab B full fold: F1 rebase + renumber R20 -> R21, all ranges R1-R21, F3 verdict contract pinned in `tester.md:71`/`:136`, F4 R21 harness hardening). **The PR is a DRAFT** - I converted it at ~20:02Z (run 39063984440) because the review forwards on thread (comments 6239899544 at 19:47:53Z, 6240062324 at 20:00:28Z) quote the Tester approval marker and main's unanchored PAT sweep would have merged a CLEAN/MERGEABLE head with zero Tester verdicts; a live replay of the exact sweep predicate confirmed the match. Lab runs C 39064881641 (in progress) and D 39064961845 (pending) from the old triggers may still push; review round 3 was triggered 20:01:34. **RELEASE RULE: only after a GENUINE Tester approval on the FINAL head does a Maintainer instance run `gh pr ready 623` in the agent phase; that same run's PAT sweep then merges (`Closes #619`). Never mark ready before the verdict; never merge with outstanding findings.** The anchored fix this PR ships is what kills the #619 class for every other lane.
 - **#622:** head `8c81c981` (rebase onto `b560ed38`; F1-F3 folded; branch ahead 6 / behind 0; CLEAN). Verified live by me: `action.yml` header credits the extended audit rule R15; the anchored F3 pins are present; `bash .github/scripts/silent-stall-audit.sh` 19 passed / 0 failed. Review round 2 in flight (39063974796 since 19:47:36). Next: verdict -> read-only infra test -> PAT merge (`Closes #620`). No marker on this thread (checked); if a future bot comment quotes it, the sweep could arm - the durable fix is #623.
 - **#614:** head `16a27338` (duplicate lab 39063143599 pushed 19:59:46 on top of 3b4a7cb8 from 39062870778; CLEAN). OLD review 39063893617 (started 19:46:26 on 3b4a7cb8) STILL in progress - its verdict will be head-stale on arrival; fresh review 39064817056 pending on `16a27338` (triggered 19:59:41). Next: fresh review -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
 - **#624 MERGED** 19:38:31Z (`b560ed38`). Retro read-only test 39063608299 completed SUCCESS at 19:55:10 and posted the Tester approval on the closed PR. Close-out complete; nothing pending.
 - **RULE LABELS ON MAIN:** R1-R17, R19, R20 (R18 claimed by unmerged #614; main range strings read R1-R20). #623 renumbers its rule to R21 and unifies to R1-R21 - pending merge. #622 extends R15 with no new number.
 - **#621 CLOSED. #619/#620/#612 OPEN** (vehicles #623/#622/#614). **#582 OPEN** (native pair sequenced behind #614). **#552 owner window ~Oct 23.** **#70/#42 standing boards.** No untriaged issues.
 - **Run-wiring facts (new):** the `/oc maintainer` comments on #623 at 19:55:36Z and on #614 at 19:59:48Z came from opencode-pr-trigger.yml on PR pushes (expected). The review workflow's infra forwards post `/oc lab fix review findings` then `/oc lab`, which is how lab runs C/D queued on #623.
 - **Boards/health:** main `b560ed38`; pages success 19:47:44Z; held runs 0; no new failures since the two documented bot-actor reds (19:31Z) - the older reds are pre-#620 provider deaths; allowlist EXACT 19/19; zero untriaged issues.

## IN FLIGHT
 - **#623 REVIEW round 3 (from 20:01:34Z, head `483dbc77`):** may be superseded by lab pushes C/D; verdict -> (if findings) lab folds -> review again; final genuine Tester verdict -> ready + sweep merge.
 - **#623 LAB C (39064881641 in progress) + LAB D (39064961845 pending):** old-trigger passes; expect pushes on the same branch; converge to one final head; no new lab triggers from me.
 - **#622 REVIEW round 2 (39063974796):** verdict -> read-only infra test -> PAT merge (`Closes #620`).
 - **#614 REVIEW (stale 39063893617, fresh 39064817056):** the fresh round governs; ignore a stale approve if the head moved.
 - **Maintainer concurrency (by design):** comment-fan-out and push wake-up maintainer runs queue; last-commit-wins on the shared log/state files.
 - PHRASE-BOMB WATCH (standing, until #623 merges): main's sweep matches `contains` on bot comments. The ONLY open PR currently carrying the marker is #623, which is draft-held by me. Never write the marker phrase (or any text containing it) on an open PR thread - paraphrase, as this run did.
 - SHALLOW-CLONE CAVEAT (issue #602): verify linkage with `gh api repos/.../compare/main...<branch>` and `gh pr view --json mergeable,mergeStateStatus` before merging.
 - PAGES WATCH (standing): re-dispatch after every new main tip (bot merges emit no push event).
 - EXPECTED WRAPPER-PUSH NOISE (standing): App-token push rejection on workflow-touching branches is expected; the PAT step lands the branch - verify via run log/`git ls-remote`, admit on-thread, no post-mortem.
 - TEST-CRASH RULE (standing): retry once; second consecutive silent death on same PR -> `lab`; never a third test.
 - BOT-ACTOR CLASS (standing): documented red + on-thread explanation; no dispatch.
 - Infra routing guard: anything touching `.github/**`, `.github/agents/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to `lab`, never `fix`/`continue`.
 - Orphan-main protection holds: verify the PR branch shares history with `main` before every merge.
 - IP hold (standing): God of War commission declined; original mythic-duel alternative awaiting owner.
 - Standing-board close guard: #70 and #42 never carry `Closes`.
 - Shipping limit: max 2 new-project merges/day (not binding; no new-project PRs in flight).

## NEXT-RUN PLAYBOOK
   1. **#623 FIRST:** if a genuine Tester approval sits on the FINAL head (no lab push after it): run `gh pr ready 623` during the agent phase; that run's PAT sweep then merges (`Closes #619`). If the approval is on a superseded head, do NOT ready; fold and re-review. If lab C/D are still in flight, wait.
   2. #622: watch review 39063974796 -> read-only infra test -> PAT merge (`Closes #620`). If any bot comment on the thread gains the marker before a Tester verdict, draft-hold it the same way I held #623.
   3. #614: let review 39064817056 govern (ignore the stale 39063893617 verdict); -> read-only infra test -> PAT merge (`Closes #612`); on merge dispatch the NATIVE PAIR in-run.
   4. #624: closed out; nothing.
   5. NATIVE PAIR (first-action rule): the instance that merges #614 dispatches `{"action":"test-macos","issue":582}` + `{"action":"test-windows","issue":582}` on #582 in-run; fully green -> parity-row fold + #552 decision; defects -> `fix` with the report evidence.
   6. Pages: confirm success after any new main tip; else `gh workflow run pages.yml`.
   7. Held runs: sweep is automatic; if any `action_required` survives, investigate and ping the owner if manual approval is needed.
   8. #552 owner confirmation outstanding (7-day human rule ~Oct 23).
   9. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - After #623 merges, does the anchored predicate stop the class immediately, or does head-binding reveal another gap?
  - Do labs C/D push again, forcing another review round on #623, or does `483dbc77` remain the final head?
  - Does #622's review round 2 approve on `8c81c981` or return findings?
  - Does #614's stale review 39063893617 return a verdict that confuses the handoff before the fresh round lands?
  - With #614 merged, do the fresh native arms go fully green so the parity rows flip and the #552 retirement decision unlocks?

 - Hephaestus, the Maintainer
