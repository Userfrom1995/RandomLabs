# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32626210687, owner `/oc maintainer` on PR #118). CORRECTION: the JXL gate is NOT cleared. The earlier "3.68 bpp / gate cleared" belief in run 32625553663's STATE/log was a misread - PR #121 is a merged **architect blueprint doc**, not a gate-clearing build. PR #118 is the only active Prism codec build and sits at 11.024 bpp (B5.49); the gate (JXL < 8.71) is firmly UNMET.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104):** target beat JPEG XL (~8.71 bpp on Kodak). M1-M4 via #117 + PR #118. **GATE NOT MET** - best real-Kodak is 11.024 bpp (B5.49), far above 8.71. Owner override stands: NO merge until M0+M1+M2+M3 met bit-exactly on REAL Kodak.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`). Loop runs unbounded.
- **MODEL SWITCH (APPLIED run 32625331911 via PAT push wall):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism priority; board #42 parked until Prism resolves. Owner now additionally wants Prism DONE - explicitly asked to "use lab engineer to do this." Lab Engineer is infra-only + unwired (NO-OP), so codec completion routes Research->Builder, which I initiated.
- **Quality-gate directive:** quality gates are the ONLY merge criteria (unmet).
- **`/oc lab` is a NO-OP:** model switches handled by Mae directly via the WORKFLOW-FILE PUSH WALL (PAT push step commits to main). The Lab Engineer cannot be invoked because `opencode.yml` has no `lab` job.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `52d775ed24dba42824a00f7473a1fcd0e94d273d`** (plus merged blueprint #121 on top). Both Prism branches are CLEAN DESCENDANTS of `main` (verified). PR #118 head `a30ef699` shares history with main - NOT orphan, safe to rebase-merge later (after gate met).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`); a genuine duplicate trigger is only created by a SECOND `/oc continue`/`/oc build`/`/oc review` on the SAME issue while one is already in flight.
- **KODAK CORPUS:** real 24-image set pinned at `prism/benchmarks/data/kodak.sha256`. Gate IS measurable and HAS been measured (11.024 bpp, failing).
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the PAT push wall, never through a build/fix/continue run.
- **LAB JOB GAP (owner action):** `opencode.yml` has no `lab` job; `/oc lab` is a NO-OP. Wiring it (or authorizing Mae to) is required for The Lab Engineer to run infra fixes (silent-stall / circuit-breaker logic).

## IN FLIGHT (builds)
- **PR #118 (Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `a30ef699` (B5.49, 11.024 bpp, byte-exact). OPEN, CONFLICTING (needs rebase onto `main` which now has merged blueprint #121). Two opencode builds queued: `32626205000` (in_progress, head `b42cca5`) + `32626210656` (pending) - both triggered by owner `/oc continue` (07:40:49Z) + `/oc maintainer` (07:40:57Z). The in-flight build is another B5.x increment (saturated, will NOT clear gate).
  - **Research dispatched this run:** `{"action":"research","pr":118}` -> `/oc research` to design the B7 Squeeze+MA-tree greedy-split algorithm (the gate-blocking crux). Posted to PR #118 for the next build to consume.
  - KEPT OPEN (gate unmet). Do not merge.

## PENDING (in order)
    1. **Research** (just dispatched, `/oc research` on PR #118) must deliver a concrete, implementable MA-tree greedy-split design (mandatory `llc_class`/`sibling_class`, R11-A never-expand guard, depth 6, leaves 16-32).
    2. **Builder** must implement B7 (Squeeze + MA-tree) on PR #118 - STOP further B5.x increments. This is the only path to the JXL < 8.71 gate.
    3. Once B7 lands and real-Kodak < 8.71: Reviewer (`/oc review`) -> Tester (`/oc test`) -> Maintainer merge (rebase, delete-branch), verify non-orphan, then reopen/close #117 correctly (it was closed prematurely while gate unmet).
    4. **Owner action:** either wire a `lab` job (so The Lab Engineer can fix silent-stall/circuit-breaker infra) or authorize Mae to, OR accept that codec completion routes via Research->Builder.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #118.
- **#117 (Prism M1-M4)** - CLOSED (prematurely; gate UNMET). Should be reopened once B7 lands and gate clears, OR kept closed only after a real gate-clearing merge. Flagged for correction.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked, revisit after Prism merge.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 / #119 / #120 / #122 / #123** - CLOSED.
- **#121 (Architect blueprint)** - MERGED (doc only: `prism/docs/architecture-m1-m4.md` + FIFO coder/R11-A decision). NOT a gate-clearing build.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `52d775ed24dba42824a00f7473a1fcd0e94d273d` (blueprint #121 merged on top).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized, on main).
- **Lab Engineer:** `/oc lab` is a NO-OP; model switches via WORKFLOW-FILE PUSH WALL.
- **Circuit breaker:** REMOVED.

## NEXT STEPS
    1. Research (`/oc research`, in flight on PR #118) delivers B7 MA-tree greedy-split spec.
    2. Builder implements B7 (Squeeze + MA-tree, mandatory `llc_class`/`sibling_class`, R11-A never-expand) - stops B5.x loop.
    3. Real-Kodak harness must show < 8.71 (JXL) for M3 (and < 9.61 WebP M1, < 9.71 JPEG-LS M2) bit-exactly.
    4. Reviewer -> Tester -> Maintainer merge PR #118; correct #117 closure.

## OPEN QUESTIONS
- Research: can a concrete MA-tree greedy split (mandatory `llc_class`/`sibling_class`) be specified that the Builder can implement to clear JXL 8.71 on real Kodak?
- Builder: will it actually implement B7 this time, or defer again behind B5.x?
- Owner: confirm codec completion routes via Research->Builder (Lab Engineer is infra-only + unwired), or authorize wiring a `lab` job for infra fixes?
- After gate: is #118's residual B5.x value worth folding, or leave as historical (never delete branch)?

- Mae, the Maintainer
