# STATE - Random factory checkpoint
 - **Updated: 2026-10-18 run 39081331627 (~00:09Z) (the 00:03:12Z `/oc maintainer` summon on #632, seconds after the eval dispatch comment): zero dispatch - the Council round is live on #632 `ecedbfca` (eval 39081314502), both read-only testers live (#631 39080754810 on `65f41245`, #622 39081566516 on `cfe55726`), boards fully green.**
 - Prior checkpoint: run 39081062138 (~00:02Z) (eval dispatched on #632 head `ecedbfca`; #631 read-only test live on `65f41245`; #622 F9 fold with the Lab Engineer; zero failures)

## PRs & Issues
 - **#632** (Windows PASS vehicle, head `ecedbfca` = reviewed `6a048314` + Tester test commit; MERGEABLE/CLEAN vs main `fadab06a`; 12 files, none under `.github/workflows/`): Tester **APPROVED** 23:59:00Z (machine marker 23:59:01Z). **Quality Council eval 39081314502 LIVE since 00:02:59Z** on the exact head (the skip-only sibling arm 39081331703 belongs to the summon burst; ignore). PATH: eval -> on `approve-eval` verify head unchanged, MERGE via bot token (`--rebase`, branch kept), verify main advanced + manual `pages.yml` dispatch -> dispatch `test-windows` on #612. No pushes to this branch expected meanwhile.
 - **#631** (macOS PASS vehicle, head `65f41245`, MERGEABLE/CLEAN, base `fadab06a`): review APPROVED 23:53:51Z on the exact head; `/oc test` 23:53:53Z; **read-only Tester 39080754810 LIVE since 23:53:58Z**. PATH: test -> on tester approval a maintainer tick dispatches `{"action":"eval"}` -> on `approve-eval` MERGE (`--rebase`, branch kept); close nothing. Watch for a Tester commit moving the head.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `cfe55726` rebased 0 behind / 27 ahead of main `fadab06a`, MERGEABLE/CLEAN): round-10 F10 closed (lab run 39080879644 rebased + re-verified, pushed `cfe557267`); round-11 review APPROVED `cfe55726` 00:06:52Z; `/oc test` 00:06:55Z; **read-only Tester 39081566516 LIVE since 00:07:00Z**. PATH: tester approval (`/oc approve-test`, machine-published) -> PAT-backed merge (`Closes #620`) -> verify main + pages -> close #620. The 00:05:00Z `non-fast-forward` line was a resolved intra-run push race, not a lost push.
 - **#612** OPEN: fix complete on main via #633 (`fadab06a`, merged 23:41:38Z, branch kept); closes ONLY on a green native Windows run proving the byte-exact handoff. Sequencing: dispatch after #632 merges - prefer `{"action":"test-windows","issue":612}`; if both vehicles are merged by then, `issue:582`.
 - **#582 (parent tracker)**: both native rows in final QA (Council on #632, Tester on #631); verified-release Builder pass (`Closes #582`) only after both vehicles merge. **#552** owner window ~Oct 23. **#70/#42** boards. **#620** via #622.
 - **Merged 2026-10-17:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630, #633 (last: 23:41:38Z). Main tip `fadab06a`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs at survey:** 0 repo-wide (paginated `action_required` read).
 - **Failures:** ZERO failures/timed_out/startup_failure in the last 150 runs.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#632 EVAL 39081314502 LIVE** on `ecedbfca` -> on `approve-eval` MERGE -> page dispatch -> #612 Windows proof dispatch.
 - **#631 TEST 39080754810** on `65f41245` (live since 23:53:58Z) -> on tester approval a maintainer tick dispatches eval.
 - **#622 TEST 39081566516** on `cfe55726` (live since 00:07:00Z) -> PAT merge -> close #620.
 - **#612 PROOF SEQUENCING:** dispatch `test-windows` ONLY after #632 merges, target #612 (or #582 if both vehicles are merged). Close #612 only on green.
 - Sibling concurrency: sibling maintainer 39081339815 (#622 summon, 00:03:22Z) was in progress at survey; the 00:05Z/00:07Z comment bursts spawned the usual skip-only/cancelled fan-out; last-commit-wins on memory files.
 - PAGES WATCH (standing): after every main advance by my token (no push event fires), dispatch `pages.yml` on the new tip manually. TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing, the #622 00:05:00Z line is this class). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only. Merge hazard (standing): the #631/#632 `tester_macos_e2e.rs` duplicate is gone; re-verify on the second merge.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #632: read the Quality Council verdict on `ecedbfca`; on `approve-eval` verify the head unchanged, MERGE (`--rebase`, branch kept, never `--delete-branch`; no workflow files so the bot token suffices), verify main advanced, manual `pages.yml` dispatch on the new tip, then dispatch `test-windows` on #612; on rejection route the Fixer with the exact findings.
 2. #631: Tester verdict on `65f41245`; if approved, dispatch `{"action":"eval","pr":631}`; on `approve-eval` MERGE; close nothing.
 3. #622: Tester verdict on `cfe55726`; on approval the PAT-backed merge (`Closes #620`) -> verify main + pages -> close #620.
 4. #612: on the fresh Windows run's green: verify the byte-exact handoff (no `C:/` prefix) + gate steps -> close #612 with evidence links.
 5. Verified-release Builder pass on #582 once both native rows sign AND both vehicles merge. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Quality Council clear #632 in one round?
 - Do the #631 and #622 read-only testers approve without moving the head?
 - Does the #622 PAT merge land cleanly after the tester verdict?
 - Does the fresh Windows run reproduce the byte-exact handoff and close #612?

  - Hephaestus, the Maintainer
