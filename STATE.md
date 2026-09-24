# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T20:32Z (maintainer run 36055598121 - schedule quiet watch, main 90a24916 LIVE, model switch RESOLVED)**

## STANDING OWNER DIRECTIVES (active)
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model to `opencode/mimo-v2.6-flash-free`) plus `lab.yml` push-fix at `90a24916` (`git add opencode.json`). Verified live via `gh api contents/opencode.json` and `grep model: .github/workflows/*.yml` 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md`, semantic phase naming, update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 - invariant live on main.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 (live hello-through-tor, 9.82 eval). Issues #387/#399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1.
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED at 67e5deff - README.md:61-67 and index.html:123-158 now accurately reflect live main plus meta/Prism sync at 08fe6998 then 90a24916 (Folio/Tabula/Sextant shipped, zero In progress strings, meta with 7 projects, 1 Prism). Archive repair 5c928366 Refs #70 + docs-sync 5d080e29 Refs #70 + meta dedup 884c48a9 Refs #70 + landing regression 08fe6998 Refs #70 + model switch 59a8847a/90a24916 Refs #70.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE - model switch MERGED:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998, 2 commits: `lab: switch two-knob model pins to mimo-v2.6-flash-free` 17 files + `lab: stage opencode.json in lab.yml` 1 file). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified via `gh api contents` + local `grep`, 80/10 free registry includes `mimo-v2.6-flash-free`. Workflows live 21 total (18 relevant + maintainer + Dependency Graph + pages-build-deployment), `maintainer.yml:38` 18/18 PASS includes `tor-cli` + `opencode-peros-test`.
 - **Models:** `curl -s https://opencode.ai/zen/v1/models` shows `mimo-v2.6-flash-free` free (80/10: jev-1.13-free, deepseek-v4-flash-free, muse-spark-1.3-contributor-free, muse-spark-1.2-contributor-free, mimo-v2.6-flash-free, space-bunny-free, mimo-v2.5-free, ling-3.0-flash-fin-free, nemotron-3-ultra-free, nemotron-3.5-lightning-free), previous `muse-spark-1.3/1.2` now superseded. No CreditsError, no network_error burst, no workflows permission rejection.
 - **Deploy:** `Deploy static site to GitHub Pages` success `36047394957` on `90a2491` verified; prior `36040705594` success on `08fe6998`.

## IN FLIGHT
 - **Model switch #70 RESOLVED at 90a24916 (19:19Z):** Issue #70 `[Lab Health & Audit Logs]` OPEN, owner `/oc lab` 07:14:03Z + 20 reaffirmations to 19:19:43Z `mimo-v2.6-flash-free` two-knob switch RESOLVED via Lab Engineer Mode 2 + push-fix (59a8847a switch + 90a24916 lab.yml fix). No PR open - direct main push per Mode 2. Prior 21 docs-only no-ops (36046607464 at 19:12:55Z last no-op) resolved. Branch `opencode/issue70-20260924185640` remains byte-identical archival at 08fe6998 but now behind main by 2.
 - **Open PRs:** [] (0 open, `gh pr list --state open` == [], last PR #410 MERGED at 08fe6998 Refs #70 retained at 6fe13923)
 - **Open issues:** [70 lab-health (model switch RESOLVED at 90a24916, now quiet watch), 42 brainstorm]

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI + repairs MERGED -> Documentation Invariant MERGED -> Audit sweep gap fix MERGED -> PAT dispatch MERGED -> Linux per-OS fix MERGED ac6f36d7 -> Archive 2429c52e -> Curator PR #406 MERGED 67e5deff Closes #405 -> Lab archive-link-repair 5c928366 Refs #70 -> Docs-sync 5d080e29 Refs #70 -> Docs-sync 884c48a9 Refs #70 -> Landing regression 08fe6998 Refs #70 -> Model-switch #70 lab loop 17:45Z-19:14Z (21 no-ops) -> Model switch RESOLVED 59a8847a + push-fix 90a24916 Refs #70 at 19:19Z (Lab Engineer success, Deploy green). Next: quiet standby per charter, await Owner directive / Auditor sweep.

## NEXT-RUN PLAYBOOK
 1. Quiet watch on #70: verify `origin/main` stays 90a24916, `opencode.json` two-knob stays `mimo-v2.6-flash-free`, all workflow `model:` pins stay `mimo-v2.6-flash-free`, 18/18 PASS, Deploy green, 0 open PRs. No dispatch.
 2. If Auditor flags new anomaly, triage via `lab`/`fix`/`recover` as needed; otherwise standby `[]` per no-auto-ideation while idle.
 3. Brainstorm #42 remains OPEN but frozen idle until Owner lifts directive - no Ideator dispatches while standby.

## ISSUES
 - **Model switch #70:** RESOLVED at 90a24916 [Lab] two-knob switch to mimo-v2.6-flash-free (Refs #70) - 59a8847a (17 files, 16 pins + opencode.json) + 90a24916 (lab.yml push fix, Refs #70 keeps #70 open)
 - **#410** - MERGED at 08fe6998 [Lab] refresh index.html meta description and drop duplicate Previous Prism entry (Refs #70)
 - **#409** - MERGED at 884c48a9 [Lab] refresh index.html meta description and drop duplicate Previous Prism entry (Refs #70)
 - **#408** - MERGED at 5d080e29 [Lab] sync root README Folio entry with shipped M4 layer (Refs #70)
 - **#407** - MERGED at 5c928366 [Lab] Repair Previous Projects links after mass-archive (Refs #70)
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916, docs sync RESOLVED at 08fe6998)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects
 - **#387** - CLOSED at ac6f36d7 Tor CLI
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Model switch at 90a24916 is now live with 10-free registry - will small/title runs remain CreditsError-free on next Lab/Builder dispatches without further pin drift?
 - Should archival byte-identical branch `opencode/issue70-20260924185640` be pruned after verification window?

  - Hephaestus, the Maintainer
