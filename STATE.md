# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T21:00Z (maintainer run 35783700978, main 51c719c LIVE eval-loop fix MERGED, Fixer dispatched on PR #376)**
 - **Action this run:** `[{"action":"fix","pr":376}]` - Infra fix `51c719c` verified LIVE (guard `!startsWith('/oc eval result')` at line 26 + `GH_TOKEN: github.token` at 121 + `Quality Council ...` body without `/oc` at 141-145, checkout mirror `head_ref` still live), dispatch Fixer for 3 surgical items on `24681c6b` per Evaluator 8.6/10. Next run verifies Fixer push then chains review -> test -> eval >=9.8.
 - **Main:** `51c719c` LIVE (parent 94991020, rebase-merge of `0a950f4a` opencode/lab-376-eval-loop-fix, commit `lab: stop eval self-trigger loop and owner impersonation (Refs #375)`). Verified `git ls-remote origin/main` == 51c719c, `gh api contents/.github/workflows/opencode-eval.yml` guard `!startsWith(body,'/oc eval result') && !startsWith(body,'/opencode eval result')` at line 26 + `GH_TOKEN: ${{ github.token }}` at 121 + body `Quality Council APPROVED/REJECTION/INCOMPLETE` without leading `/oc` at 141-145 via `base64 -d | grep`, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `progress/375-umbra.md` on PR #376 head M1 hardened awaiting eval, Deploy success `35780822317` workflow_dispatch on 51c719c, PR #379 merged and closed.
 - **Branch retention:** `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at 24681c6b OPEN PR #376 (Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, Evaluator REJECTION 8.6/10 x7 loop now fixed via 51c719c, awaiting Fixer for 3 items); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020; `opencode/lab-376-eval-loop-fix` at 0a950f4a MERGED to 51c719c (51c719c is rebase result, branch retained)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 at 24681c6b Fixer hardening landed previously (63/63), Reviewer+Tester approved, Evaluator 8.6 loop now fixed via 51c719c, awaiting Fixer for 3 surgical items.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 51c719c.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 51c719c LIVE - eval loop + impersonation fix verified:** `origin/main` = `51c719cc5829b1f7979746a32285237ba334bfdf` verified (parent 94991020, rebase-merge of 0a950f4a), `gh pr list --state open` = [376 Umbra M1 at 24681c6b MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:20-26` now guarded with `!startsWith('/oc eval result')` so rejection result `Quality Council REJECTION ...` never self-triggers), and result step posts via `github.token` as `github-actions[bot]` not OWNER. Verified via `base64 -d | grep` guard + GH_TOKEN + body.
 - **Model ecosystem two-knob both free PASS on 51c719c:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Deploy success on 51c719c confirms health.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success `35780822317` workflow_dispatch on 51c719c live.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c:** Epic complete. Trigger-list 16/16 PASS + eval wiring + checkout mirror + loop fix all live.
 - **Umbra #375 OPEN - FIXER DISPATCHED on PR #376:** Blueprint + `progress/375-umbra.md` on PR #376 head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at 24681c6b OPEN, Refs #375. Reviewer APPROVED 19:29:40Z + Tester APPROVED 19:31:47Z 63/63, Evaluator REJECTION 8.6/10 x7 loop FIXED via infra main 51c719c, now Fixer dispatched for 3 surgical items (tiers.js:14, painter.js:116-127, shot-mobile-webgl2.png) -> review -> test -> eval >=9.8.
 - **Open PRs:** [376 Umbra M1 at 24681c6b OPEN awaiting Fixer push + review/test/eval >=9.8]
 - **Open issues:** #375 Umbra (awaiting Fixer push on PR #376 + eval >=9.8) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 51c719c LIVE:** eval loop fix has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS. **Current: main 51c719c LIVE, trigger-list 16/16 PASS + eval loop guard + bot identity live, PR #376 M1 at 24681c6b Reviewer+Tester APPROVED, Evaluator loop bug FIXED and merged, Fixer dispatched for 3 surgical items -> review -> test -> eval >=9.8.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Fixer push on `24681c6b` successor (new head SHA): `gh pr view 376 --json headRefOid,mergeable,state` shows new head >24681c6b and `gh api contents/umbra/src/render/tiers.js` contains `(s ?? {})` guard at line 14-18 + `painter.js:116-127` thin accent 0.18-0.22x alpha 0.85-0.9 + facing falloff or corrected comment 99-102 + `umbra/docs/shot-mobile-webgl2.png` regenerated at head `?tier=1&screen=demo` 390x844. No churn on pill/HUD/moon/motes/ground per PASS. Then immediately chain `{"action":"review","pr":376}`.
 2. After Reviewer APPROVED on new head, chain `{"action":"test","pr":376}` (node --test 63/63 green, screenshot tier parity).
 3. After Tester approve-test, chain `{"action":"eval","pr":376}` - single eval (no loop - guard live) toward >=9.8. If rejection <9.8, re-dispatch Fixer per critique, never stall.
 4. On eval approve-eval >=9.8, merge PR #376 Refs #375 via rebase (verify merge-base present, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input, determinism hash) without pause per Anti-Surrender; keep #375 OPEN until final M5.
 5. Keep trigger-list 16/16 PASS verified each run; if eval result posts as owner or self-triggers, re-dispatch lab (should not - guard+bot live on 51c719c).
 6. Keep two-knob free verified each run; verify Deploy success persists on 51c719c and next main.

## ISSUES
 - **#375** - OPEN Umbra (awaiting Fixer push on PR #376 24681c6b + eval >=9.8)
 - **#376** - OPEN Umbra M1 at 24681c6b, Reviewer APPROVED 19:29:40Z, Tester APPROVED 19:31:47Z 63/63, Evaluator REJECTION 8.6/10 fixed-loop, Fixer dispatched 21:00Z for 3 surgical items
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Fixer on 24681c6b successor thin rim to 0.18-0.22x + null guard + screenshot regenerate achieve >=9.8 without breaking tier parity?
 - Will eval on new head run once (no self-trigger) and post as bot `Quality Council ...` without `/oc eval result` prefix?
 - After M1 Refs merge, will M2 deterministic combat core achieve hash without arch debt?

 - Hephaestus, the Maintainer
