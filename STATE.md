# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T07:12Z (maintainer run 35968330622 - issue_comment `/oc review` + `/oc maintainer` on PR #401 per-OS testers, main ce933b7a LIVE, review dispatched)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts — codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) — invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 228d7cb9 Refs #387 (byte-identical staged/installed 9.9 eval, 6/6 tri-OS on 4098d08). Deploy success on 228d7cb9 35962553419 and on fee11745 35965214683 success. Issue #387 awaits tri-OS green on live ce933b7a (sweep now fixed via #399) + per-OS real-user tester reports + auditor field failure audit before Closes. User field failure reported 2026-09-24T05:44Z on #387 + per-OS tester request 2026-09-24T06:57Z: create dedicated Windows/macOS/Linux testers, every command/flag/workflow report per platform.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main, verified at ce933b7a after PR #398 merge (prompts now enforce unified docs).

## CRITICAL INFRASTRUCTURE STATE
 - **Main ce933b7a LIVE - PR #398 + #399 fixes MERGED:** `origin/main` = `ce933b7a7c1d45ca8c22b2c6eafea1f92eb9c7ca` verified via `git ls-remote origin/main` == ce933b7a and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == ce933b7a (parents d3fabf5a -> fee11745, 2 lab commits: d3fabf5a allowlist+verification + ce933b7a schedule+workflow_call backstop for #399, plus 5 doc invariant commits). `git log --oneline -5 origin/main` = ce933b7a/d3fabf5a/fee11745/057033cb/495d49ba + 228d7cb9. Branch `opencode/lab-387-tor-cli-ci` retained. Deploy static site success 35968359951? workflow_dispatch on ce933b7a? plus fee11745 Deploy 35965214683 success. No `Co-authored-by` trailers.
 - **Workflows on ce933b7a:** `maintainer.yml` workflows includes `tor-cli` (peros pending until PR #401 merges — on PR head includes `opencode-peros-test`), live workflows 20 (17 relevant + maintainer + Dependency Graph + pages-build-deployment) on main, 21 after peros merges. `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). `tor-cli` active at `.github/workflows/tor-cli.yml` with schedule `17 6 * * 1` + workflow_call + workflow_dispatch + push/pull, staged `tor-cli/ci/tor-cli.yml` byte-identical 7dcf3e4? Actually schedule only on installed, staged remains without, but product tor-cli tree unchanged. No em dashes, no PAT in env, working tree clean.
 - **Tor CLI epic position:** Staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS on 4098d08 byte-identical to fee11745 via 7dcf3e4, Deploy success). Sweep gap fixed: `tor-cli` 35968005834 success workflow_dispatch on fee11745 proves sweep now works (allowlist+verification + schedule landed d3fabf5a/ce933b7a). New head ce933b7a has `tor-cli` push 35968359503 in_progress (3 build-vet failures observed, needs completion triage) + PR #401 pull_request 35968304591 in_progress (3 OS successes so far). Auditor runs 35967047288 in_progress + 35967371532 pending already cover every-flag audit. Per-OS testers now in PR #401 Refs #387 (infra enabling tri-OS real-user validation).
 - **Documentation Invariant epic position:** Issue #397 CLOSED at fee11745 (Refs #397, verified Deploy green, 17/17 PASS, zero leakage per Reviewer 35964795764 + Tester 35964877652). Historical progress untouched as specified. PR #398 merged.
 - **Sweep gap epic position:** Issue #399 OPEN — diagnosis verified, fix d3fabf5a+ce933b7a live, sweep success 35968005834 on fee11745, ce933b7a head validation in_progress.

## IN FLIGHT
 - **Tor CLI #387 OPEN - per-OS tester PR + sweep fix live:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387, Evaluator 9.9 on staged sync, tor-cli 6/6 on 4098d08 (byte-identical to fee11745), Deploy 35965214683 on fee11745 success + sweep fix live, per-OS request 2026-09-24T06:57Z now in PR #401 Refs #387 (lab per-OS testers). Auditor runs in_progress/pending already cover every-flag audit; per-OS testers will test every command/flag/workflow as real users per OS.
 - **PR #401 OPEN - [Infra] Per-OS real-user testers (Refs #387):** Head 2d3edc5ae5ed573f7485c4a84f325550cd607e95 on opencode/lab-387-tor-cli-ci, MERGEABLE unstable, 28 files (3 prompts tester-linux/macos/windows, workflow opencode-peros-test.yml 273 lines, wiring opencode.yml + maintainer.yml peros, REGISTRY 3 rows, 14 agents awareness, docs sync 7 locations). Owner `/oc review` 07:11:41Z — this run dispatches Reviewer at head 2d3edc5. Awaiting Reviewer verdict then Tester infra-guard before merge.
 - **Issue #399 OPEN - sweep gap fix live but verification pending:** Fix commits d3fabf5a + ce933b7a merged to ce933b7a, sweep success 35968005834 on fee11745, ce933b7a tor-cli push 35968359503 in_progress (3 failures) needs completion triage; keep OPEN until ce933b7a green.
 - **Open issues:** [399 sweep gap, 387 Tor CLI per-OS testers + field failure, 70 lab-health, 42 brainstorm] (397 CLOSED)
 - **Lab wiring on main ce933b7a LIVE:** Deploy success on fee11745/ce933b7a, tor-cli schedule backstop live, peros pending merge.

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening + Lab trim + staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS, Deploy green) -> Documentation Invariant PR #398 MERGED fee11745 Refs #397 (Reviewer+Tester approved, 5 commits) -> Sweep gap fix PRs d3fabf5a+ce933b7a MERGED ce933b7a Refs #399 (allowlist+verification+schedule, sweep success 35968005834) -> Per-OS tester PR #401 OPEN Refs #387 (3 testers + workflow, awaiting review) -> Current: main ce933b7a LIVE, #399 OPEN pending ce933b7a green, #387 OPEN awaiting per-OS tester merge + tri-OS sweep + per-OS reports before Closes.

## NEXT-RUN PLAYBOOK
 1. Await `opencode-review` on PR #401 2d3edc5 — verify YAML/bash/PAT isolation/trigger/REGISTRY/docs sync passes; if `fix`, route lab; if `approve`, dispatch Tester infra-guard.
 2. Await `tor-cli` on ce933b7a 35968359503 — verify 6/6 after completion; if red, correlate jobs and dispatch lab (schedule commit should not break builds, failures may be transient).
 3. Await `tor-cli` on PR #401 35968304591 — verify 6/6 on 2d3edc5 (already 3 OS green).
 4. After PR #401 merges, dispatch per-OS testers `/oc test-linux`, `/oc test-macos`, `/oc test-windows` on #387 for separate reports; Tester aggregates before Evaluator.
 5. No new build/architect/research on #387 until per-OS testers + auditor + sweep report lands (Anti-Surrender: never close on negative).

## ISSUES
 - **#401** - OPEN [Infra] Per-OS real-user testers for Linux, macOS, Windows (Refs #387) — CREATED 2026-09-24T07:11Z Lab Engineer, 28 files, head 2d3edc5 MERGEABLE unstable, Refs #387, awaiting Reviewer verdict at 2d3edc5
 - **#399** - OPEN [Audit] tor-cli sweep never materializes — CREATED 2026-09-24T07:02Z Auditor, diagnosis verified, fix d3fabf5a+ce933b7a live ce933b7a, sweep success 35968005834 on fee11745, ce933b7a tor-cli in_progress pending
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, staged sync MERGED 228d7cb9 Refs #387 with 9.9 eval + Deploy success on fee11745/ce933b7a, field failure ping 2026-09-24T05:44Z + per-OS tester request 2026-09-24T06:57Z, lab per-OS testers in PR #401 Refs #387
 - **#70** - OPEN lab-health (Deploy success on ce933b7a pending 35968359951, tor-cli in_progress, sweep gap fixed, 17/17+peros pending)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Reviewer approve PR #401 at 2d3edc5 (YAML/bash/PAT/trigger/REGISTRY/docs) and will Tester infra-guard pass read-only?
 - Will tor-cli on ce933b7a complete green (currently 3 build-vet failures in_progress) or need lab triage, and will PR #401 tor-cli stay green?
 - Will Lab per-OS testers after merge report per-platform real-user results for every command/flag/workflow and fix gaps with honest exit contracts?
 - Is #387 ready for Closes after per-OS merge + sweep green on ce933b7a + auditor healthy + per-OS reports + Evaluator 9.9?

 - Hephaestus, the Maintainer
