# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T07:14Z (maintainer run 35968556196 - tor-cli failure ce933b7 on main staged-drift, PR #401 review pending, Lab 35968615980 in_progress on #399)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts — codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) — invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 228d7cb9 Refs #387 (byte-identical staged/installed 9.9 eval, 6/6 tri-OS on 4098d08). Deploy success on 228d7cb9 35962553419 and on fee11745 35965214683 success. Sweep 6/6 on fee11745 success 35968005834 workflow_dispatch. Live head ce933b7a now adds sweep allowlist + schedule backstop (d3fabf5a + ce933b7a Refs #399) but introduces staged drift — tor-cli red on ce933b7 pending sync.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main, verified at fee11745 after PR #398 merge (prompts now enforce unified docs).

## CRITICAL INFRASTRUCTURE STATE
 - **Main ce933b7a LIVE - Lab sweep fixes + staged drift:** `origin/main` = `ce933b7a7c1d45ca8c22b2c6eafea1f92eb9c7ca` verified via `git ls-remote origin/main` == ce933b7a and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == ce933b7a (parents: ce933b7a < d3fabf5a < fee11745). d3fabf5a `lab: add tor-cli to sweep allowlist with run-existence verification (Refs #399)` (maintainer.yml SWEEP_ALLOWLIST + tor-cli + polling), ce933b7a `lab: add schedule and workflow_call backstop to tor-cli CI (Refs #399)` (.github/workflows/tor-cli.yml + workflow_call + schedule cron 17 6 * * 1). `git log --oneline -5 origin/main` = ce933b7a/d3fabf5a/fee11745/057033cb/495d49ba. Workflows 17/17 PASS on fee11745 still, but tor-cli 35968359503 **failure** on ce933b7a push (3/6 jobs red: ubuntu/macos/windows Hermetic TestTesterStagedCIByteIdenticalWithInstalled). Staged `tor-cli/ci/tor-cli.yml` (9842 bytes) drifted from installed `.github/workflows/tor-cli.yml` (9979 bytes) due to schedule mismatch — byte-identical pin test fails loudly by design.
 - **Workflows on ce933b7a:** `maintainer.yml` workflows allowlist now includes `tor-cli` (`SWEEP_ALLOWLIST = ("poolduel-m1", ... "tor-cli")` at 505), `tor-cli.yml` now has `workflow_call` + `schedule` backstop. `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`). Deploy workflow_dispatch success 35968619172 on ce933b7a verified.
 - **Last green on fee11745:** tor-cli workflow_dispatch 35968005834 on fee11745 6/6 SUCCESS (ubuntu/macos/windows + cross + fuzz + live-tor) still valid proof for that SHA, but craft gate requires green on live head ce933b7a — blocked by drift test.

## IN FLIGHT
 - **Tor CLI #387 OPEN - per-OS testers PR pending + staged drift fix pending:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync MERGED Refs #387, Evaluator 9.9 on staged sync, tor-cli 6/6 on fee11745 workflow_dispatch 35968005834. PR #401 `[Infra] Per-OS real-user testers for Linux, macOS, Windows (Refs #387)` OPEN at 2d3edc5a MERGEABLE CLEAN (3 per-OS tester prompts + opencode-peros-test.yml + wiring + REGISTRY + docs sync, 473 insertions). tor-cli 35968304591 success on PR #401 pull_request 2d3edc5 (6/6). Review dispatched 35968714723 pending at 07:16:15Z (opencode-review on PR #401, per-OS testers). Lab Engineer 35968615980 in_progress at 07:15:09Z on main ce933b7a (issue #399 /oc lab 07:15:06) handling staged drift.
 - **Issue #399 OPEN - sweep gap fixed but drift introduced:** `[Audit] tor-cli sweep on main never materializes` OPEN, Lab commits d3fabf5a + ce933b7a merged Refs #399 fixing sweep allowlist + schedule backstop + verification, but second commit introduced staged vs installed drift (tor-cli failure 35968359503). Owner /oc lab at 07:15:06 triggered Lab 35968615980 in_progress to sync `tor-cli/ci/tor-cli.yml` byte-identical. No duplicate lab dispatched this run (cooldown 30m, same workflow+branch signature already in flight).
 - **No other open PRs:** PR #399 branch `opencode/issue399-20260924070520` closed? Actually issue 399 has branch 7a39fdb with tor-cli failures but no open PR listed (closed or not yet opened). PR #401 is the only open PR.
 - **Open issues:** [399 sweep drift, 387 Tor CLI per-OS testers, 70 lab-health, 42 brainstorm] (397 CLOSED, 393 CLOSED after merge)
 - **Lab wiring on ce933b7a:** Allowlist + schedule live, trigger-list self-audit 17/17 PASS on main (opencode-peros-test not yet live on main, correctly absent from allowlist until PR #401 merges).

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening + Lab trim + staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS, Deploy green) -> Documentation Invariant PR #398 MERGED fee11745 Refs #397 -> Sweep gap audit #399: Lab allowlist d3fabf5a + schedule ce933b7a MERGED Refs #399, but drift test fails 35968359503 on ce933b7a — awaiting staged sync fix before Closes #387 -> Per-OS testers PR #401 at 2d3edc5 pending Reviewer verdict.

## NEXT-RUN PLAYBOOK
 1. Await `Lab Engineer` 35968615980 on #399 - verify `tor-cli/ci/tor-cli.yml` synced byte-identical with `.github/workflows/tor-cli.yml` (9842 vs 9979 -> identical), `gh api contents` SHAs equal, tor-cli hermetic `TestTesterStagedCIByteIdenticalWithInstalled` green on ubuntu/macos/windows.
 2. Await `opencode-review` 35968714723 on PR #401 (2d3edc5) - verify YAML parses, bash -n, no PAT, no em dashes, per-OS tester prompts + workflow wiring intact, preview infra, allowlist + schedule correctly reflected in PR diff vs main drift fix.
 3. After Lab drift fix lands on new head ce933b7a+1, verify `tor-cli` 6/6 SUCCESS on that head (ubuntu/macos/windows + cross + fuzz + live-tor) — sweep backstop + allowlist re-proves green on live SHA.
 4. After PR #401 Reviewer approve, dispatch Tester per-OS reports (`/oc test-linux` etc.) or general Tester, then Evaluator re-gate before Closes #387. Keep Refs #387 until green on live head + per-OS reports + Evaluator 9.9.
 5. No new build/architect on #387 until Lab drift fix + review land; no duplicate lab/review dispatch within 30m cooldown (same signature already in flight).

## ISSUES
 - **#399** - OPEN sweep on main drift: Lab allowlist+schedule MERGED d3fabf5a/ce933b7a Refs #399, but tor-cli 35968359503 failure on ce933b7a push due to staged drift (9842 vs 9979), Lab 35968615980 in_progress at 07:15:06 to sync staged file
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, tor-cli 6/6 on fee11745 workflow_dispatch 35968005834, PR #401 per-OS testers at 2d3edc5 pending review before Closes
 - **#70** - OPEN lab-health (Deploy success 35968619172 on ce933b7a, tor-cli drift failure 35968359503 under triage, review 35968714723 pending)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant — PR #398 MERGED

## OPEN QUESTIONS
 - Will Lab 35968615980 sync `tor-cli/ci/tor-cli.yml` to include workflow_call + schedule (9979 bytes) and make `TestTesterStagedCIByteIdenticalWithInstalled` green on all 3 OS?
 - Will Reviewer 35968714723 approve PR #401 (per-OS testers) given the base now includes schedule backstop (potential merge conflict between PR #401's tor-cli.yml and main ce933b7a)?
 - Will `tor-cli` sweep on new head (ce933b7a+1) confirm 6/6 SUCCESS and re-prove allowlist + polling logic works for future `workflow_dispatch`?
 - Is PR #401's allowlist (adds opencode-peros-test) compatible with main's allowlist (tor-cli) after drift fix — will merge keep both entries?
 - Is #387 ready for Closes after drift fix + PR #401 merge + per-OS tester reports + Evaluator 9.9 (craft gate requires green on live head, never close on red)?

 - Hephaestus, the Maintainer
