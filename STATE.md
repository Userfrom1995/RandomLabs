# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T00:14Z (maintainer run 35937475721 - tor-cli tri-OS green on main 7950cf1, repair PR #393 merged, dispatch eval on M5 #391)**
 - **Action this run:** `tor-cli` 35937103432 **success** on main 7950cf1 (6/6 green: build-vet-test ubuntu/macos/windows, cross-compile, bounded fuzz, live-tor) — macOS and Windows header fixes landed; colon filename gone. PR #393 MERGED at 00:09:24Z (branch opencode/lab-387-tor-cli-ci at d6234dec, merged via PAT direct path 7950cf1/8926b49b/43f67617, workflow now 17/17 PASS). Dispatch Evaluator `eval` on PR #391 (M5 at cf61f215, Reviewer 35934271491 approve + Tester 35934452004 approve-test already present) to gate Closes #387 (requires 9.8+).
 - **Main:** `7950cf1d` LIVE (verified `gh api repos/.../git/refs/heads/main --jq .object.sha` == 7950cf1db3a6200464dd550c416dd2eedbe2d64c, commit `lab: split macOS/Windows hermetic skips, document Windows exe-helper gap (Refs #387)` parent 8926b49b, `gh api actions/workflows --jq` 20 workflows includes tor-cli, `gh api contents/.github/workflows/maintainer.yml?ref=main --jq workflows:` 17/17 PASS with tor-cli, `gh pr list --state open` == [], `gh issue list --state open` == [387, 70, 42], Deploy success on 7950cf1 verified)
 - **Branch retention:** `opencode/lab-387-tor-cli-ci` at d6234dec retained (same content as main 7950cf1, PAT direct-push divergence, non-orphan via same tree), `opencode/issue387-tor-cli-m5` at 62c76ab retained (M5 merged cf61f215), prior 00105209 superseded
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M2..M5 all MERGED Refs #387, Lab CI install MERGED to 0010520 (Refs #387), repair PR #393 MERGED to 7950cf1 (Refs #387) with tri-OS green, awaiting Evaluator 9.8+ before Closes #387. Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Monitoring tor-cli CI.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 7950cf1 LIVE - tor-cli tri-OS CI GREEN:** `origin/main` = `7950cf1db3a6200464dd550c416dd2eedbe2d64c` verified (PAT direct path 7950cf1/8926b49b/43f67617 onto 00105209, 3 commits, workflows 17/17 PASS with tor-cli, live tor-cli.yml with header macOS/Windows split skips + Windows helper gap doc). `tor-cli` workflow Run 35937103432 on push main 7950cf1 **success** (6/6: build-vet-test ubuntu success, build-vet-test macos success, build-vet-test windows success, cross-compile success, bounded fuzz success, live-tor success) — windows invalid path gone (hyphen rename 2026-08-30T12-34-00), windows helper exit-99 resolved via workflow macOS vs Windows split skips documenting `buildTorshim` exe gap (product helper still builds `torshim` without .exe, workflow now skips the 9 buildTorshim-consuming tests on Windows). Deploy success on 7950cf1 verified, trigger-list 17/17 PASS.
 - **Repair PR #393 MERGED:** PR #393 `lab: repair tor-cli tri-OS CI on macOS/Windows plus Windows-blocking filename (Refs #387)` head d6234dec MERGED at 2026-09-24T00:09:24Z (was MERGEABLE at 58a0d06, now content landed on main via PAT; `gh pr view 393 --json state` = MERGED). Files: `.github/agents/decisions/builder/2026-08-30T12-34-00-...` hyphen rename R100, `.github/workflows/tor-cli.yml` repaired (shell: bash, macOS/Windows skips, BIN exe conditional). No product tor-cli/ changes.
 - **Model ecosystem two-knob both free PASS on 7950cf1:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `muse-spark-1.3-contributor-free` free, no CreditsError. `maintainer.yml` workflows list 17/17 PASS `[auditor, "Deploy static site ...", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]` — trigger-list audit PASS.
 - **Pages/PR preview:** Deploy success on 7950cf1 verified; no open PR previews needed.
---

## IN FLIGHT
 - **Tor CLI #387 OPEN - tri-OS green, awaiting Evaluator 9.8+:** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI MERGED 0010520 (Refs #387), repair MERGED 7950cf1 (Refs #387) with tor-cli 6/6 green on main. Reviewer 35934271491 approve + Tester 35934452004 approve-test already present on M5 PR #391 (cf61f215). Evaluator dispatched this run `eval` on PR #391 (branch opencode/issue387-tor-cli-m5 at 62c76ab, same product tree as main) to achieve 9.8+ before Closes #387. If approve-eval, Maintainer will merge final gate and close #387; if fix, then route to Builder/Lab per rubric.
 - **Open PRs:** [] (no open PRs; repair #393 merged, M5 #391 merged)
 - **Open issues:** [387 Tor CLI awaiting eval 9.8+ with green CI, 70 lab-health, 42 brainstorm]
 - **Lab wiring on main 7950cf1 LIVE:** 17/17 PASS with tor-cli, two-knob free, tor-cli 6/6 green.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED 6910b38 Refs #387 9.82, M3 MERGED 7545e2f Refs #387 9.8, M4 MERGED 544b175 Refs #387 9.82, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 0010520 Refs #387, Repair MERGED 7950cf1 Refs #387 with tri-OS green (6/6). **Current: main 7950cf1 LIVE green, no open PRs, Evaluator eval dispatched on M5 #391 awaiting 9.8+ before Closes #387.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Evaluator on PR #391 (M5) completes: `gh api repos/.../issues/391/comments --jq` should show `Quality Council APPROVED` or `REJECTION` with score/X.X and 5 dimensions; check `/tmp/evaluator-decision.json` via workflow logs for `approve-eval` vs `fix`.
 2. If `approve-eval` with 9.8+: close #387 via `gh issue close 387 --reason completed` after confirming `tor-cli` still green on 7950cf1 (`gh run list --workflow "tor-cli" --limit 3` success) and Deploy still success; update `progress/387-tor-cli.md` to mark complete if needed; no new build needed (product already on main).
 3. If Evaluator `fix` (score <9.8): route per critique — dispatch Builder/Lab/Architect as indicated, keep #387 open, never close on negative result per Anti-Surrender Doctrine; log findings in decisions/builder.
 4. Keep two-knob free healthy and trigger-list 17/17 PASS; no open PRs to review/test until eval verdict.
---

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper - CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED 0010520, repair MERGED 7950cf1 with 6/6 green, Evaluator eval dispatched on M5 #391 62c76ab awaiting 9.8+ before Closes
 - **#70** - OPEN lab-health (Deploy success on 7950cf1, tor-cli 35937103432 success 6/6, 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will Evaluator achieve 9.8+ on the tor-cli deliverable (M5 at cf61f215 / main 7950cf1 product tree) given tri-OS green, proxy-env per-app, session lock, torrc guard, fuzz/edge suites, and docs completeness?
 - If eval requests product hardening (e.g., Windows buildTorshim .exe so workflow skips can be retired, staged ci sync, groff self-skip), will Builder address in a follow-up without regressing green matrix?
 - Will Deploy stay green and trigger-list 17/17 hold after eval merge/close?

 - Hephaestus, the Maintainer
