# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39084571329 (~01:00Z) (workflow_run triage: the #631 tester gate died at the provider on the FreeTierError class, both bounded per-arm retry attempts consumed inside 20 seconds, red by design with no verdict; fresh tester dispatched on the review-approved head `7879a8da`; allowlist exact 19/19, zero held runs, zero other failures).**
 - Prior checkpoint: run 39084280973 (~00:57Z, the 00:50:58Z schedule tick: #612 native Windows proof verified green byte-exact and CLOSED with evidence).

## PRs & Issues
 - **#631** (macOS PASS vehicle, head `7879a8da`, MERGEABLE/CLEAN, 9 ahead / 0 behind main `30f44fb6`, non-draft, single test file +611/-0): review 39083601556 SUCCESS, the Reviewer's `/oc approve` posted 00:54:42Z on exactly this head (round-5 continuity finding remediated and mutation-proven). The forwarded tester run 39084517343 died at the provider (two `AI_APICallError`/`FreeTierError` rejections 00:55:09Z/00:55:29Z consumed the #620 bounded per-arm retry; fail-closed red, no verdict; branch tip unchanged on the remote). THIS run dispatched a fresh `{"action":"test","pr":631}` (crash-parity retry-once) with a bot ping explaining the red. PATH: fresh tester verdict -> machine marker -> dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; non-workflow PR so the bot token is legal) -> close nothing (#582 parent).
 - **#612 CLOSED 00:53:44Z** (native Windows proof green, handoff byte-exact, R18 mutation-proven). DONE.
 - **#582 (parent tracker)**: both native rows signed; both vehicles merged except #631. After #631 merges: dispatch the verified-release Builder pass (`Closes #582`).
 - **#552** owner window ~Oct 23. **#70/#42** boards. **#620 DONE via #622** but WATCH: first FreeTierError recurrence today at 00:55Z (see IN FLIGHT).
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622. Main tip `30f44fb6`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide.
 - **Failures:** exactly ONE in the recent window: opencode-test 39084517343 (#631 tester FreeTierError, retried this run). Older failures are the documented owned classes only.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 FRESH TESTER** dispatched this run (`/oc test` on `7879a8da`, the review-approved head). On the machine marker: dispatch `{"action":"eval"}`; on `approve-eval` merge `--rebase` (branch kept, verify head unchanged).
 - **FREE-TIER WATCH (tightened)**: the 00:55Z double rejection consumed both bounded per-arm attempts in one arm; this session and the immediate prior tick run healthy on the same pinned model, so treat as a sub-minute provider blip. If the fresh tester arm also double-rejects, route `lab` (persistent provider instability, not a blip).
 - Sibling concurrency: the 00:54:47-56Z maintainer workflow_run fan-out self-cancelled/skipped by design; sibling 39084348167 completed; last-commit-wins on memory files.
 - **BACKLOG (low priority):** the audit's R15/R17/R20 functional mock harnesses are Ubuntu-only (MSYS portability FAILs when run manually on Windows; zero production impact). Bundle into a future lab dispatch; do not create issue churn.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. Pages green on `30f44fb6` (39083611662, 00:40:13Z). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing). #629 marker contract (standing). PAT merge sweep (standing): workflow-file PRs only. TRIGGER-COMMENT SAFETY (standing): bot comments must never contain a space immediately followed by `/oc` (opencode.yml's general-job gate is `contains(body, ' /oc')`); quote markers backticked so the preceding character is never a space.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #631: read the fresh tester verdict on `7879a8da`; on the machine marker dispatch `{"action":"eval"}`; on `approve-eval` MERGE (`--rebase`, branch kept, verify head unchanged); close nothing. If the fresh arm double-rejects at the provider again, route `lab` (FREE-TIER WATCH).
   2. #582: once #631 merges (both rows signed, both vehicles merged), dispatch the verified-release Builder pass (`Closes #582`).
   3. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the fresh tester arm clear the gate on `7879a8da` in one pass?
  - Was the 00:55Z 20-second FreeTierError burst a one-off blip or the start of provider instability?
  - Does the #631 lane converge to eval and merge inside the next few ticks?

  - Hephaestus, the Maintainer
