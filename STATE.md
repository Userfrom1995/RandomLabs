# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T21:34Z (maintainer run 36062340766 - GUI hang research pending + curator PR #412 review dispatched, main 90a24916 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **GUI HANG DIRECTIVE (2026-09-24T21:34:25Z, via #387 comment `One more important issue: when I try to launch a GUI application through torshim...` + `/oc research`):** Owner reports `torshim falkon`/`firefox` crash/hang no timeout, requires GUI support for browsers/desktop apps cross-platform. Must investigate why hang, design robust cross-platform solution, test with real GUI apps/browsers on Windows/macOS/Linux (dedicated per-OS testers), verify DNS/routing through Tor, preserve env/signal/stdin behavior. Treat as core UX, keep Linux parity vs macOS/Windows not secondary. Research already pending via `opencode` 36062340745 on #387 (merged with verbose v2 scope), next Architect->Build->per-OS test->website/docs update.
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics (what torshim is doing, connected status, endpoint/mode, connection diagnostics), and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS) -> review -> then update website to reflect final CLI. Dispatched Researcher on #387 at 21:20Z; now merged with GUI scope in pending 36062340745.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema no-index.html reading - every project, including CLI tools, must have a browsable site at `/<project>/index.html` explaining the tool and including its documentation. Tor CLI gap verified: `tor-cli/index.html` absent on 90a24916 (only README.md + docs/). Dispatched Curator on #387 to build site (tracking issue #411). Prior 20:46Z answer corrected. Codify rule in CONTRIBUTING.md per #411. Curator PR #412 opened at 21:35Z head 1b4d091 (Fixes #411) -> Review dispatched this run.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model to `opencode/mimo-v2.6-flash-free`) plus `lab.yml` push-fix at `90a24916` (`git add opencode.json`). Verified live via `gh api contents/opencode.json` and `grep model: .github/workflows/*.yml` 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md`, semantic phase naming, update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 - invariant live on main.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 (live hello-through-tor, 9.82 eval). Issues #387/#399 CLOSED at ac6f36d7. Website gap now PR #412 review, v2+GUI RESEARCH pending on #387.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1.
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED at 67e5deff - README.md:61-67 and index.html:123-158 now accurately reflect live main plus meta/Prism sync at 08fe6998 then 90a24916 (Folio/Tabula/Sextant shipped, zero In progress strings, meta with 7 projects, 1 Prism). Archive repair 5c928366 Refs #70 + docs-sync 5d080e29 Refs #70 + meta dedup 884c48a9 Refs #70 + landing regression 08fe6998 Refs #70 + model switch 59a8847a/90a24916 Refs #70.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 90a24916 LIVE - model switch MERGED:** `origin/main` = `90a24916709bd44ecfef9a2f3fe9ff156ab7bbb3` verified via `git ls-remote origin/main` == 90a24916 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 90a24916 (parents 59a8847a->08fe6998, 2 commits: `lab: switch two-knob model pins to mimo-v2.6-flash-free` 17 files + `lab: stage opencode.json in lab.yml` 1 file). `opencode.json` two-knob `mimo-v2.6-flash-free`/`mimo-v2.6-flash-free` both free, all 16 workflow `model:` pins `mimo-v2.6-flash-free` verified via `gh api contents/opencode.json` and `grep model: .github/workflows/*.yml` 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **Models:** `curl -s https://opencode.ai/zen/v1/models` shows `mimo-v2.6-flash-free` free, no CreditsError.
 - **Deploy:** `Deploy static site to GitHub Pages` success `36047394957` on `90a2491` verified; prior `36040705594` success on `08fe6998`.
 - **Trigger-list 18/18 PASS:** `maintainer.yml` workflows: [auditor, "Deploy static site to GitHub Pages", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, opencode-peros-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli] - live workflows 20 (18 relevant + maintainer + Dependency Graph + pages-build-deployment), tor-cli active.

## IN FLIGHT
 - **GUI hang Research PENDING on #387 at 21:34Z:** Owner GUI directive plus `/oc research` created `opencode` 36062340745 pending (head 90a24916). Merged scope with CLI v2 verbose directive (21:17Z). Researcher surveys torsocks LD_PRELOAD GUI unsafety, browser multi-process forks, process-group/timeout/signal/stdin handling, proxy-env for macOS/Windows browsers, DNS verification; will write `tor-cli/docs/research.md` v2 GUI addendum + per-OS matrix -> Architect blueprint GUI support phase -> Builder detached launch fix -> per-OS Tester trio real browsers -> Tester/Evaluator -> then Curator website refresh. No duplicate dispatch (cooldown 30m respected).
 - **CLI v2 Research PENDING on #387 at 21:20Z:** Same pending run above (merged). Covers verbose diagnostics, feature gaps from Tor/proxy CLIs, per-OS honest limits, lightweight constraint.
 - **Curator website PR #412 OPEN head 1b4d091 (Fixes #411):** Curator built `tor-cli/index.html` + `prism/index.html` + landing/README Website links + CONTRIBUTING rule. Decision review dispatched this run; awaiting Reviewer approve -> Tester pages preview -> Evaluator -> merge. Initial site lands before CLI v2; second polish pass after CLI v2+GUI ensures consistency per owner ordering.
 - **Model switch #70 RESOLVED at 90a24916 (19:19Z):** Issue #70 `[Lab Health & Audit Logs]` OPEN, no PR open.
 - **Open PRs:** [412 curate-tor-cli-site 1b4d091 OPEN review dispatched]
 - **Open issues:** [411 curate-websites (PR #412 review), 70 lab-health, 42 brainstorm; 387 CLOSED at ac6f36d7 but active for research post-close]
 - **Tor CLI #387:** CLOSED at ac6f36d7 - deliverable v1 complete; v2+GUI RESEARCH pending at 21:34Z.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI + repairs MERGED -> Documentation Invariant MERGED -> Audit sweep gap fix MERGED -> PAT dispatch MERGED -> Linux per-OS fix MERGED ac6f36d7 -> Archive -> Curator PR #406 MERGED 67e5deff Closes #405 -> Lab repairs 5c928366/5d080e29/884c48a9 -> Landing regression 08fe6998 -> Model-switch 59a8847a + push-fix 90a24916 Refs #70 at 19:19Z (Deploy green) -> Curator websites dispatched on #387 -> #411 OPEN -> Curator PR #412 1b4d091 OPEN at 21:35Z -> GUI+verbose Research pending 36062340745 at 21:34Z -> next Review #412 -> Architect GUI -> Build -> per-OS Test -> Eval -> Curator refresh.

## NEXT-RUN PLAYBOOK
 1. Verify `opencode` research 36062340745 lands findings on #387 for GUI hang + verbose v2, then dispatch Architect on #387 to blueprint GUI support phase (detached launch, process-group, timeout semantics, signal forwarding, env/signal preservation, per-OS gaps honest) with semantic phase names.
 2. Watch Curator PR #412: Reviewer approve, Tester pages preview 200, Deploy green, trigger-list 18/18. Merge when Tester approve-test + Evaluator; then second Curator pass after GUI fix will sync site accurately.
 3. Per-OS Tester trio must verify every command/flag/mode/error path plus real GUI browsers (Firefox/Falkon/Chromium) natively before Evaluator (>=9.8). Per Anti-Surrender, never close performance-gated issue on negative result.
 4. Quiet watch on #70; no duplicate curate/research while in-progress (cooldown 30m).
 5. If Researcher or Curator stalls >3 days, ping then `/oc continue`/`/oc curate` recovery.

## ISSUES
 - **#412** - OPEN PR curate: tor-cli and Prism websites (Fixes #411, head 1b4d091, review dispatched this run)
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (PR #412 review)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - GUI hang + verbose v2 RESEARCH pending at 21:34Z (opencode 36062340745), website PR #412 open
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Dr. Mob identify GUI root causes correctly (torsocks LD_PRELOAD unsafe for GUI toolkits/browsers, blocking Wait without timeout, signal/stdio handling) and propose per-OS fixes preserving lightweight/fast while making Windows/macOS as strong as Linux?
 - Will Curator PR #412 pass Reviewer/Tester craft gates and merge cleanly before second refresh for GUI+verbose?
 - Can GUI fix keep per-OS honesty matrix (Linux iptables/nft vs macOS/Windows proxy-env with documented browser gaps) and keep tri-OS CI 6/6 + per-OS 3/3 green after detached launch changes?

  - Hephaestus, the Maintainer
