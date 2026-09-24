# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T06:33Z (maintainer run 35964939690 - PR #398 MERGED fee11745 Refs #397, main 228d7cb9 -> fee11745 LIVE)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 OWNER):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts — codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 OPEN, PR #398 MERGED fee11745 Refs #397 (5 commits) — invariant now live on main, historical progress/ledger intentionally untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening all MERGED, staged sync MERGED 228d7cb9 Refs #387 (byte-identical staged/installed, 9.9 eval, 6/6 tri-OS on 4098d08). Deploy success on 228d7cb9 35962553419, now main fee11745 inherits same tor-cli tree (PR #398 touched only prompts/docs, no tor-cli files), Deploy on fee11745 pending verification. Issue #387 awaits sweep/Deploy green on live head before Closes.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main, verified at fee11745 after PR #398 merge (prompts now enforce unified docs).

## CRITICAL INFRASTRUCTURE STATE
 - **Main fee11745 LIVE - PR #398 MERGED:** `origin/main` = `fee11745ff63aeb93f6d7e4d34e2cf2a3a8932ea` verified via `git ls-remote origin/main` == fee11745 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == fee11745 (parent 228d7cb9, 5 commits: dfe05932 AGENTS.md/LAB.md invariant + 90b48666 architect + 495d49ba builder + 057033cb reviewer + fee11745 maintainer/curator). `git log --oneline -5 origin/main` = fee11745/057033cb/495d49ba/90b48666/dfe05932 + 228d7cb9. `git merge-base origin/main 56dcf589` = 228d7cb9 present (non-orphan, rebase merge). No `Co-authored-by` trailers, branch `opencode/lab-397-unified-docs-invariant` retained.
 - **Workflows 17/17 PASS on fee11745 (verified on base, live head inherits):** `maintainer.yml` workflows includes `tor-cli`, live workflows 20 (17 relevant + maintainer + Dependency Graph + pages-build-deployment). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). `gh api actions/workflows --jq .workflows[].name | sort` = 20 live, `tor-cli` active. No em dashes, no PAT in env, working tree clean.
 - **Tor CLI epic position:** Staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS on 4098d08 byte-identical to 228d7cb9, Deploy 35962553419 success). PR #398 touched only `.github/agents/*` + AGENTS.md/LAB.md (0 tor-cli files), so fee11745 tor-cli tree identical to 228d7cb9 — tri-OS green carries forward. Sweep tor-cli on new head pending Deploy run on fee11745 to confirm before Closes #387 (per earlier playbook).
 - **Documentation Invariant epic position:** Issue #397 OPEN Refs #397, PR #398 MERGED fee11745 — invariant + semantic phase naming now codified: AGENTS.md/LAB.md unified doc invariant + Semantic Phase Naming (Phase 1: <Capability>), architect mode 1 unified schemas + semantic roadmaps (`-phase-<k>`), builder zero-leakage + seamless integration, reviewer blocking check 18, maintainer/curator chaining + leakage watch. Historical progress untouched as specified.

## IN FLIGHT
 - **Documentation Invariant #397 OPEN - MERGED fee11745 Refs #397, awaiting verification on live head:** Issue #397 OPEN, PR #398 MERGED fee11745 (Reviewer approve 35964795764 + Tester approve-test 35964877652). No further `lab`/`review`/`test` dispatch needed — invariant live. Next maintainer will verify Deploy success on fee11745 + 17/17 PASS + zero leakage, then decide if #397 ready to close (currently kept open per Refs, as intermediate lab work).
 - **Tor CLI #387 OPEN - staged sync MERGED 228d7cb9 Refs #387, now main fee11745 inherits green, awaiting final Closes verification:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387, Evaluator 9.9 on staged sync, tor-cli 6/6 on 4098d08 (byte-identical to 228d7cb9/fee11745), Deploy success on 228d7cb9. PR #398 merge did not regress tor-cli. Next: verify Deploy success on fee11745 + tor-cli sweep 6/6 on fee11745 (if dispatched) + 17/17 PASS, then `Closes #387`.
 - **Open PRs:** [] (PR #398 MERGED, no open PRs after merge)
 - **Open issues:** [397 Unified Documentation Invariant - MERGED fee11745 Refs, 387 Tor CLI awaiting final Closes verification, 70 lab-health, 42 brainstorm]
 - **Lab wiring on main fee11745 LIVE:** 17/17 PASS expected (verify Deploy on fee11745 + next head).

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening + Lab trim + staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS, Deploy green) -> **Documentation Invariant PR #398 MERGED fee11745 Refs #397 (Reviewer+Tester approved, 5 commits, unified docs invariant live)** -> **Current: main fee11745 LIVE, #397 MERGED Refs (verify then close), #387 awaiting Deploy/sweep green on fee11745 before Closes.**

## NEXT-RUN PLAYBOOK
 1. Verify Deploy static site success on fee11745 (new head after PR #398) + `gh run list --workflow "tor-cli"` on fee11745 if sweep was dispatched (or confirm staged tree byte-identical to 4098d08 6/6).
 2. Verify trigger-list 17/17 PASS + two-knob free (`maintainer.yml` workflows + `opencode.json`) on fee11745 before any Closes.
 3. If Deploy green + 17/17 PASS + tor-cli still green (content unchanged from 228d7cb9), decide `Closes #397` if invariant fully verified, and `Closes #387` if Evaluator 9.9 still binding and sweep green — otherwise keep Refs and dispatch fix.
 4. No new build/architect/research on #397 unless leakage found; Tor CLI needs no further build unless Deploy/sweep red.

## ISSUES
 - **#397** - OPEN Unified Documentation Invariant - CREATED 2026-09-24T06:20Z Owner, PR #398 MERGED fee11745 Refs #397 (5 commits, Reviewer+Tester approved, 7 files), historical progress untouched, invariant now live (AGENTS.md/LAB.md + 5 prompts)
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, staged sync MERGED 228d7cb9 Refs #387 with 9.9 eval + Deploy success, now main fee11745 inherits same tor-cli tree (no regression), awaiting Deploy green + sweep verification before Closes
 - **#70** - OPEN lab-health (Deploy success on 228d7cb9 35962553419, fee11745 pending, 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)

## OPEN QUESTIONS
 - Will Deploy on fee11745 succeed (pages.yml preview intact, no workflow changes in PR #398)?
 - Will tor-cli sweep on fee11745 confirm 6/6 SUCCESS given identical tor-cli tree to 4098d08/228d7cb9?
 - Is #397 ready to close (Refs kept open for verification) or keep open for additional prompt wiring checks?
 - Is #387 epic ready for Closes after Deploy/sweep green on fee11745 (Evaluator 9.9 still binding)?

 - Hephaestus, the Maintainer
