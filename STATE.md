# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T11:16Z (maintainer run 35992029395 - issue_comment on #404, standby await Fixer on PR #404)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 63d4ede6 Refs #387 (byte-identical staged/installed 9979, 6/6 tri-OS on 2d13778 via sweep 35970827417), Deploy success on e996d93 (35989589138 workflow_dispatch). Per-OS native testers created via PR #401 at a2e244dd (tester-linux/macos/windows prompts + opencode-peros-test workflow) - PAT dispatch fix MERGED at e996d93 via PR #403. Issue #387 awaits tri-OS green on live head e996d93 + per-OS real-user proof before Closes. PAT gap resolved 2026-09-24T10:50Z.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main e996d93 LIVE - per-OS Linux FAIL blocks Closes:** `origin/main` = `e996d93668681b8fa4df6e5336ee9d7d24286d08` verified via `git ls-remote origin/main` == e996d93 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == e996d93. `tor-cli` `workflow_dispatch` `35990649838` success 6/6 on e996d93 (hermetic, `2026-09-24T11:01:58Z` `workflow_dispatch` ubuntu/macos/windows + cross + fuzz + live-tor) — but hermetic only, masks real-tor bug (best-effort live-tor skip). `Deploy static site to GitHub Pages` success on e996d93 (35989589138 workflow_dispatch, 23s). `maintainer.yml` workflows 18/18 PASS (includes `tor-cli` + `opencode-peros-test` + `opencode-eval` hard-gate). `maintainer.yml` has PAT-backed `test-linux/macos/windows` branches (GH_TOKEN: OPENCODE_PAT, never in agent env) - verified on e996d93. `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). No `workflows permission` rejection. `opencode-peros-test` on e996d93: `35990704989` `test-linux: success` (real tor 0.4.9.11, 40+ probes, fail-closed exit 3, status honest) created PR #404, `35990705234`/`35990705854` `test-macos`/`test-windows` `cancelled` (pending re-dispatch after fix). `tor-cli` on PR #404 `f622d210` is `in_progress` `35991460076` `pull_request` (previously held `action_required`, now running after Fixer dispatch).

## IN FLIGHT
 - **Tor CLI #387 OPEN - Linux FAIL fix in-flight on PR #404:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387 on live head `e996d93` (hardening at 63d4ede6, PAT dispatch at e996d93). PR #404 OPEN `opencode/issue387-20260924110254` `f622d210` `peros-linux: reproduce real-tor torrc rejection (Refs #387)` - Linux Tester regression `tor-cli/internal/lifecycle/peros_linux_torrc_verify_test.go` (3 tests: stock/system/bridge, skip without tor, `tor --verify-config` fail with `SocksPortWriteToFile`/`DNSPortWriteToFile`). Blocking bug: `GenerateTorrcTrans` emits `SocksPortWriteToFile`/`DNSPortWriteToFile` (`lifecycle.go:207,211`) - real tor 0.4.9.11 rejects `Unknown option` (only `ControlPortWriteToFile` exists), so every `torshim run`/`shell`/`connect` Launch fails `socks-port never appeared` exit 3 (safe fail-closed, but M2/M3 live flows broken). Fixer dispatched at 11:15:55Z on PR #404 (`opencode` run 35992006875 `fix: in_progress`, queued duplicate 35992029566 `pending` due to Owner `/oc fix` + `/oc maintainer` double-trigger). Next: await Fixer push on PR #404, review `approve`, `tor-cli` 6/6 on PR head, then `test-macos`/`test-windows` re-dispatch for 3/3 tri-OS, then Tester/Evaluator 9.9 re-gate before `Closes #387`. `Refs #387` retained per Anti-Surrender (never close on negative).
 - **Audit #399 OPEN - sweep gap fixed, staged stable, blocked by same bug:** Issue #399 OPEN, staged `tor-cli/ci/tor-cli.yml` 9979 byte-identical to `.github/workflows/tor-cli.yml` (includes `workflow_call` + weekly `schedule`), sweep on e996d93 `35990649838` success 6/6 but hermetic-masked bug means live head not truly verified; this run's fix on PR #404 will re-prove after merge, ready to close after per-OS + Evaluator gate (Refs #399).
 - **Open PRs:** [404 Linux FAIL: bogus torrc rejected by tor (f622d210, peros-linux, in_progress fix at 35992006875)] (no other open PRs - PR #403 MERGED e996d93)
 - **Open issues:** [387 Tor CLI, 399 audit sweep/drift, 70 lab-health, 42 brainstorm] (397 CLOSED)
 - **Lab dispatch this run:** none - fix on PR #404 is Maintainer native (Fixer handles infra guard; `tor-cli` not touched, so `fix` correct; no lab needed for lifecycle fix).

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening MERGED 63d4ede6 Refs #387 (6/6 clean on 2d13778) -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 (byte-identical 9979, sweep 35970827417 6/6 on 2d13778) -> PAT dispatch MERGED e996d93 Refs #387 (6 lines maintainer.yml) -> Current: main e996d93 LIVE (Deploy success), but per-OS Linux FAIL on PR #404 blocks Closes: fix in-flight on PR #404 (torrc WriteToFile), awaiting Fixer + 3/3 per-OS + Evaluator before Closes.

## NEXT-RUN PLAYBOOK
 1. Poll PR #404: `gh pr view 404 --json state,headRefOid,mergeable` + `gh run list --workflow "tor-cli" --limit 5 --json headSha,conclusion,event` + `gh run list --workflow opencode --limit 5` - ensure Fixer pushed new commit beyond f622d210, `tor-cli` `pull_request` on successor goes 6/6 (or `in_progress` → `success`), regression `TestPerosLinux*` now passes with real tor `tor --verify-config`.
 2. Poll per-OS runs: `gh run list --workflow "opencode-peros-test" --limit 10 --json conclusion,headBranch,event` - after fix, re-dispatch `test-macos` + `test-windows` on #387 (or directly on PR #404) to achieve 3/3 non-skipped `success` with real-user every-command/flag proof (honest exit 4 off-Linux, DNS via Tor where applicable).
 3. If Fixer reports `fix` again or `lab`, route accordingly; if PR #404 gets `review` `approve` + `tor-cli` 6/6 + per-OS 3/3, dispatch `test` then `eval` on #387 before `Closes #387`/`#399`. Never close on negative.
 4. Verify `tor-cli/ci/tor-cli.yml` stays byte-identical 9979 after fix, trigger-list 18/18 PASS, Deploy green.
 5. Close #399 only after sweep-equivalent `tor-cli` 6/6 on fixed main successor + per-OS + Evaluator confirms staged stable.

## ISSUES
 - **#387** - OPEN Tor CLI - Linux FAIL (torrc WriteToFile) fix in-flight on PR #404 f622d210 (run 35992006875 in_progress), awaiting Fixer push before tri-OS re-proof
 - **#399** - OPEN [Audit] tor-cli sweep/drift - staged 9979 byte-identical, sweep on e996d93 6/6 hermetic but bug masks live, fix on PR #404 will re-prove before close
 - **#404** - OPEN peros-linux regression (blocking) - torrc `SocksPortWriteToFile`/`DNSPortWriteToFile` rejected by real tor 0.4.9.11, Fixer in_progress
 - **#70** - OPEN lab-health (Deploy success on e996d93, 18/18 PASS, fix pending)
 - **#42** - OPEN brainstorm (Tor CLI directive source)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Fixer on PR #404 correctly replace `SocksPortWriteToFile`/`DNSPortWriteToFile` with wrapper-picked ports or `GETINFO net/listeners/*`, make `GenerateTorrcTrans` pass `tor --verify-config` on 0.4.9.11, and keep fail-closed + cleanup guarantees?
 - Will `tor-cli` `pull_request` on fixed PR #404 go 6/6 green (including `TestPerosLinux*` skipped without tor, green with tor) and be approvable by Reviewer?
 - Will per-OS `macOS`/`Windows` testers after fix report clean (per-app proxy-env honest, system-wide exit 4) so Tester aggregation + Evaluator (>=9.8) can gate `Closes #387`?
 - Will #399 close after fixed main successor re-proves 6/6 + staged 9979 stable?

  - Hephaestus, the Maintainer
