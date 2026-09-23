/**
 * Umbra M3 story: act/scene graph, dialogue lines, progression walker.
 * Pure, no DOM, no Math.random, no Date.now. Safe for Node tests.
 *
 * Graph: prologue -> 5 acts x (intro dialogue, fight, outro dialogue) ->
 * epilogue. Linear chain; the walker enforces order so unlocks are earned.
 * Fight nodes name a roster enemy id + arena index + optional hp/difficulty
 * overrides. Outro nodes carry unlock payloads:
 * { arenas: [n], fighters: [id] } applied to the profile on completion.
 */

import { ARENAS } from './arenas.js';
import { PLAYABLES, ENEMIES, fighterById } from './roster.js';

/**
 * @typedef {object} DialogueLine
 * @property {string} speaker speaker name (or '' for narration)
 * @property {string} text line text
 */

/**
 * @typedef {object} StoryNode
 * @property {string} id unique node id
 * @property {'prologue'|'dialogue'|'fight'|'epilogue'} kind
 * @property {string} title display title
 * @property {number} act act index 0..4 (prologue/epilogue use -1 / 5)
 * @property {DialogueLine[]} [lines] dialogue content
 * @property {string} [enemy] roster enemy id (fight nodes)
 * @property {number} [arena] arena index (fight nodes)
 * @property {number} [rounds] bout rounds (fight nodes, default 3)
 * @property {{arenas?:number[], fighters?:string[]}} [unlocks] applied on completion
 * @property {string|null} next next node id (null at the epilogue)
 */

const L = (speaker, text) => ({ speaker, text });

/** @type {StoryNode[]} */
export const STORY_NODES = [
  {
    id: 'prologue',
    kind: 'prologue',
    title: 'The Ashen Veil',
    act: -1,
    lines: [
      L('', 'The sun went out like a lamp, and the shadows stood up and walked.'),
      L('Elder Sable', 'Kaito. Five seals. Five guardians. Close the Gate of Dusk, or the Eclipse keeps us all.'),
      L('Kaito', 'Then I walk. Open the road, elder. My shadow and I have business.'),
    ],
    next: 'a0-intro',
  },
  {
    id: 'a0-intro',
    kind: 'dialogue',
    title: 'Moonlit Temple: Arrival',
    act: 0,
    lines: [
      L('', 'Moonlight pools on temple stone. Your shadow detaches from your feet and takes a guard stance.'),
      L('Echo', 'Turn back. I am everything you are, and I never get tired.'),
      L('Kaito', 'Then you never get better, either. Guard up.'),
    ],
    next: 'a0-fight',
  },
  {
    id: 'a0-fight',
    kind: 'fight',
    title: 'Face the Reflection',
    act: 0,
    enemy: 'echo',
    arena: 0,
    rounds: 3,
    next: 'a0-outro',
  },
  {
    id: 'a0-outro',
    kind: 'dialogue',
    title: 'Moonlit Temple: The First Seal',
    act: 0,
    lines: [
      L('Echo', 'Hah. So you CAN outgrow yourself. Take the seal. The Forge burns next.'),
      L('', 'The first Ember Seal cools in your palm. Somewhere east, forge fires spell a name: MIRA.'),
    ],
    unlocks: { arenas: [1], fighters: [] },
    next: 'a1-intro',
  },
  {
    id: 'a1-intro',
    kind: 'dialogue',
    title: 'Ember Forge: The Name in Sparks',
    act: 1,
    lines: [
      L('Mira', 'You read sparks too? Then you know my name, stranger. The Hound keeps this forge, and it does not share.'),
      L('Kaito', 'Then we take it together. Two blades, one fire.'),
      L('Ash', 'MORE FUEL. COME, LITTLE SPARKS.'),
    ],
    next: 'a1-fight',
  },
  {
    id: 'a1-fight',
    kind: 'fight',
    title: 'Quench the Forge Hound',
    act: 1,
    enemy: 'ash',
    arena: 1,
    rounds: 3,
    next: 'a1-outro',
  },
  {
    id: 'a1-outro',
    kind: 'dialogue',
    title: 'Ember Forge: A Duelist Joins',
    act: 1,
    lines: [
      L('Mira', 'The Hound is scrap. And you fight like a story, Kaito. My blade is yours until the Gate falls.'),
      L('', 'MIRA joins the journey. The second Ember Seal hums with storm static from the high bridge.'),
    ],
    unlocks: { arenas: [2], fighters: ['mira'] },
    next: 'a2-intro',
  },
  {
    id: 'a2-intro',
    kind: 'dialogue',
    title: 'Storm Bridge: Static',
    act: 2,
    lines: [
      L('Mira', 'That herald was a bridge-keeper once. The storm ate the keeper and left the trumpet.'),
      L('Ruin', 'TRESPASSERS ON THE HIGH PASS. THE TOLL IS PAID IN LIGHTNING.'),
      L('Kaito', 'We carry our own light. Come and collect.'),
    ],
    next: 'a2-fight',
  },
  {
    id: 'a2-fight',
    kind: 'fight',
    title: 'Silence the Herald',
    act: 2,
    enemy: 'ruin',
    arena: 2,
    rounds: 3,
    next: 'a2-outro',
  },
  {
    id: 'a2-outro',
    kind: 'dialogue',
    title: 'Storm Bridge: The Third Seal',
    act: 2,
    lines: [
      L('Ruin', '...the pass... is open... tell the mountain... I kept it...'),
      L('', 'The storm breaks into ordinary rain. Below, in the lightless sanctum, something vast shifts its guard.'),
    ],
    unlocks: { arenas: [3], fighters: [] },
    next: 'a3-intro',
  },
  {
    id: 'a3-intro',
    kind: 'dialogue',
    title: 'Void Sanctum: The Wall',
    act: 3,
    lines: [
      L('', 'The dark here has weight. A broad silhouette blocks the sanctum door, arms folded like a gate.'),
      L('Goran', 'None pass. I held this door for nine days and I will hold it nine more. ...Unless you move me, little shadows.'),
      L('Kaito', 'We need what is behind you, friend. Forgive the bruises.'),
    ],
    next: 'a3-fight',
  },
  {
    id: 'a3-fight',
    kind: 'fight',
    title: 'Move the Bulwark',
    act: 3,
    enemy: 'vex',
    arena: 3,
    rounds: 3,
    next: 'a3-outro',
  },
  {
    id: 'a3-outro',
    kind: 'dialogue',
    title: 'Void Sanctum: The Door Opens',
    act: 3,
    lines: [
      L('Goran', 'Hah! MOVED. Nine days, and it took you nine minutes. The door is yours, and so is my guard.'),
      L('', 'GORAN joins the journey. The fourth Ember Seal is cold as deep water. Above, the eclipsed sun waits on its rooftop.'),
    ],
    unlocks: { arenas: [4], fighters: ['goran'] },
    next: 'a4-intro',
  },
  {
    id: 'a4-intro',
    kind: 'dialogue',
    title: 'Eclipse Rooftop: Terms',
    act: 4,
    lines: [
      L('Dusk', 'KNEEL, LITTLE SHADOWS. The Eclipse offers a simple trade: your light, for your lives.'),
      L('Mira', 'We have heard better offers from thunderstorms.'),
      L('Goran', 'And I do not kneel. It ruins the stance.'),
      L('Kaito', 'You heard my shadows, envoy. Come take our answer.'),
    ],
    next: 'a4-fight',
  },
  {
    id: 'a4-fight',
    kind: 'fight',
    title: 'Refuse the Envoy',
    act: 4,
    enemy: 'dusk',
    arena: 4,
    rounds: 3,
    next: 'a4-outro',
  },
  {
    id: 'a4-outro',
    kind: 'dialogue',
    title: 'Eclipse Rooftop: Five Seals',
    act: 4,
    lines: [
      L('Dusk', 'IMPOSSIBLE... THE ECLIPSE DOES NOT... SET...'),
      L('', 'Five seals burn in a ring. The Gate of Dusk shudders. The true Eclipse stirs below (it wakes fully in the next trial).'),
    ],
    unlocks: { arenas: [], fighters: [] },
    next: 'epilogue',
  },
  {
    id: 'epilogue',
    kind: 'epilogue',
    title: 'Dawn, Deferred',
    act: 5,
    lines: [
      L('', 'The Veil thins, but the sun does not return. Not yet.'),
      L('Kaito', 'Five seals down. The Gate still stands, and something beneath it knows our names now.'),
      L('Mira', 'Then we train, we sharpen, and we go down together.'),
      L('Goran', 'The wall holds. Rest, little shadows. Dawn keeps.'),
    ],
    next: null,
  },
];

/** @type {Map<string, StoryNode>} */
export const NODE_BY_ID = new Map(STORY_NODES.map((n) => [n.id, n]));

/**
 * @param {string} id node id
 * @returns {StoryNode|null}
 */
export function nodeById(id) {
  return typeof id === 'string' ? NODE_BY_ID.get(id) || null : null;
}

/**
 * Validate the story graph: chain integrity, reachability, no dead ends,
 * and every fight/unlock reference resolves to roster/arena data.
 * @param {StoryNode[]} [nodes]
 * @returns {string[]} violations (empty when valid)
 */
export function validateStory(nodes = STORY_NODES) {
  const problems = [];
  if (!Array.isArray(nodes) || nodes.length === 0) return ['story must be a non-empty node array'];
  const byId = new Map(nodes.map((n) => [n && n.id, n]));
  if (byId.size !== nodes.length) problems.push('duplicate node ids');
  const starts = nodes.filter((n) => n && (n.kind === 'prologue' || n.id === 'prologue'));
  if (starts.length !== 1) problems.push(`expected exactly one prologue, found ${starts.length}`);
  // Walk the chain from the prologue.
  const visited = new Set();
  let cur = nodes.find((n) => n && n.id === 'prologue') || null;
  let guard = nodes.length + 2;
  while (cur && guard-- > 0) {
    if (visited.has(cur.id)) {
      problems.push(`cycle at "${cur.id}"`);
      break;
    }
    visited.add(cur.id);
    cur = cur.next == null ? null : byId.get(cur.next) || null;
    if (cur === null && visited.size > 0) {
      const last = nodes.find((n) => n.next != null && !byId.get(n.next));
      if (last) problems.push(`"${last.id}" points at unknown node "${last.next}"`);
    }
  }
  for (const n of nodes) {
    if (!visited.has(n.id)) problems.push(`unreachable node "${n.id}"`);
  }
  for (const n of nodes) {
    const tag = `node "${n.id}"`;
    if (!['prologue', 'dialogue', 'fight', 'epilogue'].includes(n.kind)) problems.push(`${tag}: bad kind "${n.kind}"`);
    if (typeof n.title !== 'string' || n.title.length === 0) problems.push(`${tag}: title required`);
    if (!Number.isInteger(n.act)) problems.push(`${tag}: act must be an integer`);
    if (n.kind === 'prologue' || n.kind === 'dialogue' || n.kind === 'epilogue') {
      if (!Array.isArray(n.lines) || n.lines.length === 0) problems.push(`${tag}: dialogue needs at least one line`);
      else {
        for (const [i, line] of n.lines.entries()) {
          if (!line || typeof line.text !== 'string' || line.text.length === 0) problems.push(`${tag}: line ${i} has no text`);
          if (!line || typeof line.speaker !== 'string') problems.push(`${tag}: line ${i} speaker must be a string`);
          if (line && typeof line.text === 'string' && line.text.includes('\u2014')) problems.push(`${tag}: line ${i} uses an em dash (use hyphen)`);
        }
      }
    }
    if (n.kind === 'fight') {
      if (!fighterById(n.enemy)) problems.push(`${tag}: unknown enemy "${n.enemy}"`);
      else if (!ENEMIES.some((e) => e.id === n.enemy)) problems.push(`${tag}: "${n.enemy}" is not an enemy archetype`);
      if (!Number.isInteger(n.arena) || n.arena < 0 || n.arena >= ARENAS.length) problems.push(`${tag}: arena ${n.arena} out of range`);
      if (n.rounds != null && (!Number.isInteger(n.rounds) || n.rounds < 1)) problems.push(`${tag}: rounds must be >= 1`);
    }
    if (n.unlocks != null) {
      const u = n.unlocks;
      for (const a of u.arenas || []) {
        if (!Number.isInteger(a) || a < 0 || a >= ARENAS.length) problems.push(`${tag}: unlocks unknown arena ${a}`);
      }
      for (const f of u.fighters || []) {
        if (!PLAYABLES.some((p) => p.id === f)) problems.push(`${tag}: unlocks unknown playable "${f}"`);
      }
    }
    if (n.next == null) {
      if (n.kind !== 'epilogue') problems.push(`${tag}: only the epilogue may end the chain`);
    } else if (!byId.has(n.next)) {
      problems.push(`${tag}: next "${n.next}" does not exist`);
    }
  }
  // Roster unlock refs must resolve to real story nodes.
  for (const p of PLAYABLES) {
    if (p.unlock && !byId.has(p.unlock.node)) problems.push(`playable "${p.id}" unlocks at unknown node "${p.unlock.node}"`);
  }
  return problems;
}

/**
 * Read the player's story cursor from a profile.
 * @param {object} profile migrated profile (progress.story.completed array)
 * @returns {{current: StoryNode|null, completed: string[], done: boolean}}
 */
export function storyCursor(profile) {
  const completed = profile && profile.progress && Array.isArray(profile.progress.story.completed)
    ? profile.progress.story.completed.filter((id) => typeof id === 'string')
    : [];
  const doneSet = new Set(completed);
  let cur = nodeById('prologue');
  while (cur && doneSet.has(cur.id) && cur.next != null) cur = nodeById(cur.next);
  if (cur && doneSet.has(cur.id) && cur.next == null) return { current: null, completed, done: true };
  return { current: cur, completed, done: false };
}

/**
 * Complete the current node: returns the unlocks earned plus the next node.
 * Does NOT mutate the profile; the caller applies via applyStoryUnlocks()
 * and records completion. Rejects completing a node that is not current.
 * @param {object} profile migrated profile
 * @param {string} nodeId node being completed
 * @returns {{ok: boolean, reason?: string, unlocks?: {arenas:number[], fighters:string[]}, next?: StoryNode|null, completed?: boolean}}
 */
export function completeNode(profile, nodeId) {
  const cursor = storyCursor(profile);
  if (cursor.done) return { ok: false, reason: 'story already complete' };
  if (!cursor.current || cursor.current.id !== nodeId) {
    return { ok: false, reason: `expected current node "${cursor.current ? cursor.current.id : 'none'}", got "${nodeId}"` };
  }
  const node = cursor.current;
  const unlocks = { arenas: [...((node.unlocks && node.unlocks.arenas) || [])], fighters: [...((node.unlocks && node.unlocks.fighters) || [])] };
  const next = node.next == null ? null : nodeById(node.next);
  return { ok: true, unlocks, next, completed: next == null };
}

/**
 * Apply unlock payloads to a profile progress object (idempotent).
 * @param {object} progress profile.progress (mutated)
 * @param {{arenas?:number[], fighters?:string[]}} unlocks
 * @param {string} nodeId completed node id (recorded)
 */
export function applyStoryUnlocks(progress, unlocks, nodeId) {
  if (!progress || typeof progress !== 'object') return;
  if (!Array.isArray(progress.unlockedArenas)) progress.unlockedArenas = [0];
  if (!Array.isArray(progress.unlockedFighters)) progress.unlockedFighters = [];
  if (!progress.story || typeof progress.story !== 'object') progress.story = { completed: [], current: 'prologue' };
  if (!Array.isArray(progress.story.completed)) progress.story.completed = [];
  for (const a of (unlocks && unlocks.arenas) || []) {
    if (Number.isInteger(a) && !progress.unlockedArenas.includes(a)) progress.unlockedArenas.push(a);
  }
  for (const f of (unlocks && unlocks.fighters) || []) {
    if (typeof f === 'string' && !progress.unlockedFighters.includes(f)) progress.unlockedFighters.push(f);
  }
  if (typeof nodeId === 'string' && !progress.story.completed.includes(nodeId)) progress.story.completed.push(nodeId);
  const cursorAfter = storyCursor({ progress });
  progress.story.current = cursorAfter.done ? 'complete' : (cursorAfter.current ? cursorAfter.current.id : 'complete');
}
