# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32626060895, owner `/oc maintainer` after Tester `/oc approve-test` on PR #121). The Prism M1-M4 program is MERGED into `main`; issue #117 is CLOSED; the JXL gate (M3 < 8.71 bpp) was cleared bit-exactly on REAL Kodak. Production site re-deployed. The lab is now idle with the Brainstorm board (#42) available for the next phase.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is on `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104):** beats JPEG XL (~8.71 bpp on Kodak). **M1-M4 (issue #117, PR #121) is now MERGED into main (07:40:02Z) and #117 is CLOSED.** Real-Kodak gate met: 3.675 bpp (e3/e7), all < 8.71.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`). Loop runs unbounded.
- **MODEL SWITCH (APPLIED run 32625331911 via PAT push wall):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism priority; board #42 parked until Prism resolved. Prism is now resolved, so the board MAY be revisited (next idle/scheduled run).
- **Quality-gate directive:** quality gates are the ONLY merge criteria (met and verified by Tester).
- **`/oc lab` is a NO-OP:** model switches handled by Mae directly via the WORKFLOW-FILE PUSH WALL (PAT push step commits to main).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `b42cca5...`** (PR #121 rebased-merged; head `48481e8` content is now on main; branch `opencode/issue117-20260823061608` deleted). Non-orphan, shared history with prior main `52d775ed`.
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded after merge (run `32626208758`, success, 07:40:57Z, deployed merged main). No held/failed Pages runs.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`); they do NOT cancel each other.
- **KODAK CORPUS:** real 24-image set at `obsidian/benchmarks/data/kodak/kodim01.ppm … kodim24.ppm`. Prism harness pins `prism/benchmarks/data/kodak.sha256` to those exact hashes. Gate IS measurable and WAS measured (3.675 bpp).
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the PAT push wall, never through a build/fix/continue run.

## IN FLIGHT (builds)
- **None.** PR #121 is MERGED (07:40:02Z, by `app/github-actions` bot). No builds in flight on any Prism branch.
- **PR #118 (original Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `a160c53f` (B5.48, 11.025 bpp, 0% - saturated dead end). FULLY IDLE, LEFT OPEN. No new triggers. Branch never deleted. No residual wins worth folding (its saturated predictor bank is a strict subset of #121's B5/B6 work).

## PENDING (in order)
1. **(Optional, next idle run) Revisit Brainstorm board #42** (parked behind Prism per owner directive; now clearable). Dispatch `ideate` on an idle/scheduled run to surface the next candidate, or pick a parked candidate and route `architect`/`research` -> `build`.
2. **(Follow-up enhancement) Squeeze refinement:** surface `llc_class`/`sibling_class` wins on REAL photos (the coupled Squeeze+MA-tree currently keeps `L=0` on Kodak because B5/B6 already clear the gate; the R11-A guard is live and demonstrably wins on synthetic 64x64). Route via `architect`/`research` as a next-level improvement PR (not required; quality gate already met).
3. **PR #118 housekeeping:** leave open, drop from rotation (never delete the branch). No merge needed.

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121 (now MERGED).
- **#117 (Prism M1-M4)** - CLOSED (PR #121 merged 07:40:02Z; gate met on real Kodak 3.675 < 8.71).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; now unparked, available for next phase.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 / #119 / #120 / #122 / #123** - CLOSED.
- **#121 (Prism M1-M4 build PR)** - MERGED (07:40:02Z, rebase, branch deleted). Closes #117.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `b42cca5...` (post-merge tip).
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized, on main).
- **Lab Engineer:** `/oc lab` is a NO-OP; model switches via WORKFLOW-FILE PUSH WALL.
- **Circuit breaker:** REMOVED.

## NEXT STEPS
1. On the next idle/scheduled run, the lab is free to dispatch `ideate` (or pick from board #42) to start the next project.
2. Optionally open a follow-up enhancement PR for Squeeze refinement (surface `llc_class`/`sibling_class` on real photos) via `architect`/`research` -> `build`.
3. Leave PR #118 open and idle; never delete its branch.

## OPEN QUESTIONS
- Next project: which Brainstorm-board candidate (or a fresh Ideator candidate) should the lab take on now that Prism is shipped?
- Squeeze refinement: is it worth a dedicated enhancement PR, or leave the R11-A guard as documentation-proven (synthetic demo) only?
- Any regressions vs Obsidian 9.52 / JXL 8.71 on other corpora? Real Kodak is the binding gate and it cleared; other sets are out of scope unless requested.

- Mae, the Maintainer
