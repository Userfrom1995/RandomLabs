# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~17:47Z, maintainer run 32757769276, owner comment event on PR #139). Lab delivered PR #139 (fixes #137 + #138); review attempt 1 died to a provider error and the crash-parity guard auto-fired retry 1; this run stood down with zero triggers and flagged the PR's metadata defect.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt - they serve Prism.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth re-verified by D3: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.
- **DECISION POINT RESOLVED (2026-08-24T17:38Z):** the owner's explicit continue after review round 2 chose D4 continuation over honest closure of #130.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `aa94ae44e`** unchanged. Old pin `x-preview-f-free` still serving everything until #134 merges. Pages green (success 17:38:13Z + PR preview 17:37:02Z).
- **PR #139 OPEN** (`opencode/lab-137-session-death-resilience`, head `0174b41931`, MERGEABLE, non-draft, 3 commits): shared `approve-held-runs.sh` terminal repo-wide sweep (#137), research/architect crash-parity retries (#138), agent-authored infra PR titles/bodies. **Metadata defect: body says `Closes #131` - WRONG linkage; targets are #137/#138; must be corrected before merge (route via lab; fix/continue forbidden on infra PRs). Merging without the fix leaves both issues open (no closure links).**
- Issue #137's exemplar held pair (32752159442/32752159481) resolved post-filing; systemic hole still real, hardened by #139.
- Strike ledger: provider stream errors CONTINUE bursty - latest casualty review attempt 1 on #139 (APIError "Endpoint is unavailable", 17:39:06Z, green-masked). Review-gate crash parity fired correctly (auto-retry 1 at 17:39:08Z). The research/architect parity from #139 is merged-but-unexercised until #139 lands.

## IN FLIGHT
- **#139 review auto-retry round 1** (opencode-review run 32757859292, in progress since ~17:39Z) against pinned head `0174b41931`. Zero formal reviews yet (verdicts post as comments).
- **#131 D4 continuation** (opencode run 32757818860, in progress since 17:38:43Z): folds F1 first (retracted A2 magnitudes still asserted in SEVEN doc spots - probe_backend.sh:36-45, progress tracker :31-41, rescope doc :76-78/:36, architecture doc :151/:178, ideas file :44/:105 - reviewer supplied replacement text per spot), then stretch work per rescope.
- NOTHING else repo-wide. Pending maintainer siblings 32757818709 + 32757859639 expected to stand down.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build through C0-C5 + rescope + D0/D1/D2 (honest rejections) + D3 checkpoint (byte-identical dual-unit FAIL, honest) -> REVIEW ROUND 2 DONE (verdict "continue"; F1 docs cluster only) -> OWNER RESOLVED THE FORK toward D4 continuation -> D4 SLICE IN FLIGHT -> next boundary takes review round 3 automatic-first.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (a) #139: read auto-retry verdict - paginate FULL comment timeline AND job log (formal reviews API stays empty; green masks dead sessions). Approve => confirm Tester auto-forwarded; at approve-test: METADATA CORRECTION FIRST (route lab if reviewer missed it), then merge `--rebase --delete-branch` with fresh-object orphan check, verify main advances past `aa94ae44e`, CLOSE #137 AND #138 MANUALLY (no closure links exist), check/dispatch pages on the new sha. Findings => forwarder routes fix-to-lab automatically for infra PRs; verify engaged. Death => crash-parity counts up to 3; escalate lab ONLY if chain demonstrably misbehaves (run IDs required).
2. FIRST ACTION (b) #131: read D4 outcome - verify F1 folded in ALL seven spots first, then slice summary; review round 3 takes that boundary automatic-first with the standing checklist (dual-unit statements, fail-capable self-checks, decoder mirrors bits 3-6, I7 citability, A2-retraction propagation now added, corrected topology b50935ae2).
3. #134: zero action while the hold stands. On release: review automatic-first -> approve-test -> merge --rebase --delete-branch with fresh-object orphan check -> verify main advance -> pages check -> falsification watch on the deepseek pin begins.
4. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Lab PRs (#139 class) merge freely once approved (shipping-limit exempt).
5. OPS RECURRING: merges made with the default token do not trigger pages.yml - verify-and-dispatch after every merge.

## ISSUES
- **#130** - sole active workstream (Prism); carried by PR #131 through the D-series.
- **#137 + #138** - open, awaiting #139's merge; I close them manually post-merge (no valid closure links on the PR).
- **#70 (Lab Health)** - baseline-bug mandate complete (#136 live); universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Does #139's retry round approve cleanly, and does it flag the metadata defect itself?
- Will the owner release the #134 hold? Post-switch strike behavior decides the pin-instability theory (deepseek switch parked behind the hold).
- Does the research/architect crash-parity get its live-fire soon after #139 merges?
- When does the D4 slice conclude, and does round 3 approve the F1 fold?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone (seventh masked death caught today, 17:39:06Z); audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging, and expect to close referenced issues manually when links are wrong.

- Mae, the Maintainer
