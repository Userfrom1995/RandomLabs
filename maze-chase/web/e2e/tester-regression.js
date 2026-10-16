// Tester regression suite (Phase 7 review follow-up): pins the warden-chain
// pitch correction and hostile-boundary behavior at the SHIPPED artifact
// level (the committed web/maze-chase.wasm), complementing the Rust-side
// session-path unit test and the broad wasm-smoke harness.
//
// What it proves against the real release bytes with zero imports:
//   1. Wire domain: mc_last_chain() exposes engine domain 0..=3 as 1..=4.
//   2. Single Rust-side pitch doubling: chain-1 warden SFX starts at 400 Hz
//      (the double-doubling bug played 800 Hz / near-ultrasonic top tier).
//   3. Scores path: mc_score_get_* getters exist (no short-name drift),
//      two rows round-trip through mc_scores_push plus the getters, clear
//      empties the table.
//   4. Hostile probes never trap: zero/huge frames are null, unknown
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
  // Consistency invariant: the recipe always carries exactly the wire arm's
  // doubling (400 * 2^(wire-1)); chain endpoints ride in the Rust unit test.
  const wire = e.mc_last_chain() >>> 0;
  assert(from === 400 * Math.pow(2, wire - 1),
    'sfx matches wire arm (wire=' + wire + ' from=' + from + ')');

  // 3. Scores path: the harness getters exist under their mc_score_get_*
  // names (the shipped JS once called mc_score_name/score/level, which
  // threw TypeError inside a swallowing try/catch and rendered empty
  // tables). Round-trip two rows through the restore export and read them
  // back through the getters, then clear.
  assert(typeof e.mc_score_get_name === 'function', 'mc_score_get_name exported');
  assert(typeof e.mc_score_get_score === 'function', 'mc_score_get_score exported');
  assert(typeof e.mc_score_get_level === 'function', 'mc_score_get_level exported');
  assert(typeof e.mc_scores_push === 'function', 'mc_scores_push exported');
  assert(e.mc_score_name === undefined && e.mc_score_score === undefined && e.mc_score_level === undefined,
    'short score getter names stay undefined (no alias drift)');
  e.mc_scores_clear();
  const mem = () => new Uint8Array(e.memory.buffer);
  const scratch = e.mc_scratch() >>> 0;
  const writeName = (s) => {
    const b = Buffer.from(s, 'utf8');
    mem().set(b, scratch);
    return b.length;
  };
  let n = writeName('Kessa');
  assert(e.mc_scores_push(scratch, n, 900, 3) === 1, 'push Kessa 900/L3');
  n = writeName('Nib');
  assert(e.mc_scores_push(scratch, n, 400, 2) === 1, 'push Nib 400/L2');
  assert(e.mc_score_count() === 2, 'two rows stored, got ' + e.mc_score_count());
  assert(e.mc_score_get_score(0) === 900, 'row 0 score 900, got ' + e.mc_score_get_score(0));
  assert(e.mc_score_get_level(0) === 3, 'row 0 level 3, got ' + e.mc_score_get_level(0));
  assert(e.mc_score_get_score(1) === 400, 'row 1 score 400, got ' + e.mc_score_get_score(1));
  const cap = Math.min(e.mc_scratch_len() >>> 0, 256);
  const got = e.mc_score_get_name(0, scratch, cap) >>> 0;
  assert(Buffer.from(mem().buffer, scratch, got).toString('utf8') === 'Kessa',
    'row 0 name Kessa round-trips through the getter');
  e.mc_scores_clear();
  assert(e.mc_score_count() === 0, 'clear empties the table');

  // 4. Hostile boundary probes.
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
