// Hearthlight audit: enforces the binding gates on committed sources.
// Exit 0 = green, non-zero = gate failure with a reason.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt } from '../engine/timeline.js';
import { motifFor } from '../score/themes.js';
import { PAINTED_BACKGROUNDS } from '../engine/backgrounds.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failures.push(name);
};

const cliArgs = process.argv.slice(2);
if (cliArgs.includes('--help') || cliArgs.includes('-h')) {
  console.log('Usage: node film/tools/audit.mjs [--help]');
  console.log('Enforces the binding gates on committed sources; exits 0 green, 1 on gate failure.');
  console.log('Takes no flags; exits 2 on unknown flags.');
  process.exit(0);
}
const unknownAuditFlag = cliArgs.find((a) => a.startsWith('-'));
if (unknownAuditFlag) {
  console.error('Unknown flag: ' + unknownAuditFlag + ' (usage: node film/tools/audit.mjs [--help])');
  process.exit(2);
}

function loadJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(label + ' is corrupt (' + path + '): ' + err.message);
    process.exit(1);
  }
};

const sp = loadJson(join(root, 'story/screenplay.json'), 'story/screenplay.json');
const tl = buildTimeline(sp);
check('runtime 240-300s', tl.total >= 240 && tl.total <= 300, tl.total + 's');
check('five acts', tl.acts.length === 5);

let prev = 0; let contiguous = true;
for (const s of tl.shots) { if (Math.abs(s.start - prev) > 1e-9) contiguous = false; prev = s.end; }
check('shots contiguous, no gaps', contiguous, tl.shots.length + ' shots');

let coverage = true; const covWhy = [];
for (const s of tl.shots) {
  if (!s.bg || !s.palette) { coverage = false; covWhy.push(s.id + ':bg'); }
  if (!Array.isArray(s.cast)) { coverage = false; covWhy.push(s.id + ':cast'); }
  if (!s.music || !s.music.cue || !s.music.motif || !s.music.tempo) { coverage = false; covWhy.push(s.id + ':cue'); }
  else {
    try { motifFor(s.music); } catch { coverage = false; covWhy.push(s.id + ':motif'); }
  }
  for (const c of s.captions || []) {
    if (c.t < 0 || c.t + 4.5 > s.dur + 1e-9) { coverage = false; covWhy.push(s.id + ':caption-overflow'); }
    if (!c.who || !c.line) { coverage = false; covWhy.push(s.id + ':caption-empty'); }
  }
}
check('shot coverage (bg/cast/cue/captions)', coverage, covWhy.join(',') || 'all 20 shots');

// scrub-exactness: shotAt(total - eps) resolves to the last shot
const end = shotAt(tl, tl.total - 0.001);
check('timeline end resolves', end.shot.id === tl.shots[tl.shots.length - 1].id, end.shot.id);

// determinism: rng substreams are stable across imports
const rng = await import('../engine/rng.js');
const a = rng.substream('20260927', 'boil|s01', 7)();
const b = rng.substream('20260927', 'boil|s01', 7)();
check('rng deterministic', a === b, String(a));

// provenance: no binary blobs without committed generators
const bins = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (n === 'dist') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(png|wav|mp3|mp4|webm|ttf|otf|bin)$/i.test(n)) bins.push(p);
  }
})(root);
check('provenance (no binary blobs)', bins.length === 0, bins.join(','));

// storyboard parity
const board = loadJson(join(root, 'story/storyboard.json'), 'story/storyboard.json');
check('storyboard covers all shots', board.panels.length === tl.shots.length, board.panels.length + ' panels');

// hand-drawn craft engine: modules present, paint set covers the screenplay
const craftMods = ['engine/ink.js', 'engine/paper.js', 'engine/backgrounds.js', 'engine/rigs.js'];
check('craft modules committed', craftMods.every((f) => existsSync(join(root, f))), craftMods.join(','));
const usedBgs = [...new Set(tl.shots.map((s) => s.bg))];
check('paint set covers screenplay bgs', usedBgs.every((b) => PAINTED_BACKGROUNDS.includes(b)), usedBgs.join(','));
const usedMoves = [...new Set(tl.shots.map((s) => s.camera.move))];
const knownMoves = ['push-in', 'pull-back', 'pan-right', 'track-left', 'track-right', 'sweep', 'rise', 'crane-up', 'tilt-up', 'bloom', 'fade-gold', 'hold', 'drift', 'orbit'];
check('camera moves all known', usedMoves.every((m) => knownMoves.includes(m)), usedMoves.join(','));

// self-review loop: capture tool + gallery wall wired, no binaries shipped
check('capture tool committed', existsSync(join(root, 'tools/capture.mjs')));
const html = readFileSync(join(root, 'index.html'), 'utf8');
check('stills gallery wired', html.includes('id="galleryGrid"') && existsSync(join(root, 'player/gallery.js')));
const playerJs = readFileSync(join(root, 'player/player.js'), 'utf8');
check('player paints gallery', playerJs.includes('paintGallery(state.tl'));

// full animation performance: frame lock, weather, eased acting
check('frame lock module committed', existsSync(join(root, 'engine/frames.js')));
check('particles module committed', existsSync(join(root, 'engine/particles.js')));
const { PARTICLE_FIELDS } = await import('../engine/particles.js');
const perfUsedBgs = [...new Set(tl.shots.map((s) => s.bg))];
check('weather covers screenplay bgs',
  perfUsedBgs.every((b) => b in PARTICLE_FIELDS), perfUsedBgs.join(','));
check('player seeks on the frame grid', playerJs.includes('frameTime('));
check('performance suite committed', existsSync(join(root, 'tests/performance.mjs')));

if (failures.length) { console.error('AUDIT RED: ' + failures.join(', ')); process.exit(1); }
console.log('AUDIT GREEN');
