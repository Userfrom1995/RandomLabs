# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T21:18Z (maintainer run 36060567198 - CLI improvement research on CLOSED #387 + curator #411 in-flight, main 90a24916 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **CLI IMPROVEMENT DIRECTIVE v2 (2026-09-24T21:00-21:05Z, via #387 comment `I also want you and crew to research what else we can do to make tor-cli significantly better...`):** Owner asks crew to research Tor/proxy/network CLI tools for useful features, verbose diagnostics (what torshim is doing, connected status, endpoint/mode, connection diagnostics), and UX improvements — keep lightweight/fast/reliable. Ordered workflow: research -> architect -> build -> test (per-OS Windows/macOS/Linux every-command/flag/workflow real-user) -> benchmark/review -> then update website to reflect final CLI. Iterate, not one-shot. Dispatched Researcher on #387 this run.
 - **WEBSITE DIRECTIVE (2026-09-24T20:58:50Z, via #387 comment `Every project should have its own website...`):** Owner overrides prior Docs Schema no-index.html reading - every project, including CLI tools, must have a browsable site at `/<project>/index.html` explaining the tool and including its documentation. Tor CLI gap verified: `tor-cli/index.html` absent on 90a24916 (only README.md + docs/). Dispatched Curator on #387 to build site (tracking issue #411). Prior 20:46Z answer corrected. Codify rule in CONTRIBUTING.md per #411.
 - **MODEL SWITCH DIRECTIVE (2026-09-24T07:14:03Z, via #70 `/oc lab mimo-v2.6-flash-free two-knob switch` + reaffirmed 18x to 19:19:43Z):** RESOLVED at `90a24916` - owner requested switch to `mimo-v2.6-flash-free` (verified free via `https://opencode.ai/zen/v1/models` 80/10). Lab landed Mode 2 two-knob switch at `59a8847a` (16 workflow pins + opencode.json model+small_model to `opencode/mimo-v2.6-flash-free`) plus `lab.yml` push-fix at `90a24916` (`git add opencode.json`). Verified live via `gh api contents/opencode.json` and `grep model: .github/workflows/*.yml` 16 pins, Deploy success on 90a2491, 18/18 PASS.
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md`, semantic phase naming, update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 - invariant live on main.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight Tor CLI `tor-tool` - all milestones MERGED Refs #387, Lab CI + repairs + hardening MERGED 63d4ede6 Refs #387, Audit sweep fix MERGED 2d13778, PAT dispatch MERGED e996d93, Linux per-OS torrc fix MERGED ac6f36d7 via PR #404 (live hello-through-tor, 9.82 eval). Issues #387/#399 CLOSED at ac6f36d7. Website gap now dispatched via Curator on #387 at 20:58Z (CLI site required per Owner override). v2 improvement now RESEARCH on #387.
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
 - **CLI v2 Research DISPATCHED on #387 at 21:18Z (this run):** Owner verbose + feature-gap directive. Decision `[{"action":"research","issue":387}]` -> Dr. Mob surveys Tor/proxy/network CLIs, defines verbose/diagnostics, prioritized capabilities (lightweight/fast), writes `tor-cli/docs/research.md` v2 + per-OS matrix -> Architect `progress/387-tor-cli.md` v2 -> Builder -> per-OS Tester trio -> Tester/Evaluator -> then Curator website refresh. Respects ordered workflow (CLI first, website second).
 - **Curator website build DISPATCHED at 20:58Z on #387 (tracking #411):** Owner every-project website directive. Curator `36058672276` `in_progress` since 21:00:47Z + `36060566908` `pending` queued, building `tor-cli/index.html` + `prism/index.html` + landing/README Website links + codify rule in CONTRIBUTING.md per issue #411 (`[Curator] Build tor-cli and Prism project websites...` OPEN). No PR yet; await Curator. Initial site lands before CLI v2; second polish pass after CLI v2 per owner order ensures consistency.
 - **Model switch #70 RESOLVED at 90a24916 (19:19Z):** Issue #70 `[Lab Health & Audit Logs]` OPEN, no PR open.
 - **Open PRs:** [] (0 open, `gh pr list --state open` == [], last PR #410 MERGED at 08fe6998)
 - **Open issues:** [411 curate-websites (new, OPEN), 70 lab-health, 42 brainstorm; 387 CLOSED at ac6f36d7 but active for research/curate post-close] - live `gh issue list --state open` = [411,70,42]; 387 CLOSED but dispatched per owner comment (allowed).
 - **Tor CLI #387:** CLOSED at ac6f36d7 - deliverable v1 complete; v2 improvement RESEARCH dispatched at 21:18Z.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M1..M5 MERGED Refs #387, Lab CI + repairs MERGED -> Documentation Invariant MERGED -> Audit sweep gap fix MERGED -> PAT dispatch MERGED -> Linux per-OS fix MERGED ac6f36d7 -> Archive -> Curator PR #406 MERGED 67e5deff Closes #405 -> Lab repairs 5c928366/5d080e29/884c48a9 -> Landing regression 08fe6998 -> Model-switch 59a8847a + push-fix 90a24916 Refs #70 at 19:19Z (Deploy green) -> Curator websites dispatched on #387 -> #411 OPEN (21:00Z) -> Curator in_progress 36058672276 -> CLI v2 Research dispatched on #387 at 21:18Z (this run) -> next Architect -> Build -> per-OS Test -> Eval -> Curator refresh.

## NEXT-RUN PLAYBOOK
 1. Verify Researcher posts findings on #387, Architect blueprints v2 phases with semantic names, Builder iterates CLI improvements (verbose, diagnostics, prioritized features) without overengineering.
 2. Curator PR for #411 will arrive in parallel (tor-cli + prism sites) -> Reviewer approve, Tester pages preview, Deploy green, trigger-list 18/18. Initial site is acceptable; second Curator pass after CLI v2 will sync site with new commands/features.
 3. Per-OS Tester trio must verify every command/flag/mode/error path natively before Evaluator (>=9.8). Per Anti-Surrender, never close performance-gated issue on negative result.
 4. Quiet watch on #70; no duplicate curate/research while in-progress (cooldown 30m).
 5. If Researcher or Curator stalls >3 days, ping then `/oc continue`/`/oc curate` recovery.

## ISSUES
 - **#411** - OPEN [Curator] Build tor-cli and Prism project websites and codify every-project-needs-a-site rule (Curator in_progress 36058672276)
 - **#387** - CLOSED at ac6f36d7 Tor CLI - website follow-up #411 + v2 RESEARCH dispatched at 21:18Z (verbose + feature gaps)
 - **#70** - OPEN lab-health (model switch RESOLVED at 90a24916)
 - **#42** - OPEN brainstorm
 - **#405** - CLOSED at 67e5deff [Curator] Graduate tor-cli to Previous Projects
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Dr. Mob identify genuinely valuable verbose/diagnostic features (bootstrap progress, circuit status, endpoint reporting, fail-closed clarity) without bloating lightweight CLI, and prioritize them by real user value vs torsocks/proxychains/Arti patterns?
 - Will Curator produce a lightweight static site that meets the lab's web craftsmanship bar (explains torshim commands/flags/per-OS limitations without duplicating Tor internals) and keep `tor-cli/docs/` as the single source of truth, then refresh correctly after CLI v2?
 - Can CLI v2 stay cross-platform (Linux primary, macOS/Windows proxy-env honest) while improving verbose UX, and keep tri-OS CI 6/6 + per-OS tester 3/3 green?

  - Hephaestus, the Maintainer
