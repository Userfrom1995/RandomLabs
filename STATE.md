# STATE - Random factory checkpoint
- **Updated:** 2026-08-24 (maintainer run 32709071758, woken by the predicted benign duplicate `/oc maintainer` at 08:59:06Z from the approved pr-trigger run). STAND-DOWN RUN: review round 1 on #134 already in flight; decision list EMPTY; nothing dispatched.

## STANDING OWNER DIRECTIVES (active)
- **FREEZE (2026-08-23T16:22Z):** Brainstorm board frozen; NO Ideator dispatches; NO new projects. Prism is the lab's single priority until M2 and M3 genuinely pass under correctly-defined, unit-consistent gates. Freeze does NOT block lab-infrastructure PRs (#134 is exactly that).
- **BINDING TARGET (dual-unit):** M2 summed < 9.498 AND per-sample < 3.166; M3 summed < 8.655 AND per-sample < 2.885, measured against REAL cjxl output (-d0 -e9) on the exact Kodak PPMs of `prism/benchmarks/results/2026-08-23-kodak24-codec-comparison.md`.
- **UNIT VERIFICATION PROTOCOL:** every success claim must cite a fresh reproducible measurement stated in BOTH units.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `9bb40298b`** (ls-remote verified this run). Main still serves the OLD pin `x-preview-f-free`; the switch is NOT live until #134 merges.
- **PR #134** (`opencode/issue70-20260824084626`, head `c14ed27455` ls-remote-verified, MERGEABLE, 1 commit): two-knob model switch to `deepseek-v4-flash-free` (13 pins: 7 standalone workflows + 5 agent jobs in opencode.yml + opencode.json `model`; `small_model` untouched at `mimo-v2.5-free`). REVIEW ROUND 1 IN FLIGHT: opencode-review run 32709051764 (job healthy/in_progress, from the owner's head-tagged `/oc review` at 08:58:53Z).
- Redundant review twin 32709071699 PENDING behind the reviewer concurrency group (spawned by the 08:59:06Z ping batch - non-review `/oc` comments can enqueue review runs). Read-only, same head. Watch-only; round 1 authoritative on divergence; never cancel (not a Maintainer power).
- **PR #131** (`opencode/issue130-20260823163248`, head `eae3dcba8`, UNCHANGED since 08:20:32Z, MERGEABLE) - parked BY DESIGN until #134 merges; all C-series work through C5 safe on branch.
- Pages green (dispatch 32709065212 success 08:59:05Z). FALSIFICATION WATCH armed: same stream signature recurring on deepseek-v4-flash-free kills pin-instability hypothesis => back to lab for retry-parity with fresh run IDs.

## IN FLIGHT
- Review round 1 on PR #134 (run 32709051764) + queued redundant twin (32709071699). Expected flow: approve -> Tester auto-forwarded -> `/oc approve-test` -> next maintainer run MERGES (lab PR: shipping-limit exempt).

## PIPELINE POSITION (#130)
research DONE -> architect DONE (C-series) -> build DONE through C5 (all static spatial-transform directions closed by measurement) -> ARCHITECT RE-SCOPE BLOCKED until #134 clears review+test+merge -> re-scope fires IMMEDIATELY post-merge -> build resumes on re-scoped plan -> review round 2 at next phase boundary -> freeze blocks maintainer merge until dual-unit M2 AND M3 genuinely pass.

## NEXT-RUN PLAYBOOK
1. FIRST ACTION: read round-1 outcome on #134 (posted comment PLUS job log, never just green status). Approve => verify Tester auto-fired (`/oc test` present), stand down until `/oc approve-test` arrives, then MERGE #134 (`--rebase --delete-branch`), verify main tip advanced past `9bb40298b` + pages dispatched (`gh workflow run pages.yml` if silent), close nothing (#70 stays open as health board), then fire `[{"action":"architect","pr":131}]` IMMEDIATELY (re-scope mandate unchanged: evidence-based re-derivation of remaining parity levers from C1 gains + C2/C2b/C4/C5 rejection records, or an honest unreachability verdict).
2. Findings => `{"action":"lab","pr":134}` (infra routing guard: NEVER fix/continue against infra PRs).
3. Reviewer death => crash-parity guard self-heals within 3 auto-retries; escalate to lab only if demonstrably broken.
4. Cross-check twin 32709071699's verdict when it lands; divergence => round 1 authoritative, log it.
5. NO project merges until dual-unit M2 AND M3 pass on real cjxl output. At eventual #131 merge: hard-rule orphan check with freshly fetched objects (server-side evidence says PASS; base f8a958d70e48).

## ISSUES
- **#130** - sole active workstream (Prism true JXL parity); PR #131 carries all phases.
- **#70 (Lab Health)** - carries the full escalation chain + lab outcome (PR #134). Daily Auditor report current (01:16:33Z).
- **#42 (Brainstorm Board)** - OPEN but FROZEN by owner directive.

## OPEN QUESTIONS
- Will deepseek-v4-flash-free hold long architect-context streams where x-preview failed? First live stress test = the post-merge re-scope dispatch.
- Strategic question before the Architect (once unblocked): can any remaining lever close ~19 percent, or does parity require architecture-level change? Evidence-based negatives acceptable; wishful projections are not.

- Mae, the Maintainer
