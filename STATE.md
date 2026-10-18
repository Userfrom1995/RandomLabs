# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39082809044 (~00:38Z) (the #622 `pull_request closed` [merged] wake): #622/#620 COMPLETE (already verified + reported by run 39082502857; no new comment); #631 Fixer 39082758081 LIVE on the 00:26:20Z review finding (head 65f41245, Tester approval 00:30:20Z does NOT gate a merge while the finding stands); #612 Windows proof 39082795458 LIVE; allowlist exact 19/19, zero failures, zero held runs; zero dispatch.**
 - Prior checkpoint: run 39082502857 (~00:31Z): #622 MERGED 00:27:15Z (`30f44fb6`, PAT sweep, branch kept), #620 CLOSED; #632 merged 00:22:46Z post-Council 9.8/10; #612 Windows proof live; #631 read-only Tester live

## PRs & Issues
 - **#622 MERGED** 00:27:15Z as `30f44fb6` (PAT-backed rebase sweep); **#620 CLOSED** 00:27:16Z. Post-merge verification complete (marker shape + R21 head-binding, ancestry, branch intact at `cfe55726`, Pages green 39083145310). DONE - no further action.
 - **#632 MERGED** 00:22:46Z as `d08a993b` post-Council 9.8/10; body stays `Refs #582`. DONE.
 - **#631** (macOS PASS vehicle, head `65f41245`, CLEAN/MERGEABLE): review finding `/oc fix` at 00:26:20Z (test-strength); **Fixer opencode 39082758081 LIVE since 00:26:26Z**; Tester approved 00:30:20Z (machine marker 00:30:22Z) but the finding + imminent head move mean NO merge/eval now (sibling run 39083004423 also withheld). PATH: Fixer push -> push-triggered review -> fresh read-only Tester -> on approval dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; non-workflow PR so bot token legal); close nothing.
 - **#612** OPEN: **native Windows proof opencode-peros-test 39082795458 IN PROGRESS since 00:27:04Z on main `d08a993b`** (windows job live; linux/macos skipped by design). Close #612 ONLY on a green byte-exact handoff (no `C:/` mangling). On red: poster class -> lab; product class -> fixer.
 - **#582 (parent tracker)**: #632 merged; waiting on #631. **After #631 merges: both native rows signed AND both vehicles merged -> dispatch the verified-release Builder pass (`Closes #582`).**
 - **#552** owner window ~Oct 23. **#70/#42** boards. **#620 DONE via #622.**
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632 (00:22:46Z), #622 (00:27:15Z). Main tip `30f44fb6`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide.
 - **Failures:** ZERO failures/timed_out/startup_failure in the last 60 runs.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 FIXER 39082758081** on head `65f41245` -> on push: push-triggered review re-arms; then read-only Tester on the new head; on approval dispatch eval; on `approve-eval` merge `--rebase` (branch kept).
 - **#612 WINDOWS PROOF 39082795458** on `d08a993b` -> on green close #612; on red route (lab poster class / fixer product class).
 - Sibling concurrency: sibling maintainer 39083004423 (the 00:30:23Z summon on #631) completed its comment at 00:33:05Z with `[]`; the pending opencode 39083004539 is a cohort no-op (all gates exclude `/oc maintainer` + `/oc approve*` bodies). Last-commit-wins on memory files.
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
