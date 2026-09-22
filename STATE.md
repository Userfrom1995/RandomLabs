# STATE - Random factory checkpoint
 - **Updated: 2026-09-22T19:21Z (maintainer run 35773247990, main 94991020 LIVE, dispatch fix on PR #376 for 7.4 rejection)**
 - **Action this run:** `[{"action":"fix","pr":376}]` - Dispatch Fixer on PR #376 c19a3fe8 after Evaluator REJECTION 7.4/10 (fix) with 6 surgical M1 defects; Reviewer APPROVED 16:24:55Z + Tester APPROVED 63/63 hold; four eval decisions 8.4/8.4/7.2/7.4 on same head plus one transient no-decision 35773206206 (curl version-fetch 183 ms exit 1) correlated as rate-limit, not blocking.
 - **Main:** `94991020` LIVE (M1-M5 doom at e33e11f1 + evaluator bootstrap at 5f15cef6 + lab trigger-list fix at 0b16d0be + lab eval wiring at 1ff6eb09 + lab eval checkout mirror at 94991020). Verified `gh api refs/heads/main` == 94991020 (parent 1ff6eb09), `gh pr list --state open` = [376 Umbra M1 at c19a3fe8 MERGEABLE], `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS including opencode-eval (line 38 `[..., curator, opencode-eval]`), `progress/375-umbra.md` on branch head M1 complete awaiting fix, Deploy success on 94991020, last eval 35773206206 failure transient version-fetch (no decision), prior evals 7.4/7.2/8.4 fix decisions present.
 - **Branch retention:** `opencode/issue362-*` retained MERGED; `opencode/issue373-20260922003103` at fb32365b MERGED to 0b16d0be; `opencode/lab-375-eval-wiring` at b3c735b MERGED to 1ff6eb09; `opencode/issue375-20260922160615` at c19a3fe8 OPEN PR #376 (Builder M1 + Fixer 4 blocks + Tester redteam 63/63, Reviewer APPROVED, Tester APPROVED, Evaluator REJECT 7.4/10 fix dispatched to Fixer); `opencode/lab-376-eval-checkout-fix` at 8868a31 MERGED to 94991020 at 18:26:40Z (1 file .github/workflows/opencode-eval.yml, checkout mirror)
---

## STANDING OWNER DIRECTIVES (active)
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 OPEN):** Lab Directive Autonomous End-to-End Build of Shadow Fight-inspired WebGPU Combat Game at `/umbra/` - 7 binding gates. Blueprint `ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md` + `progress/375-umbra.md` (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). Builder M1 70e0cb52 + Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, Evaluator REJECT 7.4/10 (fix, 6 surgical items) -> dispatched fix on PR #376 for >=9.8 before Refs merge. (Owner 19:20:54Z /oc eval result 7.4 rejection; Owner 18:53:58Z /oc lab no-op, /oc eval 18:49:42Z failure; Owner 16:50:08Z directive satisfied at 1ff6eb09 wiring)
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #42):** Lab Directive Autonomous End-to-End Build of Client-Side Web Doom at /doom/ - 6 binding gates. Doom issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live as inherited at e33e11f1 lineage retained, now on 94991020.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Documentation & Landing Page Sync - FIXED at 113966e1 + Curator syncs + Trigger-list fix at 0b16d0be + eval wiring at 1ff6eb09 + eval checkout mirror at 94991020 restores 16/16 + Deploy success; fix dispatched.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 94991020 LIVE - fix dispatched:** `origin/main` = `949910204d6bacfb0723a9a96a06d2e590c555d6` verified (parent 1ff6eb09, rebase-merge of 8868a31), `gh pr list --state open` = [376] MERGEABLE (merge-base 94991020 c19a3fe8 present via 0b16d0be, linearizes), `gh issue list --state open` = [375 Umbra, 70 lab-health, 42 brainstorm], live workflows 19 vs allowlist 16/16 PASS (`maintainer.yml:38` includes opencode-eval, `maintainer.yml:198` includes test|eval, `maintainer.yml:548` elif eval -> /oc eval, `opencode-eval.yml:71` model muse-spark-1.3 free). Evaluator 35773206206 FAILED 19:20:59Z (curl version-fetch exit 1, no decision, transient) + 4 prior fix decisions 8.4/8.4/7.2/7.4 on c19a3fe8 (latest 7.4 at 19:20:54Z, 6 items) -> routed to fix; checkout mirror at 94991020 verified live (Get PR info via OPENCODE_PAT + Checkout PR head ref head_ref, pull-requests write, yaml.safe_load, bash -n) PASS. Model ecosystem two-knob free PASS (muse-spark-1.3 + muse-spark-1.2 free, evaluator unified).
 - **Model ecosystem two-knob both free PASS on 94991020, unified:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free re-verified via `gh api contents/opencode.json`, evaluator `opencode-eval.yml:71` `muse-spark-1.3-contributor-free` free (kept), 13/14 workflows unified zero deepseek drift. Branch c19a3fe8 same model; no CreditsError.
 - **Pages/PR preview:** PR #376 preview https://Userfrom1995.github.io/RandomLabs/preview/pr-376/ staging via pages.yml; Deploy success on 94991020 (workflow_dispatch 18:26:44Z), prior Deploy on 0b16d0be 00:36:45Z; no sweep needed.
---

## IN FLIGHT
 - **Doom #362 CLOSED + PRs #363-#367 MERGED (M1-M5) + PR #368 MERGED (docs) + PR #370/#372 MERGED (Curator) + Evaluator bootstrap at 5f15cef6 + Lab PR #374 MERGED at 0b16d0be + Lab PR #377 MERGED at 1ff6eb09 + Lab PR #378 MERGED at 94991020:** Epic complete. Trigger-list 16/16 PASS + eval wiring + eval checkout mirror all live. Fix dispatched for Umbra M1 quality gate.
 - **Umbra #375 OPEN - FIX DISPATCHED on PR #376:** Blueprint + `progress/375-umbra.md` on branch head (M1-M5, Status: in-progress, Active Milestone: M1, Refs intermediates). PR #376 `opencode/issue375-20260922160615` at c19a3fe8 OPEN, Refs #375. Fixer f55274c + Tester c19a3fe8 63/63, Reviewer APPROVED 16:24:55Z, Tester APPROVED 16:29:39Z, Evaluator REJECT 7.4/10 fix (6 surgical: scene NaN/Infinity, gates p95, arena clamp, canvas rim parity, mobile pill/HUD/ground, progress stale) -> dispatched `{"action":"fix","pr":376}` on 94991020 for >=9.8 before Refs #375 merge and M2 chain; keep #375 OPEN until final M5.
 - **Open PRs:** [376 Umbra M1 at c19a3fe8 OPEN awaiting fix + re-eval >=9.8 on 94991020]
 - **Open issues:** #375 Umbra (M1 awaiting Fixer -> re-eval >=9.8) + #70 lab-health + #42 brainstorm.
 - **Lab wiring live on main 94991020:** maintainer.yml eval wiring + opencode-eval.yml model unify at 1ff6eb09 + opencode-eval.yml checkout mirror at 94991020 (Get PR info via OPENCODE_PAT + Checkout PR head ref head_ref + pull-requests write, yaml.safe_load, bash -n) — PASS; fix dispatched.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> APPROVE 9.84 -> MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 fix NaN -> 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED at e33e11f1, Doom epic COMPLETE + Evaluator bootstrap at 5f15cef6 + Lab fix at 0b16d0be 16/16 PASS + Lab eval wiring at 1ff6eb09 16/16 + eval checkout mirror at 94991020 (8868a31) SUCCESS. **Current: main 94991020 LIVE, trigger-list 16/16 PASS + eval wiring + checkout mirror, two-knob free unified, PR #376 M1 at c19a3fe8 Reviewer APPROVED + Tester APPROVED 63/63 + Evaluator REJECT 7.4/10 fix dispatched to Fixer for 6 surgical items before Refs merge + M2 chain.**
---

## NEXT-RUN PLAYBOOK
 1. Verify Fixer run on PR #376 c19a3fe8 dispatched from 35773247990 applies 6 surgical fixes (scene.js:40 Number.isFinite guard, gates.js:27 p95<0 null, scene.js:41-42 clamped arena, painter.js rim/moon/mote parity, theme.css pill/HUD/ground, progress 63/63) and pushes new head >c19a3fe8 with `node --test umbra/tests/*.mjs` still 63/63 and `git status --porcelain` clean.
 2. On Fixer push, verify Reviewer re-approval (`/oc approve` on new head, no outstanding findings) and Tester re-approval (`/oc approve-test` on new head, 63/63 re-ran, golden hashes 5046b8f7/4cdd52dc reproduced) then re-dispatch `{"action":"eval","pr":376}` for >=9.8.
 3. On `approve-eval >=9.8` (verify decision json present, score >=9.8, dimensions >= threshold, no missing Tester gate), merge PR #376 Refs #375 via rebase (`gh pr merge 376 --rebase`, verify merge-base ancestor present, no --delete-branch) and immediately chain `{"action":"build","issue":375}` for M2 (combat core + universal input + determinism hash + replay test) without pause per Anti-Surrender; keep #375 OPEN until final M5. If `fix` rejection persists, route per critique again.
 4. Keep trigger-list 16/16 PASS verified each run; after fix verify version-fetch flakiness (curl without GH_TOKEN) — if next eval fails with has_decision=false and curl exit 1, dispatch `{"action":"lab","pr":376}` to harden `opencode-eval.yml` Get opencode version to `gh api` with OPENCODE_PAT + retry + fallback.
 5. Keep two-knob free verified each run; verify Deploy success persists on new main; verify `gh api contents/.github/workflows/opencode-eval.yml` holds authenticated PR-head checkout.
 6. Do not re-dispatch fix if already in flight (check `gh run list --workflow opencode --branch opencode/issue375-20260922160615` in_progress); cooldown 30m per workflow+branch signature.

## ISSUES
 - **#375** - OPEN Umbra (Fix dispatched on PR #376 for 7.4 -> >=9.8, 7 binding gates)
 - **#376** - OPEN Umbra M1 at c19a3fe8, Reviewer APPROVED 16:24:55Z f55274c, Tester APPROVED 16:29:39Z 63/63, Evaluator REJECT 7.4/10 fix (6 items) -> fix dispatched
 - **#378** - MERGED at 18:26:40Z to 94991020 (lab checkout mirror, 8868a31, 1 file opencode-eval.yml)
 - **#70** - OPEN lab-health (16/16 PASS + eval checkout mirror + Deploy success, fix dispatched)
 - **#42** - OPEN brainstorm (standby, no auto-pick)
---

## OPEN QUESTIONS
 - Will Fixer on PR #376 c19a3fe8 apply all 6 M1 surgical fixes without regressing 63/63 golden hashes and pass next Reviewer/Tester/Evaluator >=9.8?
 - Will version-fetch `curl -sf` without GH_TOKEN continue to flap (35773206206 exit 1) and need lab hardening to `gh api` with OPENCODE_PAT before next eval, or will retry succeed?
 - After M1 merge, will M2 scaffold headless combat core with determinism hash and universal input without arch debt?

 - Hephaestus, the Maintainer
