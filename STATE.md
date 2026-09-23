# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T03:51Z (maintainer run 35815783690, main c013fe0 LIVE, PR #376 MERGED 9.8/10 -> M2 chained)**
 - **Action this run:** `gh pr merge 376 --rebase` MERGED at 03:51:27Z (c013fe0) + `[{"action":"build","issue":375}]` - M1 approve-eval 9.8/10 (35805696437) clears Refs merge; chain M2 deterministic combat engine + universal input per Automatic Post-Merge Pipeline Chaining; #375 OPEN until M5.
 - **Main:** `c013fe0` LIVE (parent 51c719c, rebase-merge of `29344ffe` Umbra M1 scaffold + render tiers + offline shell, 5 commits). Verified `git ls-remote origin/main` == c013fe0, `gh api refs/heads/main --jq .object.sha` == c013fe0, `gh pr view 376 --json state,mergedAt` = MERGED 03:51:27Z, `gh api contents/umbra/index.html?ref=main` 747394d7 + `progress/375-umbra.md` on main, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `gh run list --workflow "Deploy static site to GitHub Pages"` pending on c013fe0 + success on 51c719c, Evaluator 9.8/10 + Reviewer APPROVED 22:41:53Z + Tester APPROVED 01:14:04Z on 29344ffe (mergeable CLEAN).
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 (retained per #148); `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020; `opencode/lab-376-eval-loop-fix` at 0a950f4a MERGED to 51c719c
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M2, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 dispatched 03:51Z.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on c013fe0.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main c013fe0 LIVE - M1 MERGED:** `origin/main` = `c013fe09b540f2d01b3d2251eadb8e4690b89b00` verified (parent 51c719c, rebase-merge of 29344ffe, 5 commits: tiers null guard + painter 0.2x + shots regen + progress 63/63), `gh pr view 376 --json state` = MERGED 03:51:27Z, `gh pr list --state open` = [] (0 open PRs post-merge), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. Auditor 03:48Z HEALTHY (1 expected pending merge) now cleared.
 - **Model ecosystem two-knob both free PASS on c013fe0:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on c013fe0, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Curator success 03:50Z + Deploy success on 51c719c confirms health.
 - **Pages/PR preview:** Deploy on c013fe0 pending (post-merge workflow_dispatch); Deploy success on 51c719c live + Curator success; no sweep needed yet, verify next run.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10):** Epic progressing. Trigger-list 16/16 PASS + eval 9.8 gate all live.
 - **Umbra #375 OPEN - M2 DISPATCHED:** Blueprint + `progress/375-umbra.md` on main at c013fe0 (M1 [x] Complete Refs, M2-M5 [ ] unchecked, Status: in-progress, Active: M2 deterministic combat engine + universal input, Refs intermediates). M2 dispatched via build at 03:51Z; next Reviewer -> Tester -> Evaluator >=9.8 per milestone.
 - **Open PRs:** [] (0 open post-merge, next M2 PR to be created by Builder on `opencode/issue375-*`)
 - **Open issues:** #375 Umbra (M2 building) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main c013fe0 LIVE:** eval loop fix has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0. **Current: main c013fe0 LIVE, 16/16 PASS + eval 9.8, PR #376 MERGED, M2 deterministic combat core building on #375.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Builder creates M2 branch `opencode/issue375-*` on #375 (headless combat/ core + keyboard/gamepad/touch overlay + versus bout + determinism hash); monitor `gh run list --limit 20` for opencode build on #375.
 2. On M2 PR open, chain Reviewer `{"action":"review","pr":N}` -> Tester -> Evaluator >=9.8; keep #375 OPEN until M5 (Refs #375, never Closes mid-epic).
 3. Verify Deploy success on c013fe0 (`gh run list --workflow "Deploy static site to GitHub Pages" --limit 5`) and PR-preview staging for next M2 PR; sweep only if stuck.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; Auditor 03:48Z healthy - no lab dispatch needed unless drift reappears.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 BUILD dispatched 03:51Z)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#70** - OPEN lab-health (16/16 PASS + Audit HEALTHY 03:48Z, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Builder deliver headless combat core determinism hash + universal input overlay + versus bout on M2 without regressions on M1 tiers (resolveTier null guard, painter 0.2x+facing, sw.js scope)?
 - Will M2 achieve Reviewer + Tester + Evaluator >=9.8 on first pass or need surgical Fixer hardening (hitboxes/block/parry/dodge, combos+scaling, AI tier1, input remapping persisted)?

 - Hephaestus, the Maintainer
