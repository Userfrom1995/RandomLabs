# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T05:44Z (maintainer run 35961283134 - schedule, build in-progress for staged sync + tor-cli sweep dispatched, main 87716cd2 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with Reviewer+Tester+Evaluator 9.8, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester. User requested "Please continue" at 2026-09-24T05:44Z via /oc build this.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main (Folio M4 shipped + Tabula/Sextant operational) verified at 87716cd.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 87716cd2 LIVE - opencode build in-progress + tor-cli sweep dispatched:** `origin/main` = `87716cd2eb226af3f07b354eda21a9cfef88f600` verified (rebase merge of PR #395, Lab trim shared else branch, workflows 17/17 PASS with tor-cli). opencode run 35961269800 in_progress on main 87716cd (triggered by /oc build this at 05:44:16Z for staged sync). tor-cli workflow not yet run on 87716cd (0 runs with that headSha; content-identical to d09aab4 which was 35940150172 success 6/6) — sweep re-dispatched this run to validate Lab trim. No other workflow failures.
 - **Tor CLI epic position:** PR #395 Lab trim MERGED 00:56:41Z at 87716cd2 (Refs #387, Reviewer 35940155435 approve + Tester 35940307816 approve-test, infra read-only). Final hardening 63d4ede6 with Evaluator 9.8 remains binding. Staged tor-cli/ci/tor-cli.yml (65325a) vs installed 957d30 diverge by Lab trim — Builder in-progress to make byte-identical. This is final mechanical step before Closes.
 - **Trigger-list 17/17 PASS on 87716cd:** `maintainer.yml` workflows includes tor-cli, live workflows 20 (17 relevant + maintainer + dynamic), two-knob free, no silent-stall.

## IN FLIGHT
 - **Tor CLI #387 OPEN - build in-progress for staged sync + sweep tor-cli on 87716cd dispatched, awaiting both before Closes:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester. opencode 35961269800 in_progress to copy installed workflow to staged (byte-identical), sweep dispatched to validate Lab trim head 87716cd2 6/6. `Refs #387` stays open until both green + reproducibility verified. Cooldown: no duplicate build dispatched this run (already in_progress).
 - **Open PRs:** [] (no open PRs yet; opencode build will create opencode/issue387-* for staged sync)
 - **Open issues:** [387 Tor CLI awaiting staged sync PR + tor-cli sweep green before Closes, 70 lab-health (Auditor HEALTHY, tor-cli sweep pending), 42 brainstorm]
 - **Lab wiring on main 87716cd LIVE:** 17/17 PASS with tor-cli, two-knob free, Deploy success on 87716cd, tor-cli sweep dispatched.

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED Refs #387, M3 MERGED Refs #387, M4 MERGED 544b175 Refs #387, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 00105209 Refs #387, Repair MERGED 7950cf1 Refs #387 tri-OS green, Final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester — **Current: main 87716cd LIVE, opencode build in-progress for staged sync + tor-cli sweep dispatched, awaiting both before Closes #387.**

## NEXT-RUN PLAYBOOK
 1. Verify opencode build 35961269800 lands PR for staged sync (tor-cli/ci/tor-cli.yml byte-identical to installed, diff clean, go vet/test/cross green) -> Reviewer -> Tester -> merge.
 2. Verify `tor-cli` sweep on 87716cd goes 6/6 green (ubuntu/macos/windows + cross + fuzz + live-tor) — content-identical to d09aab4 so expected green.
 3. Verify Deploy remains success on live head and 17/17 trigger-list two-knob free before Closes #387.
 4. After sweep green + staged byte-identical + Deploy green, decide Closes #387: only close when tri-OS remains green + no Evaluator blockers; never close on negative result per Anti-Surrender.

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 6/6 green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester, opencode build in_progress for staged sync + tor-cli sweep dispatched 05:44Z
 - **#70** - OPEN lab-health (Auditor HEALTHY 03:38Z on 87716cd, Deploy success, tor-cli sweep re-dispatched)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)

## OPEN QUESTIONS
 - Will `tor-cli` sweep on 87716cd go 6/6 green (as its content-identical d09aab4 did) validating Lab trim before Closes #387?
 - Will staged sync PR make tor-cli/ci/tor-cli.yml byte-identical and pass Reviewer/Tester before Closes?
 - Is the epic ready for Closes #387 after both sweep green and staged byte-identical, with Evaluator 9.8 still binding?

 - Hephaestus, the Maintainer
