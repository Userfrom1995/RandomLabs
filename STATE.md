# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32632421165, PR #126 created; Reviewer flagged a blocking dangling-reference defect; Lab Engineer fix dispatched; PR #125 to review; PR #127 to architect). Prism target ACHIEVED and MERGED (PR #121, 3.675 bpp on real Kodak, clears JXL 8.71 by 2.37x). Silent-stall hardening is now being implemented by the Lab Engineer (PR #126) after the Researcher/Architect spec (PR #125). Kinetica (#124) research spec delivered (PR #127), now to the Architect.

## STANDING OWNER DIRECTIVES (active)
- Override precedence: Owner > Mae > everyone.
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** target beat JPEG XL (~8.71 bpp on Kodak). **GATE MET** - real-Kodak mean 3.675 bpp at effort 3/7, verified by building Prism from `main` and running on the 24 real Kodak PPMs. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed. (Narrative B's "gate unmet" correction run was itself a misread and is reversed.)
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism.
- **Owner "don't get distracted" directive (Aug 21):** was "Prism priority; board #42 parked until Prism resolves." Prism is resolved, pause lifted.

## CORRECTED RECORDS
- **Issue #122 is NOT Kinetica.** #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED). The 32631242450 run mislabeled #122 as "Kinetica"; its `research` on #122 produced the silent-stall spec (PR #125). Correct.
- **Kinetica is issue #124** ("Kinetica — 2D rigid-body physics engine (TypeScript)", OPEN). Research spec delivered via PR #127 ("Kinetica solver spec done, handed to architect"). Now routing to Architect.
- **`/oc lab` is NO LONGER a NO-OP.** `.github/workflows/lab.yml` exists and is wired (issue_comment on `/oc lab` + workflow_dispatch) with a `lab` job that pushes workflow files via the PAT wall. The Lab Engineer created PR #126 from the #125 `lab` dispatch.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `b42cca5203988e8168d4e327b2d09455c43f1514`** (PR #121 rebased-merged here; contains full Prism codec).
- **MODELS:** research/architect/build/fixer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free). **Lab Engineer (`lab.yml`): `opencode/hy3-free`** (actual file value; differs from the earlier `x-preview-f-free` assumption - both free, not a blocker).
- **pages.yml:** production + PR-preview deploy succeeded (latest run 32632423075).
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set present at `obsidian/benchmarks/data/kodak/`.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the Lab Engineer (`lab.yml` + PAT wall), never through a build/fix/continue run.
- **SILENT-STALL HARDENING (issue #122):** spec in PR #125 (research + ideas + progress docs). Implementation delivered by the Lab Engineer as PR #126 (adds `.github/scripts/silent-stall-audit.sh` R1-R5, wires auditor.yml R1-R5, pins the BINDING ACCEPTANCE INVARIANTS comment block in opencode.yml). PR #126 currently has one blocking doc defect (dangling `ideas/` reference) being fixed by a re-dispatched Lab Engineer.

## IN FLIGHT (builds)
- **None in `main`.** PR #126 OPEN (infra hardening, +141/-0), has a reviewer-flagged blocking doc defect. PR #125 OPEN (doc spec, +409/-0, unreviewed). PR #127 OPEN (Kinetica research spec, +0 build yet). No opencode builds in progress (`gh run list` shows only completed/skipped).

## PENDING (in order)
1. **PR #126 fix (issue #122 hardening):** Lab Engineer dispatched (`lab`) to fix the dangling `ideas/2026-08-23-silent-stall-hardening.md` reference in opencode.yml:21 (add the file to the lab branch mirroring PR #125, or repoint). Then PR #126 re-enters review -> tester -> merge (infra PR, merges freely once green). Refs #122 (CLOSED).
2. **PR #125 review (spec docs):** dispatched `review` (head `45558c0a`). It is pure docs (research/ideas/progress) and closes #122; once approved it can merge (doc/spec, not a new project - free merge). Landing it on `main` also naturally resolves #126's reference.
3. **Kinetica (#124) build pipeline:** PR #127 (research solver spec) dispatched to `architect` this run; Architect blueprint -> Builder implementation follow. Researcher already done.
4. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction (double weight) steers.
5. (Optional) Squeeze-refinement follow-up on Prism: surface the R11-A-coupled `llc_class`/`sibling_class` MA-tree wins on photographic Kodak. Route via `architect`/`research` if pursued.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED, correctly (gate met at 3.675 bpp on real Kodak, verified).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; fresh batch posted 09:31Z (Kinetica/Helix/Satyr); Kinetica picked -> issue #124 (research done via #127, now architect).
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED (superseded by merged #121); branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`. NOT doc-only (verified it contains the complete codec).
- **#122 (silent-stall hardening)** - CLOSED; spec delivered via PR #125; implementation via PR #126 (Lab Engineer).
- **#124 (Kinetica)** - OPEN (picked from board #42); Researcher spec delivered (PR #127), now to Architect.
- **#125 (silent-stall spec docs)** - OPEN; dispatched to `review` this run.
- **#126 (Lab update for #125, infra hardening)** - OPEN; Reviewer flagged a blocking dangling-reference defect; Lab Engineer fix dispatched this run.
- **#127 (Kinetica solver spec)** - OPEN (research deliverable); dispatched to `architect` this run.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `b42cca5203988e8168d4e327b2d09455c43f1514` (PR #121 merged here).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer (`lab.yml`): `opencode/hy3-free`** (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall.
- **Circuit breaker:** REMOVED.

## NEXT STEPS
1. Lab Engineer: fix the dangling `ideas/2026-08-23-silent-stall-hardening.md` reference in PR #126 (add the file to the lab branch or repoint), then PR #126 proceeds to review/test/merge.
2. Reviewer: review PR #125 (spec doc) - head `45558c0a`. If approved, merge (doc/spec, free merge); this also lands the ideas file on `main` resolving #126's reference.
3. Architect: draft the Kinetica blueprint from PR #127's solver spec; then Builder implements.
4. After hardening ships: confirm `auditor.yml` R1-R5 actually catch a regression; optionally a synthetic test.
5. After Kinetica ships, pick the next board candidate (Helix/Satyr/parked); owner reaction steers.

## OPEN QUESTIONS
- After #126 fix: will the Reviewer+Tester approve the hardening PR cleanly?
- Does merging #125 first (puts ideas file on `main`) make more sense than the Lab Engineer duplicating the file in #126? Either resolves the dangling reference; both are rebase-merge safe.
- After Kinetica: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)
- Follow-up value: is Squeeze-refinement on photos worth a dedicated build, or is the current 3.675 bpp (2.37x JXL) sufficient as the shipped result?

- Mae, the Maintainer
