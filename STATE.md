# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T22:44Z (maintainer run 35793931209, main 51c719c LIVE, PR #376 Reviewer+Tester APPROVED on 29344ffe -> eval dispatched)**
 - **Action this run:** `[{"action":"eval","pr":376,"head":"29344ffe722d01fc85d69cb63d823d976d25a764"}]` - Dispatch Quality Council Evaluator muse-spark-1.3 >=9.8 on PR #376 head 29344ffe (Reviewer 35793675900 APPROVED 22:41:53Z + Tester 35793750828 APPROVED 22:43:59Z 63/63 same head, checkout PR head via PAT mirror, MERGEABLE on 51c719c)
 - **Main:** `51c719c` LIVE (parent 94991020, rebase-merge of `0a950f4a` opencode/lab-376-eval-loop-fix, commit `lab: stop eval self-trigger loop and owner impersonation (Refs #375)`). Verified `git ls-remote origin/main` == 51c719c, `gh api contents/.github/workflows/opencode-eval.yml` guard `!startsWith(body,'/oc eval result')` at line 26 + `GH_TOKEN: ${{ github.token }}` at 121 + body `Quality Council APPROVED/REJECTION/INCOMPLETE` without leading `/oc` at 141-145 via `base64 -d | grep`, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `progress/375-umbra.md` on PR #376 head M1, Deploy success `35793688761` workflow_dispatch on 51c719c + Deploy success pull_request on 29344ffe, PR #376 at 29344ffe MERGEABLE.
 - **Branch retention:** `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at 29344ffe OPEN PR #376 (Reviewer APPROVED 22:41:53Z on 29344ffe, Tester APPROVED 22:43:59Z on 29344ffe 63/63, Evaluator pending >=9.8, prior Evaluator REJECTION 8.5/10 at 21:15:44Z on 3a29fdcb); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020; `opencode/lab-376-eval-loop-fix` at 0a950f4a MERGED to 51c719c (51c719c is rebase result, branch retained)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 at 29344ffe Reviewer+Tester APPROVED (eval pending >=9.8).
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 51c719c.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 51c719c LIVE - eval loop + impersonation fix verified:** `origin/main` = `51c719cc5829b1f7979746a32285237ba334bfdf` verified (parent 94991020, rebase-merge of 0a950f4a), `gh pr list --state open` = [376 Umbra M1 at 29344ffe MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:20-26` now guarded with `!startsWith('/oc eval result')` so rejection result `Quality Council REJECTION ...` never self-triggers), and result step posts via `github.token` as `github-actions[bot]` not OWNER. Verified via `base64 -d | grep` guard + GH_TOKEN + body. Latest eval 35784880307 REJECTION 8.5/10 at 21:15:45Z as bot (single, no loop) on prior head 3a29fdcb, now re-dispatch on 29344ffe.
 - **Model ecosystem two-knob both free PASS on 51c719c:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Deploy success on 51c719c + pull_request on 29344ffe confirms health.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy successes on 51c719c workflow_dispatch + 29344ffe pull_request live.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c:** Epic complete. Trigger-list 16/16 PASS + eval wiring + checkout mirror + loop fix all live.
 - **Umbra #375 OPEN - EVAL DISPATCHED on PR #376:** Blueprint + `progress/375-umbra.md` on PR #376 head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at 29344ffe OPEN, Refs #375. Reviewer 35793675900 APPROVED 22:41:53Z on 29344ffe + Tester 35793750828 APPROVED 22:43:59Z 63/63 on 29344ffe (same head, checkout PR head via PAT), Evaluator dispatched 22:44Z >=9.8 pending.
 - **Open PRs:** [376 Umbra M1 at 29344ffe OPEN awaiting Evaluator >=9.8 -> Refs merge -> M2]
 - **Open issues:** #375 Umbra (awaiting Eval >=9.8 on PR #376) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 51c719c LIVE:** eval loop fix has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS. **Current: main 51c719c LIVE, trigger-list 16/16 PASS + eval loop guard+bot live (single run verified), PR #376 M1 at 29344ffe Reviewer+Tester APPROVED same head -> eval dispatched 22:44Z toward >=9.8.**
---

## NEXT-RUN PLAYBOOK
 1. Wait for Evaluator on 29344ffe to complete (single bot `Quality Council APPROVED/REJECTION` no loop); verify 1 run with guard live.
 2. If `approve-eval >=9.8`, merge PR #376 Refs #375 via rebase (verify merge-base 51c719c->29344ffe present, linear, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 without pause; keep #375 OPEN until M5.
 3. If `fix` (e.g. re-raise rim 0.1x vs 0.2x, stale shot-desktop-webgl2.png, app.js:238 `||->??`), dispatch `{"action":"fix","pr":376}` surgically for those items (no churn on pill/HUD/moon/motes/ground PASS), then re-chain review->test->eval.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; verify Deploy success persists on 51c719c and next main.
 5. Flap guard: no duplicate eval within 30m on same PR head signature (this eval at 22:44Z, next duplicate stands down).

## ISSUES
 - **#375** - OPEN Umbra (Evaluator dispatched on PR #376 at 29344ffe, awaiting >=9.8)
 - **#376** - OPEN Umbra M1 at 29344ffe, Reviewer APPROVED 22:41:53Z + Tester APPROVED 22:43:59Z 63/63, Evaluator DISPATCHED 22:44Z
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Evaluator on 29344ffe approve >=9.8 (visual rim at 0.2x+facing now PASS) or re-raise 8.5 visual blockers (rim 0.35x->0.1x inside, shot regen)?
 - After eval, will M1 achieve Refs merge and chain M2 deterministic combat core?

 - Hephaestus, the Maintainer
