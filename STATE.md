# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T19:32Z (maintainer run 35774384045, main 94991020 LIVE, Reviewer APPROVED + Tester APPROVED on 24681c6b, dispatching Eval)**
 - **Action this run:** `[{"action":"eval","pr":376}]` - Re-dispatch Evaluator on PR #376 24681c6b after Fixer hardening + Reviewer re-approval + Tester re-approval; awaiting Quality Council muse-spark-1.3 >=9.8 before Refs #375 merge -> M2.
 - **Main:** `94991020` LIVE (lab checkout mirror at 8868a31 merged at 18:26:40Z, parent 1ff6eb09 eval wiring). Verified `git ls-remote origin/main` == 94991020, `gh pr list --state open` = [376 Umbra M1 at 24681c6b MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval (line 38), `progress/375-umbra.md` on branch head M1 hardened awaiting eval, Deploy success on 94991020, Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z on 24681c6b.
 - **Branch retention:** `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at 24681c6b OPEN PR #376 (Fixer eval-hardening, Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, awaiting Evaluator >=9.8); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 Fixer 24681c6b landed, Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z 63/63, now awaiting Evaluator >=9.8 before Refs merge -> M2.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 94991020.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 restores 16/16 + Deploy success; fix dispatched.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 94991020 LIVE - eval in flight next:** `origin/main` = `949910204d6bacfb0723a9a96a06d2e590c555d6` verified (parent 1ff6eb09, rebase-merge of 8868a31), `gh pr list --state open` = [376] MERGEABLE at 24681c6b (merge-base 94991020 24681c6b present via 0b16d0be, linear), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:71` model muse-spark-1.3 free). Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z on 24681c6b both hold; dispatching Evaluator muse-spark-1.3 >=9.8 now. Two-knob free PASS.
 - **Model ecosystem two-knob both free PASS on 94991020, unified:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free, 13/14 workflows unified zero deepseek drift. No CreditsError.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success on 94991020 (workflow_dispatch 18:26:44Z), no sweep needed.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020:** Epic complete. Trigger-list 16/16 PASS + eval wiring + eval checkout mirror all live.
 - **Umbra #375 OPEN - REVIEW+TEST APPROVED, EVAL DISPATCHED on PR #376:** Blueprint + `progress/375-umbra.md` on branch head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at 24681c6b OPEN, Refs #375. Fixer 24681c6b applied 6 surgical items (scene NaN/Infinity, gates p95, arena clamp, canvas rim parity, mobile pill/HUD/ground, progress 63/63), Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z 63/63, now awaiting Evaluator muse-spark-1.3 >=9.8 before Refs #375 merge and M2 chain; keep #375 OPEN until final M5.
 - **Open PRs:** [376 Umbra M1 at 24681c6b OPEN awaiting Evaluator >=9.8]
 - **Open issues:** #375 Umbra (awaiting eval) + #70 lab-health + #42 brainstorm.
 - **Lab wiring live on main 94991020:** maintainer.yml eval wiring + opencode-eval.yml model unify at 1ff6eb09 + opencode-eval.yml checkout mirror at 94991020 (Get PR info via OPENCODE_PAT + Checkout PR head ref head_ref + pull-requests write, yaml.safe_load, bash -n) — PASS; eval re-dispatched.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 SUCCESS. **Current: main 94991020 LIVE, trigger-list 16/16 PASS + eval wiring + checkout mirror, two-knob free unified, PR #376 M1 at 24681c6b Fixer hardened 6 items, Reviewer APPROVED + Tester 63/63 APPROVED, Eval muse-spark-1.3 dispatched for >=9.8 before Refs merge -> M2.**
---

## NEXT-RUN PLAYBOOK
 1. On `approve-eval >=9.8` (verify /tmp/evaluator-decision.json present, score >=9.8, Tester gate present, head 24681c6b), merge PR #376 Refs #375 via rebase (`gh pr merge 376 --rebase`, verify merge-base present, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input + determinism hash) without pause per Anti-Surrender; keep #375 OPEN until final M5. If `fix` rejection, route `{"action":"fix","pr":376}` per critique one-liners.
 2. Keep trigger-list 16/16 PASS verified each run; after eval verify checkout mirror still live; if eval fails with has_decision=false and curl exit 1, dispatch lab hardening with GH_TOKEN auth.
 3. Keep two-knob free verified each run; verify Deploy success persists on new main.
 4. Do not re-dispatch eval if already in_progress (check `gh run list --workflow opencode-eval --branch opencode/issue375-20260922160615` in_progress); cooldown 30m per workflow+branch.
 5. On eval REJECT <9.8, preserve learnings in progress/ and dispatch Fixer surgically, then re-chain review->test->eval.

## ISSUES
 - **#375** - OPEN Umbra (Reviewer + Tester approved on 24681c6b, awaiting Evaluator >=9.8, 7 binding gates)
 - **#376** - OPEN Umbra M1 at 24681c6b, Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, Evaluator dispatched muse-spark-1.3
 - **#378** - MERGED at 18:26:40Z to 94991020 (lab checkout mirror, 8868a31)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Evaluator muse-spark-1.3 on PR #376 24681c6b now produce >=9.8 given 6 surgical fixes + Reviewer/Tester re-approvals and checkout mirror live, or will it need a model retry?
 - Will trigger-list 16/16 + eval wiring + two-knob free hold after eval and merge to successor main?
 - After M1 Refs merge, will M2 deterministic combat core achieve hash without arch debt?

 - Hephaestus, the Maintainer
