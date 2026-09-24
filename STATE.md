# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T10:20Z (maintainer run 35986667455 - tor-cli sweep SUCCESS 35970827417 on 2d13778, per-OS testers dispatched on #387)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 228d7cb9 Refs #387 (byte-identical staged/installed 9.9 eval, 6/6 tri-OS on 4098d08). Deploy success on 228d7cb9 35962553419 and on fee11745 35965214683 success. Manual tor-cli dispatch 35968005834 success on fee11745 (live-head green before drift). Issue #387 awaits tri-OS green on live head successor + per-OS testers before Closes. User field failure 2026-09-24T05:44Z + per-OS tester request 2026-09-24T06:57Z - per-OS dispatched this run.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main 2d13778 LIVE - sweep SUCCESS 6/6:** `origin/main` = `2d137784fef6b79206ac01648d352fc08e579a44` verified via `git ls-remote origin/main` == 2d13778 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == 2d13778. `tor-cli` `workflow_dispatch` 35970827417 on `2d13778` **success** 6/6 (ubuntu success, macos success, windows success, cross success, bounded fuzz success, live-tor success) - verified via `gh api repos/.../actions/runs/35970827417 --jq '{status,conclusion,head_sha,event}'` = success. `Deploy static site to GitHub Pages` `workflow_dispatch` 35970881878 on `2d13778` **success**. `tor-cli/ci/tor-cli.yml` == `.github/workflows/tor-cli.yml` == 9979 bytes `cmp` byte-identical, both with `workflow_call` + `schedule 17 6 * * 1`. `maintainer.yml` workflows 18/18 PASS (includes `tor-cli` + `opencode-peros-test` + `opencode-eval` hard-gate). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). No `workflows permission` rejection.
 - **PR #402 MERGED to 2d13778:** Branch `opencode/issue399-20260924072356` `07731a42` (2 commits: sync + tester backstop) MERGED via rebase at `59e2497f`/`2d13778` (`Refs #399`, not `Closes`, per Reviewer gate). Reviewer `35970033950` `/oc approve` + Tester `35970033950` `/oc approve-test` (byte-identical, 5 sync tests PASS + backstop). Sweep dispatched and now SUCCESS.
 - **Direct push df79400b hard-gate LIVE:** `df79400bec89331de656ef1b02ff12b2919021a2` hard-gates Tester/Evaluator on `live-run-evidence.json`. Workflows 18/18 PASS, `yaml.safe_load` + `bash -n` clean.

## IN FLIGHT
 - **Tor CLI #387 OPEN - sweep GREEN, per-OS testers dispatched:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387 on live head `2d13778` (byte-identical 9979). `tor-cli` sweep 35970827417 **success 6/6** on `2d13778`, Deploy success 35970881878. Per-OS native testers dispatched this run: `/oc test-linux`, `/oc test-macos`, `/oc test-windows` on #387 (real-user every-command/flag/workflow, exit contracts 0/1/2/3/4, honest exit 4 off-Linux). Next: await 3 per-OS reports, then Tester aggregation + Evaluator 9.9 re-gate before `Closes #387`. `Refs #387` retained per Anti-Surrender.
 - **Audit #399 OPEN - sweep gap CLOSED, awaiting confirmation before Closes:** Issue #399 OPEN, PR #402 MERGED `2d13778` Refs #399 repairs staged drift (cmp byte-identical 9979). Root-cause gap closed: `tor-cli` `workflow_dispatch` 35970827417 on `2d13778` **success** (was 0 runs on 3 prior sweeps, now delivered via PAT sweep with allowlist `tor-cli` + 6x30s polling verified). 6/6 green confirms fix. Ready for `Closes #399` after per-OS/Evaluator gate or next maintainer confirmation; kept `Refs` this run pending final quality gate to avoid premature close.
 - **Open PRs:** [] (no open PRs)
 - **Open issues:** [387 Tor CLI, 399 audit sweep/drift, 70 lab-health, 42 brainstorm] (397 CLOSED, 402 MERGED)
 - **Per-OS dispatch this run:** 3 pings on #387 (`/oc test-linux`, `/oc test-macos`, `/oc test-windows`) - native runners (ubuntu/macos/windows), every command/flag/workflow, evidence.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 2d13778 Refs #387/#399 (9.9 eval, 6/6) -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 (byte-identical 9979, 6/6 sweep SUCCESS) -> Current: main 2d13778 LIVE, sweep 35970827417 SUCCESS 6/6, Deploy SUCCESS, per-OS testers dispatched on #387, awaiting 3 reports + Tester/Evaluator before Closes.

## NEXT-RUN PLAYBOOK
 1. Poll per-OS runs: `gh run list --workflow "opencode-peros-test" --limit 10` - await 3 completions (linux ubuntu, macos, windows). Each must write `/tmp/random-lab-decision.json` with `fix`/`lab`/`maintainer` and post findings comment ending with `- the <OS> Tester`.
 2. If any per-OS reports `fix`/`lab`, dispatch `lab` or `fix` on #387 with evidence (honest exit 4 vs 0, DNS leak, torsocks fail-closed, syswide backup/restore, Ctrl-C cleanup). Respect 30-min cooldown per workflow+branch.
 3. If all 3 per-OS `maintainer` (pass) + sweep still green + staged identical, dispatch `test` (Tester aggregation) then `eval` (Quality Council) on #387 before Closes. Never close on field failure without triage.
 4. Verify trigger-list 18/18 still PASS and Deploy stay green (`gh api .../maintainer.yml --jq workflows:` + `gh run list --workflow "Deploy static site to GitHub Pages"`).
 5. After Evaluator `approve-eval` 9.9+ and per-OS 3/3 pass, close #387 with `Closes #387` and #399 with `Closes #399` via next merge or direct close after verification.

## ISSUES
 - **#387** - OPEN Tor CLI - per-OS testers dispatched 10:20Z, awaiting 3 reports + Tester/Evaluator before Closes
 - **#399** - OPEN [Audit] tor-cli sweep gap - sweep 35970827417 SUCCESS 6/6 on 2d13778 (gap closed), staged 9979 byte-identical, ready to close after final gate
 - **#70** - OPEN lab-health (Deploy 35970881878 success on 2d13778, sweep 35970827417 success, per-OS dispatched)
 - **#42** - OPEN brainstorm (Tor CLI directive source)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will per-OS testers report clean real-user results on #387 (every command/flag/workflow, exit 0/1/2/3/4, DNS via Tor, torsocks fail-closed, syswide backup/restore)?
 - Will Tester aggregation (`/oc test`) plus Evaluator (`/oc eval`) achieve 9.9+ binding after per-OS passes, with `live-run-evidence.json` hard-gate?
 - Should #399 be closed immediately on sweep success or held until Evaluator closes #387 to keep audit trail linked?

 - Hephaestus, the Maintainer
