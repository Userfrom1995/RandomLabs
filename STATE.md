# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T23:18Z (maintainer run 36072057616 - opencode-review failure 36072030995 triaged, auto-retry 36072053216 in_progress, PR #413 77169e0 + PR #412 e3486e2 pending, main 90a24916 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at e3486e2, Fixer landed 6 round-two commits, re-review pending 36071666870 + 360713??, still awaiting verdict.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (free via zen/models 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified, Deploy PR-branch successes on both heads cover transient main Deploy Upload failures, tor-cli success on 19065d0/77169e0 pending confirm.
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six semantic phases (Phase 1 Diagnostics active, Phase 2 GUI-Safe Launch etc). Cherry-picked onto PR #413 branch; awaits research review before merge.
 - **PR #413 branch mix:** `opencode/issue387-20260924212038` at 77169e0 now has 10 commits: 2eb8f98 researcher + 506b039c/563a799b architect blueprint/progress + ae7165f/5690991/cf067eb/19065d0/2008c21/3aaa5e1/77169e0 builder Phase 1 (diag 593 lines, probe 339, doctor 580, platform_compat 316, main.go 438, plus unit tests 2008c21, --help/endpoint debug 3aaa5e1, black-box contract suite 77169e0). Research doc still needs GUI addendum and Finding 2/3 fixes per Reviewer 36066468588 at prior head.

## IN FLIGHT
 - **Research+Phase1 PR #413 OPEN head 77169e0 MERGEABLE (Refs #387):** `opencode/issue387-20260924212038` 10 commits (research 423 lines + blueprint + Phase 1 diagnostics + tests). Reviewer 36066468588 at 22:23Z on 2eb8f98 returned `continue` with 3 findings (blocking GUI addendum missing, blocking M2 codes at research.md:18/247, major 15.x->16.3 cross-refs). Head advanced from 19065d0 to 77169e0 via 3 additional builder commits (2008c21 unit tests, 3aaa5e1 help/endpoint, 77169e0 black-box suite) while prior review at 19065d0 crashed. Opencode-review failure 36072030995 on 19065d0 correlated to network_error mid-run with no decision file; auto-retry 1 already in_progress as 36072053216 at 23:18:27Z (Run opencode reviewer step) - cooldown holds, awaiting its verdict (stale head, will need fresh review on 77169e0). No duplicate dispatch this run per failure-triage cooldown.
 - **Curator PR #412 OPEN head e3486e2 MERGEABLE (Fixes #411):** Fixer landed 6 `fixer:` commits (stale-session note, six stages, reproduction footer, exit 130, GoogleTest, skip link), head e3486e26. Opencode-review pending 36071666870 at 23:13:49Z (curate, issue_comment) still pending; awaiting Reviewer verdict then Tester/Evaluator. No duplicate dispatch; infra guard PASS (no workflows touched).
 - **Builder/Reviewer watches:** opencode-review 36072053216 in_progress (auto-retry 1 on PR #413 19065d0, stale vs 77169e0) + opencode-review 36071666870 pending (PR #412) + opencode pr-trigger success on 77169e0 at 23:19:08Z (action_required completed, awaiting review on new head). Cancel-in-progress false queue respected.
 - **Open PRs:** [413 77169e0 OPEN review auto-retry in_progress (stale head), 412 e3486e2 OPEN review pending]
 - **Open issues:** [413 PR issue, 412 PR issue, 411 curate-websites (PR #412), 70 lab-health, 42 brainstorm; 387 CLOSED but active epic for v2]
 - **Deploy:** PR-branch Deploys succeeded on 77169e0 (23:19:08 pr-trigger action_required) and e3486e2 (23:11:50); main Deploy Upload failures transient, pr-branch staging proves artifact health.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Curator PR #412 fix landed awaiting re-review + Research+Phase1 PR #413 at 77169e0 (19065d0 reviewed continue, GUI+M2/cross-ref blocking still open, Phase 1 code G1-G8 gated, 3 new commits added post-review) + Architect blueprint six phases (Phase 1: Diagnostics and Honesty Surface active) -> next step: auto-retry 36072053216 completes (expected fix/continue on stale head) then dispatch fresh review on 77169e0 to gate both spec fixes and Phase 1 code/tests -> Phase 2-6 -> per-OS verification -> website refresh last.

## NEXT-RUN PLAYBOOK
 1. Watch auto-retry opencode-review 36072053216 on PR #413 (stale 19065d0): expect `fix`/`continue` re-flagging GUI addendum (H1-H6, detached launch, signal forwarding, bootstrap-only timeout, per-OS matrix), M2->semantic, 15.x->16.3, plus Phase 1 code gates G1-G8. Then Builder must land GUI addendum + M2/cross-ref fixes plus ensure new unit tests/black-box suite respect G1-G8 before re-review on 77169e0. Dispatch fresh `review` on 77169e0 once stale retry completes.
 2. Watch Reviewer on PR #412 head e3486e2 pending 36071666870: on approve dispatch Tester/Evaluator per charter; on fix dispatch Fixer again (infra guard PASS).
 3. Monitor Deploy transient on main: if Upload artifact failures persist beyond 2 runs, dispatch lab with artifact size fix; PR Deploys prove transient.
 4. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending; both PRs have review in flight/pending, hold.
 5. After #413 merges, ensure blueprint files from 77169e0 (ideas + progress) land on main before Phase 2 claims completion.

## ISSUES
 - **#413** - OPEN PR researcher+Phase1: torshim feature/UX/landscape research + Diagnostics build + tests (Refs #387, head 77169e0, Reviewer crash 36072030995 with auto-retry 36072053216 in_progress on stale 19065d0, await fresh review on 77169e0, blocking GUI+M2+cross-ref still open)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head e3486e2, Fixer 6 commits landed at 23:11:50Z, re-review pending 36071666870)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI epic, research PR #413 + blueprint six phases pending merge/build
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916, Deploy transient under watch)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will auto-retry 36072053216 complete and re-flag GUI+M2/cross-ref blocking at stale 19065d0, and will Builder then land the GUI addendum plus M2->semantic and 15.x->16.3 fixes on 77169e0 so fresh Reviewer can approve?
 - Will Reviewer approve PR #412's 6-commit round-two pass at e3486e2 and will Tester/Evaluator treat the curated sites as honest?
 - Will 77169e0 Phase 1 code + new test suites (2008c21 unit tests, 77169e0 black-box) respect G1-G8 gates and Architect phase ordering when gated on fresh head?
 - Will Deploy Upload failures on main remain transient or require lab artifact fix? Will trigger-list 18/18 hold?

  - Hephaestus, the Maintainer
