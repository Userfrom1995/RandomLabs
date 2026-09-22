# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T16:51Z (maintainer run 35756730225, Owner directive 16:50:08Z on PR #376 to add eval wiring + unify model to muse-spark-1.3, dispatched Lab on #375, main 0b16d0be LIVE)**
 - **Action this run:** `[{"action":"lab","issue":375}]` - Owner confirmed wiring gap (maintainer.yml has no eval action mapping; opencode-eval.yml still on deepseek-v4-flash-free) and directed single-PR fix: Lab Engineer to (a) add eval dispatch to maintainer.yml (action allowlist + PROMPT + Run /oc triggers mapping eval->/oc eval) for autonomous Tester->Evaluator chaining, and (b) switch opencode-eval.yml model to opencode/muse-spark-1.3-contributor-free. PR #376 at c19a3fe8 MERGEABLE on 0b16d0be, Reviewer APPROVED f55274c + Tester APPROVED 63/63, awaiting Evaluator >=9.8 then Refs #375 merge -> M2. Lab will merge with Refs handling, then Maintainer will resume eval/merge chain.
 - **Main:** `0b16d0be` LIVE (M1-M5 doom merged + evaluator bootstrap at 5f15cef6 + Lab trigger-list fix at 0b16d0be). Verified `git ls-remote origin/main` == 0b16d0be == `gh api refs/heads/main` == 0b16d0be, `gh pr list --state open` = [376 Umbra M1 at c19a3fe8], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval, `progress/375-umbra.md` M1 complete awaiting eval.
 - **Branch retention:** `opencode/issue362-*` retained MERGED; `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/issue375-20260922160615` at c19a3fe8 OPEN PR #376 (Builder M1 + Fixer 4 blocks + Tester redteam, Reviewer APPROVED, Tester APPROVED, awaiting Evaluator; Lab on #375 dispatched for eval wiring fix).
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint + progress M1-M5, Builder M1 70e0cb52 + Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, awaiting Evaluator >=9.8. Owner 16:50:08Z on PR #376 directed Lab to add maintainer eval wiring + unify eval model to muse-spark-1.3-contributor-free in single PR - dispatched lab on #375 this run.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 0b16d0be.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be restores 16/16.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 0b16d0be LIVE - trigger-list 16/16 PASS pending eval wiring patch:** `origin/main` = `0b16d0beda130d714661a6ede75c584087f58644` verified, `gh pr list --state open` = [376] (Umbra M1 at c19a3fe8, Reviewer APPROVED, Tester APPROVED), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS, docs 424/424. Wiring gap: maintainer.yml action list + trigger step missing eval mapping; evaluator model still deepseek-v4-flash-free - Lab on #375 will patch both in one PR (owner directive).
 - **Model ecosystem two-knob both free PASS on 0b16d0be:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator deepseek-v4-flash-free free pending switch to muse-spark-1.3-contributor-free per owner.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success on 0b16d0be.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be:** Epic complete. Trigger-list 16/16 restored.
 - **Umbra #375 OPEN - Tester APPROVED, Lab dispatched for eval wiring (PR #376):** Blueprint + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at c19a3fe8 OPEN, Refs #375. Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED f55274c. Next: Lab on #375 patches maintainer.yml eval wiring + opencode-eval.yml model unify -> merge -> Evaluator >=9.8 -> Maintainer merge Refs -> chain M2.
 - **Open PRs:** [376 Umbra M1 at c19a3fe8 OPEN, Reviewer APPROVED, Tester APPROVED, awaiting Evaluator; Lab PR for #375 pending]
 - **Open issues:** #375 Umbra (M1 approved, awaiting lab patch + eval) + #70 lab-health + #42 brainstorm.
 - **Lab wiring fix needed:** maintainer.yml missing eval action + evaluator model drift to unify.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS. **Current: main 0b16d0be LIVE, trigger-list 16/16 PASS, two-knob free, PR #376 M1 at c19a3fe8 Tester APPROVED 63/63 (Reviewer f55274c APPROVED), Lab dispatched on #375 to add eval wiring + unify model to muse-spark-1.3 before Evaluator >=9.8 -> Refs merge -> M2.**
---

## NEXT-RUN PLAYBOOK
 1. Await Lab Engineer PR on #375 (maintainer.yml eval wiring + opencode-eval.yml muse-spark-1.3): on Reviewer approve + Tester approve-test, Maintainer merges it, then dispatches `{"action":"eval","pr":376}` or equivalent via new eval knob (or Owner /oc eval) to run Quality Council deepseek->muse-spark-1.3 (unified) >=9.8.
 2. On approve-eval >=9.8 on PR #376 c19a3fe8, merge Refs #375 via rebase (orphan check merge-base 0b16d0be present) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input) without pause per Anti-Surrender. If fix rejection, route per critique.
 3. Keep trigger-list 16/16 PASS verified each run; after Lab merge verify 16/16 still PASS plus eval wiring present.
 4. Keep two-knob free verified each run; after Lab merge verify opencode-eval.yml model == muse-spark-1.3-contributor-free.

## ISSUES
 - **Evaluator/bootstrap drift:** evaluator at 5f15cef6 + lab fix at 0b16d0be covered trigger-list but not maintainer eval dispatch or model unify - Lab on #375 dispatched this run to fix both per owner 16:50:08Z.
 - **#375** - OPEN Umbra (Tester APPROVED c19a3fe8, awaiting Lab patch + Evaluator >=9.8, 7 binding gates)
 - **#376** - OPEN Umbra M1 at c19a3fe8, Reviewer APPROVED, Tester APPROVED, Refs #375, awaiting Lab + Evaluator
 - **#70** - OPEN lab-health (16/16 PASS, Deploy success)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Lab Engineer single PR correctly patch maintainer.yml (action allowlist + PROMPT + trigger step eval mapping) and opencode-eval.yml model to muse-spark-1.3-contributor-free, pass review/test, and merge on 0b16d0be without orphans?
 - Will Evaluator (now muse-spark-1.3) grade Umbra M1 c19a3fe8 >=9.8 allowing Refs merge and immediate M2 chain?
 - Will M2 chain immediately after M1 merge per blueprint without pause?

 - Hephaestus, the Maintainer
