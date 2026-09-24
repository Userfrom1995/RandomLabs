# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T11:48Z (maintainer run 35994806861 - MERGED PR #404 to ac6f36d7, closed #387/#399, sweep dispatched)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 CLOSED at ac6f36d7 (M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 with live hello-through-tor and 9.82 eval). Issue #399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main ac6f36d7 LIVE - PR #404 merged, tor-cli 6/6 on c8cf3e2, sweep dispatched:** `origin/main` = `ac6f36d7dbbccc0a0b3823377ac76963cd8d28fa` verified via `git ls-remote origin/main` == ac6f36d7 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == ac6f36d7 (rebased 4 commits onto e996d93: peros-linux repro + fixer fixed-port torrc + pinned assertions + tester bridge/live-verify). `tor-cli` `pull_request` `35992913191` success 6/6 on `c8cf3e2` (ubuntu/macos/windows + cross + fuzz + live-tor bootstrap) - same diff as ac6f36d7, so hermetic gates held. `opencode-review` `35993250415` success `approve` on c8cf3e2 + `opencode-test` `35993443742` success `approve-test` (live hello-through-tor exit 0 on real tor 0.4.9.11) + `opencode-eval` `35994429891` success `approve-eval` 9.82 on c8cf3e2. No `workflows permission` rejection, no CreditsError. Sweep `tor-cli` workflow_dispatch on `main` dispatched this run to provide explicit main-head verification (bot rebase merges suppress push runs; pull_request 6/6 already proves same SHA).
 - **Workflows:** `maintainer.yml` 18/18 PASS (includes tor-cli), `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`).

## IN FLIGHT
 - **Tor CLI #387 CLOSED at ac6f36d7 - M1-M5 + Lab + hardening + staged sync + per-OS torrc fix MERGED:** Issue #387 CLOSED (was OPEN, now completed at merge ac6f36d7). PR #404 MERGED via `gh pr merge 404 --rebase` at 2026-09-24T11:46:44Z to `ac6f36d7` (mergeCommit ac6f36d7dbbccc0a0b3823377ac76963cd8d28fa, 4 commits, non-orphan merge-base e996d93 present). Fixer 1631c6d2 + Tester c8cf3e2 + Reviewer approve + Tester approve-test x2 + Evaluator 9.82 all fresh on c8cf3e2 before merge.
 - **Audit #399 CLOSED at ac6f36d7:** Staged `tor-cli/ci/tor-cli.yml` remains byte-identical to `.github/workflows/tor-cli.yml` after merge (tor-cli only diff was lifecycle.go + tests, no workflow drift); sweep on ac6f36d7 dispatched to provide workflow_dispatch proof for new head (prior sweep on e996d93 was success, pull_request 6/6 on c8cf3e2 already green).
 - **Open PRs:** [] (PR #404 merged, no other open PRs)
 - **Open issues:** [70 lab-health, 42 brainstorm] (#387 and #399 now CLOSED, #397 already CLOSED)
 - **Lab dispatch this run:** `sweep` tor-cli on `main` ac6f36d7 - post-merge verification only; no infra guard violation (tor-cli is allowlisted sweep).

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening MERGED 63d4ede6 Refs #387 -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 -> PAT dispatch MERGED e996d93 Refs #387 -> Linux per-OS torrc fix MERGED ac6f36d7 Closes #387/#399 (live hello-through-tor, 9.82 eval) -> Current: main ac6f36d7 LIVE, all Tor CLI gates closed.

## NEXT-RUN PLAYBOOK
 1. Poll sweep: `gh run list --workflow tor-cli --event workflow_dispatch --limit 5` for success on ac6f36d7 (allow 3m for dispatch verification). If sweep fails, triage via lab.
 2. Verify Deploy static site success on successor main ac6f36d7 (triggered by maintainer post-merge step or via sweep).
 3. Standby: no open Tor CLI PRs/issues; await owner directive or health board.

## ISSUES
 - **#387** - CLOSED at ac6f36d7 Tor CLI — lightweight cross-platform Tor wrapper (per-app, shell, system-wide) — all milestones + live per-OS fix + 9.82 eval
 - **#399** - CLOSED at ac6f36d7 [Audit] tor-cli sweep/drift — staged 9979 byte-identical, sweep dispatched on ac6f36d7
 - **#404** - MERGED at ac6f36d7 peros-linux regression — torrc bogus removed, fixed ports + ProbeSocks + bridge digest + live-torrc suite, review+test+eval 9.82 green, merged via rebase
 - **#70** - OPEN lab-health (Deploy success expected on ac6f36d7, 18/18 PASS)
 - **#42** - OPEN brainstorm
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will tor-cli workflow_dispatch sweep on ac6f36d7 succeed within 3m (hermetic + live-tor best-effort) to provide explicit main-head 6/6 proof beyond the pull_request 6/6 already held?
 - Any follow-up Builder polish for stale *WriteToFile docs (README.md:42, research.md:39,48,101,113) and subcommand --help exit 2 noted as non-blocking?

  - Hephaestus, the Maintainer
