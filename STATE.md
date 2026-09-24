# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T17:14Z (maintainer run 36032934376 - issue_comment on #70 /oc maintainer, re-dispatch lab on #70 for mimo-v2.6-flash-free model switch, main 67e5deff LIVE, 0 open PRs)**

## STANDING OWNER DIRECTIVES (active)
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 comment `/oc lab, change all agent models from muse-spark-1.2-contributor-free to mimo-v2.6-flash-free`):** Owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` alongside `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free` - 10 free total, 80 total models). Lab re-dispatched this run 36032934376 (prior dispatches 36031508286 at 17:02Z, 36032082692 at 17:07Z, 36032541077 at 17:11Z, 36032832156 docs-sync verdicts 17:07:09Z/17:11:08Z/17:14:34Z with no pin change; pins still `muse-spark-1.3`/`muse-spark-1.2`). Target: update `opencode.json` two-knob and all `.github/workflows/*.yml` `model:` pins together via Lab Engineer, keep 18/18 trigger-list PASS, Deploy green.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md`, semantic phase naming, update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 - invariant live on main.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 (live hello-through-tor, 9.82 eval). Issues #387/#399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1.
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED at 67e5deff - README.md:61-67 and index.html:123-158 now accurately reflect live main (Folio/Tabula/Sextant shipped, zero In progress strings, verified by Lab 36032353890 docs audit 17:11:08Z and 36032832156 verification 17:14:34Z).

## CRITICAL INFRASTRUCTURE STATE
 - **Main 67e5deff LIVE - Curator PR #406 MERGED:** `origin/main` = `67e5deff20fa227cfe8ac008f000393408d56170` verified via `git ls-remote origin/main` == 67e5deff and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 67e5deff (parent 2429c52e, 3 curate commits 68d85f72/970076fd/67e5deff). Deploy static site to GitHub Pages SUCCESS 36030993382 on 67e5deff (verified 2026-09-24T17:14Z). `opencode.json` two-knob still `muse-spark-1.3-contributor-free`/`muse-spark-1.2-contributor-free` (pending switch to `mimo-v2.6-flash-free` via lab 36032934376). Workflows live 21 total (18 relevant + maintainer + Dependency Graph + pages-build-deployment), `maintainer.yml:38` 18/18 PASS `[auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]` includes `tor-cli`, no `workflows: write` on GITHUB_TOKEN (PAT path per LAB.md).
 - **Models:** `curl -s https://opencode.ai/zen/v1/models` shows `mimo-v2.6-flash-free` free, `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free`, `deepseek-v4-flash-free`, `mimo-v2.5-free`, `jev-1.13-free`, `space-bunny-free`, `ling-3.0-flash-fin-free`, `nemotron-3-ultra-free`, `nemotron-3.5-lightning-free` (10 free, 80 total). No CreditsError on current pins, no `Provider finish_reason: network_error` burst.

## IN FLIGHT
 - **Model switch #70 PENDING - Lab re-dispatched 36032934376:** Issue #70 `[Lab Health & Audit Logs]` OPEN, owner `/oc lab` 07:14:03Z (muse-spark-1.2 -> mimo-v2.6-flash-free) + generic `/oc lab` 17:05:54Z -> Lab docs-sync verdicts at 17:07:09Z, 17:11:08Z (36032353890), 17:14:34Z (36032832156) with no pin change, docs already resolved at 67e5deff (424/424, zero In progress). This maintainer run 36032934376 re-dispatches Lab Engineer on #70 with explicit two-knob instruction; decision `[{"action":"lab","issue":70}]` queued via PAT.
 - **Curator #405 CLOSED - PR #406 MERGED 67e5deff Rebase:** Issue #405 `[Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links` CLOSED at 2026-09-24T16:56:46Z (Fixes #405). PR #406 MERGED 67e5deff Rebase (68d85f72/970076fd/67e5deff, 100 files 97 R100).
 - **Open PRs:** [] (0 open, 406 merged, Lab model-switch PR expected next)
 - **Open issues:** [70 lab-health (lab re-dispatched for model switch), 42 brainstorm] (#405/#387/#399/#397 closed)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387 -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 -> PAT dispatch MERGED e996d93 Refs #387 -> Linux per-OS fix MERGED ac6f36d7 Closes #387/#399 (live hello-through-tor, 9.82 eval) -> Archive 2429c52e -> Curator PR #406 MERGED 67e5deff Closes #405 -> Lab model switch 70 re-dispatched 36032934376 (muse-spark -> mimo-v2.6-flash-free, two-knob, docs sync resolved at 67e5deff) -> Standby for lab landing and next Owner/Ideator. Deploy SUCCESS on 67e5deff verified.

## NEXT-RUN PLAYBOOK
 1. Verify `git ls-remote origin/main` successor to 67e5deff with `mimo-v2.6-flash-free` pins (both `opencode.json` two-knob and all `.github/workflows/*.yml` `model:` inputs) landed via Lab PR and Deploy still SUCCESS; verify 18/18 PASS holds and no `CreditsError`.
 2. Verify `gh issue list --state open` == [70,42] and Lab PR merged or in review; if lab PR open, triage review/test gates (no `fix`/`continue` on workflow-touching PR, only `lab`).
 3. Poll for new Owner directives or Curator/Auditor findings; if idle after model switch lands, standby `[]` (do not auto-dispatch Ideator per charter).

## ISSUES
 - **#70** - OPEN lab-health (lab re-dispatched 36032934376 for mimo-v2.6-flash-free switch, owner request 07:14:03Z, prior docs-sync verdicts 17:07:09Z/17:11:08Z/17:14:34Z resolved docs but left switch pending)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links (6 defects, PR #406 MERGED Rebase 67e5deff)
 - **#406** - MERGED PR Curator: graduate tor-cli, archive Obsidian, repair dead website links (Fixes #405, 3 commits)
 - **#387** - CLOSED at ac6f36d7 Tor CLI
 - **#399** - CLOSED at ac6f36d7 [Audit] tor-cli sweep/drift
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Lab Engineer land `mimo-v2.6-flash-free` across all workflow pins and `opencode.json` two-knob without breaking 18/18 allowlist or Deploy, and will small/title runs stay CreditsError-free?
 - Any follow-up Curator polish for Kodak archival fidelity or archive/README ordering after merge? Non-blocking, logged.

  - Hephaestus, the Maintainer
