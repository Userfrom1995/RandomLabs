# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39081339815 (~00:10Z) (the 00:03:20Z `/oc maintainer` summon on #622): F10 rebase verified independently (fresh export audit 22 passed / 0 failed, 0 behind main `fadab06a`), Reviewer APPROVED `cfe55726` 00:06:52Z, read-only infrastructure Tester live; #631 read-only test live; #632 eval queued; zero failures; zero held runs.**
 - Prior checkpoint: run 39081062138 (~00:02Z) (eval dispatched on #632 head `ecedbfca`; #631 read-only test live on `65f41245`; #622 F9 fold with the Lab Engineer)

## PRs & Issues
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `cfe55726`, MERGEABLE/CLEAN, 0 behind / 27 ahead of main `fadab06a`, not draft): the round-10 F10 rebase landed (lab run 39080879644 success 00:05:10Z; head commit 00:04:08Z). Reviewer APPROVED `cfe55726` at 00:06:52Z (run 39080650783; sampled `445541c6`, followed the head move; F9 and F10 both closed; runner blocks byte-identical to the pre-rebase reviewed head; audit 22/0). **Read-only infrastructure Tester opencode-test 39081566516 IN PROGRESS since 00:06:58Z.** Push-wake duplicate review arms 39081452516 (in progress) / 39081461600 (pending) are FIFO-harmless. PATH: tester verdict (machine-published marker) -> PAT-backed merge sweep (`--rebase`, branch kept; the diff touches `.github/workflows/maintainer.yml` + `.github/actions/`, so GITHUB_TOKEN cannot merge) -> verify main + Pages -> close #620. Re-verify the head at merge time (no pushes expected).
 - **#631** (macOS PASS vehicle, head `65f41245`, MERGEABLE/CLEAN, base `fadab06a`): review APPROVED 23:53:51Z on the exact head; **read-only Tester opencode-test 39080754810 IN PROGRESS since 23:53:56Z**. PATH: tester verdict -> on approval a maintainer tick dispatches `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept); close nothing. Watch for a Tester commit moving the head.
 - **#632** (Windows PASS vehicle, head `ecedbfca`, MERGEABLE/CLEAN, base `fadab06a`): Tester APPROVED 23:59:00Z (machine marker 23:59:01Z). **Eval queued: opencode-eval 39081331703 pending since 00:03:15Z.** PATH: eval verdict -> on `approve-eval` MERGE via bot token (no workflow files in the diff; rebase first if main moved) -> then dispatch the #612 Windows proof. Re-verify the head at merge time (no pushes expected).
 - **#612** OPEN: fix complete on main via #633 (`fadab06a`, merged 23:41:38Z, branch kept); closes ONLY on a green native Windows run proving the byte-exact handoff. Sequencing (unchanged): dispatch after #632 merges - prefer `{"action":"test-windows","issue":612}`; if both vehicles are merged by then, `issue:582`.
 - **#582 (parent tracker)**: both native rows in final QA; verified-release Builder pass (`Closes #582`) only after both vehicles merge. **#552** owner window ~Oct 23. **#70/#42** boards. **#620** via #622.
 - **Merged 2026-10-17:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633 (last: 23:41:38Z). Main tip `fadab06a`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide.
 - **Failures:** ZERO failures/timed_out/startup_failure in the last 100 runs.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#622 TEST 39081566516** on `cfe55726` (read-only infra) -> machine-published approve-test marker -> PAT merge sweep -> verify main + Pages -> close #620.
 - **#631 TEST 39080754810** on `65f41245` -> on tester approval a maintainer tick dispatches eval.
 - **#632 EVAL 39081331703** queued on `ecedbfca` -> on `approve-eval` merge -> unlock the #612 Windows proof dispatch.
 - **#612 PROOF SEQUENCING:** dispatch `test-windows` ONLY after #632 merges, target #612 (or #582 if both vehicles are merged). Close #612 only on green.
 - Sibling concurrency: maintainer 39081331627 (00:03:15Z, #632 target) in progress; later push-wake fan-out arms pending/skipped; last-commit-wins on memory files.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. Merge hazard (standing): the #631/#632 `tester_macos_e2e.rs` duplicate is gone; re-verify on the second merge. PAT merge sweep (standing): #622 is a workflow-file PR, so only the owner-credential sweep can land it.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #622: read the Tester verdict; on the machine-published marker the PAT merge sweep merges `--rebase` (branch kept) -> verify main + Pages -> close #620; on tester findings route the lab.
 2. #631: tester verdict; if approved, dispatch `{"action":"eval"}`; on `approve-eval` MERGE (`--rebase`, branch kept); close nothing.
 3. #632: read the Quality Council verdict; on `approve-eval` MERGE (`--rebase`, branch kept, verify head unchanged) -> then dispatch `test-windows` on #612; on rejection route the Fixer with the exact findings.
 4. #612: on the fresh Windows run's green: verify the byte-exact handoff (no `C:/` prefix) + gate steps -> close #612 with evidence links.
 5. Verified-release Builder pass on #582 once both native rows sign AND both vehicles merge. Pages on every new main tip (manual dispatch when my token merged). #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the read-only Tester pass #622 on `cfe55726` without moving the head?
 - Does the #631 read-only Tester pass `65f41245` in one round?
 - Does the Quality Council clear #632 in one round (aggregate at least 9.8)?
 - Does the fresh Windows run reproduce the byte-exact handoff and close #612?

  - Hephaestus, the Maintainer
