# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T14:39Z (maintainer run 35875750980 - PR 383 M4 fix pushed 4148fac7 337/337, re-review in_progress)**
 - **Action this run:** `[]` - standby while Reviewer re-reviews fixed head 4148fac7 (7 fixer commits a13fa287..4148fac7, 337/337 green, zero em dashes). Reviewer run 35875733100 in_progress + duplicate 35875751023 pending on new head; no duplicate review dispatch.
 - **Main:** `0b88ee17` LIVE (parent 396e7e33 -> rebase merge of 58ea3b44, head 58ea3b44 linear). Verified `git ls-remote origin/main` == 0b88ee17, `gh api refs/heads/main --jq .object.sha` == 0b88ee17, `gh pr view 383 --json state,mergeable,headRefOid` = OPEN MERGEABLE 4148fac7, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free (model opencode/muse-spark-1.3-contributor-free, small_model opencode/muse-spark-1.2-contributor-free), `gh api contents/.github/workflows/opencode-eval.yml --jq model` muse-spark-1.3-contributor-free free, `gh run list --workflow "Deploy static site to GitHub Pages"` Deploy 35875752150 in_progress on 0b88ee17 (prior 35871517341 success on 0b88ee17), Pages green, `git merge-base origin/main origin/opencode/issue375-umbra-m4` == 0b88ee17 (not orphan), `gh api repos/.../actions/runs` opencode-review 35875733100 in_progress + 35875751023 pending on 4148fac7.
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained (18 commits 4fc53691..9195917c, Refs #375, 9.9/10); `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained (9 commits 784a417..58ea3b44, 25 files, Refs #375, 227/227 green, Evaluator 9.84/10, rebase merge at 13:04Z); `opencode/issue375-umbra-m4` at 4148fac7 OPEN PR #383 (11 commits, 32 files +bulked, Refs #375, fix landed 7 commits a13fa287..4148fac7, 337/337 green, awaiting re-review 35875733100).
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M4 bosses/weapons/progression fix landed awaiting re-review, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 MERGED at 396e7e33 (9.9/10 approve-eval), lab wiring at 090fcaf LIVE, M3 PR #382 MERGED at 0b88ee17 (9.84/10 approve-eval, Refs #375) -> M4 PR #383 OPEN 4148fac7 fix 337/337 awaiting re-review/test/re-eval >=9.8.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 0b88ee17.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 0b88ee17 LIVE - PR 383 fix landed + Deploy in_progress:** `origin/main` = `0b88ee1701788e71b76e973617a4804f067da303` verified (rebase merge of 58ea3b44 onto 396e7e33 at 13:04:26Z), `gh pr list --state open` = [383] (M4 PR open, head 4148fac7, mergeable clean, Refs #375, fix landed 7 commits, Reviewer in_progress), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. `opencode-review` 35875733100 in_progress (issue_comment 14:39:01Z on 4148fac7 via Owner /oc review 14:38:58Z) + `opencode-review` 35875751023 pending (duplicate), `opencode` Fixer 35873742132 completed with push a13fa287..4148fac7 (7 fixer commits, 337/337, reported 14:38:56Z), `opencode-eval` prior 35872929136 success fix 8.2/10 at 14:20:13Z (now superseded by fix), `Deploy static site to GitHub Pages` 35875752150 in_progress workflow_dispatch at 14:39:10Z on 0b88ee17 (prior 35871517341 success), Pages green pending new deploy. `opencode.json` two-knob both free muse-spark-1.3/1.2, evaluator muse-spark-1.3-contributor-free free. Fix landed on 4148fac7 - awaiting re-review/test/eval.
 - **Model ecosystem two-knob both free PASS on 0b88ee17:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free on main, all workflows unified. No CreditsError.
 - **Pages/PR preview:** Deploy 35875752150 in_progress on 0b88ee17 (post-fix push), prior Deploy 35871517341 success on 0b88ee17; PR #383 preview still staged via pages.yml (Deploy checks on PR branch: action_required holds benign, will approve via PAT sweep; preview live at /preview/pr-383/ after deploy success).
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff) + Umbra M2 PR #380 MERGED at 396e7e33 (9.9/10, Refs #375) + Umbra M3 PR #382 MERGED at 0b88ee17 (9.84/10, Refs #375):** Epic progressing. Trigger-list 16/16 PASS + eval handoff LIVE + Deploy in_progress on 0b88ee17.
 - **Umbra #375 OPEN - M4 PR #383 fix landed awaiting re-review (bosses + weapons + progression):** PR `opencode/issue375-umbra-m4` 4148fac7 OPEN since 14:03:36Z on base 0b88ee17 (Refs #375, 32 files, 11 commits 7 fixer a13fa287..4148fac7, mergeable clean, Reviewer in_progress 35875733100 on 4148fac7, prior Reviewer 35871490725 APPROVED on a13fa287 + Tester 35872108503 APPROVED 332/332 on a13fa287 + Evaluator 35872929136 FIX 8.2/10 on a13fa287 superseded -> fix landed 337/337 zero em dashes). `progress/375-umbra.md` M4 [x] Complete, fix landed ready for re-review/test/re-eval. Keep #375 OPEN until M5 final Closes #375 (Refs intermediates only).
 - **Open PRs:** [383] Umbra M4: bosses, weapons, shop, and dojo (head 4148fac7, base 0b88ee17, fix landed 337/337, Reviewer 35875733100 in_progress - awaiting approve/fix before Tester/Evaluator)
 - **Open issues:** #375 Umbra (M1 x M2 x M3 MERGED 0b88ee17 9.84/10 -> M4 PR #383 fix 4148fac7 337/337 re-review in_progress) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 0b88ee17 LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix. Handoff verified via eval fix commenting `/oc maintainer` at 14:20:15Z.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf + Umbra M2 9.9/10 MERGED at 396e7e33 + **Umbra M3 9.84/10 MERGED at 0b88ee17 (Refs #375) -> M4 PR #383 OPEN 4148fac7 fix LANDED 337/337 awaiting re-review (prior approve on a13fa287 332/332 -> eval FIX 8.2/10 -> 7 fixer commits to 4148fac7)**. **Current: main 0b88ee17 LIVE, 16/16 PASS + eval handoff LIVE, Deploy 35875752150 in_progress on 0b88ee17, M4 bosses+weapons+progression fix in re-review before re-test/re-eval >=9.8.**
---

## NEXT-RUN PLAYBOOK
 1. Await Reviewer verdict on 4148fac7 (run 35875733100 in_progress, duplicate 35875751023 pending): if approve -> dispatch Tester hostile re-run (332+ -> 337+ suite, verify e9ef3be3 intact) -> Evaluator re-eval for >=9.8; if fix -> dispatch Fixer again. No duplicate review dispatch while runs in_progress.
 2. On approve-eval >=9.8 -> merge PR #383 via rebase (Refs #375, no --delete-branch), verify Deploy on successor (0b88ee17 + M4), chain M5 `build` immediately (never idle on Refs intermediate) via progress/375-umbra.md next milestone.
 3. Verify Deploy 35875752150 completes success on 0b88ee17; PR #383 preview live at /preview/pr-383/ after deploy. Held `action_required` runs on PR branch are benign preview holds, approved via PAT sweep after reviewer.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab needed unless drift reappears or model/pages fails.
 5. Keep #375 OPEN until M5 final (Refs intermediates); progress/375-umbra.md M4/M5 checks update only via merges. If Reviewer/T Tester/Evaluator flap, respect 30m cooldown and concurrency cancel-in-progress:false queuing.
---

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 MERGED at 396e7e33 9.9/10, M3 MERGED at 0b88ee17 9.84/10 Refs #375 -> M4 PR #383 4148fac7 fix landed 337/337 awaiting re-review 35875733100)
 - **#383** - OPEN Umbra M4: bosses, weapons, shop, and dojo (head 4148fac7, base 0b88ee17, 32 files, 11 commits, Refs #375, prior Reviewer APPROVED 14:09:17Z on a13fa287 + Tester APPROVED 14:13:31Z 332/332 on a13fa287 + Evaluator FIX 14:20:13Z 8.2/10 on a13fa287 -> fix 7 commits to 4148fac7 337/337 -> Reviewer in_progress 35875733100 on 4148fac7)
 - **#382** - MERGED at 0b88ee1701788e71b76e973617a4804f067da303 2026-09-23T13:04:26Z (M3 roster+story+5 arenas + tester red-team 17 + fix d9b9c68 + verify 62df794a + fix golden/hyphens 05e28b64/794372ec + evalfix 58ea3b44 227/227, Refs #375, Reviewer APPROVED 12:40:41Z on 794372ec 12 checks + Tester APPROVED 58ea3b44 227/227 + Evaluator APPROVED 13:02Z 9.84/10)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - MERGED at 396e7e331407d2ceb25489f44db2946d15920afe 2026-09-23T11:42Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 + Evaluator APPROVED 11:40Z 9.9/10 173/173)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy 35875752150 in_progress at 14:39:10Z on 0b88ee17, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Reviewer 35875733100 approve 4148fac7 (8 hardening items: overflow-x wrapper, HUD/footer clean, buyWeapon canonical cost, fists copy/freeze, awardFor/bundle caps, bossPhaseIndex guard, frameRows Infinity) and allow Tester->Evaluator chain?
 - Will re-Test 337/337 hostile suite stay green after resilience caps without breaking replay determinism (e9ef3be3 intact)?
 - Will re-Eval achieve approve-eval >=9.8 (visual >=9.5, reproducibility 10) on fixed head and allow merge + M5 chain (VFX/SFX/haptics/onboarding/a11y/soak/G1-G7 MEASURED + landing card)?

 - Hephaestus, the Maintainer
