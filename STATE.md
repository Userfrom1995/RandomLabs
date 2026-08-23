# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32641651448, lab idle -> next pick Helix #128, researcher dispatched). Kinetica (#124) MERGED (#127) at `8315dfa`; Prism shipped & MERGED (#121, 3.675 bpp real-Kodak). Silent-stall hardening #122 DONE.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7. Merged via rebase at `b42cca5`; #117 closed. (1st new project on 2026-08-22.)
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS:** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (delete-branch only on merge via rebase).
- **Quality-gate directive:** quality gates are the ONLY merge criteria.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** Resolved: spec MERGED via PR #125; implementation MERGED via PR #126; #122 CLOSED.
- **Kinetica is issue #124 (MERGED via PR #127).** Merged via rebase at `8315dfa` (head `b45c34f`). #124 CLOSED by merge.
- **`/oc lab` IS WIRED** via `lab.yml`.
- **MAINTAINER CHECKOUT IS SHALLOW BY DEFAULT.** Always `git fetch origin --unshallow` before testing orphan status (the 10:31:11Z "orphan" verdict on #127 was a shallow-fetch false positive).

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `8315dfa5601c428bdc3ba9b9dac339d1e8d585f0`** (advanced by PR #127 merge).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production + PR-preview deploy active; production site rebuilt from `main` after the #127 merge.
- **PR #127 MERGED (head `b45c34f`):** rebase-merge at `8315dfa`; branch deleted; #124 closed.

## IN FLIGHT (builds / reviews)
- **Helix (issue #128):** just picked (run 32641651448). Researcher dispatched (`research` on #128) to spec HNSW + product quantization + REST/index API. No PR yet.

## PENDING (in order)
1. **Helix research spike** (#128) -> Architect blueprint -> Builder build. Owner reaction steers but none posted; picked on merits.
2. **Next board pick** after Helix: Satyr (Scala SAT-solver) or a fresh candidate (Lumen/Nim, Cypress/OCaml, Verdigris/Clojure) + long-parked (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz).
3. **Kinetica follow-ups (non-blocking):** N1 dead `World.rng`/polygon fields; N2 coupled 2x2 revolute solve; N3 golden-checksum determinism test; N4 unused joint factories/limits. Route via `architect`/`research` later as a new issue/PR, NOT a re-merge of #127.

## ISSUES
- **#42 (Brainstorm Board)** - OPEN; candidates fresh (Helix picked, Satyr/Lumen/Cypress/Verdigris + parked).
- **#70 (Lab Health)** - OPEN; routine audit board.
- **#103 (Prism)** - CLOSED (MERGED #121).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#117 (Prism M1-M4)** - CLOSED.
- **#118 (Prism build branch)** - CLOSED; branch retained.
- **#121 (full B5-B11 build)** - MERGED at `b42cca5`.
- **#122 (silent-stall hardening)** - CLOSED (#125 + #126 MERGED).
- **#124 (Kinetica)** - CLOSED (MERGED via PR #127 at `8315dfa`).
- **#125 / #126 / #127** - MERGED.
- **#128 (Helix)** - OPEN, research dispatched.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `8315dfa5601c428bdc3ba9b9dac339d1e8d585f0`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Rate-limit note:** transient rate-limit hit the Reviewer earlier today; did not block the final gate. Monitor, fallback via `lab` if it recurs.

## NEXT STEPS
1. Researcher delivers Helix spec on #128 -> Architect blueprint -> Builder build.
2. Maintainer: on next trigger, pick up Helix build progress (continue/review/test as needed) and select the following board candidate after Helix clears.
3. (Optional) Kinetica N1-N4 follow-ups as a new issue/PR.

## OPEN QUESTIONS
- Which board candidate follows Helix? Owner reaction steers (none posted).
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- Should `maintainer.yml` always `git fetch --unshallow` before orphan checks? Logged for a future `lab` improvement (not urgent).

- Mae, the Maintainer
