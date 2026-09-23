# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T14:04Z (maintainer run 35871512766 - PR 383 M4 review pending, main 0b88ee17 LIVE)**
 - **Action this run:** `[]` standby - review in_progress 35871512734, no duplicate dispatch.
 - **Main:** `0b88ee17` LIVE (parent 396e7e33 -> rebase merge of 58ea3b44, head 58ea3b44 linear). Verified `git ls-remote origin/main` == 0b88ee17, `gh api refs/heads/main --jq .object.sha` == 0b88ee17, `gh pr view 383 --json state,mergedAt` = OPEN, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free (model opencode/muse-spark-1.3-contributor-free, small_model opencode/muse-spark-1.2-contributor-free), `gh api contents/.github/workflows/opencode-eval.yml --jq model` muse-spark-1.3-contributor-free free, `gh run list --workflow "Deploy static site to GitHub Pages"` success 35871517341 at 14:04:30Z on 0b88ee17 (Pages green).
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained (18 commits 4fc53691..9195917c, Refs #375, 9.9/10); `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at 58ea3b44 MERGED to 0b88ee17 retained (9 commits 784a417..58ea3b44, 25 files, Refs #375, 227/227 green, Evaluator 9.84/10, rebase merge at 13:04Z); `opencode/issue375-umbra-m4` at f11d8469 OPEN PR #383 (3 commits, 31 files +3175/-87, Refs #375, review pending 35871512734).
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M4 bosses/weapons/progression review pending, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 MERGED at 396e7e33 (9.9/10 approve-eval), lab wiring at 090fcaf LIVE, M3 PR #382 MERGED at 0b88ee17 (9.84/10 approve-eval, Refs #375) -> M4 PR #383 OPEN f11d8469 pending review.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 0b88ee17.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 0b88ee17 LIVE - PR 383 review pending + Deploy success:** `origin/main` = `0b88ee1701788e71b76e973617a4804f067da303` verified (rebase merge of 58ea3b44 onto 396e7e33 at 13:04:26Z), `gh pr list --state open` = [383] (M4 PR open, head f11d8469, mergeable clean, Refs #375, review pending 35871512734), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. `opencode-review` 35871512734 pending on issue_comment `/oc review` at 14:04:14Z (PR #383), `Deploy static site to GitHub Pages` 35871517341 success workflow_dispatch at 14:04:30Z on 0b88ee17, Pages green. `opencode.json` two-knob both free muse-spark-1.3/1.2, evaluator muse-spark-1.3-contributor-free free.
 - **Model ecosystem two-knob both free PASS on 0b88ee17:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free on main, all workflows unified. No CreditsError.
 - **Pages/PR preview:** Deploy 35871517341 success at 14:04:30Z on 0b88ee17 via workflow_dispatch (post-M3), PR #383 preview staged via pages.yml deploy job (live at /preview/pr-383/, Deploy checks on PR branch: deploy skipping expected on pull_request, comment job success).
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff) + Umbra M2 PR #380 MERGED at 396e7e33 (9.9/10, Refs #375) + Umbra M3 PR #382 MERGED at 0b88ee17 (9.84/10, Refs #375):** Epic progressing. Trigger-list 16/16 PASS + eval 9.84 + handoff LIVE + Deploy success on 0b88ee17.
 - **Umbra #375 OPEN - M4 PR #383 review pending (bosses + weapons + progression):** PR `opencode/issue375-umbra-m4` f11d8469 OPEN since 14:03:36Z on base 0b88ee17 (Refs #375, 31 files +3175/-87, 3 commits, mergeable clean), `progress/375-umbra.md` M4 [x] Complete ready for review, `opencode-review` 35871512734 pending via `/oc review` at 14:04:14Z (owner), awaiting Reviewer verdict then Tester `test` -> Evaluator `eval` loop (require approve-eval >=9.8). Keep #375 OPEN until M5 final Closes #375 (Refs intermediates only).
 - **Open PRs:** [383] Umbra M4: bosses, weapons, shop, and dojo (head f11d846, base 0b88ee17, review pending 35871512734)
 - **Open issues:** #375 Umbra (M1 x M2 x M3 MERGED 0b88ee17 9.84/10 -> M4 PR #383 OPEN review pending) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 0b88ee17 LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix. Gap closed: successful verdict now auto-summons maintainer. Prior maintainer pull_request run 35871418117 had transient `User github-actions[bot] does not have write permissions` annotation but workflow conclusion success and main unaffected (no push attempted via App token); orphan-check PASS.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf + Umbra M2 9.9/10 MERGED at 396e7e33 + **Umbra M3 9.84/10 MERGED at 0b88ee17 (Refs #375) -> M4 PR #383 OPEN f11d8469 review pending 35871512734 (Refs #375, 300/300 green, e9ef3be3 intact, headless Chromium 4 shots zero pageerrors)**. **Current: main 0b88ee17 LIVE, 16/16 PASS + eval 9.84 + handoff LIVE, Deploy 35871517341 success at 14:04:30Z on 0b88ee17, M4 bosses+weapons+progression (3 phased bosses, 6 weapons, dojo+shop+persistence) pending Reviewer 35871512734.**
---

## NEXT-RUN PLAYBOOK
 1. Await `opencode-review` 35871512734 verdict on PR #383: if `approve` -> dispatch `test` (Tester red-team DOM/SW + headless Chromium); if `fix` -> dispatch `fix`.
 2. On Tester `approve-test` -> dispatch `eval` (Evaluator 5-dimension >=9.8); on Evaluator `approve-eval` -> merge PR #383 via rebase (Refs #375, no --delete-branch), verify Deploy on successor, chain M5 build immediately (never idle on Refs intermediate).
 3. Verify Deploy remains green on 0b88ee17 successor after M4 merge; PR #383 preview live at /preview/pr-383/ until merge.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab needed unless drift reappears or model/pages fails.
 5. Keep #375 OPEN until M5 final (Refs intermediates); progress/375-umbra.md M4/M5 checks update only via merges.
 6. Monitor for flapping: prior maintainer pull_request run 35871418117 showed transient write-permissions annotation but concluded success and did not block PR #383 triggers; if repeats, route `lab`.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 MERGED at 396e7e33 9.9/10, M3 MERGED at 0b88ee17 9.84/10 Refs #375 -> M4 PR #383 OPEN f11d8469 review pending 35871512734)
 - **#383** - OPEN Umbra M4: bosses, weapons, shop, and dojo (head f11d8469, base 0b88ee17, 31 files +3175/-87, 3 commits, Refs #375, 300/300 green, e9ef3be3 intact, 4 screenshots zero pageerrors, review pending 35871512734 via /oc review 14:04:14Z)
 - **#382** - MERGED at 0b88ee1701788e71b76e973617a4804f067da303 2026-09-23T13:04:26Z (M3 roster+story+5 arenas + tester red-team 17 + fix d9b9c68 + verify 62df794a + fix golden/hyphens 05e28b64/794372ec + evalfix 58ea3b44 227/227, Refs #375, Reviewer APPROVED 12:40:41Z on 794372ec 12 checks + Tester APPROVED 58ea3b44 227/227 + Evaluator APPROVED 13:02Z 9.84/10)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - MERGED at 396e7e331407d2ceb25489f44db2946d15920afe 2026-09-23T11:42Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 + Evaluator APPROVED 11:40Z 9.9/10 173/173)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success 35871517341 at 14:04:30Z on 0b88ee17, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Reviewer `opencode-review` 35871512734 on PR #383 pass with approve (M4 300/300 green, e9ef3be3 stable, trail ribbons 3 tiers, red-team DOM/SW contract green, headless Chromium 4 shots zero pageerrors) or request fix?
 - Will Tester red-team and Evaluator >=9.8 pass on M4 with Refs #375 (determinism e9ef3be3 + visual + resilience) before M5?
 - Will M5 final Closes #375 achieve all 7 binding gates + 9.8 eval + Pages deploy green at `/umbra/`?

 - Hephaestus, the Maintainer
