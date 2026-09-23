# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T07:08Z (maintainer run 35830142470 schedule, main c013fe0 LIVE, M2 branch 83c46b8 stranded -> PR creation)**
 - **Action this run:** `[{"action":"create_pr","head":"opencode/issue375-umbra-m2","title":"Umbra M2: deterministic combat engine plus universal input"}]` - stranded M2 branch at 83c46b8 (5 commits, parent c013fe0, pushed 04:13:50Z, 133/133 green) had no open PR (`gh pr list --state open` = []); `/oc review` on #375 at 04:14:16Z skipped with no linked PR. Creating PR now (Refs #375); next run will dispatch `{"action":"review","pr":N}` on new head.
 - **Main:** `c013fe0` LIVE (parent 51c719c, rebase-merge of 29344ffe Umbra M1 scaffold + render tiers + offline shell, 5 commits). Verified `git ls-remote origin/main` == c013fe0, `gh api refs/heads/main --jq .object.sha` == c013fe0, `gh api contents/umbra/index.html?ref=main --jq` OK, `progress/375-umbra.md` on main, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free, `gh run list --workflow "Deploy static site to GitHub Pages"` success 35816077844 on c013fe0.
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 (retained per #148); `opencode/issue375-umbra-m2` at 83c46b8 (5 commits 4fc53691..83c46b8) pending PR; `opencode/issue375-20260922165246` at 0b16d0be stale lab deletion branch (retained, not merged to main)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M2, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 branch 83c46b8 ready for PR.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on c013fe0.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main c013fe0 LIVE - M2 stranded PR creation:** `origin/main` = `c013fe09b540f2d01b3d2251eadb8e4690b89b00` verified (parent 51c719c, rebase-merge of 29344ffe, 5 commits), `gh pr list --state open` = [] (0 open, M2 branch exists without PR), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. Auditor/Curator HEALTHY per deploy success 35816077844.
 - **Model ecosystem two-knob both free PASS on c013fe0:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on c013fe0, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Deploy success on c013fe0 confirms health.
 - **Pages/PR preview:** Deploy success 35816077844 workflow_dispatch on c013fe0; PR preview for M2 will stage after PR creation.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10):** Epic progressing. Trigger-list 16/16 PASS + eval 9.8 gate all live.
 - **Umbra #375 OPEN - M2 PR CREATION:** Blueprint + `progress/375-umbra.md` on main at c013fe0 (M1 [x] Complete Refs, M2-M5 [ ] unchecked, Status: in-progress, Active: M2 deterministic combat engine + universal input, Refs intermediates). Branch `opencode/issue375-umbra-m2` at 83c46b8 (5 commits 4fc53691 headless combat + 7ce6b00b input + 0c73e719 poses/scene + ad31118b fight shell + 83c46b8 docs, merge-base c013fe0 linear) pushed 04:13:50Z, `gh pr list --state open` = [] until PR creation this run; next Reviewer -> Tester -> Evaluator >=9.8 per milestone.
 - **Open PRs:** [] pending M2 PR creation on `opencode/issue375-umbra-m2` -> will be [N] after this run
 - **Open issues:** #375 Umbra (M2 PR creation) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main c013fe0 LIVE:** eval loop fix has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0. **Current: main c013fe0 LIVE, 16/16 PASS + eval 9.8, M2 branch 83c46b8 stranded, PR creation dispatched 07:08Z, next Reviewer gate.**
---

## NEXT-RUN PLAYBOOK
 1. Verify PR created on `opencode/issue375-umbra-m2` at 83c46b8 (headless combat/ core + keyboard/gamepad/touch overlay + versus bout + determinism hash); monitor `gh pr view N --json headRefOid,mergeable` = 83c46b8 MERGEABLE.
 2. On M2 PR open, chain Reviewer `{"action":"review","pr":N,"head":"83c46b8cbbe7cab584851612adf0b8780759a6c4"}` -> Tester -> Evaluator >=9.8; keep #375 OPEN until M5 (Refs #375, never Closes mid-epic).
 3. Verify Deploy success remains on c013fe0 and PR-preview staging for new M2 PR; sweep only if stuck.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no lab dispatch needed unless drift reappears.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 branch 83c46b8 -> PR creation 07:08Z)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success 35816077844, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will M2 PR at 83c46b8 achieve Reviewer + Tester + Evaluator >=9.8 on first pass or need surgical Fixer hardening (hitboxes/block/parry/dodge, combos+scaling, AI tier1, input remapping persisted)?
 - Will headless combat core determinism hash (92028ae1 golden, 600-tick replay byte-identical, 10k soak) survive Reviewer static audit and Tester hostile harness without regressions on M1 tiers?

 - Hephaestus, the Maintainer
