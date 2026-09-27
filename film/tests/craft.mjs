// Hearthlight craft tests (Builder, Phase 2: Hand-Drawn Render Craft).
// Run: node film/tests/craft.mjs - exit non-zero on any failure.
// Gates: paint set covers every screenplay background, camera grammar
// covers every declared move, rig poses stay in eased bounds, ink boil is
// deterministic, the capture loop is byte-identical, the gallery is wired.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import { renderAnimatic } from '../engine/animatic.js';
import { boilJitter, boilJitterSlow, inkStroke } from '../engine/ink.js';
import { PAINTED_BACKGROUNDS } from '../engine/backgrounds.js';
import { easeInOut, clamp01, beat, poseFor } from '../engine/rigs.js';

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

// paint set covers every background the screenplay declares
const usedBgs = [...new Set(tl.shots.map((s) => s.bg))].sort();
ok('paint set covers all screenplay bgs',
  usedBgs.every((b) => PAINTED_BACKGROUNDS.includes(b)),
  usedBgs.join(','));
ok('paint set has no orphans',
  PAINTED_BACKGROUNDS.every((b) => usedBgs.includes(b)),
  PAINTED_BACKGROUNDS.length + ' painters');

// every declared camera move renders without throwing (full grammar cover)
const moves = [...new Set(tl.shots.map((s) => s.camera.move))];
let movesOk = true;
for (const s of tl.shots) {
  try {
    const { ctx } = makeRecorder();
    renderAnimatic(ctx, tl, s.start + s.dur / 2, { width: 960, height: 540 });
  } catch { movesOk = false; }
}
ok('camera grammar renders every move', movesOk, moves.join(','));
ok('drift/hold/orbit moves exist', ['drift', 'hold', 'orbit'].every((m) => moves.includes(m)));

// rig poses: eased, bounded, acting beats where the screenplay needs them
ok('easeInOut pins', easeInOut(0) === 0 && easeInOut(1) === 1 && easeInOut(0.5) === 0.5);
ok('easeInOut eases (not linear)', easeInOut(0.25) < 0.25 && easeInOut(0.75) > 0.75);
ok('beat peaks at centre', beat(0.65, 0.65, 0.09) === 1 && beat(0.2, 0.65, 0.09) < 0.01);
ok('clamp01 clamps', clamp01(-2) === 0 && clamp01(5) === 1 && clamp01(0.4) === 0.4);
let posesOk = true;
for (const s of tl.shots) {
  const pose = poseFor(s, 0.5, s.dur / 2);
  for (const v of [pose.nia.stride, pose.nia.kneel, pose.nia.stillness, pose.nia.flame, pose.yara.knot, pose.ruel.wag, pose.ruel.wake]) {
    if (!Number.isFinite(v) || v < -0.51 || v > 1.51) posesOk = false;
  }
}
ok('poses bounded on all shots', posesOk);
const s14 = tl.shots.find((s) => s.id === 's14');
ok('s14 fear is stillness (no stride)', poseFor(s14, 0.5, 6).nia.stillness === 1 && poseFor(s14, 0.5, 6).nia.stride === 0);
const s17 = tl.shots.find((s) => s.id === 's17');
ok('s17 kneel+flame ramp eased', poseFor(s17, 0.1, 1).nia.kneel < poseFor(s17, 0.9, 11).nia.kneel);
const s11 = tl.shots.find((s) => s.id === 's11');
ok('s11 tail wags once', poseFor(s11, 0.65, 9).ruel.wag > 0.9 && poseFor(s11, 0.1, 1).ruel.wag < 0.01);

// ink: boil deterministic per slot, dead still under reduced motion
const j1 = boilJitter('20260927', 's01', 1.05, false, 2);
const j2 = boilJitter('20260927', 's01', 1.05, false, 2);
ok('boil deterministic in-slot', j1.x === j2.x && j1.y === j2.y);
const j3 = boilJitter('20260927', 's01', 1.2, false, 2);
ok('boil advances across slots', j1.x !== j3.x || j1.y !== j3.y);
ok('boil still under reduced motion',
  boilJitter('20260927', 's01', 1.05, true, 2).x === 0 &&
  boilJitterSlow('20260927', 's05', 3.3, true, 2).y === 0);
const slow1 = boilJitterSlow('20260927', 's05', 1.05, false, 2);
const slow2 = boilJitterSlow('20260927', 's05', 1.14, false, 2);
ok('slow boil half-rate (Yara stillness)', slow1.x === slow2.x && slow1.y === slow2.y);
// inkStroke double-pass lays two strokes per path
{
  const { ctx, log } = makeRecorder();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 10);
  inkStroke(ctx, '#111', 2, { x: 0.3, y: -0.2 });
  ok('inkStroke double-pass', log.filter((e) => e[0] === 'stroke').length === 2);
}

// capture loop reproducible from committed sources only
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const first = readFileSync(join(root, 'dist/capture/heroes.json'));
execFileSync('node', [join(root, 'tools/capture.mjs')], { stdio: 'pipe' });
const second = readFileSync(join(root, 'dist/capture/heroes.json'));
ok('capture byte-identical run to run', first.equals(second));
const heroes = JSON.parse(first.toString());
ok('capture covers all 20 shots', Object.keys(heroes.frames).length === 20);
const hashes = new Set(Object.values(heroes.frames).map((f) => f.hash));
ok('capture hashes sensitive (shots differ)', hashes.size > 15, hashes.size + '/20 unique');

// gallery wired: live engine-painted stills, honest empty state, transport link
const html = readFileSync(join(root, 'index.html'), 'utf8');
ok('gallery section present', html.includes('id="galleryGrid"') && html.includes('id="galleryNote"'));
const gallery = readFileSync(join(root, 'player/gallery.js'), 'utf8');
ok('gallery paints via engine', gallery.includes('renderAnimatic') && gallery.includes('paintGallery'));
ok('gallery hides honestly on failure', gallery.includes('could not be painted'));
const player = readFileSync(join(root, 'player/player.js'), 'utf8');
ok('player paints gallery after load', player.includes('paintGallery(state.tl'));

// no em dashes in Phase 2 sources
const sources = ['index.html', 'player/player.js', 'player/gallery.js', 'player/player.css',
  'engine/animatic.js', 'engine/ink.js', 'engine/paper.js', 'engine/backgrounds.js',
  'engine/rigs.js', 'tools/capture.mjs', 'tests/craft.mjs', 'tools/audit.mjs'];
const dashy = sources.filter((f) => readFileSync(join(root, f), 'utf8').includes('\u2014'));
ok('no em dashes', dashy.length === 0, dashy.join(','));

if (failures) { console.error('CRAFT RED: ' + failures + ' failures'); process.exit(1); }
console.log('CRAFT GREEN');
