# Progress - Tor CLI Epic (diagnostics, GUI reliability, showcase site)

- **Issue:** #436
- **Branch:** opencode/issue436-20260925122049
- **Status:** in-progress
- **Updated:** 2026-09-25T12:00:00Z
- **Blueprint:** `ideas/2026-09-25-tor-cli-epic.md`
- **Product:** `tor-cli/` (torshim 0.4.0 baseline, Go stdlib-only)

## Phase roadmap (semantic names, sequential vertical slices)

- **Active Phase:** Phase 2: CLI Diagnostics and Control Plane
- **Phase 1: Safe Forward Reset and Lab Hygiene:** [x] verify stray cleanup (0 open PRs, only #436 plus boards #70/#42 open) [x] verify model pins `opencode/muse-spark-1.3-contributor-free` in opencode.json plus every workflow [x] verify Pages deploy health (root index, tor-cli site, docs) [x] selective forward cleanup only, no force-push, no orphan rewrite, no literal checkout of 2429c52e onto main (PR 1 target, Refs #436)
- **Phase 2: CLI Diagnostics and Control Plane:** [x] `--verbose` on every verb (endpoints, mode, circuit, backend, notices tail) [x] `newnym` with rate-limit honesty [x] `doctor` health check (bootstrap, circuit, SOCKS, DNSPort, exit IP, firewall, IPv6) [x] cross-platform research notes in docs (PR 2 target, Refs #436)
- **Phase 3: GUI Launch Reliability:** [ ] `run --detach/--wait --log-file` split with process-group isolation and signal forwarding [ ] GUI-aware classification tier (firefox, falkon, chromium, chrome; headless bypass; explicit-ack gate) [ ] real Firefox/Falkon detached launches on Linux, macOS, Windows via Tester plus per-OS specialists (PR 3 target, Refs #436)
- **Phase 4: Website Invariant Lock-In:** [ ] architect prompt gains explicit index.html hub clause (via Lab Engineer) [ ] re-verify builder/reviewer/curator/tester wording [ ] audit all ten project sites return 200 with zero 404s (PR 4 target, Refs #436)
- **Phase 5: Tor CLI Showcase and Visual Evaluation:** [ ] refresh tor-cli/index.html with every new flag, recipe, and exit code [ ] Tester visual pass plus Evaluator approve-eval with live-run evidence, no HTML unit suites (Final PR, Closes #436)

## Checklist

- [x] blueprint plus progress file (architect scaffold)
- [x] Phase 1 hygiene verified
- [x] Phase 2 CLI diagnostics implemented
- [ ] Phase 3 GUI fix with real 3-OS browser proof
- [ ] Phase 4 invariant lock-in verified
- [ ] Phase 5 site refreshed plus Evaluator approval

## Current step

Phase 2 complete, ready for review. Active Phase: Phase 3: GUI Launch Reliability

## Next steps

- Reviewer audits the Phase 2 branch, Tester runs the suite plus live
  stub-verified verbs, then Phase 3: GUI Launch Reliability
  (`run --detach/--wait`, GUI-aware classification, real Firefox/Falkon
  launches on Linux/macOS/Windows)

## Agent log

- 2026-09-25 Architect scaffold: blueprint `ideas/2026-09-25-tor-cli-epic.md` plus this roadmap. Key scoping decisions: (a) the Portion 1 revert is a safe forward cleanup, never a history rewrite or force-push; literal tree checkout of 2429c52e is rejected because the archive-to-HEAD diff spans 128 commits and 184 files including the tor-cli site, prism site, and regression tests that must be preserved; (b) GUI hang root cause is cmd.Run blocking on long-lived browser processes plus LD_PRELOAD multiprocess breakage and single-instance IPC deadlock, fixed by a wait/detach split; (c) tor-cli/index.html already covers the README surface so Phase 5 is a refresh, not a rebuild. Refs #436.
- 2026-09-25 Builder Phase 2 (all green, verified end to end): control diagnostics plus NEWNYM with rate-limit honesty, lifecycle notices tail plus shell TORSHIM_CONTROL/TORSHIM_COOKIE export, new doctor package (9 graded checks, stdlib DNS/SOCKS probes, stub-injectable), main.go wiring (-v on every verb, newnym and doctor verbs, shared endpoint/cookie resolution), black-box fail-closed pins (usage exit 2, no-tor newnym/doctor exit 3, doctor JSON contract, newnym success exit 0 and rate-limit exit 1 via stub control), docs (diagnostics.md, platforms.md, README, man page, limitations IPv6 gap), wrapper 0.4.0 to 0.5.0, ideas entry `2026-09-25-torshim-control-plane-verbose-newnym-doctor.md`. Live stub-server proof: doctor healthy exit 0, newnym exit 0, status/version verbose render, no tor binary on runner. Refs #436.
- 2026-09-25 Builder Phase 2 follow-up: wrapper bumped 0.4.0 to 0.5.0, so two Tester-owned stale version pins were updated to match (`tester_m4_proxy_test.go`, `tester_m5_hardening_test.go`: literal "0.4.0" to "0.5.0", intent unchanged); version chip in tor-cli/index.html moved to v0.5.0 (historical build-record text untouched, full refresh stays Phase 5). Full suite plus `make cross`, darwin/windows vet, and groff render green. Refs #436.
- 2026-09-25 Builder Phase 1 verification (all pass, zero code changes needed): (a) stray cleanup: exactly 1 open PR (#440, this epic) and 3 open issues (#436 epic, #70 lab-health board, #42 brainstorm board) - nothing to close; (b) model pins: opencode.json model+small_model plus all 16 workflow `model:` keys plus MODEL env all pinned to `opencode/muse-spark-1.3-contributor-free` (other model strings in tree are illustrative examples inside agent prompt docs, not live pins); (c) Pages health: root index.html, tor-cli/index.html, docs/index.html all present, all 8 local site refs resolve (remainder are in-page anchors and a data URI, zero 404s); (d) tor-cli health: `go build`, `go vet`, `go test ./...` all green (7 packages ok, 2 without test files); (e) forward cleanup: none required, tree already clean, no force-push or history rewrite performed. Active Phase: Phase 1 complete, ready for review (Refs #436).
