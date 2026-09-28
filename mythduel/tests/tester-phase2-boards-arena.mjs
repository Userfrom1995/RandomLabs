// Mythduel Phase 2 tester regression suite (Tester, Phase 2, Refs #470).
//
// Live-behavior pins for boards / arena / animatic cut, complementary to the
// Builder's phase2-animatic suite: drives the real shipped entrypoints
// (stillsManifest, captureCards, capturePlates, paintArena) headless with a
// recording stub canvas, pins theatre wiring (stage + beatMenu + gallery),
// and red-teams corrupt beats, palettes, and off-lattice shots. Pure node,
// no network, no wall-clock: exits 0 green, 1 red with the failing assertion
// named.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, beatAt } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { paintArena, compositionFor, arenaGrade } from '../engine/arena.js';
import { captureCards, capturePlates, facetChecksum } from '../tools/capture.mjs';
import { stillsManifest } from '../tools/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' - ' + detail : ''));
  if (!ok) failed++;
};

const duel = JSON.parse(readFileSync(join(root, 'story/duel.json'), 'utf8'));
const board = JSON.parse(readFileSync(join(root, 'story/storyboard.json'), 'utf8'));
const trailer = JSON.parse(readFileSync(join(root, 'story/trailer.json'), 'utf8'));
const tl = buildTimeline(duel);

// 1. Shipped manifest agrees with storyboard + trailer sources.
{
  const m = stillsManifest();
  check('manifest covers 8 panels', m.stills.length === 8, String(m.stills.length));
  check('manifest heroTimes match storyboard', m.stills.every((s, i) => s.heroTime === board.panels[i].heroTime));
  check('manifest trailer total is 30s', m.trailerTotal === 30, String(m.trailerTotal));
  check('manifest plates cover 3 grades', m.plates.length === 3);
}

// 2. Capture cards: hero frames lattice-bound, inside their beats, captioned.
{
  const cards = captureCards();
  check('8 hero cards', cards.length === 8, String(cards.length));
  let latticeOk = true;
  let beatOk = true;
  for (const c of cards) {
    if (frameTime(c.heroTime) !== c.heroTime) latticeOk = false;
    const { beat } = beatAt(tl, c.heroTime);
    if (beat.id !== c.beat) beatOk = false;
  }
  check('heroTimes on 24fps lattice', latticeOk);
  check('heroTimes resolve inside their beats', beatOk);
  // Hero frames may land in silent action gaps by design; the invariant is
  // the renderer always gets a deterministic string, never null/undefined.
  check('hero cards always resolve a caption string',
    cards.every((c) => typeof c.caption === 'string' && c.caption.length > 0));
  check('hero cards name speakers or mark silence explicitly',
    cards.every((c) => c.caption.includes(': ') || c.caption === '(no caption)'));
}

// 3. paintArena runs live headless on every beat x scrub instant with a
// recording stub ctx; call log is byte-stable across runs and bounded.
function recordingCtx(log) {
  const grad = { addColorStop: (...a) => log.push('grad:' + a.join(',')) };
  return new Proxy({}, {
    get: (t, p) => {
      if (p === 'canvas') return undefined;
      if (typeof p === 'string' && p.startsWith('create')) return (...a) => { log.push(String(p)); return grad; };
      return (...a) => { log.push(String(p)); };
    },
  });
}
{
  const instants = [0, 0.5, 0.9917];
  const run = () => {
    const log = [];
    const ctx = recordingCtx(log);
    let calls = 0;
    for (const b of tl.beats) {
      const panel = board.panels.find((p) => p.beat === b.id);
      for (const f of instants) {
        const t = frameTime(b.start + b.dur * f);
        paintArena(ctx, tl.seed, t, b, panel.palette);
        calls++;
      }
    }
    return { log: JSON.stringify(log), calls };
  };
  const a = run();
  const b = run();
  const count = (s, re) => (s.match(re) || []).length;
  check('paintArena 24 headless runs', a.calls === 24, String(a.calls));
  check('paintArena call log deterministic', a.log === b.log);
  // ~550 stub-ctx calls per beat-run (facets, foam, grain, washes); the
  // binding primitive budget (<400/frame worst case) is pinned by the
  // Builder's phase2 suite, here we pin the headless call volume is stable
  // and bounded so a regression cannot silently 10x the paint cost.
  const entries = a.log.split(',').length;
  check('paintArena call volume bounded', entries < 20000, String(entries));
  check('paintArena paints sky+ridge gradients each run', count(a.log, /createLinearGradient/g) === 96, String(count(a.log, /createLinearGradient/g)));
  check('paintArena paints vignette each run', count(a.log, /createRadialGradient/g) === 24);
}

// 4. Arena grades: every beat maps to a named grade; NaN fails safe to calm.
{
  const grades = new Set(tl.beats.map((b) => arenaGrade(b.storm).grade));
  check('beats span 5 grades', grades.size === 5, [...grades].join(','));
  check('NaN storm fails safe to calm', arenaGrade(NaN).grade === 'calm');
  let threw = false;
  try { compositionFor('b99'); } catch { threw = true; }
  check('unknown beat composition throws', threw);
}

// 5. Hostile: corrupt beat / palette / ctx fail closed (throw, never hang).
{
  const panel = board.panels[0];
  const b = tl.beats[0];
  const ctx = recordingCtx([]);
  for (const [label, beat, palette] of [
    ['unknown-beat', { ...b, id: 'b99' }, panel.palette],
    ['null-palette', b, null],
    ['empty-palette', b, {}],
  ]) {
    let threw = false;
    try { paintArena(ctx, tl.seed, 1, beat, palette); } catch { threw = true; }
    check('paintArena fails closed (' + label + ')', threw);
  }
  let threw = false;
  try { paintArena(null, tl.seed, 1, b, panel.palette); } catch { threw = true; }
  check('paintArena fails closed (null ctx)', threw);
}

// 6. Plates: checksums stable across runs and distinct per grade beat.
{
  const p1 = capturePlates();
  const p2 = capturePlates();
  check('plate checksums stable', JSON.stringify(p1) === JSON.stringify(p2));
  check('plate checksums distinct', new Set(p1.map((p) => p.checksum)).size === 3);
  check('plate checksum helper stable', facetChecksum(tl.seed, 'b01') === facetChecksum(tl.seed, 'b01'));
}

// 7. Trailer skeleton: exactly 30 s, ordered, non-overlapping, inside beats.
{
  const total = trailer.cuts.reduce((s, c) => s + (c.tOut - c.tIn), 0);
  check('trailer total exactly 30s', total === 30, String(total));
  let ordered = true;
  for (let i = 1; i < trailer.cuts.length; i++) {
    if (!(trailer.cuts[i].tIn >= trailer.cuts[i - 1].tOut)) ordered = false;
  }
  check('trailer cuts ordered non-overlapping', ordered);
  let inside = true;
  for (const c of trailer.cuts) {
    try {
      const a = beatAt(tl, frameTime(c.tIn));
      const e = beatAt(tl, frameTime(c.tOut - 0.001));
      if (!a.beat || !e.beat) inside = false;
    } catch { inside = false; }
  }
  check('trailer cuts inside duel range', inside);
}

// 8. Theatre wiring: stage, transport, beat menu, gallery, and arena import.
{
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  for (const id of ['id="stage"', 'id="beatMenu"', 'id="galleryGrid"', 'id="seek"', 'id="captionLine"']) {
    check('index wires ' + id, html.includes(id));
  }
  check('index loads player module', html.includes('player/player.js'));
  const player = readFileSync(join(root, 'player/player.js'), 'utf8');
  check('player imports arena engine', player.includes('arena.js') || player.includes('paintArena'));
  const gallery = readFileSync(join(root, 'player/gallery.js'), 'utf8');
  check('gallery reads panel shots', gallery.includes('shots'));
}

console.log(failed === 0 ? 'TESTER PHASE2 GREEN' : 'TESTER PHASE2 RED: ' + failed + ' failures');
process.exit(failed === 0 ? 0 : 1);
