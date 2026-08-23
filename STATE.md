# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32641382895, PR #127 MERGED, #124 CLOSED, lab idle -> Ideator dispatched). Prism shipped & MERGED (#121, 3.675 bpp real-Kodak). Kinetica (#124) build COMPLETE, MERGED via rebase at `8315dfa` (head `b45c34f`, F1-F5 fixes + 27 vitest green + 3 mandated benchmarks pass). Silent-stall hardening #122 DONE (#125 + #126 MERGED, #122 CLOSED).

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103, M0 MERGED via #104; M1-M4 via #117 + PR #121):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7. Merged via rebase at `b42cca5`; #117 closed. (1st new project today.)
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS (applied run 32625331911):** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (delete-branch only on merge via rebase).
- **Quality-gate directive:** quality gates are the ONLY merge criteria. Met bit-exactly on real data for Prism; met via full review->test gate for Kinetica.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** Resolved: spec MERGED via PR #125; implementation MERGED via PR #126; #122 CLOSED.
- **Kinetica is issue #124 (MERGED via PR #127).** Research+Architect+Builder+Fixer+Reviewer+Tester all ran; merged via rebase at `8315dfa` (head `b45c34f`, F1-F5 fixes + 27 vitest green + 3 mandated benchmarks pass). #124 CLOSED by merge.
- **`/oc lab` IS WIRED** via `lab.yml`.
- **MAINTAINER CHECKOUT IS SHALLOW BY DEFAULT.** Always `git fetch origin --unshallow` before testing orphan status (the 10:31:11Z "orphan" verdict on #127 was a shallow-fetch false positive; branch actually shared ancestry at `b42cca5`).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `8315dfa5601c428bdc3ba9b9dac339d1e8d585f0`** (advanced by PR #127 merge: fixer commits F4/F5 + node_modules ignore, stacked above `da5bdde3` which already had #126 + Prism #121). Prism #121 (`b42cca5`) and hardening #126 (`da5bdde3`) are ancestors of current `main`.
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; PR #127 preview existed at `/preview/pr-127/` (now that #127 is merged the branch is deleted, so the preview artifact is stale but harmless; production site rebuilt from `main` after the merge).
- **PR #127 MERGED (head `b45c34f`):** rebase-merge at `8315dfa`; branch deleted; #124 closed.

## IN FLIGHT (builds / reviews)
- **NONE.** All factory PRs closed. Lab is idle.

## PENDING (in order)
1. **Ideator dispatched (run 32641382895):** brainstorm board (#42) should get fresh candidates; the Maintainer picks the next build from owner reaction.
2. **Next build:** pick a Brainstorm (#42) candidate (Helix/Go vector-search, Satyr/Scala SAT-solver, or a fresh Ideator candidate). Owner reaction steers.
3. **Kinetica follow-ups (non-blocking, future iteration):** N1 dead `World.rng`/polygon fields; N2 coupled 2x2 revolute solve; N3 golden-checksum determinism test; N4 unused joint factories/limits. These are quality improvements, not gate blockers - route via `architect`/`research` later, not a re-merge.

## ISSUES
- **#42 (Brainstorm Board)** - OPEN; Ideator to refresh candidates; next build picked from here.
- **#68 (Obsidian umbrella)** - CLOSED.
- **#70 (Lab Health)** - OPEN; routine audit board.
- **#103 (Prism)** - CLOSED (MERGED #121).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#117 (Prism M1-M4)** - CLOSED.
- **#118 (Prism build branch)** - CLOSED; branch retained.
- **#121 (full B5-B11 build)** - MERGED to `main` at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED (spec MERGED via #125; implementation MERGED via #126).
- **#124 (Kinetica)** - CLOSED (MERGED via PR #127 at `8315dfa`).
- **#125 (spec for #122)** - MERGED.
- **#126 (Lab hardening PR)** - MERGED.
- **#127 (Kinetica build PR)** - MERGED (head `b45c34f`, branch deleted).

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `8315dfa5601c428bdc3ba9b9dac339d1e8d585f0`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Rate-limit note:** transient `APIError: Rate limit exceeded` hit the Reviewer earlier today; it did not block the final gate (review+test completed cleanly at 13:04-13:07Z). Monitor, fallback via `lab` if it recurs.

## NEXT STEPS
1. Ideator: refresh the Brainstorm (#42) board with 2-3 candidates.
2. Maintainer: pick the next build from owner reaction (or a parked candidate); open a real `agent-generated` issue; dispatch `research`/`architect` -> `build` per the pipeline.
3. (Optional) Kinetica follow-ups: route N1-N4 to `architect`/`research` as a next-iteration enhancement (does NOT re-merge #127; ships as a new PR if built).

## OPEN QUESTIONS
- Which Brainstorm (#42) candidate becomes the next build? Owner reaction steers.
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- Should the maintainer workflow be changed to always `git fetch --unshallow` before testing orphan status, to avoid the 10:31Z false-positive? Logged for a future `lab` improvement (not urgent; the recover path correctly no-op'd).
- Kinetica N1-N4 follow-ups: schedule a next-iteration build (new issue/PR) rather than patching the merged #127.

- Mae, the Maintainer
