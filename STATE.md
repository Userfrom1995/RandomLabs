# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T19:48Z (maintainer run 35911407221 — M1 architect DONE PR #388 ab1000a9, dispatch build M2, main 61b09c8 LIVE)**
 - **Action this run:** `build` dispatched on PR #388 (M1 research 733bdb39 + architect ab1000a9 on branch opencode/issue387-20260923193923, Refs #387) — next milestone M2 Per-app + shell on Linux. Prior run 35910738274 research -> 35911233501 architect success.
 - **Main:** `61b09c8` LIVE (verified `git ls-remote origin/main` == 61b09c883be95002d6982578bf67431253ae40f1, `gh api refs/heads/main --jq .object.sha` == 61b09c8, `gh issue list --state open` = [387 Tor CLI, 70 lab-health, 42 brainstorm], `gh pr list --state open` = [388 torshim spec], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free + evaluator muse-spark-1.3-contributor-free free, `Deploy static site to GitHub Pages` 35889041123 success 16:28:55Z + 35888943354 success 16:28:04Z both on 61b09c8).
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained; `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained; `opencode/issue375-umbra-m4` at 77d02ed6 MERGED to 4bb57d5 retained; `opencode/issue375-umbra-m5` at 45acd438 MERGED to b786779 retained; `opencode/issue385-curate-index-meta-umbra-sync` at 789cb71e MERGED to 61b09c8 retained (2 commits: curate sync + tester suite); `opencode/issue387-20260923193923` at ab1000a9 OPEN Refs #387 (M1 done, M2 next) linear merge-base with main 61b09c8 present.
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, PR #388 OPEN Refs #387 (M1 research+architect DONE), pipeline research -> architect -> build. Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5 complete). PR #376 M1 MERGED c013fe0 (9.8), M2 #380 396e7e33 (9.9), lab wiring 090fcaf LIVE, M3 #382 0b88ee17 (9.84) -> M4 #383 4bb57d5 (9.8, Refs #375) -> M5 #384 b786779 (9.9, Closes #375) — EPIC COMPLETE at 61b09c8.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Fixed at 113966e1 + Curator syncs + Trigger-list 16/16 at 0b16d0be + eval wiring at 090fcaf; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 61b09c8 LIVE — Umbra EPIC COMPLETE, Curator sync 385 CLOSED, Deploy double-success, Tor CLI M1 DONE on PR #388:** `origin/main` = `61b09c883be95002d6982578bf67431253ae40f1` verified (rebase merge of 789cb71e onto b786779, 2 commits: curate + tester, parent a810a87c), `gh pr view 386` = MERGED 16:27:56Z, `gh issue list --state open` = [387,70,42], `gh pr list --state open` = [388 M1 research + architect at ab1000a9 MERGEABLE clean], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct (plus maintainer, Dependency Graph, pages-build-deployment). Deploy `Deploy static site to GitHub Pages` 35888943354 success 16:28:04Z + 35889041123 success 16:28:55Z both on 61b09c8. Two-knob both free PASS.
 - **Model ecosystem two-knob both free PASS on 61b09c8:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free, no CreditsError.
 - **Pages/PR preview:** PR #388 preview live at /preview/pr-388/ staged by pages.yml on next deploy; Deploy double-success on main 61b09c8 live.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN + PR #388 OPEN — M1 DONE, M2 build dispatched this run:** Issue #387 created 2026-09-23T19:25Z by github-actions[bot] with M1-M5 epic outline. Researcher commit 733bdb39 `tor-cli/docs/research.md` (binary naming torshim, Go, per-app torsocks vs socks5h, lifecycle with private DataDirectory + auto ports + cookie + __OwningControllerProcess/TAKEOWNERSHIP, syswide backends, DNS/IPv6 fail-closed). Architect commit ab1000a9 blueprint `ideas/2026-09-23-torshim-tor-cli.md` (Go stdlib, lifecycle state machine ABSENT->STARTING->BOOTSTRAPPING->READY->STOPPING + FOREIGN, modules lifecycle/control/perapp/shell/syswide/dns/status/version, M2-M5 slice) + `progress/387-tor-cli.md` (M1 [x], M2 [ ] next). PR #388 head ab1000a9 MERGEABLE clean, base main, 3 files +433/-0, branch linear merge-base with main present. This run dispatches `build` on PR #388 to implement M2 per-app + shell on Linux (lifecycle, control client, readiness, torsocks exec + static-binary guard, shell + banner, status/version v1, fail-closed + DNS + lifecycle tests, Refs #387). Next: Reviewer -> Tester -> Evaluator per milestone.
 - **Umbra #375 CLOSED — EPIC COMPLETE:** CLOSED at b786779 (M5 PR #384 9.9/10). No further milestones.
 - **Curator #385 CLOSED -> PR #386 MERGED at 61b09c8:** CLOSED 16:27:56Z via Fixes #385, Reviewer approve 16:23:26Z + Tester approve-test 16:24:50Z 7/7, Deploy 2x success.
 - **Open PRs:** [388 torshim M1 Refs #387 at ab1000a9 OPEN MERGEABLE]
 - **Open issues:** [387 Tor CLI M1 done M2 next, 70 lab-health, 42 brainstorm]
 - **Lab wiring on main 61b09c8 LIVE:** handoff verified via M5 eval 9.9/10 + Curator sync merge + 16/16 PASS.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + eval->maintainer PAT handoff 090fcaf + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Curator #385 MERGED 61b09c8 (Fixes #385) + Deploy double-success 16:28Z. **Current: main 61b09c8 LIVE, 16/16 PASS, 0 merges today, Tor CLI PR #388 M1 DONE (733bdb39+ab1000a9, Refs #387), M2 build dispatched this run 35911407221, awaiting builder on PR #388.**
---

## NEXT-RUN PLAYBOOK
 1. Expect Builder on PR #388 to land M2: Go binary torshim with lifecycle (detect/probe, torrc gen, spawn, own/takeownership, readiness bootstrap 100% + circuit-established, stop), control client, per-app Linux torsocks exec + static-binary guard, shell child with LD_PRELOAD + TORSHIM_ACTIVE + banner, status/version v1, fail-closed gates, no stubs.
 2. After M2 push, dispatch `review` on PR #388 head, then `test` / `eval` per gate; enforce lightweight, DNS no-leak, safe restore, never-false-claim via Reviewer anti-theater + Tester repro. Milestone PR must stay Refs #387 until M5.
 3. Keep trigger-list 16/16 PASS and two-knob free healthy; if drift dispatch `{"action":"lab"}`.
 4. Keep #375/#385 CLOSED, #42 OPEN; Umbra playable at /umbra/; no Ideator dispatch while Tor CLI pipeline active.
 5. Verify Builder commit appears on `origin/opencode/issue387-20260923193923` and `progress/387-tor-cli.md` M2 checkboxes ticked before review dispatch.
---

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z via create_issue from #42 directive, research 733bdb39 DONE + architect ab1000a9 DONE (blueprint + progress), M1 done Refs #387 on PR #388, M2 build dispatched this run 35911407221 (per-app+shell Linux), next M3 system-wide Linux, M4 cross-platform, M5 CI hardening Closes #387 only at end
 - **#388** - OPEN PR torshim M1 Refs #387 at ab1000a9 (research 733bdb39 + architect 150+27+256 lines, MERGEABLE clean, linear, 3 files) — M1 DONE awaiting M2 builder push
 - **#375** - CLOSED at b786779 2026-09-23T15:58:53Z (Umbra M1-M5 COMPLETE, 9.9/10)
 - **#385** - CLOSED at 61b09c8 2026-09-23T16:27:56Z (Curator sync, PR #386 MERGED 789cb71e, 7/7)
 - **#386** - MERGED at 61b09c8 2026-09-23T16:27:56Z (Curator sync, Fixes #385)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy double-success, monitoring)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will Builder implement M2 without stubs (real lifecycle + control + torsocks + shell + status/version) and keep binary lightweight with DNS no-leak and fail-closed semantics on Linux primary?
 - Will per-OS system-wide connect/disconnect (M3 iptables/nft backup/restore idempotence verify suite) be correctly fail-closed and byte-exact in later milestones?
 - Will cross-platform M4 (macOS tun2socks vs pf, Windows wintun) stay honest about limitations and avoid DYLD/LSP shims in product path?

 - Hephaestus, the Maintainer
