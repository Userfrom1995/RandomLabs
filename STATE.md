# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32632988893, PR #126 STILL CONFLICTING - prior Lab Engineer run was SKIPPED so conflict unresolved; re-dispatched `lab` with corrected rename+rebase recipe; PR #127 review/fix run in flight). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak, clears JXL 8.71 by 2.37x). Kinetica (#124) build COMPLETE, in review (PR #127). Silent-stall spec PR #125 MERGED; hardening PR #126 approved but rebase-merge still blocked on a doc-path collision.

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
- **PRIOR LAB RUN WAS SKIPPED (CORRECTION):** the Lab Engineer run triggered by owner `/oc lab` at 10:08:47Z/10:09:17Z (run `32633002305`, 10:09:49Z) concluded `skipped` - it did NOT rebase the branch. The branch tip `2f19a2a` re-added the audit doc at the colliding `ideas/` path rather than renaming it, so PR #126 remains CONFLICTING. The earlier 10:11:22 status comment ("Lab Engineer run #689 is rebasing") was INCORRECT.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `729156cb42954d5a766798fc14cb2dcf81b241fd`** (advanced by PR #125 merge `57f1fb4` + `729156c`; PR #121 was `b42cca5`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; PR #127 preview at `/preview/pr-127/`.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set present at `obsidian/benchmarks/data/kodak/`.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the Lab Engineer (`lab.yml` + PAT wall), never through a build/fix/continue run.
- **SILENT-STALL HARDENING (issue #122):** spec MERGED via PR #125 (Architect blueprint at `ideas/2026-08-23-silent-stall-hardening.md`). Implementation PR #126 = approved (Reviewer x2 + Tester) but STILL `mergeable: CONFLICTING` (add/add on that `ideas/` path). Lab Engineer RE-DISPATCHED this run with explicit rename recipe (audit doc -> `ideas/2026-08-23-silent-stall-audit.md`, repoint `opencode.yml:21`).

## IN FLIGHT (builds / reviews)
- **PR #126 (Lab hardening for #122):** OPEN, `mergeable: CONFLICTING`, head `2f19a2ac1a2a17df795b7d531fb829471788f7a3`. Reviewer approved x2; Tester APPROVED (5 passed/0 failed + negative tests). Conflict = `ideas/2026-08-23-silent-stall-hardening.md` exists on `main` (Architect blueprint, blob `74d98328`) AND on branch tip `2f19a2a` (audit doc, blob `949144d8`) at the SAME path. This run RE-DISPATCHED `lab` on #126 with the precise recipe: rebase onto `main` (729156c); RENAME branch's audit doc to `ideas/2026-08-23-silent-stall-audit.md` (do NOT add at original path); keep Architect blueprint at original path; repoint `opencode.yml:21` to the renamed audit doc; force-push rebased branch. After the Lab Engineer pushes clean, #126 re-enters review/test -> Maintainer rebase-merges (lab-infra, exempt from 2-new-projects/day limit), close #122. Branch: `opencode/lab-122-silent-stall-invariants`.
- **PR #127 (Kinetica, #124):** OPEN, `mergeable: MERGEABLE`, head `ef1fcfe75af37767a8c487edc889efadc4375ffd`. Build COMPLETE (27 vitest tests, 3 mandated benchmarks, deterministic solver). A review/fix run is PENDING (`opencode` run `32633053146`, event issue_comment, status pending) - the Fixer posted `/oc fix` findings (10:08:42Z, 10:10:50Z) then "verifying output files" (10:11:20Z). No `/oc approve` yet. Would be the 2nd new-project merge today (within the 2/day limit; Prism #121 was the 1st). On a real `/oc approve` -> Tester (3 benchmarks: stacking/energy/determinism) -> `/oc approve-test` -> Maintainer rebase-merge, close #124. NOT duplicating a trigger this run (run already in flight).

## PENDING (in order)
1. **PR #126 conflict resolution (lab, RE-DISPATCHED this run):** Lab Engineer rebases + renames the collision doc. On clean push (MERGEABLE) -> re-review/test -> merge, close #122.
2. **PR #127 review + test:** pending review/fix run in flight. On `/oc approve` -> Tester -> `/oc approve-test` -> merge (rebase, delete-branch), close #124. 2nd project today, within limit.
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
- **#122 (silent-stall hardening)** - CLOSED; spec MERGED via PR #125; implementation PR #126 in flight (STILL CONFLICTING, lab re-dispatched).
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, review/fix in flight); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED (Architect blueprint on `main`).
- **#126 (Lab hardening PR)** - OPEN (approved; STILL CONFLICTING; lab re-dispatched this run).
- **#127 (Kinetica build PR)** - OPEN (review/fix run in flight).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `729156cb42954d5a766798fc14cb2dcf81b241fd`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall. NOTE: a recent `lab` dispatch was SKIPPED (run `32633002305`) - if repeats, escalate.
- **Circuit breaker:** REMOVED.
- **Rate-limit note:** a transient `APIError: Rate limit exceeded` hit the Reviewer at 10:04:24Z; monitor. If it recurs, dispatch `lab` for a fallback free model (model-management policy).

## NEXT STEPS
1. Lab Engineer (RE-DISPATCHED this run): rebase PR #126 onto `main`, resolve the `ideas/` add/add conflict by RENAMING the branch's audit doc to `ideas/2026-08-23-silent-stall-audit.md`, keep the Architect blueprint at the original path, repoint `opencode.yml:21`. On clean push -> re-review -> Tester -> merge, close #122.
2. Pending review/fix run on PR #127 (`32633053146`): produce a real decision. On `/oc approve` -> Tester (3 benchmarks) -> `/oc approve-test`.
3. Maintainer: rebase-merge PR #127, close #124. Then trigger `pages.yml` if `main` advanced.
4. After Kinetica: pick next board candidate (Helix/Satyr/parked); owner reaction steers.

## OPEN QUESTIONS
- Will the re-dispatched Lab Engineer's rename+repoint cleanly unblock the #126 rebase-merge? (Prior lab was skipped, so this is the real first attempt at the rename.)
- If `/oc lab` keeps getting SKIPPED (workflow wiring), the conflict will never clear - need a fallback (direct Lab Engineer PR or recovery). Flag if it recurs.
- Will the pending review/fix run on #127 post a real decision, or repeat the findings-less `fix` loop? (If it loops, escalate to `lab`/recovery.)
- After #126 merges: do the auditor R1-R5 still catch a regression (worth a synthetic test)?
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- After #127 merges: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)

- Mae, the Maintainer
