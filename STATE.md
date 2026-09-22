# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T18:24Z (maintainer run 35766906813, PAT merge pending for PR #378 lab checkout fix, main 1ff6eb09 LIVE)**
 - **Action this run:** `[]` - PR #378 `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGEABLE, Reviewer APPROVED 18:22:53Z + Tester APPROVED 18:24:05Z (infra read-only, yaml.safe_load, pull-requests write, Get PR info + Checkout PR head via OPENCODE_PAT, zero PAT in container). Orphan check PASS (merge-base 1ff6eb09 present). Infra PR touches `.github/workflows/` so hardcoded PAT-backed merge step will rebase-merge it (no Maintainer `gh pr merge` with GITHUB_TOKEN). No other dispatch.
 - **Main:** `1ff6eb09` LIVE (M1-M5 doom at e33e11f1 + evaluator bootstrap at 5f15cef6 + lab trigger-list fix at 0b16d0be + lab eval wiring at 1ff6eb09). Verified `git ls-remote origin/main` == 1ff6eb0939fa3fe08f81189c9a524676ffaf0282 == `gh api refs/heads/main` == 1ff6eb09, `gh pr list --state open` = [376 Umbra M1 at c19a3fe8 MERGEABLE, 378 lab checkout fix at 8868a31 MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval + eval wiring (test|eval), `progress/375-umbra.md` on branch head M1 complete awaiting eval rerun (not yet on main).
 - **Branch retention:** `opencode/issue362-*` retained MERGED; `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at c19a3fe8 OPEN PR #376 (Builder M1 + Fixer 4 blocks + Tester redteam 63/63, Reviewer APPROVED, Tester APPROVED, Evaluator FAILED - awaiting Lab fix then rerun); `opencode/lab-376-eval-checkout-fix` at 8868a31 OPEN PR #378 (Lab Engineer checkout fix, Reviewer+Tester APPROVED, pending PAT merge)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint + progress M1-M5, Builder M1 70e0cb52 + Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, Evaluator FAILED 18:04:53Z (403 checkout bug) -> Lab on PR #376 re-dispatched 18:15Z to fix opencode-eval 403 -> Lab PR #378 at 8868a31 surgical fix (Get PR info + Checkout PR head + pull-requests write, keep muse-spark-1.3). Awaiting PAT merge then `{"action":"eval","pr":376}` rerun >=9.8 before Refs #375 merge and M2 chain. (Owner 16:50:08Z directive satisfied at 1ff6eb09 wiring; this is scope-correct patch on top)
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 1ff6eb09.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 restores 16/16 + eval knob, eval checkout bug was final blocker now patched at 8868a31 pending merge.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 1ff6eb09 LIVE - eval wiring COMPLETE, eval checkout fix PENDING MERGE (PAT sweep):** `origin/main` = `1ff6eb0939fa3fe08f81189c9a524676ffaf0282` verified (parent 0b16d0be), `gh pr list --state open` = [376, 378] both MERGEABLE (merge-base 1ff6eb09 present, linearizes), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval + `maintainer.yml:198` includes test|eval + `maintainer.yml:548` elif eval -> /oc eval). Evaluator 35764829287 FAILED due to 403 + checkout on main - Lab PR #378 corrects it; PAT sweep after this run will land it.
 - **Model ecosystem two-knob both free PASS on 1ff6eb09, unified:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` on main still `muse-spark-1.3-contributor-free` (kept), 13/14 workflows unified zero deepseek pins. Branch 8868a31 same model verified by Tester.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; PR #378 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-378/ staging; Deploy success on 0b16d0be verified, successor Deploy on 1ff6eb09 pending successor after 8868a31 merge; no sweep needed yet beyond auto.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09:** Epic complete. Trigger-list 16/16 + eval wiring restored. Two-knob free unified. Eval checkout bug is final blocker patched in PR #378 pending PAT merge.
 - **Umbra #375 OPEN - Lab PR #378 checkout fix PENDING PAT MERGE:** Blueprint + `progress/375-umbra.md` on branch head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at c19a3fe8 OPEN, Refs #375. Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, Evaluator FAILED 18:04:53Z. Lab PR #378 `opencode/lab-376-eval-checkout-fix` at 8868a31 OPEN, Refs #375, 1 file +13/-4, Reviewer APPROVED 18:22:53Z (16 checks, containment PASS, yaml clean, mergeable), Tester APPROVED 18:24:05Z (7 checks infra read-only, silent-stall 6/6). PAT-backed merge sweep will land it; next run dispatches `{"action":"eval","pr":376}` on c19a3fe8 (>=9.8) -> Refs merge -> M2 chain without pause per Anti-Surrender.
 - **Open PRs:** [376 Umbra M1 at c19a3fe8 OPEN awaiting eval rerun, 378 Lab checkout fix at 8868a31 OPEN MERGEABLE awaiting PAT merge]
 - **Open issues:** #375 Umbra (M1 awaiting Evaluator >=9.8 after Lab fix, 7 binding gates) + #70 lab-health + #42 brainstorm.
 - **Lab wiring complete live on main + eval checkout fix on PR head (pending main):** maintainer.yml eval wiring + opencode-eval.yml model unify MERGED at 1ff6eb09 per owner 16:50:08Z, all checks PASS; opencode-eval.yml checkout/permissions patch at 8868a31 will be on successor main after PAT sweep (permissions write + Get PR info via OPENCODE_PAT + Checkout PR head ref + Read deliverable context via PAT).
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval knob live BUT eval checkout 403 blocked gate (first Lab dispatch was no-op at 1ff6eb09, second dispatch produced PR #378 at 8868a31). **Current: main 1ff6eb09 LIVE, trigger-list 16/16 PASS + eval wiring, two-knob free unified, PR #376 M1 at c19a3fe8 Reviewer APPROVED + Tester APPROVED 63/63 but Evaluator FAILED 18:04:53Z on main checkout bug -> Lab PR #378 at 8868a31 fixes opencode-eval.yml checkout to PR head + pull-requests write, APPROVED 16+7 checks, pending PAT merge.**
---

## NEXT-RUN PLAYBOOK
 1. Verify PAT-backed merge of PR #378: `git ls-remote origin/main` must advance beyond 1ff6eb09 to successor with 8868a31 merged. Verify `gh api contents/.github/workflows/opencode-eval.yml?ref=main` now has `permissions: pull-requests: write` (no `actions: read`), `Get PR info` step with `OPENCODE_PAT` + `head_ref`, `Checkout repository (PR head)` with `ref: head_ref`, `Read deliverable context` with `OPENCODE_PAT`, model `muse-spark-1.3-contributor-free`, `yaml.safe_load` parse clean, `bash -n` passes. Verify Deploy green on successor (`gh run list --workflow "Deploy static site to GitHub Pages"` success).
 2. On Lab merge confirmed, immediately dispatch `{"action":"eval","pr":376}` on c19a3fe8 (flap guard: prior eval failure at 18:04:53Z stale >20m, Lab just merged so fresh). Verify eval run lands on PR head c19a3fe8 not main (gh run view head_branch/head_sha).
 3. On Evaluator approve-eval >=9.8 (verify /tmp/evaluator-decision.json present, score >=9.8, no missing Tester gate, dimensions >= threshold), merge Refs #375 via rebase (verify merge-base ancestor present after fetch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input) without pause per Anti-Surrender. If fix rejection, route per critique to `{"action":"fix","pr":376}` or `{"action":"architect","pr":376}` as verdict demands.
 4. Keep trigger-list 16/16 PASS verified each run; after eval rerun verify eval run on PR head c19a3fe8 (not main) and head_branch PR, conclusion success.
 5. Keep two-knob free verified each run; verify Deploy green on successor each run; close PR #378 via merge (already), keep #375 OPEN until final M5.

## ISSUES
 - **#375** - OPEN Umbra (Evaluator FAILED - Lab fix PR #378 pending PAT merge then rerun >=9.8, 7 binding gates)
 - **#376** - OPEN Umbra M1 at c19a3fe8, Reviewer APPROVED, Tester APPROVED, Evaluator FAILED (Lab PR #378 at 8868a31 surgical fix APPROVED, awaiting PAT merge then eval rerun), Refs #375
 - **#378** - OPEN Lab checkout fix at 8868a31, Reviewer APPROVED 18:22:53Z, Tester APPROVED 18:24:05Z, MERGEABLE, awaiting PAT merge (Refs #375 infra; will unblock Umbra M1 eval)
 - **#70** - OPEN lab-health (16/16 PASS + eval wiring + Deploy pending successor, eval fix will restore gate)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will PAT-backed merge land PR #378 8868a31 on main without orphan (merge-base 1ff6eb09 present, MERGEABLE, approve-test fresh <1h) and will Deploy stay green on successor? Next run will verify `git ls-remote origin/main` != 1ff6eb09 and `gh api contents/.github/workflows/opencode-eval.yml` now has Get PR info + Checkout PR head.
 - After Lab fix merges, will Evaluator `muse-spark-1.3` on PR #376 c19a3fe8 grade >=9.8 allowing Refs merge and immediate M2 chain per blueprint (combat determinism + universal input)?
 - Will trigger-list 16/16 + eval wiring remain PASS and two-knob free hold after successor?

 - Hephaestus, the Maintainer
