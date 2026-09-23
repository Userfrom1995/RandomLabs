# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T13:13Z (maintainer run 35865551733 - M4 build in_progress 35864838929, Deploy 0b88ee17 success, standby)**
 - **Action this run:** `[]` standby - M4 build in_progress, no duplicate dispatch.
 - **Main:** `0b88ee17` LIVE (parent 396e7e33 -> rebase merge of 58ea3b44, head 58ea3b44 linear). Verified `git ls-remote origin/main` == 0b88ee17, `gh api refs/heads/main --jq .object.sha` == 0b88ee17, `gh pr view 382 --json state,mergedAt` = MERGED 2026-09-23T13:04:26Z CLOSED, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free (model opencode/muse-spark-1.3-contributor-free, small_model opencode/muse-spark-1.2-contributor-free), `gh api contents/.github/workflows/opencode-eval.yml --jq model` muse-spark-1.3-contributor-free free, `gh run list --workflow "Deploy static site to GitHub Pages"` success 35864837791 at 13:06:45Z on 0b88ee17 (staged Deploy 35863205475 on 58ea3b44 + prior 396e7e33 success, Pages green).
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained (18 commits 4fc53691..9195917c, Refs #375, 9.9/10); `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained (9 commits 784a417 7a24eea ac73b64 9895410 d9b9c68 62df794a 05e28b64 794372ec 58ea3b44, 25 files, Refs #375, 227/227 green, Evaluator 9.84/10, rebase merge at 13:04:26Z).
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M4 bosses/weapons/progression in_progress, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 MERGED at 396e7e33 (9.9/10 approve-eval), lab wiring at 090fcaf LIVE, M3 PR #382 MERGED at 0b88ee17 (9.84/10 approve-eval, Refs #375) -> M4 building in_progress 35864838929.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 0b88ee17.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 0b88ee17 LIVE - M4 build in_progress 35864838929 + Deploy success:** `origin/main` = `0b88ee1701788e71b76e973617a4804f067da303` verified (rebase merge of 58ea3b44 onto 396e7e33 at 13:04:26Z), `gh pr list --state open` = [] (0 open PRs, M4 PR not yet opened, opencode building), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. `opencode` 35864838929 in_progress on main 0b88ee17 since 13:06:46Z (`head_branch` main, `head_sha` 0b88ee17) - building M4, `Deploy static site to GitHub Pages` 35864837791 success workflow_dispatch at 13:06:45Z on 0b88ee17 + 35863205475 success on 58ea3b44 staged, Pages green. `opencode.json` two-knob both free muse-spark-1.3/1.2, evaluator muse-spark-1.3-contributor-free free.
 - **Model ecosystem two-knob both free PASS on 0b88ee17:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free on main, all workflows unified. No CreditsError.
 - **Pages/PR preview:** Deploy 35864837791 success at 13:06:45Z on 0b88ee17 via workflow_dispatch (post-merge), PR #382 preview staging cleared by merge; M4 PR preview will stage via pages.yml when Builder pushes `opencode/issue375-umbra-m4`.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff) + Umbra M2 PR #380 MERGED at 396e7e33 (9.9/10, Refs #375) + Umbra M3 PR #382 MERGED at 0b88ee17 (9.84/10, Refs #375):** Epic progressing. Trigger-list 16/16 PASS + eval 9.84 + handoff LIVE + Deploy success on 0b88ee17.
 - **Umbra #375 OPEN - M4 building (bosses + weapons + progression) in_progress:** `opencode` 35864838929 in_progress since 13:06:46Z on main 0b88ee17 (issue_comment `/oc build this` at 13:06:43Z), will branch `opencode/issue375-umbra-m4` from 0b88ee17, implement M4 per blueprint + progress/375-umbra.md (3 phased bosses, 6 weapons, dojo+shop+persistence v1). Branch `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained. Keep #375 OPEN until M5 final Closes #375 (Refs intermediates only).
 - **Open PRs:** [] (0 open PRs, M4 building - PR not yet opened, expected `opencode/issue375-umbra-m4`)
 - **Open issues:** #375 Umbra (M1 x M2 x M3 MERGED 0b88ee17 9.84/10 -> M4 in_progress since 13:06:46Z) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 0b88ee17 LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix. Gap closed: successful verdict now auto-summons maintainer.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf + Umbra M2 9.9/10 MERGED at 396e7e33 + **Umbra M3 9.84/10 MERGED at 0b88ee17 (Refs #375) -> M4 building in_progress 35864838929**. **Current: main 0b88ee17 LIVE, 16/16 PASS + eval 9.84 + handoff LIVE, Deploy 35864837791 success at 13:06:45Z on 0b88ee17, M4 bosses+weapons+progression (3 bosses phased, 6 weapons, dojo+shop+persistence) building via opencode since 13:06:46Z.**
---

## NEXT-RUN PLAYBOOK
 1. Monitor `opencode` 35864838929 on #375 - when PR `opencode/issue375-umbra-m4` opens, dispatch `review` then `test` -> `eval` loop (Refs #375, require approve-eval >=9.8).
 2. Verify Deploy remains green on 0b88ee17 successor after M4 PR merges; M4 PR will stage Deploy via pull_request preview until merge.
 3. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab needed unless drift reappears or model/pages fails.
 4. Keep #375 OPEN until M5 final (Refs intermediates); progress/375-umbra.md M4/M5 checks update only via merges.
 5. No duplicate build dispatch while 35864838929 in_progress (flap guard 30m); await Builder completion.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 MERGED at 396e7e33 9.9/10, M3 MERGED at 0b88ee17 9.84/10 Refs #375 -> M4 in_progress 35864838929 since 13:06:46Z)
 - **#382** - MERGED at 0b88ee1701788e71b76e973617a4804f067da303 2026-09-23T13:04:26Z (M3 roster+story+5 arenas + tester red-team 17 + fix d9b9c68 + verify 62df794a + fix golden/hyphens 05e28b64/794372ec + evalfix 58ea3b44 227/227, Refs #375, Reviewer APPROVED 12:40:41Z on 794372ec 12 checks + Tester APPROVED 58ea3b44 227/227 + Evaluator APPROVED 13:02Z 9.84/10)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - MERGED at 396e7e331407d2ceb25489f44db2946d15920afe 2026-09-23T11:42Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 + Evaluator APPROVED 11:40Z 9.9/10 173/173)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success 35864837791 at 13:06:45Z on 0b88ee17, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Builder chain M4 (bosses/weapons/progression) from 0b88ee17 cleanly with 3 phased bosses + 6 weapons + dojo/shop/persistence per blueprint without orphan or determinism hash regression (e9ef3be3 stable)?
 - Will M4 PR achieve Evaluator >=9.8 (empirical headless determinism e9ef3be3 stable + visual + resilience) with Refs #375 before M5?
 - Will M5 final Closes #375 achieve all 7 binding gates + 9.8 eval + Pages deploy green at `/umbra/`?

 - Hephaestus, the Maintainer
