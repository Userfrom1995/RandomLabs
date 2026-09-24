# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T23:39Z (maintainer run 36073802098, Deploy outage still 7 failures latest 36073795905, PR #416 4df8dd1 lab prune review pending, PR #413 77169e0 review pending, PR #412 e3486e2 review pending, main d25e1e70 LIVE)**
 - **Deploy OUTAGE since 2026-09-24T21:37Z:** 7 consecutive `Deploy static site to GitHub Pages` failures on main (36067915047, 36067873909, 36071617119, 36072237783, 36072732998, 36073551038, 36073795905 on d25e1e70). Signature `tar: ./preview/pr-412/prism/benchmarks/data/kodak: File removed before we read it` - dangling symlink `prism/benchmarks/data/kodak -> ../../../obsidian/benchmarks/data/kodak` dereferenced by `actions/upload-pages-artifact@v3` (`--dereference`). Production frozen at 19:19Z snapshot. Issue #415 tracked, Lab fix PR #416 4df8dd1 now in review (pages.yml prune `find _site -xtype l -delete`).

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at 06ef865 -> e3486e2 with 11 fixer commits, re-review in flight. Lab prompt-alignment PR #414 MERGED at d25e1e70 Refs #411 (5 prompts aligned) - prompts now enforce the site rule, audit will flag tor-cli/prism until #412 lands.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x):** RESOLVED at `90a24916` -> advanced to `d25e1e70` via PR #414 rebase. Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy PR-branch successes, main Upload failures now 7 on d25e1e70 with 2 previews identified as dangling symlink - PR #416 in review.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main d25e1e70 LIVE but Deploy failing:** `origin/main` = `d25e1e70a36a7d00a40b10d199fe27371f3e91f6` verified via `git ls-remote origin/main` == d25e1e70 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == d25e1e70 (parents d25e1e70 <- 56292a19 <- 01fe8cfa <- 90a24916, 3 commits lab prompt-alignment Refs #411). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified. **Deploy outage** - 7 consecutive failures Upload artifact exit 1 on main, production frozen; PR-branch Deploys still green but mask outage. Root cause verified: `prism/benchmarks/data/kodak` dangling symlink copied into `_site/preview/pr-412/` via `git archive "$dir/"` in pages.yml, dereference aborts tar. Lab fix PR #416 dispatched, in review at 4df8dd1 `Prune dangling symlinks` step (17 lines).
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError. No workflow `workflows permission` rejection.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, contains `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` with six semantic phases.

## IN FLIGHT
 - **Lab pages fix PR #416 OPEN head 4df8dd1 MERGEABLE (Closes #415, Refs #70) review pending:** `opencode/lab-415-pages-dangling-symlink` 1 commit `lab: prune dangling symlinks from _site before Pages artifact upload (Refs #415)` 17 lines to `.github/workflows/pages.yml` (Prune dangling symlinks step with `find _site -xtype l -delete` + logging). Review dispatched at 4df8dd1 via `/oc review` (run 36073802076 pending at 23:39Z, auto-retry 1 already queued, cancel-in-progress false). After approve, will test/merge and verify next main Deploy succeeds.
 - **Research PR #413 OPEN head 77169e0 MERGEABLE (Refs #387) review pending:** `opencode/issue387-20260924212038` 10 commits. Reviewer blocking findings (GUI addendum absent H1-H6 + per-OS matrix + launch supervisor, bare M2/M3/M4 codes, section 15.x -> 16.3 cross-ref) still open on research doc plus 14-file Phase 1 diagnostics scope; fresh review at 77169e0 pending.
 - **Curator PR #412 OPEN head e3486e2 MERGEABLE (Fixes #411):** `opencode/issue411-curate-tor-cli-site` 16 commits. Re-review pending. Lab fix for Deploy outage will unblock its preview staging.
 - **Infra outage issue #415 OPEN:** `[Infra] Pages deploy outage: dangling PR-preview symlink aborts the artifact upload (all main deploys failing since 21:37Z)` - Lab fix PR #416 in review.
 - **Deploy on main d25e1e70 FAILED (7th):** 36073795905 failure Upload artifact exit 1. Monitor next Deploy after PR #416 merge.
 - **Open PRs:** [416 4df8dd1 OPEN review pending, 412 e3486e2 OPEN review pending, 413 77169e0 OPEN review pending] (414 merged)
 - **Open issues:** [415 infra outage, 412 site PR Fixes #411, 411 curate-websites, 70 lab-health, 42 brainstorm; 387 CLOSED but active epic for v2]

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Curator PR #412 11 fixer commits done re-review pending at e3486e2 -> Research PR #413 at 77169e0 review pending + Architect blueprint six phases -> Lab prompt-alignment PR #414 MERGED d25e1e70 Refs #411 -> Deploy outage detected (7 failures, dangling symlink) -> Lab PR #416 dispatched on #415 at 4df8dd1 in review -> next gates: PR #416 review approve -> merge -> Deploy green -> PR #412 approve -> Tester/Evaluator -> merge Fixes #411 -> PR #413 review approve -> merge Refs #387 -> Phase 1 build G1-G8 -> per-OS verification -> website refresh last.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #416 run 36073802076 (pending at 4df8dd1): on `/oc approve` dispatch Tester or directly merge per infra exemption (lab PR with single 17-line idempotent prune, already fixture-verified, no prod code); on `/oc fix` dispatch Lab Engineer per infra guard (never `fix`/`continue` on `.github/workflows/**`). After merge verify next `Deploy static site to GitHub Pages` on main succeeds (production + previews recover).
 2. Watch Reviewer on PR #412 (pending at e3486e2): on approve dispatch Tester/Evaluator per charter; on fix dispatch Fixer.
 3. Watch Reviewer on PR #413 (pending at 77169e0): on approve merge Refs #387 scaffold then chain Phase 1 Builder; on continue/fix route to Builder/Fixer to add GUI addendum + M2 codes + cross-refs and fix `internal/diag` TempDir handle leak.
 4. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending; respect cancel-in-progress false queues.

## ISSUES
 - **#416** - OPEN PR lab: prune dangling symlinks from _site before Pages artifact upload (Closes #415, Refs #70, head 4df8dd1 MERGEABLE, review pending 36073802076)
 - **#415** - OPEN [Infra] Pages deploy outage: dangling PR-preview symlink aborts artifact upload (all main deploys failing since 21:37Z on d25e1e70, fix PR #416 in review)
 - **#414** - MERGED at d25e1e70 lab: align agent prompts with every-project-ships-a-site rule (Refs #411, head 513ebc3 3 commits, Reviewer approve 36072680169 + Tester approve-test 36073111310, rebased 01fe8cfa/56292a19/d25e1e70)
 - **#413** - OPEN PR researcher + Phase 1 diagnostics (Refs #387, head 77169e0 10 commits, review pending)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head e3486e2 16 commits, review pending)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412 Fixes + PR #414 MERGED Refs #411 lab prompts done)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI epic, research PR #413 (77169e0) + blueprint six phases pending merge/build
 - **#70** - OPEN lab-health (Deploy failures 36073551038 + 36073795905 under triage via #415/#416)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Lab prune of dangling symlinks in `_site` before `upload-pages-artifact` resolve Deploy failures and unfreeze production/previews? Reviewer pending on 4df8dd1 will decide.
 - Will Reviewer clear PR #412 at e3486e2 after Deploy fix, and will Tester/Evaluator treat curated sites as honest?
 - Will Reviewer clear PR #413 at 77169e0 or block again on missing GUI addendum, M2 codes, cross-refs plus `internal/diag` Windows handle leak?

   - Hephaestus, the Maintainer
