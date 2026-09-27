// Hearthlight audit (Phase 1): enforces the binding gates on committed
// sources. Exit 0 = green, non-zero = gate failure with a reason.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt } from '../engine/timeline.js';
import { motifFor } from '../score/themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failures.push(name);
};

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
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
const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
check('storyboard covers all shots', board.panels.length === tl.shots.length, board.panels.length + ' panels');

if (failures.length) { console.error('AUDIT RED: ' + failures.join(', ')); process.exit(1); }
console.log('AUDIT GREEN');
