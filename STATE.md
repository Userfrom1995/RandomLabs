# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32632807903, PR #126 merge blocked by add/add conflict in `ideas/`; Lab Engineer dispatched; PR #127 review in flight). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak, clears JXL 8.71 by 2.37x). Kinetica (#124) build COMPLETE, in review (PR #127). Silent-stall spec PR #125 MERGED; hardening PR #126 approved but rebase-merge blocked on a doc-path collision.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS (applied run 32625331911):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (delete-branch only on merge via rebase).
- **Owner "don't get distracted" directive (Aug 21):** lifted after Prism resolved (run 32631001359 re-engaged the Ideator; Kinetica picked).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** Kinetica is issue #124.
- **Kinetica is issue #124** ("Kinetica — 2D rigid-body physics engine (TypeScript)", OPEN, Closes via PR #127). Research+Architect+Builder all ran; build complete.
- **`/oc lab` IS WIRED** via `lab.yml` (issue_comment + workflow_dispatch, PAT push wall). NO LONGER a NO-OP.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `729156cb42954d5a766798fc14cb2dcf81b241fd`** (advanced by PR #125 merge `57f1fb4` + `729156c`; PR #121 was `b42cca5`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; PR #127 preview at `/preview/pr-127/`.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set present at `obsidian/benchmarks/data/kodak/`.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the Lab Engineer (`lab.yml` + PAT wall), never through a build/fix/continue run.
- **SILENT-STALL HARDENING (issue #122):** spec MERGED via PR #125 (Architect blueprint at `ideas/2026-08-23-silent-stall-hardening.md`). Implementation PR #126 = approved but rebase-merge BLOCKED on add/add conflict in that same `ideas/` path; Lab Engineer dispatched to resolve.

## IN FLIGHT (builds / reviews)
- **PR #126 (Lab hardening for #122):** OPEN. Reviewer approved x2; Tester APPROVED (route-to-Maintainer). Merge attempted but BLOCKED by add/add conflict: `ideas/2026-08-23-silent-stall-hardening.md` exists on `main` (from merged PR #125, Architect blueprint) AND is added by #126's commit `60fe443` (different audit doc). **This run dispatched `lab` on #126** to rebase onto `main`, keep the Architect blueprint at the original path, rename the branch's audit doc to `ideas/2026-08-23-silent-stall-audit.md`, and repoint the `opencode.yml` line-21 reference. After the Lab Engineer pushes the rebased branch, #126 re-enters review/test -> Maintainer merges (lab-infra, exempt from 2-new-projects/day limit). Head before conflict: `60fe443c80dec462f428eed1eb537eb13b5babfa`. Branch: `opencode/lab-122-silent-stall-invariants`.
- **PR #127 (Kinetica, #124):** OPEN. Build COMPLETE (27 vitest tests pass, 3 mandated benchmarks, deterministic solver). MERGEABLE, shares `main` ancestry. A fresh Reviewer run is in flight (owner re-triggered `/oc review` 10:05:26Z). Earlier the Reviewer emitted `action: fix` (10:02:49Z) with NO posted findings (phantom-fix bug); the Fixer escalated (10:05:24Z). Watching for a real decision this pass. Would be the 2nd new-project merge today (within the 2/day limit; Prism #121 was the 1st). On `/oc approve` -> Tester (3 benchmarks) -> `/oc approve-test` -> Maintainer rebase-merge, close #124.

## PENDING (in order)
1. **PR #126 conflict resolution (lab):** Lab Engineer rebases + renames the collision doc. On clean push -> re-review/test -> merge.
2. **PR #127 review + test:** fresh Reviewer pass in flight. On `/oc approve` -> Tester -> `/oc approve-test` -> merge (rebase, delete-branch), close #124. 2nd project today, within limit.
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
- **#122 (silent-stall hardening)** - CLOSED; spec MERGED via PR #125; implementation PR #126 in flight (merge blocked, lab dispatched).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, in review); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED (Architect blueprint on `main`).
- **#126 (Lab hardening PR)** - OPEN (approved; merge blocked by add/add conflict; lab dispatched this run).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `729156cb42954d5a766798fc14cb2dcf81b241fd`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall.
- **Circuit breaker:** REMOVED.
- **Rate-limit note:** a transient `APIError: Rate limit exceeded` hit the Reviewer at 10:04:24Z; monitor. If it recurs, dispatch `lab` for a fallback free model (model-management policy).

## NEXT STEPS
1. Lab Engineer (this run dispatched): rebase PR #126 onto `main`, resolve the `ideas/` add/add conflict (rename branch's audit doc, repoint `opencode.yml:21`). On clean push -> re-review -> Tester -> merge.
2. Reviewer (in flight, owner re-triggered 10:05:26Z): produce a real decision on PR #127. On `/oc approve` -> Tester (3 benchmarks: stacking/energy/determinism) -> `/oc approve-test`.
3. Maintainer: rebase-merge PR #127, close #124. Then trigger `pages.yml` if `main` advanced.
4. After Kinetica: pick next board candidate (Helix/Satyr/parked); owner reaction steers.

## OPEN QUESTIONS
- Will the Lab Engineer's rename+repoint cleanly unblock the #126 rebase-merge? (Expected yes; only the one `ideas/` file conflicts.)
- Will the fresh Reviewer pass on #127 post a real decision, or repeat the findings-less `fix` loop? (If it loops, escalate to `lab`/recovery.)
- After #126 merges: do the auditor R1-R5 still catch a regression (worth a synthetic test)?
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- After #127 merges: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)

- Mae, the Maintainer
