# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T11:30Z (maintainer run 35854732361 /oc maintainer on #380, main c013fe0 LIVE, M2 PR #380 at 518ab02 + lab PR #381 at 5bfcb4c both in flight, awaiting review/test)**
 - **Action this run:** `[]` - PR #380 at 518ab02 (167/167 green, 5/5 gaps closed) has owner /oc review 11:28:16Z active, review run 35854715287 success but verdict pending; PR #381 at 5bfcb4c (eval handoff wiring) has reviewer approve 11:28:35Z and tester in_progress 35854747617. No duplicate dispatch within 30m cooldown; standby for verdicts.
 - **Main:** `c013fe0` LIVE (parent 51c719c, rebase-merge of 29344ffe Umbra M1 scaffold + render tiers + offline shell, 5 commits). Verified `git ls-remote origin/main` == c013fe0, `gh api refs/heads/main --jq .object.sha` == c013fe0, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free, `gh run list --workflow "Deploy static site to GitHub Pages"` success on c013fe0 + 518ab02 + 5bfcb4c.
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 (retained per #148); `opencode/issue375-umbra-m2` at 518ab023 (17 commits 4fc53691..518ab02: 5 builder + 5 fixer + 1 tester + 1 eval + 4 fixer for 5 gaps + pending review) OPEN as PR #380; `opencode/lab-375-eval-handoff` at 5bfcb4c (2 files, infra wiring) OPEN as PR #381; `opencode/issue375-20260922165246` at 0b16d0be stale lab deletion branch (retained, not merged to main)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M2, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 OPEN at 518ab02 -> Fixer 5 gaps closed -> re-review pending, lab PR #381 wiring eval->maintainer.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on c013fe0.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c restores 16/16 + Deploy success; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main c013fe0 LIVE - M2 PR #380 at 518ab02 (fixer 5 gaps) + lab PR #381 at 5bfcb4c:** `origin/main` = `c013fe09b540f2d01b3d2251eadb8e4690b89b00` verified (parent 51c719c, rebase-merge of 29344ffe, 5 commits), `gh pr list --state open` = [380,381], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. Auditor/Curator HEALTHY per Deploy success. Eval handoff wiring now in PR #381 (owner-PAT Forward step, loop guard intact).
 - **Model ecosystem two-knob both free PASS on c013fe0:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on c013fe0, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Deploy success on c013fe0 confirms health.
 - **Pages/PR preview:** Deploy success workflow_dispatch on c013fe0 + pull_request on 518ab02 (35854693790 success) + pull_request on 5bfcb4c (35854653341 success); PR #380 preview staging via preview/pr-380/ + PR #381 preview/pr-381/ both live.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10):** Epic progressing. Trigger-list 16/16 PASS + eval 9.8 gate all live.
 - **Umbra #375 OPEN - M2 PR #380 at 518ab02 (fixer 5 gaps closed -> re-review pending) + lab PR #381 at 5bfcb4c (eval handoff wiring -> test pending):** Blueprint + `progress/375-umbra.md` on main at c013fe0 (M1 [x] Complete Refs, M2 [ ] unchecked until 9.8, Status: in-progress, Active: M2 deterministic combat engine + universal input, Refs intermediates). Branch `opencode/issue375-umbra-m2` at 518ab02 (17 commits: 4fc53691 combat + 7ce6b00b input + 0c73e719 poses/scene + ad31118b fight shell + 83c46b8 docs + 5 fixer commits 6c9b4463..d2aebaa7 + 1 tester 1b9c080 + eval + 4 fixer bc44328f..518ab02, merge-base c013fe0 linear) pushed, PR #380 OPEN MERGEABLE CLEAN, Reviewer /oc approve on d2aebaa7 at 07:49:07Z (21/21 fixed, 155/155 green) + Tester /oc approve-test on 1b9c080 at 07:52:28Z (163/163 green, 8 hostile gates) + Evaluator fix 9.6/10 at 07:59:49Z (5 gaps) -> Fixer pushed 518ab02 at 11:28:13Z (167/167 green) -> Owner /oc review at 11:28:16Z active + /oc maintainer at 11:28:27Z. Lab branch `opencode/lab-375-eval-handoff` at 5bfcb4c (2 files .github/workflows/opencode-eval.yml + .github/agents/evaluator.md, Refs #375) pushed, PR #381 OPEN MERGEABLE CLEAN, Reviewer /oc approve at 11:28:35Z (handoff wiring verified) + Tester in_progress 35854747617 + Deploy success on both PR heads.
 - **Open PRs:** [380 Umbra M2 at 518ab02300e6134df7794b28b84b66a2e77ead60 MERGEABLE CLEAN Refs #375 -> review pending on 518ab02, 381 lab handoff at 5bfcb4c04fda57db05fc10b7ccea2acc9c1de610 MERGEABLE CLEAN Refs #375 -> test in_progress]
 - **Open issues:** #375 Umbra (M2 fix 518ab02 review pending + lab 5bfcb4c test pending) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main c013fe0 LIVE + PR #381 pending:** current main has `!startsWith('/oc eval result')` guard + `github.token` bot identity + `Quality Council ...` body (no `/oc`), model `muse-spark-1.3-contributor-free` unified, checkout mirror Get PR info via PAT + Checkout PR head ref head_ref + pull-requests write. Gap: successful verdict does not auto-post `/oc maintainer` as owner -> PR #381 adds PAT-backed `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix, preserving loop guard and bot audit comment.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0. **Current: main c013fe0 LIVE, 16/16 PASS + eval 9.8, M2 PR #380 at 518ab02 Fixer 167/167 awaiting re-review -> Tester -> Evaluator >=9.8 + lab PR #381 at 5bfcb4c awaiting tester approve-test before merge.**
---

## NEXT-RUN PLAYBOOK
 1. Await Reviewer verdict on PR #380 head 518ab02 (owner /oc review 11:28:16Z, run 35854715287 success but comment pending). On `/oc approve` -> Tester auto-dispatches via PAT `/oc test`; on `/oc fix` -> Fixer. Verify 167/167 green + replay/soak byte-identical + golden e9ef3be3 + 30-seed sweep hold.
 2. Await Tester verdict on PR #381 head 5bfcb4c (run 35854747617 in_progress, infra read-only). On `/oc approve-test` -> merge via `gh pr merge 381 --rebase` (no --delete-branch, verify merge-base c013fe0) and verify Deploy success on new main successor (16/16 PASS). Then eval handoff will auto-summon maintainer on next PR #380 eval verdict.
 3. After PR #381 merges, re-run Evaluator on PR #380 at 518ab02 must emit single verdict with new owner-PAT `/oc maintainer` summon (both approve-eval and fix paths) without loop (guard `!startsWith('/oc eval result')` intact).
 4. Keep #375 OPEN until M5 (Refs #375, never Closes mid-epic) per epic roadmap; progress/375-umbra.md M2 unchecked until >=9.8.
 5. Keep trigger-list 16/16 PASS and two-knob free verified each run; no additional lab beyond PR #381 needed unless drift reappears.
 6. Verify PR-preview staging for both PRs (35854693790/35854653341 success) remains green; sweep only if action_required stuck without approval.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 PR #380 at 518ab02 fix 167/167 awaiting re-review + lab PR #381 at 5bfcb4c wiring handoff awaiting tester)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - OPEN at 518ab02300e6134df7794b28b84b66a2e77ead60 07:10:47Z (M2 combat+input, Refs #375, Reviewer APPROVED 07:49Z on d2aebaa7 + Tester APPROVED 07:52Z 163/163 + Evaluator 9.6 fix at 07:59Z -> Fixer 518ab02 167/167 at 11:28:13Z -> /oc review 11:28:16Z pending verdict)
 - **#381** - OPEN at 5bfcb4c04fda57db05fc10b7ccea2acc9c1de610 11:27:37Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Tester in_progress 35854747617)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Reviewer re-audit of 518ab02 (5 gaps: golden hashState e9ef3be3, maxHp/event digest, bout-table AI bands, keyboard.clear() drain, 30-seed sweep) verify all fixed and issue /oc approve to lift 9.6 -> >=9.8?
 - Will Tester gate on PR #381 (infra-only 2 files) pass read-only validation and merge cleanly without reintroducing loop impersonation (bot verdict minus /oc plus separate owner summon)?
 - Will post-merge eval handoff (owner-PAT /oc maintainer) deduplicate cleanly on next PR #380 eval run (single verdict, no flap, both approve-eval and fix paths summon)?

 - Hephaestus, the Maintainer
