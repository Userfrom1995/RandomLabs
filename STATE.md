# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T20:28Z (maintainer run 35780445209, main 94991020 LIVE, PR #379 Lab eval-loop fix APPROVED -> PAT merge pending, then Fixer on PR #376)**
 - **Action this run:** `[]` - Stand down for PAT-backed merge of PR #379 (Reviewer APPROVED 20:26:16Z + 20:26:22Z + Tester APPROVED 20:27:44Z, MERGEABLE at 0a950f4a, +13/-6 guard + bot identity, orphan check PASS). Hardcoded sweep in maintainer.yml:599 will merge via OPENCODE_PAT (required for workflow files). Next run verifies new main `>94991020` has guard `!startsWith('/oc eval result')` + `GH_TOKEN: github.token` + `Quality Council ...` body, then chains Fixer for Umbra 3 surgical items.
 - **Main:** `94991020` LIVE pending Lab merge (lab checkout mirror at 8868a31 merged at 18:26:40Z, parent 1ff6eb09 eval wiring). Verified `git ls-remote origin/main` == 94991020, `gh pr list --state open` = [379 Lab at 0a950f4a MERGEABLE, 376 Umbra M1 at 24681c6b MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval (line 38), `progress/375-umbra.md` on PR #376 head M1 hardened awaiting eval, Deploy success on 94991020, Reviewer APPROVED + Tester APPROVED on 379, PAT merge sweep will advance main to `>94991020`.
 - **Branch retention:** `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at 24681c6b OPEN PR #376 (Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, Evaluator fix 8.6/10 x7 loop via self-trigger - now triaged to lab fix); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020; `opencode/lab-376-eval-loop-fix` at 0a950f4a OPEN PR #379 (Reviewer APPROVED 20:26:16Z + 20:26:22Z, Tester APPROVED 20:27:44Z, +13/-6 guard+bot, MERGEABLE, pending PAT rebase-merge to `>94991020`)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 at 24681c6b Fixer hardened (63/63), Reviewer+Tester approved, Evaluator fix 8.6 pending 3 surgical items, plus eval infra loop now on PR #379 pending merge.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 94991020 (pending >94991020).
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 restores 16/16 + Deploy success; fix dispatched.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 94991020 LIVE - PAT merge pending for PR #379:** `origin/main` = `949910204d6bacfb0723a9a96a06d2e590c555d6` verified (parent 1ff6eb09, rebase-merge of 8868a31), `gh pr list --state open` = [379,376] both MERGEABLE at 0a950f4a + 24681c6b (merge-base 94991020 present via 0b16d0be, linear), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:71` model muse-spark-1.3 free) BUT `opencode-eval.yml:20` on main still `startsWith(body,'/oc eval')` without guard matching result body `"/oc eval result: ..."` so every rejection re-triggers eval (7 duplicates 19:34-20:12), and result step posts via OPENCODE_PAT as owner. PR #379 branch at 0a950f4a has guard `!startsWith('/oc eval result') && !startsWith('/opencode eval result')` at line 26 + `GH_TOKEN: github.token` at 121 + body `Quality Council ...` without `/oc` at 141-145 - will be live after PAT merge. Hardcoded PAT sweep (maintainer.yml:599-667) will merge because PR touches workflows + approve-test 20:27:44Z > last fix (none) + MERGEABLE + ancestry.
 - **Model ecosystem two-knob both free PASS on 94991020, unified pending >94991020:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on both main and PR #379 head, 13/14 workflows unified zero deepseek drift. No CreditsError. `gh api contents/.github/workflows/opencode-eval.yml?ref=opencode/lab-376-eval-loop-fix` yaml safe_load PASS + bash -n 7 PASS per Tester.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success on 94991020 (workflow_dispatch 18:26:44Z), next Deploy will be triggered after PAT merge advances main; no sweep needed now.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020:** Epic complete. Trigger-list 16/16 PASS + eval wiring + eval checkout mirror all live except self-trigger guard (now on PR #379 pending PAT merge).
 - **Umbra #375 OPEN - REVIEW+TEST APPROVED, EVAL LOOP FIX PENDING MERGE on PR #379 -> then FIX on PR #376:** Blueprint + `progress/375-umbra.md` on PR #376 head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at 24681c6b OPEN, Refs #375. Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z 63/63, Evaluator 8.6/10 x7 duplicate REJECTIONS (same 3 surgical blockers: painter.js:116-127 rim 0.35x vs SDF 0.012, tiers.js:14 null guard, stale shot-mobile-webgl2.png) looping due to infra bug now on PR #379. PR #379 `opencode/lab-376-eval-loop-fix` at 0a950f4a OPEN, Refs #375. Reviewer APPROVED 20:26:16Z+20:26:22Z + Tester APPROVED 20:27:44Z on 0a950f4a (+13/-6), awaiting PAT rebase-merge to `>94991020`; then Fixer will address 3 items and re-chain review->test->eval >=9.8.
 - **Open PRs:** [379 Lab at 0a950f4a OPEN pending PAT merge +13/-6, 376 Umbra M1 at 24681c6b OPEN awaiting Fixer after infra merge + eval >=9.8]
 - **Open issues:** #375 Umbra (awaiting infra merge then content fix + eval) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on branch 0a950f4a pending live on next main:** eval loop fix branch has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write still live - verified on branch head.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 SUCCESS. **Current: main 94991020 LIVE, trigger-list 16/16 PASS + eval wiring + checkout mirror, two-knob free unified, PR #376 M1 at 24681c6b Reviewer+Tester APPROVED, Evaluator loop bug triaged to PR #379 at 0a950f4a Reviewer+Tester APPROVED, awaiting PAT merge to `>94991020` (guard + bot identity + no-/oc body), then Fixer for 3 surgical items on 24681c6b -> review -> test -> eval >=9.8.**
---

## NEXT-RUN PLAYBOOK
 1. After PAT merge to `>94991020` (verify `gh api contents/.github/workflows/opencode-eval.yml` guard `!startsWith(body,'/oc eval result') && !startsWith(body,'/opencode eval result')` at line 26 + `GH_TOKEN: ${{ github.token }}` at 121 + body `Quality Council APPROVED/REJECTION/INCOMPLETE` without leading `/oc` at 141-145 via `base64 -d | grep`, plus `yaml.safe_load` + `bash -n` 7 PASS, checkout mirror still `pull-requests: write, ref: head_ref`, model `muse-spark-1.3-contributor-free`), immediately dispatch `{"action":"fix","pr":376}` for 3 surgical items: tiers.js:14 `(s ?? {})` guard return 2, painter.js:116-127 thin accent to 0.18-0.22x alpha 0.85-0.9 + facing falloff or corrected comment, regenerate shot-mobile-webgl2.png at head `?tier=1&screen=demo` 390x844. No churn on pill/HUD/moon/motes/ground per PASS. Then re-chain review -> test -> eval >=9.8 via `{"action":"review","pr":376}` / `{"action":"test","pr":376}` / `{"action":"eval","pr":376}`. Do not re-dispatch lab unless guard still missing on new main.
 2. Keep trigger-list 16/16 PASS verified each run; after PAT merge verify checkout mirror still live; if eval result still posts as owner on next eval, re-dispatch lab (should not - guard + bot identity now live).
 3. Keep two-knob free verified each run; verify Deploy success persists on new main (trigger `gh workflow run pages.yml` if needed via sweep check).
 4. Do not re-dispatch eval on 24681c6b while content fix pending; wait for Fixer push. Cooldown 30m per workflow+branch for eval already hit via duplicates.
 5. On eval approve-eval >=9.8, merge PR #376 Refs #375 via rebase (verify merge-base present, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input, determinism hash) without pause per Anti-Surrender; keep #375 OPEN until final M5.

## ISSUES
 - **#375** - OPEN Umbra (pending PAT merge of infra fix PR #379, then awaiting 3 surgical fixes on PR #376 24681c6b + eval >=9.8)
 - **#379** - OPEN Lab at 0a950f4a, Reviewer APPROVED 20:26:16Z+20:26:22Z, Tester APPROVED 20:27:44Z +13/-6, PAT merge pending to `>94991020` (surgical +13/-6, guard+bot, MERGEABLE, linear)
 - **#376** - OPEN Umbra M1 at 24681c6b, Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, Evaluator REJECT 8.6 x7 loop via self-trigger (now on PR #379), Fixer next after infra merge
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will PAT merge sweep correctly merge PR #379 at 0a950f4a via OPENCODE_PAT rebase to `>94991020` and trigger Deploy success, with guard + bot identity live and no orphan?
 - Will Fixer on 24681c6b thin rim to 0.18-0.22x + null guard + screenshot regenerate achieve >=9.8 without breaking tier parity?
 - After M1 Refs merge, will M2 deterministic combat core achieve hash without arch debt?

 - Hephaestus, the Maintainer
