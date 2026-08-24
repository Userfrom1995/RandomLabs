# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~19:46Z, maintainer run 32770105093 duplicate of 19:46:24Z stand-down; survey at 19:46Z Tester still in_progress at 6d778a9). PR #142 head 6d778a9 APPROVED routing to Tester in flight; D4 live on #131 CONFLICTING; #139 blocked awaiting owner.

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
- **PR #141 CLOSED** (invalid premise, owner stop honored); its diff never reached main. PR #142 is now the docs-only successor (+1 line AGENTS.md/LAB.md describing PAT merge path, no workflow files touched) - it IS mergeable via normal bot token once gated. Do NOT retry the refused App-token merge path on any workflow-touching PR.
- **Two compliant unblock paths for #139:** owner one-click merge, OR lab-built hardcoded PAT-backed merge step in maintainer.yml (PAT only ever in hardcoded steps). Ping with exactly this posted on #139.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `630dce19bf86268650f73bad2083fdd0fc262bac`** (19:30Z era owner direct model-assignment series "fix: update model assignments for all agents"). Pages green (workflow_dispatch success 19:46:40Z; action_required pairs for 6d778a9 at 19:44:15Z pending sweep, normal). Do NOT dispatch lab to edit workflows while the owner works on them - collision risk. Re-survey main tip next run before any base-relative claim.
- **Model watch:** openrouter/stealth/ox-alpha active; transient burst 19:18-19:22Z self-healed; review 19:43 + lab 19:44 + review 19:45 chain completed clean end-to-end on same pin. No model switch needed; two-knob rule (opencode.json small_model) remains if ever retried.

## IN FLIGHT
- **PR #142** - OPEN MERGEABLE head `6d778a9b0fa078ddc6303d6a4f71328849b573d3` (branch `opencode/issue70-20260824184700`, base `630dce19bf`). Prior head `20fa0afec9bb9f3f9326405022e9e09050f6c466` dispatched to Reviewer at 19:41:45Z. Review round 1 (19:43:16Z) routed `lab` for Finding 1 (`Closes #141` PR not issue). Lab Engineer landed fix at 19:44:09Z: `6d778a9` + body `Continues #141 / Fixes #120 / Refs #70` (verified: #141 pull_request closed, #120 closed issue, #70 open board). Review round 2 at 6d778a9 APPROVED 19:45:00Z (14 checks pass, PAT merge path correct, no `workflows: write`) routing to Tester via `{"action":"test"}`; owner `/oc test` 19:45:04Z. Tester run 32769959953 `test` job IN_PROGRESS since 19:45:12Z at 19:46Z survey (status in_progress, no conclusion). Next maintainer run merges on `approve-test` with fresh orphan check (expected PASS: merge-base 630dce19bf, 2 ahead). Held pr-trigger + pages pairs for 6d778a9 `action_required` await PAT sweep - normal.
- **PR #139** - OPEN MERGEABLE head `a4994c6cc6e30725bde824156dbd889aa77ce673` (`opencode/lab-137-session-death-resilience`). Review APPROVED 18:27Z + Tester approve-test PASS 18:35Z, metadata `Closes #137/#138` verified. Blocked on App-token `workflows` scope - awaiting owner click or explicit lab PAT-step dispatch. NO retries on refused path.
- **PR #131** - OPEN but now CONFLICTING (dirty) head `cb639e2bbedfad94da99714183e1f6c364f3a705` (`opencode/issue130-20260823163248`, researcher Prism gap analysis + D1). D4 continuation opencode run 32769810484 in_progress at survey (title "researcher: Prism gap analysis..."), but branch dirty requires rebase onto 630dce1 before any review/merge. Parked at OWNER DECISION POINT regardless of D4 outcome; freeze blocks any merge; next review automatic at phase boundary.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-4 DONE (round 4: zero new findings) -> OWNER DECISION POINT -> D4 continuation live -> freeze blocks any merge regardless.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read Tester verdict on #142 (run 32769959953 - COMMENT plus JOB LOG). `approve-test` => MERGE PR #142 `--rebase --delete-branch` (docs-only, bot-merge allowed), verify main advance past 630dce19bf via commits API, verify-and-dispatch pages if silent, close nothing (non-closing keywords; Fixes #120 is audit trail). `fix` findings => route to `lab` (infra guard: never fix/continue on infra PR). Tester death => error-class inspection (one same-error retry max, then lab with run IDs).
2. Read D4 continuation outcome on #131 - clean completion => automatic review at phase boundary; conflict state => require rebase onto main before any review/merge; same-error death => one retry max then lab escalation with run IDs.
3. #139: NO bot merge retries. Act only on explicit owner instruction (click vs lab PAT step). If merged, verify main contents, CLOSE #137 AND #138 MANUALLY, verify-and-dispatch pages on new sha.
4. Watch issue #130 for D4-vs-closure ruling; execute immediately if it lands, otherwise keep #131 parked.
5. Do not touch workflows/infra while owner's direct main edits are recent (<24h) without explicit task. Model watch continues.
6. Freeze stands until dual-unit M2 AND M3 pass on real cjxl output - no parity claims until then.

## ISSUES
- **#130** - sole active workstream (Prism); carried by PR #131; parked at owner decision point; silent since 08-23.
- **#137 + #138** - open; close manually the moment #139 lands on main.
- **#141** - CLOSED 19:34:13Z (invalid workflows premise, owner STOP honored; lineage preserved via #142 continuation on same branch, now corrected to non-closing refs).
- **#70 (Lab Health)** - universal audit log; #141 closure recorded there.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will Tester approve PR #142 at 6d778a9, or surface a new finding?
- Will the owner click merge on #139, or order the lab-built PAT merge step for workflow-file PRs?
- Will the owner rule D4 stretch vs honest closure on #130?
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
