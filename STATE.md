# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T06:25Z (maintainer runs 35963994886+35964004251 - issue #397 NEW Owner directive queued lab, main 228d7cb9 LIVE, sweep tor-cli dispatched)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 OWNER):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts — codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 OPEN, dispatched `lab` on #397 this run.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with Reviewer+Tester+Evaluator 9.8, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester. Staged sync PR #396 MERGED 228d7cb9 Refs #387 (byte-identical staged/installed, 9.9 eval 35961915877). Deploy success on 228d7cb9 35962553419, tor-cli on PR head 4098d08 6/6 SUCCESS, sweep dispatched for live head verification before Closes.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main (Folio M4 shipped + Tabula/Sextant operational) verified at 228d7cb9.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 228d7cb9 LIVE - PR #396 staged sync MERGED:** `origin/main` = `228d7cb9603326b36a23795738ceabb8aff6ad87` verified (rebase merge of PR #396, staged CI 9842B byte-identical, 3 Tester regression tests). Deploy success 35962553419 workflow_dispatch on 228d7cb9. No tor-cli run yet on push 228d7cb9 (path filter gap, sweep dispatched this run). Workflows 17/17 PASS with tor-cli expected (verify sweep result). Two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`). No silent stall.
 - **Tor CLI epic position:** PR #395 Lab trim MERGED 87716cd2 Refs #387, final hardening 63d4ede6 with Evaluator 9.8 binding, PR #396 staged sync MERGED 228d7cb9 Refs #387 (9.9 eval 35961915877, 6/6 tri-OS on 4098d08). Deploy green on new head, sweep tor-cli dispatched for live-head 6/6 before Closes #387.
 - **Documentation Invariant epic position:** Issue #397 NEW 2026-09-24T06:20Z Owner directive, dispatched lab this run (35964004251), no PR yet, progress file pending. Lab will codify invariant + semantic phases across AGENTS.md/LAB.md/architect/builder/reviewer/maintainer/curator.
 - **Trigger-list 17/17 PASS on 228d7cb9 (sweep pending):** `maintainer.yml` workflows includes tor-cli, live workflows 20 (17 relevant + maintainer + dynamic), two-knob free, no silent stall.

## IN FLIGHT
 - **Documentation Invariant #397 OPEN - dispatched lab:** Issue #397 OPEN Owner directive, `lab` dispatched this run (no prior lab, no PR, no progress file). Awaits Lab Engineer PR with prompt updates + invariant codification.
 - **Tor CLI #387 OPEN - PR #396 MERGED 228d7cb9 Refs #387, awaiting sweep verification before Closes:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387, staged sync MERGED 228d7cb9 Refs #387 (Reviewer approve 35961434228, Tester approve-test 35961501976, Evaluator 9.9 35961915877, tor-cli 6/6 on 4098d08). Sweep `tor-cli` on `main` dispatched this run to verify 6/6 on live head 228d7cb9 (byte-identical to 6/6 PR head). `Refs #387` kept open until sweep 6/6 + Deploy green + 17/17 PASS; never close on negative result.
 - **Open PRs:** [] (no open PRs, next lab PR for #397 expected)
 - **Open issues:** [397 Unified Documentation Invariant (lab dispatched), 387 Tor CLI awaiting sweep green before Closes, 70 lab-health (Deploy success on 228d7cb9), 42 brainstorm]
 - **Lab wiring on main 228d7cb9 LIVE:** 17/17 PASS expected (verify sweep + next lab head).

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED Refs #387, M3 MERGED Refs #387, M4 MERGED 544b175 Refs #387, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 00105209 Refs #387, Repair MERGED 7950cf1 Refs #387 tri-OS green, Final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester -> PR #396 staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS) -> **Current: main 228d7cb9 LIVE, #397 NEW lab dispatched, sweep tor-cli on main dispatched, PR #396 MERGED, awaiting sweep 6/6 + Deploy green before Closes #387.**

## NEXT-RUN PLAYBOOK
 1. Verify Lab Engineer run on #397 started (gh run list --workflow "Lab Engineer" head 228d7cb9 or branch opencode/issue397-*) and progress file created with semantic phases, prompt updates, no milestone leakage.
 2. Verify sweep `tor-cli` on `main` 228d7cb9 completes 6/6 SUCCESS (ubuntu/macos/windows/cross/fuzz/live-tor) - content byte-identical to 4098d08 6/6 SUCCESS, plus Deploy 35962553419 already success.
 3. Verify 17/17 trigger-list two-knob free (`maintainer.yml` workflows + `opencode.json` free models) on live head before any Closes.
 4. If sweep green + Deploy green + 17/17 PASS + Evaluator 9.9 still binding, decide `Closes #387` (final epic closure) per Anti-Surrender (only on positive gates). Never close on negative result.
 5. If lab PR for #397 opens, route to Reviewer (`/oc review`) per infra guard (never fix/continue on prompt/workflow PR).

## ISSUES
 - **#397** - OPEN Unified Documentation Invariant - CREATED 2026-09-24T06:20Z Owner, dispatched `lab` this run (35964004251), no PR yet, awaiting Lab Engineer PR with AGENTS.md/LAB.md + 5 prompt updates + semantic phases
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 6/6 green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester, PR #396 staged sync MERGED 228d7cb9 Refs #387 with 9.9 eval + Deploy success, sweep dispatched for live-head verification
 - **#70** - OPEN lab-health (Deploy success on 228d7cb9 35962553419, 17/17 PASS, sweep pending)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)

## OPEN QUESTIONS
 - Will Lab Engineer on #397 deliver unified doc invariant + semantic phases across 7 files without regressing pipeline wiring (exclusion guards, trigger keywords, zero em dashes, no PAT)?
 - Will sweep tor-cli on 228d7cb9 complete 6/6 SUCCESS given identical content to 4098d08 6/6 SUCCESS?
 - Will Deploy stay green and trigger-list 17/17 hold on 228d7cb9 after sweep before Closes #387?
 - Is the epic ready for Closes #387 after sweep green verification (Evaluator 9.8+ still binding)?

 - Hephaestus, the Maintainer
