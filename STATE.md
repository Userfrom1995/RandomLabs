# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32640946971, PR #127 "orphan" debunked as shallow-fetch false positive; re-entering review gate). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak). Kinetica (#124) build COMPLETE; branch `b45c34f` confirmed HEALTHY (shared `main` ancestry at `b42cca5`, clean merge-tree) - the earlier orphan verdict was a shallow-fetch artifact. Silent-stall hardening #122 DONE (#125 + #126 MERGED, #122 CLOSED).

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7. Reviewer + Tester both green; merged via rebase at `b42cca5`; #117 closed.
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS (applied run 32625331911):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (delete-branch only on merge via rebase).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** Resolved: spec MERGED via PR #125; implementation MERGED via PR #126; #122 CLOSED.
- **Kinetica is issue #124** (OPEN, Closes via PR #127). Research+Architect+Builder all ran; build complete with F1-F5 fixes applied. Branch `b45c34f` is **HEALTHY** (shared `main` ancestry at `b42cca5`, clean `merge-tree`) - the earlier "orphan" flag was a shallow-checkout false positive, now corrected. No `recover` continuation PR was created (all recover runs `skipped`); the original branch is intact.
- **`/oc lab` IS WIRED** via `lab.yml`.
- **MAINTAINER CHECKOUT IS SHALLOW BY DEFAULT.** The `maintainer.yml` checkout fetched `main` at depth 1, so `git merge-base origin/main <pr-head>` returned EMPTY and `git merge-tree` refused unrelated histories for ANY branch - a false "orphan". Always `git fetch origin --unshallow` before testing orphan status. (Lesson logged 2026-08-23, run 32640946971.)

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5`** (advanced by PR #126 merge; Prism #121 rebase-merge at `b42cca5` is an ancestor of `main`).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; PR #127 preview at `/preview/pr-127/`.
- **PR #127 branch HEALTHY (NOT orphan):** head `b45c34f` (F1-F5 fixes applied, 27 vitest green). `git merge-base origin/main b45c34f` = `b42cca5` (shared ancestry); `git merge-tree --write-tree origin/main b45c34f` = clean tree `b6307fd...`, zero conflicts. `gh pr view` = `MERGEABLE`.

## IN FLIGHT (builds / reviews)
- **PR #127 (Kinetica, #124): HEALTHY, review gate RE-ENTERED.** Head `b45c34f` (F1-F5 fixes applied, 27 vitest green, 3 mandated benchmarks pass). Maintainer run 32640946971 issued `{"action":"review","pr":127,"head":"b45c34f..."}` so the Reviewer posts `/oc approve` → Tester (3 benchmarks) → `/oc approve-test` → Maintainer rebase-merge (delete-branch), close #124. 2nd project today, within the 2/day limit.

## PENDING (in order)
1. **PR #127 review + test:** on head `b45c34f` -> `/oc approve` -> Tester (3 benchmarks: stacking/energy/determinism) -> `/oc approve-test`.
2. **PR #127 merge:** Maintainer rebase-merge (delete-branch), close #124, trigger `pages.yml` if `main` advanced.
3. **Next board pick after Kinetica:** Helix (Go vector-search) / Satyr (Scala SAT-solver) from the fresh batch, or a long-parked candidate. Owner reaction steers.

## ISSUES
- **#42 (Brainstorm Board)** - OPEN; Kinetica picked -> issue #124 (built; branch healthy, merging).
- **#68 (Obsidian umbrella)** - CLOSED.
- **#103 (Prism)** - CLOSED.
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#117 (Prism M1-M4)** - CLOSED.
- **#118 (Prism build branch)** - CLOSED; branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED (spec MERGED via #125; implementation MERGED via #126).
- **#124 (Kinetica)** - OPEN; build complete, branch healthy, merging via review gate; Closes #124 on merge.
- **#125 (spec for #122)** - MERGED.
- **#126 (Lab hardening PR)** - MERGED (10:21:09Z); closed #122.
- **#127 (Kinetica build PR)** - OPEN (HEALTHY, review gate re-entered).
- **#70 (Lab Health)** - OPEN; routine audit board.
- **#42 (Brainstorm)** - OPEN; candidate board.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `da5bdde3b5807ab2abe02d55d79aeb8e3f9dbcd5`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Rate-limit note:** transient `APIError: Rate limit exceeded` hit the Reviewer earlier today; monitor, fallback via `lab` if it recurs.

## NEXT STEPS
1. Reviewer: post `/oc approve` on `b45c34f` (F1-F5 already verified fixed by the 10:31:11Z pass; only the false orphan blocked approval).
2. Tester: run 3 mandated benchmarks (stacking/energy/determinism) -> `/oc approve-test`.
3. Maintainer: rebase-merge #127 (delete-branch), close #124, trigger `pages.yml` if `main` advanced.
4. After Kinetica: pick next Brainstorm (#42) candidate.

## OPEN QUESTIONS
- Was the spurious "orphan" verdict the ONLY thing blocking #127, or is there a deeper review concern? The 10:31:11Z Reviewer pass verified F1-F5 fixed and only cited the (false) orphan; a fresh review on `b45c34f` should approve cleanly.
- After #127 merges: which Brainstorm (#42) candidate becomes the next build? Owner reaction steers.
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- Should the maintainer workflow be changed to always `git fetch --unshallow` (or deepen) before testing orphan status, to avoid this false positive in future? Logged for a future `lab` improvement (not urgent; the recover path correctly no-op'd).

- Mae, the Maintainer
