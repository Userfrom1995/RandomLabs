# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32731227319, woken by owner ping 13:11:28Z seconds after the D3 retry died to the same provider stream error). TRIPIWIRE EXECUTED: Lab Engineer escalated on #70; NO third blind fire; zero other triggers.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. No parity claim exists; e1 truth (~10.2904 / 3.4301) is ~19 percent above JXL parity.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (ls-remote this run). Main still serves the OLD pin `x-preview-f-free`.
- **STRIKE LEDGER, D3 phase: TWO same-error deaths, phase DISQUALIFIED from blind retries.** Strike 1 = opencode run 32730117593 (~108s death, APIError 13:01:36Z). Strike 2 = opencode run 32731034268 (~107s death, APIError 13:11:20Z). Both green-wrapped by continue-on-error masking, ZERO side effects (#131 head unchanged `ca5ce5e53`). Escalated to Lab Engineer per the disqualified-twice rule.
- **NEW INFRA FINDING (in lab mandate):** build-mode push-verification auto-retry NEVER engaged after either death - no auto-retry comment on #131 despite the documented up-to-3 guarantee for build/continue modes. Coverage gap or broken guard; lab explains/fixes.
- **PR #134** (`opencode/issue70-20260824084626`, head `c6adb5a6d4`, MERGEABLE, DRAFT): two-knob model switch to `deepseek-v4-flash-free`. Review lineage complete/clean; progression owner-frozen. ONLY the owner can release it; lab was explicitly forbidden from touching it.
- **CONCURRENT INSTANCE:** scheduled maintainer run 32730587359 started 13:04:57Z, still in_progress at survey time. It predates strike two, so expected behavior is a quiet stand-down; NEXT RUN must read its outputs first and reconcile any duplicate triggers.

## IN FLIGHT
- LAB ESCALATION on issue #70 (trigger posted via hardcoded step from this run's decision list): diagnose bursty provider strikes on pin `x-preview-f-free` (run-ID chain incl. 32730117593 + 32731034268), explain/fix the auto-retry non-engagement, deliver verdict; recommendation path for the model switch goes through OWNER release of #134 only.
- NOTHING else repo-wide: no build in flight, D3 paused pending lab verdict or owner action.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (C-series + D-series rescope) -> build PAUSED at D3 checkpoint (measurement-only: fresh bench all efforts, sha pins first, durable CSVs, bench_gate BOTH units, tracker update, zero format work): D0 DONE (harness committed + A2-magnitude RETRACTION with decision record), D1 DONE (blend rejected offline, +0.25 pct worse than MED), D2 DONE (mixer+SSE rejected offline, -0.90 vs >= 3 gate) -> D3 BLOCKED (two-strike disqualification until root cause lands or window clears via lab verdict / #134 release) -> REVIEW ROUND 2 takes the post-D3 stable boundary (checklist MUST include: A2-retraction scrutiny, I7 citability, D1/D2 chains + G-anchor, mixer mirrors, spec addendum 12, dual-unit/self-checks/decoder bits 3-6/topology b50935ae2) -> gated D4 (zero-run mode first, one extended-mixer-bank test, color rotations; squeeze-under-mixer dead) -> BINDING formal owner stop-and-decide if M3 still open after exhaustion -> freeze blocks merges until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (three threads): (a) read lab outcome on #70 (COMMENT plus JOB LOG; verdict? fix PR for retry guard? did lab itself die same-error twice?); (b) reconcile scheduled instance 32730587359 outputs; (c) do NOT resume D3 by hand unless lab verdict cleared the window AND nothing else owns the pipeline - the phase stays disqualified from blind retries until then.
2. If owner releases #134: automatic-first review => approve-test => merge `--rebase --delete-branch`, fresh-object orphan check => verify main > `9bb40298b` => pages check => falsification watch on the new pin (same-error strike post-switch kills pin-instability theory => retry-parity ask). THEN D3 resumes on the new pin with a clean slate.
3. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. Eventual #131 merge preconditions: dual-unit pass + review approve + test approve + orphan check (server-side evidence says shared history, base `f8a958d70e48`; re-verify at merge time).
4. If M3 still open after D-series exhaustion: surface the FORMAL owner stop-and-decide with final both-units numbers.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - OPEN, now carrying THIS escalation (lab dispatched); daily Auditor report current (01:16:33Z).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will the lab verdict land before the window self-resolves again (as it did twice yesterday)? Either way its diagnosis + retry-guard fix have standalone value.
- Will the owner release #134 while the pin keeps striking, or ride the old pin?
- Will D3's fresh both-units measure confirm e1 10.2904/3.4301 unchanged (expected yes)?
- Did scheduled instance 32730587359 stand down clean?

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline over the whole window before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone (continue-on-error masking has fooled eight checks across two days); topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until its root cause is fixed - AND THE TRIPWIRE MUST BE EXECUTED WHEN IT FIRES, not argued around; ephemeral numbers are not evidence (I7).

- Mae, the Maintainer
