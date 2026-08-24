# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~20:43Z, maintainer run 32775501887 issue_comment on PR #131 - pending triaged, D4a verified, next D4 lever dispatched)

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim cites a fresh reproducible measurement in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1; net -6.7 percent bytes vs e7 baseline (11.026 / 3.675).
- **OWNER DECISION POINT (RESOLVED 2026-08-24T19:39Z):** Mae resolved the re-scope section-1 point in favor of D4 stretch (zero-run mode, extended mixer-bank, color rotations, squeeze re-test only with new harness evidence). Executes with never-expand and I7 invariants; if M3 still fails after D4, surface the decision point again.
- **OWNER STOP (19:20:10Z, on #141):** halt the workflows-permission approach; verify against GitHub's real permission model. HONORED: #141 closed 19:34:13Z; `workflows` is NOT among the 16 valid GITHUB_TOKEN scopes - grant never landed on main.
- **#134 HOLD (12:07:26Z):** stays draft; largely superseded by main's direct model switches; owner decides disposition.

## MERGE CAPABILITY (verified hard evidence - CRITICAL)
- **`workflows` is NOT a valid GITHUB_TOKEN scope.** GitHub workflow-syntax reference lists exactly 16 scopes; no `workflows`. It exists only as a GitHub App permission. NO permissions-block edit can ever enable App-token merges of workflow-file PRs.
- **App-token merge refusal reproduced 2x fresh against #139** (GraphQL mergePullRequest AND REST PUT /pulls/139/merge): 403 "refusing to allow a GitHub App to create or update workflow .github/workflows/lab.yml without workflows permission".
- **Anomaly on record:** #133 and #136 merged fine via the same bot path earlier (01:40:58Z / 16:28:44Z). Enforcement differs now or differed then; do not assume either way - test nothing blindly.
- **PR #142 MERGED 19:53:30Z as docs-only successor** (AGENTS.md:62 + LAB.md:73 PAT merge path, no workflow files touched) via `gh pr merge --rebase` at 6d778a9 -> 526daae. Verifies compliant path: docs-only mergeable via App token, workflow-file PRs require owner click or PAT-backed merge step.
- **Two compliant unblock paths for #139:** owner one-click merge, OR lab-built hardcoded PAT-backed merge step in maintainer.yml.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `5bc4b9d55f727d2e5f186d6bbb100f0fb002c23c`** (19:59:42Z "fix: update maintainer schedule to every 2 hours", parent `526daae` "lab: remove invalid workflows permission..."). AGENTS.md:62 + LAB.md:73 live on main (PAT merge path, validated via contents API). Pages `32775500958` success 20:43:27Z (main dispatch); PR pages `32775399054` + `32775398987` success 20:42:22Z on new head `4f7154f`; recover sweep `32774279387` success 20:30:30Z.
- **Model watch:** openrouter/stealth/ox-alpha active; transient burst 19:41-19:43Z (Endpoint is unavailable) self-healed via rebuild; this run clean on same pin. Two-knob rule remains if ever retried.

## IN FLIGHT
- **PR #131** - OPEN MERGEABLE head `4f7154f8e21eedbb50b954c6119761d72bdfe299` (`opencode/issue130-20260823163248`, branch rebuilt, diverged after `630dce1`, no conflict). Tracker in_progress D4 stretch. D4a zero-run offline rejection landed at `4f7154f` (+0.28 pct aggregate, 4/4 worse, ceiling -0.24 pct vs >=3 pct gate, reference CSV protected, never-expand held). Dispatched Builder continuation for D4b next lever this run; pending opencode `32775502053` triaged as benign no-op for `/oc maintainer` (head_sha `5bc4b9d`, 0 jobs, will cancel). Prior queue entries `32775053813` + `32774326137` already `cancelled`. Zombie `32769810484` flagged as orphan, not re-dispatched.
- **PR #139** - OPEN MERGEABLE head `a4994c6cc6e30725bde824156dbd889aa77ce673` (`opencode/lab-137-session-death-resilience`). Review APPROVED 18:27Z + Tester approve-test PASS 18:35Z, `Closes #137/#138` verified. Blocked on App-token `workflows` scope - awaiting owner click or explicit lab PAT-step dispatch. 2 behind main (5bc4b9d); rebase may be needed but do NOT auto-rebase.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (+ rescope) -> build C0-C5 + D0-D3 COMPLETE -> REVIEW ROUNDS 1-4 DONE (round 4: continue at c10598f) -> OWNER DECISION POINT RESOLVED -> D4 dispatched (rebuild at 785e257 -> D4a rejection at 4f7154f) -> D4b continuation dispatched (this run) -> REVIEW after full D4 -> freeze blocks merge regardless -> PR #142 infra docs track CLOSED/MERGED.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read the dispatched D4b continuation outcome on #131 (run to be created from this dispatch - check COMMENT plus JOB LOG, never green alone). Clean handoff => automatic review takes post-D4 phase boundary after `git merge origin/main` check per tracker item 0; death => error-class inspection, one same-error retry max then lab escalation with run IDs (32769431506, 32769620318 plus new). If pending `32775502053` somehow started a real build, treat as owning pipeline and stand down.
2. Verify pending `32775502053` resolved to cancelled/skipped (benign no-op for `/oc maintainer`) next sweep.
3. Monitor zombie `32769810484` - still flagged as orphan from pre-rebuild series; do NOT dispatch around it.
4. #139: NO bot merge retries. Act only on explicit owner instruction. If merged, verify workflow contents, CLOSE #137 AND #138 MANUALLY, dispatch pages.
5. Watch #130 for post-D4 outcome; if M3 still open after full D4, surface formal stop-and-decide per re-scope section 1. No silent scope creep.
6. Freeze stands until dual-unit M2 AND M3 pass on real cjxl output - no parity claims until then.

## ISSUES
- **#130** - sole workstream (Prism); carried by PR #131; D4 stretch executing (D4a rejected, D4b dispatched).
- **#137 + #138** - open; close manually the moment #139 lands on main.
- **#141** - CLOSED 19:34:13Z (invalid workflows premise, owner STOP honored).
- **#120** - CLOSED; audit trail for PAT merge path.
- **#70 (Lab Health)** - universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will the newly dispatched D4b continuation execute the extended mixer-bank harness gate or hit provider window again (lab if twice-consecutive on new pin)?
- Will pending `32775502053` resolve to cancelled as predicted, or need re-triage?
- Will zombie `32769810484` time out or need manual cancellation?
- Will #139 be unblocked via owner click or lab PAT step (now 2 behind main)?
- Does stealth/ox-alpha remain stable after the 19:41-19:43 burst?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging.
- Permission names must be verified against GitHub's documented scope list before any grant ships; App-token merge refusals are reproducible server-side facts, not flukes.

- Mae, the Maintainer
