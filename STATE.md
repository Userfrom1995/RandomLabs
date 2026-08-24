# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32724568069, woken by the owner's 11:57:57Z ping on PR #131). Both live threads are owned by healthy runs; zero triggers fired this run; one public record correction delivered (predecessor's silent-green misread on #134).

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. Freeze does NOT block lab-infrastructure PRs (#134 is exactly that).
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units. No parity claim exists; e1 truth (~10.2904 / 3.4301) is ~19 percent above JXL parity.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (ls-remote this run). Main still serves the OLD pin `x-preview-f-free`; the switch is NOT live until #134 merges.
- **PR #134** (`opencode/issue70-20260824084626`, head `c14ed27455`, MERGEABLE, branch unchanged since 08:51:22Z): two-knob model switch to `deepseek-v4-flash-free` (13 pins + opencode.json `model`; `small_model` stays `mimo-v2.5-free`). CORRECTED LINEAGE (my predecessor's silent-green diagnosis was FALSE): review round 1 delivered its verdict at 09:03:17Z - all 13 pins verified correct, ONE blocking metadata finding: PR body `Closes #70` must become `Refs #70` (would otherwise auto-close the permanent Lab Health board on merge). Attempt 2 (trigger 11:57:49Z, run 32724556075) died ~100s in to a transient provider stream error; the crash-parity guard's auto-retry round re-confirmed the identical single finding at 12:02:32Z. The owner's lab trigger at 12:02:34Z spawned Lab Engineer run 32724971623, which owns the body fix NOW. After it lands: next review round should approve -> Tester -> I merge (`--rebase --delete-branch`, fresh-object orphan check first), verify main advances past `9bb40298b`, dispatch pages if silent.
- **PR #131** (`opencode/issue130-20260823163248`, MERGEABLE, head `276d594c0`): Builder run 32720650004 completed cleanly at 11:57:28-49Z - D0 instrumentation harness landed (bench-ideal CLI + probe_ideal.sh rail, self-checks fail-capable); MATERIAL FINDING: old A2 oracle aggregates proven nonreproducible + information-theoretically impossible, magnitudes retracted with evidence + decision record, harness-citable replacements pinned (real v2 -5.53 pct vs fine-bin conditional ideal -12.61 pct = ~7 pts collection headroom for D2). D1 blended prediction honestly REJECTED offline per rescope STOP rule (+0.25 pct WORSE than MED best-case kodim13; mixed sign corpus-wide) - zero format bytes spent. Owner continuation trigger 11:57:54Z spawned Builder run 32724563242, ACTIVE since 11:58:02Z, queue = D2 collection efficiency (K=4 mixer + SSE) offline-first on the committed harness.

## IN FLIGHT
- Builder run 32724563242 on #131 (D2 offline validation; format work ONLY if its gate passes).
- Lab Engineer run 32724971623 on #134 (one-line body edit `Closes #70` -> `Refs #70`).
- Review crash-parity guard armed on #134 (1 of 3 auto-retries consumed).

## PIPELINE POSITION (#130)
research DONE -> architect DONE (C-series + D-series rescope) -> build IN PROGRESS: D0 DONE (harness), D1 DONE (offline rejection), D2 ACTIVE (mixer+SSE offline-first), D3 = dual-unit checkpoint + review boundary, D4 stretch stack -> BINDING stop-and-decide if M3 stays open after D4 -> review round 2 takes the NEXT PHASE BOUNDARY per tracker (automatic-first; manual fire only if demonstrably failed; checklist MUST add A2-retraction record + I7 harness-citability) -> freeze blocks maintainer merge until dual-unit M2 AND M3 genuinely pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION (a): read Lab Engineer 32724971623's outcome on #134 BY READING THE PR BODY ITSELF (never green status alone). Fixed => verify next review round fires (automatic; manual only if demonstrably failed) => approve forwards Tester => MERGE on `/oc approve-test` with fresh-object orphan check first => verify main > `9bb40298b` => pages if silent => post-merge falsification watch begins on the new pin. Died AGAIN => error-class inspect; one same-error retry max (strike chain: 32709446002 + new), then escalation with run IDs. Green but body unchanged => silent-lab variant => escalate with both run IDs.
2. FIRST ACTION (b): read Builder run 32724563242's outcome on #131 (comment + commits API). Clean handoff => automatic review takes the next phase boundary (manual ONLY if demonstrably failed); guard self-heals within 3 retries. Death => error-class inspection before any retry; one same-error retry max, then lab with the run-ID chain.
3. Watch pending opencode sibling 32724568018 self-skips.
4. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. At eventual #131 merge: hard-rule orphan check with freshly fetched objects (base f8a958d70e48; server-side evidence says PASS).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - daily Auditor report last confirmed 01:16:33Z thread-side quiet; model-stability escalation chain resolves via #134.
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will D2's K=4 mixer + SSE clear its >= 3 percent bar on the committed harness? Honest rejection recorded like D1 is an acceptable outcome under the rescope discipline.
- Will deepseek-v4-flash-free prove more stable than x-preview once #134 lands? Bursty-window hypothesis strengthened today (strikes 09:04Z + 11:59Z, clean completions between). Same signature on the NEW pin kills pin-instability theory => retry-parity ask to lab.
- If M3 stays open after D4, the rescope BINDS everyone to stop and surface the owner decision instead of drifting. Hold that line when it comes.

## STANDING LESSONS (updated this run)
- Verdicts can post as ISSUE COMMENTS while pulls/reviews API stays empty - always paginate the full comment timeline over the whole relevant window before declaring any gate silent. Two fooled checks in two days trace to partial-window or wrong-surface surveys.
- All prior lessons in force: read COMMENT plus JOB LOG, never green status alone; topology facts only from commits/compare APIs or unshallowed clones; duplicate pings resolve via stand-downs; a twice-failed strategy is disqualified until its root cause is fixed.

- Mae, the Maintainer
