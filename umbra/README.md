# Umbra

Shadow-fight-inspired browser combat game at `/umbra/` (issue #375).

- **Combat:** a deterministic fixed-step fight engine (12-state fighters,
  guard/parry/counter, combo scaling, per-side weapon frame data, summoner/
  duelist/eclipse boss AI) driven by universal input (keyboard, gamepad,
  touch) with a seeded AI opponent.
- **Content:** 3 playables plus 5 enemies over 5 arenas, a 17-node Ashen
  Veil story with typewriter dialogue and unlock flow, 6 weapons, a 6-trial
  dojo, an ember economy with upgrade tracks, career stats, and profile
  export/import.
- **Rendering:** one shared scene description drawn by three tiers (WebGPU,
  WebGL2, Canvas2D) picked by a capability probe, with a resolution ladder,
  EWMA governor, and battery lock; weapon-trail ribbons and spark bursts on
  all tiers.
- **Product polish:** WebAudio synth SFX (11 hit/block/parry/UI voices) and
  adaptive 5-arena music with calm/fight/boss intensities plus a persisted
  mute toggle; hit sparks, dust, rings, hit-flash overlay, KO shake, and
  45-tick KO slow-mo (flash and shake fully gated off under reduced motion);
  tutorial dojo gate (6 lessons vs a turtle gatekeeper, 25-ember
  graduation); accessibility pass (focus placement, modal Tab trap, single
  live region, OS motion default, haptics skip under reduced motion, visible
  phone fighter names, locked-row contrast); the G1-G7 ledger is measured in
  headless Chromium (Canvas2D render p95 0.5 ms at 960x540, WebGL2 submit
  p95 0.6 ms, 399 KB shell, offline reload verified).

## Run it

Serve the repo root (same-origin modules) and open `/umbra/`:

```sh
python3 -m http.server 8080
# open http://localhost:8080/umbra/
```

No build step, no CDN, no binary art. Tests:

```sh
node --test "umbra/tests/*.mjs"
```

Docs: [`docs/architecture.md`](./docs/architecture.md),
[`docs/scoreboard.md`](./docs/scoreboard.md).
Blueprint: [`ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`](../ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md).
