# Progress - Tor CLI Epic (diagnostics, GUI reliability, showcase site)

- **Issue:** #436
- **Branch:** opencode/issue436-20260925122049
- **Status:** in-progress
- **Updated:** 2026-09-25T12:00:00Z
- **Blueprint:** `ideas/2026-09-25-tor-cli-epic.md`
- **Product:** `tor-cli/` (torshim 0.4.0 baseline, Go stdlib-only)

## Phase roadmap (semantic names, sequential vertical slices)

- **Active Phase:** Phase 1: Safe Forward Reset and Lab Hygiene
- **Phase 1: Safe Forward Reset and Lab Hygiene:** [ ] verify stray cleanup (0 open PRs, only #436 plus boards #70/#42 open) [ ] verify model pins `opencode/muse-spark-1.3-contributor-free` in opencode.json plus every workflow [ ] verify Pages deploy health (root index, tor-cli site, docs) [ ] selective forward cleanup only, no force-push, no orphan rewrite, no literal checkout of 2429c52e onto main (PR 1 target, Refs #436)
- **Phase 2: CLI Diagnostics and Control Plane:** [ ] `--verbose` on every verb (endpoints, mode, circuit, backend, notices tail) [ ] `newnym` with rate-limit honesty [ ] `doctor` health check (bootstrap, circuit, SOCKS, DNSPort, exit IP, firewall, IPv6) [ ] cross-platform research notes in docs (PR 2 target, Refs #436)
- **Phase 3: GUI Launch Reliability:** [ ] `run --detach/--wait --log-file` split with process-group isolation and signal forwarding [ ] GUI-aware classification tier (firefox, falkon, chromium, chrome; headless bypass; explicit-ack gate) [ ] real Firefox/Falkon detached launches on Linux, macOS, Windows via Tester plus per-OS specialists (PR 3 target, Refs #436)
- **Phase 4: Website Invariant Lock-In:** [ ] architect prompt gains explicit index.html hub clause (via Lab Engineer) [ ] re-verify builder/reviewer/curator/tester wording [ ] audit all ten project sites return 200 with zero 404s (PR 4 target, Refs #436)
- **Phase 5: Tor CLI Showcase and Visual Evaluation:** [ ] refresh tor-cli/index.html with every new flag, recipe, and exit code [ ] Tester visual pass plus Evaluator approve-eval with live-run evidence, no HTML unit suites (Final PR, Closes #436)

## Checklist

- [x] blueprint plus progress file (architect scaffold)
- [ ] Phase 1 hygiene verified
- [ ] Phase 2 CLI diagnostics implemented
- [ ] Phase 3 GUI fix with real 3-OS browser proof
- [ ] Phase 4 invariant lock-in verified
- [ ] Phase 5 site refreshed plus Evaluator approval

## Current step

Ready for initial build (Phase 1: Safe Forward Reset and Lab Hygiene)

## Next steps

- Builder implements Phase 1: Safe Forward Reset and Lab Hygiene with real verification (gh issue/pr lists, pin grep, Pages preview) and zero stubs
- Then Phase 2: CLI Diagnostics and Control Plane with real control-protocol logic behind every new flag

## Agent log

- 2026-09-25 Architect scaffold: blueprint `ideas/2026-09-25-tor-cli-epic.md` plus this roadmap. Key scoping decisions: (a) the Portion 1 revert is a safe forward cleanup, never a history rewrite or force-push; literal tree checkout of 2429c52e is rejected because the archive-to-HEAD diff spans 128 commits and 184 files including the tor-cli site, prism site, and regression tests that must be preserved; (b) GUI hang root cause is cmd.Run blocking on long-lived browser processes plus LD_PRELOAD multiprocess breakage and single-instance IPC deadlock, fixed by a wait/detach split; (c) tor-cli/index.html already covers the README surface so Phase 5 is a refresh, not a rebuild. Refs #436.
