// Tester regression suite (Phase 7 review follow-up): pins the warden-chain
// pitch correction and hostile-boundary behavior at the SHIPPED artifact
// level (the committed web/maze-chase.wasm), complementing the Rust-side
// session-path unit test and the broad wasm-smoke harness.
//
// What it proves against the real release bytes with zero imports:
//   1. Wire domain: mc_last_chain() exposes engine domain 0..=3 as 1..=4.
//   2. Single Rust-side pitch doubling: chain-1 warden SFX starts at 400 Hz
//      (the double-doubling bug played 800 Hz / near-ultrasonic top tier).
//   3. Hostile probes never trap: zero/huge frames are null, unknown
//      press/goto/key codes are ignored, fresh instances stay deterministic.
//
// Usage: node web/e2e/tester-regression.js [path-to-wasm]
// Defaults to the shipped web/maze-chase.wasm. Exits nonzero on failure,
// prints TESTER REGRESSION: ALL GREEN on success. Node 18+, no packages.
const fs = require('fs');
const path = require('path');

const shipped = path.join(__dirname, '..', 'maze-chase.wasm');
const built = path.join(__dirname, '..', '..', 'target', 'wasm32-unknown-unknown', 'release', 'maze_chase_web.wasm');
const wasmPath = process.argv[2] || (fs.existsSync(shipped) ? shipped : built);
if (!fs.existsSync(wasmPath)) {
  console.error('TESTER REGRESSION FAIL: no wasm at ' + wasmPath);
  process.exit(1);
}

(async () => {
  const bytes = fs.readFileSync(wasmPath);
  const mod = await WebAssembly.compile(bytes);
  const imports = WebAssembly.Module.imports(mod);
  const assert = (c, m) => {
    if (!c) { console.error('TESTER REGRESSION FAIL:', m); process.exit(1); }
    console.log('ok:', m);
  };

  assert(imports.length === 0, 'zero-import wasm (got ' + JSON.stringify(imports) + ')');

  const inst = await WebAssembly.instantiate(mod, {});
  const e = inst.exports;

  // 1. Wire domain: fresh session exposes chain wire=1 (engine chain 0).
  e.mc_reset(0x1, 0x2, 0, 99);
  assert(e.mc_last_chain() === 1, 'default chain wire=1 (engine 0), got ' + e.mc_last_chain());

  // 2. Single pitch doubling: chain-1 warden SFX base is 400 Hz, not 800.
  // Cue id 4 is the warden-eaten SFX slot in the audio map.
  const from = e.mc_sfx_from(4);
  assert(from === 400, 'chain-1 warden from_hz=400 (single Rust doubling), got ' + from);

  // 3. Hostile boundary probes.
  assert(e.mc_frame(0, 0) === 0, 'zero-size frame is null');
  assert(e.mc_frame(100000, 100000) === 0, 'huge frame rejected without trap');
  assert(e.mc_press(999) === 0 && e.mc_goto(99) === 0 && e.mc_key(-1, 1) === 0,
    'unknown press/goto/key codes ignored');

  // Determinism across fresh instances with identical seeds.
  const inst2 = await WebAssembly.instantiate(mod, {});
  const f = inst2.exports;
  e.mc_reset(7, 8, 0, 5);
  f.mc_reset(7, 8, 0, 5);
  for (let t = 16; t < 1500; t += 16) { e.mc_step(t); f.mc_step(t); }
  assert(e.mc_score() === f.mc_score(), 'deterministic scores match (' + e.mc_score() + ')');

  console.log('TESTER REGRESSION: ALL GREEN');
})();
