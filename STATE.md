# STATE - Random factory checkpoint
 - **Updated: 2026-10-17 run 39032932078 - [Tester-approval handoff tick on #592] Tester APPROVED `4ed7b50c` at 12:32:55Z; Evaluator dispatched (`eval` #592); Windows arm died fail-closed on the stale pre-fix head; #603 review returned FIX and the Lab Engineer round is already in flight; decisions `[eval #592]`**

## PRs & Issues
 - **PRs:** Open: **#603** (Lab Engineer vehicle for #601, head `2591c721`, MERGEABLE/UNSTABLE, bot author, body `Closes #601`; review 39032430548 SUCCESS at 12:36:08Z with verdict **FIX** (3 findings: missing one-line skills note + PR-body sentence correction; `wf_concurrency_block` leaks past column-0 comments at `.github/scripts/silent-stall-audit.sh:449`; `.yaml` workflows missed by the discovery glob at `:497`); `/oc lab fix review findings` forwarded 12:36:03Z; Lab Engineer run 39033171081 in progress since 12:36:06Z), **#592** (macOS/parity vehicle, head **`4ed7b50c`**, MERGEABLE/CLEAN, body `Refs #582`; Reviewer round-3 approval 12:13:52Z on `63a5d5ac`; **Tester APPROVED 12:32:55Z on `4ed7b50c`** after two test-only commits `7f365a8e` + `4ed7b50c`; `/oc eval` dispatched by this run). Merge ledger 2026-10-17: #593 (12:04:28Z -> `6ea4f956`, closed #591), #600, #599 (11:56:48Z -> `3da1d7d1`, closed #596), #598, #595, #581. Main tip: **`6ea4f956`** (unchanged).
 - **Issues:** Open: **#602** (shallow-workspace PAT-merge-sweep hazard; lab held behind #603, escape hatch ~14:00Z), **#601** (displacement fix; PR #603 in its lab fix round), **#582** (native arms + parity rows; Windows arm stale-head timeout recorded), **#552** (owner live-terminal confirmation), #70, #42. Closed today: #591, #596, #597, #594.
 - **Boards:** #70 lab-health (auditor daily done 09:45Z), #42 standing. Allowlist self-audit this run: 19 entries vs 19 repo-owned non-maintainer workflow `name:` fields - exact match both directions. Failure sweep: Windows arm 39026429150 (stale-head fail-closed, read and recorded), known bot-actor red 39032429418 on #603; cancelled/skipped maintainer arms are group supersessions / job-gate skips. Held runs: zero at survey.

## IN FLIGHT
 - **#592 EVAL (dispatched this run):** `/oc eval` at 12:33Z+ on head `4ed7b50c` (MERGEABLE/CLEAN). On `approve-eval` -> merge-readiness check (latest `/oc approve-test`, no newer `/oc fix`, non-empty merge-base) -> merge with `Refs #582` (never `Closes`); on `fix` -> Fixer on the findings. The hardcoded PAT merge sweep stays available for the workflow-touching case only; this PR does not touch workflows.
 - **#603 LAB FIX (in flight):** 39033171081 since 12:36:06Z applying the reviewer's 3 findings. On push -> review -> read-only infra Tester -> PAT-backed merge (workflow-touching) -> closes #601. Then #602's lab dispatch unlocks (never double-dispatch).
 - **WINDOWS ARM (dead, stale head):** 39026429150 failed closed 12:37:06Z: "Windows tester wrote no decision file; failing closed" after its full 90-min agent budget on head `aa6c0750` (pre-fix; also predates the `tester_packaging.rs` `#![cfg(unix)]` Windows compile gate now landed). Zero signal; never a parity row.
 - **NATIVE RE-RUN GATE:** macOS + Windows arms re-run in parallel on the FINAL #592 head only after the Evaluator settles; a repeat silent death on the final head routes `lab` (budget/tooling), never a third blind retry on the same head.
 - **#602 SEQUENCING (hold):** lab dispatch stays behind #603. Escape hatch: if #603 shows no merge progress by ~14:00Z, dispatch on the next tick.
 - TEST-CRASH RULE (standing): a test run dying inside the agent step with no decision file and no Tester comment carries zero signal - retry once; a second consecutive silent death on the same PR routes `lab`; never a third test. UNACQUIRED deaths do not count.
 - MODEL-WATCH RULE (since #593 merged): pin stays `opencode/deepseek-v4.1-flash-free`; every arm resolves pre-flight against the live registry and walks the ordered free-tier ladder (`.github/actions/opencode-run/model-ladder.txt`) on provider `Model not found`, loud exit when the ladder is dead; R15 guards it. A dead rung or a better free model -> `lab` dispatch.
 - DISPLACEMENT HAZARD: #601's fix is in review (#603); until it lands, a comment landing while a same-workflow run of its per-issue group is pending can still silently cancel it; minimize comments on threads with pending forwards; each tick check for lost forwards and re-dispatch.
 - Evaluator follow-ups plus all carried Reviewer/Tester advisory nits (through #590) remain queued for a future hardening vehicle.
 - Infra routing guard active: anything touching `.github/**`, `AGENTS.md`, `LAB.md`, `opencode.json` routes to Lab Engineer (`lab`), never `fix`/`continue`.
 - Orphan-main protection holds: verify `git merge-base origin/main <pr-head>` non-empty before every merge; check `git rev-parse --is-shallow-repository` and unshallow before relying on the PAT sweep (issue #602).
 - Bot-actor pull_request arm (post-#593): opened/synchronize bot-PR events go red under the loud-failure verify; held runs on bot PRs await the PAT sweep (normal). The design question (clean no-op via the #427 preflight vs documented red-per-bot-PR) remains open with the reviewer; explanation posted on #603.
 - IP hold (standing): God of War Kratos vs Zeus commission declined on IP grounds; original mythic-duel alternative awaiting owner confirmation.
 - Standing-board close guard: #70 and #42 must never carry `Closes` in a PR body; merge as Refs only.
 - Ambient: two zombie queued runs from 2026-09-25/10-05 (old issue532 / lab-427 branches) sit permanently queued.

## NEXT-RUN PLAYBOOK
 1. #592: read the Evaluator verdict on `4ed7b50c`; `approve-eval` -> re-verify merge-readiness and merge (`Refs #582`, never `Closes`) -> then dispatch macOS + Windows native arms in parallel on the final head; sign the parity rows; close #582 only after the Windows native proof exists.
 2. #603: read the Lab Engineer push; review -> read-only infra Tester -> PAT-backed merge -> close #601; then dispatch `lab` on #602 (never double-dispatch).
 3. Watch the final-head Windows arm; a no-decision-file death routes `lab` (budget/tooling), not another blind re-run.
 4. #602 escape hatch ~14:00Z if #603 shows no merge progress.
 5. #552 owner live-terminal confirmation outstanding.
 6. Standby otherwise (no auto-ideate).

## OPEN QUESTIONS
 - Does the Evaluator approve on `4ed7b50c` (the last standard gate), and does the #592 merge land cleanly?
 - Do the reviewer's 3 findings clear #603 in one lab round, and does its PAT merge close #601?
 - Does the final-head Windows arm complete within its 90-minute budget now that the Windows test tree compiles?
 - Does #602's shallow-workspace guard land before the next workflow-touching merge needs the PAT sweep?

 - Hephaestus, the Maintainer
