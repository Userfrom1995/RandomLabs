# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T17:28Z (maintainer run 36034466989 - issue_comment on #407 /oc maintainer at 17:27:54Z, PR #407 re-review in progress, main 67e5deff LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 comment `/oc lab, change all agent models from muse-spark-1.2-contributor-free to mimo-v2.6-flash-free`):** Owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` alongside `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free` - 10 free total, 80 total models). Lab re-dispatched 36033323465 (prior dispatches 36031508286 at 17:02Z, 36032082692 at 17:07Z, 36032541077 at 17:11Z, 36032934376 at 17:14Z, plus docs-sync verdicts 17:07:09Z/17:11:08Z/17:14:34Z/17:17:44Z with no pin change; pins still `muse-spark-1.3`/`muse-spark-1.2`). Target: update `opencode.json` two-knob and all `.github/workflows/*.yml` `model:` pins together via Lab Engineer, keep 18/18 trigger-list PASS, Deploy green. Lab on #70 expected to land as PR `opencode/lab-70-archive-link-repair` actually repurposed for link repair (Refs #70) - model switch still pending after link repair merges.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md`, semantic phase naming, update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 - invariant live on main.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 (live hello-through-tor, 9.82 eval). Issues #387/#399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1.
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED at 67e5deff - README.md:61-67 and index.html:123-158 now accurately reflect live main (Folio/Tabula/Sextant shipped, zero In progress strings, verified by Lab 36033191315 docs audit 17:17:44Z and 36032832156 verification 17:14:34Z).

## CRITICAL INFRASTRUCTURE STATE
 - **Main 67e5deff LIVE - Curator PR #406 MERGED:** `origin/main` = `67e5deff20fa227cfe8ac008f000393408d56170` verified via `git ls-remote origin/main` == 67e5deff and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 67e5deff (parent 2429c52e, 3 curate commits 68d85f72/970076fd/67e5deff). Deploy static site to GitHub Pages SUCCESS 36030993382 on 67e5deff (verified 2026-09-24T17:28Z). `opencode.json` two-knob still `muse-spark-1.3-contributor-free`/`muse-spark-1.2-contributor-free` (pending switch to `mimo-v2.6-flash-free` after link-repair PR merges). Workflows live 21 total (18 relevant + maintainer + Dependency Graph + pages-build-deployment), `maintainer.yml:38` 18/18 PASS `[auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]` includes `tor-cli`, no `workflows: write` on GITHUB_TOKEN (PAT path per LAB.md).
 - **Models:** `curl -s https://opencode.ai/zen/v1/models` shows `mimo-v2.6-flash-free` free, `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free` still pinned live (10 free, 80 total). No CreditsError on current pins, no `Provider finish_reason: network_error` burst.

## IN FLIGHT
 - **PR #407 [Lab] Repair Previous Projects links after mass-archive (Refs #70) - RE-REVIEW IN PROGRESS:** Open PR `opencode/lab-70-archive-link-repair` head `ef325edc615f3c7c0dbb0989d7f013e0774b4676` MERGEABLE (3 commits after Fixer `ef325ed` repointing 17 tree links to archive). Reviewer run `36034452864` in_progress at 17:27:42Z (issue_comment `/oc review` at 17:27:38Z) + `36034481776` pending at 17:27:57Z queued by `/oc maintainer`. Prior review 36034132440 flagged incomplete tree links, Fixer 36034279395 patched all 17. Deploy success 36034444877 + pr-trigger success 36034444993 on ef325ed (pull_request). Awaiting Reviewer `/oc approve` -> Tester -> merge. Decision `[]` standby this run to avoid duplicate review dispatch.
 - **Model switch #70 PENDING (deferred behind PR #407):** Issue #70 `[Lab Health & Audit Logs]` OPEN, owner `/oc lab` 07:14:03Z `mimo-v2.6-flash-free` switch still pending; PR #407 currently occupies Lab track on same issue (Refs #70). After #407 merges, re-dispatch Lab Engineer on #70 for two-knob `mimo-v2.6-flash-free` switch (workflows + opencode.json).
 - **Open PRs:** [407] (1 open, ef325ed re-review)
 - **Open issues:** [70 lab-health (link-repair PR #407 + model switch pending), 42 brainstorm] (#405/#387/#399/#397 closed)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387 -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 -> PAT dispatch MERGED e996d93 Refs #387 -> Linux per-OS fix MERGED ac6f36d7 Closes #387/#399 (live hello-through-tor, 9.82 eval) -> Archive 2429c52e -> Curator PR #406 MERGED 67e5deff Closes #405 -> Lab archive-link-repair PR #407 re-review in progress (ef325ed, 17 tree fixes, Refs #70) -> model-switch #70 deferred until #407 merge -> Standby for Reviewer verdict on #407. Deploy SUCCESS on 67e5deff and on ef325ed both verified.

## NEXT-RUN PLAYBOOK
 1. Poll Reviewer outcome on #407: if `/oc approve` -> dispatch `{"action":"test","pr":407}` (Tester) per pipeline; if `/oc fix` -> already handled, await Fixer push then re-review. Do not duplicate review while 36034452864 in_progress.
 2. After #407 MERGE (via `gh pr merge --rebase` once Tester/Evaluator approve, then `Refs #70` keeps #70 open), verify `git ls-remote origin/main` successor to 67e5deff, Deploy SUCCESS, then re-dispatch Lab Engineer on #70 for `mimo-v2.6-flash-free` two-knob switch (both `opencode.json` model+small_model and all `.github/workflows/*.yml` `model:` pins) with 18/18 PASS check.
 3. Poll for new Owner directives or Curator/Auditor findings; if idle after both lands, standby `[]`.

## ISSUES
 - **#407** - OPEN PR [Lab] Repair Previous Projects links after mass-archive (Refs #70) - head ef325ed MERGEABLE, re-review in_progress 36034452864, 14 blob + 17 tree fixes + 11 dead Pages drops, Refs #70
 - **#70** - OPEN lab-health (PR #407 link repair + pending mimo-v2.6-flash-free switch from 07:14:03Z)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links (PR #406 MERGED 67e5deff)
 - **#406** - MERGED PR Curator: graduate tor-cli, archive Obsidian, repair dead website links (Fixes #405, 3 commits)
 - **#387** - CLOSED at ac6f36d7 Tor CLI
 - **#399** - CLOSED at ac6f36d7 [Audit] tor-cli sweep/drift
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Reviewer approve ef325ed after 17 tree fixes (zero remaining non-archive `blob/`/`tree` hits, all archive README targets exist, no em dashes, preview intact) and route to Tester?
 - Will Lab Engineer land `mimo-v2.6-flash-free` two-knob switch on #70 after #407 merges without breaking 18/18 allowlist or Deploy, and will small/title runs stay CreditsError-free?
 - Any follow-up Curator polish for archive fidelity after #407? Non-blocking.

  - Hephaestus, the Maintainer
