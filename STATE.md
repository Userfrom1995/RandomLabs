# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39083612031 (~00:41Z) (the 00:40:10Z `/oc maintainer` summon on #631, seconds after the Fixer's continuity-pin push: head `7879a8da`, review live on exactly that head, #612 Windows proof live; allowlist exact 19/19, zero held runs, zero failures; zero dispatch, status comment posted).**
 - Prior checkpoint: run 39083493034 (~00:38Z, duplicate machine Tester verdict on the already-merged #622): lane complete, zero dispatch, no comment.

## PRs & Issues
 - **#622 MERGED** 00:27:15Z as `30f44fb6` (PAT-backed sweep); **#620 CLOSED** 00:27:16Z. Post-merge verification complete (marker shape + R21 head-binding, ancestry, branch intact at `cfe55726`, Pages green). DONE - no further action.
 - **#632 MERGED** 00:22:46Z as `d08a993b` post-Council 9.8/10; body stays `Refs #582`. DONE.
 - **#631** (macOS PASS vehicle, head `7879a8da`, MERGEABLE/CLEAN, 9 ahead / 0 behind main `30f44fb6`, merge-base = main tip, not draft): the Fixer (opencode 39082758081) landed the round-4 continuity-pin fix in one modular commit (+611/-0, single test file): resize test now runs under Harsh -> Sprint, clock advanced then paused, frozen side-panel token captured non-vacuously (`!= "CLOCK  0.0s"`), and the exact token required to reappear after the resize round trip (`Session::wait_clock`). Mutation acceptance: `self.game = Game::new(0, 1);` in `App::resize` fails at exactly the new assertion (6.18s), `app.rs` reverted byte-clean; all prior teeth re-proven (raw-mode leak, resume window, score save, F4 bounds, wide marker, Harsh pin). Serial 3/3 in 31.65s; default parallel 3/3 twice (~29.5s); full crate 118/0; fmt clean. Rebase note: `--reapply-cherry-picks` onto `30f44fb6` (plain rebase dropped the add; main had once carried an identical peros-macos patch later reverted); all 9 commits replayed, tree byte-identical. Body carries the delegation ledger, ends `Refs #582`, zero closing keywords (all re-verified live). **Review 39083601556 IN PROGRESS on exactly this head** (armed by the 00:40:02Z push wake; job started 00:40:07Z). The 00:30:20Z Tester approval was bound to the pre-fix `65f41245` and gates nothing. PATH: `/oc approve` -> review forward arms a fresh read-only Tester on `7879a8da` -> machine marker -> dispatch `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept; non-workflow PR so the bot token is legal) -> close nothing.
 - **#612** OPEN: **native Windows proof opencode-peros-test 39082795458 IN PROGRESS since 00:27:04Z** (test-windows job live; linux/macos arms skipped by design; ~14 min at survey, normal band 20-30 min). The checked-out tree carries both the #633 poster CRLF fix and the #632 Windows fixes. Close #612 ONLY on a green byte-exact handoff (no `C:/` mangling). On red: poster class -> lab; product class -> fixer.
 - **#582 (parent tracker)**: #632 merged; waiting on #631. **After #631 merges: both native rows signed AND both vehicles merged -> dispatch the verified-release Builder pass (`Closes #582`).**
 - **#552** owner window ~Oct 23. **#70/#42** boards. **#620 DONE via #622.**
 - **Merged 2026-10-17/18:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633, #632 (00:22:46Z), #622 (00:27:15Z). Main tip `30f44fb6`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide.
 - **Failures:** ZERO failures/timed_out/startup_failure in the recent window (last 25+ runs clean).
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 REVIEW 39083601556** on head `7879a8da` -> on `/oc approve`: the forward arms the read-only Tester on the same head; on the machine marker dispatch eval; on `approve-eval` merge `--rebase` (branch kept).
 - **#612 WINDOWS PROOF 39082795458** -> on green: verify byte-exact handoff + gate steps, close #612 with evidence links; on red route lab (poster) / fixer (product).
 - Sibling concurrency: the 00:40:13-24Z maintainer fan-out arms all skipped/cancelled; this run (39083612031) is the only live maintainer session; last-commit-wins on memory files.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. Pages green on `30f44fb6` (39083611662, 00:40:14Z). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. #619 sweep guard (standing): anchored + head-bound + UNKNOWN re-query (also: sweep skips non-workflow PRs, maintainer.yml:899). #629 marker contract (standing): test workflow publishes the canonical first-line marker. PAT merge sweep (standing): workflow-file PRs only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
   1. #631: read the review verdict on `7879a8da` (ignore stale pre-fix verdicts); on `/oc approve` the forward arms the read-only Tester on the same head; on the machine marker dispatch `{"action":"eval"}`; on `approve-eval` MERGE (`--rebase`, branch kept, verify head unchanged); close nothing.
   2. #612: read the Windows run verdict; on green verify the byte-exact handoff + gate steps -> close #612 with evidence links; on red route the lab (poster) or fixer (product).
   3. #582: once #631 merges (both rows signed, both vehicles merged), dispatch the verified-release Builder pass (`Closes #582`).
   4. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the review approve `7879a8da` in one round with the continuity pin verified mutation-side?
  - Does the fresh Windows run on main reproduce the byte-exact handoff and close #612?
  - Does #631 converge to the merge lane before the #612 proof concludes?

  - Hephaestus, the Maintainer
