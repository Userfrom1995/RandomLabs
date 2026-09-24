# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T22:12Z (maintainer run 36066114801 - research PR #413 review dispatched, fix+build in-flight, main 90a24916 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at 1b4d091, review posted fix findings 22:07:30Z (3 blocking +5 major), fix in_progress 36065638495 since 22:07:35Z.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (free via zen/models 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998, 2 commits lab model switch). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified, Deploy 36066111112 failure check but prior 36047394957 success on 90a24916; two recent Deploy failures 22:12:30Z/21:37:48Z Upload artifact failure triaged as transient staging (monitor).
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, contains `ideas/2026-09-24-torshim-cli-v2.md` 43fb131b 28033 bytes + `progress/387-tor-cli.md` ecefc31c 8118 bytes with six semantic phases (P0/P1 split, CLI first, website last). Not yet merged to main; Phase 1 build waits on research PR #413 merging per blueprint.

## IN FLIGHT
 - **Research PR #413 OPEN head 2eb8f98 MERGEABLE (Refs #387):** `opencode/issue387-20260924212038` 1 commit 423 added lines `tor-cli/docs/research.md` sections 12-19, no production code, no infra diff. Owner `/oc architect` 21:46:34Z -> Architect delivered blueprint 22:12:17Z -> Owner `/oc build this` 22:12:19Z triggered build 36066098589 in_progress (job build) with queued duplicate 36066115216 pending (cancel-in-progress false queue). Review not yet dispatched until this run; dispatched now at 2eb8f98.
 - **Curator PR #412 OPEN head 1b4d091 (Fixes #411):** MERGEABLE, review posted `/oc fix review findings` 22:07:30Z (3 blocking: false protection claim 664-665, absolute fail-closed 521-522, prism percentages 477-486 + 5 major). Owner `/oc fix` 22:07:32Z triggered opencode fix 36065638495 in_progress since 22:07:35Z (job fix in_progress), plus pending review 36065638476. No duplicate dispatch.
 - **Builder in-flight:** opencode build 36066098589 in_progress on main 90a2491 (issue_comment researcher PR), queued 36066115216 pending same event. Cooldown holds.
 - **Open PRs:** [413 researcher 2eb8f98 OPEN review dispatched this run, 412 curate 1b4d091 OPEN fix in_progress]
 - **Open issues:** [411 curate-websites (PR #412 fix in_progress), 70 lab-health, 42 brainstorm; 387 CLOSED but active for v2 research/blueprint/build]
 - **Deploy:** Deploy 36066111112 failure 22:12:30Z Upload artifact transient, prior success 21:45:58Z on 2eb8f98 push; monitor next.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Curator PR #412 at 1b4d091 fix in_progress (Reviewer findings) + Research PR #413 at 2eb8f98 review dispatched + Architect blueprint 68250386 with six phases (Phase 1: Diagnostics and Honesty Surface active next) -> next merge #413 -> Phase 1 build with G1-G8 gates -> Phases 2-6 -> per-OS verification -> website refresh.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #413 2eb8f98: approve or fix; on approve merge Refs #387 (research is docs-only, no Tester required) and ensure blueprint files from 68250386 land on main (merge or cherry-pick ideas+progress) before Phase 1 build claims completion.
 2. Watch Fixer on PR #412 36065638495: on push, verify fix addresses all 8 Reviewer items (raw syscalls honesty, fail-closed wording, prism gate vs cell percentages, disconnect exit 4, verb count, Kodak path, repro pointer, repro column) plus minors; then re-dispatch review at new head, then Tester/Evaluator.
 3. Watch Builder 36066098589/36066115216: do not duplicate; if build lands a PR, review its diff against blueprint Phase 1 scope (verbosity, doctor, status --verify, --help exit fix) and G1-G8 gates.
 4. Monitor Deploy failures: if Upload artifact failures persist, dispatch lab with artifact size/page limit fix.
 5. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending.

## ISSUES
 - **#413** - OPEN PR researcher: torshim feature, UX, and landscape research (Refs #387, head 2eb8f98, review dispatched this run)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head 1b4d091, fix in_progress 36065638495)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412 fix)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI blueprint phase, research PR #413 + architect 68250386 with six phases pending merge/build
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916, deploy transient under watch)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer approve PR #413's 423-line research (baseline inventory, 16-tool landscape, B1-B5/G1-G8, P0/P1 roadmap) or request honesty/budget fixes before merge?
 - Will Fixer correct all 8 Reviewer content-accuracy defects on PR #412 without regressing HTML hygiene and keep pages deploy green?
 - Will Builder's in-flight 36066098589 respect the Architect's Phase 1 ordering (instrument before GUI fix) and stay within G1-G8 (stdlib-only, 15% binary growth, 50ms overhead, honesty)?
 - Will the Architect's six-phase progress file (ecefc31c) merge cleanly onto main after #413 without milestone leakage?

  - Hephaestus, the Maintainer
