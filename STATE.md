# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T22:31Z (maintainer run 36067855051 - PR #412 fix landed 06ef865, re-review pending; PR #413 review/build in-flight; main 90a24916 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at 06ef865 (post-fix, 5 fixer commits), re-review pending 36067854999 on new head.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (free via zen/models 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy mixed (fail 36067873909 transient, then success+inflight), 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998, 2 commits lab model switch). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified, Deploy 36067873909 failure 22:31:05Z transient Upload artifact then 36067915047 in_progress 22:31:32Z + pr-412 36067813944 success + pr-413 36067286362 success, monitor transient.
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, contains `ideas/2026-09-24-torshim-cli-v2.md` 43fb131b 28033 bytes + `progress/387-tor-cli.md` ecefc31c 8118 bytes with six semantic phases (P0/P1 split, CLI first, website last). Not yet merged to main; Phase 1 build waits on research PR #413 merging per blueprint.

## IN FLIGHT
 - **Curator PR #412 OPEN head 06ef865 (Fixes #411):** MERGEABLE, Fixer landed 5 commits at 22:30:40Z (rebased on 90a24916) addressing all 3 blocking +5 major + minors (perapp raw-syscall honesty, fail-closed wording, prism gates 9.498/3.166 + 8.655/2.885 + JPEG-LS, disconnect exit 4 Refused Linux-only, 8 verbs+shorthand, Kodak path prism/benchmarks/data/kodak, bench-x vs run_kodak, repro both units, nav scroll, contrast 7c8aa6 5.67:1, copy payloads, etc). Prior review 22:07:30Z /oc fix done. New review dispatched at 22:30:53Z as opencode-review 36067854999 pending on main 90a24916 (head 06ef865) - await verdict, then Tester/Evaluator.
 - **Research PR #413 OPEN head ae7165f MERGEABLE (Refs #387):** `opencode/issue387-20260924212038` 1 commit 423 lines `tor-cli/docs/research.md` sections 12-19. Owner `/oc architect` 21:46:34Z -> blueprint 68250386 -> Owner `/oc build this` 22:12:19Z triggered build 36066098589 in_progress + queued 36066115216 pending (cancel-in-progress false). Review dispatched at 22:12Z; new continuation `/oc continue` dispatched as opencode 36067867227 pending on main 90a24916 (Builder final hardening entry for #387) - await Reviewer/Test on 413 then merge.
 - **Tor-cli CI in_progress on both branches:** `tor-cli` 36067813985 on opencode/issue411-curate-tor-cli-site 06ef865 (3 OS success, fuzz/live in_progress) and `tor-cli` 36067286418 on opencode/issue387-20260924212038 ae7165f (similar). Both healthy; no failures beyond Deploy transient.
 - **Open PRs:** [412 curate 06ef865 OPEN re-review pending, 413 researcher ae7165f OPEN builder pending]
 - **Open issues:** [411 curate-websites (PR #412 re-review), 70 lab-health, 42 brainstorm; 387 CLOSED but active for v2 research/blueprint/build]
 - **Deploy:** Deploy 36067873909 failure 22:31:05Z transient then 36067915047 in_progress 22:31:32Z + PR previews success; monitor.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Curator PR #412 at 06ef865 fix-landed re-review pending + Research PR #413 at ae7165f builder pending + Architect blueprint 68250386 six phases (Phase 1: Diagnostics active next) -> next: Reviewer approve 412 -> Tester/Eval -> merge Fixes #411; Reviewer approve 413 -> merge Refs #387 (+ blueprint to main) -> Phase 1 build G1-G8 -> Phases 2-6 -> per-OS verification -> website refresh.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer 36067854999 on PR #412 06ef865: if approve dispatch Tester -> Evaluator -> merge Fixes #411; if fix re-dispatch Fixer with exact file:line findings.
 2. Watch Reviewer/Builder on PR #413 ae7165f: if approve merge Refs #387 then ensure blueprint files from 68250386 land on main before Phase 1 build claims done; if fix dispatch Fixer.
 3. Watch opencode 36067867227 builder final hardening: verify it respects Phase 1 Diagnostics scope (verbosity, doctor, status --verify, --help exit fix) and G1-G8 (stdlib-only, 15% binary, 50ms overhead, honesty) without overreaching into GUI/system-proxy (Phases 2/5).
 4. Monitor Deploy/tor-cli: Deploy 36067915047 in_progress should succeed; tor-cli fuzz/live should go 6/6 green on both branches. If Upload artifact failures persist, dispatch lab with artifact/pages fix.
 5. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending; both PRs have pending runs.

## ISSUES
 - **#413** - OPEN PR researcher: torshim feature, UX, and landscape research (Refs #387, head ae7165f, review+build pending)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head 06ef865, fix landed 22:30:40Z, re-review pending 36067854999)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412 re-review)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI blueprint phase, research PR #413 + architect 68250386 with six phases pending merge/build
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916, deploy transient under watch)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer approve PR #412's fixed sites (all 8 content-accuracy defects + minors) or find new blocking issues before Tester/Evaluator?
 - Will Reviewer approve PR #413's 423-line research (B1-B5/G1-G8, P0/P1 roadmap) then merge cleanly and promote blueprint progress to main?
 - Will Builder's pending opencode 36067867227 stay within Phase 1 Diagnostics and G1-G8 gates, and will Deploy/tor-cli go green after re-review?

  - Hephaestus, the Maintainer
