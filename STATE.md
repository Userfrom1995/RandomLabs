# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32625553663, owner `/oc review` on PR #121). The Prism M1-M4 program is COMPLETE on PR #121 and the JXL gate (M3 < 8.71 bpp) is CLEARED bit-exactly on REAL Kodak. Reviewer now in flight; Tester + merge pending.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104):** beats JPEG XL (~8.71 bpp on Kodak). M1-M4 (issue #117, PR #121) is now COMPLETE and the gate is met. Owner override: NO merge until M0+M1+M2+M3 met bit-exactly on REAL Kodak - this was the gate, and it is now satisfied.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`). Loop runs unbounded.
- **MODEL SWITCH (APPLIED run 32625331911 via PAT push wall):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied.
- **Owner "don't get distracted" directive:** Prism priority; board #42 parked until Prism resolves. Now that the gate cleared, board can be revisited after merge.
- **Quality-gate directive:** quality gates are the ONLY merge criteria (met).
- **`/oc lab` is a NO-OP:** model switches handled by Mae directly via the WORKFLOW-FILE PUSH WALL (PAT push step commits to main).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `52d775ed24dba42824a00f7473a1fcd0e94d273d`.** Both Prism branches are CLEAN DESCENDANTS of `main` (verified). PR #121 head `48481e8` shares history with main - NOT orphan, safe to rebase-merge later.
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy succeeded (PR #121 preview live).
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`); they do NOT cancel each other. A genuine duplicate trigger is only created by a SECOND `/oc continue`/`/oc build`/`/oc review` on the SAME issue while one is already in flight.
- **KODAK CORPUS:** real 24-image set at `obsidian/benchmarks/data/kodak/kodim01.ppm … kodim24.ppm`. Prism harness pins `prism/benchmarks/data/kodak.sha256` to those exact hashes. Gate IS measurable and HAS been measured.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the PAT push wall, never through a build/fix/continue run.

## IN FLIGHT (builds)
- **PR #121 (Prism M1-M4, branch `opencode/issue117-20260823061608`):** head `48481e8` (B11 shipped: YCoCg-R widening fix + real-Kodak durable CSV; gate CLEARED: e0 5.69, e1/e3/e7 3.68 bpp, all < 8.71; 23/23 gtest + fuzz 1000 PASS). **No build in flight** - the program is complete.
  - **Reviewer IS IN FLIGHT:** `opencode-review` run `32625547210` (in_progress) + queued `32625553685` (pending), triggered by owner `/oc review` 07:25:59Z. MAINTAINER decision `[]` (no duplicate trigger).
  - KEPT OPEN until Reviewer -> Tester -> Maintainer merge (do not merge; body "Closes #117" would prematurely close the tracking issue).
- **PR #118 (original Prism M1-M4, branch `opencode/117-prism-m1-m4-optimization`):** head `a160c53f` (B5.48, 11.025 bpp, 0% - saturated dead end). FULLY IDLE. Fold residual wins into #121 later; drop from rotation (never delete branch).

## PENDING (in order)
    1. **Reviewer** (`/oc review`, already in flight via owner trigger) must post `/oc approve` (or `/oc fix` findings). This maintainer run did NOT re-trigger to avoid a duplicate.
    2. **Tester** (`/oc test`) - on Reviewer approval, run dynamic QA + real-Kodak performance check, then `/oc approve-test`.
    3. **Maintainer merge:** rebase-merge PR #121 (`gh pr merge 121 --rebase --delete-branch`), verify orphan-main protection (merge-base with main exists), then close #117 (and any other `Closes` issues) with the default token.
    4. **Consolidation:** fold any #118-only residual wins into #121 (or leave as historical); drop idle #118 from rotation (never delete branch).
    5. **Post-merge:** revisit Brainstorm board #42 (parked behind Prism per owner directive); consider Squeeze refinement to surface `llc_class`/`sibling_class` wins on real photos as a follow-up enhancement (architect/research path).

## ISSUES
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED (merged #104); M1-M4 via #117 + PR #121.
- **#117 (Prism M1-M4)** - OPEN (tracking). Gate MET on real Kodak (3.68 < 8.71). Close after PR #121 merges.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#42 (Brainstorm Board)** - OPEN; parked, revisit after Prism merge.
- **#70 (Lab Health)** - Auditor daily summary.
- **#98 / #119 / #120 / #122 / #123** - CLOSED.
- **#121 (Prism M1-M4 build PR)** - OPEN, MERGEABLE, KEPT OPEN as active build/blueprint; awaiting Reviewer -> Tester -> merge.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `52d775ed24dba42824a00f7473a1fcd0e94d273d`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE, owner-authorized, on main).
- **Lab Engineer:** `/oc lab` is a NO-OP; model switches via WORKFLOW-FILE PUSH WALL.
- **Circuit breaker:** REMOVED.

## NEXT STEPS
    1. **Reviewer** finishes on PR #121 (run `32625547210` in_progress, `32625553685` pending) -> posts `/oc approve` (or `/oc fix`).
    2. If `/oc fix` findings: Fixer applies them (NOT re-driven by this maintainer run; owner/reviewer triggers as needed).
    3. **Tester** (`/oc test`) confirms real-Kodak QA + performance, posts `/oc approve-test`.
    4. **Maintainer merges** PR #121 (rebase, delete-branch), verifies non-orphan, then closes #117.
    5. Consolidate onto #121; drop idle #118 from rotation.

## OPEN QUESTIONS
- Reviewer: does PR #121 pass strict architecture/security/static review cleanly, or are there findings to fix first?
- Tester: real-Kodak performance/QA green? Any regression vs Obsidian 9.52 / JXL 8.71?
- After merge: is #118's residual value worth folding, or leave as historical dead-end branch (never delete)?
- Post-merge: revisit Brainstorm board #42; consider a Squeeze-refinement enhancement (surface `llc_class`/`sibling_class` wins on photos) as a follow-up PR.
- Brainstorm board #42: parked behind Prism; pick after merge per owner directive.

- Mae, the Maintainer
