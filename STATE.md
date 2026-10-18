# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39087675636 (~01:52Z) (the 01:46:00Z `/oc maintainer` summon on the fresh #635 build PR: review live on `3f4c3062`; #631 eval live since 01:34; the one red run is the documented pre-#427 pull_request arm; zero dispatch).**
 - Prior checkpoint: run 39086960960 (~01:40Z, self-triage of bot-created #634 -> build dispatch).

## PRs & Issues
 - **#635** (NEW build PR for #634, head `3f4c3062`, MERGEABLE/CLEAN, non-draft, 5 commits, +411/-1, `Closes #634`, no workflow files): Builder fix complete (progress status: complete; unfixed race lost 5/5, fixed 5/5, crate 124/0, fmt/clippy clean, control phase on the same harness). Review 39087655495 LIVE since 01:45:52Z on exactly this head. PATH: review verdict -> on approve the forward arms the Tester on the same head -> on the machine marker dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept) -> #634 auto-closes.
 - **#631** (macOS PASS vehicle, head `7879a8da`, MERGEABLE/CLEAN, 9 ahead / 0 behind main `30f44fb6`): review approved 00:54:42Z; fresh Tester marker 01:30:16Z; eval 39086962161 LIVE since 01:34:02Z (agent step since 01:34:05Z). PATH: Council verdict -> on `approve-eval` MERGE (`--rebase`, branch kept, re-verify head + marker binding) -> close nothing (#582 parent); on rejection route the Fixer with the exact findings.
 - **#634** (resize race): build delivered as #635; closes on merge.
 - **#582 (parent tracker)**: both native rows signed; both vehicles merged except #631. After #631 merges: dispatch the verified-release Builder pass (`Closes #582`).
 - **#612 CLOSED** 00:53:44Z with evidence links. DONE.
 - **#552** owner window ~Oct 23. **#70/#42** boards. **#620 DONE via #622**.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622. Main tip `30f44fb6`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide (`status=action_required` total_count = 0).
 - **Failures:** exactly ONE in the last 100 runs: maintainer 39087469440 (the `pull_request`-event arm on #635's first push: bot-actor CLI assert + loud verify red = the documented intended pre-#427 class; its tracker #427 was closed COMPLETED and PR #429 closed unmerged by the owner 2026-09-25). No others.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#635 REVIEW LIVE** (39087655495, started 01:45:52Z) on `3f4c3062`. Next tick: read the verdict.
 - **#631 EVAL LIVE** (39086962161, agent step since 01:34:05Z, normal band 10-30 min) on `7879a8da`. Next tick: read the verdict.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip; treat as stable unless two consecutive arms reject.
 - **PRE-#427 ARM (standing observation)**: the bot-authored-PR `pull_request` maintainer arm reds and posts the "does not have write permissions" comment by design (verify-step comment in maintainer.yml); the owner closed the preflight workstream (#427 COMPLETED / #429 unmerged, 2026-09-25). Candidate for a future lab pass (land the preflight or drop the redundant arm); no issue churn now.
 - Sibling concurrency: this run (39087675636) is the only live maintainer session; last-commit-wins on memory files.
 - **BACKLOG (low priority):** the audit's R15/R17/R20 functional mock harnesses are Ubuntu-only (MSYS portability FAILs when run manually on Windows; zero production impact). Bundle into a future lab dispatch; do not create issue churn.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. Pages green on `30f44fb6`; #635 preview deployed 01:45:57Z. TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing). #629 marker contract (standing). PAT merge sweep (standing): workflow-file PRs only. TRIGGER-COMMENT SAFETY (standing): bot comments must never contain a space immediately followed by the trigger prefix (opencode.yml's general-job gate is the spaced-prefix contains check); quote markers backticked so the preceding character is never a space.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #631: read the Quality Council verdict on `7879a8da`; on `approve-eval` MERGE (`--rebase`, branch kept, re-verify head unchanged and the marker binding); on rejection route the Fixer with the exact findings. Close nothing.
   2. #635: read the review verdict on `3f4c3062`; on approve the forward arms the Tester on the same head; on the tester machine marker dispatch `{"action":"eval"}`; on `approve-eval` MERGE (`--rebase`, branch kept) and #634 auto-closes. Ignore stale verdicts if the head moves.
   3. #582: once #631 merges, dispatch the verified-release Builder pass (`Closes #582`).
   4. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the review approve #635 in one round?
  - Does the Quality Council clear #631 at 9.8+ in one round on `7879a8da`?
  - Does the #631 merge chain (merge -> Pages -> #582 release pass) complete in the next few ticks?

  - Hephaestus, the Maintainer
