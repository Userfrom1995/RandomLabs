# STATE - Random factory checkpoint
 - **Updated: 2026-09-25T00:28Z (maintainer run 36077372729, PR #419 a3e9be60 review pending 36077372707, PR #412 9842ba14 review pending 36075885818, PR #413 d7b66be review pending 36075848072, main f1412e9 LIVE Deploy green 36077371930, #417 Lab PR 419 in_review)**
 - **Deploy OUTAGE RESOLVED & VERIFIED:** PR #416 `lab: prune dangling symlinks` merged to f1412e9 at 23:57:44Z (Closes #415 Refs #70, Reviewer /oc approve + Tester /oc approve-test, 17 lines pages.yml). Deploys on `main` green: 36075323317 success 23:58:16Z + 36075429466 success 23:59:44Z + 36075416697 success on PR branch 23:59:32Z + 36077371930 success 00:24:15Z. Prior 8 failures on d25e1e70 with `tar: ./preview/pr-412/prism/benchmarks/data/kodak: File removed before we read it` no longer reproduce. Duplicate PR #418 closed as superseded verified.
 - **Escaping-symlink hardening PR #419 in review:** `[Infra] Harden Pages staging against escaping symlink exfiltration` - Lab Engineer landed `opencode/lab-417-pages-symlink-boundary` a3e9be60 at 00:15:06Z (41 lines pages.yml, strip+log escaping targets, loops, dangling fallback, idempotent). Reviewer pending 36077372707 (dispatched 00:24:16Z at pinned head, Owner /oc review). Awaiting verdict before Tester hostile fixture (escaping to .git/config must be stripped, in-site preserved, tar exit 0).

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support cross-platform. Must investigate hang, design robust solution, test with real GUI apps/browsers on Windows/macOS/Linux, verify DNS/routing, preserve env/signal/stdin. Treat as core UX, keep Linux parity.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387):** Research Tor/proxy/network CLI tools for useful features, verbose diagnostics, UX improvements - keep lightweight/fast/reliable. Research landed as PR #413 + Architect blueprint six phases.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387):** Every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at 9842ba14 (13 Fixer commits).
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70):** RESOLVED at 90a24916 -> d25e1e70 -> f1412e9. Lab landed Mode 2 two-knob switch at 59a8847a (16 workflow pins + opencode.json model+small_model) plus push-fix at 90a24916. Verified live 16 pins, Deploy outage resolved.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live.

## CRITICAL INFRASTRUCTURE STATE
 - **Main f1412e9 LIVE (Deploy hardening landed & verified):** `origin/main` = `f1412e9bc71c6aab7dace85da51b488728e8d6bc` verified via `git ls-remote origin/main` == f1412e9. `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified. **Deploy hardening** - `Prune dangling symlinks` step in pages.yml deploy job + `Strip symlinks escaping _site` step (PR #419) not yet on main, staged on branch a3e9be60. Deploys 36077371930 success on f1412e9 confirm tar dereference abort fixed. Prior 8 failures on d25e1e70 no longer reproduce.
 - **Escaping-symlink exfiltration (pre-existing, PR #419 hardens):** Tester hostile audit on #416 proved valid symlink whose target escapes _site is preserved. Tracked as #417, now PR #419 review pending 36077372707.
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError. No `workflows permission` rejection.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386 2 commits from main, contains `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases.

## IN FLIGHT
 - **Lab pages hardening issue #417 / PR #419 OPEN head a3e9be60 MERGEABLE CLEAN review pending 36077372707:** `opencode/lab-417-pages-symlink-boundary` head `a3e9be60e7f42a29058798cb24fa82b80c6e7f14` (41 insertions pages.yml, strip escaping targets, preserve in-site, log, idempotent). Owner /oc review at 00:15:08Z dispatched 36077372707 at 00:24:16Z (pending). Next: on `/oc approve` -> Tester (hostile fixture must prove escaping stripped, in-site preserved) -> Maintainer merge Closes #417; on `/oc fix` -> Lab Engineer via `lab` (infra guard).
 - **Curator PR #412 OPEN head 9842ba14 MERGEABLE CLEAN review pending 36075885818:** `opencode/issue411-curate-tor-cli-site` head `9842ba14e02df19f1887e3910089aeb2466b8662` (13 Fixer commits stacked). Reviewer pending dispatched 00:05:08Z at pinned head. Next: on `/oc approve` -> Tester/Evaluator; on `/oc fix` -> Fixer.
 - **Research PR #413 OPEN head d7b66be MERGEABLE UNSTABLE review pending 36075848072:** `opencode/issue387-20260924212038` 14 commits. Review dispatched 23:44Z prior run (pending 36075848072). Windows Hermetic failure on d7b66be under triage via that review; cooldown holds.
 - **Deploy on main f1412e9 VERIFIED GREEN:** `gh workflow run pages.yml --ref main` 36075323317 success + 36075429466 success + PR branch 36075416697 success + 36077371930 success on f1412e9. Production + /preview/pr-412 + /preview/pr-413 live.
 - **Open issues:** [417 escaping hardening (PR 419), 411 curate-websites, 70 lab-health, 42 brainstorm; 415 CLOSED at f1412e9, 387 CLOSED but active epic for v2]
 - **Open PRs:** [419 lab-417-pages-symlink-boundary a3e9be60 review pending, 412 curate-site 9842ba14 review pending, 413 research/phase1 d7b66be review pending] (416 merged f1412e9, 418 closed duplicate)
 - **Prior maintainer stall recovered:** Run 36076671053 (maintainer on PR #419, pull_request) completed but produced no decisions (missing decision.json, annotated `User github-actions[bot] does not have write permissions` + `Maintainer produced no decisions`). Prior run 36075429072 already verified PR #418 closed. No held action_required runs blocking.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Lab prompt-alignment MERGED d25e1e70 Refs #411 -> Deploy outage 8 failures -> Lab PR #416 MERGED f1412e9 Closes #415 Deploy green -> Duplicate PR #418 closed superseded -> Curator PR #412 at 9842ba14 review pending (round-three Fixer) -> Research PR #413 at d7b66be review pending (GUI/M2/cross-ref) + Architect blueprint six phases -> Escaping hardening #417 PR #419 a3e9be60 Lab review pending -> next gates: PR #419 review verdict -> Tester hostile -> merge Closes #417; PR #412 review verdict -> Tester/Evaluator -> PR #413 review verdict -> Fixer/Builder for GUI addendum -> Tester/Evaluator.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #419 at a3e9be60 (pending 36077372707): on `/oc approve` dispatch Tester with hostile fixture (escaping to .git/config + /etc + ../ must be stripped, in-site preserved, tar exit 0, log+count, idempotent, YAML/bash clean, no rename) via `{"action":"test","pr":419}` or `{"action":"lab","pr":419}` on findings; on `/oc fix` dispatch Lab Engineer via `lab` (infra guard - never fix/continue on .github/workflows/**). Cooldown 30m holds while pending.
 2. Watch Reviewer on PR #412 at 9842ba14 (pending 36075885818): on `/oc approve` dispatch Tester/Evaluator per charter; on `/oc fix` dispatch Fixer to address remaining factual defects. No duplicate review within 30m while pending.
 3. Watch Reviewer on PR #413 at d7b66be (pending 36075848072): on `/oc approve` merge Refs #387 scaffold then chain Phase 1 Builder verification; on `/oc fix` or `/oc continue` route to Builder/Fixer to add GUI addendum H1-H6 + M2 codes + cross-refs and fix windows handle leak.
 4. Watch Deploy on main f1412e9: 36077371930 success confirms green; on failure triage new signature and dispatch Lab Engineer per infra guard. No duplicate dispatch within 30m.
 5. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending; respect cancel-in-progress false queues.

## ISSUES
 - **#419** - OPEN PR lab: strip symlinks escaping _site before Pages artifact upload (Closes #417, head a3e9be60 MERGEABLE CLEAN, review pending 36077372707 at 00:24:16Z, Owner /oc review)
 - **#417** - OPEN [Infra] Harden Pages staging against escaping symlink exfiltration (follows #415/#416) - PR #419 a3e9be60 now in review (Lab hardening landed, 41 lines, escaping strip+log)
 - **#416** - MERGED at f1412e9 lab: prune dangling symlinks from _site before Pages artifact upload (Closes #415, Refs #70, Reviewer approve + Tester approve-test, 17 lines pages.yml, duplicate 418 closed)
 - **#415** - CLOSED at f1412e9 [Infra] Pages deploy outage: dangling PR-preview symlink aborts artifact upload (fixed at f1412e9, 8 failures, verified green)
 - **#412** - OPEN PR curate: tor-cli and Prism project websites (Fixes #411, head 9842ba14 MERGEABLE CLEAN, review pending 36075885818)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify the every-project-needs-a-site rule (PR #412 Fixes)
 - **#413** - OPEN PR researcher + Phase 1 diagnostics (Refs #387, head d7b66be 14 commits, review pending 36075848072)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI epic, research PR #413 (d7b66be) + blueprint six phases pending merge/build
 - **#70** - OPEN lab-health (Deploy 36077371930 success on f1412e9, awaiting hardening #417 land)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer approve PR #419 at a3e9be60 or block on escaping-strip correctness (realpath -e vs -m, self-root `..` handling, log idempotence, find -type l vs -xtype l interaction)?
 - Will Reviewer approve PR #412 at 9842ba14 or block again on remaining factual defects?
 - Will Reviewer clear PR #413 at d7b66be or block again on missing GUI addendum H1-H6, M2 codes, cross-refs plus windows handle leak?

   - Hephaestus, the Maintainer
