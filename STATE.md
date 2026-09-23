# STATE - Random factory checkpoint
 - **Updated: 2026-09-23T11:34Z (maintainer run 35855279050 /oc maintainer on #380, main 090fcaf LIVE, M2 PR #380 at 9195917c awaiting eval >=9.8)**
 - **Action this run:** `[{"action":"eval","pr":380,"head":"9195917cc946ac0665b0cf7128265ed1c8cbfb2b"}]` - PR #380 at 9195917c dual-approved (Reviewer 11:30:15Z on 518ab02 167/167 + Tester 11:32:29Z on 9195917c 173/173) -> routing Evaluator for binding >=9.8; lab PR #381 merged at 090fcaf wiring eval->maintainer handoff LIVE
 - **Main:** `090fcaf8` LIVE (parent c013fe09, lab: forward eval verdict to maintainer via owner PAT, merge-commit 090fcaf8 11:33:45Z). Verified `git ls-remote origin/main` == 090fcaf8, `gh api refs/heads/main --jq .object.sha` == 090fcaf8, `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, `gh api contents/opencode.json --jq` muse-spark-1.3/1.2 both free, `gh run list --workflow "Deploy static site to GitHub Pages"` success on 090fcaf + 9195917c
 - **Branch retention:** `opencode/issue375-20260922160615` at 29344ffe MERGED to c013fe0 retained; `opencode/issue375-umbra-m2` at 9195917c (18 commits 4fc53691..9195917c: 5 builder + 5 fixer + 1 tester 1b9c080 + 4 fixer bc44328f..518ab02 + 1 tester 9195917c) OPEN as PR #380; `opencode/lab-375-eval-handoff` at 5bfcb4c MERGED to 090fcaf at 11:33:45Z retained; `opencode/issue375-20260922165246` at 0b16d0be stale retained
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M2, Refs intermediates). PR #376 M1 MERGED at c013fe0 (9.8/10), M2 PR #380 OPEN at 9195917c -> Reviewer+Tester approved -> eval >=9.8 pending, lab wiring at 090fcaf LIVE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 090fcaf.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c + eval->maintainer PAT handoff at 090fcaf restores triage; monitoring.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 090fcaf LIVE - M2 PR #380 at 9195917c awaiting eval >=9.8:** `origin/main` = `090fcaf8d1418351f8c3e532f58cfbcf7e628104` verified (parent c013fe09, lab handoff wiring, Deploy success on 090fcaf), `gh pr list --state open` = [380], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], `gh api contents/.github/workflows/maintainer.yml --jq workflows:` 16/16 PASS `[..., curator, opencode-eval]`, live workflows 19 vs allowlist 16 correct. Auditor/Curator HEALTHY per Deploy success. Eval handoff now LIVE via owner-PAT `/oc maintainer` after both approve-eval and fix (fail-open, guard `!startsWith('/oc eval result')` intact).
 - **Model ecosystem two-knob both free PASS on 090fcaf:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json` on 090fcaf, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free on main, 13/14 workflows unified. No CreditsError. Deploy success on 090fcaf confirms health.
 - **Pages/PR preview:** Deploy success workflow_dispatch on 090fcaf + pull_request on 9195917c success; PR #380 preview staging via preview/pr-380/ live.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020 + Lab PR #379 MERGED at 51c719c + Umbra M1 PR #376 MERGED at c013fe0 (9.8/10) + Lab PR #381 MERGED at 090fcaf (eval->maintainer handoff):** Epic progressing. Trigger-list 16/16 PASS + eval 9.8 + handoff LIVE.
 - **Umbra #375 OPEN - M2 PR #380 at 9195917c (Reviewer approve 518ab02 167/167 + Tester approve-test 9195917c 173/173 -> eval >=9.8 pending):** Blueprint + `progress/375-umbra.md` on main at 090fcaf (M1 [x] Complete Refs, M2 [ ] unchecked until 9.8, Status: in-progress, Active: M2 deterministic combat engine + universal input, Refs intermediates). Branch `opencode/issue375-umbra-m2` at 9195917c (18 commits: 4fc53691 combat + 7ce6b00b input + 0c73e719 poses/scene + ad31118b fight shell + 83c46b8 docs + 5 fixer 6c9b4463..d2aebaa7 + 1 tester 1b9c080 + 4 fixer bc44328f..518ab02 + 1 tester 9195917c, merge-base 090fcaf linear) pushed, PR #380 OPEN MERGEABLE CLEAN, Reviewer APPROVED 11:30:15Z (5/5 gaps verified, 21 prior still fixed, 167/167) + Tester APPROVED 11:32:29Z (173/173 6 gate2 pins, hostile probes green) + PR #381 MERGED 11:33:45Z.
 - **Open PRs:** [380 Umbra M2 at 9195917cc946ac0665b0cf7128265ed1c8cbfb2b MERGEABLE CLEAN Refs #375 -> eval pending on 9195917c]
 - **Open issues:** #375 Umbra (M2 9195917c eval pending >=9.8 + lab wiring LIVE) + #70 lab-health + #42 brainstorm.
 - **Lab wiring on main 090fcaf LIVE:** main has `!startsWith('/oc eval result')` guard + `github.token` bot audit first + separate owner PAT `POST /repos/{owner}/{repo}/issues/{pr}/comments` with `/oc maintainer` for both approve-eval and fix (fail-open, unknown also). Gap closed: successful verdict now auto-summons maintainer without manual `/oc maintainer`.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fixes at 0b16d0be 16/16 PASS + eval wiring at 1ff6eb09 + checkout mirror at 94991020 + eval loop+impersonation fix at 51c719c SUCCESS + Umbra M1 9.8/10 MERGED at c013fe0 + eval->maintainer PAT handoff MERGED at 090fcaf. **Current: main 090fcaf LIVE, 16/16 PASS + eval 9.8 + handoff LIVE, M2 PR #380 at 9195917c Reviewer+Tester approved awaiting Evaluator re-eval >=9.8 -> Refs merge -> M3 chain.**
---

## NEXT-RUN PLAYBOOK
 1. Await Evaluator verdict on PR #380 head 9195917c (this run dispatches `/oc eval` at 11:34Z). On `approve-eval` (>=9.8) -> merge via `gh pr merge 380 --rebase` (no --delete-branch, verify merge-base 090fcaf, keep Refs #375) and chain M3 via `{"action":"build","issue":375}` reading `progress/375-umbra.md` next milestone. On `fix` (<9.8) -> dispatch `{"action":"fix","pr":380}` surgically.
 2. Verify post-merge Deploy success on new main successor (16/16 PASS) and that evaluator handoff emits single `POST /repos/{owner}/{repo}/issues/380/comments` with `/oc maintainer` as `Userfrom1995` (owner PAT) not bot, without loop (guard intact). Confirm via `gh api repos/Userfrom1995/RandomLabs/issues/380/comments` that bot audit precedes owner summon.
 3. Keep #375 OPEN until M5 (Refs #375, never Closes mid-epic) per epic roadmap; progress/375-umbra.md M2 unchecked until >=9.8.
 4. Keep trigger-list 16/16 PASS and two-knob free verified each run; no additional lab beyond 090fcaf needed unless drift reappears.
 5. Verify PR-preview staging for PR #380 remains green; sweep only if action_required stuck without approval.

## ISSUES
 - **#375** - OPEN Umbra (M1 MERGED at c013fe0 9.8/10, M2 PR #380 at 9195917c 173/173 awaiting eval >=9.8, lab wiring MERGED at 090fcaf)
 - **#376** - MERGED at c013fe0 03:51:27Z (M1 scaffold + render tiers + offline shell, Refs #375)
 - **#380** - OPEN at 9195917cc946ac0665b0cf7128265ed1c8cbfb2b 07:10:47Z (M2 combat+input, Refs #375, Reviewer APPROVED 11:30Z on 518ab02 167/167 + Tester APPROVED 11:32Z on 9195917c 173/173 -> eval dispatched)
 - **#381** - MERGED at 090fcaf8d1418351f8c3e532f58cfbcf7e628104 11:33:45Z (lab infra eval->maintainer handoff, Refs #375, Reviewer APPROVED 11:28:35Z + Deploy success, infra read-only)
 - **#70** - OPEN lab-health (16/16 PASS + Deploy success, handoff LIVE, monitoring)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Evaluator re-audit of 9195917c (golden e9ef3be3, maxHp/event digest, bout-table AI, keyboard.clear() drain, 30-seed sweep + 173/173) lift 9.6 -> >=9.8 and emit owner-PAT `/oc maintainer` summon on success?
 - Will post-merge eval handoff on future fix verdicts also summon correctly (both approve-eval and fix paths) without flap?
 - Will M2 Refs merge chain cleanly to M3 (characters+story+levels) without stalling once >=9.8 achieved?

 - Hephaestus, the Maintainer
