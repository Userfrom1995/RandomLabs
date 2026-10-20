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
//   4. Fright HUD wire contract: mc_fright_segments is exported and drains
//      inside 1..30 during the final 1.5 s of a real fright window (the
//      harness calls it from updateHud; a missing export silently kills
//      the badge and meter inside the swallowing try/catch).
//   5. Hostile probes never trap: zero/huge frames are null, unknown
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

  // 4. Fright HUD wire contract: the harness calls mc_fright_segments()
  // from updateHud while a fright window runs; a missing export throws
  // inside the swallowing try/catch and silently suppresses the badge and
  // meter (the same class as the score-getter drift above). Drive the
  // deterministic route that eats a sunseed and reach the flashing tail.
  const fright = await WebAssembly.instantiate(mod, {});
  const fr = fright.exports;
  const ids = { up: 1, down: 2, left: 3, right: 4 };
  let ft = 1000;
  const fstep = () => { ft += 16; fr.mc_step(ft); };
  const fadv = (s) => { for (let i = 0; i < Math.round(s * 62.5); i++) fstep(); };
  fr.mc_reset(12345, 0, 1, 0);
  fadv(0.2); fr.mc_press(4); fadv(0.3);
  for (const [d, s] of [['right', 0.2], ['down', 1.2], ['left', 2.0], ['up', 0.60], ['right', 0.2]]) {
    fr.mc_key(ids[d], 1); fadv(s); fr.mc_key(ids[d], 0); fadv(0.05);
  }
  assert((fr.mc_fright_active() >>> 0) === 1, 'sunseed route starts a fright window');
  const harness = fs.readFileSync(path.join(__dirname, '..', 'maze-chase.js'), 'utf8');
  assert(harness.includes('exp.mc_fright_segments()'),
    'harness updateHud calls the fright countdown export');
  assert(typeof fr.mc_fright_segments === 'function',
    'mc_fright_segments exported (HUD countdown), got ' + typeof fr.mc_fright_segments);
  assert((fr.mc_fright_segments() >>> 0) === 0, 'countdown empty before the final 1.5 s');
  fadv(3.7);
  assert((fr.mc_fright_active() >>> 0) === 1 && (fr.mc_fright_flash() >>> 0) === 1,
    'fright reaches its flashing tail');
  const segs = fr.mc_fright_segments() >>> 0;
  assert(segs >= 1 && segs <= 30, 'countdown drains inside 1..30, got ' + segs);

  // 5. Hostile boundary probes.
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

  // 5. Theme and settings matrix against the shipped bytes: the cycle
  // order, canonical persistence, legacy-id migration, unknown-id
  // canonicalization, and corrupt-blob rejection are all Rust-owned.
  const boot = async () => (await WebAssembly.instantiate(mod, {})).exports;
  const themeNameOf = (x) => {
    const p = x.mc_scratch() >>> 0, c = x.mc_scratch_len() >>> 0;
    const n = x.mc_theme_name(p, c) >>> 0;
    return Buffer.from(x.memory.buffer, p, n).toString('utf8');
  };
  const blobOf = (x) => {
    const n = x.mc_settings_len() >>> 0;
    const p = x.mc_scratch() >>> 0, c = Math.min(n, x.mc_scratch_len() >>> 0);
    const k = x.mc_settings_read(p, c) >>> 0;
    return Buffer.from(x.memory.buffer, p, k).toString('utf8');
  };
  const writeBlob = (x, text) => {
    const b = Buffer.from(text, 'utf8');
    const p = x.mc_scratch() >>> 0;
    new Uint8Array(x.memory.buffer, p, b.length).set(b);
    return x.mc_settings_write(p, b.length) >>> 0;
  };
  const t = await boot();
  assert(t.mc_theme() === 0 && t.mc_theme_count() === 3, 'fresh theme is Dusk Pond 1 of 3');
  assert(t.mc_press(8) === 1 && t.mc_theme() === 1, 'theme cycle advances to Morning Shallows');
  assert(t.mc_press(8) === 1 && t.mc_theme() === 2, 'theme cycle advances to Moonwake');
  assert(t.mc_press(8) === 1 && t.mc_theme() === 0, 'theme cycle wraps to Dusk Pond');
  t.mc_set_theme(2);
  const saved = blobOf(t);
  assert(/^theme = moonwake$/m.test(saved), 'theme persists its canonical id');
  t.mc_set_theme(99);
  assert(t.mc_theme() === 2, 'out-of-range theme setter is ignored');
  const legacy = await boot();
  assert(writeBlob(legacy, 'theme = abyss-lantern\n') === 1, 'legacy settings blob applies');
  assert(legacy.mc_theme() === 2 && themeNameOf(legacy) === 'Moonwake',
    'legacy abyss-lantern migrates to Moonwake, got: ' + themeNameOf(legacy));
  assert(/^theme = moonwake$/m.test(blobOf(legacy)), 'legacy id is rewritten canonically');
  const unknown = await boot();
  assert(writeBlob(unknown, 'theme = not-a-theme\n') === 1, 'unknown theme blob still applies');
  assert(unknown.mc_theme() === 0 && themeNameOf(unknown) === 'Dusk Pond',
    'unknown theme falls back to Dusk Pond');
  assert(/^theme = dusk-pond$/m.test(blobOf(unknown)), 'unknown id is repaired on save');
  const corrupt = await boot();
  corrupt.mc_set_theme(2);
  assert(writeBlob(corrupt, 'difficulty = nonsense\n') === 0, 'corrupt blob is rejected');
  assert(corrupt.mc_theme() === 2, 'rejected blob keeps the live settings');

  // 6. Score-table name hygiene through the shipped exports: the empty
  // name fallback is Rill, names trim and cap at 12 characters, and a
  // zero score never qualifies.
  const sc = await boot();
  sc.mc_scores_clear();
  const pushName = (x, name, score, level) => {
    const b = Buffer.from(name, 'utf8');
    const p = x.mc_scratch() >>> 0;
    new Uint8Array(x.memory.buffer, p, b.length).set(b);
    return x.mc_scores_push(p, b.length, score, level) >>> 0;
  };
  assert(pushName(sc, '   ', 500, 2) === 1, 'whitespace-only name is accepted');
  assert(sc.mc_score_count() === 1, 'one row stored');
  const readName = (x, i) => {
    const p = x.mc_scratch() >>> 0, c = Math.min(x.mc_scratch_len() >>> 0, 256);
    const n = x.mc_score_get_name(i, p, c) >>> 0;
    return Buffer.from(x.memory.buffer, p, n).toString('utf8');
  };
  assert(readName(sc, 0) === 'Rill', 'empty name falls back to Rill, got: ' + readName(sc, 0));
  assert(pushName(sc, '  LongWardenName  ', 400, 3) === 1, 'long padded name is accepted');
  assert(readName(sc, 1) === 'LongWardenNa', 'name trims and caps at 12 chars, got: ' + readName(sc, 1));
  assert(pushName(sc, 'Zero', 0, 1) === 0, 'zero score never qualifies');
  assert(sc.mc_score_count() === 2, 'rejected zero score adds no row');
  assert(sc.mc_score_get_score(0) >= sc.mc_score_get_score(1), 'table stays score-descending');

  // 7. Hostile session fuzz against the shipped bytes: 4000 deterministic
  // wall-clock steps with random keys, buttons, and screen jumps. The
  // session must never trap, never lose score except across a restart,
  // never exceed the board's 448 remaining pickups, and two fresh
  // instances driven by the same seed sequence must agree exactly.
  const snapshot = (x) => JSON.stringify({
    screen: x.mc_screen() >>> 0, score: x.mc_score() >>> 0, lives: x.mc_lives() >>> 0,
    level: x.mc_level() >>> 0, dots: x.mc_dots_left() >>> 0, mode: x.mc_mode() >>> 0,
    fright: x.mc_fright_active() >>> 0, frame: x.mc_frame_no() >>> 0,
    theme: x.mc_theme() >>> 0, muted: x.mc_muted() >>> 0,
  });
  const fuzz = async (seed) => {
    const x = await boot();
    x.mc_reset(seed, 0, 0, 0);
    let rng = (seed * 2654435761) >>> 0;
    const next = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng; };
    let now = 1000;
    let lastScore = x.mc_score() >>> 0;
    let lastDots = x.mc_dots_left() >>> 0;
    let violation = null;
    for (let i = 0; i < 4000 && violation === null; i++) {
      now = (now + (next() % 40)) >>> 0;
      x.mc_step(now);
      if (next() % 5 === 0) x.mc_key(next() % 40, next() % 3);
      if (next() % 37 === 0) x.mc_press(next() % 14);
      if (next() % 89 === 0) x.mc_goto(next() % 8);
      const score = x.mc_score() >>> 0;
      const dots = x.mc_dots_left() >>> 0;
      const restarted = dots === 448 && lastDots < 448;
      if (score < lastScore && !restarted) {
        violation = `score fell ${lastScore} -> ${score} at step ${i} outside a restart`;
      } else if (dots > 448) {
        violation = `dots ${dots} exceeds the board at step ${i}`;
      } else if ((x.mc_lives() >>> 0) > 3) {
        violation = `lives over the cap at step ${i}`;
      }
      lastScore = score;
      lastDots = dots;
    }
    return { violation, snapshot: snapshot(x) };
  };
  for (const seed of [1, 7, 424242, 0xDEADBEEF]) {
    const first = await fuzz(seed);
    const second = await fuzz(seed);
    assert(first.violation === null, `seed ${seed}: hostile session holds (${first.violation || 'no violation'})`);
    assert(first.snapshot === second.snapshot, `seed ${seed}: identical sessions agree`);
  }
  const wrap = await boot();
  wrap.mc_reset(5, 0, 0, 0);
  wrap.mc_step(0xFFFFFFFF); wrap.mc_step(0); wrap.mc_step(1); wrap.mc_step(0xFFFFFFFF);
  assert((wrap.mc_frame_no() >>> 0) === 4, 'wrapped timestamps still advance one frame each');
  let frameGrid = true;
  for (let w = 1; w <= 40; w++) {
    for (let h = 1; h <= 40; h++) {
      frameGrid = frameGrid && typeof wrap.mc_frame(w, h) === 'number';
    }
  }
  assert(frameGrid, 'mc_frame returns a pointer across the 1..40 size grid');

  console.log('TESTER REGRESSION: ALL GREEN');
})();
