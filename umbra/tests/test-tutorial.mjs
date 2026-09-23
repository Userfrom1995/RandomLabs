// Umbra M5 tutorial regression: step shape, ordered progression, machine
// semantics (at most one step per call, idempotence), prompt strings, and
// a synthetic full walkthrough. Pure module under test (node:test).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTORIAL_STEPS,
  createTutorial,
  tutorialGoalMet,
  tutorialUpdate,
  tutorialPrompt,
} from '../src/tutorial.js';

/** Fresh synthetic sim summary with overrides. */
function simSummary(over = {}) {
  return {
    p0x: 0,
    startX: 0,
    p0state: 'idle',
    eventsSeen: [],
    winner: null,
    ...over,
  };
}

const hit = (move, side = 0) => ({ t: 'hit', tick: 10, side, move, damage: 5 });
const blocked = (side = 1) => ({ t: 'blocked', tick: 10, side, move: 'jab', damage: 0 });

describe('tutorial steps shape', () => {
  it('has exactly 6 steps', () => {
    assert.equal(TUTORIAL_STEPS.length, 6);
  });

  it('every step has non-empty id, title, hint, and goal strings', () => {
    for (const s of TUTORIAL_STEPS) {
      for (const field of ['id', 'title', 'hint', 'goal']) {
        assert.equal(typeof s[field], 'string', `step ${JSON.stringify(s)} field ${field}`);
        assert.ok(s[field].length > 0, `step field ${field} must be non-empty`);
      }
    }
  });

  it('goal keys are the six shell-checkable predicates in order', () => {
    assert.deepEqual(
      TUTORIAL_STEPS.map((s) => s.goal),
      ['move', 'punch', 'block', 'special', 'dash', 'win'],
    );
  });

  it('step ids are unique', () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('hints never require pointer, mouse, or touch input (keyboard-only)', () => {
    for (const s of TUTORIAL_STEPS) {
      assert.ok(
        !/pointer|mouse|touch|tap|swipe|click|drag/i.test(s.hint),
        `hint for "${s.id}" must stay keyboard-only: ${s.hint}`,
      );
    }
  });
});

describe('createTutorial', () => {
  it('starts at step 0 and is not done', () => {
    assert.deepEqual(createTutorial(), { stepIndex: 0, done: false });
  });

  it('returns an independent object per call', () => {
    const a = createTutorial();
    const b = createTutorial();
    a.stepIndex = 3;
    assert.equal(b.stepIndex, 0);
  });
});

describe('ordered progression via synthetic simSummary', () => {
  it('move advances when |p0x - startX| > 0.2', () => {
    const t = createTutorial();
    tutorialUpdate(t, simSummary({ p0x: 0.35, startX: 0 }));
    assert.equal(t.stepIndex, 1);
    assert.equal(t.done, false);
  });

  it('move accepts either direction and a nonzero start', () => {
    const t = createTutorial();
    tutorialUpdate(t, simSummary({ p0x: -0.5, startX: -0.2 }));
    assert.equal(t.stepIndex, 1);
  });

  it('move does not advance at 0.2, below it, or on bad numbers', () => {
    for (const s of [
      simSummary({ p0x: 0.2, startX: 0 }),
      simSummary({ p0x: 0.19, startX: 0 }),
      simSummary({ p0x: NaN, startX: 0 }),
      simSummary({}),
      simSummary({ p0x: 'far', startX: 0 }),
    ]) {
      const t = createTutorial();
      tutorialUpdate(t, s);
      assert.equal(t.stepIndex, 0, `must not advance for ${JSON.stringify(s.p0x)}`);
    }
  });

  it('punch advances on a side-0 jab hit', () => {
    const t = createTutorial();
    t.stepIndex = 1;
    tutorialUpdate(t, simSummary({ eventsSeen: [hit('jab', 0)] }));
    assert.equal(t.stepIndex, 2);
  });

  it('punch ignores foe hits and non-jab moves', () => {
    for (const events of [
      [hit('jab', 1)],
      [hit('cross', 0)],
      [hit('uppercut', 0)],
      [{ t: 'blocked', tick: 1, side: 1, move: 'jab', damage: 0 }],
      [{ t: 'whiff', tick: 1, side: 0, move: 'jab', damage: 0 }],
    ]) {
      const t = createTutorial();
      t.stepIndex = 1;
      tutorialUpdate(t, simSummary({ eventsSeen: events }));
      assert.equal(t.stepIndex, 1, `must not advance for ${JSON.stringify(events)}`);
    }
  });

  it('block advances on a blocked event where side 0 defended', () => {
    const t = createTutorial();
    t.stepIndex = 2;
    tutorialUpdate(t, simSummary({ eventsSeen: [blocked(1)] }));
    assert.equal(t.stepIndex, 3);
  });

  it('block ignores side-0 attacks into the foe guard', () => {
    const t = createTutorial();
    t.stepIndex = 2;
    tutorialUpdate(t, simSummary({ eventsSeen: [blocked(0)] }));
    assert.equal(t.stepIndex, 2);
  });

  it('special advances on a side-0 uppercut hit (engine id for special input)', () => {
    const t = createTutorial();
    t.stepIndex = 3;
    tutorialUpdate(t, simSummary({ eventsSeen: [hit('uppercut', 0)] }));
    assert.equal(t.stepIndex, 4);
  });

  it('special accepts the moveId special alias and the move field', () => {
    for (const e of [
      { t: 'hit', tick: 1, side: 0, move: 'special', damage: 9 },
      { t: 'hit', tick: 1, side: 0, moveId: 'special', damage: 9 },
      { t: 'hit', tick: 1, side: 0, moveId: 'uppercut', damage: 9 },
    ]) {
      const t = createTutorial();
      t.stepIndex = 3;
      tutorialUpdate(t, simSummary({ eventsSeen: [e] }));
      assert.equal(t.stepIndex, 4, `must advance for ${JSON.stringify(e)}`);
    }
  });

  it('dash advances when p0state is dash', () => {
    const t = createTutorial();
    t.stepIndex = 4;
    tutorialUpdate(t, simSummary({ p0state: 'dash' }));
    assert.equal(t.stepIndex, 5);
  });

  it('dash ignores every other fighter state', () => {
    for (const p0state of ['idle', 'walk', 'attack', 'block', 'jump', 'hit', 'ko', '']) {
      const t = createTutorial();
      t.stepIndex = 4;
      tutorialUpdate(t, simSummary({ p0state }));
      assert.equal(t.stepIndex, 4, `must not advance for state ${p0state}`);
    }
  });

  it('win completes the tutorial only for a side-0 winner', () => {
    const t = createTutorial();
    t.stepIndex = 5;
    tutorialUpdate(t, simSummary({ winner: 0 }));
    assert.equal(t.stepIndex, 6);
    assert.equal(t.done, true);
  });

  it('win does not advance for foe win, draw, or undecided bouts', () => {
    for (const winner of [1, -1, null, undefined]) {
      const t = createTutorial();
      t.stepIndex = 5;
      tutorialUpdate(t, simSummary({ winner }));
      assert.equal(t.stepIndex, 5, `must not advance for winner ${String(winner)}`);
      assert.equal(t.done, false);
    }
  });

  it('done is false before the win step, even at step 5', () => {
    const t = createTutorial();
    t.stepIndex = 5;
    assert.equal(t.done, false);
    tutorialUpdate(t, simSummary({ p0state: 'idle' }));
    assert.equal(t.done, false);
  });
});

describe('machine semantics', () => {
  it('advances at most one step per call even when two goals are met', () => {
    const t = createTutorial();
    tutorialUpdate(
      t,
      simSummary({ p0x: 0.5, startX: 0, eventsSeen: [hit('jab', 0)] }),
    );
    assert.equal(t.stepIndex, 1);
  });

  it('repeat call with an identical summary does not advance (idempotent)', () => {
    const t = createTutorial();
    const first = simSummary({ p0x: 0.5, startX: 0 });
    tutorialUpdate(t, first);
    assert.equal(t.stepIndex, 1);
    tutorialUpdate(t, simSummary({ p0x: 0.5, startX: 0 }));
    assert.equal(t.stepIndex, 1);
    tutorialUpdate(t, JSON.parse(JSON.stringify(first)));
    assert.equal(t.stepIndex, 1);
  });

  it('fresh evidence after a repeat still advances', () => {
    const t = createTutorial();
    tutorialUpdate(t, simSummary({ p0x: 0.5, startX: 0 }));
    tutorialUpdate(t, simSummary({ p0x: 0.5, startX: 0 }));
    assert.equal(t.stepIndex, 1);
    tutorialUpdate(t, simSummary({ p0x: 0.51, startX: 0, eventsSeen: [hit('jab', 0)] }));
    assert.equal(t.stepIndex, 2);
  });

  it('a completed tutorial ignores further updates', () => {
    const t = createTutorial();
    t.stepIndex = 6;
    t.done = true;
    tutorialUpdate(t, simSummary({ winner: 0, p0x: 9, p0state: 'dash' }));
    assert.deepEqual(t, { stepIndex: 6, done: true });
  });

  it('null and malformed summaries are safe no-ops', () => {
    for (const junk of [null, undefined, 42, 'win', [], { eventsSeen: 'nope' }]) {
      const t = createTutorial();
      let out = null;
      try {
        out = tutorialUpdate(t, junk);
      } catch (e) {
        assert.fail(`tutorialUpdate threw for ${JSON.stringify(junk)}: ${e.message}`);
      }
      assert.equal(t.stepIndex, 0);
      assert.equal(t.done, false);
      assert.equal(out, t);
    }
  });

  it('tutorialUpdate returns the same state object it was given', () => {
    const t = createTutorial();
    assert.equal(tutorialUpdate(t, simSummary()), t);
  });

  it('unknown goal keys never satisfy', () => {
    assert.equal(tutorialGoalMet('nope', simSummary({ winner: 0 })), false);
    assert.equal(tutorialGoalMet('move', null), false);
  });
});

describe('tutorialPrompt', () => {
  it('prompts run 1/6 through 5/6 with the current step title and hint', () => {
    const t = createTutorial();
    for (let i = 0; i < 5; i++) {
      t.stepIndex = i;
      t.done = false;
      const p = tutorialPrompt(t);
      assert.equal(p.title, TUTORIAL_STEPS[i].title);
      assert.equal(p.hint, TUTORIAL_STEPS[i].hint);
      assert.equal(p.progress, `${i + 1}/6`);
    }
  });

  it('a fresh tutorial prompts 1/6', () => {
    const p = tutorialPrompt(createTutorial());
    assert.equal(p.progress, '1/6');
    assert.equal(p.title, TUTORIAL_STEPS[0].title);
  });

  it('a completed tutorial prompts 6/6', () => {
    const t = createTutorial();
    t.stepIndex = 6;
    t.done = true;
    const p = tutorialPrompt(t);
    assert.equal(p.progress, '6/6');
    assert.ok(p.title.length > 0 && p.hint.length > 0);
  });

  it('tolerates null and out-of-range states without throwing', () => {
    assert.equal(tutorialPrompt(null).progress, '1/6');
    assert.equal(tutorialPrompt({ stepIndex: 99, done: false }).progress, '6/6');
  });
});

describe('synthetic full walkthrough', () => {
  it('completes all six steps in order and sets done only at the end', () => {
    const t = createTutorial();
    const script = [
      simSummary({ p0x: 0.31, startX: 0, p0state: 'walk' }),
      simSummary({ p0x: 0.31, startX: 0, p0state: 'attack', eventsSeen: [hit('jab', 0)] }),
      simSummary({ p0x: 0.31, startX: 0, p0state: 'block', eventsSeen: [hit('jab', 0), blocked(1)] }),
      simSummary({
        p0x: 0.31,
        startX: 0,
        p0state: 'attack',
        eventsSeen: [hit('jab', 0), blocked(1), hit('uppercut', 0)],
      }),
      simSummary({
        p0x: 0.62,
        startX: 0,
        p0state: 'dash',
        eventsSeen: [hit('jab', 0), blocked(1), hit('uppercut', 0)],
      }),
      simSummary({
        p0x: 0.62,
        startX: 0,
        p0state: 'idle',
        eventsSeen: [hit('jab', 0), blocked(1), hit('uppercut', 0)],
        winner: 0,
      }),
    ];
    script.forEach((s, i) => {
      tutorialUpdate(t, s);
      assert.equal(t.stepIndex, i + 1, `walkthrough stalls at step ${i}`);
      assert.equal(t.done, i === 5, `done flag wrong at step ${i}`);
      const p = tutorialPrompt(t);
      assert.equal(p.progress, i === 5 ? '6/6' : `${i + 2}/6`);
    });
    assert.deepEqual(t, { stepIndex: 6, done: true });
  });
});
