# Umbra

Shadow-fight-inspired browser combat game at `/umbra/` (issue #375).

- **M1 (this milestone):** static shell with title + versus-demo (ambient) +
  settings, tier probe (WebGPU / WebGL2 / Canvas2D) over one shared
  `SceneDesc`, idle fighters in the moonlit temple, resolution ladder +
  battery saver, offline service worker.
- **Roadmap:** M2 deterministic combat + input, M3 roster + story + arenas,
  M4 bosses + weapons + progression, M5 polish + hardening (`Closes #375`).

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
