# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (~13:10Z, maintainer run 32730587359, schedule event; absorbed the window while sibling 32730292781 from the owner's 13:01:41Z ping was in flight). D3 continuation death verified + crash-parity guard FALSE-POSITIVE diagnosed; one sanctioned manual retry dispatched; guard bug escalated to lab.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates.
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. Corpus truth: e1 = 10.2904 / 3.4301; e3/e7 = 10.2861 / 3.4287 - about 19 percent above JXL parity at e1.
- **#134 HOLD (2026-08-24T12:07:26Z, owner on the PR thread):** "keep it in draft... wait for my action." Do NOT merge, test, review-fire, or convert #134 until the owner releases. Re-verified isDraft=true this run.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** unchanged. Old pin `x-preview-f-free` still serving everything until #134 merges; strikes remain bursty-window-shaped (13:01Z death inside otherwise-clean stretches).
- **NEW BUG (escalated this run):** opencode.yml build-mode "Verify build pushed, else auto-retry" compares the PR branch head against BASELINE_HEAD captured from MAIN's sha. Any mid-session agent death on an ahead-of-main branch reads as pushed-successfully and silently skips ALL 3 crash-parity auto-retries. Proven with run 32730117593's job log ("Build pushed successfully: ... moved 9bb40298b -> ca5ce5e53" while ca5ce5e53 landed 12 minutes BEFORE the run and the session died seconds earlier). Lab owns the fix via #70.
- **PR #131** (`opencode/issue130-20260823163248`, head `ca5ce5e53ddda6534b81a0d8d853bf30be746f14`, MERGEABLE): D-series so far: D0 DONE (bench-ideal harness + I7 + A2 magnitude retraction), D1 DONE (adaptive blended prediction REJECTED offline), D2 DONE (K=4 mixer + SSE REJECTED offline, FAIL by 3.3x vs >= 3 gate). D3 checkpoint NOT yet run - first continuation died to APIError at 13:01:36Z ~100s in, zero pushes; manual retry dispatched this run.
- **PR #134** (`opencode/issue70-20260824084626`, head `c6adb5a6d4`, MERGEABLE, DRAFT): two-knob model switch to deepseek-v4-flash-free parked per owner hold. Zero action until release.

## IN FLIGHT
- Builder D3 retry on #131 (trigger posted by hardcoded step from this run's decision list). NEXT RUN reads its outcome FIRST - comment plus job log plus the verify step's output line (bug known).
- Lab Engineer bug-fix response on #70 (baseline-bug evidence package delivered).
- Sibling maintainer 32730292781 was in flight at finalize time - reconcile any duplicate triggers it posted next sweep (build-mode queueing + reviewer concurrency absorb dupes).

## PIPELINE POSITION (#130)
research DONE -> architect DONE -> build IN PROGRESS: D0/D1/D2 done (two honest offline rejections), **D3 dual-unit checkpoint RETRY DISPATCHED** -> review round 2 takes the stable handoff boundary automatic-first (manual fire ONLY if demonstrably failed; checklist additions binding: A2-retraction scrutiny, I7 citability, D1/D2 rejection chains, mixer mirrors, addendum 12 consistency, standing items) -> gated D4 items (zero-run mode first) -> FORMAL owner stop-and-decide if M3 stays open after exhaustion -> freeze blocks any merge until dual-unit M2 AND M3 pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTIONS, three threads: (a) read the D3 retry outcome on #131 (comment + job log + verify-step output). Clean handoff => automatic review round 2 takes the boundary; manual fire only if demonstrably failed. Same-error death AGAIN => lab escalation WITH the retry chain (32730117593 + new run ID); no third blind fire. (b) Read lab's response on #70; fix lands via its own reviewed PR. (c) Confirm sibling 32730292781 stood down or reconcile duplicates.
2. #134: NO action of any kind while the owner hold stands. On release: review automatic-first => approve-test => merge `--rebase --delete-branch` with fresh-object orphan check => verify main advances past `9bb40298b` => pages check => falsification watch begins on the new pin.
3. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. #131 eventual preconditions: dual-unit pass + review approve + test approve + orphan check (server-side evidence PASS; base f8a958d70e48).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - baseline-bug escalation live here; daily Auditor report current (01:16:33Z).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will the D3 retry survive a strike window, and do its fresh both-units numbers confirm e1 10.2904/3.4301 unchanged?
- How fast does the Lab Engineer fix the verify-baseline bug, and does it also audit sibling guards (review crash-parity counter) for the same stale-target class?
- When will the owner release the #134 hold? Post-switch strike behavior decides the pin-instability theory.
- Will the owner rule early on honest closure vs stretch before D4 exhausts? Either answer is executable within one run.

## STANDING LESSONS (in force)
- Verdicts post as ISSUE COMMENTS while pulls/reviews API can stay empty - paginate the FULL comment timeline over the whole window before declaring any gate silent.
- Read COMMENT plus JOB LOG, never green status alone; NEW (this run): a green self-heal step is not evidence of health when its COMPARISON TARGET can be stale - audit guards for what they measure, not whether they ran.
- Topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until root cause fixed; ephemeral numbers are not evidence (I7).

- Mae, the Maintainer
