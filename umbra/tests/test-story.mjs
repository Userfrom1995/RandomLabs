// Umbra M3: story graph, progression walker, dialogue model, profile v2.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORY_NODES,
  nodeById,
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
import { defaultProfile, migrateProfile, PROFILE_VERSION } from '../src/storage/profile.js';
import { PLAYABLES, ENEMIES } from '../src/roster.js';

describe('story graph', () => {
  it('validates clean: 17 nodes, prologue to epilogue', () => {
    assert.deepEqual(validateStory(), []);
    assert.equal(STORY_NODES.length, 17);
  });
  it('has 5 act fights, one per arena in order', () => {
    const fights = STORY_NODES.filter((n) => n.kind === 'fight');
    assert.equal(fights.length, 5);
    assert.deepEqual(fights.map((f) => f.arena), [0, 1, 2, 3, 4]);
    assert.deepEqual(fights.map((f) => f.enemy), ['echo', 'ash', 'ruin', 'vex', 'dusk']);
  });
  it('fight enemies match the 5 enemy archetypes in roster order', () => {
    const fights = STORY_NODES.filter((n) => n.kind === 'fight');
    assert.deepEqual(fights.map((f) => f.enemy), ENEMIES.map((e) => e.id));
  });
  it('rejects dangling next pointers and unreachable nodes', () => {
    const broken = STORY_NODES.map((n) => (n.id === 'a2-fight' ? { ...n, next: 'void' } : { ...n }));
    const problems = validateStory(broken);
    assert.ok(problems.some((p) => p.includes('a2-fight') && p.includes('void')));
    assert.ok(problems.some((p) => p.includes('unreachable')));
  });
  it('rejects unknown fight enemies and arenas', () => {
    const broken = STORY_NODES.map((n) => (n.id === 'a0-fight' ? { ...n, enemy: 'ninja', arena: 9 } : { ...n }));
    const problems = validateStory(broken);
    assert.ok(problems.some((p) => p.includes('unknown enemy')));
    assert.ok(problems.some((p) => p.includes('arena 9')));
  });
});

describe('progression walker', () => {
  const fresh = () => defaultProfile();
  it('starts at the prologue with nothing completed', () => {
    const c = storyCursor(fresh());
    assert.equal(c.done, false);
    assert.equal(c.current.id, 'prologue');
  });
  it('walks the whole chain earning unlocks in order', () => {
    const profile = fresh();
    const seenFighters = new Set(profile.progress.unlockedFighters);
    const seenArenas = new Set(profile.progress.unlockedArenas);
    let steps = 0;
    for (;;) {
      const cur = storyCursor(profile);
      if (cur.done) break;
      const res = completeNode(profile, cur.current.id);
      assert.equal(res.ok, true, `complete ${cur.current.id}`);
      applyStoryUnlocks(profile.progress, res.unlocks, cur.current.id);
      for (const f of res.unlocks.fighters) seenFighters.add(f);
      for (const a of res.unlocks.arenas) seenArenas.add(a);
      steps += 1;
      if (steps > 30) throw new Error('walker did not terminate');
    }
    assert.equal(steps, 17);
    assert.deepEqual([...seenArenas].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
    for (const p of PLAYABLES) assert.ok(seenFighters.has(p.id), `${p.id} never unlocked`);
    const done = storyCursor(profile);
    assert.equal(done.done, true);
    assert.equal(done.current, null);
    assert.equal(profile.progress.story.current, 'complete');
  });
  it('rejects out-of-order completion and double completion', () => {
    const profile = fresh();
    const bad = completeNode(profile, 'a4-fight');
    assert.equal(bad.ok, false);
    const good = completeNode(profile, 'prologue');
    assert.equal(good.ok, true);
    applyStoryUnlocks(profile.progress, good.unlocks, 'prologue');
    const again = completeNode(profile, 'prologue');
    assert.equal(again.ok, false);
  });
  it('applyStoryUnlocks is idempotent', () => {
    const profile = fresh();
    const u = { arenas: [1, 1], fighters: ['mira', 'mira'] };
    applyStoryUnlocks(profile.progress, u, 'a1-outro');
    applyStoryUnlocks(profile.progress, u, 'a1-outro');
    assert.deepEqual(profile.progress.unlockedArenas, [0, 1]);
    assert.deepEqual(profile.progress.unlockedFighters, ['kaito', 'mira']);
    assert.deepEqual(profile.progress.story.completed, ['a1-outro']);
  });
});

describe('dialogue model', () => {
  const lines = [
    { speaker: 'Kaito', text: 'Guard up.' },
    { speaker: '', text: 'Moonlight pools on stone.' },
  ];
  it('types out one line then advances', () => {
    const d = createDialogue(lines);
    assert.equal(dialogueDone(d), false);
    assert.equal(currentLine(d).speaker, 'Kaito');
    assert.equal(visibleText(d), '');
    advanceDialogue(d, 5);
    assert.equal(visibleText(d), 'Guard');
    assert.equal(lineComplete(d), false);
    revealLine(d);
    assert.equal(lineComplete(d), true);
    assert.equal(nextDialogueLine(d), true);
    assert.equal(currentLine(d).speaker, '');
    assert.equal(visibleText(d), '');
  });
  it('partial line advance completes instead of skipping', () => {
    const d = createDialogue(lines);
    advanceDialogue(d, 2);
    assert.equal(nextDialogueLine(d), true);
    assert.equal(currentLine(d).speaker, 'Kaito');
    assert.equal(lineComplete(d), true);
    assert.equal(nextDialogueLine(d), true);
    assert.equal(currentLine(d).speaker, '');
  });
  it('finishes exactly at the last line', () => {
    const d = createDialogue(lines);
    revealLine(d);
    assert.equal(nextDialogueLine(d), true);
    revealLine(d);
    assert.equal(nextDialogueLine(d), false);
    assert.equal(dialogueDone(d), true);
    assert.equal(currentLine(d), null);
  });
  it('empty scripts are done immediately', () => {
    assert.equal(dialogueDone(createDialogue([])), true);
    assert.equal(dialogueDone(createDialogue(null)), true);
  });
});

describe('profile v2', () => {
  it('defaults carry kaito, arena 0, and an empty story', () => {
    const p = defaultProfile();
    assert.equal(p.version, PROFILE_VERSION);
    assert.deepEqual(p.progress.unlockedFighters, ['kaito']);
    assert.deepEqual(p.progress.unlockedArenas, [0]);
    assert.deepEqual(p.progress.story, { completed: [], current: 'prologue' });
  });
  it('migrates a v1 blob: keeps config, grants kaito, starts the story', () => {
    const v1 = {
      version: 1,
      config: { tier: '1', ladderIndex: 2, batterySaver: true, reducedMotion: false },
      progress: { unlockedArenas: [0], unlockedFighters: [], currency: 0 },
    };
    const p = migrateProfile(v1);
    assert.equal(p.version, PROFILE_VERSION);
    assert.equal(p.config.batterySaver, true);
    assert.deepEqual(p.progress.unlockedFighters, ['kaito']);
    assert.deepEqual(p.progress.story, { completed: [], current: 'prologue' });
    assert.equal(storyCursor(p).current.id, 'prologue');
  });
  it('carries v2 story progress forward and drops non-string ids', () => {
    const v2 = defaultProfile();
    v2.progress.story.completed = ['prologue', 'a0-intro', 42, null];
    v2.progress.unlockedFighters = ['kaito', 'mira'];
    const p = migrateProfile(v2);
    assert.deepEqual(p.progress.story.completed, ['prologue', 'a0-intro']);
    assert.equal(storyCursor(p).current.id, 'a0-fight');
  });
});
