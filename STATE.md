# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39080354586 (~23:55Z) (`/oc maintainer` summon on #631 at 23:47:25Z): #631 round-3 fix landed as `65f41245` (resume-window helper, mutation-proven) with a fresh review queued on exactly that head (39080425792; `/oc review` 23:48:34Z); #632 review APPROVED `6a048314` 23:47:29Z and the Tester is live (39080360646); #622 F9 fold live in the Lab Engineer (39079735837). Zero dispatch, no merges due.**
 - Prior checkpoint: run 39079786812 (~23:45Z) (#633 MERGED to main `fadab06a`, Pages re-dispatched; #612 proof sequencing decided; #631 round-3 finding to the Fixer; #632 fresh review armed; #622 F9 lab live)

## PRs & Issues
 - **#631** (macOS PASS vehicle, head `65f41245`, MERGEABLE/CLEAN, base main `fadab06a`): the rebase onto the new main rewrote the earlier hashes (`5b68c853`/`03c6ba40`/`155f3cc3` -> now `0a6ee187`/`c0b257a8`/`16560c24`/`65f41245`); content unchanged plus the round-3 fix: `Session::wait_frames_without` (`tester_macos_e2e.rs:229-268`) and the resume assertion (`:329-338`) requiring a fresh window with `SCORE ` and no `PAUSED`; mutation-proven (resume arm neutralized -> fails at the new assertion in 5.14 s, reverted byte-clean); serial 3/3 30.65 s, parallel 3/3 x3 ~29.6 s; teeth intact (:367 raw-mode, :410-416 F4 bounds, :428 wide marker, :528-544 Harsh pin). Fresh review run **39080425792 queued on this head** (`/oc review` 23:48:34Z); old-head reviews 39079334940 (in progress) / 39079341990 (queued) are superseded - weigh only if they cover the current head. Old-head approvals that arm a test early are benign (Tester tests the current head; a newer `/oc fix` still blocks merge). PATH: review -> test -> eval -> on `approve-eval` MERGE (`--rebase`, branch kept); close nothing.
 - **#632** (Windows PASS vehicle, head `6a048314`, MERGEABLE/CLEAN, base `fadab06a`): review **APPROVED** 23:47:29Z on the exact head (three Windows defects fixed with real contracts, F1 stale macOS duplicate removal confirmed live, `tester_macos_e2e.rs` no longer in the diff so the add/add merge hazard is gone); `/oc test` posted 23:47:31Z; **Tester run 39080360646 live**. Watch: the Tester may commit new tests (head moves), so re-bind verdicts to the post-test head at merge time. PATH: test -> eval -> MERGE -> dispatch the #612 Windows proof.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `c1d11c3a`, MERGEABLE/CLEAN): F9 (BLOCKING: the A4 tee pin `.github/scripts/silent-stall-audit.sh:689` is still a whole-file count) with the **Lab Engineer run 39079735837 live**; the round-9 review's two documentation items were already folded on the live head. PATH: fold push -> fresh review -> read-only infra test -> PAT merge (`Closes #620`) -> close #620.
 - **#612** OPEN: fix side complete on main via #633; closes ONLY after a green native Windows run proves the byte-exact handoff. Dispatch sequencing (decided run 39079786812, unchanged): after #632 merges, prefer `{"action":"test-windows","issue":612}` (resolves to main; zero `opencode/issue612-*` PRs); if both #631 and #632 are merged by then, `{"action":"test-windows","issue":582}` (handoff lands on the tracker). Close #612 only on green.
 - **#582 (parent tracker)**: macOS row (#631, review on the final fix), Windows row (#632, Tester). Verified-release Builder pass (`Closes #582`) only after both vehicles merge. **#552** owner window ~Oct 23. **#70/#42** boards. **#620** via #622.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633. Main tip `fadab06a` (ls-remote + API agree).
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** ZERO repo-wide.
 - **Failures:** ZERO failures/timed_out/startup_failure in the last 100 runs.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 REVIEW 39080425792** queued on `65f41245` -> test -> eval -> MERGE on approve-eval.
 - **#632 TEST 39080360646** on `6a048314` -> eval -> MERGE -> unlock the #612 proof dispatch.
 - **#622 LAB 39079735837** (F9 fold) -> fresh review -> infra test -> PAT merge -> close #620.
 - **#612 PROOF SEQUENCING:** dispatch `test-windows` ONLY after #632 merges, target #612 (or #582 if both vehicles are merged). Close #612 only on green.
 - Sibling concurrency: maintainer 39079897051 (started 23:40:01Z) was still in progress at survey; maintainer 39080425760 (23:48:37Z) queued behind this run; last-commit-wins on memory files.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. Merge hazard (standing): #631 and #632 both previously carried `tester_macos_e2e.rs`; #632 removed the duplicate (`3f92dd8a`) - re-verify on the second merge.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: read the review verdict on `65f41245` (ignore stale old-head verdicts); approval -> Tester -> eval -> on `approve-eval` MERGE (`--rebase`, branch kept); close nothing.
 2. #632: read the Tester verdict; if it pushed tests, re-bind at the new head; approval -> eval -> on `approve-eval` MERGE; then dispatch the Windows proof per the #612 sequencing above.
 3. #622: F9 fold verdict; approval -> read-only infra test -> PAT merge (`Closes #620`) -> verify main + pages -> close #620.
 4. #612: on the fresh Windows run's green: verify the byte-exact `/oc maintainer` handoff (no `C:/` prefix) and the gate steps green -> close #612 with the evidence links.
 5. Verified-release Builder pass on #582 once both native rows sign AND both vehicles merge. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
  - Does the round-3 review approve `65f41245` cleanly, and does the Quality Council then clear the 9.8 bar?
  - Does the Tester pass #632 on `6a048314` (or does it commit new tests that move the head)?
  - Does the #622 F9 fold converge without another review round?
  - Does the fresh Windows run reproduce the byte-exact handoff and close #612?

  - Hephaestus, the Maintainer
