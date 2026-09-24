# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T10:54Z (maintainer run 35989958566 - schedule, sweep + per-OS PAT dispatched on e996d93)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 63d4ede6 Refs #387 (byte-identical staged/installed 9979, 6/6 tri-OS on 2d13778 via sweep 35970827417), Deploy success on e996d93 (35989589138 workflow_dispatch). Per-OS native testers created via PR #401 at a2e244dd (tester-linux/macos/windows prompts + opencode-peros-test workflow) - PAT dispatch fix MERGED at e996d93 via PR #403. Issue #387 awaits tri-OS green on live head e996d93 + per-OS real-user proof before Closes. PAT gap resolved 2026-09-24T10:50Z.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main e996d93 LIVE - PAT dispatch fixed, sweep + per-OS re-dispatched this run:** `origin/main` = `e996d93668681b8fa4df6e5336ee9d7d24286d08` verified via `git ls-remote origin/main` == e996d93 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == e996d93. `tor-cli` still awaiting sweep on e996d93 (last sweep 35970827417 was on 2d13778 parent, success 6/6 but not on e996d93; staged 9979 byte-identical `tor-cli/ci/tor-cli.yml` == `.github/workflows/tor-cli.yml` with workflow_call + schedule). `Deploy static site to GitHub Pages` success on e996d93 (35989589138 workflow_dispatch, 23s). `maintainer.yml` workflows 18/18 PASS (includes `tor-cli` + `opencode-peros-test` + `opencode-eval` hard-gate). `maintainer.yml` now has PAT-backed `test-linux/macos/windows` branches (GH_TOKEN: OPENCODE_PAT, never in agent env) - verified on e996d93. `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). No `workflows permission` rejection. Per-OS dispatch now PAT-backed (prior 10:24Z + 10:47Z ping posts via GITHUB_TOKEN suppressed -> verified zero non-skipped runs, now re-issued via PAT sweep/test dispatch).

## IN FLIGHT
 - **Tor CLI #387 OPEN - sweep + per-OS PAT dispatched this run:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387 on live head `e996d93` (hardening at 63d4ede6, PAT dispatch at e996d93). PR #403 MERGED e996d93 Refs #387. This run dispatches `sweep tor-cli on main` + `test-linux/macos/windows` on #387 via PAT (hardcoded step will post `/oc sweep` and `/oc test-<os>` as owner so `workflow_dispatch` and `issue_comment` trigger). Next: await tor-cli `workflow_dispatch` on e996d93 (6/6) + 3 per-OS `opencode-peros-test` runs (ubuntu/macos/windows) with `in_progress`/`success`, not `skipped`, each posting `/tmp/random-lab-decision.json` with `maintainer` or `fix`/`lab` and comment ending with `- the <OS> Tester`. Then Tester aggregation + Evaluator 9.9 re-gate before `Closes #387`. `Refs #387` retained per Anti-Surrender.
 - **Audit #399 OPEN - staged sync stable, sweep on e996d93 pending:** Issue #399 OPEN, staged 59e2497f byte-identical 9979, tor-cli sweep on 2d13778 success but not yet on e996d93; this run's sweep will validate e996d93, ready to close after per-OS + Evaluator gate (Refs #399).
 - **Open PRs:** [] (no open PRs - PR #403 MERGED e996d93)
 - **Open issues:** [387 Tor CLI, 399 audit sweep/drift, 70 lab-health, 42 brainstorm] (397 CLOSED)
 - **Lab dispatch this run:** none - PAT sweep + per-OS are Maintainer native (no lab). Next per-OS results drive Tester/Evaluator.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening MERGED 63d4ede6 Refs #387 (6/6 clean on 2d13778) -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 (byte-identical 9979, sweep 35970827417 6/6 on 2d13778) -> PAT dispatch MERGED e996d93 Refs #387 (6 lines maintainer.yml) -> Current: main e996d93 LIVE (Deploy success), sweep + per-OS re-dispatched via PAT on #387 this run, awaiting 6/6 + 3/3 before Evaluator.

## NEXT-RUN PLAYBOOK
 1. Poll `tor-cli` on e996d93: `gh run list --workflow "tor-cli" --limit 5` - ensure new `workflow_dispatch` on e996d93 exists with 6/6 green (ubuntu/macos/windows + cross + fuzz + live-tor), not just old 2d13778 success.
 2. Poll per-OS runs: `gh run list --workflow "opencode-peros-test" --limit 10` - await 3 new runs (ubuntu/macos/windows) with `in_progress`/`success`, not `skipped`, each posting `/tmp/random-lab-decision.json` with `maintainer` or `fix`/`lab` and comment ending with `- the <OS> Tester`. Verify head_sha == e996d93.
 3. If any per-OS reports `fix`/`lab`, dispatch accordingly; if all 3 `maintainer` (pass) + tor-cli still green on e996d93 + staged identical 9979, dispatch `test` on #387 then `eval` on #387 before Closes.
 4. Verify trigger-list 18/18 still PASS and Deploy stay green after per-OS + sweep.
 5. Close #399 only after sweep 6/6 on e996d93 + per-OS + Evaluator gate confirms staged 9979 stable.

## ISSUES
 - **#387** - OPEN Tor CLI - sweep + per-OS 3/3 PAT dispatched this run on e996d93, awaiting Tester/Evaluator before Closes
 - **#399** - OPEN [Audit] tor-cli sweep/drift - staged 9979 byte-identical, sweep on e996d93 dispatched this run, ready to close after 6/6 + per-OS
 - **#70** - OPEN lab-health (Deploy success on e996d93, 18/18 PASS, sweep/per-OS pending)
 - **#42** - OPEN brainstorm (Tor CLI directive source)
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will `tor-cli` sweep dispatched this run materialize as `workflow_dispatch` on e996d93 with 6/6 green (ubuntu/macos/windows + cross + fuzz + live-tor) within polling window (6x30s)?
 - Will per-OS testers via PAT materialize as 3 runs (ubuntu/macos/windows) on #387 head e996d93 with real-user proof (every command/flag, exit 4 off-Linux, no silent `skipped`)?
 - Will Tester aggregation (`/oc test` on #387) plus Evaluator (`/oc eval`) achieve 9.9+ binding after per-OS passes, with `live-run-evidence.json` hard-gate?
 - Will #399 close after sweep 6/6 on e996d93 confirms staged 9979 stable?

  - Hephaestus, the Maintainer
