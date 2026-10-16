// Phase 7 node smoke test: instantiate the real release wasm with zero
// imports and drive a full session through the C ABI.
const fs = require('fs');
const path = require('path');
// Usage: node web/e2e/wasm-smoke.js [path-to-wasm]
// Defaults to the release artifact relative to maze-chase/.
const wasmPath = process.argv[2] || path.join(__dirname, '..', '..', 'target', 'wasm32-unknown-unknown', 'release', 'maze_chase_web.wasm');
const fail = (m) => { console.error('SMOKE FAIL:', m); process.exit(1); };
if (!fs.existsSync(wasmPath)) fail('no wasm at ' + wasmPath + ' (build it first: see docs/web.md)');
const bytes = fs.readFileSync(wasmPath);
console.log('wasm bytes:', bytes.length);
(async () => {
  const mod = await WebAssembly.compile(bytes);
  console.log('imports:', JSON.stringify(WebAssembly.Module.imports(mod)));
  const inst = await WebAssembly.instantiate(mod, {});
  const e = inst.exports;
  const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
  const u = (v) => v >>> 0; // wasm i32 results arrive signed; compare unsigned.
  assert(e.mc_version() === 1, 'version');
  assert(e.mc_screen() === 0, 'boots on title');
  assert(e.mc_poll_music() === 1, 'title music queued');
  assert(u(e.mc_poll_music()) === 0xFFFFFFFF, 'music drains once');
  // Start a run via the sentinel preset path.
  e.mc_reset(0x12345678, 0x9abcdef0, 0, 99);
  assert(e.mc_screen() === 4, 'playing after reset');
  e.mc_step(0);
  // Steer up for a while.
  e.mc_key(1, 1);
  for (let t = 16; t < 3000; t += 16) e.mc_step(t);
  const score = e.mc_score();
  const ticks = e.mc_dots_left();
  console.log('score after 3s:', score, 'dots left:', ticks, 'lives:', e.mc_lives(), 'level:', e.mc_level(), 'mode:', e.mc_mode());
  // Frame at 2x board size.
  const W = 448, H = 496;
  const ptr = e.mc_frame(W, H);
  const len = e.mc_frame_len();
  assert(ptr !== 0 && len === W * H * 4, 'frame bytes ' + len);
  const px = Buffer.from(e.memory.buffer.slice(ptr, ptr + len));
  const uniq = new Set(px);
  console.log('frame bytes:', len, 'distinct byte values:', uniq.size);
  assert(uniq.size > 16, 'frame is not blank');
  // Determinism: identical fresh instance, identical session, identical bytes.
  const inst2 = await WebAssembly.instantiate(mod, {});
  const f = inst2.exports;
  f.mc_reset(0x12345678, 0x9abcdef0, 0, 99);
  f.mc_step(0); f.mc_key(1, 1);
  for (let t = 16; t < 3000; t += 16) f.mc_step(t);
  assert(f.mc_score() === score, 'scores converge: ' + f.mc_score() + ' vs ' + score);
  const ptr2 = f.mc_frame(W, H);
  const px2 = Buffer.from(f.memory.buffer.slice(ptr2, ptr2 + f.mc_frame_len()));
  assert(px.equals(px2), 'frames are bit-identical across instances');
  // Audio tables resolve from real audio-crate data.
  assert(e.mc_tune_bpm() === 132, 'tempo mirrors desktop');
  assert(e.mc_tune_len(0) === 20, 'title loop has 20 notes, got ' + e.mc_tune_len(0));
  assert(u(e.mc_sfx_wave(1)) !== 0xFFFFFFFF, 'crumb has an SFX recipe');
  assert(u(e.mc_sfx_wave(8)) === 0xFFFFFFFF, 'death sting is music-only');
  assert(e.mc_cue_is_music(8) === 1 && e.mc_cue_tune(8) === 2, 'death maps to sting 2');
  assert(e.mc_theme_count() >= 3, 'three themes ship');
  assert(e.mc_best() >= score, 'best covers the live run');
  // Hostile boundary probes never trap.
  assert(e.mc_frame(0, 0) === 0, 'zero frame is null');
  assert(e.mc_press(999) === 0 && e.mc_goto(9) === 0 && e.mc_key(999, 1) === 0, 'unknown codes ignored');
  console.log('NODE SMOKE: ALL GREEN');
})();
