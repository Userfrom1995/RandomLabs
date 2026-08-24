# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~16:35Z, maintainer run 32737569964, owner comment event on #136). MERGED #136 (server-side build push verification) as `aa94ae44e` on main; #135 auto-closed; fix verified live; exactly ONE sanctioned D3 resume fired on #131; pages redeployed manually.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt - they serve Prism.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `aa94ae44e`** (advanced from `9bb40298b` via rebase merge of #136 at 16:28:44Z). Old pin `x-preview-f-free` still serving everything until #134 merges.
- **NEW ON MAIN (#136, verified live by contents-API grep):** build-mode push verification is server-side like-for-like - baseline and verify both resolve the target branch via the GitHub API; plain-issue fallback baselines the FULL set of pre-existing `opencode/issue<N>-*` tips (exact-match membership, empty set cannot false-match); local checkout consulted only as guarded last resort (foreign/stale checkouts read as no-push); self-heal consumes the server verdict; robust retry counter intact. First live-fire test happens on the D3 resume this run triggered.
- **Strike ledger:** bursty provider window killed lab run 32734555661 (13:47Z), maintainer runs 32734739430/32734772589/32735558168 (silent deaths), one session inside maintainer 32737569964 (14:16:58Z); quiet 14:17-16:15Z; survivors completed the full review(3 rounds)->test(18/18)->merge loop.

## IN FLIGHT
- **D3 resume on #131** (`{"action":"continue","pr":131}` fired this run): dual-unit checkpoint attempt under the new verification regime. Next run reads its outcome FIRST.
- Pages deploy 32751262594 in flight on `aa94ae44e`.
- NOTHING else repo-wide.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build IN PROGRESS: D0/D1/D2 done (two honest offline rejections), D3 checkpoint resume FIRED -> review round 2 takes the stable post-D3 boundary automatic-first (checklist additions binding: A2-retraction scrutiny, I7 citability, D1/D2 rejection chains + G-anchor invariants, mixer mirrors, addendum 12 consistency, standing items) -> gated D4 items (zero-run mode first) -> FORMAL owner stop-and-decide if M3 stays open after exhaustion -> freeze blocks any merge until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read the D3 outcome on #131. Completed -> results count ONLY with a fresh dual-unit measurement; then review round 2 fires automatic-first at the post-D3 boundary. Died -> confirm the new auto-retry chain ENGAGED (first live-fire of #136); do not fire manual retries while the automatic chain is healthy; escalate to lab only if the chain itself misbehaves.
2. #134: zero action while the hold stands. On release: review automatic-first -> approve-test -> merge `--rebase --delete-branch` with fresh-object orphan check -> verify main advances past `aa94ae44e` -> pages check -> falsification watch on the new pin begins.
3. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. #131 eventual preconditions: dual-unit pass + review approve + test approve + orphan check.
4. OPS RECURRING (third occurrence logged): merges made with the default token do not trigger pages.yml - after any merge check for a pages run on the new main sha and dispatch manually if absent.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - retry-masking mandate COMPLETE (PR #136 merged); board remains the universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.
- **#135** - CLOSED by #136's merge.

## OPEN QUESTIONS
- Did the first live-fire of the new verify/auto-retry chain behave as tested?
- Will the owner release the #134 hold this window? Post-switch strike behavior decides the pin-instability theory.
- Will the owner rule early on honest closure vs stretch before D4 exhausts? Either answer is executable within one run.

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline over the whole window before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until root cause fixed; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers (pages.yml included): verify-and-dispatch after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main (done for #136 this run).

- Mae, the Maintainer
