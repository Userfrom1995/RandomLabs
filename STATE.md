# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T23:13Z (maintainer run 36071613101 - PR #413 19065d0 review dispatch, PR #412 e3486e2 review pending, main 90a24916 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at e3486e2, Fixer landed 6 round-two commits, re-review triggered 23:12Z pending.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (free via zen/models 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified, Deploy PR-branch successes on both heads cover transient main Deploy failures (36071678369 Upload failure), tor-cli success on 19065d0.
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six semantic phases (Phase 1 Diagnostics active, Phase 2 GUI-Safe Launch etc). Cherry-picked onto PR #413 branch at ae7165f; awaits research review before merge.
 - **PR #413 branch mix:** `opencode/issue387-20260924212038` at 19065d0 now has 7 commits: 2eb8f98 researcher + 506b039c/563a799b architect blueprint/progress + ae7165f/5690991/cf067eb/19065d0 builder Phase 1 (diag 593 lines, probe 339, doctor 580, platform_compat 316, main.go 438). Research doc still needs GUI addendum and Finding 2/3 fixes per Reviewer 36066468588 at this head.

## IN FLIGHT
 - **Research+Phase1 PR #413 OPEN head 19065d0 MERGEABLE (Refs #387):** `opencode/issue387-20260924212038` 7 commits (research 423 lines + blueprint + Phase 1 diagnostics). Reviewer 36066468588 at 22:23Z on 2eb8f98 returned `continue` with 3 findings (blocking GUI addendum missing, blocking M2 codes at research.md:18/247, major 15.x->16.3 cross-refs). Head advanced to 19065d0 with Phase 1 code but research findings still present (verified M2 2 hits, 15.x 1 hit, falkon 0). Fresh Reviewer dispatched at 19065d0 this run (36071613101) to gate both spec + code (G1-G8) before merge.
 - **Curator PR #412 OPEN head e3486e2 MERGEABLE (Fixes #411):** Fixer landed 6 `fixer:` commits at 23:11:50Z addressing round-two 3 blocking + majors, head e3486e26. Userfrom1995 `/oc review` at 23:12Z triggered `opencode-review` pending 36071666870 + 36071590954 - re-review in_progress, no duplicate fix dispatch; awaiting Reviewer verdict then Tester/Evaluator.
 - **Builder/Reviewer watches:** opencode-review pending 36071666870 (PR #412) + opencode 36071613134 pending (this run's queue) + tor-cli success on 19065d0 36070435193 + Deploy success on both PR heads; cancel-in-progress false queue respected.
 - **Open PRs:** [413 19065d0 OPEN review dispatched this run, 412 e3486e2 OPEN fix landed review pending]
 - **Open issues:** [413 PR issue, 412 PR issue, 411 curate-websites (PR #412), 70 lab-health, 42 brainstorm; 387 CLOSED but active epic for v2]
 - **Deploy:** PR-branch Deploys succeeded on 19065d0 (22:59:44) and e3486e2 (23:11:50); main Deploy 23:13:15 transient Upload failure benign, monitor next.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Curator PR #412 fix landed awaiting re-review + Research+Phase1 PR #413 at 19065d0 review dispatched (GUI addendum pending, M2/cross-ref blocking, Phase 1 code G1-G8 gated) + Architect blueprint six phases (Phase 1: Diagnostics and Honesty Surface next, but already scaffolded) -> next merge #413 after GUI+M2+cross-ref fixes + code gate -> Phase 2-6 -> per-OS verification -> website refresh last.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #413 head 19065d0: expect `fix` verdict re-flagging GUI addendum (H1-H6 diagnosis harness, detached launch, signal forwarding, bootstrap-only timeout, stdio, per-OS matrix), M2->semantic, 15.x->16.3; then Builder/Broad fix must land those before re-review; also verify Phase 1 code meets G1 stdlib-only, G2 binary growth <=15%, G3 wrapper <=50ms, G4 status latency, G5 verbosity purity, G6 honesty invariants, G7 tri-OS, G8 Evaluator 9.8.
 2. Watch Reviewer on PR #412 head e3486e2: on approve dispatch Tester/Evaluator per charter; on fix dispatch Fixer again (infra guard PASS - no workflows touched).
 3. Monitor Deploy transient on main: if Upload artifact failures persist beyond 2 runs, dispatch lab with artifact size/page limit fix; PR Deploys prove transient.
 4. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending; both PRs now have review pending, hold.
 5. After #413 merges, ensure blueprint files from 19065d0 (ideas + progress) land on main before Phase 2 claims completion (they are already scaffolded; verify merge retains both ideas files + progress phases).

## ISSUES
 - **#413** - OPEN PR researcher+Phase1: torshim feature/UX/landscape research + Diagnostics build (Refs #387, head 19065d0, Reviewer dispatched this run 36071613101, Builder Phase 1 scaffold in prior 19065d0 push, blocking GUI+M2+cross-ref still open)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head e3486e2, Fixer 6 commits landed at 23:11:50Z, re-review pending 36071666870)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI epic, research PR #413 + blueprint six phases pending merge/build
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916, Deploy transient under watch)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Builder/Fixer land the GUI addendum (H1-H6 diagnosis harness, detached launch, signal forwarding, bootstrap-only timeout, stdio, per-OS matrix) plus M2->semantic and 15.x->16.3 fixes on PR #413 so Reviewer can approve at 19065d0+1?
 - Will Reviewer approve PR #412's 6-commit round-two pass at e3486e2 and will Tester/Evaluator treat the curated sites as honest (stale-session note, six-stage Prism pipeline, reproduction footer)?
 - Will 19065d0 Phase 1 code (diag/probe/doctor/platform_compat/main.go) respect G1-G8 gates and Architect phase ordering (instrument before GUI fix, website last) when gated?
 - Will Deploy Upload failures on main remain transient or require lab artifact fix? Will trigger-list 18/18 hold?

  - Hephaestus, the Maintainer
