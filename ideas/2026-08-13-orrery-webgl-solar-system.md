# Orrery

An interactive 3D solar system in the browser: real **Keplerian orbital
mechanics**, procedurally textured planets with per-pixel lighting, and a
free-fly camera with pause, time-warp, and fly-to-any-planet — all hand-rolled
in **TypeScript on WebGL** with no external engine and no runtime
dependencies. Open it and fly to Jupiter: it ships entirely on GitHub Pages
(https://userfrom1995.github.io/Random/orrery/).

## What Was Built

A web app (`orrery/`) with a pure, unit-tested orbital core and a from-scratch
WebGL1 renderer:

- **Keplerian orbital mechanics** — every planet moves on its real orbit using
  J2000 elements (semi-major axis, eccentricity, inclination, ascending node,
  argument of perihelion, mean longitude at epoch) from IAU/NASA values. Mean
  anomaly is integrated from each body's **actual sidereal period** (so the
  relative orbital speeds are correct, independent of a Kepler-third-law fit),
  and Kepler's equation `M = E − e·sin E` is solved by Newton–Raphson every
  step. `src/kepler.ts` exposes position, velocity (central finite
  difference), and full orbit paths.
- **Procedural textures** — every surface is painted at startup from seeded
  2D value noise + fBm (`src/noise.ts`, `src/textures.ts`): Earth's continents
  and polar ice caps, Jupiter's turbulent bands and Great Red Spot, Saturn's
  radial ring bands, Mars's craters and caps, Mercury's grey craters, Venus's
  creamy swirls, and a granulated Sun with sunspots. Deterministic: the same
  seed always renders the same universe. Textures are painted straight into
  `ImageData` and uploaded to WebGL — no canvas.
- **Lighting** — a textured Phong shader computes per-pixel diffuse +
  specular with the Sun as the single point light; the Sun itself is emissive
  and wrapped in three layered, camera-facing additive glow billboards.
- **Free-fly camera** — drag to look, right-drag to pan, WASD/QE to fly,
  wheel for flight speed, pinch-zoom on touch. Click any planet (ray-cast
  picking against the planet spheres) or choose it from the menu: the camera
  exponentially damps to a position just off the planet's lit side and
  *rides along* as the planet orbits; any movement key breaks the ride.
- **Time warp** — pause, or run the simulation from 0.05× to 4096×
  (`TIME_WARP_STEPS`), via Space, −/+, Ctrl+wheel, or the slider. The HUD
  shows the simulated calendar date (days from J2000.0), the warp factor, and
  the selected body.
- **Starfield** — ~2350 seeded stars drawn as points under the rotation-only
  view matrix, so they stay fixed "at infinity" while you fly.
- **43 unit tests** — the orbital core (`kepler`, `math`, `bodies`, `noise`)
  is tested in Node with no browser; the render layer is thin by design.

## Why

The lab's recent streak was terminal CLIs (Regexplorer, Fernwald,
Shaftcast, Cadence) plus one Canvas game (Rush). Orrery is the first
**WebGL/3D** and the first **TypeScript** project — the visual opposite of the
streak, mixing real orbital mechanics with engine-free WebGL engineering and
shipping as a browser demo on GitHub Pages. It makes abstract Keplerian
motion tangible: you can watch Mercury lap Earth, time-warp Neptune through a
century, and hover over Jupiter's Great Red Spot as the whole system moves.

## How It Works

- **Simulation clock** — the app keeps a single `simDays` counter (days from
  J2000.0). Each frame, `simDays += warp × DAYS_PER_SECOND × dt` (when
  unpaused), and every body's position is computed fresh from its elements at
  that time — no caching, so warp changes are instant and exact.
- **Orbital solution** — mean anomaly `M = (L₀ − Ω − ω) + (2π/T)·t`, solved
  with Newton–Raphson on `E − e·sin E = M` (≤40 iterations, 1e-11 tolerance),
  then the standard rotation sequence Ω, i, ω maps the orbit-plane ellipse
  into the J2000 ecliptic frame.
- **Rendering pipeline** — `Renderer` owns all GPU resources: three programs
  (lit/unlit/sprite), a shared UV sphere (48×32), Saturn's ring annulus, a
  unit quad for billboards, per-body textures, and pre-baked orbit polylines
  (220 segments per planet, scaled 1 AU = 100 world units). Draw order: stars
  (depth off) → orbit loops → opaque bodies → blended rings (depth mask off)
  → additive sun glow → selection ring.
- **Procedural texture details** — Earth: an fBm "elevation" field against a
  continent-bias threshold, biome-mixed by latitude with noise-detail shading
  and polar caps. Jupiter: a v-warped sinusoid band pattern plus a soft-edged
  Great Red Spot. Saturn's rings: a radial-gradient texture (u=angle, v=radius)
  with banding and inner/outer fade, mapped onto the tilted annulus.
- **Camera** — yaw/pitch free-fly with the view built from `mat4LookAt`;
  "fly to" uses exponential approach (`k = 1 − e^(−2.6·dt)`) so it never
  overshoots, and the follow state re-targets the planet every frame.
- **Scale honesty** — orbital radii keep real relative distances (1 AU = 100
  world units, Neptune at ~3011), but body radii are exaggerated (Earth = 1.1
  units) so planets stay visible; documented in the README.

## Key Files

- `orrery/src/kepler.ts` — Kepler solver, mean-anomaly integration, orbital
  position/velocity/path.
- `orrery/src/bodies.ts` — the solar-system catalog: J2000 elements + visual
  config (texture kind, exaggerated radius, base color, albedo, specular,
  ring spec).
- `orrery/src/math.ts` — vectors, column-major 4×4 matrices, look-at /
  perspective / inverse / easing.
- `orrery/src/noise.ts` — seeded value noise + fBm.
- `orrery/src/shaders.ts` — GLSL sources: lit (Phong), unlit (lines/points),
  sprite (billboard glow).
- `orrery/src/geometry.ts` — UV sphere, ring annulus, quad, polyline, point
  clouds, unit-sphere star directions.
- `orrery/src/textures.ts` — procedural painters and texture upload.
- `orrery/src/gl.ts` — WebGL1 context/program/buffer helpers.
- `orrery/src/renderer.ts` — scene draw calls + ray-casting picker.
- `orrery/src/camera.ts` — free-fly camera with follow damping.
- `orrery/src/ui.ts` — HUD readout, control bar, pointer/wheel/touch input.
- `orrery/src/main.ts` — wiring, simulation clock, frame loop.
- `orrery/tests/*.test.ts` — 43 unit tests for the orbital core.
- `orrery/index.html`, `orrery/style.css`, `orrery/app.js`, `orrery/README.md`
  — the app shell and the committed esbuild bundle.
- `docs/index.md` + `docs/index.html` — documentation site (`/docs/`).

## Notes

- **Distances honest, sizes not** — at true scale Earth would be sub-pixel;
  sizes are exaggerated for visibility, distances are real.
- **Real periods** — the catalog stores actual sidereal periods (Mercury
  87.97 d … Neptune 60182 d) rather than `a^1.5` fits, so relative speeds are
  correct; a consistency check against Kepler's third law is unit-tested.
- **Determinism** — seeded PRNG/noise/painters; the same seed renders the same
  universe, and the orbital math is tested in Node.
- **Portability** — WebGL1 (widest support), ES2020 IIFE bundle, no pointer
  lock, `prefers-reduced-motion`-friendly (no hard flashing); graceful
  fallback message when WebGL is unavailable.
- **Toolchain** — TypeScript 5.9 + esbuild (dev only); `npm run build`
  bundles `src/main.ts` → `app.js`, which is committed so Pages needs no
  build step.
- **Name origin** — an "orrery" is the mechanical model of the solar system
  that makes planetary motion tangible — exactly what this app is.
