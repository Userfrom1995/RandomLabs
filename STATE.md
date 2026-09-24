# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T16:48Z (maintainer run 36029861291 - PR #406 curate dispatch review, main 2429c52e LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 CLOSED at ac6f36d7 (M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 with live hello-through-tor and 9.82 eval). Issue #399 CLOSED at ac6f36d7.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 2429c52e LIVE - Archive commit on top of tor-cli ac6f36d7:** `origin/main` = `2429c52e8d8a29763e31eaa13271484b8f3837a7` verified via `git ls-remote origin/main` == 2429c52e and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 2429c52e (parent ac6f36d7, commit `Archive` 1 file, message "Archive"). `tor-cli` tri-OS still green on 2429c52e base (inherits ac6f36d7 gates: pull_request 35992913191 6/6 on c8cf3e2 same diff). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`).
 - **Workflows:** `maintainer.yml` 18/18 PASS (`workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]`), live workflows 21 (18 relevant + maintainer + Dependency Graph + pages-build-deployment, `tor-cli` active).

## IN FLIGHT
 - **Curator #405 OPEN - PR #406 OPEN MERGEABLE clean:** Issue #405 `[Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links` OPEN (scheduled Curator audit, 6 defects: stale Active, Previous overflow, 3 dead Website 404, stale torshim card, archival fallout, stale meta). PR #406 `Curator: graduate tor-cli, archive Obsidian, repair dead website links` head `opencode/issue405-curate-readme-archive-links` b9752a2c349b029f8d9b4c0f1e8ea4111f25c563 on base 2429c52e, `mergeable=true` `mergeable_state=clean` MERGEABLE, 3 commits linear (e6fb41ec archive obsidian + git mv, 2098963f graduate tor-cli, b9752a2c refresh index.html), 100 files (97 renames R100, 3 edits). No `.github/workflows/**` touch, so infra guard PASS, review-eligible.
 - **Open PRs:** [406 curate - awaiting Reviewer]
 - **Open issues:** [405 curate, 70 lab-health, 42 brainstorm] (#387 and #399 CLOSED at ac6f36d7, now parent 2429c52e)
 - **Lab dispatch this run:** `review` on PR #406 head b9752a2c (Curator handoff per LAB.md, Owner /oc review at 2026-09-24T16:47:45Z).

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening MERGED 63d4ede6 Refs #387 -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 -> PAT dispatch MERGED e996d93 Refs #387 -> Linux per-OS torrc fix MERGED ac6f36d7 Closes #387/#399 (live hello-through-tor, 9.82 eval) -> Archive commit 2429c52e (Owner Archive on top of ac6f36d7) -> Curator audit #405 / PR #406 (graduate tor-cli, archive Obsidian, repair 3 dead links, stale cards) now in review.

## NEXT-RUN PLAYBOOK
 1. Poll Reviewer: `gh run list --workflow opencode-review --limit 5` for `approve`/`fix` on b9752a2c (allow 5m). If `approve`, dispatch Tester via `{"action":"test","pr":406}` per Curator->Reviewer->Tester handoff; if `fix`, dispatch Fixer/Lab.
 2. Verify Deploy static site preview on PR #406 head b9752a2c (pages.yml preview at /preview/pr-406/) and main 2429c52e still Deploy success.
 3. If Tester `approve-test` on 406, verify live-run evidence then dispatch Evaluator or merge per Curator lane (no Tester→Evaluator binding for docs-only PRs, but Evaluator optional). Merge via `gh pr merge 406 --rebase` (no orphan, merge-base 2429c52e present) then `gh issue close 405 --reason completed`; keep 10-entry invariant.

## ISSUES
 - **#405** - OPEN [Curator] Graduate tor-cli to Previous Projects, archive Obsidian, repair dead website links (scheduled audit, 6 defects, PR #406 at b9752a2c MERGEABLE clean)
 - **#406** - OPEN PR Curator: graduate tor-cli, archive Obsidian, repair dead website links (Fixes #405, 3 commits, review dispatched b9752a2c)
 - **#387** - CLOSED at ac6f36d7 Tor CLI — lightweight cross-platform Tor wrapper (per-app, shell, system-wide) — all milestones + live per-OS fix + 9.82 eval (parent of 2429c52e)
 - **#399** - CLOSED at ac6f36d7 [Audit] tor-cli sweep/drift — staged 9979 byte-identical, sweep dispatched on ac6f36d7
 - **#70** - OPEN lab-health (Deploy success expected on 2429c52e, 18/18 PASS)
 - **#42** - OPEN brainstorm
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Reviewer approve PR #406's surgical edits (3 dead Website links dropped, tor-cli graduated README-only, Obsidian git mv to archive/ + catalog, torshim Shipped card, meta description Tor CLI) as within Curator scope (subproject-internal obsidian/ refs intentionally untouched per PR body)?
 - Will local link verification (every README.md + index.html target exists, umbra/doom/poolduel/sextant/tabula/folio/helix/kinetica 200) hold on live Pages preview /preview/pr-406/?
 - Any follow-up Curator polish for archive/README ordering or index.html provenance notes after merge?

  - Hephaestus, the Maintainer
