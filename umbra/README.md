# Umbra

Shadow-fight-inspired browser combat game at `/umbra/` (issue #375).

- **M2 (this milestone):** playable versus bout (you vs seeded Echo AI,
  best of 3, KO/rounds/60 s timer) on a deterministic headless combat core
  (`src/combat/`: FISTS frame data, hitboxes, block/parry/dodge, hit-stop,
  combos + scaling, 3 AI archetypes x 3 difficulties), universal input
  (keyboard + remappable bindings persisted to profile, gamepad API, touch
  joystick + strike cluster + haptics), sim-driven poses (strike/guard/
  hit/crumple tracks), hit-flash + KO shake, pause/result flow.
- **Shipped:** M1 render shell (tier probe WebGPU/WebGL2/Canvas2D, idle
  tableau, ladder, offline SW v2 covering combat + input modules).
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
