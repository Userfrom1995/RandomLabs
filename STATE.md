# STATE - Random factory checkpoint
- **Updated:** 2026-08-23 (maintainer run 32643483395, Helix PR #129 MERGED, #128 CLOSED). Kinetica (#124) MERGED (#127); Prism shipped & MERGED (#121); silent-stall hardening #122 CLOSED via #125/#126. Obsidian is the current codec in `main`.

## STANDING OWNER DIRECTIVES (active)
- **Obsidian shipped** (#93 manually merged by owner as orphan root; promoted to Current via #115; docs cleaned by #116). Obsidian is the current codec in `main`; last confirmed REAL-Kodak baseline **9.5209 bpp**. #68 CLOSED.
- **Prism (issue #103):** GATE MET - real-Kodak mean 3.675 bpp at effort 3/7. Merged via rebase at `b42cca5`; #117 closed.
- **Kinetica (issue #124):** MERGED via rebase at `8315dfa` (head `b45c34f`); #124 CLOSED. (1st new project on 2026-08-23.)
- **Helix (issue #128):** MERGED via rebase at `fa09ff7` (head `130cfa6e`); #128 CLOSED. (2nd new project on 2026-08-23.)
- **Iteration limit LIFTED** (owner, 2026-08-22T14:51Z); circuit breaker DELETED (main commit `91c8707`).
- **MODEL PINS:** research/architect/build/fixer = `opencode/x-preview-f-free`; lab engineer = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **One-PR rule + NEVER delete PR branches:** satisfied (delete-branch only on merge via rebase).
- **Quality-gate directive:** quality gates are the ONLY merge criteria.

## CORRECTED RECORDS
- **Issue #122 = "[Infra] Harden /oc continue dispatch against silent-stall" (CLOSED).** Resolved via #125 + #126.
- **Kinetica is issue #124 (MERGED via PR #127).** Merged at `8315dfa`. #124 CLOSED.
- **Helix is issue #128 (MERGED via PR #129).** Merged at `fa09ff7`. #128 CLOSED.
- **`/oc lab` IS WIRED** via `lab.yml`.
- **MAINTAINER CHECKOUT IS SHALLOW BY DEFAULT.** Always `git fetch origin --unshallow` before testing orphan status.

## CRITICAL INFRASTRUCTURE STATE
- **`main` = `fa09ff73c4d6435e02ed6016dcbd5c900e96ce3d`** (advanced by PR #129 merge).
- **MODELS:** research/architect/build/fixer/lab = `opencode/x-preview-f-free`; `general` = `opencode/hy3-free`; `small_model` = `opencode/mimo-v2.5-free` (all free).
- **pages.yml:** production rebuild triggered (run 32643555673, queued) after the #129 merge; PR #129 preview was at `/preview/pr-129/`.
- **SHIPPING LIMIT:** 2/2 new projects merged today (Kinetica #127, Helix #129). No further new-project merges until 2026-08-24.

## IN FLIGHT (builds / reviews)
- None. Helix (#129) merged; pipeline idle and healthy.

## PENDING (in order)
1. **Next board pick** after Helix: Satyr (Scala SAT-solver), Lumen/Cypress/Verdigris (Ideator batch 13:12Z), or a long-parked candidate (Corundum, Tundra, Ravel, Aether, Nimbus, Penumbra, Vellum, Cartograph, Lyricon, Quartz). Owner reaction steers. NOTE: any new build started today cannot merge until tomorrow (2/day limit reached).
2. **Kinetica follow-ups (non-blocking):** N1 dead `World.rng`/polygon fields; N2 coupled 2x2 revolute solve; N3 golden-checksum determinism test; N4 unused joint factories/limits. Route via `architect`/`research` later as a new issue/PR, NOT a re-merge of #127.

## ISSUES
- **#42 (Brainstorm Board)** - OPEN; candidates fresh (Helix merged, Satyr/Lumen/Cypress/Verdigris + parked).
- **#70 (Lab Health)** - OPEN; routine audit board.
- **#103 (Prism)** - CLOSED (MERGED #121).
- **#112 (auto PR recovery)** - CLOSED (shipped #114).
- **#117 / #118 / #121** - CLOSED/MERGED.
- **#122 (silent-stall hardening)** - CLOSED (#125 + #126 MERGED).
- **#124 (Kinetica)** - CLOSED (MERGED via PR #127).
- **#125 / #126 / #127** - MERGED.
- **#128 (Helix)** - CLOSED (MERGED via PR #129 at `fa09ff7`).
- **#129 (Helix PR)** - MERGED (head `130cfa6e`), branch deleted.

## REVIEWER/TESTER/MODEL STATUS
- `origin/main` = `fa09ff73c4d6435e02ed6016dcbd5c900e96ce3d`.
- Build agent (`model:` input): `opencode/x-preview-f-free` (FREE).
- **Rate-limit note:** transient rate-limit hit the Reviewer earlier today; did not block the final gate. Monitor, fallback via `lab` if it recurs.

## NEXT STEPS
1. Wait for owner reaction to steer the next Brainstorm (#42) candidate (any new build must wait for 2026-08-24 merge slot due to 2/day limit).
2. Confirm pages.yml run 32643555673 succeeds and the production site reflects Helix.
3. (Optional) Kinetica N1-N4 follow-ups as a new issue/PR.

## OPEN QUESTIONS
- Which board candidate follows Helix? Owner reaction steers (none posted); lab idle.
- Rate-limit stability of the free model tier - monitor; fallback if needed.
- Should `maintainer.yml` always `git fetch --unshallow` before orphan checks? Logged for a future `lab` improvement (not urgent).

- Mae, the Maintainer
