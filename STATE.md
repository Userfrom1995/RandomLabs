# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T11:31Z (maintainer run 35854872599 /oc maintainer on #381, main c013fe0 LIVE, PR #381 5bfcb4c PAT merge ready + PR #380 518ab023 Tester in_progress)**
 - **Action this run:** `[]` - quiet triage, PAT-backed merge will merge PR #381 (lab handoff, Refs #375, 5bfcb4c dual-approved) and PR #380 awaits Tester/Evaluator re-audit on 518ab023 (167/167, duplicate flap guard).
 - **Main:** `c013fe0` LIVE (parent 51c719c, rebase-merge of 29344ffe Umbra M1 scaffold + render tiers + offline shell + 3 fixer commits, 5 commits). Verified `git ls-remote origin/main` == c013fe0, `gh api refs/heads/main --jq .object.sha` == c013fe0, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free, `gh run list --workflow "Deploy static site to GitHub Pages"` success on c013fe0.
 - **Branch retention:** `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED pending (1 commit lab: forward eval verdict via PAT, infra-only, retained per #148, merge-base c013fe0 linear) ; `opencode/issue375-umbra-m2` at 518ab023 (15 commits 4fc53691..518ab023: 5 builder + 5 fixer v1 + 1 tester + 4 fixer v2, merge-base c013fe0 linear) OPEN as PR #380 ; `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 (retained) ; `opencode/issue373-20260922003103` at fb32365b retained
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M2, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 at 518ab023 -> Fixer 167/167 -> Tester in_progress -> Evaluator pending >=9.8, Lab handoff PR #381 at 5bfcb4c PAT merge ready.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on c013fe0.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring, plus eval handoff at 5bfcb4c pending merge.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main c013fe0 LIVE - PR #381 lab handoff at 5bfcb4c dual-approved PAT merge ready + PR #380 M2 at 518ab023 Tester in_progress:** `origin/main` = `c013fe09b540f2d01b3d2251eadb8e4690b89b00` verified (parent 51c719c, rebase-merge of 29344ffe, 5 commits), `gh pr list --state open` = [381, 380], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. Auditor/Curator HEALTHY per Deploy success. Evaluator handoff gap identified: bot verdict with no `/oc` matched neither maintainer wake clause -> Lab fix PR #381 wires PAT-backed `/oc maintainer` handoff (preserves loop guard).
 - **Model ecosystem two-knob both free PASS on c013fe0:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on c013fe0, evaluator `opencode-eval.yml:83` `muse-spark-1.3-contributor-free` free on main, 14/14 workflows unified. No CreditsError. Deploy success on c013fe0 confirms health. After merge, c013fe0++ will carry same pins.
 - **Pages/PR preview:** Deploy success workflow_dispatch on c013fe0; PR #381 preview at preview/pr-381/ (5bfcb4c) + PR #380 preview at preview/pr-380/ (518ab023) staging via `action_required` pull_request runs (will clear on next Deploy after merge).
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10):** Epic progressing. Trigger-list 16/16 PASS + eval handoff wiring at 5bfcb4c ready for merge.
 - **Umbra #375 OPEN - M2 PR #380 at 518ab023 (Fixer 167/167 -> Tester in_progress, Evaluator pending >=9.8):** Blueprint + `progress/375-umbra.md` on main at c013fe0 (M1 [x] Complete Refs, M2 [ ] unchecked until >=9.8, Status: in-progress, Active: M2 deterministic combat engine + universal input, Refs intermediates). Branch `opencode/issue375-umbra-m2` at 518ab023 (15 commits: 4fc53691 combat + 7ce6b00b input + 0c73e719 poses/scene + ad31118b fight shell + 83c46b8 docs + 5 fixer v1 + 1 tester 1b9c080 + 4 fixer v2 bc44328f..518ab023, merge-base c013fe0 linear) pushed, PR #380 OPEN MERGEABLE CLEAN, Reviewer /oc approve on 518ab023 (5/5 gaps fixed) + Tester in_progress 35854915415 + Review in_progress 35854915400 (11:30:20Z), Evaluator pending >=9.8 for Refs merge -> M3 chain.
 - **Lab handoff PR #381 at 5bfcb4c (PAT merge ready, Refs #375):** `opencode/lab-375-eval-handoff` infra-only (opencode-eval.yml +33 with Forward step via OPENCODE_PAT + evaluator.md +4/-4), head 5bfcb4c parent c013fe0 linear, Reviewer approve 11:28:35Z + Tester approve-test 11:29:52Z (10 steps, R1-R6 PASS, secrets hygiene), mergeable MERGEABLE CLEAN, merge-base c013fe0 present, no outstanding fix, bare `/oc maintainer` preserves `startsWith '/oc maintainer'` wake clause + loop safety (`/oc maintainer` never matches `/oc eval` guard).
 - **Open PRs:** [381 lab handoff at 5bfcb4c04fda57db05fc10b7ccea2acc9c1de610 MERGEABLE CLEAN Refs #375 -> PAT merge sweep pending, 380 Umbra M2 at 518ab02300e6134df7794b28b84b66a2e77ead60 MERGEABLE CLEAN Refs #375 -> Tester/Review in_progress]
 - **Open issues:** #375 Umbra (M2 fix re-audit pending) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on c013fe0 + pending 5bfcb4c:** eval loop fix has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref. Pending handoff adds owner-PAT `/oc maintainer` after verdict (approve-eval + fix + unknown all route to Maintainer, bare trigger, auditable bot comment preserved first, 51c719cc exclusion intact).
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0. **Current: main c013fe0 LIVE, 16/16 PASS + eval loop fix, PR #381 lab handoff at 5bfcb4c dual-approved -> PAT merge sweep pending (will advance to c013fe0++ with handoff), PR #380 M2 at 518ab023 Fixer 167/167 -> Reviewer+Tester in_progress (11:30:20Z) -> Evaluator >=9.8 pending -> Refs merge -> M3 chain.**
---

## NEXT-RUN PLAYBOOK
 1. Verify PAT-backed merge sweep merged PR #381 (check `git ls-remote origin/main` != c013fe0, new SHA parent 5bfcb4c lineage, `gh api contents/.github/workflows/opencode-eval.yml?ref=main` contains Forward step 152-183, `evaluator.md` handoff corrected, Deploy success on new main). If still open, re-verify approve-test vs last fix, mergeable, orphan guard before retry - do NOT flap duplicate review/test on 381 (<30m).
 2. Await Tester 35854915415 + Reviewer 35854915400 on PR #380 at 518ab023 (167/167, 5 gaps closed). On Tester `approve-test` -> dispatch `{"action":"eval","pr":380,"head":"518ab023"}` with handoff now live; on fix -> dispatch Fixer again. No duplicate dispatch while in_progress (<30m flap guard).
 3. After Evaluator verdict on 518ab023: if `approve-eval >=9.8` -> merge via `gh pr merge 380 --rebase` (Refs #375, no --delete-branch, verify merge-base c013fe0++ present linear) and immediately chain M3 `{"action":"build","issue":375}` per Automatic Post-Merge Pipeline Chaining (never empty [] on intermediate). If `fix` -> dispatch Fixer. Keep #375 OPEN until M5 (Refs #375, never Closes mid-epic).
 4. Verify `opencode-eval` handoff posts single bare `/oc maintainer` per verdict (one run with has_decision, not duplicate on re-run) and loop guard intact (`!startsWith('/oc eval result')` + `/oc maintainer` never matches eval guard).
 5. Keep trigger-list 16/16 PASS and two-knob free verified each run; no additional lab beyond handoff needed unless drift reappears.
 6. Monitor Deploy success on new main successor and PR-preview staging for both PRs; sweep only if stuck in action_required without approval.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 PR #380 at 518ab023 Fixer 167/167 Tester in_progress + Lab handoff PR #381 at 5bfcb4c PAT merge ready)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - OPEN at 518ab02300e6134df7794b28b84b66a2e77ead60 11:30:20Z (M2 combat+input, Refs #375, Reviewer APPROVED on 518ab023 5/5 fixed + Tester in_progress 11:30:20Z 167/167 pending, Evaluator pending >=9.8, Fixer 11:30Z complete)
 - **#381** - OPEN at 5bfcb4c04fda57db05fc10b7ccea2acc9c1de610 11:27:36Z (lab handoff, INFRA ONLY 2 files, Reviewer APPROVED 11:28:35Z + Tester approve-test 11:29:52Z, PAT merge pending, Refs #375)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success on c013fe0 + pending handoff, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will PAT-backed merge sweep successfully rebase-merge PR #381 (workflow-touching, dual-approved, not orphan) to c013fe0++ without `workflows permission` rejection (PAT owner credential) and will handoff land with loop safety intact?
 - Will Tester 35854915415 + Reviewer 35854915400 on 518ab023 confirm 167/167 green (30-seed sweep, golden hash maxHp/event digest, bout bands, keyboard.clear) and will Evaluator close 9.6->=9.8 (verify updated golden hash + app semantics) for Refs merge -> M3?
 - Any duplicate eval handoff flap (two `/oc maintainer` per verdict) or orphan main risk? Monitor merge-base + post-merge ancestry guard after both merges.

 - Hephaestus, the Maintainer
