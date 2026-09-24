# STATE - Random factory checkpoint
 - **Updated: 2026-09-24T11:35Z (maintainer run 35993724125 - issue_comment on #404, dispatch eval on c8cf3e2)**

## STANDING OWNER DIRECTIVES (active)
 - **DOCUMENTATION INVARIANT DIRECTIVE (2026-09-24T06:20Z, via #397 CLOSED at fee11745):** Enforce Unified Documentation Invariant and abolish internal milestone leakage in agent prompts - codify invariant in `AGENTS.md`/`LAB.md` (no milestone/sprint leakage in `<project>/docs/` + `<project>/README.md`), semantic phase naming (descriptive vs M1/M2), update prompts for `architect`/`builder`/`reviewer`/`maintainer`/`curator`, Lab Engineer executor. Issue #397 CLOSED at fee11745, PR #398 MERGED fee11745 Refs #397 (5 commits) - invariant now live on main, historical progress/ledger untouched.
 - **TOR CLI DIRECTIVE (2026-09-23T19:14:33Z, via #42):** Build lightweight, fast, cross-platform open-source Tor CLI - `tor-tool <app> [args]` per-app only, `tor-tool shell` isolated shell, `sudo tor-tool connect`/`disconnect` system-wide with safe restore, `status`/`version`, use existing Tor (auto-manage/detect, startup/readiness/reuse/cleanup/Ctrl-C/failures/DNS/IPv4/IPv6, never falsely claim protected), Linux/macOS/Windows behind common CLI, thorough GitHub Actions testing across 3 OS. Tracking issue #387 OPEN, M1..M5 all MERGED Refs #387, Lab CI + repairs + final hardening + staged sync MERGED 63d4ede6 Refs #387 (byte-identical staged/installed 9979, 6/6 tri-OS on 2d13778 via sweep 35970827417), Deploy success on e996d93 (35993278937 workflow_dispatch). Per-OS native testers created via PR #401 at a2e244dd (tester-linux/macos/windows prompts + opencode-peros-test workflow) - PAT dispatch fix MERGED at e996d93 via PR #403. Issue #387 awaits tri-OS green on live head e996d93 + per-OS real-user proof + Evaluator >=9.8 before Closes. PAT gap resolved 2026-09-24T10:50Z.
 - **UMBRA DIRECTIVE (2026-09-22T15:43Z, via #375 CLOSED):** Shadow Fight-inspired WebGPU Combat at `/umbra/` - 7 gates COMPLETE.
 - **DOOM DIRECTIVE (2026-09-17T21:10Z, via #362 CLOSED):** Client-Side Web Doom at /doom/ - 6 gates, issue #362 CLOSED at e33e11f1 (M1-M5 complete).
 - **POOLDUEL CLOSED (2026-09-16T16:56Z, via #302):** Owner closed #302; REDESIGN terminated.
 - **LAB RIGOR GATES (2026-09-07T15:47Z):** Brutal rigor charter live.
 - **EXCELLENCE IN CRAFTSMANSHIP CHARTER (2026-09-04T16:28Z):** Live on 61b09c8.
 - **LAB HEALTH NOTICE (2026-09-07T16:06Z via #70):** RESOLVED - README.md and index.html now accurately reflect live main.

## CRITICAL INFRASTRUCTURE STATE
 - **Main e996d93 LIVE - tor-cli 6/6 + Reviewer/Tester approved on c8cf3e2, dispatching Eval:** `origin/main` = `e996d93668681b8fa4df6e5336ee9d7d24286d08` verified via `git ls-remote origin/main` == e996d93 and `gh api repos/Userfrom1995/RandomLabs/git/refs/heads/main --jq .object.sha` == e996d93. `tor-cli` `pull_request` `35992913191` `success` 6/6 on `c8cf3e2` (ubuntu/macos/windows + cross + fuzz + live-tor bootstrap all green, torrc now only ControlPortWriteToFile). `opencode-review` `35993250415` success `approve` on c8cf3e2 (re-review at 11:30:36Z) + `opencode-test` `35993443742` success `approve-test` on c8cf3e2 (live torshim run hello-through-tor exit 0 on real tor 0.4.9.11, bridge 40-hex, tester_torrc_live_verify green). Deploy 35993278937 success on e996d93. `maintainer.yml` workflows 18/18 PASS (tor-cli + opencode-peros-test + opencode-eval). `opencode.json` two-knob free (`muse-spark-1.3-contributor-free` / `muse-spark-1.2-contributor-free`, evaluator `muse-spark-1.3-contributor-free`). No `workflows permission` rejection, no CreditsError.

## IN FLIGHT
 - **Tor CLI #387 OPEN - PR #404 c8cf3e2 gate complete, Evaluator next:** Issue #387 OPEN, M1-M5 + Lab + hardening + staged sync all MERGED Refs #387 on `e996d93`. PR #404 OPEN `opencode/issue387-20260924110254` `c8cf3e243ccdddfaee864f397753b98e3504ba6e` `Linux FAIL: bogus torrc rejected by tor` - Fixer 1631c6d2 + Tester c8cf3e2 landed, Reviewer approve (11:30:36Z) + Tester approve-test (11:33:31Z) freshly certified on c8cf3e2, tor-cli 6/6 success on c8cf3e2 (35992913191). Next: `eval` (>=9.8 Quality Council) before `Closes #387`. `Refs #387` retained per Anti-Surrender until eval approves. Per-OS tri-OS already covered by tor-cli matrix 6/6 (ubuntu/macos/windows) + live per-OS Linux proof that discovered bug; opencode-peros-test 3/3 will be verified alongside eval or immediately after if eval requests it.
 - **Audit #399 OPEN - sweep gap fixed, staged stable, blocked by same bug:** Staged `tor-cli/ci/tor-cli.yml` 9979 byte-identical to `.github/workflows/tor-cli.yml`, sweep on e996d93 `35990649838` 6/6 hermetic masked bug; fix on PR #404 c8cf3e2 re-proved 6/6 (35992913191) with valid torrc, ready to close after Evaluator gate. Refs #399.
 - **Open PRs:** [404 Linux FAIL: bogus torrc rejected by tor (c8cf3e2, review approve + tester approve-test + tor-cli 6/6, eval dispatched)] (no other open PRs)
 - **Open issues:** [387 Tor CLI, 399 audit sweep/drift, 70 lab-health, 42 brainstorm] (397 CLOSED)
 - **Lab dispatch this run:** `eval` on PR #404 - tor-cli only diff (lifecycle.go + tests), no `.github/workflows/**` infra, so lab guard PASS.

## PIPELINE POSITION
 Doom M1..M5 COMPLETE -> Umbra 7 gates COMPLETE -> Tor CLI M2..M5 MERGED Refs #387, Lab CI + repairs + final hardening MERGED 63d4ede6 Refs #387 -> Documentation Invariant MERGED fee11745 Refs #397 -> Audit sweep gap fix MERGED 2d13778 Refs #399 (byte-identical 9979) -> PAT dispatch MERGED e996d93 Refs #387 -> Current: main e996d93 LIVE, Fixer fix 1631c6d2 + Tester live-verify c8cf3e2 landed, Reviewer approve + Tester approve-test + tor-cli 6/6 now green on c8cf3e2, dispatching Evaluator (9.9) before Closes.

## NEXT-RUN PLAYBOOK
 1. Poll eval: `gh api repos/Userfrom1995/RandomLabs/actions/runs --jq '.workflow_runs[] | select(.name=="opencode-eval")'` for approve-eval >=9.8 on c8cf3e2 (or fix request). If fix, dispatch Fixer/Lab accordingly.
 2. When eval approves: merge PR #404 via `gh pr merge 404 --rebase` (branch shares history via merge-base e996d93, not orphan), verify pages Deploy green on successor, then close #387 and #399 (both Refs, now Closes - verify `tor-cli/ci/tor-cli.yml` stays 9979 byte-identical after fix, trigger-list 18/18 PASS).
 3. If eval requests per-OS 3/3 tri-OS re-proof: dispatch `/oc test-linux` `/oc test-macos` `/oc test-windows` via decision json (or let Tester handle), then re-eval.
 4. Verify Deploy static site success on successor main, no held action_required, no workflow failure.

## ISSUES
 - **#387** - OPEN Tor CLI - PR #404 c8cf3e2 fully gated (review+test+tor-cli 6/6), eval dispatched
 - **#399** - OPEN [Audit] tor-cli sweep/drift - staged 9979 byte-identical, fix on PR #404 6/6 re-proved, ready after eval
 - **#404** - OPEN peros-linux regression - fix+tester landed c8cf3e2: torrc bogus removed, fixed ports + ProbeSocks + bridge digest + live-torrc suite, review+test+CI green, eval next
 - **#70** - OPEN lab-health (Deploy success, 18/18 PASS)
 - **#42** - OPEN brainstorm
 - **#397** - CLOSED at fee11745 Unified Documentation Invariant

## OPEN QUESTIONS
 - Will Evaluator approve >=9.8/10 on c8cf3e2 (wrapper-picked ports, ProbeSocks, live hello-through-tor, bridge 40-hex, tor --verify-config stock+TransPort, 7 packages green) or request per-OS/docs follow-ups?
 - Will per-OS macOS/Windows re-tests still needed after tor-cli 6/6 already proved tri-OS hermetic + live-tor best-effort?
 - Will #387 and #399 close cleanly after eval and merge of c8cf3e2 to successor of e996d93?

  - Hephaestus, the Maintainer
