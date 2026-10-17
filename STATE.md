# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39031391103 - [#602 self-triage tick] #602 (shallow-workspace PAT merge guard) triaged and held behind #601's in-flight lab session (shared silent-stall-audit.sh, append-only overlap); #592 rebased to 63a5d5ac MERGEABLE/CLEAN, review round 3 in flight (39031318463, duplicate 39031324727 queued); #601 lab session 39031391744 in flight; Windows arm 39026429150 still running on pre-fix aa6c0750**

## PRs & Issues
 - **PRs:** Open: #592 (macOS vehicle, head 63a5d5ac, MERGEABLE/CLEAN after the 12:07:48Z rebase; review round 3 in flight 39031318463 since 12:07:54Z, duplicate review 39031324727 queued behind it in the same group; then Tester -> Evaluator -> merge, `Refs #582`). Merge ledger 2026-10-17: #593 (12:04:28Z -> 6ea4f956), #599 (11:56:48Z -> 3da1d7d1), #600 (11:28:47Z), #598 (11:13:20Z -> 9cbc8f5c), #595, #581. 2026-10-16 ledger in logs/2026-10-16.md. Main tip: 6ea4f956 (unchanged this tick).
 - **Issues:** Open: #602 (shallow-workspace infra guard; TRIAGED 12:12Z, sequenced behind #601; feed to `lab` when #601's lane clears or by the ~14:00Z escape hatch), #601 (lab session 39031391744 in flight since 12:09:03Z), #582 (native arms + docs/parity.md; waits on the #592 chain), #552 (owner live-terminal confirmation outstanding), #70, #42.
 - **Boards:** #70 lab-health (last: auditor daily 09:45Z), #42 standing. Allowlist self-audit this tick: 19 entries vs 19 live non-maintainer workflow `name:` fields, exact set match; no drift. Failure sweep: zero failure/timed_out/startup_failure in the last 100 runs; zero held `action_required` runs. Cancelled maintainer/pages arms are known group supersessions/job-gate skips.

## IN FLIGHT
 - **#592 REVIEW ROUND 3 (in flight):** 39031318463 since 12:07:54Z on `63a5d5ac` (post-rebase, MERGEABLE/CLEAN). The fixer resolved the single `maze-chase/docs/scoreboard.md` conflict keeping both intents (17-assertion correction + #596 milestone-language sweep) and reported green gates on the pushed head (370 workspace tests, verify 19/19, fmt, clippy, Windows all-targets check). A duplicate review run 39031324727 sits queued behind it in the same per-PR group; expected no-op once the first verdict lands.
 - **#601 LAB (in flight):** Lab Engineer run 39031391744 since 12:09:03Z (the /oc lab trigger dispatched by the 12:04Z session). New session owns the displacement fix across opencode.yml, lab.yml, opencode-{review,test,eval}.yml, silent-stall-audit.sh, AGENTS.md. Watch for its PR; no duplicate lab dispatches.
 - **#602 SHALLOW-GUARD (TRIAGED, sequenced):** held behind #601's lab PR to avoid two sessions editing silent-stall-audit.sh from the same base. Fix = defensive `git fetch --unshallow` at the top of the PAT merge step (maintainer.yml:803-841), keep the strict orphan check; optional append-only audit rule. Escape hatch: if #601 has no PR and no live session by ~14:00Z, dispatch `lab` on #602 regardless with the append-only instruction. Never relax the orphan check to fail-open.
 - **WINDOWS ARM (running, stale evidence):** 39026429150 `test-windows` since 11:06:32Z on pre-fix `aa6c0750` (67+ min at 12:12Z; 90-min step budget). Its evidence cannot sign the final parity row. If it fails or times out, do NOT re-dispatch on the old head: the re-run on the final head supersedes it. After the #592 chain settles, re-run macOS + Windows arms on the final head in parallel (queue:max) to sign the last parity rows.
 - **CONCURRENT SESSIONS:** maintainer 39031324717 (/oc maintainer 12:07:58Z on #592, in progress) and maintainer 39031099878 (#593 pull_request event, in progress) are writing memory too; last writer wins. This session's workspace was full-depth (`--is-shallow-repository` false).
 - TEST-CRASH RULE (standing): a test run dying inside `Run opencode tester` with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test.
 - MODEL-WATCH RULE (standing): pin `opencode/deepseek-v4.1-flash-free`; registry-resolved preflight plus the ordered free-tier ladder in `.github/actions/opencode-run/model-ladder.txt` (R14 guards it). A dead rung or a better free model -> `lab`.
 - DISPLACEMENT HAZARD (until #601's fix lands): any comment landing while a same-workflow run of its per-issue group is pending can silently cancel it; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - SHALLOW-WORKSPACE HAZARD (until #602's guard lands): if a workflow-touching PR sits approved but unmerged across ticks, check `git rev-parse --is-shallow-repository` and unshallow before relying on the PAT sweep.
 - Evaluator follow-ups plus all carried advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge. Shipping limit does not apply to docs/lab/intermediate Refs PRs.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued; zero held runs currently.

## NEXT-RUN PLAYBOOK
 1. #592: follow review round 3 (39031318463) on `63a5d5ac`. On approve the review workflow auto-forwards `/oc test`; on fix findings the Fixer is auto-forwarded. Merge only after `approve-eval` chains to the Maintainer. `Refs #582` stands; never close #582 on this evidence vehicle.
 2. #601: read the Lab Engineer PR when it opens; route review; no duplicate lab dispatches. That clears the lane for #602's lab (append-only overlap instruction).
 3. Windows arm 39026429150: read its terminal state; if failed/timed_out, log it and wait for the final-head re-run (never re-dispatch on the old head).
 4. After the #592 chain settles, re-run macOS + Windows native arms on the final head, update `docs/parity.md`, and close #582 only when the Windows native proof and the signed rows exist (#552 owner item is separate).
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does review round 3 pass `63a5d5ac` cleanly to the Tester?
 - Does #601's lab PR land cleanly across the six workflow files + AGENTS.md + silent-stall-audit.sh, and does the #602 guard slot in behind it?
 - Does the shallow-workspace guard land before the next workflow-touching PAT merge is attempted (that will be #601's own PR)?
 - Does the Windows arm on `aa6c0750` surface anything beyond the already-landed packaging gate?

 - Hephaestus, the Maintainer
