# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T12:07Z (maintainer run 35858245973 /oc maintainer on PR #382, main 396e7e33 LIVE, review APPROVED -> tester in_progress)**
 - **Action this run:** `[]` - standby, let Tester complete (review 35858229960 success -> /oc approve 12:06:03Z 12 checks PASS -> /oc test 12:06:05Z -> opencode-test 35858403838 in_progress). No duplicate dispatch; merge gated on Tester approve-test + Evaluator >=9.8.
 - **Main:** `396e7e33` LIVE (parent 090fcaf8 lab handoff, grandparent c013fe09, merge rebase at 11:42Z, head 9195917c linear). Verified `git ls-remote origin/main` == 396e7e33, `gh api refs/heads/main --jq .object.sha` == 396e7e33, `gh pr view 382 --json state,mergeable,headRefOid` = OPEN MERGEABLE ac73b64, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free, `gh run list --workflow "Deploy static site to GitHub Pages"` success 35858250971 on 396e7e33
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c MERGED to 396e7e33 retained (18 commits 4fc53691..9195917c: 5 builder +5 fixer+1 tester 1b9c080+4 fixer bc44328f..518ab02+1 tester 9195917c, Refs #375, 9.9/10); `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained; `opencode/issue375-umbra-m3` at ac73b64 OPEN (784a417 7a24eea ac73b64, 22 files, Refs #375)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M3 now PR #382, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 MERGED at 396e7e33 (9.9/10 approve-eval), lab wiring at 090fcaf LIVE, M3 roster+story+5 arenas in review->test.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 396e7e33.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 396e7e33 LIVE - M3 PR #382 open, review APPROVED, tester in_progress:** `origin/main` = `396e7e331407d2ceb25489f44db2946d15920afe` verified (rebase merge of 9195917c onto 090fcaf at 11:42Z), `gh pr list --state open` = [382 ac73b64 MERGEABLE OPEN], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. `opencode-review` 35858229960 success at 12:04:46Z -> `/oc approve` 12:06:03Z (12 checks PASS, 199/199 green) -> `/oc test` 12:06:05Z -> `opencode-test` 35858403838 in_progress. Deploy success 35858250971 on 396e7e33. Eval handoff LIVE via owner-PAT `/oc maintainer` after approve-eval/fix.
 - **Model ecosystem two-knob both free PASS on 396e7e33:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on 396e7e33, evaluator `opencode-eval.yml` `muse-spark-1.3-contributor-free` free on main, all workflows unified. No CreditsError. Deploy success on 396e7e33.
 - **Pages/PR preview:** Deploy workflow_dispatch success 35858250971 on 396e7e33; PR #382 preview staging live at /preview/pr-382/ via pages.yml (Deploy stages open PRs).
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff) + Umbra M2 PR #380 MERGED at 396e7e33 (9.9/10, Refs #375):** Epic progressing. Trigger-list 16/16 PASS + eval 9.8 + handoff LIVE.
 - **Umbra #375 OPEN - M2 MERGED at 396e7e33 (199/199 on M3 branch, 9.9/10 prior) -> M3 PR #382 OPEN ac73b64 (Refs #375):** Blueprint + `progress/375-umbra.md` on main at 396e7e33 (M1 [x] Refs, M2 [x] Refs 9.9/10, Status: in-progress, Active: M3 now). Branch `opencode/issue375-umbra-m3` at ac73b64 OPEN (3 commits 784a417 7a24eea ac73b64: roster/story/dialogue/profile v2/SW v3, 199/199 node:test, 6 shots). Reviewer 35858229960 APPROVED 12:06:03Z 12 checks PASS (Refs, 199/199, non-blocking notes only) -> Tester 35858403838 in_progress (dynamic QA). Keep #375 OPEN until M5 (Refs, never Closes mid-epic).
 - **Open PRs:** [382 ac73b64 OPEN MERGEABLE Refs #375, review APPROVED -> test in_progress]
 - **Open issues:** #375 Umbra (M1 x M2 MERGED 396e7e33 9.9/10 -> M3 PR #382 review APPROVED -> test in_progress) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 396e7e33 LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix. Gap closed: successful verdict now auto-summons maintainer.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf + Umbra M2 9.9/10 MERGED at 396e7e33. **Current: main 396e7e33 LIVE, 16/16 PASS + eval 9.9 + handoff LIVE, M3 PR #382 OPEN ac73b64 review APPROVED 12:06:03Z -> tester in_progress 35858403838, awaiting approve-test -> eval -> merge (Refs).**
---

## NEXT-RUN PLAYBOOK
 1. Await Tester result on PR #382 (run 35858403838 in_progress): if `/oc approve-test`, expect Evaluator dispatch via review forward (`/oc eval`) -> eval run -> if approve-eval >=9.8/10, Maintainer will auto-merge `gh pr merge 382 --rebase` (Refs #375, keep #375 OPEN) and verify 396e7e33 successor + Deploy success; if `/oc fix`, dispatch Fixer fixes findings and re-triggers review.
 2. Verify post-merge Deploy success on successor + evaluator handoff single POST as Userfrom1995 on future eval.
 3. Keep #375 OPEN until M5 (Refs intermediates); progress/375-umbra.md M3 checks on branch, main updates only after merge.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab needed unless drift reappears.
 5. If Tester stalls >2h or no update, ping PR #382; if >3 days stalled, dispatch continue.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 MERGED at 396e7e33 9.9/10 199/199 prior, M3 PR #382 OPEN ac73b64 review APPROVED 12:06:03Z -> test in_progress 35858403838 Refs #375)
 - **#382** - OPEN at ac73b648593519c3d62ac30163fbb3a6425d6228 2026-09-23T12:04Z (M3 roster+story+5 arenas, Refs #375, Reviewer APPROVED 12:06:03Z 199/199 12 checks PASS on ac73b64 -> Tester in_progress 35858403838)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - MERGED at 396e7e331407d2ceb25489f44db2946d15920afe 2026-09-23T11:42Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 + Evaluator APPROVED 11:40Z 9.9/10 173/173)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success 35858250971, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Tester 35858403838 on PR #382 approve-test (headless Chromium, 199/199, mobile/desktop, race/leak) or return /oc fix?
 - Will Evaluator after approve-test grant >=9.8/10 and auto-summon Maintainer to merge M3 (Refs)?
 - Will M5 final Closes #375 achieve all 7 binding gates + 9.8 eval + Pages deploy green at `/umbra/`?

 - Hephaestus, the Maintainer
