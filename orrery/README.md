# Orrery — an interactive 3D solar system

A living solar system in your browser, rendered from scratch with **WebGL**
and **TypeScript** — no game engine, no three.js, no external dependencies
beyond the TypeScript toolchain used to compile it. Open
[`orrery/index.html`](index.html) and fly to Jupiter.

[▶ Run it](https://userfrom1995.github.io/Random/orrery/) — hosted on GitHub Pages.

## What it does

- **Keplerian orbital mechanics** — every planet moves along its real orbit:
  correct semi-major axes, eccentricities, inclinations, nodes, and perihelia
  (J2000 elements from IAU/NASA values), with mean anomaly integrated from the
  body's real sidereal period. Orbits are solved with Newton–Raphson on
  Kepler's equation (`M = E − e·sin E`).
- **Procedural textures** — every planet's surface is painted from seeded
  value noise at startup: Earth's continents and ice caps, Jupiter's bands and
  Great Red Spot, Saturn's rings, Mars's craters, Venus's creamy swirls. The
  same seed always makes the same planet.
- **Lighting** — per-pixel diffuse + specular Phong lighting with the Sun as
  the single light source; the Sun itself is emissive with a layered additive
  glow halo.
- **A free-fly camera** — drag to look, WASD/QE to fly, wheel for speed, and
  click any planet (or use the menu) to fly to it and ride along as it orbits.
- **Time warp** — pause, or run the system from 0.05× to 4096× (Space,
  −/+, Ctrl+wheel, or the slider); the HUD shows the current simulated date,
  warp factor, and selected body.

## Controls

| Input | Action |
| --- | --- |
| Left-drag | Look around |
| Right-drag | Pan |
| WASD + Q/E | Fly forward/back/strafe/down/up |
| Mouse wheel | Change flight speed |
| Ctrl + wheel | Change time warp |
| Click a planet | Select and fly to it |
| Space | Pause / resume |
| `-` / `+` | Slower / faster time warp |
| `H` | Toggle the HUD |
| `Esc` | Return to free camera |

## Running it

```sh
cd orrery
npm install        # TypeScript + esbuild (dev only)
npm run build      # bundles src/main.ts → app.js
npm run typecheck  # strict TS check
npm run test       # 43 unit tests for the math/orbital/noise core
```

Then open `orrery/index.html` — or serve the folder (`python3 -m http.server`).
The bundled `app.js` is committed so the site works on GitHub Pages with no
build step.

## How it's built

```
src/
  math.ts      — vectors, matrices, look-at/perspective, kepler helpers
  kepler.ts    — Kepler's equation solver, orbital position/velocity/path
  bodies.ts    — the solar-system catalog (J2000 elements + visual config)
  noise.ts     — seeded 2D value noise + fBm (deterministic textures)
  shaders.ts   — GLSL programs: lit (Phong), unlit (lines/points), sprite
  geometry.ts  — UV sphere, annulus rings, quads, polylines, point clouds
  textures.ts  — procedural planet/ring/glow texture painters
  gl.ts        — WebGL1 context, shader/program/buffer helpers
  camera.ts    — free-fly camera (yaw/pitch, movement, view matrix)
  renderer.ts  — scene graph draw calls + ray picking
  ui.ts        — HUD readout, controls bar, pointer/wheel input
  main.ts      — wiring, simulation clock, frame loop
```

## Notes & design choices

- **Distances are honest, sizes are not.** Orbital radii keep their real
  relative distances (1 AU = 100 world units), but planet radii are scaled up
  so you can see them — at true scale Earth would be a sub-pixel dot.
- **Units:** the simulation clock is *days from J2000.0*, so the HUD date is a
  real calendar date. At 1× warp Earth takes 60 real seconds per orbit.
- **Determinism:** the PRNG, noise, and texture painters are all seeded, so
  every visit renders the same universe — and the orbital core is unit-tested
  in Node with no browser needed.
- **Portability:** WebGL1 (the widest support) and ES2020 output; no pointer
  lock required, so it works in a plain iframe.

## License

MIT — see the repository root [`LICENSE`](../LICENSE).