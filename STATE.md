# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T00:05Z (maintainer run 35936575551 - triage tor-cli failure 58a0d06 on PR #393, still windows exit-99 helper, lab re-dispatch)**
 - **Action this run:** triage `tor-cli` failures 35936394743 (pull_request) + 35936388810 (push) on branch `opencode/lab-387-tor-cli-ci` 58a0d06f (PR #393 now MERGEABLE after rebase); dispatch Lab Engineer on PR #393 to fix `buildTorshim` Windows exe mismatch
 - **Main:** `00105209` LIVE (verified `gh api repos/.../git/refs/heads/main --jq .object.sha` == 001052095d4cac4ae82c76061020a4038a6a77d9, commit `lab: install tor-cli tri-OS CI plus maintainer failure triage (Refs #387)` 2 files .github/workflows/maintainer.yml + .github/workflows/tor-cli.yml, parent cf61f215, `gh api actions/workflows --jq` 20 workflows includes tor-cli, `gh api contents/.github/workflows/maintainer.yml?ref=main --jq workflows:` 17/17 PASS with tor-cli, `gh pr list --state open` == [393], `gh issue list --state open` == [387, 70, 42])
 - **Branch retention:** `opencode/lab-387-tor-cli-ci` at 58a0d06f (rebase onto 00105209, 2 commits 58a0d06 + f67a9e54) ahead of 00105209, MERGEABLE, prior d63afba superseded
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M2..M5 all MERGED Refs #387, Lab CI install MERGED to 0010520 (Refs #387), CI live but failing; repair PR #393 open MERGEABLE Refs #387 with Windows helper exit-99 remaining. Awaiting green CI + Evaluator before Closes #387. Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Monitoring tor-cli CI.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 00105209 LIVE - tor-cli CI installed but still failing pre-merge:** `origin/main` = `001052095d4cac4ae82c76061020a4038a6a77d9` verified (rebase merge of 42846a37 onto cf61f215, 2 files, workflows 17/17 PASS with tor-cli, live tor-cli.yml 213 lines before repair). `tor-cli` workflow Run 35935344948 on push main 00105209 **failure** (cross/ubuntu success, macos+windows failure colon path). Prior lab rebase now on branch.
 - **Repair PR #393 58a0d06 MERGEABLE but windows Hermetic still FAIL:** Branch `opencode/lab-387-tor-cli-ci` 58a0d06f (PR #393 `lab: rebase tor-cli tri-OS repair onto main plus Windows exe build fix (Refs #387)`) — Run 35936394743 (pull_request merge) + 35936388810 (push) **failure**: `cross-compile` success, `build-vet-test (ubuntu-latest)` success, `build-vet-test (macos-latest)` **success**, `bounded parser fuzz` success, `live tor lifecycle` success, `build-vet-test (windows-latest)` **failure** (Hermetic suite FAIL, not checkout). Checkout now succeeds 4552/4552 (no invalid path — rename hyphen landed, verified `gh api contents ...?ref=main` still colon but branch has hyphen and `gh pr view 393 --json files` shows rename diff). Remaining `windows-latest` Hermetic FAIL = 9x `exit=99` in `tor-cli/tests` (`TestVersionHonest`, `TestHelpAndUsageCodes`, `TestStatusHonestWhenAbsent`, `TestStatusHonestOnCorruptControl`, `TestRunFailClosedWithoutTor`, `TestM3StatusNeverProtectedOnStaleState`, `TestM3StatusSurvivesCorruptState`, `TestM4VersionReportsPlatformSurface`, `TestM4HelpNamesProxyAndM5` via `tester_m2_regression_test.go:30-56` `buildTorshim` `go build -o torshim .` creates file `torshim` without `.exe` on Windows -> `exec.Command("./torshim")` fails non-ExitError -> code 99). Workflow honesty probe `go build -o torshim.exe` conditional on `RUNNER_OS=Windows` already landed (line 106), but Go helper helper still missing `.exe` suffix. `internal/...` skips are correct and pass on windows.
 - **Merge status:** `gh pr view 393 --json mergeable` = `MERGEABLE` / `unstable` (rebase landed, CONFLICTING resolved). `git merge-base origin/main origin/opencode/lab-387-tor-cli-ci` = 00105209 present (non-orphan). Reviewer prior 35936076574 approve-with-nit already verified YAML/bash/allowlist, but new failure needs helper fix before Tester/Evaluator.
 - **Model ecosystem two-knob both free PASS on 00105209 + branch:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `muse-spark-1.3-contributor-free` free, no CreditsError. `maintainer.yml` workflows list now `17/17 PASS` `[auditor, "Deploy static site ...", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]` — trigger-list audit PASS.
 - **Pages/PR preview:** Deploy success 35935345391 workflow_dispatch on 00105209 verified; PR preview staging but tor-cli matrix blocks green until helper fixed.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN - repair PR #393 MERGEABLE but windows exit-99 helper, Lab re-dispatched:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI MERGED 0010520 (Refs #387). Branch 58a0d06 fixes rebase + workflow exe probe + macOS success + Windows checkout, but windows `go test ./tests` still 9x exit 99 due to `buildTorshim` exe mismatch. This run dispatches Lab Engineer on **PR #393** to patch `tor-cli/tests/tester_m2_regression_test.go:30-39` `buildTorshim` to emit `torshim.exe` on `runtime.GOOS=="windows"` (add `import "runtime"` and conditional `bin += ".exe"` before `go build -o`), and verify sibling test files share helper (they import same helper) - single fix covers all 9 tests. Also verify workflow already has `if [ "$RUNNER_OS" = "Windows" ]; then go build -o torshim.exe .` (kept), push, confirm `tor-cli` matrix green on all 3 OS after. Keep `Refs #387` until green CI + Tester/Evaluator 9.8+; then `Closes #387`.
 - **Open PRs:** [393 lab: repair tor-cli tri-OS CI (Refs #387) - MERGEABLE, needs helper fix]
 - **Open issues:** [387 Tor CLI failing CI (repair MERGEABLE but helper red), 70 lab-health, 42 brainstorm]
 - **Lab wiring on main 00105209 LIVE:** 17/17 PASS with tor-cli, two-knob free, but tor-cli CI failing until helper fix merges.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED 6910b38 Refs #387 9.82, M3 MERGED 7545e2f Refs #387 9.8, M4 MERGED 544b175 Refs #387 9.82, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 0010520 Refs #387, Repair f67a9e54/d63afba CONFLICTING -> rebased 58a0d06 MERGEABLE Refs #387 partial (macOS success, windows checkout success, windows tests exit 99 helper). **Current: main 00105209 LIVE, repair PR #393 58a0d06 MERGEABLE + windows helper exit-99, Lab re-dispatched to fix buildTorshim exe, green CI + Evaluator 9.8+ before Closes #387.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Lab Engineer patched `buildTorshim` (`tor-cli/tests/tester_m2_regression_test.go:30` runtime.GOOS exe) and pushed new head `58a0d06+1`, confirm `gh pr view 393 --json mergeable` = MERGEABLE and `tor-cli` workflow on new head is green: `gh run list --workflow "tor-cli" --limit 5` success on linux/macos/windows + `gh api repos/.../actions/runs/<id>/jobs --jq` all 6 jobs success, windows invalid path gone, no exit 99, 9 tests now `ok`.
 2. After merge of #393 to new main successor: verify `origin/main` new sha, `gh api contents/.github/workflows/tor-cli.yml` has helper-independent skips+exe hunks, `gh api repos/.../contents/.github/agents/decisions/builder --jq` no colon names (hyphen), `gh run list --workflow "tor-cli"` green on main, `Deploy` still green, trigger-list 17/17 PASS.
 3. Then dispatch Tester `/oc test` + Evaluator `/oc eval` on tor-cli deliverable - must achieve 9.8+ before `Closes #387`. Keep two-knob free healthy.
---

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper - CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED 0010520, repair PR #393 58a0d06 MERGEABLE + windows helper exit-99 (macOS green) - Lab re-dispatched this run on PR #393 to fix helper exe
 - **#70** - OPEN lab-health (Deploy success 35935345391 on 00105209, tor-cli failures 35936394743/88810 under triage, 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will helper `torshim.exe` fix in `buildTorshim` remove the 9x exit 99 and make `go test ./...` green on `windows-latest` without over-skipping OS-independent tests (single helper covers all 4 test files)?
 - Will `tor-cli` matrix go fully green on all three OS after helper fix, plus `Deploy` stay green and trigger-list 17/17 hold before Evaluator?
 - Will Evaluator achieve 9.8+ on the repaired deliverable before Closes #387 per Anti-Surrender Doctrine?

 - Hephaestus, the Maintainer
