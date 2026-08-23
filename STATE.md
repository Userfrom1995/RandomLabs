# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32632709543, EVENT `created` on PR #127). Prism MERGED (#121, 3.675 bpp). #125 (silent-stall spec) MERGED into `main` at `729156c`. #126 (lab hardening) approved+tested but rebase-blocked by add/add conflict with #125's ideas file; Lab Engineer run #689 rebasing to resolve. #127 (Kinetica, #124) build COMPLETE; re-review in flight after Fixer escalated missing Reviewer findings (rate-limit hit). Both #126 and #127 within shipping limits.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7 (clears JXL 8.71 by 2.37x). Merged via rebase at `b42cca5`; #117 / #118 / #121 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS:** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied. (Merge uses `--rebase` WITHOUT `--delete-branch` to honor the standing no-branch-deletion directive.)
- **Owner "don't get distracted" directive (Aug 21):** lifted after Prism resolved; board re-engaged, Kinetica picked.
- **Quality-gate directive:** quality gates are the ONLY merge criteria.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** #122 is NOT Kinetica. Kinetica is issue #124.
- **Kinetica is issue #124** ("Kinetica — 2D rigid-body physics engine (TypeScript)", OPEN, Closes via PR #127).
- **`/oc lab` IS WIRED** via `lab.yml` + PAT push wall (NO-OP no longer).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `729156cb42954d5a766798fc14cb2dcf81b241fd`** (PR #125 merged here 10:06:43Z; brings `ideas/2026-08-23-silent-stall-hardening.md`, `docs/research/issue-122-silent-stall-hardening.md`, `progress/122-silent-stall-hardening.md`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded; PR #127 preview at `/preview/pr-127/`.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`) - this is WHY the owner's rapid comment burst fanned out many overlapping runs today (multiple maintainer + reviewer + lab runs in parallel). Each must avoid duplicate triggers.
- **RATE LIMIT observed:** `APIError: Rate limit exceeded` hit the Reviewer's comment post on #127 (and #126's re-approve) - root cause of the missing-findings defect. Re-running the Reviewer (owner /oc review 10:05:26Z) is the remediation.
- **SILENT-STALL HARDENING (issue #122):** spec delivered via PR #125 (MERGED). Implementation PR #126 in flight (Lab Engineer rebase).

## IN FLIGHT (builds / reviews)
- **PR #127 (Kinetica, #124):** build COMPLETE, 27 tests pass, MERGEABLE, shares `main` ancestry. **Re-review in flight** (owner `/oc review` 10:05:26Z; Reviewer run live). Prior review returned `action: fix` but findings were never posted (rate-limit); Fixer escalated (tip `4f73ec3`). Will be: approve -> Tester (3 benchmarks) -> Maintainer rebase-merges, close #124. 2nd new-project today (within 2/day limit; Prism #121 = #1).
- **PR #126 (Lab hardening for #122):** OPEN, approved (Reviewer x2) + Tester APPROVED (route-to-Maintainer, 10:05:30Z). Rebase-merge BLOCKED by add/add conflict on `ideas/2026-08-23-silent-stall-hardening.md` (merged #125 also adds it). **Lab Engineer run #689 in_progress** (owner `/oc lab` 10:08:47Z/10:09:17Z) rebasing `opencode/lab-122-silent-stall-invariants` onto `main` and dropping #126's duplicate ideas file. After rebase -> re-review + test -> Maintainer merges. Infra PR, free merge.

## PENDING (in order)
1. **PR #126 rebase + merge:** Lab Engineer run #689 rebasing; on clean rebase, re-review + Tester, then Maintainer rebase-merges (no --delete-branch), verify `auditor.yml` R1-R5 wiring.
2. **PR #127 review + test + merge:** re-review in flight (run 1349-equivalent); on `/oc approve` -> Tester runs 3 benchmarks -> `/oc approve-test` -> Maintainer rebase-merges, close #124. 2nd project today, within limit.
3. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) or a parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction steers.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; Kinetica picked -> issue #124 (built, in review).
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED (superseded by merged #121).
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED; spec via PR #125 (MERGED); implementation in flight as PR #126 (Lab Engineer rebase).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, in re-review); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED to `main` at `729156c` (10:06:43Z). Doc-only design record.
- **#126 (Lab hardening PR)** - OPEN (Lab Engineer's deliverable for #122); approved+tested, in Lab Engineer rebase (run #689) to resolve add/add conflict with #125.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `729156cb42954d5a766798fc14cb2dcf81b241fd` (PR #125 merged).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` wired via `lab.yml` + PAT push wall. Run #689 in progress (rebasing #126).
- **Circuit breaker:** REMOVED.
- **Rate limit:** observed on Reviewer comment post (#127) and #126 re-approve - monitor; if it recurs, the Lab Engineer may need to switch the failing model.

## NEXT STEPS
1. Lab Engineer (run #689): rebase #126 onto `main`, drop duplicate `ideas/2026-08-23-silent-stall-hardening.md`, push -> re-review + Tester -> Maintainer rebase-merges.
2. Reviewer (in flight): produce a COMPLETE verdict + findings on #127 (rate-limit recovery). On `/oc approve` -> Tester runs 3 benchmarks (stacking/energy/determinism) -> `/oc approve-test`.
3. Maintainer (this or a later run): rebase-merge #126 and #127 (no --delete-branch), close #124, verify pages.yml still deploys.

## OPEN QUESTIONS
- Will the in-flight #127 Reviewer produce a COMPLETE findings comment this time (rate-limit cleared), or need another pass?
- Will Lab Engineer run #689 cleanly rebase #126 (drop ideas file) so it merges without conflict?
- After #126/#127 merge: which Brainstorm (#42) candidate becomes the next build?
- Does #126's R1-R5 wiring actually catch a silent-stall regression (worth a synthetic test)?
- Are the rate-limit errors a transient provider hiccup or a model-cap quota issue requiring a model switch via the Lab Engineer?

- Mae, the Maintainer
