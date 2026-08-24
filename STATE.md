# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~22:32Z, maintainer run 32785113334 issue_comment on #131 - quiet stand-down, freeze-gated park unchanged)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -9.1 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER DECISION POINT (RESOLVED 2026-08-24T19:39Z, RE-SURFACED 2026-08-24T22:08Z, RE-AFFIRMED 2026-08-24T22:20Z):** D4 stretch COMPLETE with every lever closed by measurement (D4a rejected +0.28, D4b rejected -0.69 vs -0.90, D4c adopted -1.65 at e1, D4 item4 skipped). Review APPROVE (22:12Z) + Tester PASS (22:20Z, 87/87, all rails PASS) at head b037578 confirm code quality, but dual-unit M2/M3 still FAIL honestly. Re-scope endgame clause FIRES: owner decides MANIAC-grade machinery vs honest closure at achieved level. No further build phases charted without new direction.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Anomaly on record:** #133 and #136 merged fine via the same bot path earlier (01:40:58Z / 16:28:44Z). Enforcement differs now or differed then; do not assume either way.
- **PR #142 MERGED 19:53:30Z as docs-only successor** (AGENTS.md:62 + LAB.md:73 PAT merge path, no workflow files touched) via `gh pr merge --rebase` at 6d778a9 -> 526daae. Verifies compliant path: docs-only mergeable via App token, workflow-file PRs require owner click or PAT-backed merge step.
- **Two compliant unblock paths for #139:** owner one-click merge, OR lab-built hardcoded PAT-backed merge step in maintainer.yml.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `5bc4b9d55f727d2e5f186d6bbb100f0fb002c23c`** (19:59:42Z "fix: update maintainer schedule to every 2 hours", parent `526daae`). AGENTS.md:62 + LAB.md:73 live on main. Pages `32783042395` success 22:06:54Z on PR head `b037578` (pr-trigger success 32783042313); recover sweep `32785117964` cancelled/quiet at 22:32Z; next sweep green/quiet.
- **Model watch:** openrouter/stealth/ox-alpha active; Review 32783208371 + Tester 32783509462 both completed cleanly 22:12Z/22:20Z on same pin, proving window clear after earlier 19:41-19:43Z burst.

## IN FLIGHT
- **PR #131** - OPEN MERGEABLE head `b0375786ce82251106119336b7f183c431d33237` (`opencode/issue130-20260823163248`, ahead 66 / behind 0 vs main 5bc4b9d, merge_base `5bc4b9d` shared after 20:30Z rebuild). D-series COMPLETE: D4a zero-run REJECTED (+0.28 pct aggregate 4/4 worse), D4b extended mixer REJECTED (-0.69 vs -0.90 D2-best), D4c color rotations ADOPTED (CR-fmt PASS loco -4.36 pct aggregate v2, independent cross-check 4/4, 22 wins / 2 ties / zero regressions at e1/e3/e7). Fresh corpus truth 24/24 pins verified: e1 10.1210/3.3737 (-1.65 pct bytes vs pre-D4c), e3=e7 10.1350/3.3783 (-1.47). 87/87 gtests, fuzz clean, all rails PASS. Tracker Status in_progress with D-series exhausted and OWNER DECISION POINT SURFACED (re-scope section 1). Review APPROVED 22:12:17Z + Tester PASS 22:20:27Z (run 32783509462 success 8m12s) at same head. No builds in progress. Last owner pings 22:32:04Z/11Z triaged as duplicate maintainer triggers, no new state.
- **PR #139** - OPEN MERGEABLE head `a4994c6cc6e30725bde824156dbd889aa77ce673` (`opencode/lab-137-session-death-resilience`). Review APPROVED 18:27Z + Tester approve-test PASS 18:35Z, `Closes #137/#138` verified. Blocked on App-token `workflows` scope - awaiting owner click or explicit lab PAT-step dispatch. 2 behind main (5bc4b9d).

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ re-scope 2026-08-24) -> build C0-C5 + D0-D4 COMPLETE (C0/C1/C3 landed, C2/C2b/C4/C5 rejected, D0 harness built, D1/D2 rejected, D3 checkpoint byte-identical, D4a/b rejected, D4c ADOPTED, D4 item4 skipped) -> REVIEW 22:12Z APPROVE at b037578 -> TEST 22:20Z PASS at b037578 (87/87, all rails PASS, byte-identical reproduction) -> OWNER DECISION POINT RE-SURFACED per endgame clause (MANIAC vs honest closure) -> freeze blocks merge regardless until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: stand down unless owner rules on surfaced decision point. Review + Test already green at b037578; freeze blocks merge until dual-unit M2 AND M3 pass. If owner says MANIAC: Architect evaluates meta-adaptive tree next (C2/C2b negatives constrain expectations, I7 harness discipline). If honest closure: hold for freeze lift or explicit closure acceptance. No Builder dispatches until ruled.
2. #139: NO bot merge retries. Act only on explicit owner instruction. If merged, verify workflow contents, CLOSE #137 AND #138 MANUALLY, dispatch pages.
3. No further Builder dispatches on #131 until owner/Mae rule on the surfaced decision point; D4 item4 remains shut (no adopted mixer), D-series has no remaining levers.
4. Freeze stands until dual-unit M2 AND M3 pass on real cjxl output - no parity claims until then.
5. Watch #134 hold (draft) while owner decides; zero action.

## ISSUES
- **#130** - sole workstream (Prism); carried by PR #131; D-series exhausted, owner decision point surfaced at b037578, review+test green, freeze-gated.
- **#137 + #138** - open; close manually the moment #139 lands on main.
- **#141** - CLOSED 19:34:13Z (invalid workflows premise, owner STOP honored).
- **#139/#142** - infra tracks (139 blocked, 142 merged).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will owner rule MANIAC vs honest closure now that D-series is exhausted 16.9 percent from parity and both quality gates are green?
- Will #139 be unblocked via owner click or lab PAT step?
- Does stealth/ox-alpha remain stable after D4c+review+test clean sweep (falsification watch)?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes.

- Mae, the Maintainer
