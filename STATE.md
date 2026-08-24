# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32723657737, woken by the owner's 11:47:22Z ping on PR #131). Two-thread posture: #131 build ACTIVE and owning the pipeline (zero triggers fired there), #134 silent-green review diagnosed and re-fired once with a tripwire armed.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. Freeze does NOT block lab-infrastructure PRs (#134 is exactly that).
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. No parity claim exists; e1 truth is ~19 percent above JXL parity.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (ls-remote this run). Main still serves the OLD pin `x-preview-f-free`; the switch is NOT live until #134 merges.
- **PR #134** (`opencode/issue70-20260824084626`, head `c14ed27455` ls-remote-verified, MERGEABLE, unchanged since 08:51:22Z): two-knob model switch to `deepseek-v4-flash-free` (13 pins + opencode.json `model`; `small_model` untouched at `mimo-v2.5-free`). Review round 1 (run 32709051764) concluded GREEN BUT SILENT: zero verdict, zero findings, zero failed steps in the job (continue-on-error masking, silent variant). RE-FIRED as attempt 2 via this run's decision list against the verified stable head. TRIPWIRE: second consecutive green-but-silent round => lab escalation with BOTH run IDs (32709051764 + new); no third blind fire. Findings (if any) => `{"action":"lab","pr":134}` - NEVER fix/continue an infra PR.
- **PR #131** (`opencode/issue130-20260823163248`, MERGEABLE, head MOVING under active build; tip `6377ee0d4` pushed 11:50:54Z mid-survey). Builder run 32720650004 IN PROGRESS since 11:12:20Z (owner's build trigger after the re-scope handoff). D-series underway: `100800731` spec addendum (I7 instrumentation contract), `7824998b7` D1 blend core (decoder-mirrored NLMS over L/T/TL/plane bases), `9d52ff0ae` D0 bench-ideal CLI (static-entropy brackets, three modes), `6377ee0d4` D1 anchored blend mode (fixed MED anchor + adaptive corrections, identity at init).
- Architect re-scope DONE (`73adced04` blueprint `architecture-jxl-parity-rescope.md` + `e5bdceb6f` wiring): static transforms + static context refinement closed by measurement; remaining levers = L1 adaptive prediction blending + L2 collection efficiency (K=4 mixer + SSE); phases D0-D4; binding stop-and-decide if M3 stays open after D4. Note for lab ledger: run 32707131429 died twice to stream errors then self-recovered and completed ON THE OLD PIN - instability looks bursty-window-shaped, not context-load-shaped.
- Pages green (dispatch success 11:47:23Z). Benign pending sibling opencode run 32723657576 expected to self-skip (watch-only).

## IN FLIGHT
- Builder run 32720650004 on #131 (D0+D1 landing progressively; expect completion summary + handoff decision file).
- Review attempt 2 on PR #134 (trigger posts from this run's decision list).

## PIPELINE POSITION (#130)
research DONE -> architect DONE (C-series + D-series re-scope) -> build IN PROGRESS on D-series (D0 harness + D1 blend core/anchored mode landing; D2 mixer+SSE next; D3 = dual-unit checkpoint + review boundary; D4 stretch stack, then stop-and-decide if M3 open) -> review round 2 at the post-D-phase boundary (automatic-first; crash-parity guard armed) -> freeze blocks maintainer merge until dual-unit M2 AND M3 genuinely pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read Builder run 32720650004's outcome on #131 (posted summary + commits API, never memory alone). Clean handoff => let the AUTOMATIC review take the post-D-phase boundary (manual fire ONLY if demonstrably failed). Death => error-class inspection before any retry (one same-error retry max, then lab with run IDs).
2. Read review attempt 2 on #134 (COMMENT plus JOB LOG, never green status alone). Approve => verify Tester auto-forwarded (`/oc test` present); when `/oc approve-test` arrives MERGE #134 (`--rebase --delete-branch`), verify main advanced past `9bb40298b`, dispatch pages if silent. Findings => `{"action":"lab","pr":134}`. Green-but-silent AGAIN => lab escalation with both run IDs.
3. Watch pending opencode sibling 32723657576 self-skips.
4. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. At eventual #131 merge: hard-rule orphan check with freshly fetched objects (server-side evidence says PASS; base f8a958d70e48).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - daily Auditor report current (01:16:33Z); model-stability escalation chain resolved via #134.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will D1 blended prediction clear its >= 2 percent acceptance bar and D2 its >= 3 percent? Honest rejection recorded like C2/C2b/C4/C5 is an acceptable outcome under the rescope discipline.
- Will deepseek-v4-flash-free prove more stable than x-preview once #134 lands? First stress test = the post-merge phases. Falsification watch: same signature on the NEW pin kills pin-instability theory => retry-parity ask.
- If M3 stays open after D4, the rescope BINDS everyone to stop and surface the owner decision instead of drifting. Hold that line when it comes.

- Mae, the Maintainer
