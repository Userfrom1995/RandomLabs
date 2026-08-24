# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~17:52Z, maintainer run 32758673812, owner comment event on PR #131). Second consecutive quiet stand-down: review round 3 owns #131 against the folded head, #139's auto-retry owns the infra gate; zero triggers fired.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt - they serve Prism.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth re-verified by D3: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.
- **DECISION POINT RESOLVED (2026-08-24T17:38Z):** the owner's explicit continue after review round 2 chose D4 continuation over honest closure of #130.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `aa94ae44e`** unchanged. Old pin `x-preview-f-free` still serving everything until #134 merges. Pages green (workflow_dispatch success 17:47:40Z + pr-trigger successes); two action_required runs from the D4 push (32758494725/32758494728) await the next repo-wide PAT sweep.
- **PR #139 OPEN** (`opencode/lab-137-session-death-resilience`, head `0174b41931`, MERGEABLE, non-draft, 3 commits): fixes #137 (terminal repo-wide held-run sweep) + #138 (research/architect crash-parity). Review attempt 1 died to provider error 17:39:06Z; crash-parity auto-fired retry 1 (run 32757859292, in progress). **Metadata defect stands: title/body say `Closes #131` - WRONG; targets are #137/#138; must be corrected before merge (route via lab; fix/continue forbidden on infra PRs). Merging without the fix leaves both issues open (no closure links).**
- Strike ledger: provider stream errors remain bursty (latest: review attempt 1 on #139 at 17:39:06Z "Endpoint is unavailable" green-masked; maintainer sibling 32757666449 dead 17:40:45Z). All retry chains functioning as designed - no escalation warranted while guards work.

## IN FLIGHT
- **#131 review round 3** (opencode-review run 32758656708, in progress since 17:47:32Z) against pinned head `c8b01c85` - verifies the F1(a-g) fold itself (all seven docs-only retraction-propagation spots; fold spot-checked in-tree by me this run: probe_backend.sh header NONREPRODUCIBLE statement + 1.14/1.50 ceilings, tracker RETRACTED blockquote :32). Benign pending twin 32758673770 expected to self-skip.
- **#139 auto-retry round 1** (run 32757859292, in progress since 17:39:10Z).
- NOTHING else repo-wide.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build through C0-C5 + rescope + D0/D1/D2 (honest rejections) + D3 checkpoint -> REVIEW ROUND 2 DONE (verdict "continue"; docs-only F1a-g) -> OWNER RESOLVED FORK toward D4 continuation -> F1(a-g) FOLDED at `c8b01c8` (docs-only, zero code changes) -> REVIEW ROUND 3 LIVE -> then verdict routes: approve => Tester auto-forward (merge still freeze-blocked), findings => Fixer forwarder.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (a) #131: read round-3 verdict - paginate FULL comment timeline AND job log (formal reviews API stays empty; green masks dead sessions). Approve => confirm Tester auto-forwarded; stand down on merge (freeze blocks regardless). Findings => verify Fixer forwarder engaged. Death => crash-parity counts up to 3; escalate lab ONLY if the chain demonstrably misbehaves (run IDs required).
2. FIRST ACTION (b) #139: read auto-retry verdict (same reading discipline). At approve-test: METADATA CORRECTION FIRST (route lab if reviewer missed it), then merge `--rebase --delete-branch` with fresh-object orphan check, verify main advances past `aa94ae44e`, CLOSE #137 AND #138 MANUALLY (no closure links exist), verify-and-dispatch pages on the new sha.
3. Round-3 checklist (binding): dual-unit statements everywhere; fail-capable self-checks all three gate rails; decoder mirrors bits 3-6; corrected topology b50935ae2; A2-retraction propagation across all seven spots (this round verifies the fold); I7 citability; D1/D2 rejection chains + G-anchor invariants; mixer mirrors; spec addendum 12 consistency.
4. #134: zero action while the hold stands. On release: review automatic-first -> approve-test -> merge --rebase --delete-branch with fresh-object orphan check -> verify main advance -> pages check -> falsification watch on the deepseek pin begins.
5. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Lab PRs (#139 class) merge freely once approved (shipping-limit exempt).

## ISSUES
- **#130** - sole active workstream (Prism); carried by PR #131 through the C/D-series.
- **#137 + #138** - open, awaiting #139's merge; I close them manually post-merge (no valid closure links on the PR).
- **#70 (Lab Health)** - baseline-bug mandate complete (#136 live); universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Does round 3 approve the F1 fold cleanly, and does the Tester engage?
- Does #139's auto-retry approve, and does its reviewer flag the metadata defect itself?
- Will the owner release the #134 hold? Post-switch strike behavior decides the pin-instability theory.

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone (masked deaths at 13:48-14:16Z, 17:39:06Z, 17:40:45Z); audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; never fire into a healthy automatic chain; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers: verify-and-dispatch pages after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Closing keywords resolve against ISSUES only - check every PR body's linkage before merging, and expect to close referenced issues manually when links are wrong.

- Mae, the Maintainer
