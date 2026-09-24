# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T18:27Z (maintainer run 36041318979 - /oc maintainer on #70, main 08fe6998 LIVE, ninth correction for mimo-v2.6-flash-free)**

## STANDING OWNER DIRECTIVES (active)
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 comment `/oc lab, change all agent models from muse-spark-1.2-contributor-free to mimo-v2.6-flash-free` + reaffirmed 2026-09-24T18:11:30Z via #70):** Owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` - 80 total / 10 free includes `mimo-v2.6-flash-free` alongside `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free`). Lab re-dispatched ninth correction this run on #70 after PR #410 merged at 08fe6998 and Labs 36039512816/36039992972/36040706457/36041136181 again no-oped on docs only (eighth correction 36040854016 at 18:23Z also no-oped). Target: update `opencode.json` two-knob and all `.github/workflows/*.yml` `model:` pins together via Lab Engineer to `mimo-v2.6-flash-free`, keep 18/18 trigger-list PASS, Deploy green on successor to 08fe6998.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md`, semantic phase naming, update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 - invariant live on main.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 (live hello-through-tor, 9.82 eval). Issues #387/#399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1.
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED at 67e5deff - README.md:61-67 and index.html:123-158 now accurately reflect live main plus meta/Prism sync at 08fe6998 (Folio/Tabula/Sextant shipped, zero In progress strings, meta with 7 projects, 1 Prism, verified by Reviewer 36038654843/36040186128 and Tester 36038793549/36040319640). Archive link repair MERGED 5c928366 Refs #70 + docs-sync PR #408 MERGED 5d080e29 Refs #70 (Folio M4 one-liner) + docs-sync PR #409 MERGED 884c48a9 Refs #70 (meta + Prism dedup) + landing regression PR #410 MERGED 08fe6998 Refs #70 (tests/landing/test_pr410_meta_prism.py). Verified again 18:27Z on 08fe6998 by merge - no new docs edits needed beyond model switch.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 08fe6998 LIVE - PR #410 MERGED:** `origin/main` = `08fe6998af9054e8efc386b13951b5da038fc270` verified via `git ls-remote origin/main` == 08fe6998 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 08fe6998 (parent 884c48a9, 1 commit: `tester: add landing regression tests for meta fleet + Prism dedup (Refs #70)`, 1 file tests/landing/test_pr410_meta_prism.py +105, Reviewer approve 36040186128 + Tester approve-test 36040319640; docs commit 05e7c876 already on 884c48a9 patch-identical). Prior main 884c48a9 = lab: refresh index.html meta description and drop duplicate Previous Prism entry (Refs #70), 5d080e29 = lab: sync root README Folio entry. Deploy static site to GitHub Pages success on 08fe6998 (36041136181 success verified). `opencode.json` two-knob still `muse-spark-1.3-contributor-free`/`muse-spark-1.2-contributor-free` (pending switch to `mimo-v2.6-flash-free` via Lab on #70). Workflows live 21 total (18 relevant + maintainer + Dependency Graph + pages-build-deployment), `maintainer.yml:38` 18/18 PASS includes `tor-cli` + `opencode-peros-test`.
 - **Models:** `curl -s https://opencode.ai/zen/v1/models` shows `mimo-v2.6-flash-free` free (80 total / 10 free: jev-1.13-free, deepseek-v4-flash-free, muse-spark-1.3-contributor-free, muse-spark-1.2-contributor-free, mimo-v2.6-flash-free, space-bunny-free, mimo-v2.5-free, ling-3.0-flash-fin-free, nemotron-3-ultra-free, nemotron-3.5-lightning-free), `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free` still pinned live on 08fe6998 (10 free, 80 total). No CreditsError, no network_error burst.

## IN FLIGHT
 - **PR #410 MERGED 08fe6998:** `opencode/lab-70-docs-sync` merged at 2026-09-24T18:20Z via `gh pr merge --rebase` (MERGEABLE, Reviewer approve 36040186128, Tester approve-test 36040319640). Branch `opencode/lab-70-docs-sync` retained at 6fe13923 (2 commits: 05e7c876 docs + 6fe13923 tester, Refs #70). Standing board #70 stays open Refs #70.
 - **Model switch #70 RE-DISPATCHED NINTH CORRECTION (18:27Z):** Issue #70 `[Lab Health & Audit Logs]` OPEN, owner `/oc lab` 07:14:03Z + 18:11:30Z `mimo-v2.6-flash-free` switch dispatched via Lab Engineer this run (`{"action":"lab","issue":70}`) after docs-sync verified complete but eight prior Labs no-oped on model pins (36039512816 at 18:11:33Z success docs-only, 36039992972 at 18:15:41Z success docs-only, 36040706457 at 18:21:54Z success no-op verifying docs clean, 36040854292 skipped, 36041136181 at 18:25:34Z success docs-only with maintainer handoff). Expect Lab PR `opencode/lab-70-*` with two-knob update. Pins still `muse-spark-1.3`/`muse-spark-1.2` on 08fe6998.
 - **Open PRs:** [] (0 open after #410 merge, `gh pr list --state open` == [])
 - **Open issues:** [70 lab-health (model switch lab in-flight ninth correction), 42 brainstorm]

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI + repairs MERGED -> Documentation Invariant MERGED -> Audit sweep gap fix MERGED -> PAT dispatch MERGED -> Linux per-OS fix MERGED ac6f36d7 -> Archive 2429c52e -> Curator PR #406 MERGED 67e5deff Closes #405 -> Lab archive-link-repair PR #407 MERGED 5c928366 Refs #70 -> Docs-sync PR #408 MERGED 5d080e29 Refs #70 -> model-switch #70 lab re-dispatched 17:45Z (first) -> Lab 36036822413 no-op 17:48:05Z -> second -> Owner Lab 17:52:16Z no-op 17:53:55Z -> third -> Lab 36037941194 no-op 17:57:55Z -> fourth -> Docs-sync PR #409 MERGED 884c48a9 Refs #70 (meta + Prism dedup) -> fifth -> Lab 36039512816 no-op 18:11:33Z -> sixth -> PR #410 MERGED 08fe6998 Refs #70 (landing regression +105) -> seventh correction 18:20Z -> eighth correction 18:23Z (36040854016) -> ninth correction 18:25Z Lab 36041136181 no-op docs-only -> ninth re-dispatch 18:27Z -> Standby for Lab PR then Reviewer/Test.

## NEXT-RUN PLAYBOOK
 1. Poll Lab Engineer PR on #70 (`mimo-v2.6-flash-free` two-knob): verify `gh pr list --state open` shows Lab PR, `opencode.json` model+small_model == mimo-v2.6-flash-free, all `.github/workflows/*.yml` model: pins == mimo-v2.6-flash-free, 18/18 PASS, Deploy success on successor to 08fe6998.
 2. Review/Test that Lab PR (infra -> lab only), then merge via PAT and verify `git ls-remote origin/main` successor to 08fe6998 and models free.
 3. If idle after model switch lands, standby `[]`.

## ISSUES
 - **#410** - MERGED at 08fe6998 [Lab] refresh index.html meta description and drop duplicate Previous Prism entry (Refs #70) - head 6fe13923 MERGED 18:20Z, 2 commits (05e7c876 docs + 6fe13923 tester), index.html already on 884c48a9 patch-identical + tests/landing/test_pr410_meta_prism.py +105, Refs #70 keeps #70 open
 - **#409** - MERGED at 884c48a9 [Lab] refresh index.html meta description and drop duplicate Previous Prism entry (Refs #70) - head 05e7c876 MERGED 18:09:45Z, 1 file index.html +1/-11, Refs #70 keeps #70 open
 - **#408** - MERGED at 5d080e29 [Lab] sync root README Folio entry with shipped M4 layer (Refs #70) - head ce609d36 MERGED, 1 file README.md +1/-1, Refs #70 keeps #70 open
 - **#407** - MERGED at 5c928366 [Lab] Repair Previous Projects links after mass-archive (Refs #70) - head ef325ed MERGED, 14 blob + 17 tree fixes + 11 dead Pages drops, Refs #70 keeps #70 open
 - **#70** - OPEN lab-health (PR #410 merged, pending mimo-v2.6-flash-free two-knob switch re-dispatched at 18:27Z ninth correction after four consecutive docs-only Labs + 36041136181)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links (PR #406 MERGED 67e5deff)
 - **#406** - MERGED PR Curator: graduate tor-cli, archive Obsidian, repair dead website links (Fixes #405)
 - **#387** - CLOSED at ac6f36d7 Tor CLI
 - **#399** - CLOSED at ac6f36d7 [Audit] tor-cli sweep/drift
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Lab Engineer land `mimo-v2.6-flash-free` two-knob switch on #70 without breaking 18/18 allowlist or Deploy, and will small/title runs stay CreditsError-free on 80/10 free registry?
 - Any follow-up Curator polish for archive fidelity after #410? Non-blocking.

  - Hephaestus, the Maintainer
