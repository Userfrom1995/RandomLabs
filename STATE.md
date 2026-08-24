# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~19:40Z, maintainer run 32767208852, owner ping on #131 + owner STOP directive on #141). Merge-capability truth established with hard evidence; #141 closed; #139 blocked on the only two compliant paths; #131 parked at owner decision point.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1; net -6.7 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER DECISION POINT (open, UNRULED as of this run - issue #130 silent since 08-23):** D4 stretch VS honest closure of #130 at achieved level. Executes only on the owner's word.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. VERIFIED THIS RUN: owner right, see MERGE CAPABILITY section.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence this run - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Anomaly on record:** #133 and #136 merged fine via the same bot path earlier today (01:40:58Z / 16:28:44Z). Enforcement differs now or differed then; do not assume either way - test nothing blindly.
- **PR #141 CLOSED by me** (invalid premise, owner stop honored); its diff never reached main. Reviewer's metadata finding there is moot with closure.
- **Two compliant unblock paths for #139:** owner one-click merge, OR lab-built hardcoded PAT-backed merge step in maintainer.yml (PAT only ever in hardcoded steps). Ping with exactly this posted on #139 this run.
- **Do NOT retry the refused merge path from any future run.**

## CRITICAL INFRASTRUCTURE STATE
- **`main` = moving under DIRECT OWNER EDITS** (~`630dce19bf`, 19:30Z era: "fix: update model assignments for all agents", author/committer Userfrom1995; earlier `9cd1641184`/`7422c5fdee` same series). Pages green after each push (3 successes 19:28-19:30Z). DO NOT dispatch lab to edit workflows while the owner works on them - collision risk. Re-survey main tip next run before any base-relative claim.
- **Model watch:** stealth/ox-alpha rate-limit bursts continue tonight (deaths 18:14Z, 18:24Z, 18:48Z, 18:59Z, 19:18Z, 19:20Z across maintainer/lab sessions). All crash-parity/retry chains self-healed so far; owner is personally iterating model assignments on main - falsification watch may be resolved by the owner directly. No lab dispatch while that is live.
- **Sibling maintainer runs:** owner ping batches spawned several overlapping instances (32767385734 died rate-limit, 32767563081 completed, 32768632901 in progress behind me). Any successor: read this file, stand down unless executing the playbook's first actions.

## IN FLIGHT
- NOTHING repo-wide needs firing. No build/review/test/lab active as of ~19:35Z survey. #139 merge awaits owner click or their word for the PAT-step route. #131 awaits owner ruling.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-4 DONE (round 4: zero new findings, one non-blocking stale-status nit to fold on next doc touch) -> OWNER DECISION POINT -> freeze blocks any merge regardless.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: re-survey main tip (owner was editing directly) and check whether #139 got merged. If merged: verify main advance and contents of lab.yml/maintainer.yml/opencode-recover.yml/opencode.yml on main, CLOSE #137 AND #138 MANUALLY, verify-and-dispatch pages on the new sha. If still open: NO retry of bot merge; act only on explicit owner instruction (click done vs dispatch-lab-for-PAT-step).
2. #131: check issue #130 and PR thread for the owner's D4-vs-closure ruling. D4 => decision {"action":"continue","pr":131} with stretch scope noted. Closure => prepare honest-close flow within freeze rules. No ruling => stand down; fold the round-4 nit only on the next doc touch (reviewer said no dedicated round).
3. Do not touch workflows/infra while the owner's direct main edits are recent (<24h) without an explicit task.
4. Model watch: if bursts keep killing chains AFTER the owner's assignment changes settle, evaluate with run IDs; otherwise leave the pin alone.
5. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Lab PRs merge freely once approved+tested - EXCEPT workflow-touching ones, which need the owner click or the PAT-step route (see MERGE CAPABILITY).

## ISSUES
- **#130** - sole active workstream (Prism); carried by PR #131; parked at owner decision point.
- **#137 + #138** - open; close manually the moment #139 lands on main.
- **#70 (Lab Health)** - universal audit log; #141 lineage recorded there via closure comment.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will the owner click merge on #139, or order the lab-built PAT merge step?
- Will the owner rule D4 stretch vs honest closure on #130?
- Did the owner's direct main edits finish, and what is the settled main tip?
- Does stealth/ox-alpha stabilize after the owner's model-assignment changes?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- NEW (this run): permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes; when the owner edits infra directly, hands off until asked.

- Mae, the Maintainer
