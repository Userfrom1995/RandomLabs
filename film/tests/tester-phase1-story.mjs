// Hearthlight Phase 1 story-rebuild regression suite (Tester-owned).
// Verifies the rebuilt 270 s screenplay: shot/caption counts, byte-exact VTT,
// continuity-ledger flame chain, dialogue-lattice timing, character-bible
// roles, plus hostile boundary probes on the timeline engine.
// Run: node film/tests/tester-phase1-story.mjs - exit non-zero on any failure.
import { readFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { buildTimeline, shotAt, captionAt } from '../engine/timeline.js';
import { buildVtt } from '../tools/render-captions.mjs';
import { frameTime } from '../engine/frames.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);

// Skeleton: 20 shots, 270 s total.
ok('phase1 20 shots', sp.shots.length === 20, sp.shots.length + ' shots');
ok('phase1 270 s total', tl.total === 270, tl.total + 's');

// Dialogue: 43 lines, 43 VTT cues, byte-exact rebuild.
const caps = sp.shots.flatMap((s) => s.captions || []);
ok('phase1 43 dialogue lines', caps.length === 43, caps.length + ' lines');
const committed = readFileSync(join(root, 'captions.vtt'), 'utf8');
const { vtt, cues } = buildVtt(tl);
ok('phase1 43 vtt cues', cues.length === 43, cues.length + ' cues');
ok('phase1 vtt byte-exact', vtt === committed);
ok('phase1 vtt cue count matches file', (committed.match(/-->/g) || []).length === 43);

// Continuity ledger: every shot chained, flame links unbroken shot to shot.
const chained = sp.shots.filter((s) => s.continuity && s.continuity.entry && s.continuity.exit && s.continuity.cause);
ok('phase1 ledger 20/20 chained', chained.length === 20, chained.length + '/20');
let linksOk = true;
for (let i = 1; i < sp.shots.length; i++) {
  if (sp.shots[i].continuity.flameIn !== sp.shots[i - 1].continuity.flameOut) linksOk = false;
}
ok('phase1 flame chain unbroken', linksOk, sp.shots[0].continuity.flameIn + '>' + sp.shots[sp.shots.length - 1].continuity.flameOut);
ok('phase1 flame arc ends many', sp.shots[sp.shots.length - 1].continuity.flameOut === 'many');

// Dialogue lattice: speakers/emotions closed sets, t+dur on the 24 fps lattice,
// no overflow past the shot, no overlap within a shot.
const SPEAKERS = new Set(['NARRATOR', 'NIA', 'YARA', 'TAM', 'LUMI', 'RUEL']);
let latticeOk = true; let latticeWhy = '';
for (const s of sp.shots) {
  const lines = s.captions || [];
  const sorted = [...lines].sort((a, b) => a.t - b.t);
  lines.forEach((c, i) => {
    const dur = c.dur || 4.5;
    if (!SPEAKERS.has(c.who)) { latticeOk = false; latticeWhy = s.id + ':speaker'; }
    if (typeof c.emotion !== 'string' || !c.emotion) { latticeOk = false; latticeWhy = s.id + ':emotion'; }
    if (Math.abs(frameTime(c.t) - c.t) > 1e-9 || Math.abs(frameTime(dur) - dur) > 1e-9) { latticeOk = false; latticeWhy = s.id + ':lattice'; }
    if (c.t < 0 || c.t + dur > s.dur + 1e-9) { latticeOk = false; latticeWhy = s.id + ':overflow'; }
    if (i > 0 && c.t < sorted[i - 1].t + (sorted[i - 1].dur || 4.5) - 1e-9) { latticeOk = false; latticeWhy = s.id + ':overlap'; }
  });
}
ok('phase1 lattice clean (speaker/emotion/frame/overflow/overlap)', latticeOk, latticeWhy || '43/43 aligned');

// Character bible: human leads Tam and Lumi, Ruel supporting only.
const bible = readFileSync(join(root, 'story/characters.md'), 'utf8');
ok('phase1 Tam lead in bible', /## Tam - .*\(lead\)/.test(bible));
ok('phase1 Lumi lead in bible', /## Lumi - .*\(lead/.test(bible));
ok('phase1 Ruel supporting in bible', /## Ruel - .*\(supporting\)/.test(bible));

// Shipped JS must parse: a syntax error in player.js kills the whole module
// (transport, captions, trailer) in a real browser. Parse as a module goal
// via a .mjs copy so import statements are accepted and only real syntax
// defects fail. Regression: Phase 1 END_CREDITS edit broke the string.
let playerParses = true; let playerWhy = '';
try {
  const tmp = join(tmpdir(), 'tester-phase1-player-check.mjs');
  copyFileSync(join(root, 'player/player.js'), tmp);
  execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
} catch (e) {
  playerParses = false;
  playerWhy = String(e.message).split('\n').slice(0, 3).join(' | ');
}
ok('phase1 player.js parses as module', playerParses, playerWhy);

// Hostile boundary probes: engine must not throw on degenerate seeks.
let threw = false;
try {
  shotAt(tl, -1); shotAt(tl, NaN); shotAt(tl, Infinity); shotAt(tl, 1e9);
  captionAt(tl.shots[0], -5); captionAt(tl.shots[0], NaN);
  captionAt(tl.shots[tl.shots.length - 1], 1e6);
} catch { threw = true; }
ok('phase1 hostile seeks no-throw', !threw);
ok('phase1 pre-roll caption null', captionAt(tl.shots[0], -5) === null);
ok('phase1 far-past-shot caption null', captionAt(tl.shots[tl.shots.length - 1], 1e6) === null);

if (failures) { console.error('TESTER-PHASE1 RED'); process.exit(1); }
console.log('TESTER-PHASE1 GREEN');
