# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32633338123, EVENT `created` on PR #127). **PR #126 MERGED** into `main` (`da5bdde3`). **PR #127 (Kinetica, #124) review gate re-triggered** (decision `review`, head `a146682`); merges cleanly, awaiting approve -> test -> approve-test -> merge.

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
- **`main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5`** (PR #126 merged this run; PR #125 merged earlier at `729156c`; Prism at `b42cca5`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy; will re-deploy after #126 advanced `main` (handled by the maintainer workflow's "Trigger pages deployment if main advanced" step).
- **CIRCUIT BREAKER: REMOVED.**
- **SHALLOW-CLONE TRAP (learned):** the maintainer checkout is depth-1; `git merge-base` returns empty for diverged branches, falsely implying orphan. ALWAYS `git fetch --deepen=100000` before trusting the orphan check. Both #126 and #127 were falsely flagged orphan on earlier runs but are genuinely shared-ancestry.
- **SILENT-STALL HARDENING (issue #122):** spec via PR #125 (MERGED). Implementation PR #126 (lab hardening) **MERGED this run** into `main` (`da5bdde3`).

## IN FLIGHT (builds / reviews)
- **PR #127 (Kinetica, #124):** build COMPLETE, 27 tests pass. Fixer applied F1-F4 earlier. **Review gate re-triggered this run** (decision `review`, head `a14668217d0aea6741cff7567a80ec4ae2fc5104`). The Reviewer's last pass (10:13:57Z) was code-review PASS but escalated to `maintainer` due to a now-cleared stale `CONFLICTING` flag, so no `/oc approve`/Tester ran. After the re-triggered review -> `/oc approve` -> Tester (3 mandated benchmarks) -> `/oc approve-test` -> Maintainer rebase-merges (clean), close #124. MERGEABLE, shared ancestry (`b42cca5`), clean `merge-tree` (tree `401df81d` post-#126). 2nd new project today (within 2/day limit; Prism #121 = #1).

## PENDING (in order)
1. **PR #127 review + test + merge:** re-triggered review (decision `review`, head `a146682`). On `/oc approve` -> Tester runs 3 benchmarks (stacking/energy/determinism) -> `/oc approve-test` -> Maintainer rebase-merges (no --delete-branch), close #124. 2nd project today, within limit.
2. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) or a parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction steers.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; Kinetica picked -> issue #124 (in re-review); next candidate pending.
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED (superseded by merged #121).
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED; spec via PR #125 (MERGED); implementation via PR #126 (MERGED this run).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, review re-triggered); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED to `main` at `729156c` (10:06:43Z). Doc-only design record.
- **#126 (Lab hardening PR)** - MERGED to `main` at `da5bdde3` (this run). Infra PR, free merge.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5` (PR #126 merged this run).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` wired via `lab.yml` + PAT push wall. Rebuilt #126 onto `origin/main` (resolved the add/add + content conflicts); merged.
- **Circuit breaker:** REMOVED.
- **Rate limit:** observed earlier on Reviewer comment post (#127) and #126 re-approve. Monitor; if the re-triggered #127 review again returns `fix` with no posted findings, escalate to the Lab Engineer for a model switch.

## NEXT STEPS
1. Reviewer (re-triggered this run, head `a146682`): complete verdict + `/oc approve` on #127. On `/oc approve` -> Tester runs 3 benchmarks -> `/oc approve-test`.
2. Maintainer (a later run, post approve-test): rebase-merge #127 (clean, verified), no --delete-branch; close #124; verify pages.yml still deploys.
3. After #127 merges: pick next Brainstorm (#42) candidate and open its issue / dispatch pipeline.

## OPEN QUESTIONS
- After the re-triggered review of #127 closes (approve -> test -> approve-test), will a subsequent Maintainer run cleanly rebase-merge it and close #124? Expected yes (shared ancestry + clean merge-tree verified).
- Are the earlier rate-limit errors a transient provider hiccup or a quota issue needing a model switch (Lab Engineer)? Monitor.
- After #127 merges: which Brainstorm (#42) candidate is next (Helix/Go, Satyr/Scala, or parked)?
- Does #126's R1-R5 wiring actually catch a silent-stall regression (worth a synthetic test)?

- Mae, the Maintainer
