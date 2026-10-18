# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39090193536 (~02:33Z) (the opencode-review failure triage on #636: review round 1's `lab` verdict was lost unpublished; re-dispatched lab with the recovered F1/F2 findings verbatim; new review-publication-contract hardening issue created; zero other dispatch).**
 - Prior checkpoint: run 39089503064 (~02:20Z, #636 review round 1 live; #635 Council live on `4b7214ff`).

## PRs & Issues
 - **#636** (verified-release PR for #582, `opencode/issue582-verified-release`, head `f31c5fdcab514075f213477b6463b252d77b7198`, 7 commits, MERGEABLE/CLEAN, `Closes #582` at body line 3, adds `.github/agents/decisions/builder/2026-10-18T02-30-00-maze-chase-verified-release.md` -> infra-class: Tester read-only, review fix/continue -> lab rewrite, bot-token merge unaffected): REVIEW ROUND 1 completed but its verdict was LOST UNPUBLISHED. Run 39089530715: decision file `{"action":"lab"}` written at 02:26:48Z, signed findings comment composed at 02:27:04Z but never published (session compacted, ended with an unsigned wrap-up; the wrapper posts only the final message), publication gate (issue #616) exit 1, success+unpublished branch failed loudly at 02:28:12Z, no auto-retry in this class. DISPATCHED this run: `{"action":"lab","pr":636,"instruction":"fix review findings F1/F2"}` after posting the recovered findings verbatim on the thread (ping). F1: `maze-chase/index.html:64` stale "stays functional until this build proves verified parity" sentence (corrected `<p>` line given). F2: `progress/582-maze-chase-rust-migration.md:40,54-55` stale "in progress/pending" final-phase paragraph (past-tense rewrite given). The lab workflow forwards `/oc review` itself on completion (lab.yml:350-351). PATH: lab fixes F1/F2 -> push -> review round 2 -> Tester (read-only) -> machine marker -> eval -> merge on `approve-eval` (`--rebase`, branch kept; re-verify #619/#629 bindings) -> #582 auto-closes -> explicit #552 retirement step.
 - **#635** (build PR for #634, `opencode/issue634-resize-reconcile`, head `4b7214ff68502d60ab151013729beb5891713e98`): QUALITY COUNCIL LIVE (39089476658 since 02:16:04Z; ~17 min at 02:33Z, normal band, #631's eval took 16.4 min). PATH: `approve-eval` -> MERGE (`--rebase`, branch kept) -> #634 auto-closes; findings -> Fixer with the exact items.
 - **#634**: delivered via #635; closes on merge. **#582**: closes on #636 merge. **#552**: post-release retirement step (owner window ~Oct 23). **#612/#620/#622/#632/#633**: DONE.
 - **NEW ISSUE (UNTRIAGED, created this run): "Review gate: healthy reviewer session ending with an unsigned final message loses its verdict and no auto-retry fires (issue #616 follow-up)"** (number assigned by the hardcoded step after this session). NEXT RUN FIRST ACTION: dispatch `{"action":"lab","issue":<N>}` on it (reviewer.md final-message contract + opencode-review.yml verify auto-retry for success+provably-unpublished). The create_issue self-dispatch sums a triage run within seconds; route it (title above is the exact search key).
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622, #631. Main tip `c672f443` (ls-remote + API verified, unchanged).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0. **Failures:** only the triaged review run 39089530715 in the last 100 runs.

## IN FLIGHT
 - **#636 LAB FIX ROUND** on `f31c5fdc` (dispatched this run; F1/F2 posted verbatim). Next tick: watch the lab push; expect its own `/oc review` forward; then round 2 -> Tester -> eval -> merge.
 - **#635 COUNCIL LIVE** on `4b7214ff`. Next tick: read the verdict; `approve-eval` -> merge; findings -> Fixer.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip.
 - **PRE-#427 ARM (standing observation)**: bot-authored-PR `pull_request` arm reds by design (owner closed #427/#429).
 - **BACKLOG (low priority):** R15/R17/R20 MSYS portability; bundle into a future lab dispatch; no issue churn.
 - Zombie queued runs (pre-existing, zero impact): four 2026-09-25/2026-10-05 `queued` leftovers on dead branches; blocks nothing current.

## NEXT-RUN PLAYBOOK
   1. NEW ISSUE: find it by the exact title above, verify no `/oc lab` comment yet, dispatch `{"action":"lab","issue":<N>}` (the review-publication contract hardening).
   2. #636: watch the lab push on `opencode/issue582-verified-release`; on the lab's `/oc review` forward read round 2; approve -> Tester read-only -> machine marker -> `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; re-verify #619/#629 bindings) -> #552 retirement step; verify #582 auto-closed.
   3. #635: read the Council verdict on `4b7214ff`; `approve-eval` -> MERGE; rejection -> Fixer with the exact findings.
   4. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the lab clear F1/F2 in one pass on #636?
  - Does the #635 Council approve in one round?
  - Does the review-publication hardening land before the next reviewer session that compacts mid-review?

  - Hephaestus, the Maintainer
