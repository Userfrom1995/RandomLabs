# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32628020223, owner comment on issue #121). REVERSAL OF PRIOR "CORRECTION": the JXL gate IS cleared. The "gate unmet / #121 is a blueprint doc only" belief in run 32626210687 was itself a misread. PR #121 is the full B5-B11 Prism codec build, merged to `main` at `b42cca5`, and its real-Kodak benchmark (3.675 bpp, verified independently from source this run) clears M3 < 8.71 by 2.37x. Issue #117 is correctly CLOSED.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** target beat JPEG XL (~8.71 bpp on Kodak). **GATE MET** - real-Kodak mean 3.675 bpp at effort 3 (and 7), verified by building Prism from `main` and running on the 24 real Kodak PPMs in `obsidian/benchmarks/data/kodak/`. Reviewer (`/oc approve`) + Tester (`/oc approve-test`) both green; merged via rebase at `b42cca5`; #117 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`). Loop runs unbounded.
- **MODEL SWITCH (APPLIED run 32625331911 via PAT push wall):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism priority; board #42 parked until Prism resolves. Owner additionally wanted Prism DONE ("use lab engineer") - but `/oc lab` is a NO-OP (infra-only + unwired), so codec completion correctly routed Research->Builder, which delivered and merged via #121.
- **Quality-gate directive:** quality gates are the ONLY merge criteria. They were met bit-exactly on real data.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `b42cca5203988e8168d4e327b2d09455c43f1514`** (PR #121 rebased-merged here; contains full Prism codec incl. `prism/include/prism/codec/acoder.h`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded (run 32626208758).
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`); a genuine duplicate trigger is only created by a SECOND `/oc continue`/`/oc build`/`/oc review` on the SAME issue while one is already in flight.
- **KODAK CORPUS:** real 24-image set confirmed present in-repo at `obsidian/benchmarks/data/kodak/kodim01.ppm … kodim24.ppm` (verified). `prism/benchmarks/data/kodak.sha256` pins those exact hashes. Gate IS measurable and HAS been measured: 3.675 bpp (PASS).
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the PAT push wall, never through a build/fix/continue run.
- **LAB JOB GAP (owner action):** `opencode.yml` has no `lab` job; `/oc lab` is a NO-OP. Wiring it (or authorizing Mae to) is required for The Lab Engineer to run infra fixes (silent-stall / circuit-breaker logic).

## IN FLIGHT (builds)
- **None.** PR #121 (the Prism M1-M4 build) is MERGED. PR #118 was the earlier/superseded branch and is now CLOSED (branch `opencode/117-prism-m1-m4-optimization` retained, never deleted). No opencode builds are in flight.

## PENDING (in order)
1. (Optional, not gate-blocking) Squeeze-refinement follow-up: make the R11-A-coupled `llc_class`/`sibling_class` MA-tree wins visible on photographic Kodak (currently the estimator keeps L=0 there because YCoCg+predictor already clear the gate). Route via `architect`/`research` if pursued.
2. Revisit Brainstorm board #42 for the next lab phase now that Prism is done.
3. **Owner action:** either wire a `lab` job (so The Lab Engineer can fix silent-stall/circuit-breaker infra) or accept that codec completion routes via Research->Builder.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED, and the closure is NOW CORRECT (gate met at 3.675 bpp on real Kodak, verified). The earlier "closed prematurely" flag from run 32626210687 is reversed.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked, revisit now that Prism is merged.
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED this run (superseded by merged #121); branch retained.
- **#121 (Architect blueprint + full B5-B11 build)** - MERGED to `main` at `b42cca5`. NOT a doc-only PR (it contains the complete codec); the run 32626210687 "blueprint only" claim was a misread and is reversed.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `b42cca5203988e8168d4e327b2d09455c43f1514` (PR #121 merged here).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized, on main).
- **Lab Engineer:** `/oc lab` is a NO-OP; model switches via WORKFLOW-FILE PUSH WALL.
- **Circuit breaker:** REMOVED.

## NEXT STEPS
1. Prism target is achieved and merged; no further codec work is blocking.
2. Optional Squeeze-refinement enhancement (surface `llc_class`/`sibling_class` wins on photos) - architect/research if desired.
3. Revisit Brainstorm board #42 for next project.
4. Owner: consider wiring a `lab` job for infra self-repair.

## OPEN QUESTIONS
- Owner: accept codec completion routed via Research->Builder (Lab Engineer infra-only + unwired), or authorize wiring a `lab` job for infra fixes?
- Follow-up value: is Squeeze-refinement on photos worth a dedicated build, or is the current 3.675 bpp (2.37x JXL) sufficient as the shipped result?
- After Prism: which Brainstorm (#42) candidate becomes the next build?

- Mae, the Maintainer
