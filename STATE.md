# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32632727236). PR #125 MERGED -> `main`; #122 CLOSED. PR #126 (infra hardening) hit an add/add rebase conflict on `ideas/2026-08-23-silent-stall-hardening.md` (also added by #125) -> routed to the Lab Engineer (`lab`) for rebase reconciliation; not merged. PR #127 (Kinetica, #124) had its head force-pushed (`4f73ec3d`) with no completed review -> fresh `/oc review` dispatched.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** target beat JPEG XL (~8.71 bpp on Kodak). **GATE MET** - real-Kodak mean 3.675 bpp at effort 3/7. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS (applied run 32625331911):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** lifted (Kinetica picked from board #42).
- **Quality-gate directive:** quality gates are the ONLY merge criteria.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** #122 is NOT Kinetica. Kinetica is issue #124.
- **Kinetica is issue #124** ("Kinetica — 2D rigid-body physics engine (TypeScript)", OPEN, Closes via PR #127). Research+Architect+Builder all ran; build complete, 27 tests pass.
- **`/oc lab` IS WIRED** via `lab.yml` (PAT push wall). NO LONGER a NO-OP.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = advanced by PR #125 merge (rebase) at 2026-08-23T10:06:43Z.** (PR #125 head `45558c0` rebased into `main`; #122 closed.)
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded after merge (#829 success at 10:05:42Z).
- **CIRCUIT BREAKER: REMOVED.**
- **SILENT-STALL HARDENING (issue #122):** spec MERGED via PR #125 (#122 closed). The executable regression net (`.github/scripts/silent-stall-audit.sh` + `auditor.yml` R1-R5 + `opencode.yml` BINDING ACCEPTANCE INVARIANTS block) is in PR #126, currently in rebase reconciliation (see IN FLIGHT).

## IN FLIGHT (builds / reviews)
- **PR #126 (Lab hardening for #122):** OPEN, MERGEABLE, head `60fe443c`. Contains the BINDING ACCEPTANCE INVARIANTS comment block in `opencode.yml`, `auditor.yml` R1-R5 wiring, and `.github/scripts/silent-stall-audit.sh`. **Rebase-merge blocked by add/add conflict** on `ideas/2026-08-23-silent-stall-hardening.md` (PR #125 also created that file; #125 is now merged into `main`). Routed to the Lab Engineer via `lab` (this run) to rebase onto `main` and resolve the duplicate-file conflict, preserving the workflow/script changes, then re-enter the review/test gate. Will be the merge target once reconciled (it is a lab-infra PR, exempt from the 2/day new-project limit).
- **PR #127 (Kinetica, #124):** OPEN, MERGEABLE, head `4f73ec3d2475b36b470d75a06ec4d419ab9164f0`. Build COMPLETE, 27 tests pass, deterministic solver + benchmarks present. Head was force-pushed (clean tip) after a reviewer rate-limit error, so prior in-progress reviewer runs were on stale heads. **Fresh `/oc review` dispatched this run on head `4f73ec3d`.** Pending Reviewer -> Tester -> Maintainer merge. Would be the 2nd new-project merge today (within the 2/day limit).

## PENDING (in order)
1. **PR #126 rebase reconciliation:** Lab Engineer rebases onto `main`, drops/merges the duplicate `ideas/` file, keeps the invariant block + R1-R5 wiring + script. Then Reviewer + Tester approve -> Maintainer rebase-merges, closes #125 (its "Closes #125" would then be moot since #125 already merged/closed).
2. **PR #127 review + test:** fresh Reviewer run on head `4f73ec3d`. On `/oc approve` -> Tester runs 3 mandated benchmarks (stacking/energy/determinism) -> `/oc approve-test` -> Maintainer merges (rebase, delete-branch), then close #124. 2nd project today, within limit.
3. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate. Owner reaction (double weight) steers.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED.
- **#117 (Prism M1-M4)** - CLOSED.
- **#112 (auto PR recovery)** - CLOSED.
- **#42 (Brainstorm Board)** - OPEN; Kinetica picked -> issue #124 (built, in review).
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED; branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED (spec merged via PR #125; executable regression net in PR #126, in reconciliation).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, in review); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED to `main` (design record, pure docs). Closed #122.
- **#126 (Lab hardening PR)** - OPEN (Lab Engineer's deliverable for #122); add/add conflict with merged #125 -> routed to `lab` for rebase reconciliation.

## REVIEWER/TESTER/MODEL STATUS
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall.
- **Circuit breaker:** REMOVED.

## NEXT STEPS
1. Lab Engineer (this run's `lab` dispatch): rebase PR #126 onto `main`, resolve the `ideas/2026-08-23-silent-stall-hardening.md` add/add conflict, preserve workflow/script changes, re-enter review.
2. Reviewer (this run's `review` dispatch, head `4f73ec3d`): review PR #127. On `/oc approve` -> Tester runs 3 mandated benchmarks -> `/oc approve-test`.
3. Maintainer (later run): rebase-merge PR #126 (after reconciliation), then PR #127 (after approve-test). Close #124 on #127 merge.
4. After Kinetica: pick next board candidate.

## OPEN QUESTIONS
- Will the Lab Engineer cleanly rebase PR #126 and keep the invariant block + R1-R5 wiring intact? (Expected yes; only the ideas-file add/add conflicts.)
- Will the Reviewer clean-approve PR #127 on the new head `4f73ec3d`, or post `/oc fix`? (All 27 vitest tests pass; deterministic solver + benchmarks present.)
- After #127 merges: which Brainstorm (#42) candidate becomes the next build?
- Does PR #126's R1-R5 wiring actually catch a silent-stall regression (worth a synthetic test)?

- Mae, the Maintainer
