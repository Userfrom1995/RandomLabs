# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T06:20Z (maintainer run 35964004251 - issue #397 opened for Unified Documentation Invariant, main 228d7cb9 LIVE, tor-cli sweep dispatched)**

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with Reviewer+Tester+Evaluator 9.8, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester. Staged sync PR #396 MERGED 228d7cb9 Refs #387 (byte-identical staged/installed, 9.9 eval).
 - **UNIFIED DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts. All `<project>/docs/` and `<project>/README.md` must present single cohesive product view; milestone numbers/sprint references forbidden in public docs. Semantic phase naming replaces bare M1/M2 in progress/ and PR titles. Agent prompts to update: AGENTS.md & LAB.md (constitutional), architect.md (unified doc schemas + semantic roadmaps), builder.md (negative constraints + seamless integration), reviewer.md (Zero Milestone Leakage static check), maintainer.md & curator.md (semantic phases alignment). Assigned to Lab Engineer (CTO).
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main (Folio M4 shipped + Tabula/Sextant operational) verified at 228d7cb9.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 228d7cb9 LIVE - PR #396 staged sync MERGED:** `origin/main` = `228d7cb9603326b36a23795738ceabb8aff6ad87` verified (rebase merge of PR #396, staged CI 9842B byte-identical, 3 Tester regression tests added). Prior head 87716cd2 (Lab trim) parent. Workflows 17/17 PASS with tor-cli (verify sweep on 228d7cb9). Deploy on 87716cd was success 35962553419 workflow_dispatch; new head Deploy pending after sweep. opencode-eval 35961915877 approve-eval 9.9, Reviewer 35961434228 approve, Tester 35961501976 approve-test, tor-cli 35961712419 6/6 SUCCESS on 4098d08, tor-cli 35961421181 6/6 SUCCESS on a395c9d. No other workflow failures.
 - **Tor CLI epic position:** PR #395 Lab trim MERGED 87716cd2 Refs #387 (Reviewer 35940155435 + Tester 35940307816). Final hardening 63d4ede6 with Evaluator 9.8 remains binding. PR #396 staged sync MERGED 228d7cb9 Refs #387 (byte-identical, 9.9 eval, 6/6 tri-OS green on PR head). Awaiting post-merge tor-cli 6/6 on 228d7cb9 via sweep + Deploy green before Closes #387.
 - **Unified Docs Lab task #397:** OPEN, dispatched to Lab Engineer this run. Scope touches `.github/workflows/`? No — touches `.github/agents/`, `AGENTS.md`, `LAB.md` (infra — must route via lab, never fix/continue). No open PR for #397 yet; Lab will create `opencode/issue397-*` branch with prompt updates.
 - **Trigger-list 17/17 PASS on 228d7cb9:** `maintainer.yml` workflows includes tor-cli, live workflows 20 (17 relevant + maintainer + dynamic), two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`), no silent-stall.

## IN FLIGHT
 - **Tor CLI #387 OPEN - PR #396 MERGED 228d7cb9 Refs #387, awaiting post-merge verification before Closes:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 tri-OS green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387, staged sync MERGED 228d7cb9 Refs #387 (Reviewer approve 35961434228, Tester approve-test 35961501976 with 3 durable tests `tester_ci_sync_test.go`, tor-cli 35961712419 6/6 SUCCESS on 4098d08, Evaluator 35961915877 approve-eval 9.9). `Refs #387` kept open until sweep tor-cli 6/6 on 228d7cb9 + Deploy green; never close on negative result.
 - **Unified Docs #397 OPEN - Lab dispatched:** Issue #397 OPEN per spec above, no PR yet, Lab Engineer dispatched via `{"action":"lab","issue":397}` this run.
 - **Open PRs:** [] (PR #396 MERGED at 2026-09-24T05:59:50Z head 4098d08 -> 228d7cb9; no open PRs for #397 or #387)
 - **Open issues:** [397 Unified Documentation Invariant (Lab dispatched), 387 Tor CLI awaiting post-merge green before Closes, 70 lab-health (Deploy on 87716cd success, 228d7cb9 pending), 42 brainstorm]
 - **Lab wiring on main 228d7cb9 LIVE:** 17/17 PASS expected (verify after sweep: tor-cli on 228d7cb9, Deploy, two-knob free).

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED Refs #387, M3 MERGED Refs #387, M4 MERGED 544b175 Refs #387, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 00105209 Refs #387, Repair MERGED 7950cf1 Refs #387 tri-OS green, Final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester -> PR #396 staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS) — **Current: main 228d7cb9 LIVE, issue #397 Lab dispatched for Unified Docs, tor-cli sweep on 228d7cb9 dispatched, awaiting green before Closes #387.**

## NEXT-RUN PLAYBOOK
 1. Await Lab Engineer PR for #397: verify AGENTS.md/LAB.md invariant, architect/builder/reviewer/maintainer/curator prompts updated, semantic phase naming in progress/ + PR title discipline, Zero Leakage check in reviewer, no em dashes, no PAT in env, workflows allowlist still 17/17, then review->test (read-only infra guard)->merge.
 2. Verify tor-cli sweep on `228d7cb9` completes 6/6 SUCCESS (ubuntu/macos/windows/cross/fuzz/live-tor) - content identical to 4098d08 which was 6/6 SUCCESS.
 3. Verify Deploy static site success on 228d7cb9 and 17/17 trigger-list two-knob free.
 4. If tor-cli + Deploy green, decide `Closes #387` (final epic closure) per Anti-Surrender (Evaluator 9.8+ still binding from 63d4ede6 + 9.9 on sync). Never close on negative result.
 5. If tor-cli red on 228d7cb9, triage failure and dispatch Lab Engineer with exact job name + log.

## ISSUES
 - **#397** - OPEN Unified Documentation Invariant + semantic phase naming — CREATED 2026-09-24T06:20Z, Lab Engineer dispatched this run (AGENTS.md, LAB.md, 5 agent prompts)
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED, repair MERGED 7950cf1 6/6 green, final hardening MERGED 63d4ede6 Refs #387 with 9.8 eval, Lab trim MERGED 87716cd2 Refs #387 with Reviewer+Tester, PR #396 staged sync MERGED 228d7cb9 Refs #387 with 9.9 eval tor-cli 6/6 SUCCESS (awaiting sweep green)
 - **#70** - OPEN lab-health (Deploy success on 87716cd, 228d7cb9 pending sweep, tor-cli 4098d08 6/6 success 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)

## OPEN QUESTIONS
 - Will Lab Engineer deliver unified doc invariant across 7 files without breaking trigger-list/allowlist or introducing milestone leakage remains?
 - Will tor-cli sweep on 228d7cb9 complete 6/6 SUCCESS given identical content to 4098d08 6/6 SUCCESS?
 - Will Deploy stay green and trigger-list 17/17 hold on 228d7cb9 before Closes #387?

 - Hephaestus, the Maintainer
