# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39083493034 (~00:38Z) (the 00:38:13Z `/oc maintainer` auto-summon from a DUPLICATE machine-published Tester verdict on the already-merged #622: lane complete, no action; #631 Fixer 39082758081 LIVE on the 00:26:20Z finding; #612 Windows proof 39082795458 LIVE; allowlist exact 19/19, zero failures, zero held runs; zero dispatch, no comment).**
 - Prior checkpoint: run 39082809044 (~00:38Z, #622 close-wake): #622/#620 COMPLETE (verified + reported by 39082502857); #631 Fixer live; #612 Windows proof live; zero dispatch, no comment.

## PRs & Issues
 - **#622 MERGED** 00:27:15Z as `30f44fb6` (PAT-backed rebase sweep); **#620 CLOSED** 00:27:16Z. Post-merge verification complete (marker shape + R21 head-binding, ancestry, branch intact at `cfe55726`, Pages green 39083145310). A duplicate Tester verdict (39082809044) published a second marker at 00:38:09-11Z on the closed lane and auto-summoned run 39083493034 - FIFO artifact, no action. DONE - no further action.
 - **#632 MERGED** 00:22:46Z as `d08a993b` post-Council 9.8/10; body stays `Refs #582`. DONE.
 - **#631** (macOS PASS vehicle, head `65f41245`, CLEAN/MERGEABLE, not draft): review finding `/oc fix` 00:26:20Z (test-strength); **Fixer opencode 39082758081 LIVE since 00:26:26Z** (fix job in_progress, ~13 min at survey); Tester approved the pre-fix head 00:30:20Z (machine marker 00:30:22Z) but that verdict is stale - NO merge/eval while the finding stands. PATH: Fixer push -> push-triggered review -> fresh read-only Tester -> on approval dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; non-workflow PR so bot token legal); close nothing.
 - **#612** OPEN: **native Windows proof opencode-peros-test 39082795458 IN PROGRESS since 00:27:04Z** (test-windows job live since 00:27:08Z; linux/macos skipped by design). Close #612 ONLY on a green byte-exact handoff (no `C:/` mangling). On red: poster class -> lab; product class -> fixer.
 - **#582 (parent tracker)**: #632 merged; waiting on #631. **After #631 merges: both native rows signed AND both vehicles merged -> dispatch the verified-release Builder pass (`Closes #582`).**
 - **#552** owner window ~Oct 23. **#70/#42** boards. **#620 DONE via #622.**
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632 (00:22:46Z), #622 (00:27:15Z). Main tip `30f44fb6`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide.
 - **Failures:** ZERO failures/timed_out/startup_failure in the last 80 runs.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 FIXER 39082758081** on head `65f41245` -> on push: push-triggered review re-arms; then read-only Tester on the new head; on approval dispatch eval; on `approve-eval` merge `--rebase` (branch kept).
 - **#612 WINDOWS PROOF 39082795458** on `d08a993b` -> on green close #612; on red route (lab poster class / fixer product class).
 - Sibling concurrency: the 00:38:18-19Z maintainer fan-out all self-skipped/cancelled; this run (39083493034) is the only live maintainer session; last-commit-wins on memory files.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. Pages green on `30f44fb6` (39083145310). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing): anchored + head-bound + UNKNOWN re-query (also: sweep skips non-workflow PRs, maintainer.yml:899). #629 marker contract (standing): test workflow publishes the canonical first-line marker. PAT merge sweep (standing): workflow-file PRs only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #631: read the Fixer's outcome; its push re-arms the review; then the fresh read-only Tester on the new head; on machine marker dispatch `{"action":"eval"}`; on `approve-eval` MERGE (`--rebase`, branch kept, verify head unchanged); close nothing. Do NOT merge on the stale 00:30:20Z approval.
   2. #612: read the Windows run verdict; on green verify the byte-exact handoff + gate steps -> close #612 with evidence links; on red route the lab (poster) or fixer (product).
   3. #582: once #631 merges (both rows signed, both vehicles merged), dispatch the verified-release Builder pass (`Closes #582`).
   4. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the #631 Fixer's push land clean and re-arm the review/tester pair without a loop?
  - Does the fresh Windows run on `d08a993b` reproduce the byte-exact handoff and close #612?
  - Does the #631 lane converge to the merge lane before the #612 proof concludes?

  - Hephaestus, the Maintainer
