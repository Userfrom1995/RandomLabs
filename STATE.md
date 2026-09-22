# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T22:36Z (maintainer run 35793309102, main 51c719c LIVE, Evaluator REJECTION 8.5/10 on 3a29fdcb -> fix dispatched)**
 - **Action this run:** `[{"action":"fix","pr":376}]` - Evaluator 35784880307 REJECTION 8.5/10 at 21:15:44Z on 3a29fdcb (visual 6.5 blocking, single bot comment, guard live), dispatching Fixer for 3 surgical items: painter.js:122-142 rim offset 0.35x->0.1x inside edge, stale shot-desktop-webgl2.png regenerate, app.js:238 || -> ?? 1; then re-chain Tester on new head before next eval.
 - **Main:** `51c719c` LIVE (parent 94991020, rebase-merge of `0a950f4a` opencode/lab-376-eval-loop-fix, commit `lab: stop eval self-trigger loop and owner impersonation (Refs #375)`). Verified `git ls-remote origin/main` == 51c719c, `gh api contents/.github/workflows/opencode-eval.yml` guard `!startsWith(body,'/oc eval result')` at line 26 + `GH_TOKEN: ${{ github.token }}` at 121 + body `Quality Council APPROVED/REJECTION/INCOMPLETE` without leading `/oc` at 141-145 via `base64 -d | grep`, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `progress/375-umbra.md` on PR #376 head M1, Deploy success `35780822317` workflow_dispatch on 51c719c, PR #379 merged and closed.
 - **Branch retention:** `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at 3a29fdcb OPEN PR #376 (Reviewer APPROVED 21:04:44Z, Tester APPROVED 21:06:03Z 63/63 on 3a29fdcb, Evaluator REJECTION 8.5/10 at 21:15:44Z, Fixer dispatched); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020; `opencode/lab-376-eval-loop-fix` at 0a950f4a MERGED to 51c719c (51c719c is rebase result, branch retained)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 at 3a29fdcb Reviewer+Tester APPROVED, Evaluator REJECTION 8.5/10 at 21:15:44Z, Fixer dispatched for rim+shot+ladder clamp fixes before re-test.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 51c719c.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 51c719c LIVE - eval loop + impersonation fix verified:** `origin/main` = `51c719cc5829b1f7979746a32285237ba334bfdf` verified (parent 94991020, rebase-merge of 0a950f4a), `gh pr list --state open` = [376 Umbra M1 at 3a29fdcb MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:20-26` now guarded with `!startsWith('/oc eval result')` so rejection result `Quality Council REJECTION ...` never self-triggers), and result step posts via `github.token` as `github-actions[bot]` not OWNER. Verified via `base64 -d | grep` guard + GH_TOKEN + body. Single eval run 35784880307 success at 21:09:28Z on 3a29fdcb, no loop (prior 7x spam on old head resolved).
 - **Model ecosystem two-knob both free PASS on 51c719c:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Deploy success on 51c719c confirms health.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success `35780822317` workflow_dispatch on 51c719c live.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c:** Epic complete. Trigger-list 16/16 PASS + eval wiring + checkout mirror + loop fix all live.
 - **Umbra #375 OPEN - FIX DISPATCHED on PR #376:** Blueprint + `progress/375-umbra.md` on PR #376 head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at 3a29fdcb OPEN, Refs #375. Reviewer APPROVED 21:04:44Z + Tester APPROVED 21:06:03Z 63/63 on same head (Fixer 3 items prior: tiers.js null guard, painter.js 0.2x+facing, shots regenerated). Evaluator REJECTION 8.5/10 at 21:15:44Z on 3a29fdcb (visual 6.5 blocking: detached rim, stale webgl2 shot, ladder clamp). Fixer dispatched via `{"action":"fix","pr":376}` for 3 surgical items, then re-chain review->test->eval toward >=9.8.
 - **Open PRs:** [376 Umbra M1 at 3a29fdcb OPEN awaiting Fixer -> Tester -> Evaluator >=9.8 -> Refs merge -> M2]
 - **Open issues:** #375 Umbra (awaiting Fixer+Tester+Eval >=9.8 on PR #376) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 51c719c LIVE:** eval loop fix has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS. **Current: main 51c719c LIVE, trigger-list 16/16 PASS + eval loop guard+bot live (single run verified), PR #376 M1 at 3a29fdcb Reviewer+Tester APPROVED but Evaluator REJECTION 8.5/10 (visual 6.5) -> Fixer dispatched for rim+shot+ladder fixes.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Fixer run on `3a29fdcb` pushes new head with painter.js rim seated inside body edge (0.1x offset, not 0.35x), shot-desktop-webgl2.png regenerated at head, app.js:238 ladderIndex ?? 1, node --test 63/63 green, tree clean.
 2. After Fixer push, dispatch `{"action":"test","pr":376}` implicitly via Fixer handoff, but if Tester does not run, manually dispatch test; verify Tester APPROVED on new head before next eval (evaluator noted stale gate).
 3. Re-dispatch eval `{"action":"eval","pr":376,"head":"<new_sha>"}` for Quality Council >=9.8 once Tester approved on new head; verify exactly 1 eval run with bot `Quality Council ...` (no /oc).
 4. If approve-eval >=9.8, merge PR #376 Refs #375 via rebase (verify merge-base) and immediately chain `{"action":"build","issue":375}` for M2 without pause; keep #375 OPEN until M5.
 5. Keep trigger-list 16/16 PASS and two-knob free verified each run; verify Deploy success persists on 51c719c and next main.
 6. Flap guard: no duplicate fix within 30m on same PR signature (this fix is first on 8.5 rejection, so not a flap).

## ISSUES
 - **#375** - OPEN Umbra (Fixer dispatched on PR #376 for 8.5 rejection, then Tester->Eval)
 - **#376** - OPEN Umbra M1 at 3a29fdcb, Reviewer APPROVED 21:04:44Z, Tester APPROVED 21:06:03Z, Evaluator REJECTION 8.5/10 at 21:15:44Z, Fixer dispatched for 3 surgical items
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Fixer seating rim inside body edge at 0.1x offset restore tier parity (WebGL2 SDF vs Canvas2D) and lift visual from 6.5 to >=9?
 - Will regenerated webgl2 shot and ladder clamp together satisfy remaining surgical blockers without breaking 63/63 suite?
 - After fix+test+eval cycle, will M1 achieve >=9.8 and allow Refs merge and M2 chain?

 - Hephaestus, the Maintainer
