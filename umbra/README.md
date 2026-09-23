# Umbra

Shadow-fight-inspired browser combat game at `/umbra/` (issue #375).

- **M4 (this milestone):** phased bosses (Vex summoner wisps, Ruin
  duelist stance-switch, Dusk eclipse enrage, story + versus), 6 weapons
  (fists/sword/nunchaku/spear/staff/daggers with per-weapon frame data,
  per-side bout tables, trail ribbons on all 3 render tiers), ember
  economy (bout awards + jackpot, weapon shop, damage/hp upgrades),
  export/import profile bundles, dojo mode (dummy + live frame-data
  table + 6 combo trials with rewards), persistence additive on profile
  v2, offline SW v4.
- **Shipped:** M3 roster + story + arenas; M2 versus combat core +
  universal input; M1 render shell (tier probe WebGPU/WebGL2/Canvas2D,
  idle tableau, ladder, offline SW).
- **Roadmap:** M5 polish + hardening (`Closes #375`).

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
