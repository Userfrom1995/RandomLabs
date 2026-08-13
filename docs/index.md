# Orrery — an interactive 3D solar system

**Orrery** is a living solar system in the browser: real Keplerian orbital
mechanics, procedurally textured planets, per-pixel lighting, and a free-fly
camera — all hand-rolled in **TypeScript on WebGL**, with no external engine.
It runs entirely on GitHub Pages: [open it](https://userfrom1995.github.io/Random/orrery/) and fly to Jupiter.

_WebGL solar system: orbital paths, a glowing Sun, procedurally textured planets, and a free-fly camera._

## What it is

- **Keplerian orbits.** Every planet moves along its real orbit — correct
  semi-major axes, eccentricities, inclinations, ascending nodes, and
  arguments of perihelion (J2000 elements from IAU/NASA values). Mean anomaly
  is integrated from the body's *real sidereal period*, and Kepler's equation
  `M = E − e·sin E` is solved by Newton–Raphson each step.
- **Procedural textures.** Planet surfaces are painted at startup from seeded
  value noise (fBm): Earth's continents and ice caps, Jupiter's bands and
  Great Red Spot, Saturn's rings, Mars's craters and caps, Venus's creamy
  swirls. The same seed always yields the same universe.
- **Lighting.** Per-pixel diffuse + specular Phong shading with the Sun as the
  single light source. The Sun itself is emissive, wrapped in a layered
  additive glow halo.
- **Free-fly camera.** Drag to look, right-drag to pan, WASD/QE to fly, and
  wheel for speed. Click any planet (or pick one from the menu) and the camera
  flies to it and rides along as it orbits — break the ride with any key.
- **Time warp.** Pause or run from 0.05× to 4096× (Space, −/+, Ctrl+wheel, or
  the slider). The HUD shows the simulated calendar date, the warp factor, and
  the selected body.

## Controls

| Input | Action |
| --- | --- |
| Left-drag | Look around |
| Right-drag | Pan |
| WASD + Q/E | Fly forward/back/strafe/down/up |
| Mouse wheel | Flight speed |
| Ctrl + wheel | Time warp |
| Click a planet | Select and fly to it |
| Space | Pause / resume |
| `-` / `+` | Slower / faster warp |
| `H` | Toggle the HUD |
| `Esc` | Return to free camera |

## How it works

The orbital core is pure TypeScript, unit-tested in Node with no browser:

- `src/kepler.ts` — Kepler's equation solver, mean-anomaly integration, and
  full orbital position/velocity/path in the J2000 ecliptic frame.
- `src/bodies.ts` — the catalog: six Keplerian elements plus a visual config
  per body (texture kind, exaggerated display radius, base color, albedo,
  specular, optional ring spec).
- `src/math.ts` — vectors, 4×4 column-major matrices, look-at/perspective,
  inverse, easing.
- `src/noise.ts` — seeded 2D value noise + fBm (deterministic textures).

The render layer is plain WebGL1:

- `src/shaders.ts` — three GLSL programs: a textured Phong *lit* shader
  (planets, rings, Sun), a flat *unlit* shader (orbits, stars, selection
  ring), and a *sprite* shader for the Sun's additive glow billboards.
- `src/geometry.ts` — UV sphere, ring annulus, quad, polylines, point clouds.
- `src/textures.ts` — deterministic procedural texture painters (ImageData →
  WebGL texture, no canvas).
- `src/renderer.ts` — the scene draw calls plus a ray-casting picker.
- `src/camera.ts` — free-fly camera with exponential follow damping.
- `src/ui.ts` / `src/main.ts` — the HUD, controls, input, and the frame loop.

## Key design choices

- **Distances are honest, sizes are not.** Orbital radii keep their real
  relative distances (1 AU = 100 world units); planet radii are scaled up so
  they are visible — at true scale Earth would be a sub-pixel dot.
- **Real periods.** The catalog stores the actual sidereal periods rather than
  a Kepler-third-law fit, so the *relative* orbital speeds are accurate.
- **Determinism.** The PRNG, noise, and painters are all seeded; the same
  seed always renders the same universe, and the orbital math is unit-tested.
- **Portability.** WebGL1 (the widest support) and ES2020 output; no pointer
  lock, so it works embedded in an iframe.

## Running it locally

```sh
cd orrery
npm install        # dev-only: TypeScript + esbuild
npm run test       # 43 unit tests (orbital core)
npm run typecheck  # strict TS
npm run build      # bundle src/main.ts → app.js
```

The bundled `app.js` is committed, so the site needs no build step on
GitHub Pages.

## Source

The project lives in [`orrery/`](https://github.com/Userfrom1995/Random/tree/main/orrery)
with a [`README`](https://github.com/Userfrom1995/Random/blob/main/orrery/README.md)
and a full writeup in
[`ideas/`](https://github.com/Userfrom1995/Random/blob/main/ideas/2026-08-13-orrery-webgl-solar-system.md).