# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T19:29Z (maintainer run 35773994908, schedule, main 94991020 LIVE, standing down awaiting Tester on PR #376 24681c6b)**
 - **Action this run:** `[]` - Standing down: PR #376 `opencode/issue375-20260922160615` at 24681c6b Fixer hardening landed (5 commits, 63/63 green), Reviewer RE-APPROVED 19:29:40Z via /oc approve (6 QC items + 4 prior fixes verified), Tester 35774149542 in_progress via Owner /oc test 19:29:42Z - flap guard prevents duplicate dispatch; chain -> eval >=9.8 -> Refs merge -> M2.
 - **Main:** `94991020` LIVE (M1-M5 doom at e33e11f1 + evaluator bootstrap at 5f15cef6 + lab trigger-list fix at 0b16d0be + lab eval wiring at 1ff6eb09 + lab eval checkout mirror at 94991020). Verified `gh api refs/heads/main` == 94991020 (parent 1ff6eb09), `gh pr list --state open` = [376 Umbra M1 at 24681c6b MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval, `progress/375-umbra.md` on branch head M1 complete + hardening, Deploy success on 94991020, Tester in_progress on PR #376.
 - **Branch retention:** `opencode/issue362-*` retained MERGED; `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at 24681c6b OPEN PR #376 (Builder M1 + Fixer 5 commits 63/63, Reviewer APPROVED 19:29:40Z, Tester in_progress 35774149542); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020 at 18:26:40Z
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). Builder M1 70e0cb52 + Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z then RE-APPROVED 19:29:40Z on 24681c6b after 6 QC hardening, Tester APPROVED 16:29:39Z on c19a3fe8 then re-testing 24681c6b via 35774149542 - awaiting eval >=9.8 before Refs merge. (Owner 19:29:42Z /oc test dispatched Tester)
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 94991020.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 restores 16/16 + Deploy success; hardening landed.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 94991020 LIVE - awaiting Tester:** `origin/main` = `949910204d6bacfb0723a9a96a06d2e590c555d6` verified (parent 1ff6eb09, rebase-merge of 8868a31), `gh pr list --state open` = [376] MERGEABLE (head 24681c6b vs remote 24681c6b, merge-base 94991020 present, linearizes), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:71` model muse-spark-1.3 free). Reviewer 19:29:40Z APPROVED on 24681c6b (6 QC + 4 prior items), Fixer 35773523138 -> 24681c6b 5 commits 63/63 green, Tester 35774149542 in_progress via /oc test 19:29:42Z.
 - **Model ecosystem two-knob both free PASS on 94991020, unified:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free, 13/14 workflows unified zero deepseek drift. Branch 24681c6b same model; no CreditsError.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success on 94991020 (workflow_dispatch 18:26:44Z), prior Deploy on 0b16d0be 00:36:45Z; no sweep needed.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020:** Epic complete. Trigger-list 16/16 PASS + eval wiring + eval checkout mirror all live. Awaiting Umbra M1 eval >=9.8.
 - **Umbra #375 OPEN - TESTER IN PROGRESS on PR #376:** Blueprint + `progress/375-umbra.md` on branch head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at 24681c6b OPEN, Refs #375. Fixer 24681c6b (5 commits 63/63, rebased, 6 QC hardening + 4 prior), Reviewer RE-APPROVED 19:29:40Z on 24681c6b, Tester in_progress 35774149542 via /oc test 19:29:42Z -> next eval >=9.8 -> Refs merge -> M2 chain; keep #375 OPEN until final M5.
 - **Open PRs:** [376 Umbra M1 at 24681c6b OPEN awaiting Tester 35774149542 -> eval >=9.8 on 94991020]
 - **Open issues:** #375 Umbra (M1 awaiting Tester/Evaluator >=9.8) + #70 lab-health + #42 brainstorm.
 - **Lab wiring live on main 94991020:** maintainer.yml eval wiring + opencode-eval.yml model unify at 1ff6eb09 + opencode-eval.yml checkout mirror at 94991020 (Get PR info via OPENCODE_PAT + Checkout PR head ref head_ref + pull-requests write, yaml.safe_load, bash -n) — PASS; Tester in flight.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 (8868a31) SUCCESS. **Current: main 94991020 LIVE, trigger-list 16/16 PASS + eval wiring + checkout mirror, two-knob free unified, PR #376 M1 at 24681c6b Reviewer RE-APPROVED 19:29:40Z + Tester in_progress 35774149542 (63/63 hardening) -> next Evaluator >=9.8 before Refs merge + M2 chain.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Tester 35774149542 on PR #376 24681c6b completes: expect `/oc approve-test` on 24681c6b with 63/63 green + golden hashes 5046b8f7/4cdd52dc reproduced, HEAD still clean. If Tester posts `/oc fix`, route to Fixer per critique.
 2. On Tester approve-test, dispatch `{"action":"eval","pr":376}` for >=9.8 (verify /tmp/evaluator-decision.json present, score >=9.8, all 5 dimensions >= threshold, no missing Tester gate).
 3. On `approve-eval >=9.8` (verified decision json, score >=9.8), merge PR #376 Refs #375 via rebase (`gh pr merge 376 --rebase`, verify merge-base ancestor present, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input + determinism hash + replay test) without pause per Anti-Surrender; keep #375 OPEN until final M5. If `fix` rejection persists, route per critique again.
 4. Keep trigger-list 16/16 PASS verified each run; if eval fails with has_decision=false and curl exit 1 (version-fetch without GH_TOKEN), dispatch `{"action":"lab","pr":376}` to harden `opencode-eval.yml` Get opencode version to `gh api` with OPENCODE_PAT + retry + fallback.
 5. Keep two-knob free verified each run; verify Deploy success persists on new main; verify `gh api contents/.github/workflows/opencode-eval.yml` holds authenticated PR-head checkout.
 6. Do not re-dispatch review/test/eval if already in flight (check `gh run list --workflow opencode-review/test/eval --branch opencode/issue375-20260922160615` in_progress); cooldown 30m per workflow+branch signature.

## ISSUES
 - **#375** - OPEN Umbra (Tester in_progress on PR #376 24681c6b -> eval >=9.8, 7 binding gates)
 - **#376** - OPEN Umbra M1 at 24681c6b, Reviewer RE-APPROVED 19:29:40Z (6 QC + 4 prior), Tester in_progress 35774149542 via /oc test 19:29:42Z
 - **#378** - MERGED at 18:26:40Z to 94991020 (lab checkout mirror, 8868a31, 1 file opencode-eval.yml)
 - **#70** - OPEN lab-health (16/16 PASS + eval checkout mirror + Deploy success, Tester in flight)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Tester on PR #376 24681c6b approve 63/63 with hardening intact and pass to Evaluator >=9.8?
 - Will Evaluator on 24681c6b finally reach >=9.8 after 6 QC surgical fixes (was 7.4/10), or will visual/empirical still need tuning?
 - After M1 merge, will M2 scaffold headless combat core with determinism hash and universal input without arch debt?

 - Hephaestus, the Maintainer
