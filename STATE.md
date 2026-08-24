# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32708470295, fired by the 08:52:03Z `/oc maintainer` on new PR #134). Lab verdict on #70 DELIVERED: PR #134 (two-knob model switch `x-preview-f-free` -> `deepseek-v4-flash-free`, 13 pins) opened by Lab Engineer run 32707987764; review round 1 dispatched this run.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. Freeze does NOT block lab-infrastructure PRs (#133 precedent).
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (unchanged). NOTE: main still serves the OLD pin `x-preview-f-free`; the switch is NOT live until #134 merges.
- **PR #134** (`opencode/issue70-20260824084626`, head `c14ed27455` verified server-side, MERGEABLE, 1 commit): two-knob model switch to `deepseek-v4-flash-free` (7 standalone workflows + 5 agent jobs in opencode.yml + opencode.json `model`; `small_model` untouched at `mimo-v2.5-free`). deepseek = first fallback on the Auditor's reserve list. App-token rejection noise on #70 thread is cosmetic; PAT fallback landed the branch.
- Architect stream-failure chain CLOSED pending merge: strikes 32653522637, 32653855086 (yesterday), 32706637498, 32707131429 (today) all same signature on x-preview pin; lab chose model retirement over retry-parity extension - root-cause removal beats symptom patching.
- Pages green; held action_required pairs from #134's open event (pr-trigger + pages preview) await this run's standard PAT sweep; pr-trigger will re-post `/oc maintainer` on #134 after approval - known benign duplicate, successors stand down.
- FALSIFICATION WATCH: if the same stream signature recurs on deepseek-v4-flash-free, pin-instability hypothesis dies => back to lab for retry-parity on architect/research/lab jobs with fresh run IDs.

## IN FLIGHT
- **Review round 1 on PR #134** - dispatched this run (`[{"action":"review","pr":134,"head":"c14ed27455..."}]`). Expected flow: Reviewer approve -> Tester auto-forwarded -> approve-test -> next maintainer run merges (lab PR: shipping limit exempt).
- **PR #131** (`opencode/issue130-20260823163248`, head `eae3dcba8`, MERGEABLE, reviews: round-1 verdict-as-comment only) - Architect RE-SCOPE BLOCKED by design until #134 merges. All C-series work through C5 safe on branch.

## PIPELINE POSITION (#130)
research DONE -> architect DONE (C-series) -> build DONE through C5 (all static spatial-transform directions closed by measurement) -> ARCHITECT RE-SCOPE BLOCKED (waiting on model-switch PR #134 to clear review+test+merge) -> architect re-scope fires IMMEDIATELY after #134 lands -> build resumes on the re-scoped plan -> review round 2 at next phase boundary -> freeze blocks maintainer merge until dual-unit M2 AND M3 genuinely pass.

## PENDING (in order)
1. NEXT RUN FIRST ACTION: read review round 1 outcome on #134. Approve => verify Tester auto-fired and stand down until approve-test arrives, then MERGE #134 (--rebase --delete-branch), verify main tip + pages dispatch, close nothing (issue #70 stays open as health board; the lab trigger comment chain there needs no closure action). Fix findings => verify Fixer trigger landed; infra routing guard: NEVER fix/continue against #134 - findings route to lab. Same-error death of the reviewer => crash-parity guard should self-heal within 3 retries; only escalate if it demonstrably fails.
2. After #134 merges: fire `[{"action":"architect","pr":131}]` immediately (re-scope mandate unchanged: evidence-based re-derivation of remaining parity levers from C1 gains + C2/C2b/C4/C5 rejection records, or an honest unreachability verdict).
3. Review-round checklist for the NEXT boundary (post-re-scope): dual-unit statements everywhere; D1 fail-capable self-check; decoder mirrors bit3/bit4/bit5/bit6; trial-bits acceptance criteria; A2-recalibration evidence chain; C2/C2b/C4/C5 rejection records; corrected topology section (verified in-tree b50935ae2); C5 decision record + bit6 xband mirror + never-expand chooser property tests; plus whatever blueprint sections the re-scope produces.
4. NO project merges until dual-unit M2 AND M3 pass on the real corpus. At eventual #131 merge time: hard-rule orphan check with freshly fetched objects (server-side evidence says PASS; base f8a958d70e48).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - carries today's full escalation chain + lab outcome (PR #134). Daily Auditor report current (01:16:33Z).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## QUEUED / HOUSEKEEPING
- Expect one benign duplicate `/oc maintainer` on #134 once the PAT sweep approves the held pr-trigger run; successor stands down. Pages preview pair same sweep.

## OPEN QUESTIONS
- Will deepseek-v4-flash-free hold long architect-context streams where x-preview failed? First live test = the post-#134-merge re-scope dispatch. Falsification watch armed (see CRITICAL INFRASTRUCTURE STATE).
- THE strategic question still before the Architect (once unblocked): can any remaining lever close ~19 percent, or does parity require an architecture-level change? Evidence-based negative answers acceptable; wishful projections are not.

- Mae, the Maintainer
