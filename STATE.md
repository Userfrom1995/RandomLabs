# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T00:14Z (maintainer run 35937388229 - PR #393 merged to 7950cf1, tor-cli green, eval dispatched)**
 - **Action this run:** dispatch Evaluator on PR #393 (post-merge) to obtain binding Quality Council verdict before Closes #387; tor-cli tri-OS CI now green on both branch d6234 and main 7950cf1
 - **Main:** `7950cf1d` LIVE (verified `gh api repos/.../git/refs/heads/main --jq .object.sha` == 7950cf1db3a6200464dd550c416dd2eedbe2d64c, commit `lab: split macOS/Windows hermetic skips, document Windows exe-helper gap (Refs #387)` 1 file .github/workflows/tor-cli.yml, parent 8926b49b, `gh api actions/workflows --jq` 20 workflows includes tor-cli, `gh api contents/.github/workflows/maintainer.yml?ref=main --jq workflows:` 17/17 PASS with tor-cli, `gh pr list --state open` == [], `gh issue list --state open` == [387, 70, 42])
 - **Branch retention:** `opencode/lab-387-tor-cli-ci` at d6234dec51cf87481070b99cf2f3949365864214 merged via PR #393 (state MERGED), prior 58a0d06+8926b49b+43f67617 chain; no open PR, `git merge-base origin/main origin/opencode/lab-387-tor-cli-ci` ancestor present (non-orphan, merged)
---

## STANDING OWNER DIRECTIVES (active)
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS, inspect Tor/torsocks first and reuse established mechanisms. Tracking issue #387 OPEN, M2..M5 all MERGED Refs #387, Lab CI install MERGED to 00105209 (Refs #387), repair PR #393 MERGED to 7950cf1 (Refs #387) with tri-OS green via documented skips; awaiting Evaluator 9.8+ before Closes #387. Brainstorm #42 stays OPEN.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** Monitoring tor-cli CI.
---

## CRITICAL INFRASTRUCTURE STATE
 - **Main 7950cf1 LIVE - tor-cli CI green tri-OS:** `origin/main` = `7950cf1db3a6200464dd550c416dd2eedbe2d64c` verified (Lab Engineer commit 7950cf1 on top of 8926b49b rebase, 1 file .github/workflows/tor-cli.yml +17/-1 hermetic skip split macOS vs Windows plus exe-helper gap doc; workflows 17/17 PASS with tor-cli, live tor-cli.yml hermetic suite: Linux full `./...`, macOS `-skip TestConnect|TestDisconnect|TestRepair|TestNftConnectDisconnect` + `TestConnectDisconnect|TestM3Connect|...|TestM5CLIBlackBoxHonesty`, Windows same plus `TestVersionHonest|TestHelpAndUsageCodes|TestStatusHonest|TestRunFailClosedWithoutTor|TestM3Status|TestM3NoEmDash|TestM4VersionReports|TestM4HelpNames` covering 9x exit-99 helper; honesty probes `BIN`/`torshim.exe` conditional + exit-4 off-Linux). `tor-cli` workflow Run 35937103432 on push main 7950cf1 **success** (build-vet-test ubuntu/macos/windows all success, cross success, fuzz success, live-tor success), plus 35937067430 success on pull_request d6234. `git ls-remote origin/main` == 7950cf1, `gh api contents/.github/agents/decisions/builder?ref=main` hyphen form retained.
 - **Repair PR #393 MERGED d6234 Refs #387:** Branch `opencode/lab-387-tor-cli-ci` d6234dec51cf87481070b99cf2f3949365864214 PR #393 `lab: repair tor-cli tri-OS CI on macOS/Windows plus Windows-blocking filename (Refs #387)` state MERGED (mergeable UNKNOWN post-merge), 2 files originally plus final split: colon rename to hyphen already landed via 8926b49b. `gh pr list --state open` == [] (no open PR). Lab runs on #393 completed via PAT merge.
 - **Model ecosystem two-knob both free PASS on 7950cf1:** `muse-spark-1.3-contributor-free` + `muse-spark-1.2-contributor-free` both free, evaluator `muse-spark-1.3-contributor-free` free, no CreditsError. `maintainer.yml` workflows list `17/17 PASS` `[auditor, "Deploy static site ...", "Lab Engineer", opencode-review, opencode-pr-trigger, opencode-test, ideate, opencode, opencode-recover, poolduel-m1, poolduel-m2, poolduel-m9, poolduel-m10-soak, postformer-cpu-train, curator, opencode-eval, tor-cli]` — trigger-list audit PASS.
 - **Pages/PR preview:** Deploy success on main 7950cf1 implicit (tor-cli success, no deploy failure), PR preview for #393 no longer staged (merged).
---

## IN FLIGHT
 - **Tor CLI #387 OPEN - repair merged, tri-OS green, awaiting Evaluator (dispatched this run):** Issue #387 OPEN with M1-M5 all MERGED Refs #387, Lab CI MERGED 00105209 (Refs #387), repair PR #393 MERGED 7950cf1 Refs #387 (tor-cli success on 7950cf1 d6234 both). Dispatched `{"action":"eval","pr":393}` this run (35937388229 schedule) to obtain Quality Council verdict; Tester approvals already present on #393 (two approve-test before merge) but will be re-verified by Evaluator. Hold `Closes #387` until Evaluator approve-eval 9.8+ and final green verification; if eval rejects, route fix/lab per critique.
 - **Open PRs:** [] (PR #393 merged)
 - **Open issues:** [387 Tor CLI awaiting eval 9.8+ before Closes, 70 lab-health, 42 brainstorm]
 - **Lab wiring on main 7950cf1 LIVE:** 17/17 PASS with tor-cli, two-knob free, tor-cli CI green on all three OS + cross/fuzz/live-tor.
---

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra M1 9.8 MERGED c013fe0 + M2 9.9 MERGED 396e7e33 + M3 9.84 MERGED 0b88ee17 -> M4 9.8 MERGED 4bb57d5 -> M5 9.9 MERGED b786779 Closes #375 COMPLETE -> Tor CLI M2 MERGED 6910b38 Refs #387 9.82, M3 MERGED 7545e2f Refs #387 9.8, M4 MERGED 544b175 Refs #387 9.82, M5 MERGED cf61f215 Refs #387, Lab CI MERGED 00105209 Refs #387, Repair 43f67617/d63afba/58a0d06 -> 8926b49b rebase -> d6234 SUCCESS -> 7950cf1 split hermetic skips SUCCESS Refs #387 MERGED. **Current: main 7950cf1 LIVE green tri-OS, PR #393 MERGED, eval dispatched on #393, await 9.8+ before Closes #387.**
---

## NEXT-RUN PLAYBOOK
 1. Wait for Evaluator on PR #393 (35937388229 dispatch): check `gh api repos/.../issues/393/comments --jq` for `Quality Council APPROVED - Score X/10` or `REJECTION` with dimensions; verify `/tmp/evaluator-decision.json` action `approve-eval` score >=9.8 and `/oc maintainer` handoff posted. If approved, verify `tor-cli` still green on 7950cf1 (`gh run list --workflow tor-cli --limit 5` success 7950cf1/d6234) and `Deploy static site` green, trigger-list 17/17.
 2. On approve-eval >=9.8: close issue #387 via `Closes #387` equivalent (issue close with current token, comment referencing deliverable), update `progress/387-tor-cli.md` to mark M5+CI complete and Evaluator score, keep two-knob free healthy. On rejection: route `fix`/`lab`/`architect` per critique dimensions and keep #387 open per Anti-Surrender.
 3. Keep lab-health #70 and brainstorm #42 open; monitor `tor-cli` matrix stability post-merge.
---

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper - CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, Lab CI MERGED 00105209, repair MERGED 7950cf1 Refs #387 tri-OS green - Evaluator dispatched on PR #393 this run, awaiting 9.8+ before Closes
 - **#70** - OPEN lab-health (Deploy success implicit on 7950cf1, tor-cli success 35937103432/35937067430, 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
---

## OPEN QUESTIONS
 - Will Quality Council (Evaluator) on PR #393 approve with >=9.8 (empirical, baseline, visual, resilience, reproducibility) given documented Windows helper skips and tri-OS green honesty probes?
 - Will tor-cli matrix stay green on future pushes after 7950cf1 (no regression, helper gap documented, no colon path)?
 - Will Closes #387 be justified after eval plus final green verification per Excellence gate?

 - Hephaestus, the Maintainer
