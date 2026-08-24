# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~18:32Z, maintainer run 32761106008 retry, owner summary request on PR #131). Owner status report delivered; Builder continuation dispatched to fold round-3 docs findings F1-F2 on #131; #139 approved and Tester-owned.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt - they serve Prism.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth re-verified by D3: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1; net -6.7 percent bytes vs the e7 baseline (11.026 / 3.675).
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Re-verified draft this run. NOTE: its planned model switch landed directly on main at 18:07:37Z (commit `601caaa2`) - largely superseded; owner decides disposition.
- **OWNER DECISION POINT (open, surfaced in my 18:30Z report):** D4 stretch (mixer bank, zero-run, color rotations, squeeze re-test; levers <= 1-3 pct each vs M3 gap -15.9 pct; M3 likely stays open) VS honest closure of #130 at achieved level. Executes only on the owner's word.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `601caaa2`** (18:07:37Z lab commit: all agent models switched to `openrouter/stealth/ox-alpha` + OPENROUTER_API_KEY wiring + Random->RandomLabs rename). Pages green post-switch (18:22:25Z).
- **Model watch:** stealth/ox-alpha showed three rate-limit deaths 18:09-18:24Z (two review sessions on #139, two maintainer sessions incl. mine); every crash-parity/retry chain self-healed. No escalation while guards work.
- **PR #139 OPEN** (`opencode/lab-137-session-death-resilience`, head `a4994c6cc6`, MERGEABLE, non-draft): round-2 findings FIXED (metadata corrected - title + `Closes #137`/`Closes #138`; lab.yml title/body validation; recover approvals via shared sweep script), round-3 review APPROVED 18:27Z, Tester run 32762528559 IN PROGRESS since 18:27:29Z. Watch item: App-token push rejected for workflows permission on lab.yml at 18:22:08Z, content delivered via PAT path anyway.
- **PR #134:** draft `c6adb5a6d4`, hold intact.

## IN FLIGHT
- **#131 Builder continuation** (dispatched by me this run via decision.json): folds round-3 F1 (ceiling pair must derive consistently from CSV - pooled TOTAL gives 1.13/1.47; fix seven spots incl. decision record 09-30-00) + F2 (document non-additive IDEALTOTAL rows). Then re-parks at the OWNER DECISION POINT. Watch for its run to appear after dispatch.
- **#139 Tester** (run 32762528559): approve-test => maintainer dispatch => I merge next run.
- NOTHING else repo-wide.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-3 DONE (all findings folded or folding now) -> OWNER DECISION POINT (D4 stretch vs honest closure) -> freeze blocks any merge regardless.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (a) #131: verify F1-F2 fold in-tree (probe_backend.sh:38, rescope :36/:80-82/:150, architecture :152/:181, ideas :49/:110, record 09-30-00 - consistent pooled-method ceilings; IDEALTOTAL note present). Check for a new review verdict on the folded head if the automatic gate fires. If the owner has ruled on D4-vs-closure, execute immediately.
2. FIRST ACTION (b) #139: read the Tester verdict (paginate full timeline + job log). At approve-test: merge `--rebase --delete-branch` with fresh-object orphan check, verify main advances past `601caaa2`, CLOSE #137 AND #138 MANUALLY, verify-and-dispatch pages on the new sha.
3. Model falsification watch on stealth/ox-alpha begins: recurring daily bursts => lab discussion; no knee-jerk switch while guards self-heal.
4. If the App-token workflows-permission rejection recurs on infra PRs, escalate to lab with run IDs as a push-path defect.
5. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Lab PRs (#139 class) merge freely once approved+tested (shipping-limit exempt).

## ISSUES
- **#130** - sole active workstream (Prism); carried by PR #131; parked at the owner decision point.
- **#137 + #138** - open, awaiting #139 merge; I close them manually post-merge.
- **#70 (Lab Health)** - baseline-bug mandate complete (#136 live); universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will the owner rule on D4 stretch vs honest closure of #130?
- Does #139's Tester approve cleanly, and does main advance as expected on merge?
- Does the F1-F2 fold land without a fourth review round?
- How bursty does stealth/ox-alpha prove under the new pin?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging, and expect to close referenced issues manually when links are wrong.

- Mae, the Maintainer
