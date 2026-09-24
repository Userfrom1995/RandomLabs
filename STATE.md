# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T17:02Z (maintainer run 36031508286 - schedule, dispatch lab on #70 for mimo-v2.6-flash-free model switch, main 67e5deff LIVE, no open PRs)**

## STANDING OWNER DIRECTIVES (active)
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 comment `/oc lab, change all agent models from muse-spark-1.2-contributor-free to mimo-v2.6-flash-free`):** Owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` alongside `muse-spark-1.3-contributor-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`). Lab Engineer dispatched on #70 this run to update `opencode.json` two-knob and all `.github/workflows/*.yml` model pins.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 CLOSED at ac6f36d7 (M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 with live hello-through-tor and 9.82 eval). Issue #399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 67e5deff LIVE - Curator PR #406 MERGED Rebase on 2429c52e:** `origin/main` = `67e5deff20fa227cfe8ac008f000393408d56170` verified via `git ls-remote origin/main` == 67e5deff and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 67e5deff (parent 2429c52e -> e6fb41ec/2098963f/b9752a2c rebased as 68d85f72/970076fd/67e5deff, 3 commits). Deploy static site to GitHub Pages SUCCESS 36030993382 on 67e5deff (verified 2026-09-24T17:02Z). `tor-cli` heritage tri-OS green on ac6f36d7/2429c52e (pull_request 35992913191 6/6 on c8cf3e2). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`) - pending switch to `mimo-v2.6-flash-free` via lab.
 - **Workflows:** `maintainer.yml` 18/18 PASS (`workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]`), live workflows 21 (18 relevant + maintainer + Dependency Graph + pages-build-deployment, `tor-cli` active).
 - **Models:** `curl -s https://opencode.ai/zen/v1/models` shows `mimo-v2.6-flash-free` available as free, alongside `muse-spark-1.3-contributor-free`, `muse-spark-1.2-contributor-free`, `deepseek-v4-flash-free`, `mimo-v2.5-free`, etc. No CreditsError on current pins.

## IN FLIGHT
 - **Model switch #70 PENDING - Lab dispatched:** Issue #70 `[Lab Health & Audit Logs]` OPEN, owner `/oc lab` at 2026-09-24T07:14:03Z to change `muse-spark-1.2-contributor-free` -> `mimo-v2.6-flash-free`. Prior maintainer runs 35968645156 (07:18Z `[]` quiet watch) and 36030993644 (16:58Z standby) did not land the switch; Lab Engineer not yet dispatched for this directive until this run 36031508286. Decision `[{"action":"lab","issue":70}]` queued via PAT.
 - **Curator #405 CLOSED - PR #406 MERGED 67e5deff Rebase:** Issue #405 `[Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links` CLOSED at 2026-09-24T16:56:46Z (after merge 67e5deff, Fixes #405). PR #406 `Curator: graduate tor-cli, archive Obsidian, repair dead website links` MERGED at 2026-09-24T16:56:22Z via `gh pr merge --rebase` (head b9752a2c -> main 67e5deff, merge-base 2429c52e, linear, not orphan, 100 files 97 renames R100 + 3 edits).
 - **Open PRs:** [] (none - 406 merged, no other PRs)
 - **Open issues:** [70 lab-health (lab dispatched for model switch), 42 brainstorm] (#405 CLOSED 2026-09-24, #387 and #399 CLOSED at ac6f36d7)

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening MERGED 63d4ede6 Refs #387 -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 -> PAT dispatch MERGED e996d93 Refs #387 -> Linux per-OS torrc fix MERGED ac6f36d7 Closes #387/#399 (live hello-through-tor, 9.82 eval) -> Archive commit 2429c52e (Owner Archive on top of ac6f36d7) -> Curator #405 / PR #406 MERGED 67e5deff Closes #405 (graduate tor-cli, archive Obsidian, repair 3 dead links, stale cards) -> Lab model switch 70 dispatched (muse-spark -> mimo-v2.6-flash-free) -> Standby for lab landing and next Owner/Ideator. Deploy SUCCESS on 67e5deff verified.

## NEXT-RUN PLAYBOOK
 1. Verify `git ls-remote origin/main` successor to 67e5deff with `mimo-v2.6-flash-free` pins (both `opencode.json` two-knob and all `.github/workflows/*.yml` `model:` inputs) landed via Lab PR and Deploy still SUCCESS.
 2. Verify `gh issue list --state open` == [70,42] and Lab PR merged or in review; if lab PR open, triage review/test gates.
 3. Poll for new Owner directives or Curator/Auditor findings; if idle after model switch lands, standby `[]` (do not auto-dispatch Ideator).

## ISSUES
 - **#70** - OPEN lab-health (lab dispatched 36031508286 for mimo-v2.6-flash-free switch, owner request 07:14:03Z)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links (6 defects remediated, PR #406 MERGED Rebase 67e5deff, 3 commits, 100 files)
 - **#406** - MERGED PR Curator: graduate tor-cli, archive Obsidian, repair dead website links (Fixes #405, 3 commits Refs #405 rebased as 68d85f72/970076fd/67e5deff)
 - **#387** - CLOSED at ac6f36d7 Tor CLI — lightweight cross-platform Tor wrapper (per-app, shell, system-wide) — all milestones + live per-OS fix + 9.82 eval (parent of 2429c52e)
 - **#399** - CLOSED at ac6f36d7 [Audit] tor-cli sweep/drift — staged 9979 byte-identical, sweep dispatched on ac6f36d7
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Lab Engineer land `mimo-v2.6-flash-free` across all workflow pins and `opencode.json` without breaking `workflows:` allowlist 18/18 or Deploy, and will small/title runs stay CreditsError-free?
 - Any follow-up Curator polish for Kodak fixture archival fidelity (24 PPM re-provisionable via fetch_kodak.sh) or archive/README ordering after merge? Non-blocking, logged.

  - Hephaestus, the Maintainer
