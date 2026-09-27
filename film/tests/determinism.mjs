// Hearthlight determinism proof (Fixer, Phase 1 eval follow-up).
// Run: node film/tests/determinism.mjs - exit non-zero on any failure.
// Proves scrub-exactness below the timeline level (draw-call pin: rendering
// the same t twice yields byte-identical draw logs) and proves the render
// pipeline is byte-identical across repeat runs (manifest check on CI, not
// ad-hoc). Also pins the input-validation guards.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, shotAt, captionAt, formatTime } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import { motifFor } from '../score/themes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

// Recording stub for CanvasRenderingContext2D: every method call and every
// property write is appended to an exactly-serializable log.
function makeRecorder() {
  const log = [];
  const norm = (a) => (typeof a === 'number' ? Number(a.toFixed(6)) : String(a));
  const grad = () => ({ addColorStop: (o, c) => { log.push(['addColorStop', norm(o), String(c)]); } });
  const stored = {};
  const ctx = new Proxy({}, {
    get(t, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop in stored) return stored[prop];
      return (...args) => {
        log.push([prop, ...args.map(norm)]);
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return grad();
        return undefined;
      };
    },
    set(t, prop, v) { log.push(['set', prop, norm(v)]); stored[prop] = v; return true; },
  });
  return { ctx, log };
}

const sha = (s) => createHash('sha256').update(s).digest('hex');

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);

function renderHash(t, reducedMotion) {
  const { ctx, log } = makeRecorder();
  renderAnimatic(ctx, tl, t, { width: 960, height: 540, reducedMotion });
  return sha(JSON.stringify(log));
}

// Pixel-level pin: same t renders identical draw streams.
for (const t of [0.5, 10.0, 123.456, 269.999]) {
  ok('scrub pin identical at t=' + t, renderHash(t, false) === renderHash(t, false));
}
ok('reduced-motion pin identical', renderHash(42.25, true) === renderHash(42.25, true));
// Sensitivity: different times must not collide (else the pin is vacuous).
ok('scrub pin sensitive', renderHash(10.0, false) !== renderHash(11.0, false),
  renderHash(10.0, false).slice(0, 12));
// Validation guards: hostile inputs throw honestly, never TypeError chains.
let threw = false;
try { buildTimeline({ shots: [], acts: [] }); } catch (e) { threw = /non-empty array/.test(e.message); }
ok('empty screenplay throws guarded error', threw);
threw = false;
try { shotAt({ shots: [], total: 0, acts: [] }, 5); } catch (e) { threw = /non-empty array/.test(e.message); }
ok('shotAt on empty timeline throws guarded error', threw);
ok('captionAt(null) returns null', captionAt(null, 1) === null);
ok('captionAt shot without captions returns null', captionAt({ id: 'x' }, 5) === null);
ok('formatTime(NaN) clamps', formatTime(NaN) === '0:00');
threw = false;
try { motifFor({ motif: 'typo-cue' }); } catch (e) { threw = /unknown motif/.test(e.message); }
ok('unknown motif throws (no silent fallback)', threw);

// Committed repeat-manifest check: the pipeline is byte-identical run to run.
execFileSync('node', [join(root, 'tools/render.mjs')], { stdio: 'pipe' });
const first = readFileSync(join(root, 'dist/manifest.json'));
const firstStills = readFileSync(join(root, 'dist/stills/act-1.svg'));
execFileSync('node', [join(root, 'tools/render.mjs')], { stdio: 'pipe' });
const second = readFileSync(join(root, 'dist/manifest.json'));
const secondStills = readFileSync(join(root, 'dist/stills/act-1.svg'));
ok('repeat manifest byte-identical', first.equals(second), sha(first.toString()).slice(0, 12));
ok('repeat still byte-identical', firstStills.equals(secondStills));

if (failures) { console.error('DETERMINISM RED: ' + failures + ' failures'); process.exit(1); }
console.log('DETERMINISM GREEN');
