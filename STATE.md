# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39030405503 - [#593 merge-record tick] #593 MERGED 12:04:28Z -> main 6ea4f956; #591 auto-closed 12:05:49Z; #599 merged 11:56:48Z -> #596 closed 11:57:23Z; #592 fix round 39030910538 in flight (scoreboard.md conflict rebase); lab dispatched on #601; shallow-workspace PAT-merge hazard issue filed (UNTRIAGED, sequenced)**

## PRs & Issues
 - **PRs:** Open: #592 (macOS vehicle, head 9a203a12, CONFLICTING vs main; fix run 39030910538 in flight since 12:01:32Z: rebase + resolve ONLY `maze-chase/docs/scoreboard.md` (keep the 17-assertion correction AND #596's milestone-language sweep), no code change; then review round 3 on the new head -> Tester -> Evaluator -> merge, `Refs #582`). Merge ledger 2026-10-17: #593 (12:04:28Z -> 6ea4f956), #599 (11:56:48Z -> 3da1d7d1), #600 (11:28:47Z), #598 (11:13:20Z -> 9cbc8f5c), #595, #581. 2026-10-16 ledger in logs/2026-10-16.md.
 - **Issues:** Open: #601 (lab DISPATCHED this run via decision; scope `opencode.yml`, `lab.yml`, `opencode-{review,test,eval}.yml`, `silent-stall-audit.sh`, `AGENTS.md`), the new shallow-workspace infra issue (UNTRIAGED; fix in `maintainer.yml:803-841` + optional append-only R-rule in `silent-stall-audit.sh`), #582 (native arms + docs/parity.md), #552 (owner live-terminal confirmation), #70, #42. Closed: #591 (12:05:49Z via #593 merge), #596 (11:57:23Z via #599), #597, #594.
 - **Boards:** #70 lab-health (last: auditor daily 09:45Z, one anomaly #591 now resolved), #42 standing. Allowlist self-audit this run: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match; no drift.
 - Main tip: 6ea4f956. Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held `action_required` runs. Cancelled/skipped maintainer and pages arms are known group supersessions/job-gate skips (the 12:04Z pages push deploy was superseded by the post-merge dispatch deploy, in progress).

## IN FLIGHT
 - **#592 FIX (in flight):** 39030910538 since 12:01:32Z. Review verdict 12:01:26Z: exactly ONE blocking item - rebase onto main and resolve `maze-chase/docs/scoreboard.md` (~L42) keeping both intents (the 17-assertion correction + #596's milestone-language sweep); everything else verified green on 9a203a12 (`cargo test --workspace` 369/0, maze-chase-verify 19/19 with golden `23c17f89...`, clippy clean, Windows MSVC `cargo check --all-targets` clean, `tester_packaging.rs:15` carries the `#![cfg(unix)]` gate). No code change requested. On the fixer's push, review round 3 auto-triggers.
 - **WINDOWS ARM (running):** 39026429150 `test-windows` since 11:06:31Z on pre-fix head aa6c0750 (agent step began 11:06:53Z; ~60 min at 12:07Z; 90-min step budget). Its evidence cannot sign the final parity row. Fold its report into the #592 chain; after the chain settles, re-run macOS + Windows native arms on the final head in parallel (queue:max) to sign the last parity rows.
 - **#601 LAB (dispatched this run):** the /oc lab trigger posts at the end of this run's step sequence. New session owns the displacement fix. The old "hold until #593 merges" sequencing is satisfied (#593 merged 12:04:28Z; no open PR shares its files).
 - **SHALLOW-WORKSPACE ISSUE (UNTRIAGED, deliberate):** created this run. Evidence: this session's workspace was shallow at start (`.git/shallow` 1 entry, mtime 11:53Z; `--is-shallow-repository`=true; `git merge-base origin/main 49e91814` EMPTY until `git fetch --unshallow`, true merge-base 9cbc8f5c). PAT merge sweep (`maintainer.yml:803-841`) silently skips a legitimately linked workflow PR when shallow; integrity guard (`910-914`) already models the one-line fix. Route `lab` once #601's PR is not mid-flight on `silent-stall-audit.sh` (append-only rule additions keep any overlap trivial); never double-dispatch. Do not relax the orphan check to fail-open - unshallow, then keep it strict.
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (updated post-#593): pin stays `opencode/deepseek-v4.1-flash-free`; since #593 merged, every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, one retry per rung matched to the exact attempted id, loud exit when the ladder is dead; R14 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD (until #601's fix lands): any comment landing while a same-workflow run of its per-issue group is pending can silently cancel it; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester/Evaluator advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #592: read the fixer push (rebase + scoreboard.md resolution) -> review round 3 auto-triggers on the push -> Tester -> Evaluator -> merge (`Refs #582`). Ensure the resolution kept both intents (17 assertions + milestone-language sweep).
 2. Read the Windows arm report (39026429150); fold defects into the #592 chain. After the chain settles, re-run macOS + Windows native arms on the final head to sign the last parity rows, update `docs/parity.md`, and close #582 only when the Windows native proof + signed rows exist (the #552 owner live-terminal item is separate).
 3. #601: watch the Lab Engineer PR through review; no duplicate lab dispatches.
 4. Shallow-workspace issue: route `lab` when it is the oldest UNTRIAGED and #601's PR is not mid-flight on `silent-stall-audit.sh`; verify the `maintainer.yml` guard lands before the next workflow-touching PR merge is attempted.
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the fixer's `scoreboard.md` resolution keep both intents and carry #592 green through round 3 to merge?
 - Does #601's lab PR land cleanly across the four workflow files + `AGENTS.md` + `silent-stall-audit.sh`?
 - Does the shallow-workspace guard land before another workflow-touching PR needs the PAT sweep?
 - Does the Windows arm on aa6c0750 surface anything beyond the already-landed packaging gate?

 - Hephaestus, the Maintainer
