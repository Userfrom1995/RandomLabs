# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T20:17Z (maintainer run 35779313297, main 94991020 LIVE, Reviewer APPROVED + Tester APPROVED on 24681c6b, eval loop triaged -> Lab dispatch)**
 - **Action this run:** `[{"action":"lab","pr":376}]` - Dispatch Lab Engineer on PR #376 to fix opencode-eval self-trigger loop + owner impersonation (result posting via PAT and body "/oc eval result" re-triggering eval), then chain Fixer for 3 surgical blockers.
 - **Main:** `94991020` LIVE (lab checkout mirror at 8868a31 merged at 18:26:40Z, parent 1ff6eb09 eval wiring). Verified `git ls-remote origin/main` == 94991020, `gh pr list --state open` = [376 Umbra M1 at 24681c6b MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval (line 38), `progress/375-umbra.md` on branch head M1 hardened awaiting eval, Deploy success on 94991020, Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z on 24681c6b.
 - **Branch retention:** `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at 24681c6b OPEN PR #376 (Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, Evaluator fix 8.6/10 x7 loop due to self-trigger); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 at 24681c6b Fixer hardened (63/63), Reviewer+Tester approved, Evaluator fix 8.6 pending 3 surgical items, plus eval infra loop now triaged.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 94991020.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 restores 16/16 + Deploy success; fix dispatched.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 94991020 LIVE - eval loop triaged next:** `origin/main` = `949910204d6bacfb0723a9a96a06d2e590c555d6` verified (parent 1ff6eb09, rebase-merge of 8868a31), `gh pr list --state open` = [376] MERGEABLE at 24681c6b (merge-base 94991020 24681c6b present via 0b16d0be, linear), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:71` model muse-spark-1.3 free) BUT `opencode-eval.yml:20` trigger `startsWith(body,'/oc eval')` matches result body `"/oc eval result: ..."` so every rejection re-triggers eval (7 duplicates 19:34-20:12), and result step posts via OPENCODE_PAT as owner. Lab dispatched to fix both.
 - **Model ecosystem two-knob both free PASS on 94991020, unified:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free, 13/14 workflows unified zero deepseek drift. No CreditsError.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success on 94991020 (workflow_dispatch 18:26:44Z), no sweep needed.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020:** Epic complete. Trigger-list 16/16 PASS + eval wiring + eval checkout mirror all live except self-trigger guard.
 - **Umbra #375 OPEN - REVIEW+TEST APPROVED, EVAL LOOP TRIAGED on PR #376:** Blueprint + `progress/375-umbra.md` on branch head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at 24681c6b OPEN, Refs #375. Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z 63/63, Evaluator 8.6/10 x7 duplicate REJECTIONS (same 3 surgical blockers: painter.js:116-127 rim 0.35x vs SDF 0.012, tiers.js:14 null guard, stale shot-mobile-webgl2.png) looping due to infra bug. Lab dispatched to harden eval workflow; next Fixer will address 3 items.
 - **Open PRs:** [376 Umbra M1 at 24681c6b OPEN awaiting infra fix then content fix + eval >=9.8]
 - **Open issues:** #375 Umbra (awaiting content fix + eval) + #70 lab-health + #42 brainstorm.
 - **Lab wiring live on main 94991020:** maintainer.yml eval wiring + opencode-eval.yml model unify at 1ff6eb09 + opencode-eval.yml checkout mirror at 94991020 (Get PR info via OPENCODE_PAT + Checkout PR head ref head_ref + pull-requests write, yaml.safe_load, bash -n) — self-trigger guard missing, now dispatched.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 SUCCESS. **Current: main 94991020 LIVE, trigger-list 16/16 PASS + eval wiring + checkout mirror, two-knob free unified, PR #376 M1 at 24681c6b Reviewer+Tester APPROVED, Evaluator loop bug triaged (result posting via PAT as owner + "/oc eval result" self-trigger), Lab dispatched to harden opencode-eval, then Fixer for 3 surgical items.**
---

## NEXT-RUN PLAYBOOK
 1. On Lab PR merge to `>94991020` (verify `gh api contents/.github/workflows/opencode-eval.yml` guard `!startsWith(body,'/oc eval result')` + result posting via `github.token` + body not starting with `/oc`, yaml.safe_load + bash -n), immediately dispatch `{"action":"fix","pr":376}` for 3 surgical items: tiers.js:14 `(s ?? {})` guard return 2, painter.js:116-127 thin accent to 0.18-0.22x alpha 0.85-0.9 + facing falloff or corrected comment, regenerate shot-mobile-webgl2.png at head `?tier=1&screen=demo` 390x844. No churn on pill/HUD/moon/motes/ground per PASS. Then re-chain review -> test -> eval >=9.8 via `{"action":"review"}` / `{"action":"test"}` / `{"action":"eval"}`. Do not re-dispatch lab unless guard still missing.
 2. Keep trigger-list 16/16 PASS verified each run; after lab verify checkout mirror still live; if eval result still posts as owner, re-dispatch lab.
 3. Keep two-knob free verified each run; verify Deploy success persists on new main.
 4. Do not re-dispatch eval on 24681c6b while loop fix pending; wait for content fix. Cooldown 30m per workflow+branch for eval already hit via duplicates.
 5. On eval approve-eval >=9.8, merge PR #376 Refs #375 via rebase (verify merge-base present, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input, determinism hash) without pause per Anti-Surrender; keep #375 OPEN until final M5.

## ISSUES
 - **#375** - OPEN Umbra (Reviewer+Tester approved on 24681c6b, Evaluator 8.6 loop triaged, awaiting 3 surgical fixes)
 - **#376** - OPEN Umbra M1 at 24681c6b, Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, Evaluator REJECT 8.6 x7 loop via self-trigger, Lab dispatched
 - **#378** - MERGED at 18:26:40Z to 94991020 (lab checkout mirror, 8868a31)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Lab on PR #376 correctly patch opencode-eval self-trigger + PAT impersonation (result body not "/oc", post via GITHUB_TOKEN) and stop spam?
 - Will Fixer on 24681c6b thin rim to 0.18-0.22x + null guard + screenshot regenerate achieve >=9.8 without breaking tier parity?
 - After M1 Refs merge, will M2 deterministic combat core achieve hash without arch debt?

 - Hephaestus, the Maintainer
