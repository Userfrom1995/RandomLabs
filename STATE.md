# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39090693581 (~02:39Z) (owner `/oc maintainer` nudge on #636: the lab F1/F2 fix landed as `7e59b0a8` and review round 2 is live on exactly it; #635 Council live; #637 lab hardening live; zero dispatch).**
 - Prior checkpoint: run 39090519833 (~02:36Z, #637 review-publication hardening dispatched to the Lab Engineer).

## PRs & Issues
 - **#636** (verified-release PR for #582, `opencode/issue582-verified-release`, head `7e59b0a887a07ddea01568c0af513c9bf33732e9`, MERGEABLE/CLEAN, `Closes #582` at body line 3): LAB F1/F2 FIX LANDED (commit 02:34:38Z, files exactly `maze-chase/index.html` + `progress/582-maze-chase-rust-migration.md`, diff verified via the commits API). REVIEW ROUND 2 LIVE (39090606122 since 02:35:02Z on exactly `7e59b0a8`). PATH: approve -> Tester read-only (infra-class via the Builder decision record) -> machine marker -> dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; re-verify #619/#629 bindings) -> #582 auto-closes -> explicit #552 retirement step. A fix verdict again auto-rewrites to lab (expect it).
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): QUALITY COUNCIL LIVE (39089476658 since 02:16:04Z; agent step 02:16:07Z, ~22 min at survey; #631 precedent 16.4 min; 75-minute cap). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept) -> #634 auto-closes; findings -> Fixer with the exact items.
 - **#637** (review-publication contract hardening): LAB ENGINEER LIVE (39090684597 since 02:36:16Z, armed by the previous tick's `/oc lab` at 02:36:14Z). Next tick: watch branch/PR; workflow-touching PR -> review -> Tester read-only -> eval -> PAT-backed merge.
 - **#634**: closes on #635 merge. **#582**: closes on #636 merge. **#552**: post-release retirement step (owner window ~Oct 23). **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631. Main tip `c672f443` (ls-remote + API verified, unchanged since the 01:51:48Z #631 merge).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0. **Failures:** only the triaged review run 39089530715 in the last 100.

## IN FLIGHT
 - **#636 REVIEW ROUND 2** on `7e59b0a8`. Next tick: read the verdict; approve -> Tester read-only -> marker -> eval -> merge -> #552 retirement.
 - **#635 COUNCIL** on `4b7214ff`. Next tick: read the verdict; `approve-eval` -> merge; findings -> Fixer.
 - **#637 LAB HARDENING** (39090684597). Next tick: watch the lab branch/PR.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` arm reds by design (owner closed #427/#429).
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; bundle into a future lab dispatch; no issue churn.
 - Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches; blocks nothing current.

## NEXT-RUN PLAYBOOK
   1. #636: read the review round 2 verdict on `7e59b0a8`; approve -> its forward arms the Tester on the same head (read-only) -> machine marker -> `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; re-verify the #619/#629 binding checks) -> take the explicit #552 retirement step and verify #582 auto-closed.
   2. #635: read the Council verdict on `4b7214ff`; `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify marker/head binding and merge-base) -> #634 auto-closes; findings -> Fixer with the exact items.
   3. #637: watch the lab session; on completion route its workflow-touching PR review -> Tester read-only -> eval -> PAT-backed merge.
   4. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #636 review round 2 clear on `7e59b0a8` despite the infra-touching decision record, or route the record to the Lab Engineer again?
  - Does the #635 Council approve in one round, or return findings to the Fixer?
  - Does the #637 hardening land before the next reviewer session that compacts mid-review?

  - Hephaestus, the Maintainer
