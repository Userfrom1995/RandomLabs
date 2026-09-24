# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T10:38Z (maintainer run 35988356313 - PAT gap confirmed on per-OS dispatch, lab re-dispatched on #387)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 2d13778 Refs #387/#399 (byte-identical staged/installed 9979, 6/6 tri-OS on 35970827417). Deploy success on 2d13778 35970881878. Per-OS native testers created via PR #401 at a2e244dd (tester-linux/macos/windows prompts + opencode-peros-test workflow) - dispatch via bot ping failed (PAT gap), lab fix pending. Issue #387 awaits tri-OS green on live head + per-OS real-user proof before Closes. User field failure + per-OS tester request + PAT gap report 2026-09-24T10:37Z.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 2d13778 LIVE - sweep SUCCESS 6/6, per-OS dispatch PAT gap:** `origin/main` = `2d137784fef6b79206ac01648d352fc08e579a44` verified via `git ls-remote origin/main` == 2d13778 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 2d13778. `tor-cli` `workflow_dispatch` 35970827417 on `2d13778` **success** 6/6 (ubuntu success, macos success, windows success, cross success, bounded fuzz success, live-tor success). `Deploy static site to GitHub Pages` `workflow_dispatch` 35970881878 on `2d13778` **success**. `tor-cli/ci/tor-cli.yml` == `.github/workflows/tor-cli.yml` == 9979 bytes `cmp` byte-identical, both with `workflow_call` + `schedule 17 6 * * 1`. `maintainer.yml` workflows 18/18 PASS (includes `tor-cli` + `opencode-peros-test` + `opencode-eval` hard-gate). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). No `workflows permission` rejection. **Per-OS dispatch failure:** 3 bot posts 5812332339/486/625 (`/oc test-linux` etc. as `github-actions[bot]`) produced zero `opencode-peros-test` runs at 10:24Z (confirmed `gh run list --workflow opencode-peros-test` shows none); only run at 10:38Z 35988356403 is `skipped` for user's `/oc Maintainer` comment (correct guard, not per-OS). Root cause: maintainer `ping` uses `GH_TOKEN` (bot) which GitHub suppresses for workflow triggers; PAT-backed `OPENCODE_PAT` required. `maintainer.yml` "Run /oc triggers as owner" has no `test-linux/macos/windows` branches - lab must add them.

## IN FLIGHT
 - **Tor CLI #387 OPEN - sweep GREEN, per-OS PAT gap blocks real-user proof:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387 on live head `2d13778` (byte-identical 9979). `tor-cli` sweep 35970827417 **success 6/6** on `2d13778`, Deploy success 35970881878. Per-OS native testers dispatched at 10:24Z via bot `ping` did NOT materialize (PAT gap, zero runs). Lab re-dispatched this run on #387 to wire PAT-backed `test-linux/macos/windows` in `maintainer.yml` and re-dispatch via PAT. Next: await lab PR, merge, then 3 per-OS runs, then Tester aggregation + Evaluator 9.9 re-gate before `Closes #387`. `Refs #387` retained per Anti-Surrender.
 - **Audit #399 OPEN - sweep gap CLOSED, awaiting confirmation before Closes:** Issue #399 OPEN, PR #402 MERGED `2d13778` Refs #399 repairs staged drift (cmp byte-identical 9979). Root-cause gap closed: `tor-cli` `workflow_dispatch` 35970827417 on `2d13778` **success** (was 0 runs on 3 prior sweeps, now delivered via PAT sweep with allowlist `tor-cli` + 6x30s polling verified). 6/6 green confirms fix. Held as `Refs` until per-OS + Evaluator gate; ready for `Closes #399` after lab per-OS fix and final quality gate.
 - **Open PRs:** [] (no open PRs)
 - **Open issues:** [387 Tor CLI, 399 audit sweep/drift, 70 lab-health, 42 brainstorm] (397 CLOSED)
 - **Lab dispatch this run:** `lab` on #387 to fix per-OS PAT trigger wiring (maintainer.yml + verify + re-dispatch).

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 2d13778 Refs #387/#399 (9.9 eval, 6/6) -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 (byte-identical 9979, 6/6 sweep SUCCESS) -> Current: main 2d13778 LIVE, sweep SUCCESS 35970827417, per-OS dispatch PAT gap identified via user report 10:37Z, lab fix dispatched, awaiting per-OS 3/3 before Evaluator.

## NEXT-RUN PLAYBOOK
 1. Poll lab PR: `gh pr list --state open --json number,headRefName,author` - await Lab Engineer PR wiring `test-linux/macos/windows` in maintainer.yml (PAT path).
 2. On lab PR open, verify `gh api .../actions/runs` shows `opencode-peros-test` not yet - lab must add branches for `test-linux` etc. in "Run /oc triggers as owner" posting `"/oc test-<os>"` via `OPENCODE_PAT`.
 3. After lab PR merges, dispatch per-OS via PAT: next maintainer run should write decision.json with 3 PAT-backed triggers (or lab's follow-up dispatch) - verify `gh run list --workflow opencode-peros-test` shows 3 runs (ubuntu/macos/windows) with `in_progress`/`success`, not `skipped`.
 4. Poll per-OS runs: `gh run list --workflow "opencode-peros-test" --limit 10` - await 3 completions, each must write `/tmp/random-lab-decision.json` with `fix`/`lab`/`maintainer` and post findings comment ending with `- the <OS> Tester`.
 5. If any per-OS reports `fix`/`lab`, dispatch accordingly; if all 3 `maintainer` (pass) + sweep still green + staged identical, dispatch `test` then `eval` on #387 before Closes.
 6. Verify trigger-list 18/18 still PASS and Deploy stay green after per-OS.

## ISSUES
 - **#387** - OPEN Tor CLI - PAT gap fix dispatched, awaiting lab PR + 3 per-OS PAT runs + Tester/Evaluator before Closes
 - **#399** - OPEN [Audit] tor-cli sweep gap - sweep 35970827417 SUCCESS 6/6 on 2d13778 (gap closed), staged 9979 byte-identical, ready to close after per-OS gate
 - **#70** - OPEN lab-health (Deploy 35970881878 success on 2d13778, per-OS pending, PAT gap noted)
 - **#42** - OPEN brainstorm (Tor CLI directive source)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Lab Engineer wire PAT-backed per-OS triggers (`test-linux`/`test-macos`/`test-windows`) in `maintainer.yml` correctly (bash -n clean, 18/18 intact, no PAT in agent env)?
 - Will per-OS testers report clean real-user results via PAT dispatch (every command/flag/workflow, exit 0/1/2/3/4, honest exit 4 off-Linux)?
 - Will Tester aggregation (`/oc test`) plus Evaluator (`/oc eval`) achieve 9.9+ binding after per-OS passes, with `live-run-evidence.json` hard-gate?

 - Hephaestus, the Maintainer
