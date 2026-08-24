# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~17:00Z, maintainer run 32753629396, owner comment event on #131). D3 checkpoint verified complete; review round 2 LIVE on PR #131 against pinned head `fd608afe`; this run stood down with zero triggers.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt - they serve Prism.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth re-verified by D3: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `aa94ae44e`** (#136 server-side build push verification, merged 16:28:44Z). Old pin `x-preview-f-free` still serving everything until #134 merges. Pages green on main (success 16:55:23Z).
- **#136 fix live and UNTESTED in anger:** the D3 resume completed without a strike, so the new auto-retry chain's first real exercise is still pending - it gets that chance the next time an agent session dies mid-build/review. Verify its verify-step output line when it fires.
- **Strike ledger:** quiet since 14:17Z across builder/reviewer/tester/maintainer sessions. Falsification watch unchanged: bursty-window hypothesis vs pin instability settles only after the #134 switch lands.
- Pins are native-orientation PPMs (18 landscape / 6 portrait) - documented this run in benchmark-methodology.md; never benchmark converted orientations.

## IN FLIGHT
- **Review round 2 on #131** (opencode-review run 32753617556, in progress since 16:55:15Z) against stable head `fd608afeb8aa1f167f1e790b26098ae22dc853b4`. Benign pending twin 32753629346 queued behind it (known pattern; read-only).
- Pages deploy current on main. NOTHING else repo-wide.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build DONE through C0-C5 + rescope + D0/D1/D2 (two honest offline rejections) + D3 checkpoint (fresh dual-unit measure byte-identical to CSVs, M2/M3 FAIL honestly at every effort) -> REVIEW ROUND 2 AT THE BOUNDARY (in flight) -> then the OWNER DECISION POINT: gated D4 stretch knowing M3 likely stays open, or honest closure of #130 at the achieved gate level. Freeze blocks any merge until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read review round 2's verdict on #131 - paginate the FULL comment timeline AND the job log before concluding anything (verdicts post as issue comments; green can mask dead sessions). Approve => confirm Tester auto-forwarded; merge stays blocked by freeze anyway. Findings => Fixer trigger via forwarder; verify it engaged. Review death => crash-parity guard self-heals (#136 logic); manual fire ONLY if the chain demonstrably misbehaves, then lab with run IDs.
2. Twin reconciliation: if pending review twin 32753629346 delivers a divergent verdict, head-tagged primary is authoritative; note discrepancy in the log.
3. After round 2 concludes cleanly: surface the FORMAL owner decision point (D4 stretch vs honest closure of #130). Closure of this size belongs to the owner alone; both paths executable within one run.
4. #134: zero action while the hold stands. On release: review automatic-first -> approve-test -> merge `--rebase --delete-branch` with fresh-object orphan check -> verify main advances past `aa94ae44e` -> pages check -> falsification watch on the new pin begins.
5. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. #131 eventual preconditions: dual-unit pass + review approve + test approve + fresh-object orphan check (base evidence PASS; base f8a958d70e48).
6. OPS RECURRING: merges made with the default token do not trigger pages.yml - check for a pages run on any new main sha and dispatch manually if absent.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases through D3.
- **#70 (Lab Health)** - baseline-bug mandate COMPLETE (#136 merged, verified live, awaiting first live-fire). Board remains the universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will review round 2 approve cleanly or route findings to the Fixer?
- Will the owner release the #134 hold this window? Post-switch strike behavior decides the pin-instability theory.
- Will the owner rule on honest closure vs gated D4 stretch once round 2 lands? Either answer is executable within one run.
- When does the #136 auto-retry chain get its first live-fire, and does it count correctly?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline over the whole window before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until its root cause is fixed; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers (pages.yml included): verify-and-dispatch after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.

- Mae, the Maintainer
