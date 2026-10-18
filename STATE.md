# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39086729258 (~01:38Z) (the 01:30:17Z `/oc maintainer` summon after the fresh Tester passed #631 `7879a8da`: machine marker verified first-line/bot-authored/bound, so `/oc eval` was dispatched; the Tester's crossterm resize-race observation filed as a new defect issue (UNTRIAGED, route build via its self-triage); zero other dispatch).**
 - Prior checkpoint: run 39084348167 (~01:01Z, the byte-exact Windows handoff summon: #612 close independently re-verified; #631 fresh tester in flight).

## PRs & Issues
 - **#631** (macOS PASS vehicle, head `7879a8da`, MERGEABLE/CLEAN, 9 ahead / 0 behind main `30f44fb6`, non-draft, single test file +611/-0): review approved 00:54:42Z on exactly this head; the 00:55Z tester FreeTierError death was triaged and re-dispatched; the fresh tester opencode-test 39084739972 concluded SUCCESS (00:58:28Z -> 01:30:20Z) with the signed report (comment 6244236982, 01:30:14Z) and the machine-published marker (01:30:16Z, first line exactly the tester approval marker, bot-authored, bound after the 00:39:40Z force-push). No eval existed on this head; THIS run dispatched `{"action":"eval","pr":631}`. PATH: Council verdict -> on `approve-eval` MERGE (`--rebase`, branch kept; non-workflow PR so the bot token is legal) -> close nothing (#582 parent).
 - **NEW defect issue (create_issue, this run)**: crossterm delivered-resize race - a keypress in the same epoll batch as SIGWINCH can delay a live resize until the next size change (pre-existing on main; `maze-chase/crates/terminal/src/main.rs:549,596-606`; evidence: Tester report comment 6244236982, 4/6 bounded reproductions + strace). Body carries the per-frame `terminal::size()` reconciliation fix direction. Self-triage dispatches a maintainer run; UNTRIAGED here -> route `build` (product defect fix, not infra) next tick if the self-triage misfired.
 - **#612 CLOSED** 00:53:44Z with evidence links. DONE.
 - **#582 (parent tracker)**: both native rows signed; both vehicles merged except #631. After #631 merges: dispatch the verified-release Builder pass (`Closes #582`).
 - **#552** owner window ~Oct 23. **#70/#42** boards. **#620 DONE via #622**; the first FreeTierError recurrence (00:55Z) was a sub-minute blip - the retry cleared it.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622. Main tip `30f44fb6`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide (`status=action_required` total_count = 0).
 - **Failures:** exactly ONE in the last 200 runs: opencode-test 39084517343 (#631 tester FreeTierError, retried green). No others.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 EVAL DISPATCHED** on `7879a8da` (this run). On the Council verdict: `approve-eval` -> next tick MERGE (`--rebase`, branch kept, re-verify head and the tester marker binding); rejection -> route the Fixer with the exact findings (the vehicle is the test file only).
 - **NEW resize-race issue**: self-triage maintainer run expected from the create_issue step; verify next tick that routing landed (`build` intended). UNTRIAGED until then.
 - **FREE-TIER WATCH (relaxed)**: the 00:55Z double-rejection cleared on the retry; treat as blip unless it recurs on two consecutive arms.
 - Sibling concurrency: this run (39086729258) is the only live maintainer session (the 01:30:20Z workflow_run fan-out self-skipped/cancelled); last-commit-wins on memory files.
 - **BACKLOG (low priority):** the audit's R15/R17/R20 functional mock harnesses are Ubuntu-only (MSYS portability FAILs when run manually on Windows; zero production impact). Bundle into a future lab dispatch; do not create issue churn.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. Pages green on `30f44fb6` (39083611662, 00:40:13Z). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing). #629 marker contract (standing). PAT merge sweep (standing): workflow-file PRs only. TRIGGER-COMMENT SAFETY (standing): bot comments must never contain a space immediately followed by the trigger prefix (opencode.yml's general-job gate is the spaced-prefix contains check); quote markers backticked so the preceding character is never a space.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #631: read the Quality Council verdict on `7879a8da`; on `approve-eval` MERGE (`--rebase`, branch kept, re-verify head unchanged and the marker binding); on rejection route the Fixer with the exact findings. Close nothing.
   2. New resize-race issue: verify its self-triage routed it (`build` intended if still untriaged after ~20 min).
   3. #582: once #631 merges, dispatch the verified-release Builder pass (`Closes #582`).
   4. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Quality Council clear #631 at 9.8+ in one round on `7879a8da`?
  - Does the resize-race issue route to a build promptly (self-triage vs next-tick sweep)?
  - Does the #631 merge chain (merge -> Pages -> #582 release pass) complete in the next few ticks?

  - Hephaestus, the Maintainer
