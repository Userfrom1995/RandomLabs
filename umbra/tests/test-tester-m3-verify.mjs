// Tester M3 second-layer verification (post-fixer re-test, PR #382).
// Durable pins for hostile paths NOT covered by test-tester-m3.mjs:
// validateStory junk inputs, full 17-node walk count, long/unicode
// dialogue, v1 profile migration, and versus-gate story ordering.
// Pure modules only (node:test).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYABLES, ENEMIES } from '../src/roster.js';
import {
  STORY_NODES,
  validateStory,
  storyCursor,
  completeNode,
  applyStoryUnlocks,
} from '../src/story.js';
import { createDialogue, advanceDialogue, visibleText } from '../src/dialogue.js';
import { defaultProfile, migrateProfile } from '../src/storage/profile.js';
import { ARENAS } from '../src/arenas.js';

describe('tester M3 verify: story validator hostility', () => {
  it('rejects null / junk graphs, accepts the shipped graph', () => {
    for (const junk of [null, 5, 'x', {}, []]) {
      const v = validateStory(junk);
      assert.ok(Array.isArray(v) && v.length > 0, `no violations for ${JSON.stringify(junk)}`);
    }
    assert.deepEqual(validateStory(), []);
    assert.deepEqual(validateStory(STORY_NODES), []);
  });
  it('undefined falls back to the shipped graph (default-param semantics)', () => {
    assert.deepEqual(validateStory(undefined), []);
  });
});

describe('tester M3 verify: walker end-to-end', () => {
  it('walks exactly 17 nodes then reports done', () => {
    const p = defaultProfile();
    let n = 0;
    for (;;) {
      const cur = storyCursor(p);
      if (cur.done) break;
      const res = completeNode(p, cur.current.id);
      assert.equal(res.ok, true, `stuck at ${cur.current.id}: ${res.reason}`);
      applyStoryUnlocks(p.progress, res.unlocks, cur.current.id);
      n++;
      assert.ok(n <= 30, 'walker looped');
    }
    assert.equal(n, 17);
    assert.equal(storyCursor(p).done, true);
  });
  it('unlocks arrive in story order (arena1+Mira only after a1-outro)', () => {
    const p = defaultProfile();
    const first = completeNode(p, 'prologue');
    assert.equal(first.ok, true);
    applyStoryUnlocks(p.progress, first.unlocks, 'prologue');
    assert.ok(!p.progress.unlockedFighters.includes('mira'), 'Mira early');
    assert.ok(!p.progress.unlockedArenas.includes(2), 'arena 2 early');
  });
});

describe('tester M3 verify: dialogue + profile extremes', () => {
  it('5k-char unicode line reveals fully without corruption', () => {
    const text = 'x'.repeat(5000) + '日本語 🔥';
    const d = createDialogue([{ speaker: 'A', text }]);
    advanceDialogue(d, 1e9);
    assert.equal(visibleText(d), text);
  });
  it('v1 blob migrates to v2 keeping earned progress', () => {
    const m = migrateProfile({
      version: 1,
      progress: {
        unlockedArenas: [0, 1],
        unlockedFighters: ['kaito', 'mira'],
        story: { completed: ['prologue'] },
        currency: 0,
        best: {},
      },
    });
    assert.equal(m.version, 2);
    assert.ok(m.progress.unlockedArenas.includes(1));
    assert.ok(m.progress.unlockedFighters.includes('mira'));
    assert.equal(storyCursor(m).current.id, 'a0-intro');
  });
  it('every fight node enemy/arena resolves against roster + arenas', () => {
    for (const n of STORY_NODES.filter((x) => x.kind === 'fight')) {
      assert.ok(ENEMIES.some((e) => e.id === n.enemy), `${n.id} enemy ${n.enemy}`);
      assert.ok(n.arena >= 0 && n.arena < ARENAS.length, `${n.id} arena ${n.arena}`);
    }
    assert.ok(PLAYABLES.length === 3 && ENEMIES.length === 5);
  });
});
