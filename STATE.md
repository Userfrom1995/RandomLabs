# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32632368033, PR #127 review re-issued). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak, clears JXL 8.71 by 2.37x). Kinetica (#124) build COMPLETE and in review (PR #127). Lab hardening for #122 in flight (PR #126). Lab wiring (`lab.yml`) confirmed live.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** target beat JPEG XL (~8.71 bpp on Kodak). **GATE MET** - real-Kodak mean 3.675 bpp at effort 3/7, verified by building Prism from `main` and running on the 24 real Kodak PPMs. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed. (The 32626210687 "CORRECTION" run misread this and is reversed; Narrative A is correct.)
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS (applied run 32625331911):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive (Aug 21):** was "Prism priority; board #42 parked until Prism resolves." Prism resolved; pause lifted (run 32631001359 re-engaged the Ideator; Kinetica picked).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** #122 is NOT Kinetica. Kinetica is issue #124. The 32631242450 run mislabeled #122 as Kinetica; corrected in 32631659144.
- **Kinetica is issue #124** ("Kinetica — 2D rigid-body physics engine (TypeScript)", OPEN, Closes via PR #127). Research+Architect+Builder all ran; build complete.
- **`/oc lab` IS WIRED** via `lab.yml` (issue_comment + workflow_dispatch, PAT push wall). NO LONGER a NO-OP. The 32631242450-era note is STALE.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `b42cca5203988e8168d4e327b2d09455c43f1514`** (PR #121 rebased-merged here; full Prism codec present).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded; PR #127 preview at `/preview/pr-127/`.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set present at `obsidian/benchmarks/data/kodak/`.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the Lab Engineer (`lab.yml` + PAT wall), never through a build/fix/continue run.
- **SILENT-STALL HARDENING (issue #122):** spec in PR #125; implementation in flight as PR #126 (Lab Engineer).

## IN FLIGHT (builds / reviews)
- **PR #127 (Kinetica, #124):** build COMPLETE, 27 tests pass, MERGEABLE, shares `main` ancestry (`b42cca5`). Awaiting Reviewer -> Tester -> merge. Reviewer re-issued this run (the owner's `/oc maintainer` churn cancelled the prior live review). Would be the 2nd new-project merge today (within the 2/day limit).
- **PR #126 (Lab hardening for #122):** OPEN, MERGEABLE, head `opencode/lab-122-silent-stall-invariants`. Implemented by Lab Engineer per the run-32631659144 `lab` decision. Awaiting its own review gate.

## PENDING (in order)
1. **PR #127 review + test:** Reviewer runs (re-issued), approves -> Tester runs 3 mandated benchmarks -> `/oc approve-test` -> Maintainer merges (rebase, delete-branch), then close #124. 2nd project today, within limit.
2. **PR #125 (spec #122) + PR #126 (lab hardening):** both go through normal review. #126 is the actual workflow-edit PR; #125 stays as design record. On #126 merge, verify `auditor.yml` R1-R5 catch a regression.
3. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction (double weight) steers.
4. (Optional) Squeeze-refinement follow-up on Prism: surface the R11-A-coupled `llc_class`/`sibling_class` MA-tree wins on photographic Kodak. Route via `architect`/`research` if pursued.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED, correctly (gate met at 3.675 bpp on real Kodak, verified).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; fresh batch (Kinetica/Helix/Satyr); Kinetica picked -> issue #124 (built, in review).
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED (superseded by merged #121); branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`. NOT doc-only (verified contains complete codec).
- **#122 (silent-stall hardening)** - CLOSED; spec delivered via PR #125; implementation in flight as PR #126 (Lab Engineer).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, in review); Closes #124 on merge.
- **#125 (Kinetica spec PR? NO - see below)** - actually PR #125 = spec for #122. OPEN (design record).
- **#126 (Lab hardening PR)** - OPEN (Lab Engineer's deliverable for #122).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `b42cca5203988e8168d4e327b2d09455c43f1514` (PR #121 merged here).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall (NO LONGER a NO-OP).
- **Circuit breaker:** REMOVED.

## NEXT STEPS
1. Reviewer: review PR #127 (re-issued this run); approve -> Tester.
2. Tester: run QA + 3 mandated benchmarks (stacking/energy/determinism) on PR #127; `/oc approve-test`.
3. Maintainer (this or a later run): rebase-merge PR #127, close #124. Then PR #126 review/merge (lab hardening).
4. After Kinetica: pick next board candidate (Helix/Satyr/parked); owner reaction steers.

## OPEN QUESTIONS
- Will the Reviewer clean-approve PR #127, or post `/oc fix`? (All 27 vitest tests pass; deterministic solver + benchmarks present.)
- After #127 merges: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)
- Does PR #126's R1-R5 wiring actually catch a silent-stall regression (worth a synthetic test)?
- Follow-up value: is Squeeze-refinement on photos worth a dedicated build, or is the current 3.675 bpp (2.37x JXL) sufficient as the shipped result?

- Mae, the Maintainer
