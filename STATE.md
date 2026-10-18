# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39089503064 (~02:20Z) (the 02:16:21Z `/oc maintainer` wake on #636: the verified-release Builder pass COMPLETED green, its review round 1 live on `f31c5fdc`; the #635 Council live on `4b7214ff`; zero dispatch).**
 - Prior checkpoint: run 39089489711 (~02:18Z, sibling tick: Council verified live, release pass completed, review live).

## PRs & Issues
 - **#636** (verified-release PR for #582, `opencode/issue582-verified-release`, head `f31c5fdcab514075f213477b6463b252d77b7198`, 7 commits, MERGEABLE/CLEAN, `Closes #582` at body line 3, NO workflow files but ADDS `.github/agents/decisions/builder/2026-10-18T02-30-00-maze-chase-verified-release.md`): build run 39088154516 COMPLETED SUCCESS 02:17:03Z (push verify + forward green); the workflow self-forwarded the review trigger 02:16:57Z; review 39089530715 LIVE since 02:17:00Z on exactly this head (ls-remote confirmed static since the 02:14:27Z commit batch). INFRA-CLASS NOTE: the decision-record path matches `^\.github/(workflows/|agents/)`, so (a) the Tester is read-only on this PR (can still test and approve), (b) a Reviewer fix/continue verdict auto-rewrites to `lab` (opencode-review.yml infra override), (c) the bot-token merge is unaffected (only `.github/workflows/**` is merge-blocked for GITHUB_TOKEN). PATH: approve -> Tester (read-only) -> machine marker -> dispatch eval -> merge on `approve-eval` (`--rebase`, branch kept; re-verify bindings) -> #582 auto-closes -> explicit #552 retirement step (retire #552 against the parity checklist and record the retirement in the issue).
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`, 9 commits, MERGEABLE/CLEAN, `Closes #634`, no workflow files): QUALITY COUNCIL LIVE - 39089476658 since 02:16:04Z on the exact Tester-cleared head (Reviewer approve 02:06:27Z + machine marker 02:12:54Z both postdate the 02:12:33Z push). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept; re-verify marker/head binding and merge-base) -> #634 auto-closes; findings -> Fixer with the exact items.
 - **#634**: delivered via #635; closes on merge. **#582**: closes on #636 merge. **#552**: post-release retirement step (owner window ~Oct 23). **#612/#620/#622/#632/#633**: DONE.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631. Main tip `c672f443` (ls-remote verified).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 (the run's PAT sweep keeps accrual cleared). **Failures:** none beyond the two documented pre-#427 `pull_request`-arm reds (01:42:41Z on #635, 02:07:50Z on #636, same known class, owner closed #427/#429); no action.

## IN FLIGHT
 - **#635 COUNCIL LIVE** on `4b7214ff`. Next tick: read the verdict; `approve-eval` -> merge; findings -> Fixer.
 - **#636 REVIEW LIVE** on `f31c5fdc`. Next tick: read the verdict; approve -> Tester forward; expect the Tester read-only (infra-class); machine marker -> dispatch eval; `approve-eval` -> merge -> #552 retirement.
 - **SIBLING SESSION DONE**: 39089489711 (group maintainer-635, from the 02:16:14Z nudge) finished ~02:19Z with `[]` and a status comment on #635, committing memory d53d32b7; this run (39089503064, group maintainer-636) supersedes by last-commit-wins. The pending 39089530688 maintainer run (from the `/oc review` cohort) skips at its job gate.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip; stable unless two consecutive arms reject.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` arm reds by design (owner closed the preflight workstream #427/#429). Candidate for a future lab pass; no issue churn now.
 - **BACKLOG (low priority):** the audit's R15/R17/R20 functional mock harnesses are Ubuntu-only (MSYS portability FAILs when run manually on Windows; zero production impact). Bundle into a future lab dispatch; do not create issue churn.
 - Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches (`opencode/lab-427-*`, `opencode/issue532-*`); each in its own group; blocks nothing current.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually; green on `c672f443`. TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only; #636 special: decision-record file makes it infra-class for Tester read-only + review fix/continue->lab rewrite; approval path and bot merge unaffected. #619 sweep guard (standing). #629 marker contract (standing). PAT merge sweep (standing): workflow-file PRs only. TRIGGER-COMMENT SAFETY (standing): bot comments must never contain a space immediately followed by the trigger prefix; quote markers backticked.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding - no new-project merges pending).

## NEXT-RUN PLAYBOOK
   1. #635: read the Council verdict on `4b7214ff`; on `approve-eval` MERGE (`--rebase`, branch kept) and #634 auto-closes; on findings route the Fixer with the exact items. Ignore stale verdicts if the head moves.
   2. #636: read the review verdict on `f31c5fdc`; approve -> Tester forward on the same head -> machine marker -> dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; re-verify the #619/#629 binding checks), then take the explicit #552 retirement step and verify #582 auto-closed; fix verdict -> auto-rewritten to lab (expect it).
   3. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Council clear #635 on `4b7214ff` in one round?
  - Does the review clear #636 on `f31c5fdc` despite the infra-touching decision record, or does it route the record to the Lab Engineer?
  - Does the #582 release chain (review -> Tester -> eval -> merge -> #552 retirement) complete in the next few ticks?

  - Hephaestus, the Maintainer
