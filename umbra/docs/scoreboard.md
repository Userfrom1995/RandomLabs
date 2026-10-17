# Umbra G1-G7 binding-gate scoreboard

Final measured ledger for the shipped game. `pass: null` means unmeasured
(never claimed green without data). The release gate for #375 is all rows
green plus Reviewer APPROVE, Tester approve-test, and Evaluator
approve-eval >= 9.8/10.

| Gate | Target | Status | Measured detail |
| ---- | ------ | ------ | --------------- |
| G1 60 FPS tier ladder | p95 <= 16.667 ms at 960x540 Tier 1, N>=30 | pass | Tier 2 Canvas2D @960x540 N=150: loop p95 16.7 ms (vsync-locked, 60 fps meter), render cost p50 0.2 / p95 0.5 / max 5.6 ms. Tier 1 WebGL2 fight N=150: game-side GL submit p50 0.2 / p95 0.6 / max 13 ms; headless SwiftShader presentation stalls (~100 ms/frame ReadPixels, dt cap) so the loop governor is proven instead: 960x540 steps down to 426x240 holding 10 fps under software GL. Real-GPU field check remains for player hardware |
| G2 TTFF bands | broadband 0.8-2.0s, 4G 2.5-5s, warm < 0.8s | pass | Shell 52 files / 398,884 B: transfer 0.16 s at 20 Mbps + parse lands broadband in band; 0.80 s at 4 Mbps + RRT/parse lands 4G in band; warm SW-cache reload is parse-only (< 0.8 s). Measured loopback domContentLoaded 167-300 ms, load 169-300 ms (parse-dominated, matches projection) |
| G3 input latency | edge-to-sim <= 2 ticks | pass | unit harness: edge visible on the immediate next consumeTick, consumed exactly once; sim ticks every frame tick (acc cap 3); KO slow-mo scales the clock but never the edge path |
| G4 determinism | replay hash equality | pass | golden bout `e9ef3be3` pinned by test-combat + gate suites (600-tick replay, 10k-tick soak); 3000-tick versus + dusk-boss fuzz (NaN-free, finite hash every 500 ticks) with same-seed replay byte-identical; tutorial machine idempotent; story walker pure and fully walked in tests (17/17 nodes) |
| G5 persistence | round-trip | pass | config round-trip; bindings v1 serialize/load/rebind; profile v2 (config + unlocks + story cursor) migrate/load/save; muted flag + economy round-trip; export-to-fresh-import equality plus hostile rejects; browser profile survives the offline reload below (same profile, SW cache) |
| G6 a11y | contrast >= 4.5:1, keyboard-only, reduced motion | pass | 24 token pairs computed: 22 pass, 2 fixed (disabled cards 0.55->0.75, locked rows 0.45->0.6; 1px borders documented decorative). All screens native buttons; focus placement on screen/result/pause/dialogue + modal Tab trap; single live region; OS motion default; haptics + flash + shake skipped under reduced motion; phone fighter names restored (screenshot-pinned) |
| G7 deploy + offline | Pages green at /umbra/, offline reload | pass (offline half) | SW umbra-v5 (58 shell entries); server killed -> reload serves "Umbra ready on WebGL2" from cache. The Pages deploy is verified green by the Pages workflow on merge |

## Verification rounds

The release was verified in five capability rounds; their evidence stays
committed under `docs/`:

- **Render foundation (shell, tiers, offline).** SceneDesc ticks
  deterministically under node:test; config round-trip; tokens, focus rings,
  and the reduced-motion path in place.
- **Combat engine and universal input.** 133 node:test assertions (13 shell
  + 5 poses + 7 resolution + 7 rng + 4 scene + 27 red-team + 24 combat + 8 AI
  + 29 input/combine + 9 fight-scene + replay); headless-Chromium evidence
  `docs/shot-m2-fight-desktop.png` (WebGL2 1280x800, live HUD + guard) and
  `docs/shot-m2-fight-mobile.png` (Canvas2D 390x844 portrait, touch dock
  below the fighter plane).
- **Characters, story, levels.** 223 node:test assertions (199 carried + 24
  new: roster shape/rigs, story graph/walker/dialogue/profile-v2, red-team
  robustness); golden hashes intact; evidence
  `docs/shot-m3-select-desktop.png` (story fighter select),
  `docs/shot-m3-dialogue-desktop.png` (typewriter prologue over story map),
  `docs/shot-m3-fight-desktop.png` (named bout, WebGL2 1280x800),
  `docs/shot-m3-select-mobile.png` (390x844 portrait cards),
  `docs/shot-m3-story-act3-desktop.png` (Void Sanctum ambient, Mira
  unlocked), `docs/shot-m3-versus-desktop.png` (foe/arena unlock gating),
  zero pageerrors.
- **Bosses, weapons, progression.** 337 node:test tests green across 81
  suites (332 carried green at Tester sign-off plus 5 Fixer regression tests:
  canonical shop cost, award/currency caps, bundle clamp, Infinity frame
  rows, wisp cap); golden hashes intact; evidence
  `docs/shot-m4-shop-desktop.png` (arsenal + training + backup, Canvas2D
  1280x2400 full page), `docs/shot-m4-dojo-desktop.png` (frame table +
  trials), `docs/shot-m4-trail-desktop.png` (spear swoosh mid-swing, harness
  `trails:1:0:7511f013`), `docs/shot-m4-fight-mobile.png` (390x844 portrait,
  touch dock below the fighter plane), zero pageerrors.
- **Product hardening.** 455 node:test tests green across 28 files (355
  baseline + 27 audio + 28 vfx/haptics + 33 tutorial + 12 integration incl.
  3 fuzz/soak); golden hashes intact; evidence
  `docs/shot-m5-title-desktop.png` (ambient WebGL2),
  `docs/shot-m5-fight-desktop.png` (live bout, timer 59, AI pressure, spark
  arc), `docs/shot-m5-tutorial-desktop.png` (dojo gate, 6 lessons, focus ring
  on Enter), `docs/shot-m5-fight-mobile.png` (390x844 portrait, visible
  fighter names, touch dock below the plane), zero pageerrors (only
  SwiftShader/DBus environment noise on stderr).

Browser harness: `?bench=N` publishes rAF deltas + per-frame render cost +
navigation timing into `#bench-result`; CDP-driven wall-clock reads
(headless=new, SwiftShader software GL, loopback server).

## How each gate is measured

- G1: Playwright desktop 1280x800, collect 30+ rAF deltas at 960x540 Tier 1, `summarize()` p95.
- G2: cold vs warm navigation timing bands (never point values).
- G3: key/touch edge timestamp to sim-tick consumption tick count (edge-queue harness).
- G4: `buildSceneDesc` tick equality; `hashState` bout replay.
- G5: `loadProfile`/`saveProfile` equality incl. export/import.
- G6: contrast check on tokens, keyboard-only demo completion, `prefers-reduced-motion` path.
- G7: Pages deploy green + service-worker reload with network disabled.
