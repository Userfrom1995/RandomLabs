# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~13:28Z, maintainer run 32732361709, owner comment event on #131 - one of a triple ping batch). D3 strike THREE verified (owner-triggered, same transient class); Lab Engineer confirmed ALIVE mid-mandate past the strike window; zero pipeline triggers fired; evidence addendum pinged to #70.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** unchanged. Old pin `x-preview-f-free` still serving everything until #134 merges; strikes remain bursty-window-shaped (three deaths 13:01-13:24Z inside one window).
- **D3 STRIKE CHAIN (complete evidence for lab):** opencode runs 32730117593 (13:01:36Z) + 32731034268 (13:11:20Z) + 32732344363 (13:24:34Z, owner-triggered) - all `APIError: Provider finish_reason: network_error`, all ~90-110s into sessions, all zero-side-effect (head unchanged `ca5ce5e53d`). Build-mode auto-retry guard failed to engage after all three (baseline-comparison bug, escalated to lab via #70).
- **Lab Engineer LIVE on the mandate:** run 32732032339 in_progress since 13:19:40Z (alive ~8 min at survey, past strike signature window), backed by the owner's own `/oc lab` x2 on #70. Queued duplicate lab run 32732347190 still pending - watch next sweep.
- **PR #131** (`opencode/issue130-20260823163248`, head `ca5ce5e53ddda6534b81a0d8d853bf30be746f14`, MERGEABLE): D-series so far: D0 DONE (bench-ideal harness + I7 + A2 magnitude retraction), D1 DONE (adaptive blended prediction REJECTED offline), D2 DONE (K=4 mixer + SSE REJECTED offline, FAIL by 3.3x vs >= 3 gate). D3 dual-unit checkpoint BLOCKED pending lab verdict - no Builder retries fire until root cause fixed.
- **PR #134** (`opencode/issue70-20260824084626`, head `c6adb5a6d4`, MERGEABLE, DRAFT): two-knob model switch to deepseek-v4-flash-free parked per owner hold. Zero action until release.

## IN FLIGHT
- Lab Engineer diagnosis + fix on #70 (run 32732032339 live; fix lands via its own reviewed PR).
- Queued duplicate lab 32732347190 - must stand down or be reconciled.
- NOTHING else repo-wide; pipeline parked cleanly at the D3 phase boundary.

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build IN PROGRESS: D0/D1/D2 done (two honest offline rejections), **D3 checkpoint BLOCKED pending lab verdict** -> review round 2 takes the stable post-D3 boundary automatic-first (manual fire ONLY if demonstrably failed; checklist additions binding: A2-retraction scrutiny, I7 citability, D1/D2 rejection chains, mixer mirrors, addendum 12 consistency, standing items) -> gated D4 items (zero-run mode first) -> FORMAL owner stop-and-decide if M3 stays open after exhaustion -> freeze blocks any merge until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTIONS, two threads: (a) read the Lab Engineer's verdict on #70 (comment + its PR if the fix landed there). Confirmed-fix-live => exactly ONE clean D3 resume fires on #131; then review round 2 takes that boundary automatic-first. Lab dead once => error-class inspection, ONE sanctioned retry of lab itself. Lab dead twice AND production halted => emergency contract becomes arguable (still not automatic). (b) Verify queued lab dup 32732347190 stood down or reconcile what it posted (two lab sessions on one mandate must not collide).
2. #134: NO action of any kind while the owner hold stands. On release: review automatic-first => approve-test => merge `--rebase --delete-branch` with fresh-object orphan check => verify main advances past `9bb40298b` => pages check => falsification watch begins on the new pin.
3. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. #131 eventual preconditions: dual-unit pass + review approve + test approve + orphan check (server-side evidence PASS; base f8a958d70e48).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - active lab mandate: provider-strike diagnosis + auto-retry/baseline-bug fix; full three-run evidence chain delivered.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- What is the Lab Engineer's root-cause verdict on the bursty strikes, and does the pin-switch (#134) become the controlled experiment once released?
- Does the queued duplicate lab run stand down cleanly?
- Will the owner release the #134 hold this window? Post-switch strike behavior decides the pin-instability theory.
- Will the owner rule early on honest closure vs stretch before D4 exhausts? Either answer is executable within one run.

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline over the whole window before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; a green self-heal step is not evidence of health when its COMPARISON TARGET can be stale - audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until root cause fixed (now demonstrated at strike three: no blind retries from anyone, manual triggers included); ephemeral numbers are not evidence (I7).

- Mae, the Maintainer
