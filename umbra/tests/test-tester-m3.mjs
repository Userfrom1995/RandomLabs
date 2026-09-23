// Tester M3 red-team regression: hostile inputs against roster / story /
// dialogue / profile v2 / arena lookup. Pure modules only (node:test).
// Complements test-roster.mjs + test-story.mjs happy-path coverage.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLES, ENEMIES, fighterById, validateRoster } from '../src/roster.js';
import {
  STORY_NODES,
  validateStory,
  storyCursor,
  completeNode,
  applyStoryUnlocks,
} from '../src/story.js';
import {
  createDialogue,
  dialogueDone,
  currentLine,
  visibleText,
  lineComplete,
  advanceDialogue,
  revealLine,
  nextDialogueLine,
} from '../src/dialogue.js';
import { defaultProfile, migrateProfile } from '../src/storage/profile.js';
import { ARENAS, arenaAt } from '../src/arenas.js';

describe('tester M3: roster hostile validation', () => {
  it('rejects null / non-array roster inputs without throwing', () => {
    for (const junk of [null, [], 5, {}, true, 'x']) {
      let problems = null;
      try {
        problems = validateRoster(junk, junk);
      } catch (e) {
        assert.fail(`validateRoster(${JSON.stringify(junk)}) threw: ${e.message}`);
      }
      assert.ok(Array.isArray(problems) && problems.length > 0, `no violations for ${JSON.stringify(junk)}`);
    }
  });
  it('rejects cross-group duplicate ids', () => {
    const dupEnemy = { ...ENEMIES[0], id: PLAYABLES[0].id };
    const problems = validateRoster(PLAYABLES, [dupEnemy, ...ENEMIES.slice(1)]);
    assert.ok(problems.some((p) => p.includes('duplicate')));
  });
  it('rejects bad accent, ratings, difficulty, unlock refs', () => {
    const bad = {
      ...PLAYABLES[0],
      difficulty: 9,
      accent: [2, -1, 'x'],
      ratings: { power: 0, speed: 99, technique: null },
      unlock: { node: 42 },
    };
    const problems = validateRoster([bad], ENEMIES);
    assert.ok(problems.some((p) => p.includes('difficulty')));
    assert.ok(problems.some((p) => p.includes('accent')));
    assert.ok(problems.some((p) => p.includes('ratings.power')));
    assert.ok(problems.some((p) => p.includes('ratings.speed')));
    assert.ok(problems.some((p) => p.includes('ratings.technique')));
    assert.ok(problems.some((p) => p.includes('unlock')));
  });
  it('fighterById rejects every non-string cleanly', () => {
    for (const junk of [null, undefined, 42, {}, [], true]) {
      assert.equal(fighterById(junk), null);
    }
  });
});

describe('tester M3: dialogue hostile model', () => {
  it('null / empty states never throw and read done', () => {
    assert.equal(dialogueDone(null), true);
    assert.equal(dialogueDone(createDialogue(null)), true);
    assert.equal(dialogueDone(createDialogue('nope')), true);
    assert.equal(currentLine(null), null);
    assert.equal(visibleText(null), '');
    assert.equal(nextDialogueLine(null), false);
    advanceDialogue(null, 5);
    revealLine(null);
  });
  it('hostile advance chars clamp to sane output', () => {
    for (const chars of [-5, 0, NaN, Infinity, -Infinity]) {
      const d = createDialogue([{ speaker: 'A', text: 'hello' }]);
      advanceDialogue(d, chars);
      const v = visibleText(d);
      assert.ok(v.length >= 1 && v.length <= 5, `chars=${chars} gave ${JSON.stringify(v)}`);
      assert.equal(v, 'hello'.slice(0, v.length));
    }
  });
  it('filters non-text lines instead of crashing', () => {
    const d = createDialogue([null, { speaker: 'A' }, { speaker: 'B', text: 'ok' }]);
    assert.equal(d.lines.length, 1);
    assert.equal(currentLine(d).text, 'ok');
  });
  it('partial advance then next completes first (no skip)', () => {
    const d = createDialogue([{ speaker: 'A', text: 'hello' }]);
    advanceDialogue(d, 2);
    assert.equal(nextDialogueLine(d), true);
    assert.equal(lineComplete(d), true);
    assert.equal(visibleText(d), 'hello');
  });
});

describe('tester M3: story walker hostility', () => {
  it('null profile reads at prologue, never throws', () => {
    const c = storyCursor(null);
    assert.equal(c.done, false);
    assert.equal(c.current.id, 'prologue');
  });
  it('rejects null / undefined / wrong node ids', () => {
    for (const junk of [null, undefined, 42, '', 'bogus-node']) {
      const r = completeNode(defaultProfile(), junk);
      assert.equal(r.ok, false, `node ${JSON.stringify(junk)} accepted`);
      assert.ok(typeof r.reason === 'string' && r.reason.length > 0);
    }
  });
  it('rejects completion after the story is done', () => {
    const profile = defaultProfile();
    for (;;) {
      const cur = storyCursor(profile);
      if (cur.done) break;
      const res = completeNode(profile, cur.current.id);
      applyStoryUnlocks(profile.progress, res.unlocks, cur.current.id);
    }
    assert.equal(storyCursor(profile).done, true);
    assert.equal(completeNode(profile, 'epilogue').ok, false);
    assert.equal(completeNode(profile, 'prologue').ok, false);
  });
  it('applyStoryUnlocks never throws; starter entries survive junk payloads', () => {
    applyStoryUnlocks(null, { arenas: [1] }, 'x');
    applyStoryUnlocks(undefined, null, null);
    const progress = defaultProfile().progress;
    applyStoryUnlocks(progress, { arenas: ['x', 1.5], fighters: [42, null] }, 'y');
    assert.ok(progress.unlockedArenas.includes(0), 'arena 0 lost');
    assert.ok(progress.unlockedFighters.includes('kaito'), 'kaito lost');
    assert.ok(!progress.unlockedArenas.includes('x'), 'string arena stored');
    assert.ok(!progress.unlockedFighters.includes(42), 'non-string fighter stored');
  });
  it('bogus completed ids do not wedge the cursor', () => {
    const p = defaultProfile();
    p.progress.story.completed = ['prologue', 'bogus-node', 42, null];
    const c = storyCursor(p);
    assert.equal(c.done, false);
    assert.equal(c.current.id, 'a0-intro');
  });
});

describe('tester M3: profile v2 hostile migration', () => {
  it('every primitive / null blob resets to defaults', () => {
    for (const raw of [null, undefined, 42, 'x', [], true]) {
      const m = migrateProfile(raw);
      assert.equal(m.version, 2);
      assert.equal(storyCursor(m).current.id, 'prologue');
      assert.deepEqual(m.progress.unlockedArenas, [0]);
      assert.ok(m.progress.unlockedFighters.includes('kaito'));
    }
  });
  it('non-array progress fields fall back without throwing', () => {
    const m = migrateProfile({
      version: 2,
      progress: { unlockedArenas: 'x', unlockedFighters: 'y', story: { completed: 'z' }, currency: -5 },
    });
    assert.deepEqual(m.progress.unlockedArenas, [0]);
    assert.ok(m.progress.unlockedFighters.includes('kaito'));
    assert.equal(storyCursor(m).current.id, 'prologue');
    assert.equal(m.progress.currency, 0);
  });
  it('story unlock contract: every fight enemy + arena resolves', () => {
    for (const n of STORY_NODES.filter((x) => x.kind === 'fight')) {
      assert.ok(ENEMIES.some((e) => e.id === n.enemy), `${n.id} enemy`);
      assert.ok(Number.isInteger(n.arena) && n.arena >= 0 && n.arena < ARENAS.length, `${n.id} arena`);
    }
    for (const n of STORY_NODES.filter((x) => x.unlocks)) {
      for (const a of n.unlocks.arenas || []) assert.ok(a >= 0 && a < ARENAS.length);
      for (const f of n.unlocks.fighters || []) assert.ok(PLAYABLES.some((p) => p.id === f));
    }
  });
  it('arenaAt clamps corrupt arena ids to arena 0 (no throw)', () => {
    assert.equal(arenaAt(99), ARENAS[0]);
    assert.equal(arenaAt(-3), ARENAS[0]);
    assert.equal(arenaAt('x'), ARENAS[0]);
    assert.equal(arenaAt(null), ARENAS[0]);
    assert.equal(arenaAt(0), ARENAS[0]);
  });
});
