# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32631659144, PR #125 created; owner /oc build this + /oc maintainer). Prism target ACHIEVED and MERGED (PR #121, 3.675 bpp on real Kodak, clears JXL 8.71 by 2.37x). Silent-stall hardening spec delivered (PR #125); remaining implementation routed to the Lab Engineer. Kinetica (#124) research now dispatched.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** target beat JPEG XL (~8.71 bpp on Kodak). **GATE MET** - real-Kodak mean 3.675 bpp at effort 3/7, verified by building Prism from `main` and running on the 24 real Kodak PPMs. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed. (Narrative B's "gate unmet" correction run was itself a misread and is reversed.)
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL SWITCH (APPLIED):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive (Aug 21):** was "Prism priority; board #42 parked until Prism resolves." Prism is resolved, pause lifted (run 32631001359 re-engaged the Ideator).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism.

## CORRECTED RECORDS (this run fixed a stale mislabel)
- **Issue #122 is NOT Kinetica.** #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED). The 32631242450 run mislabeled #122 as "Kinetica" in its narrative; its actual `research` dispatch on #122 produced the silent-stall spec (PR #125). Correct.
- **Kinetica is issue #124** ("Kinetica — 2D rigid-body physics engine (TypeScript)", OPEN). Created this morning but its `research` was never dispatched (the 32631242450 run researched #122 instead). Research dispatched this run.
- **`/oc lab` is NO LONGER a NO-OP.** `.github/workflows/lab.yml` exists and is wired (issue_comment on `/oc lab` + workflow_dispatch) with a `lab` job that pushes workflow files via the PAT wall. The 32631242450-era "/oc lab NO-OP" note is STALE.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `b42cca5203988e8168d4e327b2d09455c43f1514`** (PR #121 rebased-merged here; contains full Prism codec).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded (run 32631664074).
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set present at `obsidian/benchmarks/data/kodak/`.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the Lab Engineer (`lab.yml` + PAT wall), never through a build/fix/continue run.
- **SILENT-STALL HARDENING (issue #122):** already implemented in `opencode.yml` (non-cancelling groups at :15-17/:295-297; bounded self-heal K=2 with escalate-on-unreadable-counter at :456-502). Spec + blueprint in PR #125 confirm all four invariants (S1/S2/L1/L2). Remaining work = comment-pin + auditor R1-R5 (routed to Lab Engineer this run).

## IN FLIGHT (builds)
- **None in `main`.** PR #125 open (spec docs only, +409/-0). No opencode build runs in progress (`gh run list` shows only skipped/completed).

## PENDING (in order)
1. **Silent-stall hardening implementation (issue #122 / PR #125):** The Lab Engineer (`/oc lab` on PR #125) will (a) pin invariants comment block at `opencode.yml:295-297` & `456-502`, (b) wire R1-R5 regression checks into `auditor.yml`. Then PR #125 (spec) goes through normal review; the hardening PR merges. Refs #122 (CLOSED).
2. **Kinetica (#124) build pipeline (just (re)started):** research (solver spec) -> architect (blueprint) -> build (implementation). Researcher dispatched this run. No opencode build in flight yet.
3. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction (double weight) steers.
4. (Optional) Squeeze-refinement follow-up on Prism: surface the R11-A-coupled `llc_class`/`sibling_class` MA-tree wins on photographic Kodak. Route via `architect`/`research` if pursued.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED, correctly (gate met at 3.675 bpp on real Kodak, verified).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; fresh batch posted 09:31Z (Kinetica/Helix/Satyr); Kinetica picked -> issue #124 (research dispatched this run).
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED (superseded by merged #121); branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`. NOT doc-only (verified it contains the complete codec).
- **#122 (silent-stall hardening)** - CLOSED; spec delivered via PR #125; remaining impl routed to Lab Engineer.
- **#124 (Kinetica)** - OPEN (picked from board #42); Researcher dispatched this run.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `b42cca5203988e8168d4e327b2d09455c43f1514` (PR #121 merged here).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall (NO LONGER a NO-OP).
- **Circuit breaker:** REMOVED.

## NEXT STEPS
1. Lab Engineer: implement the two remaining #122 deliverables (invariants comment block + auditor R1-R5) on a `opencode/lab-125-*` branch; open the hardening PR.
2. Reviewer: review PR #125 (spec doc) when it enters the review gate; route `fix` only if docs need changes (no workflow edits there).
3. Kinetica #124: await Researcher solver spec -> Architect blueprint -> Builder.
4. After Kinetica ships, pick the next board candidate (Helix/Satyr/parked); owner reaction steers.
5. Optional Squeeze-refinement enhancement on Prism - architect/research if desired.

## OPEN QUESTIONS
- After hardening ships: do the auditor R1-R5 checks actually catch a regression (worth a synthetic test)?
- After Kinetica: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)
- Follow-up value: is Squeeze-refinement on photos worth a dedicated build, or is the current 3.675 bpp (2.37x JXL) sufficient as the shipped result?

- Mae, the Maintainer
