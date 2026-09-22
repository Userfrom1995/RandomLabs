# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T18:05Z (maintainer run 35764866945, workflow_run opencode-eval failure 35764829287 on main 1ff6eb09, dispatch lab on #376)**
 - **Action this run:** `[{"action":"lab","pr":376}]` - Evaluator 35764829287 FAILED closed on main 1ff6eb09 (Owner /oc eval 18:04:49Z on PR #376 c19a3fe8, 403 reactions/comments + no /tmp/evaluator-decision.json, verify exit 1). Checkout miss (main not PR head) + pull-requests: read insufficient. Dispatch Lab Engineer to fix opencode-eval.yml to mirror review/test (Get PR info via PAT, Checkout PR head via ref, pull-requests: write, keep muse-spark-1.3 at line 71).
 - **Main:** `1ff6eb09` LIVE (M1-M5 doom at e33e11f1 + evaluator bootstrap at 5f15cef6 + lab trigger-list fix at 0b16d0be + lab eval wiring at 1ff6eb09). Verified `git ls-remote origin/main` == 1ff6eb0939fa3fe08f81189c9a524676ffaf0282 == `gh api refs/heads/main` == 1ff6eb09, `gh pr list --state open` = [376 Umbra M1 at c19a3fe8 MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval + eval wiring (test|eval in OUTPUT CONTRACT + elif eval), `progress/375-umbra.md` on branch head M1 complete awaiting eval rerun (not yet on main).
 - **Branch retention:** `opencode/issue362-*` retained MERGED; `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at c19a3fe8 OPEN PR #376 (Builder M1 + Fixer 4 blocks + Tester redteam 63/63, Reviewer APPROVED, Tester APPROVED, Evaluator FAILED - awaiting Lab fix then rerun).
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint + progress M1-M5, Builder M1 70e0cb52 + Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, Evaluator FAILED closed 18:04:53Z (checkout + 403 bug) -> Lab fix dispatched on PR #376. Awaiting approve-eval >=9.8 before Refs #375 merge and M2 chain. Owner 16:50:08Z on PR #376 directed Lab to add maintainer eval wiring + unify eval model to muse-spark-1.3-contributor-free in single PR - Lab PR #377 MERGED at 1ff6eb09 INFRA ONLY, but opencode-eval.yml itself still needs checkout fix.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 1ff6eb09.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 restores 16/16 + eval knob, but eval checkout bug now blocks gate.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 1ff6eb09 LIVE - eval wiring COMPLETE but eval workflow BROKEN:** `origin/main` = `1ff6eb0939fa3fe08f81189c9a524676ffaf0282` verified (parent 0b16d0be), `gh pr list --state open` = [376] MERGEABLE (merge-base present, linearizes onto 1ff6eb09), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval + `maintainer.yml:198` includes test|eval + `maintainer.yml:548` elif eval -> /oc eval). Evaluator wiring blocked by 403 + checkout bug - Lab dispatch corrects it.
 - **Model ecosystem two-knob both free PASS on 1ff6eb09, unified:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` now `muse-spark-1.3-contributor-free` (was deepseek), 14/14 workflows unified zero deepseek pins.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success on 1ff6eb09 (35754811554 workflow_dispatch) verified; no sweep needed.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09:** Epic complete. Trigger-list 16/16 + eval wiring restored. Two-knob free unified.
 - **Umbra #375 OPEN - Lab DISPATCHED to fix Evaluator on PR #376:** Blueprint + `progress/375-umbra.md` on branch head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at c19a3fe8 OPEN, Refs #375. Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED f55274c, Tester APPROVED 16:29:39Z. Evaluator 35764829287 FAILED closed (main checkout + 403), now Lab dispatched on PR #376 to fix opencode-eval.yml. Next: Lab merge -> re-dispatch `{"action":"eval","pr":376}` on c19a3fe8 (>=9.8) -> Refs merge -> M2 chain without pause per Anti-Surrender.
 - **Open PRs:** [376 Umbra M1 at c19a3fe8 OPEN, Reviewer APPROVED, Tester APPROVED, Evaluator FAILED (Lab fix in_progress)]
 - **Open issues:** #375 Umbra (M1 awaiting Evaluator >=9.8 after Lab fix, 7 binding gates) + #70 lab-health + #42 brainstorm.
 - **Lab wiring complete live on main but eval checkout fix pending:** maintainer.yml eval wiring + opencode-eval.yml model unify MERGED at 1ff6eb09 per owner 16:50:08Z, all checks PASS, but opencode-eval.yml checkout/permissions still broken - Lab on PR #376 will land surgical fix.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval knob live BUT eval checkout 403 blocks gate. **Current: main 1ff6eb09 LIVE, trigger-list 16/16 PASS + eval wiring, two-knob free unified, PR #376 M1 at c19a3fe8 Reviewer APPROVED + Tester APPROVED 63/63 but Evaluator FAILED closed 18:04:53Z on main checkout bug -> Lab dispatched on PR #376 to fix opencode-eval.yml checkout to PR head + pull-requests write.**
---

## NEXT-RUN PLAYBOOK
 1. Await Lab PR on opencode-eval.yml fix (checkout PR head + pull-requests write) to merge to main successor (>1ff6eb09). Verify `git ls-remote origin/main` advances, `opencode-eval.yml` now has Get PR info + Checkout PR head, `pull-requests: write`, model still muse-spark-1.3.
 2. On Lab merge, immediately dispatch `{"action":"eval","pr":376}` on c19a3fe8 (flap guard: not within 30m of prior eval failure at 18:04:53Z, now > few minutes). If Lab stalls/crashes, triage via workflow_run failure and re-dispatch lab/continue as needed.
 3. On Evaluator approve-eval >=9.8 (verify /tmp/evaluator-decision.json present, score >=9.8, no missing Tester gate), merge Refs #375 via rebase (verify merge-base 1ff6eb09 ancestor present after fetch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input) without pause per Anti-Surrender. If fix rejection, route per critique to `{"action":"fix","pr":376}` or `{"action":"architect","pr":376}` as verdict demands.
 4. Keep trigger-list 16/16 PASS verified each run; after eval rerun verify eval run on PR head c19a3fe8 (not main) and head_branch PR, conclusion success.
 5. Keep two-knob free verified each run; verify Deploy green on successor each run.

## ISSUES
 - **#375** - OPEN Umbra (Evaluator FAILED - Lab fix dispatched on PR #376, awaiting rerun >=9.8, 7 binding gates)
 - **#376** - OPEN Umbra M1 at c19a3fe8, Reviewer APPROVED, Tester APPROVED, Evaluator FAILED closed (Lab dispatched 18:05Z to fix opencode-eval checkout + 403), Refs #375, awaiting rerun
 - **#377** - MERGED at 1ff6eb09 (lab eval wiring, 16/16 + eval knob + model unify, Reviewer APPROVED + Tester APPROVED infra)
 - **#70** - OPEN lab-health (16/16 PASS + eval wiring, Deploy success on 1ff6eb09, eval checkout bug now known)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Lab Engineer fix opencode-eval.yml checkout to PR head + pull-requests write and merge cleanly, allowing Evaluator muse-spark-1.3 to grade Umbra M1 c19a3fe8 >=9.8 without 403 crash?
 - After Lab fix, will Evaluator grade >=9.8 allowing Refs merge and immediate M2 chain per blueprint (combat determinism + universal input)?
 - Will trigger-list 16/16 + eval wiring remain PASS and Deploy stay green on 1ff6eb09 successor after Lab fix?

 - Hephaestus, the Maintainer
