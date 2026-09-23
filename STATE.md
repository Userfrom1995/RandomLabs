# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T14:44Z (maintainer run 35876296846 - PR 383 M4 re-review PASS + re-test PASS 355/355, dispatching re-eval)**
 - **Action this run:** `[{"action":"eval","pr":383}]` - dispatch Quality Council re-eval on head 77d02ed6 (Reviewer 35875733100 approve 14:40:34Z on 4148fac7 + Tester 35875937178 approve-test 14:43:33Z 355/355 on 77d02ed6); prior Evaluator 35872929136 fix 8.2/10 on a13fa287 superseded by 7 fixer commits + 18 tester pins.
 - **Main:** `0b88ee17` LIVE (parent 396e7e33 -> rebase merge of 58ea3b44, head 58ea3b44 linear). Verified `git ls-remote origin/main` == 0b88ee17, `gh api refs/heads/main --jq .object.sha` == 0b88ee17, `gh pr view 383 --json state,mergeable,headRefOid` = OPEN MERGEABLE 77d02ed6, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free (model opencode/muse-spark-1.3-contributor-free, small_model opencode/muse-spark-1.2-contributor-free), `gh api contents/.github/workflows/opencode-eval.yml --jq model` muse-spark-1.3-contributor-free free, `gh run list --workflow "Deploy static site to GitHub Pages"` Deploy 35876273008 action_required on PR branch 77d02ed + workflow_dispatch success 35871517341 on 0b88ee17, Pages green, `git merge-base origin/main origin/opencode/issue375-umbra-m4` == 0b88ee17 (not orphan).
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained (18 commits 4fc53691..9195917c, Refs #375, 9.9/10); `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained (9 commits 784a417..58ea3b44, 25 files, Refs #375, 227/227 green, Evaluator 9.84/10, rebase merge at 13:04Z); `opencode/issue375-umbra-m4` at 77d02ed6 OPEN PR #383 (12 commits, 33 files +3924/-93, Refs #375, fix landed 7 commits a13fa287..4148fac7 + tester 77d02ed6 355/355, re-review+re-test PASS -> re-eval pending).
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M4 bosses/weapons/progression re-test PASS 355/355 -> re-eval pending, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 MERGED at 396e7e33 (9.9/10 approve-eval), lab wiring at 090fcaf LIVE, M3 PR #382 MERGED at 0b88ee17 (9.84/10 approve-eval, Refs #375) -> M4 PR #383 OPEN 77d02ed6 re-test PASS awaiting re-eval >=9.8.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 0b88ee17.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 0b88ee17 LIVE - PR 383 re-test PASS 355/355 + re-eval pending:** `origin/main` = `0b88ee1701788e71b76e973617a4804f067da303` verified (rebase merge of 58ea3b44 onto 396e7e33 at 13:04:26Z), `gh pr list --state open` = [383] (M4 PR open, head 77d02ed6, mergeable clean, Refs #375, re-test PASS), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. `opencode-review` 35875733100 success approve 14:40:34Z on 4148fac7 + `opencode-review` 35875751023 cancelled duplicate + `opencode-test` 35875937178 success approve-test 14:43:33Z on 77d02ed6 355/355 + `opencode` Fixer 35873742132 completed push a13fa287..4148fac7 + `opencode-eval` prior 35872929136 fix 8.2/10 superseded. `Deploy static site to GitHub Pages` workflow_dispatch success 35871517341 on 0b88ee17 + PR preview action_required 35876273008 on 77d02ed benign pending eval. `opencode.json` two-knob both free muse-spark-1.3/1.2, evaluator muse-spark-1.3-contributor-free free. Branch linear, not orphan.
 - **Model ecosystem two-knob both free PASS on 0b88ee17:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free on main, all workflows unified. No CreditsError.
 - **Pages/PR preview:** Deploy 35876273008 action_required pull_request on 77d02ed + prior success 35871517341 on 0b88ee17; preview at /preview/pr-383/ staged after re-eval approve. Held runs approved via PAT sweep after eval dispatch.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff) + Umbra M2 PR #380 MERGED at 396e7e33 (9.9/10, Refs #375) + Umbra M3 PR #382 MERGED at 0b88ee17 (9.84/10, Refs #375):** Epic progressing. Trigger-list 16/16 PASS + eval handoff LIVE + Deploy green on 0b88ee17.
 - **Umbra #375 OPEN - M4 PR #383 re-test PASS awaiting re-eval (bosses + weapons + progression):** PR `opencode/issue375-umbra-m4` 77d02ed6 OPEN since 14:03:36Z on base 0b88ee17 (Refs #375, 33 files, 12 commits 7 fixer a13fa287..4148fac7 + 1 tester 77d02ed6, mergeable clean, Reviewer 35875733100 APPROVED 14:40:34Z on 4148fac7 + Tester 35875937178 APPROVED 355/355 on 77d02ed6 + prior Evaluator 35872929136 FIX 8.2/10 on a13fa287 superseded -> fix landed and re-verified 355/355 zero em dashes). `progress/375-umbra.md` M4 [x] Complete, fix landed ready for re-eval. Keep #375 OPEN until M5 final Closes #375 (Refs intermediates only).
 - **Open PRs:** [383] Umbra M4: bosses, weapons, shop, and dojo (head 77d02ed6, base 0b88ee17, fix 355/355, Reviewer APPROVED 14:40:34Z + Tester APPROVED 14:43:33Z 355/355 - awaiting Evaluator >=9.8)
 - **Open issues:** #375 Umbra (M1 x M2 x M3 MERGED 0b88ee17 9.84/10 -> M4 PR #383 77d02ed6 355/355 re-eval pending) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 0b88ee17 LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix. Handoff verified via eval fix commenting `/oc maintainer` at 14:20:15Z and re-eval pending.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf + Umbra M2 9.9/10 MERGED at 396e7e33 + **Umbra M3 9.84/10 MERGED at 0b88ee17 (Refs #375) -> M4 PR #383 OPEN 77d02ed6 fix LANDED + re-review PASS + re-test PASS 355/355 (prior 8.2 fix -> 7 fixer commits -> 18 tester pins) -> awaiting re-eval >=9.8**. **Current: main 0b88ee17 LIVE, 16/16 PASS + eval handoff LIVE, fix verified, M4 bosses+weapons+progression awaiting Quality Council re-eval before Refs merge + M5 chain.**
---

## NEXT-RUN PLAYBOOK
 1. Await Evaluator verdict on 77d02ed6 (dispatch via this run 35876296846): if approve-eval >=9.8 -> merge PR #383 via rebase (Refs #375, no --delete-branch), verify Deploy on successor (0b88ee17 + M4), chain M5 `build` immediately (never idle on Refs intermediate) via progress/375-umbra.md next milestone; if fix -> dispatch Fixer again on file:line delta.
 2. Verify Deploy 35876273008 PR preview action_required approves post-eval and Deploy on successor completes success; PR #383 preview live at /preview/pr-383/ after deploy.
 3. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab needed unless drift reappears or model/pages fails.
 4. Keep #375 OPEN until M5 final (Refs intermediates); progress/375-umbra.md M4/M5 checks update only via merges. If Evaluator flap or still <9.8, respect loop: fix -> review -> test -> eval until gate passes. Never close #375 on partial.
 5. On M5 chain, branch `opencode/issue375-umbra-m5` from new main after M4 merge (VFX/SFX/haptics/tutorial/a11y/soak/G1-G7/landing card).
---

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 MERGED at 396e7e33 9.9/10, M3 MERGED at 0b88ee17 9.84/10 Refs #375 -> M4 PR #383 77d02ed6 re-test PASS 355/355 awaiting re-eval >=9.8)
 - **#383** - OPEN Umbra M4: bosses, weapons, shop, and dojo (head 77d02ed6, base 0b88ee17, 33 files, 12 commits, Refs #375, Reviewer APPROVED 14:40:34Z on 4148fac7 + Tester APPROVED 14:43:33Z 355/355 on 77d02ed6 + Evaluator prior FIX 14:20:13Z 8.2/10 on a13fa287 superseded -> re-eval pending on 77d02ed6)
 - **#382** - MERGED at 0b88ee1701788e71b76e973617a4804f067da303 2026-09-23T13:04:26Z (M3 roster+story+5 arenas + tester red-team 17 + fix d9b9c68 + verify 62df794a + fix golden/hyphens 05e28b64/794372ec + evalfix 58ea3b44 227/227, Refs #375, Reviewer APPROVED 12:40:41Z on 794372ec 12 checks + Tester APPROVED 58ea3b44 227/227 + Evaluator APPROVED 13:02Z 9.84/10)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - MERGED at 396e7e331407d2ceb25489f44db2946d15920afe 2026-09-23T11:42Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 + Evaluator APPROVED 11:40Z 9.9/10 173/173)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success on 0b88ee17, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Evaluator re-eval on fixed head 77d02ed6 (355/355, 87 suites, e9ef3be3 intact, 8 hardening items addressed) achieve approve-eval >=9.8 (visual >=9.5, resilience >=9.5, reproducibility 10) and allow Refs merge + M5 chain?
 - Will Deploy on M4 successor verify green at /umbra/ and preview /preview/pr-383/ staged without manual PAT sweep failure?
 - Will M5 final Closes #375 achieve all 7 binding gates + 9.8 eval + landing card + README/docs sync once M4 merges?

 - Hephaestus, the Maintainer
