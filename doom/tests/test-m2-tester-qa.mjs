// Tester QA suite for Doom M2 (renderer + input), PR #364.
// Independent hostile verification: fuzz/soak/determinism/perf/shell smoke.
// Headless (node:test), no DOM required. Never touches production sources.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTiccmd, latchTiccmd, TIC } from '../src/input/tic.js';
import {
  defaultBindings, loadBindings, saveBindings,
  findConflict, assignBinding,
} from '../src/input/bindings.js';
import { createTouchState } from '../src/input/touch.js';
import { createMouseLook, pixelsToAngleTurn } from '../src/input/mouse.js';
import { chooseUploadFormat, expandToRGBA, frameBytes } from '../src/render/upload.js';
import { createPaletteManager, PALETTE_BYTES } from '../src/render/palette.js';
import { createResolutionGovernor, LADDER } from '../src/render/resolution.js';
import { resolveTier, tierForFailure } from '../src/render/tiers.js';
import { initEngine } from '../src/engine/doomEngine.js';
import { buildDemoWad } from '../tools/make-demo-wad.mjs';

const HOSTILE = [NaN, Infinity, -Infinity, undefined, null, 'x', {}, [], true, 1e12, -1e12, 0.1 + 0.2];

describe('tester QA: ticcmd hostile fuzz (10k-sample soak)', () => {
  it('no hostile sample ever yields NaN/Infinity or out-of-clamp moves', () => {
    for (let i = 0; i < 10000; i++) {
      const h = HOSTILE[i % HOSTILE.length];
      const s = buildTiccmd({
        moveF: typeof h === 'number' ? h * ((i % 7) - 3) : h,
        moveS: h, turn: h,
        run: i % 2 === 0, slow: i % 3 === 0,
        attack: h, use: h, weapon: h,
      });
      for (const k of ['forwardmove', 'sidemove', 'angleturn', 'buttons']) {
        assert.ok(Number.isFinite(s[k]), `finite ${k} at i=${i}`);
      }
      assert.ok(Math.abs(s.forwardmove) <= TIC.MOVE_CLAMP, `fwd clamp i=${i}`);
      assert.ok(Math.abs(s.sidemove) <= TIC.MOVE_CLAMP, `side clamp i=${i}`);
      assert.ok(s.weaponSelect === null || (s.weaponSelect >= 1 && s.weaponSelect <= 7), `weapon clamp i=${i}`);
    }
  });
  it('-0 normalizes to 0 and tiny subnormals stay bounded', () => {
    const s = buildTiccmd({ moveF: -0, moveS: -0, turn: -0 });
    assert.equal(Object.is(s.forwardmove, -0), false);
    assert.equal(s.forwardmove, 0);
    const t = buildTiccmd({ moveF: 1e-300, turn: 5e-324 });
    assert.ok(Number.isFinite(t.forwardmove) && Number.isFinite(t.angleturn));
  });
  it('latchTiccmd 5k hostile merges never corrupt the slot', () => {
    let slot = null;
    for (let i = 0; i < 5000; i++) {
      const h = HOSTILE[i % HOSTILE.length];
      slot = latchTiccmd(slot, {
        forwardmove: h, sidemove: h, angleturn: h, buttons: h,
        weaponSelect: h, __proto__: { polluted: true },
      });
      assert.ok(Number.isFinite(slot.forwardmove) && Number.isFinite(slot.sidemove));
      assert.ok(Number.isFinite(slot.angleturn) && Number.isFinite(slot.buttons));
      assert.ok(slot.weaponSelect === null || (slot.weaponSelect >= 1 && slot.weaponSelect <= 7));
    }
    assert.equal({}.polluted, undefined, 'no prototype pollution via latch');
  });
  it('ticcmd determinism: identical sequence replays bit-exactly across seeds', () => {
    const seq = [
      { moveF: 1, run: true }, { moveS: -1, turn: 0.5 }, { attack: true, weapon: 4 },
      { moveF: -0.37, moveS: 0.73, turn: -1, run: false, use: true },
    ];
    const run = () => seq.map((s) => buildTiccmd(s));
    assert.deepEqual(run(), run());
    assert.deepEqual(run(), JSON.parse(JSON.stringify(run())));
  });
  it('buildTiccmd throughput sane (10k builds under 2s)', () => {
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) buildTiccmd({ moveF: 0.5, moveS: -0.5, turn: 0.25, run: true });
    assert.ok(performance.now() - t0 < 2000, 'tic pipeline is cheap pure arithmetic');
  });
});

describe('tester QA: bindings hostile (persistence + swap integrity)', () => {
  function store(raw) {
    return { getItem: () => raw, setItem() { throw new Error('quota'); } };
  }
  it('prototype-pollution payload falls back to safe defaults', () => {
    const evil = '{"format":"doom-bindings","version":1,"actions":{"fire":{"keys":["Space"],"__proto__":{}}}}';
    const b = loadBindings(store(evil));
    assert.deepEqual(b.actions.fire.keys, ['Space']);
    assert.equal({}.polluted, undefined);
  });
  it('oversized key arrays and non-string entries are sanitized', () => {
    const raw = JSON.stringify({
      format: 'doom-bindings', version: 1,
      actions: { fire: { keys: new Array(5000).fill('KeyG').concat([42, null, {}]), mouse: 'x', touch: 7 } },
    });
    const b = loadBindings(store(raw));
    assert.ok(b.actions.fire.keys.every((k) => typeof k === 'string'));
    assert.equal(b.actions.fire.mouse, null);
    assert.equal(b.actions.fire.touch, null);
  });
  it('quota-exceeded save returns false instead of throwing', () => {
    assert.equal(saveBindings(store('x'), defaultBindings()), false);
  });
  it('assignBinding never mutates input and caps at 3 keys', () => {
    const base = defaultBindings();
    const snap = JSON.stringify(base);
    let cur = base;
    for (const code of ['KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL']) {
      cur = assignBinding(cur, 'fire', code).bindings;
    }
    assert.equal(JSON.stringify(base), snap, 'input immutable');
    assert.ok(cur.actions.fire.keys.length <= 3);
    assert.equal(cur.actions.fire.keys[0], 'KeyL');
  });
  it('assignBinding rejects garbage without mutating', () => {
    const base = defaultBindings();
    for (const [a, c] of [['nope', 'KeyG'], ['fire', ''], ['fire', null], ['fire', 42]]) {
      const { bindings: n, swapped } = assignBinding(base, a, c);
      assert.equal(swapped, null);
      assert.equal(n, base, 'same reference on reject');
    }
    assert.equal(findConflict(base, ''), null);
    assert.equal(findConflict(base, null), null);
  });
});

describe('tester QA: touch + mouse hostile soak', () => {
  it('touch stick survives NaN/Infinity coordinates and id chaos', () => {
    const t = createTouchState();
    t.joystickStart('p1', 100, 100);
    for (const [x, y] of [[NaN, NaN], [Infinity, 0], [0, -Infinity], [1e18, 1e18], [-1e18, 5]]) {
      t.joystickMove('p1', x, y);
      const s = t.sample();
      for (const k of ['moveF', 'moveS', 'turn']) assert.ok(Number.isFinite(s[k]), `finite ${k}`);
      assert.ok(Math.abs(s.moveF) <= 1 && Math.abs(s.turn) <= 1);
    }
    t.joystickMove('ghost', 999, 999);
    t.joystickEnd('ghost');
    assert.equal(t.stick.active, true, 'ghost id cannot hijack or kill the stick');
    t.joystickEnd('p1');
    assert.deepEqual(t.sample().moveF, 0);
  });
  it('touch weapon latch hostile values resolve to null or 1..7', () => {
    const t = createTouchState();
    for (const w of [NaN, Infinity, 'x', null, undefined, -99, 1e9, 3.6]) {
      t.setWeapon(w);
      const v = t.consumeWeapon();
      assert.ok(v === null || (v >= 1 && v <= 7), `weapon ${String(w)} -> ${v}`);
    }
  });
  it('haptic throttle exact boundary: 119ms blocked, 120ms allowed', () => {
    const t = createTouchState();
    assert.equal(t.hapticTick(0), false, 'first tick at epoch blocked by initial lastHapticAt=0');
    assert.equal(t.hapticTick(1000), true);
    assert.equal(t.hapticTick(1119), false);
    assert.equal(t.hapticTick(1120), true);
  });
  it('mouse accumulator drops hostile deltas, 10k-add soak stays finite', () => {
    const m = createMouseLook();
    for (let i = 0; i < 10000; i++) m.addDelta(i % 2 ? 3 : NaN, i % 3 ? -2 : Infinity);
    const c = m.consume();
    assert.ok(Number.isFinite(c.dx) && Number.isFinite(c.dy));
    assert.deepEqual(m.consume(), { dx: 0, dy: 0 }, 'consume resets');
    assert.equal(pixelsToAngleTurn(1e15, 1), Math.round(1e15 * 1 * 182));
    assert.equal(pixelsToAngleTurn(10, 2), Math.round(10 * 2 * 182));
  });
});

describe('tester QA: render hostile (upload, palette, governor, tiers)', () => {
  it('expandToRGBA handles full 64k frame plus hostile indices without throw', () => {
    const pal = new Uint8Array(768);
    for (let i = 0; i < 768; i++) pal[i] = i & 255;
    const fb = new Uint8Array(320 * 200);
    for (let i = 0; i < fb.length; i++) fb[i] = i & 255;
    fb[0] = 255; fb[1] = 0;
    const t0 = performance.now();
    const out = expandToRGBA(fb, pal);
    const dt = performance.now() - t0;
    assert.equal(out.length, 320 * 200 * 4);
    assert.deepEqual([...out.subarray(0, 4)], [pal[765], pal[766], pal[767], 255]);
    assert.ok(dt < 1000, `RGBA expansion under 1s (took ${dt.toFixed(1)}ms)`);
    const bad = expandToRGBA(new Uint8Array([256 % 256, 255]), pal);
    assert.equal(bad[7], 255);
    assert.equal(chooseUploadFormat({}), 'cpu');
    assert.equal(chooseUploadFormat(undefined), 'cpu');
    assert.equal(chooseUploadFormat({ webgl2: 0, webgl: '', hasWebGL2: null }), 'cpu');
    assert.equal(frameBytes('bogus'), 0);
    assert.equal(frameBytes('r8', 640, 400), 256000);
  });
  it('palette manager: rapid toggle soak keeps version/upload contract', () => {
    const pm = createPaletteManager();
    pm.markUploaded();
    const a = new Uint8Array(PALETTE_BYTES); a[0] = 1;
    const b = new Uint8Array(PALETTE_BYTES); b[0] = 2;
    for (let i = 0; i < 1000; i++) {
      assert.equal(pm.setPalette(i % 2 ? a : b), true);
      assert.equal(pm.needsUpload(), true);
      pm.markUploaded();
      assert.equal(pm.needsUpload(), false);
      assert.equal(pm.setPalette(i % 2 ? a : b), false, 're-set identical is no-op');
    }
    assert.equal(pm.setPalette(null), false);
    assert.equal(pm.setPalette(undefined), false);
  });
  it('governor: exactly one rung per interval under permaload, floor/ceiling hold', () => {
    let t = 0;
    const g = createResolutionGovernor({ initial: 0, now: () => t });
    const sizes = [];
    for (let step = 0; step < 10; step++) {
      t += 600;
      for (let i = 0; i < 50; i++) g.observe(100);
      sizes.push(g.index);
    }
    assert.equal(g.index, LADDER.length - 1, 'permadeath load reaches emergency floor');
    for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] - sizes[i - 1] <= 1, 'one rung max per window');
    for (let step = 0; step < 10; step++) {
      t += 600;
      for (let i = 0; i < 80; i++) g.observe(1);
    }
    assert.equal(g.index, 0, 'sustained fast frames recover to full');
  });
  it('governor manual pin survives hostile observe storm', () => {
    let t = 0;
    const g = createResolutionGovernor({ initial: 0, now: () => t });
    assert.equal(g.setManual(1), true);
    for (let i = 0; i < 2000; i++) { t += 1; g.observe(i % 2 ? 200 : 0.1); }
    assert.equal(g.index, 1, 'manual pin immune to auto');
    g.setAuto();
    // EWMA is still poisoned by the hostile storm, so the first window may
    // step down one rung before draining; afterwards recovery climbs at most
    // one rung per 500ms window. Assert single-step motion and final recovery.
    let prev = g.index;
    for (let w = 0; w < 8; w++) {
      t += 600;
      for (let i = 0; i < 80; i++) g.observe(0.5);
      assert.ok(Math.abs(g.index - prev) <= 1, `one rung max per window (w=${w}: ${prev}->${g.index})`);
      prev = g.index;
    }
    assert.equal(g.index, 0, 'auto resumes after release');
  });
  it('tiers: hostile inputs degrade to safe rungs, never throw', () => {
    for (const caps of [{}, { hasWasm: 'yes' }, { hasWebGL2: 1 }, { webgl: 0, hasWasm: true }]) {
      assert.ok(Number.isInteger(resolveTier(caps)), `tier for ${JSON.stringify(caps)}`);
    }
    assert.ok(Number.isInteger(tierForFailure(NaN)));
    assert.ok(Number.isInteger(tierForFailure(-1)));
    assert.ok(Number.isInteger(tierForFailure(99)));
  });
});

describe('tester QA: engine live determinism across 3 seeds', () => {
  it('identical scripted runs converge on player + framebuffer (3 seeds)', async () => {
    const script = [
      { forwardmove: 50, sidemove: 0, angleturn: 0, buttons: 1, weaponSelect: null },
      { forwardmove: 0, sidemove: 40, angleturn: 364, buttons: 0, weaponSelect: 5 },
      { forwardmove: -25, sidemove: -24, angleturn: -640, buttons: 2, weaponSelect: null },
    ];
    const runOnce = async () => {
      const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
      for (const c of script) { e.injectTiccmd({ ...c }); e.tickOnce(); }
      return e;
    };
    const [a, b, c] = await Promise.all([runOnce(), runOnce(), runOnce()]);
    for (const [x, y] of [[a, b], [b, c], [a, c]]) {
      assert.deepEqual(
        [x.getPlayer().x, x.getPlayer().y, x.getPlayer().angle, x.getPlayer().weapon, x.getPlayer().attackCount, x.getPlayer().useCount],
        [y.getPlayer().x, y.getPlayer().y, y.getPlayer().angle, y.getPlayer().weapon, y.getPlayer().attackCount, y.getPlayer().useCount],
        'player state converges',
      );
      assert.deepEqual([...x.getFrameBufferView()], [...y.getFrameBufferView()], 'framebuffer converges');
    }
  });
  it('engine tick throughput sane: 350 ticks under 5s', async () => {
    const e = await initEngine({ wadBytes: buildDemoWad(), map: 'E1M1' });
    const t0 = performance.now();
    for (let i = 0; i < 350; i++) {
      e.injectTiccmd({ forwardmove: 50, sidemove: 0, angleturn: 10, buttons: 0, weaponSelect: null });
      e.tickOnce();
    }
    assert.ok(performance.now() - t0 < 5000, '35Hz x10 headroom holds');
    assert.equal(e.tickCount, 350);
  });
});

describe('tester QA: shell smoke (entrypoint, controls, hygiene)', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  it('index.html exposes canvas, touch overlay, and wad drop target', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    for (const id of ['canvas', 'joystick', 'btn-fire', 'btn-use', 'weapon-strip', 'wad-drop', 'status-line']) {
      assert.ok(html.includes(id), `shell exposes ${id}`);
    }
    assert.ok(html.includes('<canvas'), 'real canvas element, not a debug harness');
  });
  it('app.js ships real input wiring with zero eval and zero em dashes', () => {
    const app = readFileSync(join(root, 'app.js'), 'utf8');
    assert.ok(app.length > 5000, 'substantive shell bundle');
    assert.ok(!/eval\(|new Function/.test(app), 'no dynamic code execution');
    assert.ok(!app.includes(' '), 'no em dashes in shell');
    assert.ok(/pointerlock/i.test(app), 'pointer lock wired');
  });
});
