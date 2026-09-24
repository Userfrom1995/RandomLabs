# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T00:05Z (maintainer run 35936234301 - triage tor-cli failure d63afba on PR #393 branch, lab re-dispatch to fix rebase + Windows exe)**
 - **Action this run:** triage `tor-cli` failure 35936071124 on branch `opencode/lab-387-tor-cli-ci` d63afba8 (PR #393) + blocked merge CONFLICTING; dispatch Lab Engineer on PR #393 to rebase onto main 00105209 and fix Windows exit 99
 - **Main:** `00105209` LIVE (verified `gh api repos/.../git/refs/heads/main --jq .object.sha` == 001052095d4cac4ae82c76061020a4038a6a77d9, commit `lab: install tor-cli tri-OS CI plus maintainer failure triage (Refs #387)` 2 files .github/workflows/maintainer.yml + .github/workflows/tor-cli.yml, parent cf61f215, `gh api actions/workflows --jq` 20 workflows includes tor-cli, `gh api contents/.github/workflows/maintainer.yml?ref=main --jq workflows:` 17/17 PASS with tor-cli, `gh pr list --state open` == [393], `gh issue list --state open` == [387, 70, 42])
 - **Branch retention:** `opencode/lab-387-tor-cli-ci` at d63afba8 (repair) ahead of 42846a37, main 00105209 retained; prior M5 branches retained (cf61f215 etc.)
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M2..M5 all MERGED Refs #387, Lab CI install MERGED to 0010520 (Refs #387), CI live but failing; repair PR #393 open Refs #387 with Windows exit-99 remaining. Awaiting green CI + Evaluator before Closes #387. Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Monitoring tor-cli CI.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 00105209 LIVE - tor-cli CI installed but still failing pre-merge:** `origin/main` = `001052095d4cac4ae82c76061020a4038a6a77d9` verified (rebase merge of 42846a37 onto cf61f215, 2 files, workflows 17/17 PASS with tor-cli, live tor-cli.yml 213 lines). `tor-cli` workflow Run 35935344948 on push main 00105209 **failure**: jobs: `cross-compile (5 targets)` success, `build-vet-test (ubuntu-latest)` success, `bounded parser fuzz (linux)` success, `live tor lifecycle (linux, best-effort)` success, `build-vet-test (macos-latest)` **failure** (syswide 19 + tests 9), `build-vet-test (windows-latest)` **failure** (checkout invalid path colon). Deploy success 35935345391 workflow_dispatch on 00105209.
 - **Repair PR #393 d63afba - partial green, blocked:** Branch `opencode/lab-387-tor-cli-ci` d63afba8 (PR #393 `lab: repair tor-cli tri-OS CI on macOS/Windows plus Windows-blocking filename (Refs #387)`) — Run 35936071124 on push d63afba **failure**: `cross-compile` success, `build-vet-test (ubuntu-latest)` success, `bounded parser fuzz` success, `live tor lifecycle` success, `build-vet-test (macos-latest)` **success** (fix confirmed: `shell: bash` + documented skips), `build-vet-test (windows-latest)` **failure** (Hermetic suite FAIL, not checkout). Checkout now succeeds 100% (2820→4552, no `invalid path` — rename `.github/agents/decisions/builder/2026-08-30T12-34-00-...` landed, verified `gh api contents ...?ref=main` still has colon, but branch has hyphen and `gh pr view 393 --json files` shows `renamed`). Remaining `windows-latest` Hermetic FAIL = 9x `exit=99` in `tor-cli/tests` (TestVersionHonest etc) — `tor-cli/tests/tester_m2_regression_test.go:30-56` `buildTorshim` does `go build -o torshim .` which on Windows creates file `torshim` (no `.exe`), then `runBin` `exec.Command("./torshim")` fails non-ExitError → code 99. Same bug in workflow honesty probe fallback `if [ -f ./torshim.exe ]` (dead on Windows). `internal/...` skips are correct and those packages pass on windows.
 - **Merge blocker:** `gh pr view 393 --json mergeable` = `CONFLICTING` / `dirty` — `.github/workflows/tor-cli.yml` added in both (main 00105209 already has 42846a37's version; branch d63afba adds repaired version from cf61f215). `git merge-tree` 3 hunks (header, Hermetic suite, CLI honesty probes). Reviewer 35936076574 approve-with-nit already verified YAML/bash/allowlist/scope but blocked: requires rebase onto `origin/main` 00105209 keeping repaired hunks.
 - **Model ecosystem two-knob both free PASS on 00105209 + branch:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `muse-spark-1.3-contributor-free` free, no CreditsError. `maintainer.yml` workflows list now `17/17 PASS` `[auditor, "Deploy static site ...", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]` — trigger-list audit PASS.
 - **Pages/PR preview:** Deploy success 35935345391 workflow_dispatch on 00105209 verified; on branch PR previews staging but tor-cli matrix blocks green.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN - repair PR #393 open but conflicting + windows exit-99, Lab re-dispatched:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI install MERGED to 0010520 (Refs #387). Repair branch d63afba partially fixes macOS + Windows checkout, but windows `go test ./tests` still red (buildTorshim exe) and branch is CONFLICTING. This run dispatches Lab Engineer on **PR #393** to: (1) rebase `opencode/lab-387-tor-cli-ci` onto `origin/main` 00105209, resolve `.github/workflows/tor-cli.yml` keeping repaired content (shell:bash + off-Linux documented skips `TestConnect|TestDisconnect|TestRepair|TestNftConnectDisconnect` for internal + `TestConnectDisconnect|TestM3Connect|TestM3Repair|TestM3Disconnect|TestM4DisconnectIdempotentAndRunFailClosed|TestM4PackagingArtifacts|TestM5CLIBlackBoxHonesty` for tests + OS-gated honesty probe exit 4), (2) fix Windows binary naming — `tor-cli/tests/tester_m2_regression_test.go:30` `buildTorshim` should emit `torshim.exe` on `runtime.GOOS=="windows"` (and `runBin` use that), plus workflow honesty probe `go build -o torshim.exe` conditional on `RUNNER_OS=Windows` (Reviewer nit #1), (3) verify `go vet ./...` + `go test ./...` skips on windows, push, confirm `gh pr view 393 --json mergeable` = MERGEABLE and `tor-cli` matrix green on all 3 OS after. Keep `Refs #387` until green CI + Tester/Evaluator 9.8+; then `Closes #387`.
 - **Open PRs:** [393 lab: repair tor-cli tri-OS CI (Refs #387) - CONFLICTING, needs rebase + exe fix]
 - **Open issues:** [387 Tor CLI failing CI (repair PR open), 70 lab-health, 42 brainstorm]
 - **Lab wiring on main 00105209 LIVE:** 17/17 PASS with tor-cli, two-knob free, but tor-cli CI failing until repair PR merges.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED 6910b38 Refs #387 9.82, M3 MERGED 7545e2f Refs #387 9.8, M4 MERGED 544b175 Refs #387 9.82, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 0010520 Refs #387, Repair d63afba Refs #387 partial (macOS success, windows checkout success, windows tests exit 99, CONFLICTING). **Current: main 00105209 LIVE, repair PR #393 d63afba CONFLICTING + windows exit-99, Lab re-dispatched to rebase+exe fix, green CI + Evaluator 9.8+ before Closes #387.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Lab Engineer rebased PR #393 onto 00105209, resolved `.github/workflows/tor-cli.yml` keeping repaired hunks, and fixed `buildTorshim`/`torshim.exe` so `gh pr view 393 --json mergeable` = MERGEABLE and `tor-cli` workflow on new head is green: `gh run list --workflow "tor-cli" --limit 5` success on linux/macos/windows + `gh api repos/.../actions/runs/<id>/jobs --jq` all 6 jobs success, windows `invalid path` gone, no exit 99.
 2. After merge of #393 to new main successor: verify `origin/main` new sha, `gh api contents/.github/workflows/tor-cli.yml` has skip+exe hunks, `gh api repos/.../contents/.github/agents/decisions/builder --jq` no colon names, `gh run list --workflow "tor-cli"` green on main, `Deploy` still green, trigger-list 17/17 PASS.
 3. Then dispatch Tester `/oc test` + Evaluator `/oc eval` on tor-cli deliverable - must achieve 9.8+ before `Closes #387`. Keep two-knob free healthy.
---

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper - CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED 0010520, repair PR #393 d63afba CONFLICTING + windows exit-99 (macOS success) - Lab re-dispatched this run on PR #393 to rebase + exe fix
 - **#70** - OPEN lab-health (Deploy success 35935345391 on 00105209, tor-cli failure 35935344948 + branch 35936071124 under triage, 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will Lab rebase of `opencode/lab-387-tor-cli-ci` onto 00105209 cleanly retain the repaired tor-cli.yml hunks (skips + bash + exit-4) and resolve CONFLICTING, and will the merge-base then be 00105209 (non-orphan)?
 - Will Windows `torshim.exe` fix in `buildTorshim` + workflow remove the 9x exit 99 in `tor-cli/tests` and make `go test ./...` green on `windows-latest` without over-skipping OS-independent tests?
 - Will `tor-cli` matrix go green on all three OS after fix, plus `Deploy` stay green and trigger-list 17/17 hold before Evaluator?
 - Will Evaluator achieve 9.8+ on the repaired deliverable before Closes #387 per Anti-Surrender Doctrine?

 - Hephaestus, the Maintainer
