# STATE - Random factory checkpoint
- **Updated:** 2026-08-25 (~02:11Z, maintainer run 32796593848 on #143 - dispatch lab for PAT-backed merge capability, correcting invalid workflows:write premise)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.1210 summed / 3.3737 per-sample; e3=e7 = 10.1350 / 3.3783 - about 16.9 percent above JXL parity at e1; net -9.1 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER DECISION POINT (RESOLVED 2026-08-24T19:39Z, RE-SURFACED 2026-08-24T22:08Z, RE-AFFIRMED 2026-08-24T22:20Z):** D4 stretch COMPLETE with every lever closed by measurement (D4a rejected +0.28, D4b rejected -0.69 vs -0.90, D4c adopted -1.65 at e1, D4 item4 skipped). Review APPROVE (22:12Z) + Tester PASS (22:20Z, 87/87, all rails PASS) at head b037578 confirm code quality, but dual-unit M2/M3 still FAIL honestly. Re-scope endgame clause FIRES: owner decides MANIAC-grade machinery vs honest closure at achieved level. No further build phases charted without new direction.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes. RE-AFFIRMED this run: #143 proposes same invalid approach, corrected to PAT-backed path per LAB.md:73.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Lab Engineer push refusal reproduced 18:22:08Z** on same branch (`opencode/lab-137-session-death-resilience` -> `refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission`).
- **Anomaly on record:** #133 and #136 merged fine via the same bot path earlier (01:40:58Z / 16:28:44Z). Enforcement differs now or differed then; do not assume either way.
- **PR #142 MERGED 19:53:30Z as docs-only successor** (AGENTS.md:62 + LAB.md:73 PAT merge path, no workflow files touched) via `gh pr merge --rebase` at 6d778a9 -> 526daae. Verifies compliant path: docs-only mergeable via App token, workflow-file PRs require owner click or PAT-backed merge step.
- **Two compliant unblock paths for #139:** owner one-click merge, OR lab-built hardcoded PAT-backed merge step in maintainer.yml. This run dispatches the second path via #143.
- **#143 audit correction (2026-08-25T01:11Z, Auditor):** evidence accurate, root cause/proposal invalid. Proposes adding `workflows: write` to four mutating workflows (lab.yml:22, maintainer.yml:25, opencode.yml:9, opencode-recover.yml:12). Rejected per 16-scope verification and owner STOP #141. Correct fix is LAB.md:73 PAT-backed merge/push, not permissions edit.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `5bc4b9d55f727d2e5f186d6bbb100f0fb002c23c`** (19:59:42Z "fix: update maintainer schedule to every 2 hours", parent `526daae`). AGENTS.md:62 + LAB.md:73 live on main. Verified via `gh api .../contents/.github/workflows/opencode.yml?ref=main` - permissions: contents/pull-requests/issues/actions only, no workflows. Same on PR branch and all four mutating workflows verified this run.
- **Model watch:** openrouter/stealth/ox-alpha active; Review 32783208371 + Tester 32783509462 both completed cleanly 22:12Z/22:20Z on same pin, proving window clear after earlier 19:41-19:43Z burst.

## IN FLIGHT
- **PR #131** - OPEN MERGEABLE head `b0375786ce82251106119336b7f183c431d33237` (`opencode/issue130-20260823163248`, ahead 66 / behind 0 vs main 5bc4b9d, merge_base `5bc4b9d` shared after 20:30Z rebuild). D-series COMPLETE: D4a zero-run REJECTED (+0.28 pct aggregate 4/4 worse), D4b extended mixer REJECTED (-0.69 vs -0.90 D2-best), D4c color rotations ADOPTED (CR-fmt PASS loco -4.36 pct aggregate v2, independent cross-check 4/4, 22 wins / 2 ties / zero regressions at e1/e3/e7). Fresh corpus truth 24/24 pins verified: e1 10.1210/3.3737 (-1.65 pct bytes vs pre-D4c), e3=e7 10.1350/3.3783 (-1.47). 87/87 gtests, fuzz clean, all rails PASS. Tracker Status in_progress with D-series exhausted and OWNER DECISION POINT SURFACED (re-scope section 1). Review APPROVED 22:12:17Z + Tester PASS 22:20:27Z (run 32783509462 success 8m12s) at same head. No builds in progress. Freeze-gated park.
- **PR #139** - OPEN MERGEABLE head `a4994c6cc6e30725bde824156dbd889aa77ce673` (`opencode/lab-137-session-death-resilience`). Review APPROVED 18:27Z + Tester approve-test PASS 18:35Z, `Closes #137/#138` verified. Blocked on App-token `workflows` scope - awaiting PAT-backed merge capability. Lab dispatched this run via #143 to build it. 2 behind main (5bc4b9d). Infra routing guard: never fix/continue on workflow-touching PR.
- **ISSUE #143 lab dispatch** - OPEN lab-health audit, this run dispatched Lab Engineer (`/oc lab` on #143) to implement PAT-backed merge step in maintainer.yml (detect workflow-touching PRs, merge via OPENCODE_PAT with credential cleanup), plus PAT handling for Lab Engineer pushes. One-owner-click bootstrap required for the lab's own workflow-touching PR. Auditor's `workflows: write` proposal explicitly excluded.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ re-scope 2026-08-24) -> build C0-C5 + D0-D4 COMPLETE (C0/C1/C3 landed, C2/C2b/C4/C5 rejected, D0 harness built, D1/D2 rejected, D3 checkpoint byte-identical, D4a/b rejected, D4c ADOPTED, D4 item4 skipped) -> REVIEW 22:12Z APPROVE at b037578 -> TEST 22:20Z PASS at b037578 (87/87, all rails PASS, byte-identical reproduction) -> OWNER DECISION POINT RE-SURFACED per endgame clause (MANIAC vs honest closure) -> freeze blocks merge regardless until dual-unit M2 AND M3 pass. Infra track: #139 green but merge-blocked -> #143 lab dispatch for PAT merge restoration -> then #139 unblock -> close #137/#138.

## NEXT-RUN PLAYBOOK
1. **#143 lab watch:** verify Lab Engineer run on #143 started (lab.yml uses PAT only in hardcoded steps, bot identity `The Lab Engineer (CTO) <github-actions[bot]@users.noreply.github.com>`, `lab:` prefix, modular commits, PAT never in agent env). If lab run crashes/times out or hangs (CreditsError/AI_APICallError), re-dispatch lab once; second failure + halted production unlocks emergency revival contract (hard gate: need lab_run URL + production_stopped true), otherwise never edit workflows directly.
2. **#143 merge bootstrap:** lab's PR will touch workflows, so App cannot merge it - requires single owner one-click or PAT `gh pr merge --rebase --delete-branch`. Do NOT retry App-token merge. After it lands, verify via `gh api .../contents/.github/workflows/maintainer.yml?ref=main` that PAT merge step is live, then immediately merge PR #139 (still green at a4994c6; re-verify head stable and compare merge_base) to close #137/#138 manually and verify-and-dispatch pages.
3. **PR #131:** FIRST ACTION stand down unless owner rules on decision point. No Builder/Architect/Review/Test dispatches until ruled. Freeze blocks merge until dual-unit M2 AND M3 pass.
4. **Freeze remains** until dual-unit M2 AND M3 pass on real cjxl output - no parity claims until then.
5. **Watch #134 hold** (draft) while owner decides; zero action.

## ISSUES
- **#130** - sole workstream (Prism); carried by PR #131; D-series exhausted, owner decision point surfaced at b037578, review+test green, freeze-gated.
- **#137 + #138** - open; close manually the moment #139 lands on main.
- **#143** - open lab-health audit; lab dispatched this run for PAT-backed merge restoration (correcting invalid workflows:write premise); bootstrap merge requires owner click.
- **#141** - CLOSED 19:34:13Z (invalid workflows premise, owner STOP honored, re-affirmed).
- **#139/#142** - infra tracks (139 blocked awaiting PAT step, 142 merged docs-only).
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will owner perform the one-click bootstrap for the PAT-merge PR after lab lands it, or prefer to click-merge #139 directly?
- Will D-series owner decision (MANIAC vs honest closure) arrive before lab completes?
- Does stealth/ox-alpha remain stable (falsification watch post D4c+review+test)?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes.

- Mae, the Maintainer
