// Hearthlight eval-4 regression suite (Tester, Phase 1).
// Run: node film/tests/regression-eval4.mjs - exit non-zero on any failure.
// Pins the two blocking fourth-eval defects:
// (1) slate burns no pipeline jargon into the picture (title only),
// (2) null captions and per-frame throws degrade to the error card,
//     never killing the rAF loop with a raw TypeError.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captionAt } from '../engine/timeline.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

const animatic = readFileSync(join(root, 'engine/animatic.js'), 'utf8');
const timeline = readFileSync(join(root, 'engine/timeline.js'), 'utf8');
const player = readFileSync(join(root, 'player/player.js'), 'utf8');

// (1) slate: title only, no pipeline jargon in the picture path
ok('slate burns no living-animatic jargon',
  !/living animatic/i.test(animatic));
ok('slate renders Act N plus shot title',
  animatic.includes("'Act ' + s.act + ' - ' + s.title"));
ok('no shot-id code burned into slate fillText',
  !/fillText\(s\.id/.test(animatic));

// (2a) null-safe captions: skip null entries, never raw-throw
ok('captionAt skips null entries in source',
  timeline.includes('if (!c) continue'));
let nullProbe = 'no-run';
try {
  const r = captionAt({ captions: [null] }, 1);
  nullProbe = r === null ? 'null' : JSON.stringify(r);
} catch (e) { nullProbe = 'THREW:' + e.message; }
ok('captionAt({captions:[null]},1) returns null with no throw', nullProbe === 'null', nullProbe);
let nullShot = 'no-run';
try {
  nullShot = captionAt(null, 1) === null ? 'null' : 'non-null';
} catch (e) { nullShot = 'THREW:' + e.message; }
ok('captionAt(null) returns null', nullShot === 'null', nullShot);

// (2b) renderFrame guards the rAF loop: try/catch routes to showError
ok('renderFrame body wrapped in try/catch',
  /function renderFrame\(\) \{[\s\S]*?try \{/.test(player));
ok('frame failure routes to reels-are-damaged error card',
  player.includes("showError('The reels are damaged'"));
ok('frame failure stops playback instead of looping damage',
  player.includes('state.playing = false'));

if (failures) { console.error('REGRESSION-EVAL4 RED: ' + failures + ' failures'); process.exit(1); }
console.log('REGRESSION-EVAL4 GREEN');
