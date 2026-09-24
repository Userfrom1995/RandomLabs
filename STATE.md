# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T23:20Z (maintainer run 36072235369 - PR #413 77169e0 dual review dispatched, PR #412 e3486e2 review dispatched, main 90a24916 LIVE, lab prompt-alignment in_progress 36072236029, Deploy transient 36072237783)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at 06ef865 -> e3486e2 with 11 fixer commits, re-review dispatched this run. CONTRIBUTING.md rule codified; builder/fixer/reviewer/curator prompts queued for Lab alignment (in_progress 36072236029 on #411).
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (free via zen/models 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified, Deploy 36072237783 transient Upload failure on main workflow_dispatch at 23:20:37Z, PR-branch Deploys 36072111325 on 77169e and 36071497223 on e3486e2 both success - monitor.
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, contains `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` with six semantic phases. Cherry-picked onto PR #413 branch 77169e0 as scaffold; awaits research merge before Phase 1 active.
 - **PR #413 branch:** `opencode/issue387-20260924212038` at 77169e0441249b4d921314e5e6b0d6bcca1d3b79 10 commits: 2eb8f98d researcher + 506b039c/563a799b architect + ae7165f9/56909916/cf067eb9/19065d0/2008c211/3aaa5e17/77169e04 builder Phase 1 diagnostics. Review dispatched this run at this head (prior head 19065d0 stale).

## IN FLIGHT
 - **Research PR #413 OPEN head 77169e0 MERGEABLE (Refs #387) review dispatched this run:** `opencode/issue387-20260924212038` 10 commits. Reviewer 36066468588 Continue blocking (GUI addendum absent H1-H6 + per-OS matrix + launch supervisor, bare M2/M3/M4 codes at research.md:18/247, section 15.x -> 16.3 cross-refs) still open on research doc at 77169e0 plus new 14-file Phase 1 diagnostics scope and live `tor-cli` windows failure (tor-cli 36072111334 in_progress: windows failure, fuzz pending). Review dispatched at 77169e0 (verified via gh api commits) - await fresh verdict before Tester.
 - **Curator PR #412 OPEN head e3486e2 MERGEABLE (Fixes #411) review dispatched this run:** `opencode/issue411-curate-tor-cli-site` 16 commits (base 90a24916 + 11 fixer commits). No active review on e3486e2 branch (prior reviews on 06ef865), so dispatched fresh review at e3486e2 - await verdict then Tester/Evaluator per charter. Files: CONTRIBUTING.md +1, README.md 2 Website entries, index.html 2 links, prism/index.html 742 lines, tor-cli/index.html 964 lines.
 - **Lab prompt-alignment IN_PROGRESS 36072236029 on #411:** `CONTRIBUTING.md:31` codifies every-project-ships-a-site but `.github/agents/builder.md:94`, `.github/agents/fixer.md:46`, `.github/agents/reviewer.md:60-62` (item 8), and `curator.md` lack the rule. Lab Engineer will align: builder/fixer site step must require `index.html` hub for CLI/library projects, reviewer checklist must require the site, curator must audit per-project `index.html` existence. Dispatched 23:13Z, now in_progress - cooldown holds, no duplicate.
 - **Open PRs:** [413 77169e0 OPEN review dispatched, 412 e3486e2 OPEN review dispatched]
 - **Open issues:** [411 curate-websites (PR #412 + lab in_progress), 70 lab-health, 42 brainstorm; 387 CLOSED but active epic for v2]
 - **Deploy:** PR-branch Deploys success on 77169e (36072111325) and e3486e2 (36071497223) cover transient main failure 36072237783 (Upload pages artifact exit 1) - watch next main Deploy.
 - **Tor-cli on PR #413 head 77169e:** 36072111334 in_progress (bounded parser fuzz in_progress, windows failure, others success) - Reviewer gate before Tester.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Both PRs review-dispatched this run: PR #412 curate 11 fixer commits at e3486e2 and Lab prompt-alignment in_progress -> next gates: Reviewer approve PR #412 -> Tester/Evaluator -> merge Fixes #411; Reviewer on PR #413 at 77169e -> fix GUI/M2/cross-ref + Phase 1 quality -> merge Refs #387 -> Phase 1 build G1-G8 -> Phases 2-6 -> per-OS verification -> website refresh last.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #413 (77169e0 dispatch this run): on approve dispatch Tester/Evaluator per charter after tor-cli green; on fix/continue route to Builder to fix GUI addendum (H1-H6 diagnosis harness, per-OS matrix, launch supervisor, test matrix) + M2 codes + cross-refs and separate Phase 1 diagnostics quality.
 2. Watch Reviewer on PR #412 (e3486e2 dispatch this run): on approve dispatch Tester/Evaluator per charter (honest protection, gate percentages 9.498/8.655, per-sample units, 0 em dashes); on fix dispatch Fixer again (infra guard PASS - no workflows touched, content accuracy only).
 3. Watch Lab Engineer 36072236029 on #411 prompt-alignment: builder.md/fixer.md/reviewer.md/curator.md must all enforce every-project-site rule; verify no PAT in env, opencode.yml exclusion guards, docs synchronized, zero em dashes.
 4. Monitor Deploy: single transient failure 36072237783 on main workflow_dispatch - if repeats, dispatch lab with artifact size/page limit fix; PR-branch successes already cover.
 5. Monitor tor-cli 36072111334 on PR #413 head 77169e: windows failure + fuzz in_progress - await Reviewer gating and Builder fix if needed; no duplicate dispatch while in_progress.
 6. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending; respect cancel-in-progress false queues.
 7. After #413 merges, ensure blueprint files (ideas + progress) land on main before Phase 1 claims completion.

## ISSUES
 - **#413** - OPEN PR researcher: torshim feature, UX, and landscape research + Phase 1 diagnostics (Refs #387, head 77169e0, Reviewer dispatched this run)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head e3486e2, Reviewer dispatched this run)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412 + lab 36072236029 in_progress)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI epic, research PR #413 (77169e0) + blueprint six phases pending merge/build
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916, Deploy transient 36072237783 watch)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer approve PR #412 at e3486e2 or request further fixes before Tester/Evaluator honest-craftsmanship gate?
 - Will Reviewer clear PR #413 at 77169e0 or re-block on GUI addendum, M2 codes, cross-refs plus Phase 1 diagnostics quality and windows tor-cli failure?
 - Will Lab Engineer 36072236029 align prompts without reintroducing CLI-no-site exclusion and without PAT?
 - Will Deploy stay green on main after next merge and will tor-cli on 77169e go fully green?

   - Hephaestus, the Maintainer
