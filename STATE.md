# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39091871167 (~03:00Z) (Tester APPROVED #636 on `7e59b0a8` with the machine marker; bindings verified; `{"action":"eval","pr":636}` dispatched; #635 eval + #637 lab still live; zero other dispatch).**
 - Prior checkpoint: run 39090693581 (~02:36Z, lab F1/F2 fix `7e59b0a8` landed and review round 2 live on it).

## PRs & Issues
 - **#636** (verified-release PR for #582, `opencode/issue582-verified-release`, head `7e59b0a887a07ddea01568c0af513c9bf33732e9`, MERGEABLE/CLEAN, `Closes #582` at body line 3, no workflow files; diff touches `.github/agents/` via the Builder decision record -> Tester read-only, review fix/continue auto-rewrites to lab): REVIEW ROUND 2 APPROVED 02:43:17Z; `/oc test` 02:43:20Z; TESTER APPROVED 02:56:41Z + machine marker 02:56:42Z (first-line `/oc approve-test`, bot-authored). Bindings: head committer date 02:34:38Z, NO force-push events on the timeline, no `/oc fix` after the marker, ls-remote head unchanged. QUALITY COUNCIL DISPATCHED this run (`/oc eval`, posted by the hardcoded PAT step). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; bot-token legal) -> #582 auto-closes -> explicit #552 retirement step; findings -> route the Fixer with the exact items. Non-blocking notes for a future docs touch: scoreboard 0.8-us anchor (reviewer), root README "currently in progress" wording (tester) - not gates.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, MERGEABLE/CLEAN): QUALITY COUNCIL 39089476658 LIVE since 02:16:04Z (eval job 02:16:07Z; ~44 min at final check; #631 precedent 16.4 min; 75-minute cap; crash parity covers a death). Pending eval 39089489752 (02:16:17Z cohort) skips at its gate. PATH: `approve-eval` -> MERGE (`--rebase`, branch kept) -> #634 auto-closes; findings -> Fixer.
 - **#637** (review-publication contract hardening): LAB ENGINEER 39090684597 LIVE since 02:36:19Z (armed by the earlier `/oc lab`). Next tick: watch branch/PR; workflow-touching PR -> review -> Tester read-only -> eval -> PAT-backed merge.
 - **#634**: closes on #635 merge. **#582**: closes on #636 merge. **#552**: post-release retirement step (parity checklist + explicit record; owner window ~Oct 23). **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631. Main tip `c672f443` (ls-remote + API verified, unchanged since the 01:51:48Z #631 merge).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 (`action_required` total_count 0). **Failures:** ZERO in the last 100 runs.

## IN FLIGHT
 - **#636 QUALITY COUNCIL** on `7e59b0a8`. Next tick: read the verdict; `approve-eval` -> merge -> #552 retirement; findings -> Fixer.
 - **#635 COUNCIL** on `4b7214ff`. Next tick: read the verdict; `approve-eval` -> merge + #634 close; findings -> Fixer.
 - **#637 LAB HARDENING** (39090684597). Next tick: watch the lab branch/PR.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` arm reds by design (owner closed #427/#429).
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; bundle into a future lab dispatch; no issue churn.
 - Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches; blocks nothing current. Plus the eval-cohort pending arm 39089489752 (skip at gate).

## NEXT-RUN PLAYBOOK
   1. #636: read the Council verdict on `7e59b0a8`; on `approve-eval` MERGE (`--rebase`, branch kept; re-verify the #619/#629 binding checks and head unchanged) -> take the explicit #552 retirement step and verify #582 auto-closed; on fix route the exact findings.
   2. #635: read the Council verdict on `4b7214ff`; `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify marker/head binding and merge-base) -> #634 auto-closes; findings -> Fixer; if the eval dies, the workflow_run triage arm owns the retry.
   3. #637: watch the lab session; on completion route its workflow-touching PR review -> Tester read-only -> eval -> PAT-backed merge.
   4. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
   - Does the #635 Council clear in one round (and conclude normally after its long ~44-minute agent step), or return findings to the Fixer?
   - Does the #636 Council approve 9.8+ on `7e59b0a8`, or return fix findings?
   - Does the #637 hardening land before the next reviewer session that compacts mid-review?

   - Hephaestus, the Maintainer
