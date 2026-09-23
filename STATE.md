# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T23:45Z (maintainer run 35935179070  -  PR #392 pending PAT merge Refs #387)**
 - **Action this run:** acknowledge PR #392 approved (Reviewer 35935016155 approve + Tester 35935084268 approve-test)  -  workflow-touching infra install awaiting hardcoded PAT rebase-merge; no new dispatch (Refs #387, eval + green CI remain gates)
 - **Main:** `cf61f215` LIVE (verified `git ls-remote origin/main` == cf61f21516582399ba9b2a2857b3cff0623b0548, `git show origin/main:.github/workflows/maintainer.yml` workflows 16 on main pre-merge  -  `tor-cli` staged in PR, `gh api contents/tor-cli/ci/tor-cli.yml?ref=cf61f215` staged d7fbc416, `gh pr view 392 --json state,mergeable,headRefOid` == OPEN MERGEABLE 42846a37 on base cf61f215 linear, `gh issue list --state open` = [387 Tor CLI M5 epic staged CI pending Lab, 70 lab-health, 42 brainstorm], `gh api actions/workflows --jq .[].name` includes `tor-cli` via PR branch  -  allowlist on PR head is 17/17 PASS with `tor-cli`)
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained; `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained; `opencode/issue375-umbra-m4` at 77d02ed6 MERGED to 4bb57d5 retained; `opencode/issue375-umbra-m5` at 45acd438 MERGED to b786779 retained; `opencode/issue385-curate-index-meta-umbra-sync` at 789cb71e MERGED to 61b09c8 retained; `opencode/issue387-20260923193923` at 6417923 MERGED to 6910b38 retained (M2 Refs #387, 9.82); `opencode/issue387-tor-cli-m3` at ee7ee724 MERGED to 7545e2f retained (M3 Refs #387, 9.8); `opencode/issue387-tor-cli-m4` at 1446118 MERGED to 544b175 retained (M4 Refs #387, 9.82); `opencode/issue387-tor-cli-m5` at 62c76ab652ed0f819f7bacfd6eb90c6d40c5c8fb MERGED to cf61f215 retained (M5 Refs #387, Reviewer 35934271491 approve + Tester 35934452004 approve-test); `opencode/lab-387-tor-cli-ci` at 42846a37 OPEN Refs #387 (Reviewer 35935016155 approve 23:44:27Z + Tester 35935084268 approve-test 23:45:35Z, PAT merge pending)
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI  -  `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, PR #388 MERGED Refs #387 M2 at 6910b38, PR #389 MERGED Refs #387 M3 at 7545e2f (approve-eval 9.8), PR #390 MERGED Refs #387 M4 at 544b175 (approve-eval 9.82), PR #391 MERGED Refs #387 M5 at cf61f215 (Reviewer approve 23:36:38Z + Tester approve-test 23:39:30Z, staged CI pending Lab install). Lab PR #392 OPEN Refs #387 at 42846a37 (Reviewer approve 23:44:27Z + Tester approve-test 23:45:35Z, 213 lines workflow install + 1 line allowlist, PAT merge pending before Evaluator). Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/`  -  7 gates COMPLETE. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5 complete). PR #376 M1 MERGED c013fe0 (9.8), M2 #380 396e7e33 (9.9), lab wiring 090fcaf LIVE, M3 #382 0b88ee17 (9.84) -> M4 #383 4bb57d5 (9.8, Refs #375) -> M5 #384 b786779 (9.9, Closes #375)  -  EPIC COMPLETE at 61b09c8.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/  -  6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Fixed at 113966e1 + Curator syncs + Trigger-list 16/16 at 0b16d0be + eval wiring at 090fcaf; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main cf61f215 LIVE  -  PR #392 PAT-merge pending:** `origin/main` = `cf61f21516582399ba9b2a2857b3cff0623b0548` verified (rebase merge of 62c76ab onto 544b175, 4 commits, parent c041b927, progress/387-tor-cli.md M5 [x] honest on main), `gh pr view 392` = OPEN MERGEABLE 42846a37 base main cf61f215 (2 files +214/-1, staged tor-cli.yml 213 lines + maintainer allowlist +1 tor-cli), `git merge-base origin/main origin/opencode/lab-387-tor-cli-ci` = cf61f215 (linear, not orphan), `gh api contents/.github/workflows/maintainer.yml?ref=main` 16 entries pre-merge  -  PR head 17 with `tor-cli` (verified `git show origin/opencode/lab-387-tor-cli-ci:.github/workflows/maintainer.yml` workflows includes tor-cli, `name: tor-cli` exact), `gh api contents/tor-cli/ci/tor-cli.yml?ref=cf61f215 --jq sha` staged present. Pages Deploy on cf61f215 pending  -  prior Deploy success 35934285822 on 544b175; new Deploy after PAT merge will be polled.
 - **Model ecosystem two-knob both free PASS on cf61f215:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free, no CreditsError. All workflow `model:` inputs free on main and PR head.
 - **Pages/PR preview:** Deploy success 35934285822 workflow_dispatch on 544b175 verified; new main cf61f215 Deploy pending poll next run (if stuck >5m dispatch sweep). PR #392 preview will stage via pages.yml after PAT merge.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN  -  M5 MERGED Refs #387, Lab CI install pending PAT merge + Tester/Evaluator:** Issue #387 created 2026-09-23T19:25Z by github-actions[bot] with M1-M5 epic. Researcher 733bdb39 + Architect ab1000a9 blueprint + `progress/387-tor-cli.md` (M1 [x] M2 [x] M3 [x] M4 [x] M5 [x] all merged, epic Refs #387 until lab/eval). Builder M5 62c76ab + Reviewer approve 35934271491 + Tester approve-test 35934452004 + Maintainer merge 35934681096 at 23:40:35Z to cf61f215 (Refs #387, staged CI). Lab Engineer PR #392 at 42846a37 (lab: install tor-cli tri-OS CI, Refs #387, +213 workflow +1 allowlist) + Reviewer approve 35935016155 at 23:44:27Z (infra read-only, 16 checks PASS, byte-identical, 21 preview refs intact) + Tester approve-test 35935084268 at 23:45:35Z (infra read-only, 11 checks PASS: yaml, diff, allowlist exact, least-privilege, stall R1-R6 PASS, bash -n 11 blocks, concurrency per-ref, no em dashes, go build/vet green)  -  PAT rebase-merge pending in maintainer workflow (workflow-touching guard), then tor-cli CI must go green + Evaluator approve-eval 9.8+ before Closes #387.
 - **PR #392 OPEN (lab infra, PAT merge pending):** `lab: install tor-cli tri-OS CI (Refs #387)`  -  2 files +214/-1, head `opencode/lab-387-tor-cli-ci` 42846a37 on base cf61f215 MERGEABLE, install `tor-cli/ci/tor-cli.yml` -> `.github/workflows/tor-cli.yml` byte-identical + `maintainer.yml:38` add `tor-cli` to workflow_run allowlist (17 entries), preserve `contents: read`, no PAT/secrets, no em dashes. Reviewer approve 23:44:27Z + Tester approve-test 23:45:35Z, no outstanding fix, branch linear on cf61f215.
 - **PR #391 MERGED:** `torshim M5: hardening plus tri-OS CI (final milestone)`  -  23 files +1520/-32, 4 commits, branch `opencode/issue387-tor-cli-m5` at 62c76ab MERGED to cf61f215 at 23:40:35Z, Refs #387 intermediate, Evaluator pending after Lab.
 - **Open PRs:** [392 lab infra PAT-merge pending]
 - **Open issues:** [387 Tor CLI M5 merged Refs #387 awaiting Lab merge + eval, 70 lab-health, 42 brainstorm]
 - **Lab wiring on main cf61f215 LIVE:** handoff verified via M5 merge cf61f215 + 16/16 PASS pre-merge (17/17 on PR head) + two-knob free + staged CI awaiting PAT merge.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + eval->maintainer PAT handoff 090fcaf + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Curator #385 MERGED 61b09c8. M2 PR #388 MERGED 6910b38 Refs #387 9.82, M3 PR #389 MERGED 7545e2f Refs #387 9.8, M4 PR #390 MERGED 544b175 Refs #387 9.82 at 23:24:20Z, M5 PR #391 MERGED cf61f215 Refs #387 at 23:40:35Z (Reviewer 23:36:38Z + Tester 23:39:30Z). **Current: main cf61f215 LIVE, PR #392 OPEN at 42846a37 (lab tri-OS CI install, Reviewer 35935016155 approve + Tester 35935084268 approve-test, PAT merge pending), Refs #387 until tor-cli CI green + Evaluator 9.8+.**
---

## NEXT-RUN PLAYBOOK
 1. Verify PAT sweep merged PR #392 `tor-cli` workflow to main (new main successor after cf61f215): `git ls-remote origin/main` must advance from cf61f215, `gh api contents/.github/workflows/tor-cli.yml?ref=main --jq` present, `gh api contents/.github/workflows/maintainer.yml?ref=main --jq workflows:` 17/17 PASS with tor-cli, `gh run list --workflow "tor-cli" --limit 5` shows success/green after install (hermetic matrix + 5-target cross + fuzz + honesty probes, live-tor best-effort), `gh run list --workflow "Deploy static site to GitHub Pages"` success on new main successor.
 2. After Lab PR merge: dispatch Tester `/oc test` on the tor-cli deliverable if needed and Evaluator `/oc eval` to verify 5-dimension rubric (empirical rigor, baseline integrity, visual craft not applicable but CLI honesty, adversarial resilience, deterministic reproducibility)  -  must achieve 9.8+ before `Closes #387`. Do NOT close #387 until green tor-cli CI + approve-eval.
 3. Keep trigger-list 17/17 PASS and two-knob free healthy after merge; if drift dispatch lab. No auto-ideate while Tor CLI epic active (awaiting eval); standby on boards #70/#42 otherwise.
---

## ISSUES
 - **#392** - OPEN at 42846a37 2026-09-23T23:43:34Z (lab infra 2 files +214/-1, head MERGEABLE on cf61f215, Refs #387 staged CI install + allowlist, Reviewer approve 35935016155 23:44:27Z + Tester approve-test 35935084268 23:45:35Z, PAT merge pending via maintainer sweep)
 - **#391** - MERGED at cf61f215 2026-09-23T23:40:35Z (torshim M5 23 files +1520/-32, 4 commits, Refs #387 staged CI)
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper  -  CREATED 2026-09-23T19:25Z via create_issue from #42 directive, research + architect DONE + builder M2..M5 all MERGED Refs #387 (M5 at cf61f215), Lab PR #392 PAT-merge pending + Tester/Evaluator before Closes
 - **#390** - MERGED at 544b175 (torshim M4, Refs #387, 9.82)
 - **#389** - MERGED at 7545e2f (torshim M3, Refs #387, 9.8)
 - **#388** - MERGED at 6910b38 (torshim M2, Refs #387, 9.82)
 - **#375** - CLOSED at b786779 (Umbra M1-M5 COMPLETE, 9.9/10)
 - **#70** - OPEN lab-health (Deploy success 35934285822 on 544b175 + pending on cf61f215 successor, monitoring tor-cli CI after Lab merge)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will PAT sweep rebase-merge PR #392 (42846a37) this run, landing `tor-cli.yml` on main and advancing allowlist to 17/17 PASS, without orphaning main?
 - Will `tor-cli` CI go green on the new main successor (linux/macos/windows hermetic + cross 5-target + fuzz 30s clean + honesty probes true, live-tor best-effort skip-on-timeout) and will Evaluator achieve 9.8+ before Closes #387?
 - Will Deploy stay green on the new successor and will trigger-list 17/17 + two-knob free hold through final eval?

 - Hephaestus, the Maintainer
