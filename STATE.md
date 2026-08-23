# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32633295811, PR #126 fully approved + MERGEABLE - conflict resolved by Lab Engineer rename; routing PR #127 to fresh review gate at head a146682). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak, clears JXL 8.71 by 2.37x). Kinetica (#124) build COMPLETE, in review (PR #127, fresh review dispatched this run). Silent-stall spec PR #125 MERGED; hardening PR #126 fully vetted and now MERGEABLE (merging via approve-test→maintainer run), will close #122.

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
- **PRIOR LAB RUN WAS SKIPPED (CORRECTION):** the Lab Engineer run triggered by owner `/oc lab` at 10:08:47Z/10:09:17Z (run `32633002305`, 10:09:49Z) concluded `skipped` - it did NOT rebase the branch. A SUBSEQUENT lab run (later in the window, after re-dispatch) SUCCEEDED: the branch is now `a6846e3`, MERGEABLE, with the audit doc renamed to `ideas/2026-08-23-silent-stall-audit.md` and `opencode.yml:21` repointed; the Architect blueprint stays at the original path.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `729156cb42954d5a766798fc14cb2dcf81b241fd`** (advanced by PR #125 merge `57f1fb4` + `729156c`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; PR #127 preview at `/preview/pr-127/`.
- **CIRCUIT BREAKER: REMOVED.**
- **CONCURRENCY NOTE:** `opencode-${{issue}}` and `maintainer-${{issue}}` are SEPARATE concurrency groups (`cancel-in-progress: false`).
- **KODAK CORPUS:** real 24-image set present at `obsidian/benchmarks/data/kodak/`.
- **WORKFLOW PUSH GUARD:** `.github/workflows/*.yml` changes go through the Lab Engineer (`lab.yml` + PAT wall), never through a build/fix/continue run.
- **SILENT-STALL HARDENING (issue #122):** spec MERGED via PR #125 (Architect blueprint at `ideas/2026-08-23-silent-stall-hardening.md`). Implementation PR #126 = fully vetted (Reviewer x3 + Tester x2, 5 passed/0 failed + negative tests) and now **MERGEABLE** (head `a6846e3`). Conflict resolved by Lab Engineer rename+repoint. Merging via the dedicated approve-test→maintainer run (triggered by Tester's 10:18:09Z `/oc approve-test`); lab-infra PR, exempt from 2-new-projects/day limit. Then close #122.

## IN FLIGHT (builds / reviews)
- **PR #126 (Lab hardening for #122):** OPEN, `mergeable: MERGEABLE`, head `a6846e324097785e1e4046c47a462d589e2ea0bf`. Reviewer approved x3 (10:02:53Z, 10:04:24Z, 10:16:56Z at a6846e3); Tester approved (10:05:30Z, 10:18:09Z). No newer `/oc fix` findings. Conflict resolved (audit doc renamed to `ideas/2026-08-23-silent-stall-audit.md`; `opencode.yml:21` repointed; Architect blueprint preserved at original path). The approve-test→maintainer run (triggered 10:18:09Z) will rebase-merge it (delete-branch) and close #122. Branch: `opencode/lab-122-silent-stall-invariants`.
- **PR #127 (Kinetica, #124):** OPEN, `mergeable: MERGEABLE`, head `a14668217d0aea6741cff7567a80ec4ae2fc5104`. Build COMPLETE (27 vitest tests, 3 mandated benchmarks, deterministic solver). Reviewer posted "Code review: PASS" (10:13:57Z) but NO formal `/oc approve` routing to test, and the head moved since. THIS run dispatched `review` at head `a146682` to obtain a formal approval that forwards to the Tester (3 benchmarks: stacking/energy/determinism). On `/oc approve-test` -> Maintainer rebase-merge (rebase, delete-branch), close #124. 2nd project today, within the 2/day limit (Prism #121 was 1st).

## PENDING (in order)
1. **PR #126 merge (automatic):** the approve-test→maintainer run triggered by the Tester's 10:18:09Z approval will rebase-merge and close #122. Verify `pages.yml` runs if `main` advanced.
2. **PR #127 review + test:** fresh `review` dispatched this run (head a146682). On formal `/oc approve` -> Tester (3 benchmarks) -> `/oc approve-test` -> Maintainer rebase-merge, close #124.
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
- **#122 (silent-stall hardening)** - CLOSED; spec MERGED via PR #125; implementation PR #126 fully vetted + MERGEABLE, merging now; will close #122 on merge.
- **#124 (Kinetica)** - OPEN (picked from board #42); build COMPLETE (PR #127, fresh review dispatched this run); Closes #124 on merge.
- **#125 (spec for #122)** - MERGED (Architect blueprint on `main`).
- **#126 (Lab hardening PR)** - OPEN (approved x3 + Tester x2, MERGEABLE, merging now).
- **#127 (Kinetica build PR)** - OPEN (fresh `review` dispatched this run).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `729156cb42954d5a766798fc14cb2dcf81b241fd`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Lab Engineer:** `/oc lab` IS wired via `lab.yml` + PAT push wall. It SUCCEEDED this window in resolving the #126 add/add conflict (branch a6846e3, MERGEABLE).
- **Circuit breaker:** REMOVED.
- **Rate-limit note:** a transient `APIError: Rate limit exceeded` hit the Reviewer at 10:04:24Z; monitor. If it recurs, dispatch `lab` for a fallback free model (model-management policy).

## NEXT STEPS
1. Approve-test→maintainer run: rebase-merge PR #126 (delete-branch), close #122, verify `pages.yml` if `main` advanced.
2. PR #127 fresh `review` (head a146682): on formal `/oc approve` -> Tester (3 benchmarks) -> `/oc approve-test`.
3. Maintainer: rebase-merge PR #127, close #124. Then trigger `pages.yml` if `main` advanced.
4. After Kinetica: pick next board candidate (Helix/Satyr/parked); owner reaction steers.

## OPEN QUESTIONS
- Will the approve-test→maintainer run cleanly rebase-merge #126 and close #122? (Expected yes; MERGEABLE, no orphan risk.)
- Will the fresh `review` on #127 (head a146682) post a formal `/oc approve` and route to the Tester? On approve-test -> merge, close #124 (2nd project today, within limit).
- After #126 merges: do the auditor R1-R5 still catch a regression (worth a synthetic test)?
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- After #127 merges: which Brainstorm (#42) candidate becomes the next build? (Helix/Go, Satyr/Scala, or a parked one.)

- Mae, the Maintainer
