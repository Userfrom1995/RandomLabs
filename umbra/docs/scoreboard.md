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

## M2 (deterministic combat engine + universal input)

133 node:test assertions green (13 shell + 5 poses + 7 resolution + 7 rng +
4 scene + 27 red-team + 24 combat + 8 AI + 29 input/combine + 9 fight-scene
+ replay), headless-Chromium evidence `docs/shot-m2-fight-desktop.png`
(WebGL2 1280x800, live HUD + guard) and `docs/shot-m2-fight-mobile.png`
(Canvas2D 390x844 portrait, touch dock below the fighter plane).

| Gate | Target | M2 status | Detail |
| ---- | ------ | --------- | ------ |
| G1 60 FPS tier ladder | p95 <= 16.667 ms at 960x540 Tier 1, N>=30 | pending | needs Playwright/browser measurement (unchanged from M1) |
| G2 TTFF bands | broadband 0.8-2.0s, 4G 2.5-5s, warm < 0.8s | pending | needs browser measurement (unchanged) |
| G3 input latency | edge-to-sim <= 2 ticks | partial | unit harness: edge visible on the immediate next consumeTick and consumed exactly once; sim ticks every frame tick (acc cap 3). Browser timestamp harness deferred to M5 |
| G4 determinism | replay hash equality | pass | 600-tick AI-vs-AI input-log replay byte-identical (hash + events); seed-375 golden bout `92028ae1`, 29 events; 10k-tick soak NaN-free |
| G5 persistence | round-trip | partial | bindings v1 round-trip (serialize/load/rebind) covered by node:test + profile config; full profile v1 in M4 |
| G6 a11y | contrast >= 4.5:1, keyboard-only, reduced motion | partial | keyboard-only bout completable (Enter/JKL/U/Space/Esc, no pointer path); focus rings kept; reduced-motion path kept; contrast audit pending M5 |
| G7 deploy + offline | Pages green at /umbra/, offline reload | pending | SW bumped to umbra-v2 covering combat + input modules; deploy check at M5 |

## How each gate is measured

- G1: Playwright desktop 1280x800, collect 30+ rAF deltas at 960x540 Tier 1, `summarize()` p95.
- G2: cold vs warm navigation timing bands (never point values).
- G3: key/touch edge timestamp to sim-tick consumption tick count (M2 harness).
- G4: `buildSceneDesc` tick equality now; `hashState` bout replay from M2.
- G5: `loadProfile`/`saveProfile` equality incl. export/import (export/import in M4).
- G6: contrast check on tokens, keyboard-only demo completion, `prefers-reduced-motion` path.
- G7: Pages deploy green + service-worker reload with network disabled.
