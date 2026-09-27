// Hearthlight tester stage-hostile suite (Tester, Phase 2: Human Character Animation Craft).
// Run: node film/tests/tester-phase2-stage-hostile.mjs - exit non-zero on failure.
// Locks in the round-3 re-gate findings at the rigs/stage level (above the
// engine-unit gates in craft-humans): drawYara must thread pose.knot into a
// real render delta (the dropped-beat defect class), the full-stage renderer
// must survive hostile seek times with finite draw ops, and the shipped
// capture/render artifacts must be present with full coverage.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import { drawYara, poseFor } from '../engine/rigs.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!cond) failures++;
};

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

const sp = JSON.parse(readFileSync(join(root, 'story/screenplay.json'), 'utf8'));
const tl = buildTimeline(sp);

// 1. drawYara threads pose.knot into the render (rigs-level dropped-beat guard).
{
  const y0 = makeRecorder();
  drawYara(y0.ctx, {}, 100, 200, 120, { knot: 0, blink: 1 }, { x: 0, y: 0 }, 1.2);
  const y1 = makeRecorder();
  drawYara(y1.ctx, {}, 100, 200, 120, { knot: 1, blink: 1 }, { x: 0, y: 0 }, 1.2);
  const l0 = JSON.stringify(y0.log);
  const l1 = JSON.stringify(y1.log);
  ok('drawYara knot-0 vs knot-1 render delta', l0 !== l1, y0.log.length + ' vs ' + y1.log.length + ' ops');
  ok('drawYara knot draws storm-ribbon', l1.includes('#4a6a9a'));
  // the timeline pose value from the farewell beat must survive to the stage
  const s06 = tl.shots.find((s) => s.id === 's06');
  if (s06) {
    const mid = poseFor(s06, 0.5, s06.dur / 2);
    ok('s06 pose carries nonzero knot', (mid.yara.knot || 0) > 0, String(mid.yara.knot));
  } else {
    ok('s06 pose carries nonzero knot', false, 's06 missing from timeline');
  }
}

// 2. hostile seek times never crash the stage and emit only finite draw ops.
{
  const isFiniteOp = (log) => !log.some((e) => e.some((v) => v === 'NaN' || v === 'Infinity' || v === '-Infinity'));
  for (const t of [-5, NaN, Infinity, -Infinity, 1e9, tl.dur + 100]) {
    let crashed = null;
    let finite = false;
    let ops = 0;
    try {
      const { ctx, log } = makeRecorder();
      renderAnimatic(ctx, tl, t, { width: 960, height: 540 });
      ops = log.length;
      finite = isFiniteOp(log);
    } catch (e) { crashed = e.message; }
    ok('stage survives t=' + String(t), crashed === null && finite && ops > 0,
      crashed ? 'threw: ' + crashed : ops + ' ops' + (finite ? '' : ' NON-FINITE'));
  }
}

// 3. shipped artifacts from the live entrypoints are present with full coverage.
{
  const heroesPath = join(root, 'dist/capture/heroes.json');
  const facesPath = join(root, 'dist/capture/faces.json');
  const manifestPath = join(root, 'dist/manifest.json');
  ok('capture heroes artifact present', existsSync(heroesPath));
  ok('capture faces artifact present', existsSync(facesPath));
  ok('render manifest present', existsSync(manifestPath));
  if (existsSync(heroesPath)) {
    const heroes = JSON.parse(readFileSync(heroesPath, 'utf8'));
    const n = heroes.frames ? Object.keys(heroes.frames).length : 0;
    ok('capture covers 20 hero frames', n === 20, n + '/20');
  }
  if (existsSync(facesPath)) {
    const faces = JSON.parse(readFileSync(facesPath, 'utf8'));
    const n = faces.frames ? Object.keys(faces.frames).length : 0;
    ok('capture covers 18 face cards', n === 18, n + '/18');
  }
  if (existsSync(manifestPath)) {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const n = m.files ? Object.keys(m.files).length : 0;
    ok('render manifest lists files', n > 0, n + ' files');
  }
}

if (failures) { console.error('TESTER-PHASE2-STAGE-HOSTILE RED: ' + failures + ' failures'); process.exit(1); }
console.log('TESTER-PHASE2-STAGE-HOSTILE GREEN');
