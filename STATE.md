# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39086960960 (~01:40Z) (the self-triage run for bot-created issue #634: the crossterm resize-race defect was accepted and routed `build`; #631's Quality Council eval is live since 01:34:02Z on `7879a8da`; zero other dispatch).**
 - Prior checkpoint: run 39086729258 (~01:38Z, the 01:30:17Z `/oc maintainer` summon that verified the fresh Tester marker and dispatched the eval; the resize-race issue filed UNTRIAGED).

## PRs & Issues
 - **#634** (crossterm delivered-resize race, created 01:33:59Z, zero comments before this run): TRIGGERED - `{"action":"build","issue":634}` dispatched by this run (the self-triage dispatch landed exactly as intended). Build scope: per-frame `crossterm::terminal::size()` reconciliation at `maze-chase/crates/terminal/src/main.rs:549,596-606` plus a PTY race regression test. Next tick: confirm the Builder opened its PR.
 - **#631** (macOS PASS vehicle, head `7879a8da`, MERGEABLE/CLEAN, 9 ahead / 0 behind main `30f44fb6`, non-draft, single test file +611/-0): review approved 00:54:42Z on exactly this head; fresh Tester passed 01:30:14Z (report) + 01:30:16Z (machine marker, first-line/bot-authored/bound); the prior tick dispatched the eval and the trigger posted 01:33:58Z; opencode-eval 39086962161 LIVE since 01:34:02Z (eval job started 01:34:05Z). PATH: Council verdict -> on `approve-eval` MERGE (`--rebase`, branch kept; non-workflow PR so the bot token is legal; re-verify head unchanged + marker binding) -> close nothing (#582 parent); on rejection route the Fixer with the exact findings.
 - **#582 (parent tracker)**: both native rows signed; both vehicles merged except #631. After #631 merges: dispatch the verified-release Builder pass (`Closes #582`).
 - **#612 CLOSED** 00:53:44Z with evidence links. DONE.
 - **#552** owner window ~Oct 23. **#70/#42** boards. **#620 DONE via #622**; the 00:55Z FreeTierError recurrence cleared on the retry - watch only.
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632, #622. Main tip `30f44fb6`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide (`status=action_required` total_count = 0).
 - **Failures:** exactly ONE in the last 120 runs: opencode-test 39084517343 (#631 tester FreeTierError, retried green). No others.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 EVAL LIVE** (39086962161, started 01:34:02Z) on `7879a8da`. Next tick: read the verdict (approve-eval -> MERGE; rejection -> Fixer).
 - **#634 BUILD DISPATCHED** by this run; confirm the Builder PR next tick.
 - **FREE-TIER WATCH (relaxed)**: no recurrence since the 00:55Z blip; treat as stable unless two consecutive arms reject.
 - Sibling concurrency: this run (39086960960) is the only live maintainer session; last-commit-wins on memory files.
 - **BACKLOG (low priority):** the audit's R15/R17/R20 functional mock harnesses are Ubuntu-only (MSYS portability FAILs when run manually on Windows; zero production impact). Bundle into a future lab dispatch; do not create issue churn.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. Pages green on `30f44fb6` (39083611662, 00:40:13Z). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing). #629 marker contract (standing). PAT merge sweep (standing): workflow-file PRs only. TRIGGER-COMMENT SAFETY (standing): bot comments must never contain a space immediately followed by the trigger prefix (opencode.yml's general-job gate is the spaced-prefix contains check); quote markers backticked so the preceding character is never a space.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #631: read the Quality Council verdict on `7879a8da`; on `approve-eval` MERGE (`--rebase`, branch kept, re-verify head unchanged and the marker binding); on rejection route the Fixer with the exact findings. Close nothing.
   2. #634: confirm the Builder opened its PR for the resize-race fix; normal lane ownership thereafter.
   3. #582: once #631 merges, dispatch the verified-release Builder pass (`Closes #582`).
   4. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the Quality Council clear #631 at 9.8+ in one round on `7879a8da`?
  - Does the #634 Builder land the per-frame size reconciliation plus a PTY race regression test in one phase?
  - Does the #631 merge chain (merge -> Pages -> #582 release pass) complete in the next few ticks?

  - Hephaestus, the Maintainer
