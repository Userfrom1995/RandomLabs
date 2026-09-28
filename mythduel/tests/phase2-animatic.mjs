// Mythduel Phase 2 animatic suite (Builder, Phase 2, Refs #470).
//
// Headless verification of the boards/arena/animatic cut: arena purity (no
// wall-clock or Math.random in the render path), grade and composition
// coverage, wash/facet/fork determinism, budget honesty, shot lattice and
// hero anchoring, trailer skeleton bounds, plate checksum stability, and
// hostile corrupt-input behavior. Pure node, no network, no wall-clock:
// exits 0 green, 1 red with the failing assertion named.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline } from '../engine/timeline.js';
import {
  arenaGrade, compositionFor, washPalette, facetTable, skyFork, paintArena,
  ARENA_GRADES, ARENA_BUDGETS, ARENA_COMPOSITION, mix, shade,
} from '../engine/arena.js';
import { capturePlates, captureCards, facetChecksum } from '../tools/capture.mjs';
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

// 1. Render-path purity: no wall-clock, no Math.random in engine or player
// (comments stripped first, so prose about determinism cannot trip the scan).
{
  const raw = readFileSync(join(root, 'engine/arena.js'), 'utf8')
    + readFileSync(join(root, 'player/player.js'), 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  check('no Math.random in render path', !src.includes('Math.random'));
  check('no Date.now in render path', !src.includes('Date.now'));
  check('no performance.now in render path', !src.includes('performance.now'));
}

// 2. Grades: 0-4 map to five distinct named grades; hostile input clamps.
check('five grades', new Set([0, 1, 2, 3, 4].map((s) => arenaGrade(s).grade)).size === 5);
check('grade clamps high', arenaGrade(99).grade === 'skyburst');
check('grade clamps low', arenaGrade(-3).grade === 'calm');
check('grade NaN is calm', arenaGrade(NaN).grade === 'calm');
check('beats span all grades', ARENA_GRADES.every((g) => tl.beats.some((b) => arenaGrade(b.storm).grade === g)));

// 3. Composition authored for every beat, fighters above the sea band.
{
  let compOk = Object.keys(ARENA_COMPOSITION).length === 8;
  for (const b of tl.beats) {
    try {
      const c = compositionFor(b.id);
      if (!(c.seaTop < c.ground && c.horizon < c.seaTop && c.ground <= 540)) compOk = false;
    } catch { compOk = false; }
  }
  check('composition sane for all beats', compOk);
  let threw = false;
  try { compositionFor('b99'); } catch { threw = true; }
  check('compositionFor throws on unknown beat', threw);
}

// 4. Determinism: washes, facets, fork stable across calls; seed-sensitive.
{
  const p = board.panels[0].palette;
  check('wash stable', JSON.stringify(washPalette(p, 2)) === JSON.stringify(washPalette(p, 2)));
  check('wash storm-graded', washPalette(p, 0).skyTop !== washPalette(p, 4).skyTop);
  check('facets capped', facetTable('s', 'x', 999, 10).length === ARENA_BUDGETS.facetsPerRidge);
  check('facets seed-sensitive', JSON.stringify(facetTable('s1', 'x', 8, 10)) !== JSON.stringify(facetTable('s2', 'x', 8, 10)));
  check('fork scrub-slotted', JSON.stringify(skyFork('s', 3)) === JSON.stringify(skyFork('s', 3)));
  check('fork slot moves', JSON.stringify(skyFork('s', 3)) !== JSON.stringify(skyFork('s', 4)));
  check('mix/shade sane', mix('#000000', '#ffffff', 0.5) === '#808080' && shade('#ffffff', 0.5) === '#808080');
  let threw = false;
  try { washPalette({}, 2); } catch { threw = true; }
  check('washPalette throws on bad palette', threw);
}

// 5. Budgets honest: per-frame primitive ceiling fits a 390 px phone.
{
  const worst = ARENA_BUDGETS.ridges * ARENA_BUDGETS.facetsPerRidge
    + ARENA_BUDGETS.marbleVeins + ARENA_BUDGETS.strataLines + ARENA_BUDGETS.foamFlecks
    + ARENA_BUDGETS.rainMax + ARENA_BUDGETS.mistBands + 4 * ARENA_BUDGETS.sprayPerStorm;
  check('worst-case primitives under 400', worst < 400, String(worst));
}

// 6. Shots: 24 total, lattice-aligned, inside beats, hero-anchored, voiced known.
{
  let n = 0;
  let ok = true;
  for (const p of board.panels) {
    const beat = tl.beats.find((x) => x.id === p.beat);
    const whos = new Set((beat.captions || []).map((c) => c.who));
    let hero = false;
    for (const s of p.shots) {
      n++;
      if (Math.abs(s.t * 24 - Math.round(s.t * 24)) > 1e-9) ok = false;
      if (!(s.t >= 0 && s.t < beat.dur)) ok = false;
      if (s.voiced != null && !whos.has(s.voiced)) ok = false;
      if (Math.abs((beat.start + s.t) - p.heroTime) < 1e-9) hero = true;
    }
    if (!hero || p.shots.length < 2) ok = false;
  }
  check('24 shots lattice-bound and hero-anchored', n === 24 && ok, n + ' shots');
}

// 7. Boards agree with duel.json entry/exit and cause, panel by panel.
{
  let ok = true;
  for (const p of board.panels) {
    const beat = tl.beats.find((x) => x.id === p.beat);
    if (p.entry.thorPos !== beat.continuity.entry.thor.pos) ok = false;
    if (p.exit.zeusWeapon !== beat.continuity.exit.zeus.weapon) ok = false;
    if (p.cause !== beat.cause) ok = false;
  }
  check('board continuity mirrors duel.json', ok);
}

// 8. Trailer: 7 cuts, 30 s, ordered, lattice, inside beats.
{
  const total = trailer.cuts.reduce((s, c) => s + (c.tOut - c.tIn), 0);
  check('trailer 30s in 25-35 band', trailer.cuts.length === 7 && Math.abs(total - 30) < 1e-9, total + 's');
  let ok = true;
  let last = -1;
  for (const c of trailer.cuts) {
    const beat = tl.beats.find((x) => x.id === c.beat);
    if (!beat || c.tIn < beat.start || c.tOut > beat.end) ok = false;
    if (beat.start < last) ok = false;
    last = beat.start;
  }
  check('trailer cuts ordered and inside beats', ok);
}

// 9. Plates: 3 distinct grades, stable checksums, manifest agrees.
{
  const plates = capturePlates();
  check('3 plates, distinct grades', plates.length === 3 && new Set(plates.map((p) => p.grade)).size === 3);
  check('plate checksums stable', plates.every((p) => p.checksum === facetChecksum(tl.seed, p.beat)));
  const cards = captureCards();
  check('8 hero cards monotonic', cards.length === 8 && cards.every((c, i, a) => i === 0 || c.frameIndex > a[i - 1].frameIndex));
  const m = stillsManifest();
  check('manifest stills+plates+trailer', m.stills.length === 8 && m.plates.length === 3 && Math.abs(m.trailerTotal - 30) < 1e-9);
}

// 10. Paint path executes headless: a stub 2d context proves paintArena runs
// every beat and storm grade without throwing, with stable call counts
// (control-flow determinism) inside the primitive budgets.
{
  const stubCtx = () => {
    const calls = { count: 0 };
    const grad = { addColorStop() { calls.count++; } };
    return new Proxy({ calls }, {
      get(t, k) {
        if (k === 'calls') return t.calls;
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
        if (typeof k === 'string') {
          return (...a) => {
            t.calls.count++;
            if (k === 'measureText') return { width: 0 };
          };
        }
        return undefined;
      },
      set(t, k, v) { t[k] = v; return true; },
    });
  };
  let ok = true;
  let worst = 0;
  for (const b of tl.beats) {
    const panel = board.panels.find((p) => p.beat === b.id);
    for (const t of [b.start, b.start + b.dur / 2, b.end - 0.001]) {
      const ctx = stubCtx();
      let r1 = null;
      let r2 = null;
      try {
        r1 = paintArena(ctx, tl.seed, t, b, panel.palette);
        const n1 = ctx.calls.count;
        worst = Math.max(worst, n1);
        const ctx2 = stubCtx();
        r2 = paintArena(ctx2, tl.seed, t, b, panel.palette);
        if (ctx2.calls.count !== n1) ok = false;
        if (!r1 || r1.grade !== arenaGrade(b.storm).grade || r1.ground !== compositionFor(b.id).ground) ok = false;
        if (JSON.stringify(r1) !== JSON.stringify(r2)) ok = false;
      } catch { ok = false; }
    }
  }
  check('paintArena runs all beats headless', ok);
  check('paint call counts stable and bounded', worst > 0 && worst < 4000, String(worst));
}

if (failed) {
  console.error('PHASE2 RED: ' + failed + ' probe(s) failed');
  process.exit(1);
}
console.log('PHASE2 GREEN: boards, arena, and animatic cut verify headless');
