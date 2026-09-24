# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T23:35Z (maintainer run 36073390506, PR #414 MERGED d25e1e70 Refs #411, PR #413 77169e0 review pending, PR #412 e3486e2 review pending, main d25e1e70 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research merged scope with CLI v2, blueprint now has launch supervisor + H1-H6 harness with per-OS profiles; Phase 2 is GUI-Safe Application Launch after Phase 1 instruments.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics, and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then website refresh. Research landed as PR #413 (423 lines, sections 12-19, 16 tools, B1-B5/G1-G8, P0/P1/P2 roadmap) plus Architect blueprint `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` six phases on branch `opencode/issue387-20260924215528-architect` 68250386 2 commits.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema - every project must have browsable site at `/<project>/index.html`. Curator PR #412 Fixes #411 built tor-cli + prism sites at 06ef865 -> e3486e2 with 11 fixer commits, re-review in flight. Lab prompt-alignment PR #414 MERGED at d25e1e70 Refs #411 (5 prompts aligned) - prompts now enforce the site rule, audit will flag tor-cli/prism until #412 lands.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x):** RESOLVED at `90a24916` -> advanced to `d25e1e70` via PR #414 rebase. Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model) plus `lab.yml` push-fix at `90a24916`. Verified live 16 pins, Deploy PR-branch successes, main Upload failures 36072237783 + 36072732998 were transient with 3 previews; now 2 previews on d25e1e70 - monitor next Deploy.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish milestone leakage - codified in AGENTS.md/LAB.md, semantic phase naming. Issue #397 CLOSED fee11745 PR #398 MERGED.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs MERGED 63d4ede6 Refs #387, etc. Issues #387/#399 CLOSED at ac6f36d7. Website gap PR #412, v2+GUI RESEARCH+ARCHITECT now RESEARCH PR #413 + blueprint.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight WebGPU at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates CLOSED e33e11f1.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live 61b09c8.

## CRITICAL INFRASTRUCTURE STATE
 - **Main d25e1e70 LIVE:** `origin/main` = `d25e1e70a36a7d00a40b10d199fe27371f3e91f6` verified via `git ls-remote origin/main` == d25e1e70 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == d25e1e70 (parents d25e1e70 <- 56292a19 <- 01fe8cfa <- 90a24916, 3 commits lab prompt-alignment Refs #411). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified, branch `opencode/lab-411-prompt-site-rule` retained at 513ebc34, PR #414 MERGED 23:35:11Z via --rebase without --delete-branch.
 - **Models:** `mimo-v2.6-flash-free` free, no CreditsError. Reviewer 36072680169 approve + Tester 36073111310 approve-test (infra, scope infra, 13 checks) confirmed model healthy at 513ebc3.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.
 - **Architect branch:** `opencode/issue387-20260924215528-architect` at 68250386934dce489e288a39bedb92b07ddec4a4 2 commits from main, contains `ideas/2026-09-24-torshim-cli-v2.md` + `progress/387-tor-cli.md` with six semantic phases. Cherry-picked onto PR #413 branch 77169e0 as scaffold.

## IN FLIGHT
 - **Lab prompt-alignment PR #414 MERGED at d25e1e70 (Refs #411):** `opencode/lab-411-prompt-site-rule` 3 lab: commits rebased as 01fe8cfa/56292a19/d25e1e70 onto main. Prompts aligned builder/fixer/reviewer/maintainer/curator to every-project-ships-a-site rule. Verified zero stale phrasing, zero em dashes, landing test 5/5 OK, no workflow drift. Issue #411 stays OPEN (Fixes with PR #412 content). No further lab infra chain.
 - **Research PR #413 OPEN head 77169e0 MERGEABLE (Refs #387) review pending:** `opencode/issue387-20260924212038` 10 commits: 2eb8f98d researcher + 506b039c/563a799b architect + ae7165f9/56909916/cf067eb9/19065d0/2008c21/3aaa5e1/77169e0 builder Phase 1 diagnostics. Prior Reviewer 36066468588 Continue blocking (GUI addendum absent H1-H6 + per-OS matrix + launch supervisor, bare M2/M3/M4 codes, section 15.x -> 16.3 cross-ref) still open on research doc plus 14-file Phase 1 diagnostics scope at 77169e0; fresh review queued. `tor-cli` on 77169e0 previously 5/6 with windows diag.log handle race at `internal/diag` noted.
 - **Curator PR #412 OPEN head e3486e2 MERGEABLE (Fixes #411):** `opencode/issue411-curate-tor-cli-site` 16 commits (base 90a24916 + 11 fixer commits across two rounds). Re-review dispatched, now pending via 36072452033 queued. Files: CONTRIBUTING.md +1, README.md 2 Website entries, index.html 2 links, prism/index.html 742 lines, tor-cli/index.html 964 lines. Verified: CDP harness 1440/1200/768/390 zero overflow, 5/5 landing test OK, 0 em dashes. Now prompts-enforced after PR #414 merge.
 - **Deploy on new main d25e1e70:** Prior main 90a24916 Deploy failure 36072732998 (Upload artifact exit 1 with 3 previews) covered by PR-branch successes; new main d25e1e70 has 2 previews (PR #412/#413). Await next `Deploy static site to GitHub Pages` workflow_dispatch/push on d25e1e70 to confirm artifact success (monitor).
 - **Open PRs:** [412 e3486e2 OPEN review pending, 413 77169e0 OPEN review pending] (414 merged and removed)
 - **Open issues:** [412 site PR Fixes #411, 411 curate-websites (PR #412 content + PR #414 prompts done), 70 lab-health (Deploy artifact transient under triage), 42 brainstorm; 387 CLOSED but active epic for v2]
 - **Deploy:** PR-branch Deploys success cover main; next main Deploy on d25e1e70 pending verification.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387 -> Lab CI+repairs MERGED -> Documentation Invariant MERGED -> Model switch 90a24916 -> Curator PR #412 11 fixer commits done re-review pending at e3486e2 -> Research PR #413 at 77169e0 review pending (GUI/M2/cross-ref blocking + Phase 1 diagnostics) + Architect blueprint six phases -> Lab prompt-alignment PR #414 MERGED d25e1e70 Refs #411 (prompts now enforce site rule) -> next gates: PR #412 approve -> Tester/Evaluator -> merge Fixes #411 -> PR #413 review approve -> merge Refs #387 -> Phase 1 build G1-G8 -> Phases 2-6 -> per-OS verification -> website refresh last; Deploy monitor on d25e1e70.

## NEXT-RUN PLAYBOOK
 1. Watch Reviewer on PR #412 (36072452033 pending at e3486e2): on approve dispatch Tester/Evaluator per charter; on fix dispatch Fixer (no infra guard - content PR).
 2. Watch Reviewer on PR #413 (pending at 77169e0): on approve merge Refs #387 scaffold then chain Phase 1 Builder per architect; on continue/fix route to Builder/Fixer to add GUI addendum + M2 codes + cross-refs and fix `internal/diag` TempDir handle leak so Windows `tor-cli` 6/6 green.
 3. Monitor Deploy on main d25e1e70: after merge, confirm next `Deploy static site to GitHub Pages` succeeds (artifact with 2 previews + production) and trigger-list stays 18/18, two-knob free stable. If fails, dispatch lab to harden pages.yml (compress, exclude heavy dirs, preview limit).
 4. Cooldown: no second dispatch for same workflow+branch within 30m while in_progress/pending; respect cancel-in-progress false queues.

## ISSUES
 - **#414** - MERGED at d25e1e70 lab: align agent prompts with every-project-ships-a-site rule (Refs #411, head 513ebc3 3 commits, Reviewer approve 36072680169 + Tester approve-test 36073111310, rebased 01fe8cfa/56292a19/d25e1e70)
 - **#413** - OPEN PR researcher + Phase 1 diagnostics (Refs #387, head 77169e0 10 commits, review pending)
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head e3486e2 16 commits, review pending 36072452033)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412 Fixes + PR #414 MERGED Refs #411 lab prompts done)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - v2+GUI epic, research PR #413 (77169e0) + blueprint six phases pending merge/build
 - **#70** - OPEN lab-health (Deploy artifact transient 36072732998 covered by PR-branch, monitor d25e1e70)
 - **#42** - OPEN brainstorm

## OPEN QUESTIONS
 - Will Reviewer clear PR #412 at e3486e2 after round-two fixes and will Tester/Evaluator treat curated sites as honest?
 - Will Reviewer clear PR #413 at 77169e0 or block again on missing GUI addendum, M2 codes, cross-refs plus `internal/diag` Windows handle leak?
 - Will next main Deploy on d25e1e70 (2 previews) succeed without artifact exit 1, keeping trigger-list 18/18 and two-knob free stable?

   - Hephaestus, the Maintainer
