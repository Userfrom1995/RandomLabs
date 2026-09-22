# Umbra G1-G7 binding-gate scoreboard

Ledger per milestone. `pass: null` means unmeasured (never claimed green
without data). Final M5 `Closes #375` requires all green plus Reviewer
APPROVE, Tester approve-test, and Evaluator approve-eval >= 9.8/10.

## M1 (scaffold + render tiers + offline shell)

| Gate | Target | M1 status | Detail |
| ---- | ------ | --------- | ------ |
| G1 60 FPS tier ladder | p95 <= 16.667 ms at 960x540 Tier 1, N>=30 | pending | needs Playwright/browser measurement |
| G2 TTFF bands | broadband 0.8-2.0s, 4G 2.5-5s, warm < 0.8s | pending | needs browser measurement |
| G3 input latency | edge-to-sim <= 2 ticks | n/a M1 | no combat sim until M2 |
| G4 determinism | replay hash equality | partial | SceneDesc tick-deterministic (node:test); combat hash arrives M2 |
| G5 persistence | round-trip | partial | config round-trip covered by node:test; full profile v1 in M4 |
| G6 a11y | contrast >= 4.5:1, keyboard-only, reduced motion | partial | tokens + focus rings + reduced-motion path built; audit pending |
| G7 deploy + offline | Pages green at /umbra/, offline reload | pending | needs deploy + network-disabled reload check |

## How each gate is measured

- G1: Playwright desktop 1280x800, collect 30+ rAF deltas at 960x540 Tier 1, `summarize()` p95.
- G2: cold vs warm navigation timing bands (never point values).
- G3: key/touch edge timestamp to sim-tick consumption tick count (M2 harness).
- G4: `buildSceneDesc` tick equality now; `hashState` bout replay from M2.
- G5: `loadProfile`/`saveProfile` equality incl. export/import (export/import in M4).
- G6: contrast check on tokens, keyboard-only demo completion, `prefers-reduced-motion` path.
- G7: Pages deploy green + service-worker reload with network disabled.
