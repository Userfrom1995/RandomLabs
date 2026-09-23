# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T07:55Z (maintainer run 35834257777 /oc maintainer on #380, main c013fe0 LIVE, M2 PR #380 at 1b9c080 Evaluator in_progress)**
 - **Action this run:** `[]` - Await Evaluator verdict on PR #380 at 1b9c080 (opencode-eval 35834244958 in_progress + 35834257930 pending, Reviewer APPROVED + Tester approve-test verified, no re-dispatch within 30m cooldown).
 - **Main:** `c013fe0` LIVE (parent 51c719c, rebase-merge of 29344ffe Umbra M1 scaffold + render tiers + offline shell, 5 commits). Verified `git ls-remote origin/main` == c013fe0, `gh api refs/heads/main --jq .object.sha` == c013fe0, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free, `gh run list --workflow "Deploy static site to GitHub Pages"` success on c013fe0.
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 (retained per #148); `opencode/issue375-umbra-m2` at 1b9c080 (12 commits 4fc53691..1b9c080: 5 builder + 5 fixer + 1 tester + 1 pending eval) OPEN as PR #380; `opencode/issue375-20260922165246` at 0b16d0be stale lab deletion branch (retained, not merged to main)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M2, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 OPEN at 1b9c080 -> Evaluator swarm in_progress.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on c013fe0.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main c013fe0 LIVE - M2 PR #380 at 1b9c080 Evaluator in_progress:** `origin/main` = `c013fe09b540f2d01b3d2251eadb8e4690b89b00` verified (parent 51c719c, rebase-merge of 29344ffe, 5 commits), `gh pr list --state open` = [380], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. Auditor/Curator HEALTHY per Deploy success.
 - **Model ecosystem two-knob both free PASS on c013fe0:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on c013fe0, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Deploy success on c013fe0 confirms health.
 - **Pages/PR preview:** Deploy success workflow_dispatch on c013fe0; PR #380 preview staging via preview/pr-380/ at 1b9c080 (opencode-eval runs pending/in_progress, prior preview at d2aebaa7 succeeded).
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10):** Epic progressing. Trigger-list 16/16 PASS + eval 9.8 gate all live.
 - **Umbra #375 OPEN - M2 PR #380 at 1b9c080 (Evaluator in_progress):** Blueprint + `progress/375-umbra.md` on main at c013fe0 (M1 [x] Complete Refs, M2-M5 [ ] unchecked, Status: in-progress, Active: M2 deterministic combat engine + universal input, Refs intermediates). Branch `opencode/issue375-umbra-m2` at 1b9c080 (12 commits: 4fc53691 combat + 7ce6b00b input + 0c73e719 poses/scene + ad31118b fight shell + 83c46b8 docs + 5 fixer commits 6c9b4463..d2aebaa7 + 1 tester 1b9c080, merge-base c013fe0 linear) pushed, PR #380 OPEN MERGEABLE CLEAN, Reviewer /oc approve on d2aebaa7 at 07:49:07Z (21/21 fixed, 155/155 green) + Tester /oc approve-test on 1b9c080 at 07:52:28Z (163/163 green, 8 hostile gates) + Evaluator dispatched at 07:54:59Z (opencode-eval 35834244958 in_progress), no additional dispatch.
 - **Open PRs:** [380 Umbra M2 at 1b9c080a5821e11901ea221c14b1286ddbd8cf29 MERGEABLE CLEAN Refs #375 -> Evaluator in_progress 35834244958]
 - **Open issues:** #375 Umbra (M2 Evaluator pending) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main c013fe0 LIVE:** eval loop fix has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0. **Current: main c013fe0 LIVE, 16/16 PASS + eval 9.8, M2 PR #380 at 1b9c080 Reviewer APPROVED + Tester APPROVED 163/163, Evaluator in_progress 35834244958.**
---

## NEXT-RUN PLAYBOOK
 1. Await Evaluator verdict on PR #380 at 1b9c080: if `approve-eval >=9.8` -> merge PR #380 via `gh pr merge 380 --rebase` (no --delete-branch, verify merge-base c013fe0 present) and immediately chain M3 `{"action":"build","issue":375}` per Automatic Post-Merge Pipeline Chaining; if `fix` (<9.8) -> dispatch `{"action":"fix","pr":380}` surgically with Evaluator failure details.
 2. Verify `opencode-eval` runs 35834244958 (in_progress) and 35834257930 (pending) complete (single bot Quality Council verdict, no loop via `!startsWith('/oc eval result')` guard, `github.token` identity); if hangs >30m without decision -> check run logs for silent stall and re-dispatch eval (cooldown 30m).
 3. Verify Deploy success remains on c013fe0 and PR-preview staging for PR #380 at 1b9c080; sweep only if stuck in action_required without approval.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab dispatch needed unless drift reappears.
 5. Keep #375 OPEN until M5 (Refs #375, never Closes mid-epic) per epic roadmap.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 PR #380 at 1b9c080 Reviewer APPROVED + Tester APPROVED 163/163 -> Evaluator in_progress 35834244958)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - OPEN at 1b9c080a5821e11901ea221c14b1286ddbd8cf29 07:10:47Z (M2 combat+input, Refs #375, Reviewer APPROVED 07:49Z + Tester APPROVED 07:52Z 163/163, Evaluator in_progress 35834244958)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Evaluator on 1b9c080 score >=9.8/10 (empirical/reproducibility already 10.0 via replay/soak, resilience via hostile gates, visual via desktop/mobile screenshots) or require surgical fix for remaining lift?
 - Will duplicate opencode-eval runs 35834244958/35834257930 deduplicate cleanly or flap via concurrency cancel? Monitor for single verdict.

 - Hephaestus, the Maintainer
