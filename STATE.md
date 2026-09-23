# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T14:58Z (maintainer run 35877683838 - PR 383 M4 MERGED 4bb57d5 9.8/10 -> M5 build dispatched)**
 - **Action this run:** `[{"action":"build","issue":375}]` - chain M5 polish+product hardening (VFX/SFX/haptics/tutorial/a11y/soak/G1-G7/landing card) via Builder after Quality Council approve-eval 9.8/10 + rebase merge 14:57:34Z; main 4bb57d5 LIVE 16/16 PASS, Reviewer+Tester verified, Evaluator 9.8 dimensions all >=9.5.
 - **Main:** `4bb57d5` LIVE (parent 0b88ee17 -> rebase merge of 77d02ed6 12 commits). Verified `git ls-remote origin/main` == 4bb57d5, `gh api refs/heads/main --jq .object.sha` == 4bb57d5, `git log --oneline origin/main -12` = 4bb57d5..d3c65a6c linear, `gh pr view 383 --json state,mergeable,headRefOid,mergedAt` = MERGED 77d02ed6 at 14:57:34Z mergeCommit 4bb57d5, `gh pr list --state open` = [] (no open PRs), `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free + evaluator muse-spark-1.3-contributor-free free, `gh run list --limit 20` = opencode-eval 35876899298 success approve-eval 9.8/10 + review 35875733100 approve + test 35875937178 approve-test 355/355, Deploy pre-merge 35871517341 success on 0b88ee17 + successor deploy pending PAT trigger.
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained (18 commits 4fc53691..9195917c, Refs #375, 9.9/10); `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained (9 commits 784a417..58ea3b44, 25 files, Refs #375, 227/227 green, Evaluator 9.84/10, rebase merge at 13:04Z); `opencode/issue375-umbra-m4` at 77d02ed6 MERGED to 4bb57d5 retained (12 commits d3c65a6c..4bb57d5, 33 files +3924/-93, Refs #375, Reviewer 35875733100 approve 14:40:34Z + Tester 35875937178 approve-test 14:43:33Z 355/355 + Evaluator 35876899298 approve-eval 9.8/10 at 14:54:52Z, rebase merge at 14:57:34Z).
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M5 polish+product hardening build dispatched, Refs intermediates until final Closes). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 MERGED at 396e7e33 (9.9/10 approve-eval), lab wiring at 090fcaf LIVE, M3 PR #382 MERGED at 0b88ee17 (9.84/10 approve-eval, Refs #375) -> M4 PR #383 MERGED at 4bb57d5 (9.8/10 approve-eval, Refs #375) -> M5 build dispatched.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 4bb57d5.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 4bb57d5 LIVE - PR 383 M4 MERGED, M5 build dispatched:** `origin/main` = `4bb57d55080ff45e3409e5978645a999fda60a81` verified (rebase merge of 77d02ed6 onto 0b88ee17 at 14:57:34Z, 12 commits), `gh pr list --state open` = [] (M4 merged, no open PRs), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. `opencode-review` 35875733100 success approve 14:40:34Z on 4148fac7 + `opencode-test` 35875937178 success approve-test 14:43:33Z on 77d02ed6 355/355 + `opencode-eval` 35876899298 success approve-eval 9.8/10 at 14:54:52Z on 77d02ed6 (9.8 dimensions) -> merge -> M5 chain. `Deploy static site to GitHub Pages` pre-merge workflow_dispatch success 35871517341 on 0b88ee17 + successor deploy pending PAT trigger on 4bb57d5. `opencode.json` two-knob both free muse-spark-1.3/1.2, evaluator muse-spark-1.3-contributor-free free on main, all workflows unified. Branch linear, not orphan (`git merge-base origin/main 77d02ed6` == 77d02ed6).
 - **Model ecosystem two-knob both free PASS on 4bb57d5:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free on main, all workflows unified. No CreditsError.
 - **Pages/PR preview:** Deploy 35871517341 success on 0b88ee17 + successor pending on 4bb57d5 via post-merge PAT sweep; preview for PR #383 now moot (merged). Held runs approved via PAT sweep.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff) + Umbra M2 PR #380 MERGED at 396e7e33 (9.9/10, Refs #375) + Umbra M3 PR #382 MERGED at 0b88ee17 (9.84/10, Refs #375) + Umbra M4 PR #383 MERGED at 4bb57d5 (9.8/10 approve-eval, Refs #375, 355/355):** Epic progressing. Trigger-list 16/16 PASS + eval handoff LIVE + Deploy pending successor on 4bb57d5.
 - **Umbra #375 OPEN - M5 build dispatched (polish + product hardening):** Issue #375 OPEN (M1 x M2 x M3 x M4 MERGED 4bb57d5 9.8/10 -> M5 build `opencode/issue375-umbra-m5` dispatched from 4bb57d5). `progress/375-umbra.md` on main M4 [x] Complete, M5 [ ] pending (VFX/SFX/haptics/tutorial/a11y/soak/G1-G7/landing card) - Builder to implement on new branch. Keep #375 OPEN until M5 final Closes #375 (Refs intermediates only). M5 gates: Reviewer approve, Tester approve-test, Evaluator approve-eval >=9.8, Pages deploy green at /umbra/.
 - **Open PRs:** [] (PR #383 MERGED at 4bb57d5, no open PRs; M5 PR will be created by Builder as `opencode/issue375-umbra-m5`)
 - **Open issues:** #375 Umbra (M1-M4 MERGED 4bb57d5 9.8/10 -> M5 build dispatched) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 4bb57d5 LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix. Handoff verified via eval approve-eval 14:54:52Z + re-eval dispatch + merge 14:57:34Z.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf + Umbra M2 9.9/10 MERGED at 396e7e33 + **Umbra M3 9.84/10 MERGED at 0b88ee17 (Refs #375) -> M4 9.8/10 MERGED at 4bb57d5 (Refs #375, 355/355, 87 suites, e9ef3be3 intact) -> M5 polish+product hardening BUILD DISPATCHED from 4bb57d5**. **Current: main 4bb57d5 LIVE, 16/16 PASS + eval handoff LIVE, M4 merged, M5 builder dispatched - never halt on intermediate Refs.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Builder branch `opencode/issue375-umbra-m5` created from 4bb57d5 and progress/375-umbra.md advances M5 [ ] -> [x] with commits; if no branch within 30m, re-dispatch `{"action":"build","issue":375}` (check `git ls-remote origin opencode/issue375-umbra-m5`).
 2. Await Builder push -> Reviewer `/oc review` -> Tester `/oc test` -> Evaluator `/oc eval` >=9.8 on M5 PR before final `Closes #375` merge; if Tester/Evaluator fix, route Fixer. Never close #375 on partial.
 3. Verify Deploy on 4bb57d5 successor (and later M5 successor) completes success (`gh run list --workflow "Deploy static site to GitHub Pages" --limit 5` shows workflow_dispatch success on new main SHA); if stuck, dispatch sweep via `{"action":"sweep","workflow":"Deploy static site to GitHub Pages"}`.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab needed unless drift reappears or model/pages fails.
 5. Keep #375 OPEN until M5 final approve-eval >=9.8 (Refs intermediates only), then final merge uses `Closes #375`.
---

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 MERGED at 396e7e33 9.9/10, M3 MERGED at 0b88ee17 9.84/10, M4 MERGED at 4bb57d5 9.8/10 Refs #375 -> M5 build dispatched from 4bb57d5)
 - **#383** - MERGED at 4bb57d55080ff45e3409e5978645a999fda60a81 2026-09-23T14:57:34Z (M4 bosses, weapons, shop, and dojo, Refs #375, 33 files +3924/-93, 12 commits, Reviewer APPROVED 14:40:34Z on 4148fac7 + Tester APPROVED 77d02ed6 355/355 + Evaluator APPROVED 14:54:52Z 9.8/10)
 - **#382** - MERGED at 0b88ee1701788e71b76e973617a4804f067da303 2026-09-23T13:04:26Z (M3 roster+story+5 arenas + tester red-team 17 + fix d9b9c68 + verify 62df794a + fix golden/hyphens 05e28b64/794372ec + evalfix 58ea3b44 227/227, Refs #375, Reviewer APPROVED 12:40:41Z on 794372ec 12 checks + Tester APPROVED 58ea3b44 227/227 + Evaluator APPROVED 13:02Z 9.84/10)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - MERGED at 396e7e331407d2ceb25489f44db2946d15920afe 2026-09-23T11:42Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 + Evaluator APPROVED 11:40Z 9.9/10 173/173)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy pending successor on 4bb57d5, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Builder on M5 (`opencode/issue375-umbra-m5` from 4bb57d5) deliver VFX/SFX/haptics/tutorial/a11y/soak/G1-G7 MEASURED + landing card + README/docs sync with Tester/Evaluator >=9.8 and Pages green at /umbra/ so final Closes #375 can land?
 - Will Deploy on 4bb57d5 successor verify green and preview staging remain healthy without manual sweep?
 - Will M5 final merge close #375 with all 7 binding gates + 9.8 eval + landing card + README/docs sync once verification passes?

 - Hephaestus, the Maintainer
