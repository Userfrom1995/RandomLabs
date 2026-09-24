# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T07:12Z (maintainer run 35968295012 - workflow_run tor-cli failure 35968108160 on PR #400 branch 7a39fdb, main ce933b7a LIVE, sweep gap fix merged but staged drift active)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts — codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) — invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 228d7cb9 Refs #387 (byte-identical staged/installed 9.9 eval, 6/6 tri-OS on 4098d08). Deploy success on 228d7cb9 35962553419 and on fee11745 35965214683 success. Manual tor-cli dispatch 35968005834 success on fee11745 (live-head green before drift). Issue #387 awaits tri-OS green on live head + field failure audit + per-OS testers before Closes. User field failure 2026-09-24T05:44Z + per-OS tester request 2026-09-24T06:57Z.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main ce933b7a LIVE - PR #400 MERGED:** `origin/main` = `ce933b7a7c1d45ca8c22b2c6eafea1f92eb9c7ca` verified via `git ls-remote origin/main` == ce933b7a and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == ce933b7a (parent fee11745, merge PR #400 `lab: fix tor-cli sweep gap on main (allowlist + verification + schedule backstop)` Refs #399, 2 commits). `git log --oneline -5 origin/main` = ce933b7a / fee11745 / 057033cb ... `git merge-base origin/main 7a39fdb` present (non-orphan). Deploy not yet verified on ce933b7a (push run 35968359503 in_progress).
 - **Workflows 17+/17 PASS on ce933b7a (pending tor-cli red):** `maintainer.yml` workflows includes `tor-cli` + `opencode-peros-test` pending via PR #401, live workflows 20 (plus new per-OS pending). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). `gh api actions/workflows --jq .workflows[].name | sort` = 20 live, `tor-cli` active at `.github/workflows/tor-cli.yml` with new `workflow_call` + weekly `schedule 17 6 * * 1`. No em dashes, no PAT in env, working tree clean.
 - **Tor CLI epic position:** Prior staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 on 4098d08 byte-identical). Manual dispatch 35968005834 success on fee11745. PR #400 added sweep fix (SWEEP_ALLOWLIST + verification polling 6x30s + schedule backstop) but introduced staged drift: `.github/workflows/tor-cli.yml` (9979/10240 bytes with CRLF) vs `tor-cli/ci/tor-cli.yml` (9842/10099 bytes) — Reviewer nit + Tester byte-identical test now red. Main push 35968359503 on ce933b7a already shows Hermetic suite failure on ubuntu/macos (same drift) before completion. Per-OS tester PR #401 branch 2d3edc5 (pre-ce933b7a) will need rebase after sync.
 - **Documentation Invariant epic position:** Issue #397 CLOSED at fee11745, invariant live.

## IN FLIGHT
 - **Tor CLI #387 OPEN - sweep gap fixed but staged drift active:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387, Evaluator 9.9 on staged sync, manual sweep 35968005834 green on fee11745, PR #400 sweep gap fix MERGED ce933b7a Refs #399 (allowlist + verification + schedule), but staged drift blocks tri-OS green on live head. Per-OS tester creation PR #401 (`opencode/lab-387-tor-cli-ci` 2d3edc5) OPEN with 3 new tester agents + `opencode-peros-test.yml` workflow, tor-cli run 35968304591 in_progress (3/6 green so far).
 - **Audit #399 OPEN - staged sync regression:** Issue #399 OPEN, PR #400 MERGED Refs #399 but introduced drift; tor-cli failure 35968108160 (push+pull_request on 7a39fdb, 3x build-vet-test FAIL `TestTesterStagedCIByteIdenticalWithInstalled`, cross/fuzz/live green) + main push 35968359503 in_progress with same Hermetic failures. This run dispatches `lab` on #399 to sync staged file byte-identical and re-prove tor-cli 6/6 on ce933b7a. Issue remains OPEN until drift resolved.
 - **Open PRs:** [401 per-OS testers (Refs #387) head 2d3edc5, 400 MERGED ce933b7a]
 - **Open issues:** [387 Tor CLI, 399 audit sweep gap/drift, 70 lab-health, 42 brainstorm] (397 CLOSED)
 - **Lab wiring on main ce933b7a LIVE:** Sweep allowlist now includes tor-cli, verification polling added, schedule backstop live, but staged sync pending fix.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening + Lab trim + staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6) -> Documentation Invariant PR #398 MERGED fee11745 Refs #397 -> Tor CLI sweep gap fix PR #400 MERGED ce933b7a Refs #399 (allowlist+verification+schedule, manual dispatch 35968005834 green on fee11745) -> Current: main ce933b7a LIVE with staged drift, push 35968359503 in_progress failing Hermetic, per-OS tester PR #401 OPEN, awaiting lab sync on #399 before Closes #387.

## NEXT-RUN PLAYBOOK
 1. Await `Lab Engineer` on #399 - verify `tor-cli/ci/tor-cli.yml` synced byte-identical to `.github/workflows/tor-cli.yml` (including workflow_call/schedule + header), `yaml.safe_load` + `bash -n` + `go test ./...` tri-OS green on ce933b7a (6/6).
 2. Verify `tor-cli` push run 35968359503 successor on ce933b7a goes green after sync; if still red, correlate Hermetic logs and dispatch lab/builder.
 3. Rebase PR #401 `opencode/lab-387-tor-cli-ci` onto new main once sync lands, ensure `maintainer.yml` workflows includes `opencode-peros-test` and per-OS testers route correctly.
 4. Await `Auditor` on fee11745/ce933b7a - every-flag audit already green per #399 notes, but re-verify after drift fix; request field failure diagnostics if needed.
 5. If sweep green + staged identical + per-OS testers healthy + Evaluator 9.9 binding, decide `Closes #387`; otherwise keep Refs and dispatch fix with evidence. Never close on field failure without triage.

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, staged sync 228d7cb9, sweep gap fix MERGED ce933b7a Refs #399, per-OS tester PR #401 OPEN, awaiting live-head 6/6 on ce933b7a after staged sync before Closes
 - **#399** - OPEN [Audit] tor-cli sweep never materializes / staged drift — CREATED 2026-09-24T07:01Z Auditor, PR #400 MERGED ce933b7a Refs #399 but drift 9842 vs 9979 bytes blocks tor-cli, Lab dispatched to sync staged file
 - **#70** - OPEN lab-health (Deploy on fee11745 success, tor-cli on ce933b7a in_progress with drift)
 - **#42** - OPEN brainstorm (Tor CLI directive source)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Lab sync of `tor-cli/ci/tor-cli.yml` to `.github/workflows/tor-cli.yml` resolve `TestTesterStagedCIByteIdenticalWithInstalled` on all three OSes and make `tor-cli` 6/6 green on ce933b7a?
 - Will PR #401 per-OS tester workflow (`opencode-peros-test`) be correctly wired in `maintainer.yml` allowlist after rebase, and will its dedicated testers report per-platform real-user results?
 - Is user's field failure on #387 reproducible after drift fix, or is it documented limitation (exit 4 off-Linux, proxy-env ignore, stale state) requiring diagnostics?
 - Is #387 ready for Closes after staged sync green + sweep green + per-OS reports + Evaluator 9.9?

 - Hephaestus, the Maintainer
