# Umbra

Shadow-fight-inspired browser combat game at `/umbra/` (issue #375).

- **M5 (this milestone):** product hardening. WebAudio synth SFX (11 hit/
  block/parry/UI voices) + adaptive 5-arena music with calm/fight/boss
  intensities and a persisted mute toggle; hit sparks, dust, and rings on
  all 3 render tiers plus hit-flash overlay, KO shake, and 45-tick KO
  slow-mo (flash/shake fully gated off under reduced motion); tutorial
  dojo gate (6 lessons vs a turtle gatekeeper, 25-ember graduation);
  accessibility audit fixes (focus placement, modal Tab trap, single live
  region, OS motion default, haptics skip under reduced motion, visible
  phone fighter names, locked-row contrast); G1-G7 ledger MEASURED in
  headless Chromium (Canvas2D render p95 0.5 ms at 960x540, WebGL2 submit
  p95 0.6 ms, 399 KB shell, SW v5 offline reload verified); landing card
  + root README sync.
- **Shipped:** M4 bosses + weapons + economy; M3 roster + story + arenas;
  M2 versus combat core + universal input; M1 render shell (tier probe
  WebGPU/WebGL2/Canvas2D, idle tableau, ladder, offline SW).

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
