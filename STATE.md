# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T18:55Z (maintainer run 35770452067, main 94991020 LIVE, re-dispatch lab for eval version-fetch auth)**
 - **Action this run:** `[{"action":"lab","pr":376}]` - Evaluator 35769769470 failed 18:49:45Z on 94991020 (Get opencode version curl -sf 403 unauth, 183 ms, no decision) + 35764829287 on 1ff6eb09. Lab checkout mirror 94991020 live (Get PR info via OPENCODE_PAT + Checkout PR head ref head_ref, pull-requests write) verified, but Get opencode version still unauthenticated curl -sf without GH_TOKEN. Prior Lab 35770238280 at 18:53:58Z returned success with no edit (verified already live, tree clean) - not a fix. Re-dispatched Lab on PR #376 to harden version fetch (GH_TOKEN auth, gh api fallback, --retry 3, || true graceful fallback to latest).
 - **Main:** `94991020` LIVE (M1-M5 doom at e33e11f1 + evaluator bootstrap at 5f15cef6 + lab trigger-list fix at 0b16d0be + lab eval wiring at 1ff6eb09 + lab eval checkout mirror at 94991020). Verified `gh api refs/heads/main` == 94991020 (parent 1ff6eb09), `gh pr list --state open` = [376 Umbra M1 at c19a3fe8 MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval (line 38 `[..., curator, opencode-eval]`), `progress/375-umbra.md` on branch head M1 complete awaiting eval rerun, Deploy 35767191697 success on 94991020 (workflow_dispatch), last Lab 35770238280 success no-op at 18:53:58Z.
 - **Branch retention:** `opencode/issue362-*` retained MERGED; `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at c19a3fe8 OPEN PR #376 (Builder M1 + Fixer 4 blocks + Tester redteam 63/63, Reviewer APPROVED, Tester APPROVED, Evaluator FAILED twice - version-fetch auth hardening re-dispatched); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020 at 18:26:40Z (1 file .github/workflows/opencode-eval.yml, checkout mirror)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). Builder M1 70e0cb52 + Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, Evaluator FAILED 18:04:53Z + 18:49:45Z (version-fetch 403 unauth, no decision) -> Lab checkout mirror at 94991020 SUCCESS but version-fetch auth still hardening re-dispatched. (Owner 18:53:58Z /oc lab no-op, /oc eval 18:49:42Z triggers failing run; Owner 16:50:08Z directive satisfied at 1ff6eb09 wiring)
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 94991020.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 restores 16/16 + Deploy 35767191697 success; eval version-fetch auth hardening pending.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 94991020 LIVE - version-fetch auth hardening needed:** `origin/main` = `949910204d6bacfb0723a9a96a06d2e590c555d6` verified (parent 1ff6eb09, rebase-merge of 8868a31), `gh pr list --state open` = [376] MERGEABLE (merge-base 1ff6eb09 present via 0b16d0be, linearizes), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:71` model muse-spark-1.3 free). Evaluator 35769769470 FAILED 18:49:45Z due to `curl -sf https://api.github.com/repos/anomalyco/opencode/releases/latest` exit 1 (unauthenticated 403/rate-limit, 183 ms, no decision) + 35764829287 same - Lab fix needed (auth GH_TOKEN/gh api + retry + fallback, plus existing Get PR info + Checkout PR head). Checkout mirror (Get PR info + Checkout PR head ref head_ref, pull-requests write, yaml.safe_load, bash -n) already PASS. Last Lab 35770238280 at 18:53:58Z was verify-only no-op.
 - **Model ecosystem two-knob both free PASS on 94991020, unified:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free (kept), 13/14 workflows unified zero deepseek drift. Branch c19a3fe8 same model; no CreditsError.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy 35767191697 success on 94991020 (workflow_dispatch 18:26:44Z), prior Deploy on 0b16d0be 00:36:45Z; no sweep needed.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020:** Epic complete. Trigger-list 16/16 PASS + eval wiring + eval checkout mirror all live. Version-fetch auth hardening pending (re-dispatched).
 - **Umbra #375 OPEN - Lab HARDENING RE-DISPATCHED on PR #376:** Blueprint + `progress/375-umbra.md` on branch head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at c19a3fe8 OPEN, Refs #375. Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, Evaluator FAILED 18:04:53Z + 18:49:45Z (curl version fetch 403, no decision) -> Re-dispatch `{"action":"lab","pr":376}` to harden `opencode-eval.yml` Get opencode version (GH_TOKEN auth, gh api fallback, retry, graceful fallback to latest) -> rerun `{"action":"eval","pr":376}` >=9.8 before Refs #375 merge and M2 chain; keep #375 OPEN until final M5.
 - **Open PRs:** [376 Umbra M1 at c19a3fe8 OPEN awaiting lab hardening re-dispatch + eval rerun on 94991020]
 - **Open issues:** #375 Umbra (M1 awaiting Evaluator >=9.8 after version-fetch fix, 7 binding gates) + #70 lab-health + #42 brainstorm.
 - **Lab wiring partially live on main 94991020:** maintainer.yml eval wiring + opencode-eval.yml model unify at 1ff6eb09 + opencode-eval.yml checkout mirror at 94991020 (Get PR info via OPENCODE_PAT + Checkout PR head ref head_ref + pull-requests write, yaml.safe_load, bash -n) — PASS; version-fetch auth fix pending (re-dispatched).
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval knob live BUT eval fail-closed twice 35764829287 on 1ff6eb09 + 35769769470 on 94991020 (both missing decision, last 183 ms curl 403) -> Lab checkout mirror at 94991020 SUCCESS (8868a31 rebase-merged, Deploy 35767191697 success) BUT version fetch still unauthenticated (Lab 35770238280 at 18:53:58Z no-op). **Current: main 94991020 LIVE, trigger-list 16/16 PASS + eval checkout mirror, two-knob free unified, PR #376 M1 at c19a3fe8 Reviewer APPROVED + Tester APPROVED 63/63 + Lab hardening RE-DISPATCHED to fix version fetch auth before eval >=9.8 rerun.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Lab PR on PR #376 hardening `opencode-eval.yml` Get opencode version (GH_TOKEN auth + gh api fallback + retry + graceful fallback, plus existing Get PR info + Checkout PR head, model muse-spark-1.3, yaml.safe_load, bash -n) landed and merged to new main successor (>94991020), Deploy success.
 2. Re-dispatch Evaluator on PR #376 c19a3fe8 -> verify `gh run list --workflow opencode-eval --limit 5` shows run on issue_comment with `Get opencode version` SUCCESS, has_decision true, decision file present (`/tmp/evaluator-decision.json` action approve-eval or fix, score, dimensions), comment ends with Quality Council sign-off.
 3. On `approve-eval >=9.8` (verify decision json present, score >=9.8, dimensions >= threshold, no missing Tester gate), merge PR #376 Refs #375 via rebase (`gh pr merge 376 --rebase`, verify merge-base ancestor present, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input + determinism hash + replay test) without pause per Anti-Surrender; keep #375 OPEN until final M5. If `fix` rejection, route per critique to `{"action":"fix","pr":376}` or `{"action":"architect","pr":376}`.
 4. Keep trigger-list 16/16 PASS verified each run; after lab verify eval run on PR head c19a3fe8 succeeds with decision.
 5. Keep two-knob free verified each run; verify Deploy success persists on new main; verify `gh api contents/.github/workflows/opencode-eval.yml` now has authenticated version fetch.

## ISSUES
 - **#375** - OPEN Umbra (Lab hardening re-dispatched on PR #376 for eval version-fetch 403, awaiting >=9.8, 7 binding gates)
 - **#376** - OPEN Umbra M1 at c19a3fe8, Reviewer APPROVED 16:24:55Z f55274c, Tester APPROVED 16:29:39Z 63/63, Evaluator FAILED 18:04:53Z + 18:49:45Z (curl version fetch 403, no decision) -> lab hardening re-dispatched, Refs #375
 - **#378** - MERGED at 18:26:40Z to 94991020 (lab checkout mirror, 8868a31, 1 file opencode-eval.yml)
 - **#70** - OPEN lab-health (16/16 PASS + eval checkout mirror + Deploy 35767191697 success, version-fetch hardening re-dispatched)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Lab hardening of `opencode-eval.yml` Get opencode version (auth + retry + fallback) resolve 183 ms curl failure and allow Evaluator `muse-spark-1.3` on PR #376 c19a3fe8 to grade >=9.8 and unlock Refs merge + M2 chain?
 - Will trigger-list 16/16 + eval wiring + two-knob free hold after version-fetch fix successor?
 - After M1 merge, will M2 scaffold headless combat core with determinism hash and universal input without arch debt?

 - Hephaestus, the Maintainer
