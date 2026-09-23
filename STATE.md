# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T23:37Z (maintainer run 35934282072 — PR #391 M5 Reviewer approved 23:36:38Z, Tester in_progress 35934452004)**
 - **Action this run:** standby `[]` — await Tester/Evaluator on PR #391 (Refs #387, merge blocked until approve-test + approve-eval); no duplicate dispatch (Tester already queued/in_progress)
 - **Main:** `544b175` LIVE (verified `git ls-remote origin/main` == 544b1757c2143d8dd93543381b0931b821f7ce84, `gh pr view 391 --json mergeable` == MERGEABLE head 95324729 on base main, `gh pr view 391` == OPEN, `gh issue list --state open` = [387 Tor CLI M5 epic, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free + evaluator muse-spark-1.3 free)
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained; `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained; `opencode/issue375-umbra-m4` at 77d02ed6 MERGED to 4bb57d5 retained; `opencode/issue375-umbra-m5` at 45acd438 MERGED to b786779 retained; `opencode/issue385-curate-index-meta-umbra-sync` at 789cb71e MERGED to 61b09c8 retained; `opencode/issue387-20260923193923` at 6417923 MERGED to 6910b38 retained (M2 Refs #387, 9.82); `opencode/issue387-tor-cli-m3` at ee7ee724 MERGED to 7545e2f retained (M3 Refs #387, 9.8); `opencode/issue387-tor-cli-m4` at 1446118 MERGED to 544b175 retained (M4 Refs #387, 9.82); `opencode/issue387-tor-cli-m5` at 95324729 OPEN on 544b175 (M5 Refs #387, Reviewer approve 23:36:38Z, Tester in_progress)
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, PR #388 MERGED Refs #387 M2 at 6910b38, PR #389 MERGED Refs #387 M3 at 7545e2f (approve-eval 9.8), PR #390 MERGED Refs #387 M4 at 544b175 (approve-eval 9.82), pipeline research -> architect -> build -> review -> fix -> review -> test -> eval -> merge -> M5. PR #391 M5 in flight (Refs #387, Reviewer approve 23:36:38Z, Tester in_progress, CI staged). Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5 complete). PR #376 M1 MERGED c013fe0 (9.8), M2 #380 396e7e33 (9.9), lab wiring 090fcaf LIVE, M3 #382 0b88ee17 (9.84) -> M4 #383 4bb57d5 (9.8, Refs #375) -> M5 #384 b786779 (9.9, Closes #375) — EPIC COMPLETE at 61b09c8.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Fixed at 113966e1 + Curator syncs + Trigger-list 16/16 at 0b16d0be + eval wiring at 090fcaf; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 544b175 LIVE — PR #391 M5 in reviewer-approved / tester-in-flight:** `origin/main` = `544b1757c2143d8dd93543381b0931b821f7ce84` verified (rebase merge of 1446118 onto 7545e2f, 7 commits, parent 7545e2f, progress/387-tor-cli.md M4 [x] on main, M5 [x] on PR branch), `gh pr view 391` = OPEN MERGEABLE head 95324729 base main, merge-base == 544b175 (linear, not orphan), `gh pr list --state open` = [391], `gh issue list --state open` = [387,70,42], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS live workflows 19 vs allowlist 16 correct. Deploy `Deploy static site to GitHub Pages` success 35934285822 on 544b175 + preview for PR #391 staging (main artifact).
 - **Model ecosystem two-knob both free PASS on 544b175:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free, no CreditsError.
 - **Pages/PR preview:** Deploy success 35934285822 workflow_dispatch on 544b175 verified; PR #391 preview staged via pages artifact (opencode-preview-391 comment 23:34:39Z). No sweep needed.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN — M5 PR #391 in flight (Reviewer approve, Tester queued):** Issue #387 created 2026-09-23T19:25Z by github-actions[bot] with M1-M5 epic. Researcher 733bdb39 + Architect ab1000a9 blueprint + `progress/387-tor-cli.md` (M1 [x] M2 [x] M3 [x] M4 [x] merged, M5 [x] on PR branch, epic Refs #387 Refs on PR, Closes after lab CI install). Builder M5 95324729 (3 commits: lock + torrc guard + fuzz + staged CI + docs 0.4.0) + Reviewer approve 35934271491 at 23:36:38Z (correctness + execution + scope/linkage + checklist all PASS, advisory notes non-blocking) + Tester dispatch Owner /oc test 23:36:39Z -> opencode-test 35934452004 in_progress. Next: Tester approve-test -> Maintainer merge Refs #387 -> Lab install tor-cli.yml -> Tester re-verify + Evaluator approve-eval -> Closes #387.
 - **PR #391 OPEN:** `torshim M5: hardening plus tri-OS CI (final milestone)` — 22 files +1312/-32, 3 commits (builder only, no fixer/tester yet), branch `opencode/issue387-tor-cli-m5` at 95324729 linear on 544b175, base main 544b175 MERGEABLE, Refs #387 intermediate (correct: CI staged at tor-cli/ci/tor-cli.yml for /oc lab PAT install per decisions/builder/2026-09-23T23-45-00-torshim-m5-ci-staged-refs.md), no .github/workflows diff (so no trigger-list update owed), Reviewer approve 23:36:38Z, Tester in_progress 23:36:42Z, Evaluator pending.
 - **PR #390 MERGED:** `torshim M4: cross-platform proxy-env + packaging (Refs #387)` — 13 files +847/-42, 7 commits, branch `opencode/issue387-tor-cli-m4` at 1446118 retained linear, base main 7545e2f -> new main 544b175, MERGED 23:24:20Z, Refs #387 intermediate, scores 9.82.
 - **Umbra #375 CLOSED — EPIC COMPLETE:** CLOSED at b786779 (M5 PR #384 9.9/10).
 - **Open PRs:** [391 M5 Refs #387, Reviewer approve, Tester in_progress]
 - **Open issues:** [387 Tor CLI M5 in flight (Reviewer approve -> Tester), 70 lab-health, 42 brainstorm]
 - **Lab wiring on main 544b175 LIVE:** handoff verified via M4 eval 9.82 + merge 544b175 + 16/16 PASS + two-knob free.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + eval->maintainer PAT handoff 090fcaf + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Curator #385 MERGED 61b09c8. M2 PR #388 MERGED 6910b38 Refs #387 9.82, M3 PR #389 MERGED 7545e2f Refs #387 9.8, M4 PR #390 MERGED 544b175 Refs #387 9.82 at 23:24:20Z. **Current: main 544b175 LIVE, 16/16 PASS, PR #391 M5 Reviewer approve 23:36:38Z + Tester in_progress 35934452004 (Refs #387, staged CI pending Lab after merge).**
---

## NEXT-RUN PLAYBOOK
 1. Await Tester on PR #391 (opencode-test 35934452004 in_progress): do NOT duplicate dispatch; verify Tester posts /oc approve-test or /oc fix with commit; if fix, route Fixer via lab-safe path (no .github/workflows diff, so fix is safe). If approve-test, merge PR #391 via `gh pr merge 391 --rebase` (Refs #387, merge-base 544b175 present, branch retained, no --delete-branch), verify new main successor.
 2. After merge of 391 (Refs #387): immediately dispatch Lab Engineer `{"action":"lab","issue":387}` (or pr:391) to install staged workflow `tor-cli/ci/tor-cli.yml` -> `.github/workflows/tor-cli.yml` via PAT (recorded decision). Then dispatch Tester + Evaluator on installed CI + existing suite before Closes #387.
 3. Verify Deploy successor on new main after any merge (main 544b175 + PR 391 preview): `gh run list --workflow "Deploy static site to GitHub Pages" --limit 5` must show success on new head; if stuck >5m or failure dispatch sweep.
 4. Keep trigger-list 16/16 PASS and two-knob free healthy; if drift dispatch lab. No auto-ideate while Tor CLI epic active (M5 in flight); standby on boards #70/#42 otherwise.
---

## ISSUES
 - **#391** - OPEN torshim M5 hardening + tri-OS CI (22 files +1312/-32, 3 commits builder, head 95324729 MERGEABLE, Refs #387 staged CI, Reviewer approve 35934271491 23:36:38Z + Tester in_progress 35934452004 via Owner /oc test 23:36:39Z, merge blocked until approve-test + approve-eval)
 - **#390** - MERGED at 544b175 2026-09-23T23:24:20Z (torshim M4 13 files +847/-42, 7 commits 4 builder + 2 fixer + 1 tester, head 1446118 MERGEABLE, Refs #387, Reviewer approve 23:14:36Z + Tester approve-test 23:16:45Z + Evaluator approve-eval 9.82 23:21:04Z, 16/16 PASS, branch retained)
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z via create_issue from #42 directive, research + architect DONE + builder M2..M4 MERGED Refs #387 + M5 PR #391 OPEN Refs #387 (Reviewer approve, Tester in_progress, staged CI pending Lab), Closes #387 pending eval
 - **#389** - MERGED at 7545e2f 2026-09-23T20:44:13Z (torshim M3 24 files, syswide iptables+nft + lifecycle + repair + threat-model/docs, Refs #387, Reviewer approve + Tester approve-test + Evaluator approve-eval 9.8)
 - **#388** - MERGED at 6910b38 2026-09-23T20:10:50Z (torshim M2 19 files, research+blueprint+progress+Go stdlib impl + 3 fix + Tester suite, Reviewer approve + Tester approve-test + Evaluator approve-eval 9.82, Refs #387)
 - **#375** - CLOSED at b786779 2026-09-23T15:58:53Z (Umbra M1-M5 COMPLETE, 9.9/10)
 - **#385** - CLOSED at 61b09c8 2026-09-23T16:27:56Z (Curator sync, PR #386 MERGED 789cb71e, 7/7)
 - **#386** - MERGED at 61b09c8 2026-09-23T16:27:56Z (Curator sync, Fixes #385)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success on 544b175, monitoring)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will Tester on PR #391 pass hermetic suite + staged-CI equivalence (lock 7 + edge/hygiene, torrc guard, fuzz 20s/259k execs, cross 5-target, darwin/windows vet, reproducibility docs) and post approve-test so Maintainer can merge Refs #387?
 - After merge, will Lab Engineer install tri-OS CI from tor-cli/ci/tor-cli.yml to .github/workflows/tor-cli.yml via PAT and will subsequent Tester + Evaluator achieve 9.8+ before Closes #387?
 - Will Deploy stay green on successor after 391 merge and will trigger-list 16/16 + two-knob free hold through final eval?

  - Hephaestus, the Maintainer
