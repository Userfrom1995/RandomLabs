# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T23:52Z (maintainer run 35935525247 - tor-cli failure on main 0010520 - lab dispatched on #387)**
 - **Action this run:** triage `tor-cli` failure 35935344948 on main 0010520 (macOS syswide + tests + groff, Windows invalid path); dispatch Lab Engineer on #387 to repair; no merge this run
 - **Main:** `00105209` LIVE (verified `gh api repos/.../git/refs/heads/main --jq .object.sha` == 001052095d4cac4ae82c76061020a4038a6a77d9, commit `lab: install tor-cli tri-OS CI plus maintainer failure triage (Refs #387)` 2 files .github/workflows/maintainer.yml + .github/workflows/tor-cli.yml, parent cf61f215, `gh api actions/workflows --jq` 20 workflows includes tor-cli, `gh api contents/.github/workflows/maintainer.yml?ref=main --jq workflows:` 17/17 PASS with tor-cli, `gh pr list --state open` == [], `gh issue list --state open` == [387, 70, 42])
 - **Branch retention:** `opencode/lab-387-tor-cli-ci` at 42846a37 MERGED to 0010520 retained; prior M5 branches retained (cf61f215 etc.)
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M2..M5 all MERGED Refs #387, Lab CI install MERGED to 0010520 (Refs #387), CI now live but failing on macOS/Windows. Awaiting lab repair + green CI + Evaluator before Closes #387. Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Monitoring tor-cli CI.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 00105209 LIVE - tor-cli CI FAILING:** `origin/main` = `001052095d4cac4ae82c76061020a4038a6a77d9` verified (rebase merge of 42846a37 onto cf61f215, 2 files, workflows 17/17 PASS pre-run, now live tor-cli.yml 213 lines). `tor-cli` workflow Run 35935344948 on push main 00105209 **failure**: jobs: `cross-compile (5 targets)` success, `build-vet-test (ubuntu-latest)` success, `bounded parser fuzz (linux)` success, `live tor lifecycle (linux, best-effort)` success, `build-vet-test (macos-latest)` **failure** (syswide suite 19 FAILs + tests suite 9 FAILs), `build-vet-test (windows-latest)` **failure** (checkout: `error: invalid path '.github/agents/decisions/builder/2026-08-30T12:34:00-option-c-negative-result.md'` colon invalid on Windows). Deploy static site success 35935345391 workflow_dispatch on 00105209.
 - **Root cause 1 - Windows invalid path:** File `.github/agents/decisions/builder/2026-08-30T12:34:00-option-c-negative-result.md` contains `:` (colon) invalid on Windows NTFS. Breaks every Windows runner checkout. Must be renamed to `2026-08-30T12-34-00-...` (or `20260830T123400-...`), update any internal refs, verify `git checkout` on windows-latest.
 - **Root cause 2 - macOS hermetic suite:** `internal/syswide` tests assert Linux-only error messages with exact strings but on darwin the error is `system-wide "connect" is Linux-only (no tun2socks backend shipped for darwin: macOS would need utun+tun2socks+pf, ...)` which breaks assertions for `TestDisconnectCorruptNonRootHintsSudo`, `TestRepairQuarantinesCorruptState`, `TestConnect*`, `TestDisconnect*`, `TestNftConnectDisconnect`, etc. (19 fails). `tests` suite similarly: `TestConnectDisconnectM3Contract`, `TestM3ConnectUsageRejectsPositionals` expects exit 2 but got 4 (syswide early return), `TestM3DisconnectStatelessIdempotent` expects 0 but got 4, `TestM4DisconnectIdempotentAndRunFailClosed`, `TestM5CLIBlackBoxHonesty` etc. Also `TestM4PackagingArtifacts` fails: `exec: "groff": executable file not found` - macOS runner lacks groff. Fix: make syswide error substring checks (`strings.Contains(err, "Linux-only")`), ensure `disconnect` stateless idempotent returns 0 on non-Linux with guidance not 4, align exit codes, and either `brew install groff` in tor-cli.yml macos job or skip if missing.
 - **Model ecosystem two-knob both free PASS on 00105209:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free, no CreditsError.
 - **Pages/PR preview:** Deploy success 35935345391 workflow_dispatch on 00105209 verified; PR previews staging.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN - CI live but failing, Lab dispatched:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI install MERGED to 00105209 (Refs #387). Workflow `tor-cli` live on main but failing on macOS+Windows as above. This run dispatches Lab Engineer on #387 to: (1) rename colon file via `git mv` + reference patch, (2) fix tor-cli hermetic suite for macOS (substring assertions, idempotent disconnect, exit codes), (3) fix tor-cli.yml to install groff on macos or make test skip, (4) verify `go vet` + `go test ./...` passes on `GOOS=darwin` and `GOOS=windows` locally, re-run tri-OS matrix green. Keep `Refs #387` until green CI + Evaluator approve-eval 9.8+.
 - **Open PRs:** [] (no open PR after lab-387-tor-cli-ci merged; Lab will open new PR for fixes)
 - **Open issues:** [387 Tor CLI failing CI, 70 lab-health, 42 brainstorm]
 - **Lab wiring on main 00105209 LIVE:** 17/17 PASS with tor-cli, two-knob free, but tor-cli CI failing - repair pending.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED 6910b38 Refs #387 9.82, M3 MERGED 7545e2f Refs #387 9.8, M4 MERGED 544b175 Refs #387 9.82, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 0010520 Refs #387. **Current: main 00105209 LIVE, tor-cli CI FAILED 35935344948 (macOS + Windows), Lab dispatched on #387 to repair, green CI + Evaluator 9.8+ before Closes #387.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Lab Engineer opened PR for fixes (rename colon file + macOS hermetic adjustments + groff) and that PR passes Reviewer/Tester.
 2. Verify `tor-cli` workflow green on fix branch and after merge on new main successor: `gh run list --workflow "tor-cli" --limit 5` success on linux/macos/windows + `gh api repos/.../actions/runs/<id>/jobs --jq` all jobs success, `windows-latest` checkout no longer `invalid path`.
 3. After Lab PR merge: dispatch Tester `/oc test` + Evaluator `/oc eval` on tor-cli deliverable - must achieve 9.8+ before `Closes #387`. Keep trigger-list 17/17 PASS and two-knob free healthy.
---

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper - CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED 0010520, CI now live but FAILING (macOS syswide+tests+groff, Windows colon file) - Lab dispatched this run to repair
 - **#70** - OPEN lab-health (Deploy success 35935345391 on 00105209, tor-cli failure 35935344948 under triage)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will Lab rename of `2026-08-30T12:34:00-...` to colon-free path unblock Windows checkout, and will `git log --follow` references remain traceable?
 - Will macOS hermetic suite fixes (substring Linux-only, idempotent disconnect 0, exit code alignment, groff install/skip) make `go test ./...` green on darwin without hiding honest Linux-only errors?
 - Will `tor-cli` matrix go green on all three OS after fix, plus `Deploy` stay green and trigger-list 17/17 hold before Evaluator?
 - Will Evaluator achieve 9.8+ on the repaired deliverable before Closes #387 per Anti-Surrender Doctrine?

 - Hephaestus, the Maintainer
