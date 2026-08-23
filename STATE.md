# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32634056418, PR #127 confirmed ORPHAN, `recover` in flight). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak). Kinetica (#124) build COMPLETE but its PR branch is ORPHAN (no shared `main` ancestry); Recover Agent re-link IN FLIGHT. Silent-stall hardening #122 DONE (spec PR #125 MERGED; implementation PR #126 MERGED; #122 CLOSED).

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS (applied run 32625331911):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (delete-branch only on merge via rebase).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** Resolved: spec MERGED via PR #125; implementation MERGED via PR #126; #122 CLOSED.
- **Kinetica is issue #124** (OPEN, Closes via PR #127). Research+Architect+Builder all ran; build complete with F1-F5 fixes applied. PR branch is ORPHAN (root descends from pre-rebase-merge `main`, no shared ancestry with `da5bdde3`) -> Recover Agent re-link IN FLIGHT.
- **`/oc lab` IS WIRED** via `lab.yml`.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5`** (advanced by PR #126 merge).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; PR #127 preview at `/preview/pr-127/`.
- **ORPHAN DETECTED on PR #127:** head `b45c34f` (F5 em-dash fix, 27 vitest green). Root chain (`1831084`, `52d775e`, `91c8707`) descends from pre-rebase-merge `main`, so `git merge-base origin/main b45c34f` is EMPTY and `git merge-tree` refuses unrelated histories. `main` was rewritten via rebase-merges (Prism #121 -> `b42cca5`, hardening #126 -> `da5bdde3`), and the Kinetica branch was built on the older `main` then force-pushed, keeping the old base. Cannot be rebase-merged while orphan. Safety envelope forbids me from pushing to the PR branch, so `recover` is the sanctioned re-link mechanism.

## IN FLIGHT (builds / reviews)
- **PR #127 (Kinetica, #124): ORPHAN, RECOVER IN FLIGHT.** Head `b45c34f` (F1-F5 fixes applied, 27 vitest green). `recover` run `32634050069` IN PROGRESS (owner `/oc recover` 10:32:53Z); queued duplicate `32634056404`. Recover Agent re-links Kinetica's own commits onto `da5bdde3` as a clean continuation PR (preserving the full build + F1-F5 fixes); `recover/<pr>` tag protects the commits. After re-link: review -> Tester (3 benchmarks) -> approve-test -> Maintainer rebase-merge (delete-branch), close #124. 2nd project today, within the 2/day limit.

## PENDING (in order)
1. **PR #127 recover:** Recover Agent re-links branch onto `main` (da5bdde3); verify MERGEABLE + shared ancestry after.
2. **PR #127 review + test:** on re-linked head -> `/oc approve` -> Tester (3 benchmarks: stacking/energy/determinism) -> `/oc approve-test`.
3. **PR #127 merge:** Maintainer rebase-merge (delete-branch), close #124, trigger `pages.yml` if `main` advanced.
4. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate. Owner reaction steers.

## ISSUES
- **#42 (Brainstorm Board)** - OPEN; Kinetica picked -> issue #124 (built; branch orphan, recovering).
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED.
- **#112 (auto PR recovery)** - CLOSED (shipped #114). Now exercised by PR #127 recover.
- **#117 (Prism M1-M4)** - CLOSED.
- **#118 (Prism build branch)** - CLOSED; branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED (spec MERGED via #125; implementation MERGED via #126).
- **#124 (Kinetica)** - OPEN; build complete, branch orphan, recovering via `recover`; Closes #124 on merge.
- **#125 (spec for #122)** - MERGED.
- **#126 (Lab hardening PR)** - MERGED (10:21:09Z); closed #122.
- **#127 (Kinetica build PR)** - OPEN (ORPHAN, recover IN FLIGHT).
- **#70 (Lab Health)** - OPEN; routine audit board.
- **#42 (Brainstorm)** - OPEN; candidate board.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Rate-limit note:** transient `APIError: Rate limit exceeded` hit the Reviewer earlier today; monitor, fallback via `lab` if it recurs.

## NEXT STEPS
1. Recover Agent: re-link PR #127 onto `main` (da5bdde3), preserving Kinetica's own commits (incl. F1-F5 fixes); verify shared ancestry + MERGEABLE.
2. On re-linked PR: review -> Tester (3 benchmarks) -> approve-test -> Maintainer rebase-merge, close #124, trigger pages.yml.
3. After Kinetica: pick next Brainstorm (#42) candidate.

## OPEN QUESTIONS
- Will `recover` cleanly re-link only Kinetica's own commits (excluding the old prism/obsidian commits already on `main` under rebased SHAs) onto `da5bdde3`? If recover duplicates old commits or stays orphan, escalate to Lab Engineer.
- After re-link: does review -> Tester (3 benchmarks) -> approve-test close cleanly? Then merge, close #124 (2nd project today, within limit).
- After #127 merges: which Brainstorm (#42) candidate becomes the next build? Owner reaction steers.
- Rate-limit stability of the free model tier - monitor; fallback if needed.

- Mae, the Maintainer
