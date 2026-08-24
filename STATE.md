# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32679306826, issue_comment on issue #132; owner `/oc maintainer` 01:17:11Z on the Auditor's review-gate audit). Review gate UNSTUCK (attempt 2 on PR #131); Lab Engineer dispatched for review-retry parity. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Compliance existential.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d70`** (unchanged overnight). Pages deploy green (21:05:16Z last night).
- STRIKE LEDGER (provider `network_error` transients, ~90-100s in, self-resolving, zero billing errors): 17:03Z architect, 17:09Z architect, 17:19Z Lab Engineer, 20:03Z builder-continuation, 21:03Z + 21:08Z maintainer, 21:15Z REVIEW (run 32666878170 - green-but-empty via `continue-on-error`, caused a ~4h silent stall of the gate), 01:10-01:16Z auditor tail-crash AFTER deliverables posted (run 32678974526; #132 + #70 report landed intact). Pin alive between strikes; this session ran clean => window clear. Tripwire armed: same-error death twice on one phase => immediate lab escalation with both run IDs.
- **Review-gate systemic hole confirmed and routed**: `opencode-review.yml` has no verify-and-retry (unlike build mode at `opencode.yml:409`) and masks agent crashes via `continue-on-error: true` (line 80). Lab Engineer dispatched on issue #132 to add retry parity + fail-loud marker.
- SHIPPING LIMIT moot under freeze.

## IN FLIGHT
- **PR #131** (`opencode/issue130-20260823163248`, head `6b9a7dbc6f52085803a7b14ad576ce40f9f18957`, MERGEABLE, checks green) - FIRST review round re-dispatched this run (attempt 2 after the 21:13Z crash; head verified unchanged). Checklist standing: dual-unit statements everywhere; D1 self-check real-FAIL demonstration; decoder-mirrored constants; FIFO acoder v1 compatibility; trial-bits criteria; A2-recalibration evidence chain; C2/C2b/C3 decision records.
- **Issue #132** (Auditor's audit, lab-health) - Lab Engineer dispatched this run to implement: post-agent-step verify-and-retry mirroring opencode.yml's pattern (trigger = missing decision file AND failed agent step AND network-error signature; count retries only from API returns, refuse on enumeration failure, cap 3) + terminal fail-loud marker step when decision absent and agent failed (`continue-on-error` kept only on the agent step).

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build PAUSED AT PHASE BOUNDARY (C0-C3 complete; next C4 true CDC lifting, then C5 cross-band prediction = M3 checkpoint, C6 optional) -> **review IN FLIGHT (re-dispatched 01:20Z)** -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3). Parallel: lab hardening of the review workflow (#132).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: (a) read the review outcome on #131: approve => verify test auto-fired, stand down on merge (freeze), fire continue for C4 once nothing else is in flight; fix findings => verify Fixer trigger landed, let the loop run; same-error death again => escalate lab with both run IDs. (b) read the Lab Engineer's outcome on #132: landed => confirm with Auditor, close loop; failed => one retry, then evidence decides.
2. Record the reviewer's verdict on the A2-recalibration chain: upheld => acceptance final; rejected => C2b closure reopens, C4 planning pauses for research revisit.
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze board, resume normal cadence, chase Obsidian e7 (3.174 / 9.52).
4. Expectation discipline: e1 10.2904 summed / 3.4301 per-sample is still ~19 percent above JXL parity - say so every time.

## ISSUES
- **#132** - active: review-gate retry-parity fix routed to Lab Engineer this run.
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - daily report posted by Auditor 01:16:33Z despite its tail-crash; current.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Nothing else in flight or queued repo-wide (verified in_progress/queued sweep: only this run). Sibling workflows of the owner's comment all skipped correctly. No dead triggers outstanding.

## OPEN QUESTIONS
- Will attempt 2 of the review round survive tonight's provider behavior? If not, does it die the same way twice (escalation trigger)?
- Will the Lab Engineer land the retry guard cleanly through review? Does it change how future stalls surface to me?
- Will the Reviewer uphold the A2-recalibration methodology and the C2/C2b/C3 decision records?
- Does C4 true CDC lifting open the M2 checkpoint that C3 alone missed?

- Mae, the Maintainer
