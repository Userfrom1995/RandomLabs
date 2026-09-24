# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T07:07Z (maintainer run 35967371634 - issue_comment `/oc auditor` + per-OS tester request on #387, main fee11745 LIVE, lab per-OS testers + sweep dispatched)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts — codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) — invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI — `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 228d7cb9 Refs #387 (byte-identical staged/installed 9.9 eval, 6/6 tri-OS on 4098d08). Deploy success on 228d7cb9 35962553419 and on fee11745 35965214683 success. Issue #387 awaits tri-OS green on live fee11745 (sweep pending) + field failure audit before Closes. User field failure reported 2026-09-24T05:44Z on #387 - auditor + sweep dispatched. New per-OS real-user tester request 2026-09-24T06:57Z: create dedicated Windows/macOS/Linux testers, every command/flag/workflow report per platform.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` — 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ — 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED — README.md and index.html now accurately reflect live main, verified at fee11745 after PR #398 merge (prompts now enforce unified docs).

## CRITICAL INFRASTRUCTURE STATE
 - **Main fee11745 LIVE - PR #398 MERGED:** `origin/main` = `fee11745ff63aeb93f6d7e4d34e2cf2a3a8932ea` verified via `git ls-remote origin/main` == fee11745 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == fee11745 (parent 228d7cb9, 5 commits: dfe05932 AGENTS.md/LAB.md invariant + 90b48666 architect + 495d49ba builder + 057033cb reviewer + fee11745 maintainer/curator). `git log --oneline -5 origin/main` = fee11745/057033cb/495d49ba/90b48666/dfe05932 + 228d7cb9. `git merge-base origin/main 56dcf589` = 228d7cb9 present (non-orphan, rebase merge). No `Co-authored-by` trailers, branch `opencode/lab-397-unified-docs-invariant` retained. Deploy static site success 35965214683 on fee11745 verified, Deploy failure 35964795158 on 56dcf589 isolated.
 - **Workflows 17/17 PASS on fee11745:** `maintainer.yml` workflows includes `tor-cli`, live workflows 20 (17 relevant + maintainer + Dependency Graph + pages-build-deployment). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). `gh api actions/workflows --jq .workflows[].name | sort` = 20 live, `tor-cli` active at `.github/workflows/tor-cli.yml` Lab-trimmed (shared else, single skip `TestConnectDisconnectM3Contract`). No em dashes, no PAT in env, working tree clean.
 - **Tor CLI epic position:** Staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS on 4098d08 byte-identical to 228d7cb9/fee11745 via 7dcf3e4, Deploy 35965214683 on fee11745 success). PR #398 touched only `.github/agents/*` + AGENTS.md/LAB.md (0 tor-cli files), so fee11745 tor-cli tree identical to 228d7cb9 — tri-OS green carries forward but sweep on live fee11745 pending re-proof (content identical but craft gate requires run on live SHA). Auditor runs 35967047288 in_progress + 35967371532 pending on fee11745 already cover every-flag audit.
 - **Documentation Invariant epic position:** Issue #397 CLOSED at fee11745 (Refs #397, verified Deploy green, 17/17 PASS, zero leakage per Reviewer 35964795764 + Tester 35964877652). Historical progress untouched as specified. PR #398 merged.

## IN FLIGHT
 - **Tor CLI #387 OPEN - field failure triage + per-OS tester creation + sweep pending:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387, Evaluator 9.9 on staged sync, tor-cli 6/6 on 4098d08 (byte-identical to fee11745), Deploy 35965214683 on fee11745 success. User per-OS request 2026-09-24T06:57Z: dedicated Windows/macOS/Linux testers for real-user every command/flag/workflow testing, report per platform, fix issues. This run dispatched `lab` on #387 (create per-OS tester agents per CREATING_AGENTS.md; each tester exercises run/shell/connect/disconnect/repair/status/version/help and all flags --tor/--timeout/--reuse/--backend/--tor-user/--trans-port/--state-dir/--force/--json/--control/--socks on its OS, fail-closed/honest-exit verified) + `sweep tor-cli main` (re-prove 6/6 on fee11745). Auditor runs 35967047288 in_progress + 35967371532 pending already satisfy `/oc auditor`; no duplicate auditor dispatch (cooldown 30m). No new build until auditor + lab + sweep report; if gaps found, next will dispatch builder/tester/evaluator.
 - **No open PRs:** [] (PR #398 MERGED fee11745, PR #396 MERGED 228d7cb9, PR #395/394/393/392 all MERGED, no open PRs to review/test)
 - **Open issues:** [387 Tor CLI field failure + per-OS tester creation + sweep, 70 lab-health, 42 brainstorm] (397 now CLOSED fee11745)
 - **Lab wiring on main fee11745 LIVE:** 17/17 PASS verified (Deploy 35965214683 success, fee11745 inherits tor-cli green pending sweep).

## PIPELINE POSITION
 Doom M1 REJECT 5.3 -> fix -> 9.84 MERGE -> M2 8.0 -> fix -> 9.8 MERGE -> M3 9.86 MERGE -> M4 9.88 MERGE -> M5 MERGED e33e11f1 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening + Lab trim + staged sync MERGED 228d7cb9 Refs #387 (9.9 eval, 6/6 tri-OS, Deploy green) -> Documentation Invariant PR #398 MERGED fee11745 Refs #397 (Reviewer+Tester approved, 5 commits) -> Current: main fee11745 LIVE Deploy 35965214683 success, #397 CLOSED, #387 OPEN awaiting sweep 6/6 on fee11745 + auditor field-failure audit + Lab per-OS tester agents before Closes.

## NEXT-RUN PLAYBOOK
 1. Await `auditor` runs 35967047288 + 35967371532 on fee11745 - verify health and every-flag coverage; open follow-up issue if gaps.
 2. Await `Lab Engineer` on #387 - verify per-OS tester agents created per CREATING_AGENTS.md (3 agents, prompts, workflow wiring, REGISTRY.md, PR `lab: create per-OS testers`), then dispatch each tester to report separately per platform.
 3. Await `tor-cli` sweep on fee11745 - verify 6/6 SUCCESS (ubuntu/macos/windows + cross + fuzz + live-tor) as on 4098d08; if red, correlate jobs and dispatch lab/builder.
 4. If sweep green + auditor healthy + Lab testers report per-OS clean + Evaluator 9.9 still binding and staged/installed byte-identical, decide `Closes #387`; otherwise keep Refs and dispatch fix with field evidence.
 5. No new build/architect/research on #387 until auditor/lab/sweep report lands (Anti-Surrender: never close on negative, never stall on identical content).

## ISSUES
 - **#387** - OPEN Tor CLI lightweight cross-platform Tor wrapper — CREATED 2026-09-23T19:25Z, M1-M5 all MERGED Refs #387, staged sync MERGED 228d7cb9 Refs #387 with 9.9 eval + Deploy success on fee11745, field failure ping 2026-09-24T05:44Z + per-OS tester request 2026-09-24T06:57Z, lab+sweep+auditor dispatched, awaiting 6/6 on fee11745 + per-OS reports before Closes
 - **#70** - OPEN lab-health (Deploy success on fee11745 35965214683 + 228d7cb9, tor-cli sweep pending, 17/17 PASS)
 - **#42** - OPEN brainstorm (Tor CLI directive source, remains OPEN)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant - CREATED 2026-09-24T06:20Z Owner, PR #398 MERGED fee11745 Refs #397 (5 commits, Reviewer+Tester approved), invariant live

## OPEN QUESTIONS
 - Will Auditor runs on fee11745 flag any flag/command lacking a durable test pin (e.g., --reuse foreign tor cookie race, --force stale repair, --trans-port custom port verify, status --socks probe)?
 - Will Lab Engineer successfully create 3 per-OS tester agents and will each tester report per-platform real-user results for every command/flag/workflow without relying only on hermetic builds?
 - Will `tor-cli` sweep on fee11745 confirm 6/6 SUCCESS given identical tor-cli tree to 4098d08/228d7cb9 and Deploy already success?
 - Is user's field failure due to documented limitation (system-wide on macOS/Windows exit 4, proxy-env ignore, missing tor/torsocks, non-sudo connect, stale state) or a genuine per-OS gap needing builder fix?
 - Is #387 ready for Closes after sweep green + auditor healthy + per-OS tester reports + Evaluator 9.9 (never close on field failure without evidence, per Anti-Surrender)?

 - Hephaestus, the Maintainer
