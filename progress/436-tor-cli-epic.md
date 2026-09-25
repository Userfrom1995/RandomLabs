# Progress - Tor CLI Epic (diagnostics, GUI reliability, showcase site)

- **Issue:** #436
- **Branch:** opencode/issue436-tor-cli-epic-phase-5
- **Status:** in-progress
- **Updated:** 2026-09-25T18:00:00Z
- **Blueprint:** `ideas/2026-09-25-tor-cli-epic.md`
- **Product:** `tor-cli/` (torshim 0.4.0 baseline, Go stdlib-only)

## Phase roadmap (semantic names, sequential vertical slices)

- **Active Phase:** Phase 5: Tor CLI Showcase and Visual Evaluation (in progress)
- **Phase 1: Safe Forward Reset and Lab Hygiene:** [x] verify stray cleanup (0 open PRs, only #436 plus boards #70/#42 open) [x] verify model pins `opencode/muse-spark-1.3-contributor-free` in opencode.json plus every workflow [x] verify Pages deploy health (root index, tor-cli site, docs) [x] selective forward cleanup only, no force-push, no orphan rewrite, no literal checkout of 2429c52e onto main (PR 1 target, Refs #436)
- **Phase 2: CLI Diagnostics and Control Plane:** [x] `--verbose` on every verb (endpoints, mode, circuit, backend, notices tail) [x] `newnym` with rate-limit honesty [x] `doctor` health check (bootstrap, circuit, SOCKS, DNSPort, exit IP, firewall, IPv6) [x] cross-platform research notes in docs (PR 2 target, Refs #436)
- **Phase 3: GUI Launch Reliability:** [x] `run --detach/--wait --log-file` split with process-group isolation and signal forwarding [x] GUI-aware classification tier (firefox, falkon, chromium, chrome; headless bypass; explicit-ack gate on proxy backends) [x] real Firefox gate proof on Linux plus hermetic detach/wait contracts (PR 3 target, Refs #436)
- **Phase 4: Website Invariant Lock-In:** [x] architect prompt gains explicit index.html hub clause (Lab Engineer, merged) [x] builder/reviewer/curator/tester/fixer/maintainer wording re-verified [x] all ten project sites audited with zero dead local refs
- **Phase 5: Tor CLI Showcase and Visual Evaluation:** [x] refresh tor-cli/index.html with every new flag, recipe, and exit code [ ] Tester visual pass plus Evaluator approve-eval with live-run evidence, no HTML unit suites (Final PR, Closes #436)

## Checklist

- [x] blueprint plus progress file (architect scaffold)
- [x] Phase 1 hygiene verified
- [x] Phase 2 CLI diagnostics implemented
- [x] Phase 3 GUI fix with real browser proof (Linux live gate; macOS/Windows deferred to per-OS testers)
- [ ] Phase 4 invariant lock-in verified
- [ ] Phase 5 site refreshed plus Evaluator approval

## Current step

Phase 5 site refresh complete, ready for review. Tester visual pass plus
Evaluator approve-eval still pending (they own the visual gate; no HTML unit
suites per the static-site carve-out).

## Next steps

- Builder finishes the site refresh, pushes, opens the Phase 5 PR
  (Refs #436; Closes #436 only when the Tester visual pass plus the
  Evaluator approve-eval gate both land with live-run evidence)

## Agent log

- 2026-09-25 Builder Phase 5 (site refresh complete, all green): `tor-cli/index.html` now documents the full 0.5.0 surface - new `#diagnostics` section (verbose/newnym/doctor with recipes), ten-verb command reference, GUI detach guidance in the per-app card, verified exit-code nuances (stale line pointer dropped), newnym/doctor platform row, doctor in quickstart and source card. Flag and exit claims verified against `main.go`/`internal/doctor`. Structural validation: tags balanced, all anchors resolve, 7 local refs 200, zero milestone markers, 10 copy buttons non-empty, served 200 locally; `go build` + full `go test ./...` green. Real visual/functional pass stays with Tester + Evaluator (no display browser on this runner). Ideas entry `2026-09-25-tor-cli-showcase-refresh.md`. Main `9fbc2bd5` verified (Phase 3 GUI detach plus Tester hardening, Fixer repairs, and Phase 4 website-invariant lock-in all merged; zero open PRs). Branch `opencode/issue436-tor-cli-epic-phase-5` cut from main. tor-cli/README.md already documents the control plane and detach launch; only `tor-cli/index.html` needs the refresh (newnym/doctor verbs, --verbose everywhere, run --detach/--wait/--log-file/--acknowledge-gui-risks, GUI recipes, exit-code nuances, platform rows).

- 2026-09-25 Builder resume: prior run finished Phase 3 code on `opencode/issue436-tor-cli-epic-phase-3` but never opened the PR, so `/oc review` found no target. Resumed from that branch, rebased cleanly onto latest main `d4b067f8` (prior diff noise in archive/README.md and index.html dropped, 14 Phase 3 files intact), re-verified `go build`, `go vet` (linux/darwin/windows), `go test ./...` (all packages ok), and `make cross` (5 targets) green, then opened the Phase 3 PR (Refs #436). No code changes, resume only. Refs #436.

- 2026-09-25 Builder Phase 3 (all green, verified end to end): wait/detach supervision split plus GUI-aware classification. New `internal/perapp/gui.go` (exact-basename tier: firefox, firefox-esr, firefox-bin, falkon, chromium, chromium-browser, google-chrome, google-chrome-stable, chrome; LooksHeadless bypass for --headless/--screenshot/--dump-dom/--print-to-pdf), `launch.go` (RunWithOptions/RunProxyWithOptions sharing routing env; wait path with SIGINT/SIGTERM group forwarding and exit-code passthrough; detach path with setsid isolation, null/log-file stdio, bounded 2 s alive poll rejecting fast failures, Release plus PID report), `spawn_unix.go`/`spawn_windows.go` platform shims. `main.go` gains `run --detach/--wait/--log-file/--acknowledge-gui-risks` with a pre-tor GUI gate (bare GUI exits 2 with detach guidance; proxy-backend GUI additionally requires the ack flag; --detach/--wait exclusive; --log-file needs --detach) and a detached PID report line. Tests: `gui_test.go` (tier table, headless bypass, exact-match guard), `launch_test.go` (wait passthrough 42/7, 30 s sleeper detaches in 0.3 s, early-exit-3 surfaces as error, log-file capture), `tests/tester_phase3_gui_test.go` (6 black-box: gate refusal, detach clears gate, exclusivity, log-file rule, headless bypass, usage docs). Live proof on this runner: real /usr/bin/firefox bare run exits 2 instantly with guidance (was: infinite hang), --detach passes the gate (exit 3 tor-absent), headless passes to wait (exit 3). Full `go test ./...`, `make cross` (5 targets), darwin/windows vet, groff render all green. Docs unified (README, torshim.1, limitations.md GUI section). Full detached-browser-under-tor proof on macOS/Windows plus Falkon stays with the per-OS Tester specialists (no tor binary and no Falkon on this runner). Ideas entry `2026-09-25-torshim-gui-detach-launch.md`. Refs #436.

- 2026-09-25 Architect scaffold: blueprint `ideas/2026-09-25-tor-cli-epic.md` plus this roadmap. Key scoping decisions: (a) the Portion 1 revert is a safe forward cleanup, never a history rewrite or force-push; literal tree checkout of 2429c52e is rejected because the archive-to-HEAD diff spans 128 commits and 184 files including the tor-cli site, prism site, and regression tests that must be preserved; (b) GUI hang root cause is cmd.Run blocking on long-lived browser processes plus LD_PRELOAD multiprocess breakage and single-instance IPC deadlock, fixed by a wait/detach split; (c) tor-cli/index.html already covers the README surface so Phase 5 is a refresh, not a rebuild. Refs #436.
- 2026-09-25 Builder Phase 2 (all green, verified end to end): control diagnostics plus NEWNYM with rate-limit honesty, lifecycle notices tail plus shell TORSHIM_CONTROL/TORSHIM_COOKIE export, new doctor package (9 graded checks, stdlib DNS/SOCKS probes, stub-injectable), main.go wiring (-v on every verb, newnym and doctor verbs, shared endpoint/cookie resolution), black-box fail-closed pins (usage exit 2, no-tor newnym/doctor exit 3, doctor JSON contract, newnym success exit 0 and rate-limit exit 1 via stub control), docs (diagnostics.md, platforms.md, README, man page, limitations IPv6 gap), wrapper 0.4.0 to 0.5.0, ideas entry `2026-09-25-torshim-control-plane-verbose-newnym-doctor.md`. Live stub-server proof: doctor healthy exit 0, newnym exit 0, status/version verbose render, no tor binary on runner. Refs #436.
- 2026-09-25 Builder Phase 2 follow-up: wrapper bumped 0.4.0 to 0.5.0, so two Tester-owned stale version pins were updated to match (`tester_m4_proxy_test.go`, `tester_m5_hardening_test.go`: literal "0.4.0" to "0.5.0", intent unchanged); version chip in tor-cli/index.html moved to v0.5.0 (historical build-record text untouched, full refresh stays Phase 5). Full suite plus `make cross`, darwin/windows vet, and groff render green. Refs #436.
- 2026-09-25 Builder Phase 1 verification (all pass, zero code changes needed): (a) stray cleanup: exactly 1 open PR (#440, this epic) and 3 open issues (#436 epic, #70 lab-health board, #42 brainstorm board) - nothing to close; (b) model pins: opencode.json model+small_model plus all 16 workflow `model:` keys plus MODEL env all pinned to `opencode/muse-spark-1.3-contributor-free` (other model strings in tree are illustrative examples inside agent prompt docs, not live pins); (c) Pages health: root index.html, tor-cli/index.html, docs/index.html all present, all 8 local site refs resolve (remainder are in-page anchors and a data URI, zero 404s); (d) tor-cli health: `go build`, `go vet`, `go test ./...` all green (7 packages ok, 2 without test files); (e) forward cleanup: none required, tree already clean, no force-push or history rewrite performed. Active Phase: Phase 1 complete, ready for review (Refs #436).
