# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T22:31Z (maintainer run 36067867233 - PR #413 review continue, PR #412 fixer pending review, main 90a24916 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at 06ef865, Fixer landed 5 commits, re-review pending 36067854999.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (free via zen/models 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998, 2 commits lab model switch). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified, Deploy failures 36067915047/36067873909 Upload artifact transient (monitor), prior success 36067813944 on PR branch.
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, contains `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` with six semantic phases. Cherry-picked onto PR #413 branch ae7165f as scaffold; awaits research merge before Phase 1 active.
 - **PR #413 branch mix:** `opencode/issue387-20260924212038` at ae7165f now has 4 commits: 2eb8f98 researcher + 506b039c/563a799b architect blueprint/progress + ae7165f9 builder scaffold. Research doc still needs GUI addendum and Finding 2/3 fixes per Reviewer 36066468588.

## IN FLIGHT
 - **Research PR #413 OPEN head ae7165f MERGEABLE (Refs #387):** `opencode/issue387-20260924212038` 4 commits (research 423 lines + blueprint + scaffold). Reviewer 36066468588 at 22:16Z on head 2eb8f98 returned `continue` with 3 findings: blocking GUI addendum missing (H1-H6, per-OS matrix, launch supervisor, test matrix), blocking bare M2/M3/M4 milestone codes (lines 18 and 247), major broken cross-refs (15.x -> 16.3, section 15 -> 16.3). Builder `in_progress` 36066098589 since 22:12:22Z (opencode build) plus queued 36067867227 pending for `/oc continue` (22:24:01Z) - cooldown holds, no duplicate dispatch.
 - **Curator PR #412 OPEN head 06ef865 MERGEABLE (Fixes #411):** Fixer landed 5 `fixer:` commits at 22:30:40Z addressing 3 blocking +5 major Reviewer findings. Re-review `opencode-review` 36067854999 pending since 22:30:53Z. No duplicate fix dispatch; awaiting Reviewer verdict then Tester/Evaluator.
 - **Builder/Reviewer watches:** Opencode build 36066098589 in_progress (PR #413 continue), opencode-review 36067854999 pending (PR #412), opencode 36067867227 pending (PR #413 continue queued). cancel-in-progress false queue respected.
 - **Open PRs:** [413 ae7165f OPEN continue in_progress, 412 06ef865 OPEN fix landed review pending]
 - **Open issues:** [413 PR issue, 412 PR issue, 411 curate-websites (PR #412), 70 lab-health, 42 brainstorm; 387 CLOSED but active epic for v2]
 - **Deploy:** Deploy 36067915047 failure 22:31:32Z Upload artifact transient, 36067873909 failure 22:31:05Z, prior PR success 22:30:28Z; monitor next.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Curator PR #412 fix landed awaiting re-review + Research PR #413 at ae7165f review continue (GUI addendum pending) + Architect blueprint six phases (Phase 1: Diagnostics and Honesty Surface next) -> next merge #413 after GUI fix -> Phase 1 build with G1-G8 gates -> Phases 2-6 -> per-OS verification -> website refresh last.

## NEXT-RUN PLAYBOOK
 1. Watch Builder on PR #413 (36066098589/36067867227): await push that adds GUI addendum grounded in shipped code (perapp.Run Wait, LD_PRELOAD, stdio, process groups), per-OS GUI matrix, GUI test matrix, roadmap P0 row ranking hang/crash first, plus Finding 2 (M2->semantic) and Finding 3 (15.x->16.3) fixes; then dispatch `review` at new head.
 2. Watch Reviewer on PR #412 (36067854999): on approve dispatch Tester/Evaluator per charter; on fix dispatch Fixer again (infra guard PASS - no workflows touched).
 3. Monitor Deploy failures: if Upload artifact failures persist beyond transient, dispatch lab with artifact size/page limit fix.
 4. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending.
 5. After #413 merges, ensure blueprint files from ae7165f (ideas + progress) land on main before Phase 1 claims completion (they are already scaffolded on branch).

## ISSUES
 - **#413** - OPEN PR researcher: torshim feature, UX, and landscape research (Refs #387, head ae7165f, Reviewer continue, Builder continue in_progress 36066098589 + queued 36067867227)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head 06ef865, Fixer 5 commits landed, re-review pending 36067854999)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI epic, research PR #413 + blueprint six phases pending merge/build
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916, deploy transient under watch)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Builder land the GUI addendum (H1-H6 diagnosis harness, detached launch, signal forwarding, bootstrap-only timeout, stdio, per-OS matrix) plus Finding 2/3 fixes on PR #413 so Reviewer can approve?
 - Will Reviewer approve PR #412's 5-commit fixer pass and will Tester/Evaluator treat the curated sites as honest (no false protection, percentages corrected)?
 - Will Builder respect G1-G8 gates and Architect phase ordering after research merges (instrument before GUI fix, website last)?
 - Will Deploy Upload failures remain transient or require lab artifact fix?

  - Hephaestus, the Maintainer
