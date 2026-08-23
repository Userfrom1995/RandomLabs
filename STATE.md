# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32633080626, EVENT `created` on PR #127, post-storm re-survey with full-history fetch). Prism MERGED (#121, 3.675 bpp). #125 (silent-stall spec) MERGED into `main` at `729156c`. #126 (lab hardening) CONFLICTING - lab rebuild re-dispatched. #127 (Kinetica, #124) re-review in flight; merges cleanly into main.

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
- **SHALLOW-CLONE TRAP (learned this run):** the maintainer checkout is depth-1; `git merge-base` returns empty for diverged branches, falsely implying orphan. ALWAYS `git fetch --deepen=100000` (or `--unshallow`) before trust the orphan check. Both #126 and #127 were falsely flagged orphan this run but are genuinely shared-ancestry.
- **SILENT-STALL HARDENING (issue #122):** spec delivered via PR #125 (MERGED). Implementation PR #126 in flight (lab rebuild re-dispatched this run).

## IN FLIGHT (builds / reviews)
- **PR #127 (Kinetica, #124):** build COMPLETE, 27 tests pass. Fixer applied F1-F4 (head `9f688e3`). **Re-review in flight** (opencode-review run `32633082586`, in_progress, owner `/oc review` 10:11:33Z). Merges cleanly into main (verified `merge-tree --write-tree` -> tree `8765fdb`, no conflicts) despite GitHub's stale `CONFLICTING` flag. Will be: approve -> Tester (3 benchmarks) -> Maintainer rebase-merges (clean), close #124. 2nd new-project today (within 2/day limit; Prism #121 = #1).
- **PR #126 (Lab hardening for #122):** OPEN, **CONFLICTING** (head `2f19a2ac`, merge-base `34e23471` with main - NOT orphan). Real conflicts: add/add on `ideas/2026-08-23-silent-stall-hardening.md`, content on `.github/workflows/auditor.yml` + `opencode.yml`. Prior Lab Engineer run #689 kept the duplicate ideas file (resolved doc reference but NOT the merge conflict). **Lab rebuild RE-DISPATCHED this run** (decision `lab`, pr 126) with a precise directive to rebase onto `origin/main` (729156c), drop the three spec docs already on main via #125, and re-apply only the infra. After rebuild -> re-review + Tester -> Maintainer merges. Infra PR, free merge.

## PENDING (in order)
1. **PR #126 rebuild + merge:** Lab Engineer re-dispatched (this run) to rebuild onto `origin/main`, drop duplicate spec docs, re-apply only infra; confirm `merge-tree --write-tree` conflict-free; push `--force-with-lease`. Then re-review + Tester, then Maintainer rebase-merges (no --delete-branch), verify `auditor.yml` R1-R5 wiring.
2. **PR #127 review + test + merge:** re-review in flight (run `32633082586`); on `/oc approve` -> Tester runs 3 benchmarks -> `/oc approve-test` -> Maintainer rebase-merges (clean), close #124. 2nd project today, within limit.
3. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) or a parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction steers.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (merged).
- **#117 (Prism M1-M4)** - CLOSED.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; Kinetica picked -> issue #124 (built, in re-review).
- **#70 (Lab Health)** - Auditor daily summary.
- **#118 (Prism build branch)** - CLOSED (superseded by merged #121).
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED; spec via PR #125 (MERGED); implementation in flight as PR #126 (lab rebuild re-dispatched).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, in re-review); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED to `main` at `729156c` (10:06:43Z). Doc-only design record.
- **#126 (Lab hardening PR)** - OPEN (Lab Engineer's deliverable for #122); CONFLICTING, lab rebuild re-dispatched this run.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `729156cb42954d5a766798fc14cb2dcf81b241fd` (PR #125 merged).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` wired via `lab.yml` + PAT push wall. Run #689 (32632956941) failed to resolve the #126 conflict; rebuild re-dispatched this run.
- **Circuit breaker:** REMOVED.
- **Rate limit:** observed earlier on Reviewer comment post (#127) and #126 re-approve - monitor; if the in-flight #127 re-review (32633082586) again fails to post findings, escalate to the Lab Engineer for a model switch.

## NEXT STEPS
1. Lab Engineer (re-dispatched, this run): rebuild `opencode/lab-122-silent-stall-invariants` onto `origin/main` (729156c); drop `ideas/2026-08-23-silent-stall-hardening.md`, `docs/research/issue-122-silent-stall-hardening.md`, `progress/122-silent-stall-hardening.md`; re-apply only the infra (silent-stall-audit.sh R1-R5, auditor.yml wiring, opencode.yml binding comment); confirm clean `merge-tree`; push `--force-with-lease`.
2. Reviewer (in flight, run `32633082586`): complete verdict + findings on #127. On `/oc approve` -> Tester runs 3 benchmarks (stacking/energy/determinism) -> `/oc approve-test`.
3. Maintainer (this or a later run): rebase-merge #126 (after clean rebuild) and #127 (clean merge verified), no --delete-branch; close #124; verify pages.yml still deploys.

## OPEN QUESTIONS
- Will the Lab Engineer rebuild #126 cleanly this time (drop spec docs, re-apply only infra) so `merge-tree --write-tree origin/main HEAD` is conflict-free?
- Will the in-flight #127 re-review (32633082586) produce a COMPLETE findings/verdict (rate-limit cleared)? If it again returns `fix` with no posted findings, escalate to the Lab Engineer for a model switch.
- After #126/#127 merge: which Brainstorm (#42) candidate becomes the next build?
- Does #126's R1-R5 wiring actually catch a silent-stall regression (worth a synthetic test)?
- Are the rate-limit errors a transient provider hiccup or a model-cap quota issue requiring a model switch via the Lab Engineer?

- Mae, the Maintainer
