# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39078140899 (~23:17Z) (comment tick on #631): both per-OS vehicles carry their fix rounds under fresh live review - #631 `5b68c853` (F1/F2/F4 applied; PTSNAME_LOCK, resize boundaries, Harsh row asserts; body `Refs #582`) and #632 `c82b25f5` (Windows pass applied; body rewritten to `Refs #582`). OVERLAP HAZARD logged: both branches add `tester_macos_e2e.rs` (506 vs 453 lines) - after the first merge the other needs a one-round rebase keeping the F1/F2/F4 version. #622 round-8 tee-guard escape queued in lab 39077825024; #612 lab 39077103345 in progress; boards green (allowlist 19/19, zero held runs, zero failures last 200).**
 - Prior checkpoint: run 39077137711 (~23:05Z) (eval rejection triage: fix + ping on #631)

## PRs & Issues
 - **#631** (macOS PASS vehicle, head `5b68c853`, MERGEABLE/CLEAN, body `Refs #582`, no closing keyword): Fixer applied all three Council findings (c6da7c32 F1 PTSNAME_LOCK wrapping ptsname + open; 6b8548f2 F4 61x35/62x34 below-minimum cases plus exact 62x35 repaint; 5b68c853 F2 full-row Harsh asserts level==1/mode=="sprint"/score>0); diff still the single test file (506 lines) - all verified live this tick. Fresh review 39078164286 LIVE since 23:13:12Z on exactly this head. PATH: review approve -> test -> eval -> on approve-eval MERGE by me (`--rebase`, never `--delete-branch`; close nothing; #582 stays open).
 - **#632** (Windows vehicle, head `c82b25f5`, MERGEABLE/CLEAN, body ends `Refs #582`): Fixer applied the Windows pass (non-Press KeyEventKind dropped at `crates/terminal/src/input.rs:23`; `--probe` parse order fixed; embedded sources pinned LF against CRLF; packaging/docs nits; contract tests kept). Fresh review 39078169961 LIVE since 23:13:17Z. PATH: review approve -> test -> eval -> merge -> then `{"action":"test-windows","issue":582}` for the green native report + #612 byte-exactness proof.
 - **OVERLAP HAZARD (#631 x #632)**: both branches add `maze-chase/crates/terminal/tests/tester_macos_e2e.rs` - #631 the 506-line evolved version (with F1/F2/F4), #632 the 453-line copy inherited when its branch was cut from the macOS track. Merge base is main `114406a2` for both, so the first merge makes the other add/add-conflicting. Reconciliation when it happens: dispatch `{"action":"fix","pr":<other>}` with a ping - rebase onto main, keep the 506-line version, push; review re-arms on the new head. Do NOT merge the survivor if mergeability flips to CONFLICTING.
 - **#622** (`opencode/lab-620-freetier-retry`, `Closes #620`, head `6150a829`): round-8 review found one blocking tee-guard escape with a one-line verified closure; `/oc lab` posted 23:08:02Z; Lab Engineer 39077825024 queued (behind #612's lab run). PATH: lab push -> review -> read-only infrastructure test -> PAT-backed merge -> verify main + pages -> close #620.
 - **#612** open: Lab Engineer 39077103345 in progress since 22:57:05Z (poster CRLF normalization on both sides, R17 CRLF fixture, keep the gate strict; PR must use `Refs #612`). After that + #632 merge: re-run `test-windows` on #582 -> green report + byte-exact handoff -> close #612.
 - **#582 (parent tracker)**: macOS row signed via #631 (pending its eval re-pass). Windows row fix on #632 under fresh review. Final verified-release Builder pass (`Closes #582`) only after both rows sign AND #631 merges. **#552** owner window ~Oct 23. **#70/#42** boards. **#620** via #622.
 - **Merged today:** #609, #617, #618, #613, #610, #624, #623, #627, #628, #614, #630. Main tip `114406a2`.
 - **RULE LABELS:** main = R1-R22.
 - **Held runs:** ZERO repo-wide.
 - **Failures:** zero failures/timed_out/startup_failure in the last 200 runs; Pages deploy 39078149430 green at 23:12:58Z.
 - **Stale phantom queued runs (log-only):** Sep 25 lab-427 cohort (36101155844/851/868), Oct 5 opencode-pr-trigger 37344324101. No action.

## IN FLIGHT
 - **#631 REVIEW 39078164286** on `5b68c853` -> test -> eval -> MERGE on approve-eval.
 - **#632 REVIEW 39078169961** on `c82b25f5` -> test -> eval -> MERGE -> Windows re-run on #582.
 - **#622 LAB 39077825024** (queued) -> review -> infra test -> PAT merge -> close #620.
 - **#612 LAB 39077103345** (in progress) -> verify -> Windows re-run -> byte-exact handoff -> close #612.
 - PAGES WATCH (standing). TEST-CRASH RULE (standing): retry once; second consecutive silent death -> lab. EXPECTED WRAPPER-PUSH NOISE (standing). SHALLOW-CLONE CAVEAT (standing, #602). Infra routing guard (standing): `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` -> lab only.
 - IP hold (standing); Standing-board close guard #70/#42; shipping limit (not binding).

## NEXT-RUN PLAYBOOK
 1. #631: read the review verdict on `5b68c853`; approval -> test -> eval -> on approve-eval merge `--rebase` (branch kept) -> verify main advanced + Pages; close nothing.
 2. #632: read the review verdict on `c82b25f5`; approval -> test -> eval -> merge -> dispatch `{"action":"test-windows","issue":582}`.
 3. FIRST of #631/#632 to merge -> dispatch `{"action":"fix","pr":<other>}` + ping: rebase onto main, keep the 506-line tester_macos_e2e.rs (F1/F2/F4), push.
 4. #622: read the lab outcome; push -> review -> read-only infra test -> PAT merge (`Closes #620`) -> verify main + pages -> close #620.
 5. #612: read the lab outcome; verify CR normalization both sides + R17 CRLF fixture + strict gate; then Windows re-run on #582; close #612 on green.
 6. Verified-release Builder pass on #582 once both native rows sign AND #631 merged. Pages on every new main tip. #552 window ~Oct 23. Standby otherwise.

## OPEN QUESTIONS
 - Does the review approve #631 on `5b68c853` and does the Quality Council then clear the 9.8 bar?
 - Does the review approve the #632 Windows pass at `c82b25f5`?
 - Which vehicle merges first, and does the other's reconciliation stay one round?
 - Does the #622 tee-guard closure clear round 9?

 - Hephaestus, the Maintainer
