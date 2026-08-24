# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~19:20Z, maintainer run 32766064751, woken by the owner's ping on PR #140). Merge-capability lane reshuffled mid-window: #140 closed by the owner, work resurrected as #141 with the linkage fix; review gate live; zero triggers fired this run.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** brainstorm frozen; NO Ideator dispatches; NO new projects. Prism is the sole priority until M2 AND M3 genuinely pass dual-unit gates on real cjxl output. Infra reliability fixes are exempt.
- **BINDING TARGETS (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885. Corpus truth re-verified by round 4: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 (~19 pct above parity at e1; net -6.7 pct bytes vs e7 baseline 11.026/3.675). Every claim cites fresh reproducible measurement in BOTH units.
- **#134 HOLD** stands (draft `c6adb5a6d4`, "wait for my action"); largely superseded by the 601caaa2 model switch; owner decides disposition.
- **OWNER DECISION POINT (open, on #131/#130):** D4 stretch (levers <= 1-3 pct each vs M3 gap -15.9 pct) VS honest closure of #130 at net -6.7 pct with six directions measured shut. Executes only on the owner's word.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `601caaa256c6`** (unchanged this window; all agent models on openrouter/stealth/ox-alpha). Pages green.
- **MERGE-CAPABILITY LANE (top priority).** Root cause verified: no workflow on main declares `workflows: write`; GitHub refuses all App-token merges/pushes touching `.github/workflows/*` (live refusals: predecessor merge attempt on approved+tested #139 ~18:46Z; lab session push rejection pasted 19:02:27Z; originally flagged in #120; first fix died unmerged with #119).
  - **#141 OPEN** (`opencode/issue70-20260824184700`, head `2a6e7c14a`, non-draft, MERGEABLE): three commits - grant `66f1d95`, docs `d00186c`, relink `2a6e7c1` (removes the reviewer's blocking finding from #140: body must not auto-close the permanent lab-health board). Body is the continuation stub `Closes #140`: harmless (keywords resolve vs issues only; #140 already closed). Review round LIVE on `2a6e7c14a` (owner-fired 19:10:13Z, run 32766605885) at survey end.
  - **#140 CLOSED by owner 19:09:16Z** - superseded by #141, no work lost (same branch).
  - **CHICKEN-AND-EGG (hard fact):** until #141 lands, NO bot token can merge infra PRs (maintainer.yml@main scope absence verified via contents API this run). #141 itself needs the OWNER's manual merge click once green. Bot merges of infra PRs pre-landing are a DISQUALIFIED strategy (two refusals).
- **#139**: approved (round 3) + Tester PASS (18:35:27Z) + MERGEABLE at `a4994c6cc6`; newest comment 18:48:26Z (an error notice, not a finding). Blocked solely on scope. Post-landing: I merge `--rebase --delete-branch` after orphan check, CLOSE #137 AND #138 MANUALLY, verify-and-dispatch pages.
- **Model watch:** four dead sessions tonight (17:40:45 endpoint-unavailable; 18:09-18:24 burst x3; 18:59:52 rate limit killed a maintainer session). Every chain self-healed via crash-parity/auto-retry. Day-1 falsification data logged; escalate to lab discussion only if bursts recur.

## IN FLIGHT
- **#141 review gate** - live at survey end; verdict due any minute.
- **131-thread Lab Engineer session** (owner-fired 19:05:55Z) still in_progress - owns that thread; read its delivery next run.
- NOTHING else repo-wide.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-4 DONE (round 4 CLEAN: fold independently re-derived incl. 12.61-11.48=1.13 and 12.98-11.51=1.47, canonical pair at all seven sites, F2 documented, 80/80 gtests, gates fail-capable both units; one non-blocking progress-file nit deferred) -> OWNER DECISION POINT -> freeze blocks any project merge regardless.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (a) #141: read the review verdict (FULL timeline + job log). Findings => route lab (infra guard; NEVER fix/continue). Approved => confirm Tester engaged; at approve-test check whether the OWNER merged (#141 state + main vs `601caaa2`). Green-but-unmerged => ping for the manual click; do NOT bot-merge before the scope lands.
2. FIRST ACTION (b) once #141 IS merged: grep `workflows: write` live at ref=main across the four workflows; merge #139 `--rebase --delete-branch` after merge-base orphan check vs `a4994c6cc6`; verify main advances past `601caaa2`; CLOSE #137 AND #138 MANUALLY; verify-and-dispatch pages on the new sha.
3. #131: read the lab session's delivery; if the owner ruled D4-vs-closure, execute it immediately; else keep parked (round 4 clean; no continue into a parked clean build).
4. Watch: queued twin maintainer 32766316022 stands down against this STATE; action_required pages deploys (19:10:14Z) get swept by the next approval pass.
5. Model falsification watch day 2: compare burst shape/count vs today's four deaths.
6. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Say the numbers every time.

## ISSUES
- **#130 Prism** sole workstream (carried by #131), parked at the owner decision point.
- **#137 + #138** open awaiting #139 merge; I close them manually post-merge.
- **#70 (Lab Health)** PERMANENT pinned board - never let any PR body auto-close it (the hazard #140's finding removed; relinked in #141).
- **#42 Brainstorm Board** frozen by owner directive.

## OPEN QUESTIONS
- Will the owner click merge on #141 when green?
- Owner ruling pending: D4 stretch vs honest closure of #130?
- What does the still-running 131-thread lab session deliver?
- Does stealth/ox-alpha stay bursty under day-2 watch?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline (watch pagination traps: page 1 served stale tails today; page 2 held the verdict) before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone.
- Closing keywords resolve against ISSUES only - check every PR body's linkage; quote-stubs like `Closes <closedPR>` are harmless but note them.
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a change as live until contents-API/grep confirms it at ref=main.
- Never fire into healthy automatic chains; duplicate pings resolve via stand-downs; ephemeral numbers are not evidence.
- A strategy that failed once is disqualified until its root cause is fixed (bot merges of infra PRs: disqualified until #141 lands).

- Mae, the Maintainer
