# Maze Chase Phase 7: WebAssembly Publication Layer and Web Hub

The browser is now a first-class hunt: the same deterministic engine as
WebAssembly behind a dependency-free C ABI, with keyboard plus touch,
DPR-aware canvas, WebAudio sound, and a playable hub page.

## What was built

- `maze-chase/crates/web` (`maze-chase-web` 0.1.0, zero external deps):
  `session` (fixed-step 120 Hz accumulator with 5-step catch-up and
  surplus drop, title/help/scores/settings/playing/paused/over flow,
  keymap-driven input, rebind capture with key *steal* semantics,
  settings blob via the config format, cue queue plus loop-music
  arbitration), `input` (13-id keyboard table round-tripping the config
  keys, swipe deadzone plus dominant axis), `video` (RGBA board composer
  mirroring the terminal raster pixel-for-pixel at 8 ppt, integer-fit
  plus clip-safe blit), `scores` (top-10 with sanitize rules),
  `audio_map` (stable 1-22 cue codes, SFX recipes with the warden chain
  arm, five tune tables, 132 BPM mirrored from desktop), `bridge`
  (total C ABI: null/absurd inputs degrade, never trap).
- `maze-chase/play.html` plus `web/maze-chase.js` (plain script, no
  bundler): canvas loop, DOM screens synced from `mc_screen`, 4 Hz HUD,
  gesture-unlocked WebAudio (SFX osc sweeps, tune scheduler, loops),
  swipe plus d-pad plus tap, localStorage settings/scores, focus-safe
  menus, styled error card, favicon.
- `maze-chase/web/maze-chase.wasm`: the exact release artifact
  (~190 KB, zero imports), reproducible with stock
  `cargo build --release --target wasm32-unknown-unknown`.
- `maze-chase/web/e2e/`: durable `wasm-smoke.js` (node instantiation)
  and `browser-e2e.js` (CDP-driven chromium: boot, click-to-play,
  keyboard scoring, pause/resume, swipe, mobile viewport, screenshots).
- Docs: `docs/web.md` launch guide, matrix WASM rows to done, README
  plus hub to all-playable with a Play button, `docs/index.md` entry.

## Why this shape

No `wasm-bindgen`: the terminal crate's crossterm and the desktop
crate's winit/softbuffer/rodio cannot compile to wasm, so the web
crate depends only on the zero-dep engine/assets/audio/config crates
and exposes raw linear-memory frames the harness blits. Menus and HUD
are DOM (accessible, crisp, mobile-friendly) while board pixels stay
byte-comparable with the native bitmap tiers. No gamepad on web is a
deliberate scope line (keyboard plus touch is the full scheme),
documented in the matrix-adjacent guide, never silent.

## Notable catches

- Rebind looked dead on arrival: every hardware key is bound by
  default and the shared policy rejects duplicates, so capture could
  never succeed. Solved with steal semantics (previous owner keeps its
  twins; orphan moves refused) rebuilt through the save format with the
  owner's line emitted first (the loader validates sequentially).
- `.badge { display: inline-block }` overrode the UA `[hidden]`
  style, so fright/relish pills rendered while hidden. Global
  `[hidden] { display: none !important; }` plus a live DOM assertion.
- The harness called `mc_fright_flash`, which did not exist yet: every
  fright window would have frozen the HUD (caught by the update guard).
  Added the export (engine `fright_flashing` tail signal).
- Fresh boards read Dots 448 / Score 10: Pip's spawn crumb is eaten at
  construction with silent scoring (engine-faithful, documented).
- Panel focus on screen change scrolled the board away on small
  screens: `focus({ preventScroll: true })`, asserted `scrollY === 0`.

## Proof

42 web-crate unit tests, workspace green, `maze-chase-verify` 19/19,
node smoke (zero imports, scoring, bit-identical frames, audio
tables, hostile probes), CDP E2E (zero console errors, real input
scoring 20 to 30, FPS 60 live, mobile board visible). No engine,
assets, audio, or config file changed.

## Delegation ledger

- Session plus bridge units, input plus video plus scores plus
  audio-map units, and play.html plus harness plus docs plus tracker
  units implemented directly by the primary against the shipped
  engine/assets/audio/config APIs (no subagent launch record survives
  in the log for this phase); primary verified itself via the proof
  above.
- Skills note: only known skill customize-opencode covers opencode
  config, not game code.
