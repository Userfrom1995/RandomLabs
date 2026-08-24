# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~17:35Z, maintainer run 32756781473, owner comment event on #131). Review round 2 read (verdict `continue`, docs-only F1 findings); Builder continuation DISPATCHED this run to fold F1(a-g); Lab Engineer active on owner's bare `/oc lab`; zero other triggers.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. (Infra reliability fixes are exempt - they serve Prism.)
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (native-orientation pins: 18 landscape / 6 portrait).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth re-verified by D3: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Owner then posted a bare `/oc lab` at 17:11:28Z - mandate unknown until the session concludes; watch for #134 movement server-side.
- **OWNER DECISION POINT (OPEN):** after round 2, #130 sits at its tracker-named fork - gated D4 stretch knowing M3 likely stays open vs honest closure of #130 at the achieved gate level (-6.7 percent bytes vs e7 baseline, five directions closed by measurement). Both executable within one run once the owner rules. No format work without that direction.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `aa94ae44e`** (#136 merged 16:28:44Z). Old pin `x-preview-f-free` still serving everything; provider quiet since 14:17Z across lab/maintainer sessions. Pages green on main (workflow_dispatch success 17:27:58Z).
- **#136 auto-retry chain:** still awaiting first live-fire; verify its verify-step output when a strike next kills an agent session mid-build/review.
- Pins are native-orientation PPMs (18 landscape / 6 portrait) - documented in benchmark-methodology.md; never benchmark converted orientations.

## IN FLIGHT
- **F1-fold Builder continuation on #131** (dispatched by THIS run via decision file): fold review round 2 findings F1(a-g) FIRST - probe_backend.sh header rewrite, progress retraction marker, rescope :76-78 inversion fix + :36 row, blueprint :151/:178 annotations, ideas :44/:105 markers, rescope D0 STATUS line. Docs-only; head expected past `fd608afe`.
- **Lab Engineer session 32755190329 ACTIVE** (owner `/oc lab`, since 17:11:35Z, ~20 min in, no visible output yet).
- Queued lab twin 32756781433 PENDING behind it - predicted self-skip on dequeue (job if requires /oc lab prefix; concurrency group lab-131). VERIFY it skipped next sweep.
- NOTHING else repo-wide.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build DONE through C0-C5 + rescope + D0/D1/D2 rejections + D3 checkpoint -> REVIEW ROUND 2 COMPLETE (`{"action":"continue"}`, all empirical checks passed, D0 retraction credited) -> F1 DOCS FOLD IN FLIGHT -> then OWNER DECISION POINT (D4 stretch vs honest closure). Freeze blocks any merge until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: verify the F1-fold continuation engaged and completed (head past `fd608afe`, docs-only commits, all seven sub-items landed per the reviewer's list in the round-2 comment and my log entry). Incomplete/struck => check error class first; #136 auto-retry should self-heal; manual fire ONLY if the chain demonstrably misbehaves, then lab with run IDs.
2. Read the lab session outcome (32755190329): mandate, branches/PRs opened, any #134 hold release. Verify twin 32756781433 self-skipped as predicted.
3. After the fold lands: automatic review takes the boundary if wiring fires it; manual fire ONLY if demonstrably silent (paginate FULL comment timeline AND job log before declaring anything dead).
4. Surface the owner decision point again if still unanswered; do not let format work start without the ruling.
5. #134: zero action while the hold stands. On release: review automatic-first -> approve-test -> merge `--rebase --delete-branch` with fresh-object orphan check -> verify main advances past `aa94ae44e` -> pages check -> falsification watch begins.
6. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. #131 eventual preconditions: dual-unit pass + review approve + test approve + fresh-object orphan check (base evidence PASS; base f8a958d70e48).
7. OPS RECURRING: merges made with the default token do not trigger pages.yml - check for a pages run on any new main sha and dispatch manually if absent.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases through D3 + round 2 + F1 fold.
- **#70 (Lab Health)** - baseline-bug mandate COMPLETE (#136 merged, verified live, awaiting first live-fire). Board remains the universal audit log.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- What does the owner's bare `/oc lab` mandate, and does it touch the #134 hold or the model pin?
- Will the F1 fold land clean on the first slice?
- When will the owner rule on gated D4 stretch vs honest closure of #130?
- When does the #136 auto-retry chain get its first live-fire, and does it count correctly?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline over the whole window before concluding anything (verdicts post as issue comments; green can mask dead sessions).
- Read COMMENT plus JOB LOG, never green status alone; audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until its root cause is fixed; ephemeral numbers are not evidence (I7).
- Merge-token pushes do not trip workflow triggers (pages.yml included): verify-and-dispatch after every merge.
- Never describe a fix as live until grep/API confirms it at ref=main.
- Retracted figures must be marked AT THE SITE of assertion, not only in the retraction record (round-2 F1 lesson).

- Mae, the Maintainer
