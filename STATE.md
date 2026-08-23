# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32633383322, PR #126 MERGED + #122 CLOSED; PR #127 in fresh review gate, in flight). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak). Kinetica (#124) build COMPLETE, in review (PR #127, fresh `/oc review` fired 10:21:48Z, Reviewer run 1372 in flight). Silent-stall hardening #122 DONE (spec PR #125 MERGED; implementation PR #126 MERGED).

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS (applied run 32625331911):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (delete-branch only on merge via rebase).
- **Owner "don't get distracted" directive (Aug 21):** lifted after Prism resolved (run 32631001359 re-engaged the Ideator; Kinetica picked).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** Resolved: spec MERGED via PR #125 (Architect blueprint at `ideas/2026-08-23-silent-stall-hardening.md`); implementation MERGED via PR #126 (audit script R1-R5 + auditor.yml wiring + opencode.yml BINDING ACCEPTANCE INVARIANTS + renamed `ideas/2026-08-23-silent-stall-audit.md`).
- **Kinetica is issue #124** ("Kinetica — 2D rigid-body physics engine (TypeScript)", OPEN, Closes via PR #127). Research+Architect+Builder all ran; build complete.
- **`/oc lab` IS WIRED** via `lab.yml` (issue_comment + workflow_dispatch, PAT push wall). It resolved the #126 add/add conflict successfully.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5`** (advanced by PR #126 merge `a8200ef` + `da5bdde` on top of `729156c` from PR #125).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; ran SUCCESS (run 843, 10:21:50Z) after #126 merge; PR #127 preview at `/preview/pr-127/`.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set present at `obsidian/benchmarks/data/kodak/`.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the Lab Engineer (`lab.yml` + PAT wall), never through a build/fix/continue run.
- **SILENT-STALL HARDENING (issue #122):** DONE. Spec MERGED via PR #125; implementation MERGED via PR #126 (10:21:09Z). #122 CLOSED. Auditor R1-R5 now live on `main`.

## IN FLIGHT (builds / reviews)
- **PR #127 (Kinetica, #124):** OPEN, `mergeable: MERGEABLE`, head `a14668217d0aea6741cff7567a80ec4ae2fc5104`. Build COMPLETE (27 vitest tests, 3 mandated benchmarks, deterministic solver). Owner fired a fresh `/oc review` at 10:21:48Z; a Reviewer run is IN FLIGHT (`opencode-review` run 1372, in_progress). No formal `/oc approve` yet. On formal `/oc approve` -> Tester (3 benchmarks: stacking/energy/determinism) -> `/oc approve-test` -> Maintainer rebase-merge (delete-branch), close #124. 2nd project today, within the 2/day limit (Prism #121 was 1st).

## PENDING (in order)
1. **PR #127 review + test:** a fresh `review` is already IN FLIGHT (owner re-fired `/oc review` 10:21:48Z, run 1372). On formal `/oc approve` -> Tester (3 benchmarks) -> `/oc approve-test`.
2. **PR #127 merge:** Maintainer rebase-merge (delete-branch), close #124, trigger `pages.yml` if `main` advanced.
3. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction steers.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; fresh batch (Kinetica/Helix/Satyr); Kinetica picked -> issue #124 (built, in review).
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED; branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED (spec MERGED via PR #125; implementation MERGED via PR #126).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, fresh review in flight); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED (Architect blueprint on `main`).
- **#126 (Lab hardening PR)** - MERGED (10:21:09Z); closed #122.
- **#127 (Kinetica build PR)** - OPEN (fresh `review` in flight, run 1372).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall. It SUCCEEDED in resolving the #126 add/add conflict (branch renamed audit doc, repointed reference).
- **Circuit breaker:** REMOVED.
- **Rate-limit note:** a transient `APIError: Rate limit exceeded` hit the Reviewer at 10:04:24Z; monitor. If it recurs, dispatch `lab` for a fallback free model (model-management policy).

## NEXT STEPS
1. PR #127 fresh `review` (IN FLIGHT, run 1372 at head a146682): on formal `/oc approve` -> Tester (3 benchmarks) -> `/oc approve-test`.
2. Maintainer: rebase-merge PR #127 (delete-branch), close #124, trigger `pages.yml` if `main` advanced.
3. After Kinetica: pick next Brainstorm (#42) candidate (Helix/Satyr/parked); owner reaction steers.

## OPEN QUESTIONS
- Will the in-flight review (run 1372) on #127 post a formal `/oc approve` and route to the Tester? On approve-test -> merge, close #124 (2nd project today, within limit).
- After #127 merges: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- Optional synthetic regression test: confirm auditor R1-R5 on `main` still catch a regression.

- Mae, the Maintainer