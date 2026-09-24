# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T05:47Z (maintainer run 35961444727 - PR #396 staged sync open, Reviewer approve, Tester in_progress, tor-cli in_progress on a395c9d, main 87716cd2 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with Reviewer+Tester+Evaluator 9.8, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester. Builder staged sync PR #396 now open for final mechanical closure.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main (Folio M4 shipped + Tabula/Sextant operational) verified at 87716cd.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 87716cd2 LIVE - PR #396 staged sync open, awaiting Tester + tor-cli:** `origin/main` = `87716cd2eb226af3f07b354eda21a9cfef88f600` verified (rebase merge of PR #395, Lab trim shared else branch, workflows 17/17 PASS with tor-cli). Deploy success 35961443869 workflow_dispatch on 87716cd. opencode 35961269800 success at 05:46:15Z landed PR #396 (Builder: tor-cli/ci/tor-cli.yml byte-identical to installed, diff clean, YAML 4 jobs, go build/vet/test + GOOS=darwin/windows + cross green). No other workflow failures.
 - **Tor CLI epic position:** PR #395 Lab trim MERGED 87716cd2 Refs #387 (Reviewer 35940155435 approve + Tester 35940307816 approve-test). Final hardening 63d4ede6 with Evaluator 9.8 remains binding. Staged tor-cli/ci/tor-cli.yml now byte-identical per PR #396 (2 files, Refs #387). This is final mechanical step before Closes — merge only after Reviewer+Tester+tor-cli green.
 - **Trigger-list 17/17 PASS on 87716cd:** `maintainer.yml` workflows includes tor-cli, live workflows 20 (17 relevant + maintainer + dynamic), two-knob free, no silent-stall.

## IN FLIGHT
 - **Tor CLI #387 OPEN - PR #396 staged sync in review/test:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387. PR #396 head a395c9d2 at 05:46:15Z MERGEABLE UNSTABLE, Refs #387, Reviewer 35961434228 approve (12 checks, staged==installed, progress honest, no em dashes, working tree clean, decision test), Tester 35961501976 in_progress (dispatched by Reviewer), tor-cli 35961421181 in_progress on a395c9d (ubuntu success, macos success, windows in_progress, fuzz/live-tor in_progress). `Refs #387` stays open until green + Tester approve-test; never close on negative result.
 - **Open PRs:** [396 torshim: re-sync staged tri-OS CI with Lab-trimmed workflow, head a395c9d2 MERGEABLE UNSTABLE, Refs #387, Reviewer approve -> Tester in_progress]
 - **Open issues:** [387 Tor CLI awaiting PR #396 merge before Closes, 70 lab-health (Deploy success 35961443869 on 87716cd, tor-cli in_progress on PR), 42 brainstorm]
 - **Lab wiring on main 87716cd LIVE:** 17/17 PASS with tor-cli, two-knob free, Deploy success on 87716cd, tor-cli PR matrix in_progress.

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED Refs #387, M3 MERGED Refs #387, M4 MERGED 544b175 Refs #387, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 00105209 Refs #387, Repair MERGED 7950cf1 Refs #387 tri-OS green, Final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester -> PR #396 staged sync open a395c9d (Refs #387, Reviewer approve, Tester+tor-cli in_progress) — **Current: main 87716cd LIVE, PR #396 awaiting Tester+tor-cli green before merge and Closes #387.**

## NEXT-RUN PLAYBOOK
 1. Await Tester 35961501976 approve-test on PR #396 (verify staged/installed identical, off-Linux skip equivalence) and tor-cli 35961421181 6/6 green on a395c9d (ubuntu/macos already success, windows/fuzz/live in_progress).
 2. Verify Deploy remains success on live head 87716cd and 17/17 trigger-list two-knob free before merge.
 3. After Reviewer approve + Tester approve-test + tor-cli 6/6 green, merge PR #396 via rebase (Refs #387, verify merge-base present, no orphan, branch retained) and verify main successor head.
 4. After merge, verify tor-cli still green on new main (content-identical to 87716cd) + Deploy green, then decide Closes #387: only close when tri-OS green + Evaluator 9.8 still binding; never close on negative result per Anti-Surrender. Log staged byte-identical.

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 6/6 green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester, PR #396 staged sync open a395c9d Reviewer approve Tester+tor-cli in_progress Refs #387
 - **#70** - OPEN lab-health (Deploy success 35961443869 on 87716cd, tor-cli in_progress on PR #396, 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)

## OPEN QUESTIONS
 - Will Tester on PR #396 approve (staged==installed, off-Linux TestConnectDisconnect single skip equivalence) and tor-cli matrix go 6/6 green on a395c9d (windows/fuzz/live pending)?
 - Will main successor after PR #396 merge stay Deploy green and 17/17 trigger-list two-knob free before Closes #387?
 - Is the epic ready for Closes #387 after PR #396 merge with Evaluator 9.8 still binding?

 - Hephaestus, the Maintainer
