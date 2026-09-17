// M2 input tests: ticcmd builder speeds/clamps, bindings persistence and
// conflict swaps, keyboard sampling, mouse accumulator, touch stick state,
// remap row descriptors. Headless (node:test), no DOM required.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTiccmd, latchTiccmd, BUTTON, TIC } from '../src/input/tic.js';
import {
  defaultBindings, loadBindings, saveBindings, resetBindings,
  findConflict, assignBinding, BINDINGS_FORMAT, BINDINGS_VERSION,
} from '../src/input/bindings.js';
import { createKeyState, sampleToInput, attachKeyboard } from '../src/input/keyboard.js';
import { createMouseLook, pixelsToAngleTurn, attachPointerLock } from '../src/input/mouse.js';
import { createTouchState, shouldShowTouchOverlay, TOUCH } from '../src/input/touch.js';
import { describeRemapRows, renderRemapTable } from '../src/input/remap-ui.js';

function fakeStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}

describe('ticcmd builder speeds', () => {
  it('walk/run forward and strafe speeds match vanilla mapping', () => {
    assert.equal(buildTiccmd({ moveF: 1, run: false }).forwardmove, TIC.FWD_WALK);
    assert.equal(buildTiccmd({ moveF: 1, run: true }).forwardmove, TIC.FWD_RUN);
    assert.equal(buildTiccmd({ moveF: 1 }).forwardmove, TIC.FWD_RUN, 'alwaysRun default');
    assert.equal(buildTiccmd({ moveF: -1 }).forwardmove, -TIC.FWD_RUN);
    assert.equal(buildTiccmd({ moveS: 1, run: false }).sidemove, TIC.SIDE_WALK);
    assert.equal(buildTiccmd({ moveS: 1, run: true }).sidemove, TIC.SIDE_RUN);
  });
  it('turn speeds: walk 640, run 1280, slow 320', () => {
    assert.equal(buildTiccmd({ turn: 1, run: false }).angleturn, 640);
    assert.equal(buildTiccmd({ turn: 1, run: true }).angleturn, 1280);
    assert.equal(buildTiccmd({ turn: 1, run: true, slow: true }).angleturn, 320);
    assert.equal(buildTiccmd({ turn: -0.5, run: false }).angleturn, -320);
  });
  it('forward/side clamp to +-50, hostile input sanitizes to zero', () => {
    const c = buildTiccmd({ moveF: 1, moveS: 1 });
    assert.ok(c.forwardmove <= 50 && c.sidemove <= 50);
    assert.deepEqual(buildTiccmd({ moveF: NaN, moveS: Infinity, turn: 'x' }), {
      forwardmove: 0, sidemove: 0, angleturn: 0, buttons: 0, weaponSelect: null,
    });
  });
  it('buttons bitmask and weapon clamp 1..7', () => {
    assert.equal(buildTiccmd({ attack: true }).buttons, BUTTON.ATTACK);
    assert.equal(buildTiccmd({ use: true }).buttons, BUTTON.USE);
    assert.equal(buildTiccmd({ attack: true, use: true }).buttons, 3);
    assert.equal(buildTiccmd({ weapon: 3 }).weaponSelect, 3);
    assert.equal(buildTiccmd({ weapon: 99 }).weaponSelect, 7);
    assert.equal(buildTiccmd({ weapon: 0 }).weaponSelect, 1);
    assert.equal(buildTiccmd({}).weaponSelect, null);
  });
});

describe('latchTiccmd merge', () => {
  it('last-writer-wins per field, angleturn accumulates, hostile dropped', () => {
    let slot = latchTiccmd(null, { forwardmove: 25 });
    slot = latchTiccmd(slot, { sidemove: -40, angleturn: 182 });
    slot = latchTiccmd(slot, { forwardmove: 50, buttons: 1, weaponSelect: 4 });
    assert.deepEqual(slot, { forwardmove: 50, sidemove: -40, angleturn: 182, buttons: 1, weaponSelect: 4 });
    const before = JSON.stringify(slot);
    latchTiccmd(slot, { forwardmove: NaN, sidemove: Infinity, angleturn: 'x', buttons: NaN });
    assert.equal(JSON.stringify({ ...slot, angleturn: slot.angleturn }), before, 'hostile fields ignored');
    const over = latchTiccmd(null, { forwardmove: 9999, sidemove: -9999 });
    assert.equal(over.forwardmove, 50);
    assert.equal(over.sidemove, -50);
  });
  it('non-object partial returns the slot untouched', () => {
    const s = latchTiccmd(null, null);
    assert.deepEqual(s, { forwardmove: 0, sidemove: 0, angleturn: 0, buttons: 0, weaponSelect: null });
  });
});

describe('bindings persistence and conflicts', () => {
  it('defaults carry format v1 and full action set', () => {
    const b = defaultBindings();
    assert.equal(b.format, BINDINGS_FORMAT);
    assert.equal(b.version, BINDINGS_VERSION);
    for (const a of ['forward', 'fire', 'use', 'weapon1', 'pause', 'menu']) {
      assert.ok(Array.isArray(b.actions[a].keys) && b.actions[a].keys.length > 0, a);
    }
  });
  it('save/load round-trips through a store', () => {
    const store = fakeStore();
    const { bindings: next } = assignBinding(defaultBindings(), 'fire', 'KeyG');
    assert.ok(saveBindings(store, next));
    assert.deepEqual(loadBindings(store).actions.fire.keys[0], 'KeyG');
  });
  it('corrupt or missing store content falls back to defaults', () => {
    assert.deepEqual(loadBindings(fakeStore()).actions.fire.keys, ['Space']);
    assert.deepEqual(loadBindings(fakeStore({ 'doom-bindings': 'not json' })).actions.fire.keys, ['Space']);
    assert.deepEqual(loadBindings(fakeStore({ 'doom-bindings': '{"format":"x"}' })).actions.fire.keys, ['Space']);
    assert.deepEqual(loadBindings(null).actions.fire.keys, ['Space']);
    assert.equal(saveBindings(null, defaultBindings()), false);
  });
  it('conflict assignment swaps bindings and reports the displaced action', () => {
    const { bindings: next, swapped } = assignBinding(defaultBindings(), 'fire', 'KeyW');
    assert.equal(swapped, 'forward');
    assert.equal(next.actions.fire.keys[0], 'KeyW');
    assert.ok(next.actions.forward.keys.includes('Space'), 'displaced Space moves to forward');
    assert.equal(findConflict(next, 'KeyW', 'fire'), null, 'no self-conflict');
    assert.equal(findConflict(next, 'KeyW'), 'fire');
    assert.equal(findConflict(next, 'Nope'), null);
  });
  it('reset restores defaults without mutating the edited copy', () => {
    const { bindings: edited } = assignBinding(defaultBindings(), 'fire', 'KeyG');
    assert.equal(resetBindings().actions.fire.keys[0], 'Space');
    assert.equal(edited.actions.fire.keys[0], 'KeyG');
  });
});

describe('keyboard state and sampling', () => {
  it('press/release maps codes to actions through bindings', () => {
    const ks = createKeyState(defaultBindings());
    ks.press('KeyW');
    ks.press('Space');
    assert.ok(ks.actions().has('forward') && ks.actions().has('fire'));
    ks.release('KeyW');
    assert.ok(!ks.actions().has('forward'));
    ks.clear();
    assert.equal(ks.actions().size, 0);
  });
  it('setBindings re-targets the mapping live', () => {
    const ks = createKeyState(defaultBindings());
    const { bindings: next } = assignBinding(defaultBindings(), 'forward', 'KeyG');
    ks.setBindings(next);
    ks.press('KeyG');
    assert.ok(ks.actions().has('forward'));
  });
  it('sampleToInput builds axes, strafe-suppresses turn, picks lowest weapon', () => {
    const s = sampleToInput(new Set(['forward', 'strafeLeft', 'turnRight', 'weapon3', 'weapon1', 'fire']));
    assert.equal(s.moveF, 1);
    assert.equal(s.moveS, -1);
    assert.equal(s.turn, 0, 'strafing suppresses turn keys');
    assert.equal(s.weapon, 1);
    assert.equal(s.attack, true);
    assert.equal(sampleToInput(new Set(['turnLeft'])).turn, -1);
  });
  it('attachKeyboard is a safe no-op without a DOM target', () => {
    const ks = createKeyState(defaultBindings());
    const detach = attachKeyboard(null, ks);
    assert.equal(typeof detach, 'function');
    detach();
  });
});

describe('mouse look accumulator', () => {
  it('consume returns deltas once then resets', () => {
    const m = createMouseLook();
    m.addDelta(10, -4);
    m.addDelta(NaN, Infinity);
    assert.deepEqual(m.consume(), { dx: 10, dy: -4 });
    assert.deepEqual(m.consume(), { dx: 0, dy: 0 });
  });
  it('pixelsToAngleTurn scales by sensitivity, hostile to zero', () => {
    assert.equal(pixelsToAngleTurn(10, 0.15), Math.round(10 * 0.15 * 182));
    assert.equal(pixelsToAngleTurn(NaN), 0);
    assert.equal(pixelsToAngleTurn(10, NaN), 0);
  });
  it('attachPointerLock degrades gracefully without a DOM canvas', () => {
    const m = createMouseLook();
    const h = attachPointerLock(null, m);
    assert.equal(h.isLocked(), false);
    h.dispose();
  });
});

describe('touch stick state', () => {
  it('dynamic origin, radial clamp, deadzone shaping', () => {
    const t = createTouchState({ radius: 56, deadzone: 0.18 });
    t.joystickStart('p1', 100, 100);
    t.joystickMove('p1', 100 + 560, 100);
    assert.ok(Math.abs(t.stick.dx) <= 1 && t.stick.dx > 0.9, 'clamped to unit radius');
    t.joystickMove('p1', 100 + 56, 100);
    const s = t.sample();
    assert.ok(s.turn > 0.9, 'full deflection turns');
    t.joystickMove('p1', 100 + 2, 100);
    assert.equal(t.sample().turn, 0, 'deadzone swallows jitter');
    t.joystickEnd('p1');
    assert.deepEqual(t.sample(), { moveF: 0, moveS: 0, turn: 0, run: true, attack: false, use: false, weapon: null });
  });
  it('wrong pointer id never hijacks the stick', () => {
    const t = createTouchState();
    t.joystickStart('p1', 0, 0);
    t.joystickMove('p2', 50, 50);
    assert.equal(t.stick.dx, 0);
    t.joystickEnd('p2');
    assert.equal(t.stick.active, true);
  });
  it('buttons, strafe pair, weapon select and consume', () => {
    const t = createTouchState();
    t.press('fire'); t.press('strafeR');
    t.setWeapon(5);
    const s = t.sample();
    assert.equal(s.attack, true);
    assert.equal(s.moveS, 1);
    assert.equal(s.weapon, 5);
    assert.equal(t.consumeWeapon(), 5);
    assert.equal(t.consumeWeapon(), null);
    t.setWeapon(99);
    assert.equal(t.weapon, 7);
    t.release('fire');
    assert.equal(t.sample().attack, false);
  });
  it('haptic ticks throttle to one per 120ms', () => {
    const t = createTouchState();
    assert.equal(t.hapticTick(1000), true);
    assert.equal(t.hapticTick(1050), false);
    assert.equal(t.hapticTick(1200), true);
  });
  it('overlay shows on coarse pointers only', () => {
    assert.equal(shouldShowTouchOverlay({ matchMedia: () => ({ matches: true }) }), true);
    assert.equal(shouldShowTouchOverlay({ matchMedia: () => ({ matches: false }), navigator: { maxTouchPoints: 0 } }), false);
  });
  it('stick radius constant matches the shell geometry', () => {
    assert.equal(TOUCH.STICK_RADIUS_PX, 56);
  });
});

describe('remap rows', () => {
  it('every action yields a remap-row testid with labels and keys', () => {
    const rows = describeRemapRows(defaultBindings());
    assert.ok(rows.length >= 15);
    for (const r of rows) {
      assert.equal(r.testid, `remap-row-${r.action}`);
      assert.ok(r.label && r.label.length > 0);
      assert.ok(Array.isArray(r.keys));
    }
    const ids = rows.map((r) => r.testid);
    assert.ok(ids.includes('remap-row-fire') && ids.includes('remap-row-forward'));
  });
  it('renderRemapTable is a safe no-op without a DOM container', () => {
    const h = renderRemapTable(null, defaultBindings());
    h.refresh();
    h.dispose();
  });
});
