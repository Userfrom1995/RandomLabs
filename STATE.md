# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32631242450, Brainstorm board #42 pick step after Ideator batch). Prism target ACHIEVED and MERGED (PR #121, 3.675 bpp on real Kodak, clears M3 < 8.71 by 2.37x). Next project PICKED: **Kinetica** (issue #122, physics engine in TypeScript), Researcher dispatched.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** target beat JPEG XL (~8.71 bpp on Kodak). **GATE MET** - real-Kodak mean 3.675 bpp at effort 3/7, verified by building Prism from `main` and running on the 24 real Kodak PPMs in `obsidian/benchmarks/data/kodak/`. Reviewer (`/oc approve`) + Tester (`/oc approve-test`) both green; merged via rebase at `b42cca5`; #117 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`). Loop ran unbounded (moot now Prism is merged).
- **MODEL SWITCH (APPLIED via PAT push wall):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (PR #118 branch `opencode/117-prism-m1-m4-optimization` retained when closed).
- **Owner "don't get distracted" directive (Aug 21):** was "Prism priority; board #42 parked until Prism resolves." Prism is resolved, so the pause was lifted (run 32631001359 re-engaged the Ideator).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. They were met bit-exactly on real data for Prism.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `b42cca5203988e8168d4e327b2d09455c43f1514`** (PR #121 rebased-merged here; contains full Prism codec incl. `prism/include/prism/codec/acoder.h`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded (run 32626208758).
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set confirmed present in-repo at `obsidian/benchmarks/data/kodak/kodim01.ppm … kodim24.ppm`; `prism/benchmarks/data/kodak.sha256` pins those exact hashes. Gate IS measurable and HAS been measured: 3.675 bpp (PASS).
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the PAT push wall, never through a build/fix/continue run.
- **LAB JOB GAP (owner action):** `opencode.yml` has no `lab` job; `/oc lab` is a NO-OP. Wiring it (or authorizing Mae to) is required for The Lab Engineer to run infra fixes (silent-stall / circuit-breaker logic).

## IN FLIGHT (builds)
- **None committed to `main` yet.** PR #122 (Kinetica) issue just opened this run; the **Researcher** (`/oc research`) is dispatched on it. No opencode build in flight yet. No `ideate`/architect/build runs pending beyond the research spike on #122.

## PENDING (in order)
1. **Kinetica build pipeline (just started):** research (solver spec) -> architect (blueprint) -> build (implementation). Researcher dispatched this run on issue #122.
2. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction (double weight) steers.
3. (Optional, not gate-blocking) Squeeze-refinement follow-up on Prism: surface the R11-A-coupled `llc_class`/`sibling_class` MA-tree wins on photographic Kodak (estimator keeps L=0 there because YCoCg+predictor already clear the gate). Route via `architect`/`research` if pursued.
4. **Owner action:** either wire a `lab` job (so The Lab Engineer can fix silent-stall/circuit-breaker infra) or accept that codec completion routes via Research->Builder.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED, correctly (gate met at 3.675 bpp on real Kodak, verified).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; fresh batch posted 09:31Z (Kinetica/Helix/Satyr); Kinetica picked -> issue #122.
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED (superseded by merged #121); branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`. NOT doc-only (verified it contains the complete codec).
- **#122 (Kinetica)** - OPEN (just created this run); Researcher dispatched.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `b42cca5203988e8168d4e327b2d09455c43f1514` (PR #121 merged here).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized).
- **Lab Engineer:** `/oc lab` is a NO-OP; model switches via WORKFLOW-FILE PUSH WALL.
- **Circuit breaker:** REMOVED.

## NEXT STEPS
1. Await Researcher output on issue #122 (Kinetica solver spec); route Architect -> Builder.
2. After Kinetica ships, pick the next board candidate (Helix/Satyr/parked); owner reaction steers.
3. Optional Squeeze-refinement enhancement on Prism - architect/research if desired.
4. Owner: consider wiring a `lab` job for infra self-repair.

## OPEN QUESTIONS
- Owner: accept codec completion routed via Research->Builder (Lab Engineer infra-only + unwired), or authorize wiring a `lab` job for infra fixes?
- After Kinetica: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)
- Follow-up value: is Squeeze-refinement on photos worth a dedicated build, or is the current 3.675 bpp (2.37x JXL) sufficient as the shipped result?

- Mae, the Maintainer
