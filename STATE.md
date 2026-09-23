# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T19:38Z (maintainer run 35910575918 — Tor CLI research dispatched on #387, main 61b09c8 LIVE, Deploy 2x success, 0 open PRs)**
 - **Action this run:** `research` dispatched on #387 Tor CLI — lightweight cross-platform Tor wrapper (per-app, shell, system-wide) plus ping answering sign-off/dispatch flow; prior run 35907996471 created #387 from Owner directive 2026-09-23T19:14:33Z on #42.
 - **Main:** `61b09c8` LIVE (verified `git ls-remote origin/main` == 61b09c883be95002d6982578bf67431253ae40f1, `gh api refs/heads/main --jq .object.sha` == 61b09c8, `gh issue list --state open` = [387 Tor CLI, 70 lab-health, 42 brainstorm], `gh pr list --state open` = [], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free + evaluator muse-spark-1.3-contributor-free free, `Deploy static site to GitHub Pages` 35889041123 success 16:28:55Z + 35888943354 success 16:28:04Z both on 61b09c8, `gh issue view 387 --json author` = app/github-actions bot identity).
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained; `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained; `opencode/issue375-umbra-m4` at 77d02ed6 MERGED to 4bb57d5 retained; `opencode/issue375-umbra-m5` at 45acd438 MERGED to b786779 retained; `opencode/issue385-curate-index-meta-umbra-sync` at 789cb71e MERGED to 61b09c8 retained (2 commits: curate sync + tester suite).
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, research dispatched this run (Dr. Mob), pipeline research -> architect -> build. Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5 complete). PR #376 M1 MERGED c013fe0 (9.8), M2 #380 396e7e33 (9.9), lab wiring 090fcaf LIVE, M3 #382 0b88ee17 (9.84) -> M4 #383 4bb57d5 (9.8, Refs #375) -> M5 #384 b786779 (9.9, Closes #375) — EPIC COMPLETE at 61b09c8.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Fixed at 113966e1 + Curator syncs + Trigger-list 16/16 at 0b16d0be + eval wiring at 090fcaf; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 61b09c8 LIVE — Umbra EPIC COMPLETE, Curator sync 385 CLOSED, Deploy double-success, Tor CLI #387 research dispatched:** `origin/main` = `61b09c883be95002d6982578bf67431253ae40f1` verified (rebase merge of 789cb71e onto b786779, 2 commits: curate + tester, parent a810a87c), `gh pr view 386` = MERGED 16:27:56Z, `gh issue list --state open` = [387,70,42], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct (plus maintainer, Dependency Graph, pages-build-deployment). Deploy `Deploy static site to GitHub Pages` 35888943354 success 16:28:04Z + 35889041123 success 16:28:55Z both on 61b09c8. Two-knob both free PASS.
 - **Model ecosystem two-knob both free PASS on 61b09c8:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free, no CreditsError.
 - **Pages/PR preview:** 0 open PRs, no preview needed; Deploy double-success on main 61b09c8 live.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN — research dispatched this run:** Owner Tor CLI directive at 2026-09-23T19:14:33Z on #42; issue #387 created 2026-09-23T19:25Z by github-actions[bot] with M1-M5 epic outline (research torsocks/tor/proxychains/tun2socks + per-OS backends, per-app+shell, connect/disconnect, cross-platform+status, CI hardening). This run dispatched `research` (Dr. Mob) to produce `tor-cli/docs/research.md` + per-OS matrix, choose isolation mechanism per OS, lifecycle state machine, DNS/IPv6 fail-closed plan. Next: `architect` for `progress/387-tor-cli.md` milestone epic after research lands, then `build` iterations per milestone. No PR yet.
 - **Umbra #375 CLOSED — EPIC COMPLETE:** CLOSED at b786779 (M5 PR #384 9.9/10). No further milestones.
 - **Curator #385 CLOSED -> PR #386 MERGED at 61b09c8:** CLOSED 16:27:56Z via Fixes #385, Reviewer approve 16:23:26Z + Tester approve-test 16:24:50Z 7/7, Deploy 2x success.
 - **Open PRs:** [] (none).
 - **Open issues:** [387 Tor CLI research dispatched, 70 lab-health, 42 brainstorm].
 - **Lab wiring on main 61b09c8 LIVE:** handoff verified via M5 eval 9.9/10 + Curator sync merge + 16/16 PASS.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + eval->maintainer PAT handoff 090fcaf + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Curator #385 MERGED 61b09c8 (Fixes #385) + Deploy double-success 16:28Z. **Current: main 61b09c8 LIVE, 16/16 PASS, 0 open PRs, Tor CLI #387 OPEN research dispatched this run, architect next.**
---

## NEXT-RUN PLAYBOOK
 1. After research lands on #387 (tor-cli/docs/research.md + per-OS matrix), dispatch `{"action":"architect","issue":387}` to produce `progress/387-tor-cli.md` M1-M5 epic with per-OS matrices and test plan (linux/macos/windows GH Actions matrix).
 2. Then `build` iterations per milestone (M2 per-app+shell on Linux primary, M3 connect/disconnect safe restore, M4 cross-platform+status/version, M5 hardening+CI); enforce lightweight, DNS no-leak, safe restore, never-false-claim gates via Reviewer anti-theater checklist + Tester independent repro.
 3. Keep trigger-list 16/16 PASS and two-knob free healthy; if drift dispatch `{"action":"lab"}`.
 4. Keep #375/#385 CLOSED, #42 OPEN; Umbra playable at /umbra/; no Ideator dispatch while Tor CLI pipeline active.
 5. Verify research commit lands and `gh issue view 387 --json comments` shows research findings before architect dispatch.
---

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z via create_issue from #42 directive, research dispatched 2026-09-23T19:38Z (Dr. Mob survey tor/torsocks/proxychains/tun2socks + per-OS backends), next architect for progress/387-tor-cli.md M1-M5
 - **#375** - CLOSED at b786779 2026-09-23T15:58:53Z (Umbra M1-M5 COMPLETE, 9.9/10)
 - **#385** - CLOSED at 61b09c8 2026-09-23T16:27:56Z (Curator sync, PR #386 MERGED 789cb71e, 7/7)
 - **#386** - MERGED at 61b09c8 2026-09-23T16:27:56Z (Curator sync, Fixes #385)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy double-success, monitoring)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - What final binary name will Researcher/Architect choose for tor-tool placeholder (torshim/torrun/ontor) and will it avoid collision with existing packages?
 - Will per-OS system-wide connect/disconnect be fully achievable in CI (especially macOS pf and Windows WFP) or require documented limitation + mock verification?
 - Will Architect keep bundle lightweight (< few MB, minimal deps) while handling DNS/IPv6 correctly on all three OS?
 - Will research findings arrive promptly and confirm lightweight mechanism choice (torsocks vs proxychains-ng vs LD_PRELOAD per OS) without overengineering?

 - Hephaestus, the Maintainer
