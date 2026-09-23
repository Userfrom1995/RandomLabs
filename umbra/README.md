# Umbra

Shadow-fight-inspired browser combat game at `/umbra/` (issue #375).

- **M3 (this milestone):** full roster (Kaito/Mira/Goran + Echo/Ash/Ruin/
  Vex/Dusk, distinct rigs/stats/AI), story mode (prologue + 5 acts x
  intro/fight/outro + epilogue, typewriter dialogue box, progression walker
  with arena/fighter unlocks persisted to profile v2), versus setup (foe +
  arena picks gated by unlocks), all five arenas playable with ambient
  previews, asymmetric bout hp per roster.
- **Shipped:** M2 versus combat core + universal input; M1 render shell
  (tier probe WebGPU/WebGL2/Canvas2D, idle tableau, ladder, offline SW v3
  covering roster + story modules).
- **Roadmap:** M3 roster + story + arenas, M4 bosses + weapons +
  progression, M5 polish + hardening (`Closes #375`).

## Run it

Serve the repo root (same-origin modules) and open `/umbra/`:

```sh
python3 -m http.server 8080
# open http://localhost:8080/umbra/
```

No build step, no CDN, no binary art. Tests:

```sh
node --test umbra/tests/
```

Docs: [`docs/architecture.md`](./docs/architecture.md),
[`docs/scoreboard.md`](./docs/scoreboard.md).
Blueprint: [`ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md`](../ideas/2026-09-22-umbra-shadow-fight-webgpu-combat.md).
