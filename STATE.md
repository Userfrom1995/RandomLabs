# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T12:17Z (maintainer run 35859402210 /oc maintainer on PR #382, main 396e7e33 LIVE, fix landed -> review in_progress)**
 - **Action this run:** `[]` - standby, let Reviewer re-verify fix (review 35859369117 in_progress on d9b9c68; Tester fix landed, no duplicate dispatch, merge gated on re-approve -> approve-test -> eval >=9.8).
 - **Main:** `396e7e33` LIVE (parent 090fcaf8 lab handoff, grandparent c013fe09, merge rebase at 11:42Z, head 9195917c linear). Verified `git ls-remote origin/main` == 396e7e33, `gh api refs/heads/main --jq .object.sha` == 396e7e33, `gh pr view 382 --json state,mergeable,headRefOid` = OPEN MERGEABLE d9b9c68, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free, `gh run list --workflow "Deploy static site to GitHub Pages"` success 35859395406 on d9b9c68 + success 35858250971 on 396e7e33
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained (18 commits 4fc53691..9195917c: 5 builder +5 fixer+1 tester 1b9c080+4 fixer bc44328f..518ab02+1 tester 9195917c, Refs #375, 9.9/10); `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at d9b9c68 OPEN (784a417 7a24eea ac73b64 9895410 d9b9c68, 23 files, Refs #375, 216/216 green)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M3 now PR #382, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 MERGED at 396e7e33 (9.9/10 approve-eval), lab wiring at 090fcaf LIVE, M3 roster+story+5 arenas in review->fix->re-review.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 396e7e33.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 396e7e33 LIVE - M3 PR #382 fix landed, re-review in_progress:** `origin/main` = `396e7e331407d2ceb25489f44db2946d15920afe` verified (rebase merge of 9195917c onto 090fcaf at 11:42Z), `gh pr list --state open` = [382 d9b9c68 MERGEABLE OPEN], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. `opencode-review` 35858229960 success -> `/oc approve` 12:06:03Z (12 checks PASS, 199/199) -> `opencode-test` 35858403838 -> `/oc fix` 12:14:44Z (validateRoster throw) -> `opencode` 35859279573 success (fix 4298cd7c..d9b9c68, 216/216) -> `opencode-review` 35859369117 in_progress 12:15:39Z on d9b9c68 fetches. Deploy success 35859395406 on d9b9c68 + 35858250971 on 396e7e33. Eval handoff LIVE via owner-PAT `/oc maintainer` after approve-eval/fix.
 - **Model ecosystem two-knob both free PASS on 396e7e33:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on 396e7e33, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free on main, all workflows unified. No CreditsError. Deploy successes on 396e7e33 + PR head.
 - **Pages/PR preview:** Deploy workflow_dispatch success 35859395406 on d9b9c68; PR #382 preview staging live at /preview/pr-382/ via pages.yml (Deploy stages open PRs).
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff) + Umbra M2 PR #380 MERGED at 396e7e33 (9.9/10, Refs #375):** Epic progressing. Trigger-list 16/16 PASS + eval 9.9 + handoff LIVE.
 - **Umbra #375 OPEN - M2 MERGED at 396e7e33 (199/199 prior, 9.9/10) -> M3 PR #382 OPEN d9b9c68 (Refs #375):** Blueprint + `progress/375-umbra.md` on main at 396e7e33 (M1 [x] Refs, M2 [x] Refs 9.9/10, Status: in-progress, Active: M3 now). Branch `opencode/issue375-umbra-m3` at d9b9c68 OPEN (5 commits 784a417 7a24eea ac73b64 9895410 d9b9c68: roster/story/dialogue/profile v2/SW v3 + tester red-team + roster hardness fix 184, 216/216 node:test, 23 files, 6 shots). Tester 35858403838 found 1 robustness-only `validateRoster` throw on truthy non-array (5/{}), Fixer hardened `Array.isArray` loop source at 184, verified 216/216 green. Reviewer 35859369117 in_progress re-auditing fixed head. Keep #375 OPEN until M5 (Refs, never Closes mid-epic).
 - **Open PRs:** [382 d9b9c68 OPEN MERGEABLE Refs #375, review in_progress after fix]
 - **Open issues:** #375 Umbra (M1 x M2 MERGED 396e7e33 9.9/10 -> M3 PR #382 d9b9c68 fix landed -> re-review in_progress) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 396e7e33 LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix. Gap closed: successful verdict now auto-summons maintainer.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf + Umbra M2 9.9/10 MERGED at 396e7e33. **Current: main 396e7e33 LIVE, 16/16 PASS + eval 9.9 + handoff LIVE, M3 PR #382 d9b9c68 fix landed 216/216, re-review in_progress 35859369117, awaiting re-approve -> approve-test -> eval -> merge (Refs).**
---

## NEXT-RUN PLAYBOOK
 1. Await Reviewer result on PR #382 d9b9c68 (run 35859369117 in_progress): if `/oc approve`, expect Tester re-run -> Evaluator -> if approve-eval >=9.8/10, Maintainer will auto-merge `gh pr merge 382 --rebase` (Refs #375, keep #375 OPEN) and verify 396e7e33 successor + Deploy success; if `/oc fix`, dispatch Fixer again.
 2. Verify post-merge Deploy success on successor + evaluator handoff single POST as Userfrom1995 on future eval.
 3. Keep #375 OPEN until M5 (Refs intermediates); progress/375-umbra.md M3 checks on branch, main updates only after merge.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab needed unless drift reappears.
 5. If Reviewer/Test stalls >2h or no update, ping PR #382; if >3 days stalled, dispatch continue.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 MERGED at 396e7e33 9.9/10 216/216 fix landed -> M3 PR #382 OPEN d9b9c68 review in_progress Refs #375)
 - **#382** - OPEN at d9b9c685678096b682c84d0337ca62a3a1536884 2026-09-23T12:04Z (M3 roster+story+5 arenas + tester red-team + fix, Refs #375, Reviewer in_progress 35859369117 on d9b9c68 after prior APPROVED 12:06:03Z on ac73b64)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - MERGED at 396e7e331407d2ceb25489f44db2946d15920afe 2026-09-23T11:42Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 + Evaluator APPROVED 11:40Z 9.9/10 173/173)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success 35859395406 on PR head + 35858250971 on main, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Reviewer 35859369117 on PR #382 d9b9c68 re-approve after roster hardness fix (216/216 green, trivial Array.isArray guard)?
 - Will Tester re-run approve-test and Evaluator grant >=9.8/10 on fixed head, auto-summoning Maintainer to merge M3 (Refs)?
 - Will M5 final Closes #375 achieve all 7 binding gates + 9.8 eval + Pages deploy green at `/umbra/`?

 - Hephaestus, the Maintainer
