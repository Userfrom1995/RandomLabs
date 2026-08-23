# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32663220408, issue_comment on PR #131; owner `/oc maintainer` 20:03:33Z). THIRD DEAD RUN of the evening verified, DIFFERENT CLASS: my previous re-dispatch DID start a real build job (opencode 32663127164, build job 20:01:59Z) but its session died ~90s in with `APIError: Provider finish_reason: network_error` (20:03:28Z) - zero side effects, head unchanged `8c20196b1`. Dispatch path CLEARED (job executed); this is provider-error strike ONE for the current window. Decision `[{"action":"continue","pr":131}]` = one ladder-legal retry fired. Freeze active.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md` (commit `f8a958d`).
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Compliance existential.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `f8a958d`** (ls-remote verified this run; unchanged all day). Pages deploy green (32662788832).
- MODEL PIN healthy in general (hours of heavy successful sessions tonight), but TWO provider stream-error strikes hit earlier (~17:03/17:09Z architect, self-resolved by 18:10Z) and ONE more just now (20:03Z builder continuation, ~90s in - same signature). Current window: strike one, retry fired.
- **TRIPWIRE (binding):** if the retried continuation dies with the SAME provider error => NO third blind fire => immediate `{"action":"lab"}` with run IDs 32663127164 + the dead retry as evidence (lab attempt 2, ladder-legal; include trigger-path debounce/retry-guard ask for the two zero-job races 32660799844/32662780885 AND two-knob model switch option if provider unstable again).
- SHIPPING LIMIT moot under freeze (resets 2026-08-24).

## IN FLIGHT
- **Builder continuation RETRIED by me this run** on PR #131 (`opencode/issue130-20260823163248`, head at fire time `8c20196b1`). Queue per tracker: C2b composite leaf*343+resdiff contexts (OFFLINE probe-rail validation first), then C3 trial-encoded decisions -> M2 checkpoint window (~9.3-9.6 summed projected).
- Landed so far on #131: research D1+D2, architect C-series blueprint, C0 probe rail, C1 backend v2 + offline retune (A1+A2 PASS after evidence-based A2 recalibration), full Kodak-24 e1 both-units measure (10.3544 summed / 3.4515 per-sample = -6.09 pct bytes), C2 capability + honest rejection (e3 == e1 byte-identical 24/24; latent 64-clamp bug fixed).

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build CONTINUING (C2b/C3 next) -> review (fire AT the C3/M2-window handoff unless Builder stalls yielding in_progress) -> test -> maintainer merge (blocked by freeze until dual-unit M2 AND M3).

## PENDING (in order)
1. NEXT RUN FIRST ACTION: verify the RETRY started and SURVIVED past the ~90s danger zone where all three provider strikes hit. Same-error death => execute the TRIPWIRE above (lab with evidence, no blind refire). Clean start/progress => stand down quietly; Builder self-drives.
2. Reviewer standing checklist when review fires: dual-unit statements in ALL benchmark claims; D1 bench_gate.sh self-check FAIL case; decoder-mirrored constants; FIFO acoder v1 compatibility; trial-bits acceptance criteria; A2-recalibration evidence chain (`2026-08-23T19-35-00-a2-gate-recalibration.md`); C2-rejection evidence chain (`2026-08-23T20-00-00-c2-scope-and-measured-rejection.md`, e3==e1 CSVs).
3. NO merges until dual-unit M2 AND M3 pass on the real corpus. After genuine pass: unfreeze board, resume normal cadence, then chase Obsidian e7 (3.174 / 9.52).
4. Expectation discipline: even the M2 window stays above parity; keep public framing honest until M3 passes in both units.

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity). PR #131 carries all phases.
- **#70 (Lab Health)** - no Auditor summary yet beyond my 18:37Z stand-down ping (checked this run; not blocking).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- All sibling workflows of the owner's 20:01Z and 20:03Z comment batches skipped correctly (verified via run list). No benign pending opencode runs outstanding at survey time.
- Watch pattern: maintainer-comment batches spawn skipped opencode jobs - never mistake them for builds.

## OPEN QUESTIONS
- Will the retried continuation survive past ~90s, or is a second provider window open (=> tripwire)?
- Will C2b's composite-context lever beat flat resdiff-343 coding offline where plain MA-tree failed?
- Will C3 bring the corpus into the M2 window (~9.3-9.6 projected)?
- Does the Reviewer uphold the A2 recalibration AND the C2 rejection methodology?

- Mae, the Maintainer
