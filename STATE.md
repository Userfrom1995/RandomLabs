# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~19:35Z, maintainer run 32769001197, owner ping on #131; D4 continuation dispatched, #139 blocked on permission model, lab for #140 in progress).

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1; net -6.7 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER DECISION POINT (open, UNRULED as of this run - issue #130 silent since 08-23):** D4 stretch VS honest closure of #130 at achieved level. D4 dispatched as the continue path per review round 4; formal stop-and-decide returns after D4 exhaustion. Owner override to close now would be executed same-day.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. VERIFIED: owner right - workflows is NOT a GITHUB_TOKEN scope, PR #141 closed, record intact.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no workflows. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Anomaly on record:** #133 and #136 merged fine via the same bot path earlier today (01:40:58Z / 16:28:44Z). Enforcement differs now or differed then; do not assume either way - test nothing blindly.
- **PR #141 CLOSED** as invalid premise, owner stop honored; its diff never reached main.
- **Two compliant unblock paths for #139:** owner one-click merge, OR lab-built hardcoded PAT-backed merge step in maintainer.yml (PAT only ever in hardcoded steps). Do NOT retry the refused merge path from any future run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `630dce19bf86268650f73bad2083fdd0fc262bac`** (owner direct pushes 19:28-19:30Z: "fix: update model assignments for all agents" etc., author Userfrom1995). Pages green after each push (success 19:28-19:30Z). Compare with PR #131: merge_base `601caaa256c6cb39fa65b79f63c069c11d2e4455`, status diverged, ahead 58 behind 1 - shared history confirmed, orphan check passes server-side.
- **Model watch:** stealth/ox-alpha rate-limit bursts earlier (18:14Z, 18:24Z, 18:48Z, 18:59Z, 19:18Z) self-healed via crash-parity guards; this session runs clean on same pin. Owner is iterating model assignments directly on main - do not dispatch lab to edit workflows while owner works on them.
- **Lab Engineer in_progress:** run 32768986113 for Infra Lab update for #140 (since 19:35:01Z, head main). Left untouched.
- **Sibling runs:** this maintainer run 32769001197 in_progress; prior run 32767208852 closed #141; no queued duplicate maintainer behind me at survey.

## IN FLIGHT
- **PR #131 continuation DISPATCHED this run** - Builder resumes D4 stretch (zero-run mode first, honest mixer-bank test, color rotations). Review round 4 verdict was continue, so build owns the pipeline until the post-D4 boundary where automatic review fires.
- **PR #139 parked BLOCKED** - fully approved+tested but awaiting owner click or owner-ordered lab PAT step.
- **Lab run 32768986113 active** - owns its infra phase; no interference.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-4 DONE (round 4: zero new findings at head c10598fe657, continue handoff) -> D4 STRETCH DISPATCHED -> review next boundary -> owner formal stop-and-decide -> freeze blocks any merge regardless until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read the D4 continuation outcome on #131. Clean handoff => automatic review takes the post-D4 boundary (manual fire ONLY if demonstrably failed; guard self-heals within 3 retries). Death => error-class inspection BEFORE any retry; one same-error retry max, then lab with run-ID chain.
2. #139: check whether owner clicked merge or ordered lab PAT step. If merged: verify main advanced past 630dce19bf, verify lab.yml/maintainer.yml/opencode-recover.yml/opencode.yml on main, CLOSE #137 AND #138 manually if still open, dispatch pages if silent. If still open: do NOT retry App-token merge.
3. #140 lab run: read its outcome; if landed verify pages and close linked issue per Closes keyword.
4. Re-survey main tip before any base-relative claim (owner direct edits still recent).
5. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Lab PRs merge freely once approved+tested - EXCEPT workflow-touching ones, which need owner click or PAT-step route.

## ISSUES
- **#130** - sole active workstream (Prism); carried by PR #131; D4 stretch dispatched.
- **#139** - infra PR for #137 + #138 (terminal sweep + crash-parity + lab metadata); fully gated, merge BLOCKED on permission model.
- **#137 + #138** - open; close manually the moment #139 lands on main.
- **#70 (Lab Health)** - universal audit log; #141 lineage recorded there via closure.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will the owner click merge on #139, or order the lab-built PAT merge step?
- Will the owner rule D4 stretch vs honest closure on #130 after D4 results?
- Did the owner's direct main edits settle at 630dce19bf?
- Will the D4 stretch produce any delta vs the -15.9 percent M3 gap, or close the file as the honest-closure path anticipates?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes; when the owner edits infra directly, hands off until asked.

- Mae, the Maintainer
