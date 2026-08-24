# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~19:53Z, maintainer run 32770449238 - merged PR #142 at 6d778a9 -> main 526daae; Tester approve-test 19:50:15Z). PR #142 CLOSED/MERGED; #139 blocked awaiting owner; #131 CONFLICTING parked.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1; net -6.7 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER DECISION POINT (open, UNRULED as of this run - issue #130 silent since 08-23):** D4 stretch VS honest closure of #130 at achieved level. Executes only on the owner's word.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z after verification; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes (App/PAT only) - grant never landed on main.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Anomaly on record:** #133 and #136 merged fine via the same bot path earlier today (01:40:58Z / 16:28:44Z). Enforcement differs now or differed then; do not assume either way - test nothing blindly.
- **PR #141 CLOSED** (invalid premise, owner stop honored); its diff never reached main. PR #142 MERGED 19:53:30Z as docs-only successor (AGENTS.md:62 + LAB.md:73 describing PAT merge path, no workflow files touched) via normal bot token (`gh pr merge --rebase` at 6d778a9 -> 526daaef9bef6efd152026326858800a39612130). Verifies compliant path: docs-only mergeable via App token, workflow-file PRs require owner click or PAT-backed merge step.
- **Two compliant unblock paths for #139:** owner one-click merge, OR lab-built hardcoded PAT-backed merge step in maintainer.yml (PAT only ever in hardcoded steps). Ping with exactly this posted on #139.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `526daaef9bef6efd152026326858800a39612130`** (19:53:30Z merge of PR #142 "lab: remove invalid workflows permission and document PAT merge path (Fixes #120)"; parent `630dce19bf86268650f73bad2083fdd0fc262bac`). AGENTS.md:62 + LAB.md:73 now live on main (PAT merge path, no `workflows: write` claim, validated via `gh api .../contents/AGENTS.md?ref=main`). Pages dispatch `32770792126` fired manually (merge-token pushes do not auto-trigger workflows) - verify green next run. Do NOT dispatch lab to edit workflows while the owner works on them - collision risk.
- **Model watch:** openrouter/stealth/ox-alpha active; transient burst 19:18-19:22Z self-healed; review 19:43 + lab 19:44 + review 19:45 + test 19:50 chain completed clean end-to-end on same pin. No model switch needed; two-knob rule (opencode.json small_model) remains if ever retried.

## IN FLIGHT
- **PR #142** - CLOSED/MERGED at `6d778a9b0fa078ddc6303d6a4f71328849b573d3` -> `526daae`. Review APPROVED 19:45:00Z (14 checks, PAT merge path correct) + Tester approve-test PASS 19:50:15Z (run 32769959953 success: site spin-up, docs correctness, YAML integrity, least-privilege, hygiene). Merge-base `630dce19bf` verified shared (no orphan), 2 ahead clean. Branch `opencode/issue70-20260824184700` deleted server-side. Body `Continues #141 / Fixes #120 / Refs #70` preserved lineage without closing PR #141 or board #70; Fixes #120 is closed-issue audit trail only - no issues auto-closed by merge.
- **PR #139** - OPEN MERGEABLE head `a4994c6cc6e30725bde824156dbd889aa77ce673` (`opencode/lab-137-session-death-resilience`). Review APPROVED 18:27Z + Tester approve-test PASS 18:35Z, metadata `Closes #137/#138` verified. Blocked on App-token `workflows` scope - awaiting owner click or explicit lab PAT-step dispatch. NO retries on refused path. Note: now 3 behind main (630dce1->526daae adds 2 commits); rebase may be needed before merge but do NOT auto-rebase without owner order.
- **PR #131** - OPEN but CONFLICTING head `cb639e2bbedfad94da99714183e1f6c364f3a705` (`opencode/issue130-20260823163248`, researcher Prism gap analysis + D1). D4 continuation opencode run 32769810484 state unknown at this merge time (last seen in_progress 19:46Z) - read fresh next run. Branch requires rebase onto new main `526daae` before any review/merge. Parked at OWNER DECISION POINT regardless of D4 outcome; freeze blocks any merge; next review automatic at phase boundary.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-4 DONE (round 4: zero new findings) -> OWNER DECISION POINT -> D4 continuation live (re-read outcome next run) -> freeze blocks any merge regardless -> PR #142 infra docs track CLOSED.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: verify pages dispatch `32770792126` green (Deploy static site to GitHub Pages on 526daae); if failed/cancelled, re-dispatch `gh workflow run pages.yml --ref main` and log. Confirm AGENTS.md:62/LAB.md:73 live on main via contents API (already verified this run).
2. Read D4 continuation outcome on #131 (run 32769810484 - COMMENT plus JOB LOG) - clean completion => automatic review at phase boundary after rebase onto 526daae; conflict state => require rebase; same-error death => one retry max then lab escalation with run IDs.
3. #139: NO bot merge retries. Act only on explicit owner instruction (click vs lab PAT step). If merged, verify main contents (workflow files), CLOSE #137 AND #138 MANUALLY, verify-and-dispatch pages on new sha. Check if rebase onto 526daae needed (now behind).
4. Watch issue #130 for D4-vs-closure ruling; execute immediately if it lands, otherwise keep #131 parked.
5. Do not touch workflows/infra while owner's direct main edits are recent (<24h) without explicit task. Model watch continues.
6. Freeze stands until dual-unit M2 AND M3 pass on real cjxl output - no parity claims until then.

## ISSUES
- **#130** - sole active workstream (Prism); carried by PR #131; parked at owner decision point; silent since 08-23.
- **#137 + #138** - open; close manually the moment #139 lands on main.
- **#141** - CLOSED 19:34:13Z (invalid workflows premise, owner STOP honored; lineage preserved via #142 merge 526daae, corrected to non-closing refs).
- **#120** - CLOSED; audit trail for PAT merge path, referenced via `Fixes #120` in merged 526daae (no auto-close at merge time as already closed).
- **#70 (Lab Health)** - universal audit log; #142 merge recorded there next audit cycle.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will pages dispatch 32770792126 succeed on new main 526daae, or need re-trigger?
- Will the owner click merge on #139, or order the lab-built PAT merge step for workflow-file PRs (now 3 behind main)?
- Will the owner rule D4 stretch vs honest closure on #130 (D4 run outcome pending)?
- Does stealth/ox-alpha remain stable after #142 lands, or do bursts recur needing lab resilience?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- NEW: permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes; when the owner edits infra directly, hands off until asked.

- Mae, the Maintainer
