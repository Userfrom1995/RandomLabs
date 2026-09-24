# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T17:38Z (maintainer run 36035470871 - PR #408 MERGED 5d080e29 docs-sync Refs #70, Lab re-dispatch on #70)**

## STANDING OWNER DIRECTIVES (active)
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 comment `/oc lab, change all agent models from muse-spark-1.2-contributor-free to mimo-v2.6-flash-free`):** Owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` - 10 free total, includes `mimo-v2.6-flash-free` alongside `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free`). Lab re-dispatched this run on #70 after #408 merge (prior dispatches 36033323465, 36031508286, 36032082692, 36032541077, 36032934376, 36034693330 docs-sync #407, plus docs-sync verdicts 17:07Z/17:11Z/17:14Z/17:17Z with no pin change; pins still `muse-spark-1.3`/`muse-spark-1.2`). Target: update `opencode.json` two-knob and all `.github/workflows/*.yml` `model:` pins together via Lab Engineer, keep 18/18 trigger-list PASS, Deploy green. Lab on #70 now re-dispatched after #408 merge to 5d080e29.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md`, semantic phase naming, update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 - invariant live on main.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 (live hello-through-tor, 9.82 eval). Issues #387/#399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1.
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED at 67e5deff - README.md:61-67 and index.html:123-158 now accurately reflect live main (Folio/Tabula/Sextant shipped, zero In progress strings, verified by Lab 36033191315 docs audit 17:17:44Z and 36032832156 verification 17:14:34Z). Archive link repair MERGED 5c928366 Refs #70 + docs-sync MERGED 5d080e29 Refs #70 (Folio M4 one-liner).

## CRITICAL INFRASTRUCTURE STATE
 - **Main 5d080e29 LIVE - PR #408 MERGED:** `origin/main` = `5d080e297928c3284efaf57b16b2e427ebfa4d43` verified via `git ls-remote origin/main` == 5d080e29 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 5d080e29 (parent 5c928366, 1 commit: `lab: sync root README Folio entry with shipped M4 layer (Refs #70)`, 1 file README.md +1/-1). Prior main 5c928366 = fixer: repoint orphaned tree/main links to archive/ paths (Refs #70). Deploy static site to GitHub Pages pending/on-push for new SHA (prior Deploy success 36035038932 on 5c928366; 36035208254 action_required on PR head expected, sweep will clear). `opencode.json` two-knob still `muse-spark-1.3-contributor-free`/`muse-spark-1.2-contributor-free` (pending switch to `mimo-v2.6-flash-free` via Lab on #70). Workflows live 21 total (18 relevant + maintainer + Dependency Graph + pages-build-deployment), `maintainer.yml:38` 18/18 PASS includes `tor-cli` + `opencode-peros-test`.
 - **Models:** `curl -s https://opencode.ai/zen/v1/models` shows `mimo-v2.6-flash-free` free, `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free` still pinned live (10 free, 80 total). No CreditsError, no network_error burst.

## IN FLIGHT
 - **PR #408 MERGED 5d080e29:** `opencode/lab-70-docs-sync` merged at 2026-09-24T17:37:47Z via `gh pr merge --rebase` (MERGEABLE UNSTABLE, Reviewer approve 36035209884, Tester approve-test 36035318299). Branch `opencode/lab-70-docs-sync` retained at ce609d36 (1 commit, Refs #70). Standing board #70 stays open.
 - **Model switch #70 RE-DISPATCHED:** Issue #70 `[Lab Health & Audit Logs]` OPEN, owner `/oc lab` 07:14:03Z `mimo-v2.6-flash-free` switch dispatched via Lab Engineer this run (`{"action":"lab","issue":70}`) after #408 merge. Expect PR `opencode/lab-70-*` with two-knob update (or direct PAT push if lab routes to main).
 - **Open PRs:** [] (0 open after #408 merge)
 - **Open issues:** [70 lab-health (model switch lab in-flight), 42 brainstorm]

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI + repairs MERGED -> Documentation Invariant MERGED -> Audit sweep gap fix MERGED -> PAT dispatch MERGED -> Linux per-OS fix MERGED ac6f36d7 -> Archive 2429c52e -> Curator PR #406 MERGED 67e5deff Closes #405 -> Lab archive-link-repair PR #407 MERGED 5c928366 Refs #70 (14 blob + 17 tree + 11 Pages drops) -> Docs-sync PR #408 MERGED 5d080e29 Refs #70 (Folio M4 one-liner) -> model-switch #70 lab re-dispatched -> Standby for Lab PR then Reviewer/Test.

## NEXT-RUN PLAYBOOK
 1. Poll Lab Engineer PR on #70 (`mimo-v2.6-flash-free` two-knob): verify `gh pr list --state open` shows Lab PR, `opencode.json` model+small_model == mimo-v2.6-flash-free, all `.github/workflows/*.yml` model: pins == mimo-v2.6-flash-free, 18/18 PASS, Deploy success on new main successor to 5d080e29.
 2. Review/Test that Lab PR (infra guard -> review only via lab), then merge and verify `git ls-remote origin/main` successor to 5d080e29 and models free.
 3. If idle after model switch lands, standby `[]`.

## ISSUES
 - **#408** - MERGED at 5d080e29 [Lab] sync root README Folio entry with shipped M4 layer (Refs #70) - head ce609d36 MERGED, 1 file README.md +1/-1, Refs #70 keeps #70 open
 - **#407** - MERGED at 5c928366 [Lab] Repair Previous Projects links after mass-archive (Refs #70) - head ef325ed MERGED, 14 blob + 17 tree fixes + 11 dead Pages drops, Refs #70 keeps #70 open
 - **#70** - OPEN lab-health (PR #408 merged, pending mimo-v2.6-flash-free two-knob switch dispatched this run)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links (PR #406 MERGED 67e5deff)
 - **#406** - MERGED PR Curator: graduate tor-cli, archive Obsidian, repair dead website links (Fixes #405)
 - **#387** - CLOSED at ac6f36d7 Tor CLI
 - **#399** - CLOSED at ac6f36d7 [Audit] tor-cli sweep/drift
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Lab Engineer land `mimo-v2.6-flash-free` two-knob switch on #70 without breaking 18/18 allowlist or Deploy, and will small/title runs stay CreditsError-free?
 - Any follow-up Curator polish for archive fidelity after #408? Non-blocking.

  - Hephaestus, the Maintainer
