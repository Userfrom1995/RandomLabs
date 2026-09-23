// Umbra M2: universal input layer (bindings, keyboard, gamepad, touch).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BINDINGS_VERSION,
  DEFAULT_BINDINGS,
  defaultBindings,
  serializeBindings,
  loadBindings,
  rebind,
  codeToAction,
  describeBindings,
  validateBindings,
} from '../src/input/bindings.js';
import { codesToInput, createKeyboard } from '../src/input/keyboard.js';
import { pollGamepad, createGamepadPoller, GAMEPAD_MAP, GAMEPAD_DEADZONE } from '../src/input/gamepad.js';
import {
  createTouchState,
  shouldVibrate,
  VIBRATE_MIN_GAP_MS,
  TOUCH_JOY_THRESHOLD_PX,
} from '../src/input/touch.js';

describe('bindings', () => {
  it('defaults carry version 1 and the v1 code table', () => {
    assert.equal(BINDINGS_VERSION, 1);
    assert.deepEqual(DEFAULT_BINDINGS.up, ['KeyW', 'ArrowUp']);
    assert.deepEqual(DEFAULT_BINDINGS.down, ['KeyS', 'ArrowDown']);
    assert.deepEqual(DEFAULT_BINDINGS.left, ['KeyA', 'ArrowLeft']);
    assert.deepEqual(DEFAULT_BINDINGS.right, ['KeyD', 'ArrowRight']);
    assert.deepEqual(DEFAULT_BINDINGS.punch, ['KeyJ']);
    assert.deepEqual(DEFAULT_BINDINGS.kick, ['KeyK']);
    assert.deepEqual(DEFAULT_BINDINGS.block, ['KeyL']);
    assert.deepEqual(DEFAULT_BINDINGS.special, ['KeyU']);
    assert.deepEqual(DEFAULT_BINDINGS.dash, ['Space']);
    assert.deepEqual(DEFAULT_BINDINGS.pause, ['Escape']);
  });
  it('defaultBindings returns an independent copy', () => {
    const b = defaultBindings();
    b.punch.push('KeyX');
    assert.deepEqual(DEFAULT_BINDINGS.punch, ['KeyJ']);
  });
  it('serialize/load round-trips the table', () => {
    const b = defaultBindings();
    const back = loadBindings(serializeBindings(b));
    assert.equal(back.ok, true);
    assert.deepEqual(back.bindings, b);
  });
  it('load rejects garbage: bad JSON, wrong version, bad shape', () => {
    assert.equal(loadBindings('not json{').ok, false);
    assert.equal(loadBindings({ version: 999, bindings: defaultBindings() }).ok, false);
    assert.equal(loadBindings({ version: 1, bindings: { punch: ['KeyJ'] } }).ok, false);
    assert.equal(loadBindings({ version: 1, bindings: { ...defaultBindings(), punch: [] } }).ok, false);
    assert.equal(loadBindings(null).ok, false);
  });
  it('rebind swaps on conflict and never mutates the input', () => {
    const b = defaultBindings();
    const next = rebind(b, 'punch', 'KeyK'); // KeyK belongs to kick
    assert.deepEqual(next.punch[0], 'KeyK');
    assert.ok(next.kick.includes('KeyJ'), 'displaced KeyJ swaps into kick');
    assert.ok(!next.kick.includes('KeyK'));
    assert.deepEqual(b.punch, ['KeyJ'], 'input untouched');
  });
  it('rebind to a free code keeps other actions intact', () => {
    const next = rebind(defaultBindings(), 'punch', 'KeyP');
    assert.deepEqual(next.punch[0], 'KeyP');
    assert.deepEqual(next.kick, ['KeyK']);
  });
  it('rebind never leaves one code in two actions', () => {
    const next = rebind(defaultBindings(), 'up', 'KeyS');
    assert.equal(validateBindings(next), null);
    const owners = (code) =>
      Object.entries(next).filter(([, codes]) => codes.includes(code)).map(([a]) => a);
    for (const code of ['KeyS', 'KeyW', 'ArrowUp', 'ArrowDown']) {
      assert.equal(owners(code).length, 1, `${code} owned by ${owners(code)}`);
    }
  });
  it('validateBindings rejects cross-action duplicates', () => {
    const dup = defaultBindings();
    dup.down = [...dup.down, 'KeyW'];
    assert.match(validateBindings(dup), /both/);
    assert.equal(loadBindings({ version: 1, bindings: dup }).ok, false);
  });
  it('rebind rejects unknown actions and empty codes', () => {
    assert.throws(() => rebind(defaultBindings(), 'hadouken', 'KeyH'), RangeError);
    assert.throws(() => rebind(defaultBindings(), 'punch', ''), TypeError);
  });
  it('codeToAction resolves in canonical order, null when unbound', () => {
    const b = defaultBindings();
    assert.equal(codeToAction(b, 'KeyW'), 'up');
    assert.equal(codeToAction(b, 'ArrowLeft'), 'left');
    assert.equal(codeToAction(b, 'Space'), 'dash');
    assert.equal(codeToAction(b, 'KeyZ'), null);
  });
  it('describeBindings yields one labeled row per action', () => {
    const rows = describeBindings(defaultBindings());
    assert.equal(rows.length, 10);
    for (const r of rows) {
      assert.ok(typeof r.action === 'string' && typeof r.label === 'string');
      assert.ok(Array.isArray(r.codes) && r.codes.length > 0);
    }
    assert.equal(rows.find((r) => r.action === 'dash').codes[0], 'Space');
  });
});

describe('codesToInput', () => {
  it('maps WASD and arrows to move/crouch/jump', () => {
    const b = defaultBindings();
    assert.equal(codesToInput(['KeyD'], [], b).move, 1);
    assert.equal(codesToInput(['ArrowLeft'], [], b).move, -1);
    assert.equal(codesToInput(['KeyA', 'KeyD'], [], b).move, 0);
    assert.equal(codesToInput(['KeyS'], [], b).crouch, true);
    assert.equal(codesToInput([], ['ArrowUp'], b).jump, true);
    assert.equal(codesToInput([], [], b).jump, false);
  });
  it('block is held level, punch is edge-only', () => {
    const b = defaultBindings();
    assert.equal(codesToInput(['KeyL'], [], b).block, true);
    assert.equal(codesToInput([], [], b).block, false);
    assert.equal(codesToInput(['KeyJ'], [], b).punch, false);
    assert.equal(codesToInput([], ['KeyJ'], b).punch, true);
    assert.equal(codesToInput([], ['KeyK'], b).kick, true);
    assert.equal(codesToInput([], ['KeyU'], b).special, true);
  });
  it('dash edge carries the held direction, 1 when standing', () => {
    const b = defaultBindings();
    assert.equal(codesToInput(['KeyA'], ['Space'], b).dash, -1);
    assert.equal(codesToInput(['KeyD'], ['Space'], b).dash, 1);
    assert.equal(codesToInput([], ['Space'], b).dash, 1);
    assert.equal(codesToInput(['KeyD'], [], b).dash, 0);
  });
  it('idle input is the neutral CombatInput', () => {
    assert.deepEqual(codesToInput([], [], defaultBindings()), {
      move: 0,
      crouch: false,
      jump: false,
      punch: false,
      kick: false,
      block: false,
      special: false,
      dash: 0,
    });
  });
});

describe('createKeyboard', () => {
  function fakeElement() {
    const handlers = {};
    return {
      handlers,
      addEventListener: (t, fn) => void (handlers[t] = fn),
      removeEventListener: (t, fn) => {
        if (handlers[t] === fn) delete handlers[t];
      },
    };
  }
  it('queues edges once per tick and clears on consume', () => {
    const kb = createKeyboard(defaultBindings());
    const el = fakeElement();
    kb.attach(el);
    let prevented = 0;
    el.handlers.keydown({ code: 'KeyJ', repeat: false, preventDefault: () => void prevented++ });
    el.handlers.keydown({ code: 'KeyJ', repeat: true, preventDefault: () => {} });
    assert.equal(prevented, 1);
    const first = kb.consumeTick();
    assert.equal(first.punch, true);
    assert.equal(kb.consumeTick().punch, false, 'edges clear after consume');
    kb.detach();
  });
  it('heldState reports move/crouch/block levels without consuming', () => {
    const kb = createKeyboard(defaultBindings());
    const el = fakeElement();
    kb.attach(el);
    const noop = () => {};
    el.handlers.keydown({ code: 'KeyA', repeat: false, preventDefault: noop });
    el.handlers.keydown({ code: 'KeyL', repeat: false, preventDefault: noop });
    assert.deepEqual(kb.heldState(), { move: -1, crouch: false, block: true });
    el.handlers.keyup({ code: 'KeyA' });
    assert.equal(kb.heldState().move, 0);
    kb.detach();
    assert.deepEqual(Object.keys(el.handlers), []);
  });
  it('ignores unbound codes without preventDefault', () => {
    const kb = createKeyboard(defaultBindings());
    const el = fakeElement();
    kb.attach(el);
    let prevented = 0;
    el.handlers.keydown({ code: 'F12', repeat: false, preventDefault: () => void prevented++ });
    assert.equal(prevented, 0);
    assert.equal(kb.consumeTick().punch, false);
    kb.detach();
  });
  it('clear() drops held levels and queued edges (pause/blur hygiene)', () => {
    const kb = createKeyboard(defaultBindings());
    const el = fakeElement();
    kb.attach(el);
    const noop = () => {};
    el.handlers.keydown({ code: 'KeyJ', repeat: false, preventDefault: noop });
    el.handlers.keydown({ code: 'KeyL', repeat: false, preventDefault: noop });
    kb.clear();
    const out = kb.consumeTick();
    assert.equal(out.punch, false);
    assert.equal(out.block, false);
    kb.detach();
  });
});

describe('pollGamepad', () => {
  function fakeNav({ axes = [0, 0], pressedButtons = [] } = {}) {
    const buttons = [];
    for (let i = 0; i < 17; i++) buttons.push({ pressed: pressedButtons.includes(i), value: 0 });
    return { getGamepads: () => [{ axes, buttons }] };
  }
  it('returns null with no navigator, no API, or no pad', () => {
    assert.equal(pollGamepad({}), null);
    assert.equal(pollGamepad({ getGamepads: () => [null] }), null);
    assert.equal(pollGamepad({ getGamepads: () => { throw new Error('x'); } }), null);
  });
  it('maps face buttons, shoulders, triggers, and dpad', () => {
    const out = pollGamepad(fakeNav({ pressedButtons: [0, 4, 12] }));
    assert.equal(out.punch, true);
    assert.equal(out.kick, false);
    assert.equal(out.block, true);
    assert.equal(out.jump, true);
    const rt = pollGamepad(fakeNav({ pressedButtons: [7] }));
    assert.equal(rt.special, true);
    const rb = pollGamepad(fakeNav({ pressedButtons: [5] }));
    assert.equal(rb.block, true);
    const r3 = pollGamepad(fakeNav({ axes: [0.9, 0], pressedButtons: [10] }));
    assert.equal(r3.dash, 1);
  });
  it('applies the 0.35 deadzone to the left stick', () => {
    assert.equal(GAMEPAD_DEADZONE, 0.35);
    assert.equal(pollGamepad(fakeNav({ axes: [0.2, 0.2] })).move, 0);
    assert.equal(pollGamepad(fakeNav({ axes: [-0.9, 0] })).move, -1);
    assert.equal(pollGamepad(fakeNav({ axes: [0, 0.9] })).crouch, true);
    assert.equal(pollGamepad(fakeNav({ pressedButtons: [13] })).crouch, true);
  });
  it('opposing dpad directions cancel', () => {
    assert.equal(pollGamepad(fakeNav({ pressedButtons: [14, 15] })).move, 0);
  });
  it('exposes the documented button map', () => {
    assert.equal(GAMEPAD_MAP.punch, 0);
    assert.equal(GAMEPAD_MAP.kick, 1);
    assert.equal(GAMEPAD_MAP.special, 2);
    assert.equal(GAMEPAD_MAP.pause, 9);
  });
  it('picks up pads past index 0 (hot-plug tolerant)', () => {
    const buttons = [];
    for (let i = 0; i < 17; i++) buttons.push({ pressed: i === 0, value: 0 });
    const nav = { getGamepads: () => [null, undefined, { axes: [0, 0], buttons }] };
    assert.equal(pollGamepad(nav).punch, true);
  });
});

describe('createGamepadPoller edges', () => {
  function fakeNav({ axes = [0, 0], pressedButtons = [] } = {}) {
    const buttons = [];
    for (let i = 0; i < 17; i++) buttons.push({ pressed: pressedButtons.includes(i), value: 0 });
    return { getGamepads: () => [{ axes, buttons }] };
  }
  it('held face buttons fire once; block stays a level', () => {
    const pad = createGamepadPoller();
    const nav = fakeNav({ pressedButtons: [0, 4] });
    const first = pad.poll(nav);
    assert.equal(first.punch, true);
    assert.equal(first.block, true);
    const second = pad.poll(nav);
    assert.equal(second.punch, false, 'held A must not machine-gun');
    assert.equal(second.block, true, 'held LB stays held');
    pad.reset();
    assert.equal(pad.poll(nav).punch, true, 'reset re-arms the edge');
  });
  it('dash fires once per press with the held direction', () => {
    const pad = createGamepadPoller();
    const nav = fakeNav({ axes: [0.9, 0], pressedButtons: [10] });
    assert.equal(pad.poll(nav).dash, 1);
    assert.equal(pad.poll(nav).dash, 0, 'held R3 must not re-dash');
  });
  it('null pads stay null without latching', () => {
    const pad = createGamepadPoller();
    assert.equal(pad.poll({ getGamepads: () => [null] }), null);
    assert.equal(pad.poll(fakeNav({ pressedButtons: [1] })).kick, true);
  });
});

describe('touch state', () => {
  it('press latches edges, consumeTick clears them, levels persist', () => {
    const t = createTouchState();
    t.press('punch');
    t.press('block');
    t.press('right');
    const first = t.consumeTick();
    assert.equal(first.punch, true);
    assert.equal(first.block, true);
    assert.equal(first.move, 1);
    const second = t.consumeTick();
    assert.equal(second.punch, false, 'punch edge clears');
    assert.equal(second.block, true, 'block held persists');
    t.release('block');
    t.release('right');
    assert.equal(t.consumeTick().block, false);
  });
  it('opposing directions cancel; crouch button and stick both crouch', () => {
    const t = createTouchState();
    t.press('left');
    t.press('right');
    assert.equal(t.consumeTick().move, 0);
    t.release('left');
    t.release('right');
    t.press('crouch');
    assert.equal(t.consumeTick().crouch, true);
    t.release('crouch');
    assert.equal(t.consumeTick().crouch, false);
  });
  it('joystick deflection quantizes move/crouch past the threshold', () => {
    const t = createTouchState();
    t.joyStart(1, 100, 100);
    t.joyMove(1, 100 + TOUCH_JOY_THRESHOLD_PX + 5, 100);
    assert.equal(t.consumeTick().move, 1);
    t.joyMove(2, 50, 50); // wrong pointer id ignored
    assert.equal(t.consumeTick().move, 1);
    t.joyMove(1, 100, 100 + TOUCH_JOY_THRESHOLD_PX + 5);
    const down = t.consumeTick();
    assert.equal(down.move, 0);
    assert.equal(down.crouch, true);
    t.joyEnd(1);
    const rest = t.consumeTick();
    assert.equal(rest.move, 0);
    assert.equal(rest.crouch, false);
  });
  it('rejects unknown buttons', () => {
    assert.throws(() => createTouchState().press('hadouken'), RangeError);
  });
  it('dash is an edge carrying the held direction, cleared on consume', () => {
    const t = createTouchState();
    t.press('dash');
    assert.equal(t.consumeTick().dash, 1, 'standing dash defaults to 1');
    assert.equal(t.consumeTick().dash, 0, 'dash edge clears');
    t.press('left');
    t.press('dash');
    assert.equal(t.consumeTick().dash, -1);
    t.release('left');
  });
  it('reset() drops held levels, edges, and joystick state', () => {
    const t = createTouchState();
    t.press('right');
    t.press('block');
    t.press('punch');
    t.joyStart(1, 100, 100);
    t.joyMove(1, 200, 100);
    t.reset();
    assert.deepEqual(t.consumeTick(), {
      move: 0, crouch: false, jump: false, punch: false,
      kick: false, block: false, special: false, dash: 0,
    });
  });
  it('shouldVibrate enforces the 80 ms gap', () => {
    assert.equal(VIBRATE_MIN_GAP_MS, 80);
    assert.equal(shouldVibrate(null, 1000), true);
    assert.equal(shouldVibrate(1000, 1050), false);
    assert.equal(shouldVibrate(1000, 1080), true);
  });
});

describe('combine mergeInputs (M2 app tick)', () => {
  it('OR-merges edges and prefers keyboard direction', async () => {
    const { mergeInputs } = await import('../src/input/combine.js');
    const kb = { move: 1, crouch: false, jump: false, punch: true, kick: false, block: false, special: false, dash: 0 };
    const touch = { move: -1, crouch: true, jump: false, punch: false, kick: true, block: false, special: false, dash: 0 };
    const out = mergeInputs(kb, touch, null);
    assert.equal(out.move, 1, 'keyboard wins direction');
    assert.equal(out.punch, true, 'keyboard edge kept');
    assert.equal(out.kick, true, 'touch edge OR-ed in');
    assert.equal(out.crouch, true, 'touch level OR-ed in');
  });
  it('tolerates null sources and sanitizes garbage', async () => {
    const { mergeInputs } = await import('../src/input/combine.js');
    const out = mergeInputs(null, undefined, { move: 9, punch: 1 });
    assert.equal(out.move, 1, 'direction clamped');
    assert.equal(out.punch, true);
    assert.deepEqual(mergeInputs(null, null, null), {
      move: 0, crouch: false, jump: false, punch: false,
      kick: false, block: false, special: false, dash: 0,
    });
  });
  it('edge-to-sim latency is <= 1 tick by construction', async () => {
    // G3 harness: an edge queued on the keyboard is consumed by the very
    // next consumeTick, and the sim consumes every tick (acc cap 3).
    const { createKeyboard } = await import('../src/input/keyboard.js');
    const { defaultBindings } = await import('../src/input/bindings.js');
    const kb = createKeyboard(defaultBindings());
    kb.state.held.add('KeyJ');
    kb.state.edges.push('KeyJ');
    const first = kb.consumeTick();
    assert.equal(first.punch, true, 'edge visible on the immediate next tick');
    assert.equal(kb.consumeTick().punch, false, 'edge consumed exactly once');
  });
});
