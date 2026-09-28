// Mythduel arena: the painted storm-crag in four deterministic passes.
//
// Pass order is craft order, biggest masses first so the composition reads at
// 390 px widths: (1) composition sketch - authored horizon, cliff masses, sea
// band, fighter ground per beat; (2) wash layers - sky/sea/rock washes derived
// from the storyboard palette and darkened by the storm grade; (3) detail pass
// - seeded rock facets, pale marble veins east, dark strata west, surf foam;
// (4) atmosphere pass - rain walls scaled by storm, mist bands, vignette, and
// the skyburst lightning fork over the one beat that earns it.
//
// Scrub-exact by construction: every time-varying value is keyed on the
// quantized frame time (or its 12 fps boil slot), and every random value comes
// from seeded substreams. No wall-clock, no Math.random anywhere. The pure
// data functions (grade, composition, washes, facet tables, budgets) run
// headless in node so the audit pins them; paintArena takes a canvas 2d
// context and paints the same values the audit verified.
import { substream } from './rng.js';
import { boilSlot } from './ink.js';

export const STAGE_W = 960;
export const STAGE_H = 540;

// Storm grade per storm level 0-4. Every beat maps to exactly one grade.
export const ARENA_GRADES = ['calm', 'ranging', 'charged', 'breaking', 'skyburst'];

// Per-frame primitive budgets (honest 390 px budgets): the paint path never
// draws more than these per frame, so the arena stays cheap on small screens
// and the composition carries the read, not fine detail.
export const ARENA_BUDGETS = {
  washLayers: 6,
  facetsPerRidge: 30,
  ridges: 3,
  marbleVeins: 8,
  strataLines: 6,
  foamFlecks: 24,
  rainPerStorm: 40,
  rainMax: 160,
  mistBands: 3,
  sprayPerStorm: 12,
};

// Authored composition per beat: horizon line, western sea-cliff rise, eastern
// pale-marble rise, sea band top, and fighter ground, all in stage px. Wide
// framings sit the horizon high and the masses low; tight framings push the
// ground up so the fighters fill the frame. Values are authored, not hashed,
// so the art direction is reviewable beat by beat.
export const ARENA_COMPOSITION = {
  b01: { horizon: 300, westRise: 120, eastRise: 90, seaTop: 330, ground: 452, note: 'wide vista: small figures between two shores' },
  b02: { horizon: 310, westRise: 110, eastRise: 100, seaTop: 340, ground: 446, note: 'medium wide: circling room, both marks visible' },
  b03: { horizon: 320, westRise: 130, eastRise: 110, seaTop: 350, ground: 440, note: 'medium: crag closes in for the first exchange' },
  b04: { horizon: 290, westRise: 100, eastRise: 85, seaTop: 322, ground: 452, note: 'wide: open sky for the thrown weapons' },
  b05: { horizon: 330, westRise: 150, eastRise: 130, seaTop: 360, ground: 434, note: 'medium-close: rock crowds the clinch' },
  b06: { horizon: 260, westRise: 90, eastRise: 80, seaTop: 300, ground: 458, note: 'extreme wide: sky dominates, figures back to back' },
  b07: { horizon: 330, westRise: 140, eastRise: 120, seaTop: 360, ground: 438, note: 'close two-shot: ground high, faces carry it' },
  b08: { horizon: 280, westRise: 110, eastRise: 95, seaTop: 315, ground: 452, note: 'vast wide: freed sky, figures walk to their marks' },
};

export function arenaGrade(storm) {
  const s = Number.isFinite(storm) ? Math.min(Math.max(Math.round(storm), 0), 4) : 0;
  return { storm: s, grade: ARENA_GRADES[s] };
}

export function compositionFor(beatId) {
  const c = ARENA_COMPOSITION[beatId];
  if (!c) throw new Error('unknown beat for arena composition: ' + beatId);
  return { ...c };
}

// Wash palette for a beat: storyboard sky/wash anchors, darkened by storm so
// the breaking beats feel heavier without repainting the design. Returns css
// colors for skyTop, skyBottom, sea, and three rock washes (far, mid, near).
export function washPalette(panelPalette, storm) {
  if (!panelPalette || typeof panelPalette.sky !== 'string' || typeof panelPalette.wash !== 'string') {
    throw new Error('washPalette needs a panel palette with sky and wash');
  }
  const g = arenaGrade(storm);
  const darken = [1.0, 0.94, 0.86, 0.76, 0.62][g.storm];
  const sky = shade(panelPalette.sky, darken);
  const wash = shade(panelPalette.wash, darken);
  return {
    skyTop: sky,
    skyBottom: wash,
    sea: shade(mix(panelPalette.sky, '#1d2733', 0.55), darken),
    rockFar: shade(mix(panelPalette.wash, '#232b3a', 0.6), darken),
    rockMid: shade(mix(panelPalette.wash, '#171c27', 0.72), darken),
    rockNear: shade(mix('#10141d', panelPalette.wash, 0.12), darken),
    grade: g.grade,
  };
}

// Deterministic facet table for one ridge: n heights in [0, amp]. Stable for
// the same (seed, layerId); the audit pins this headless.
export function facetTable(seed, layerId, n, amp) {
  const count = Math.min(Math.max(Math.floor(n) || 0, 0), ARENA_BUDGETS.facetsPerRidge);
  const rnd = substream(String(seed), 'facet|' + layerId, 0);
  const out = [];
  for (let i = 0; i < count; i++) out.push(rnd() * amp);
  return out;
}

// Deterministic lightning fork for the skyburst beat: seeded polyline from
// skyTop to the crag. Same seed => same fork, every run.
export function skyFork(seed, slot) {
  const rnd = substream(String(seed), 'skyfork', slot);
  const pts = [{ x: 480 + (rnd() - 0.5) * 240, y: 0 }];
  let x = pts[0].x;
  for (let y = 60; y <= 300; y += 60) {
    x += (rnd() - 0.5) * 90;
    pts.push({ x, y });
  }
  return pts;
}

function ridgePath(ctx, facets, yBase, step) {
  ctx.moveTo(0, STAGE_H);
  ctx.lineTo(0, yBase - facets[0]);
  for (let i = 0; i < facets.length; i++) {
    ctx.lineTo(i * step, yBase - facets[i]);
  }
  ctx.lineTo(STAGE_W, STAGE_H);
  ctx.closePath();
}

// Full four-pass paint. ctx is a canvas 2d context; beat carries
// { id, storm, wind }; palette is the storyboard panel palette. t should
// already be frame-quantized; motion shimmer keys on the boil slot so equal t
// paints equal pixels.
export function paintArena(ctx, seed, t, beat, palette) {
  const comp = compositionFor(beat.id);
  const washes = washPalette(palette, beat.storm);
  const g = arenaGrade(beat.storm);
  const slot = boilSlot(t);

  // Pass 1+2: composition sketch blocked in as wash layers, biggest first.
  const skyGrad = ctx.createLinearGradient(0, 0, 0, comp.horizon + 60);
  skyGrad.addColorStop(0, washes.skyTop);
  skyGrad.addColorStop(1, washes.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, STAGE_W, comp.horizon + 60);

  // Sea band between horizon and rock.
  ctx.fillStyle = washes.sea;
  ctx.fillRect(0, comp.horizon, STAGE_W, Math.max(0, comp.seaTop - comp.horizon));

  // Surf foam flecks along the horizon line, capped by budget.
  const foamRnd = substream(String(seed), 'foam|' + beat.id, slot);
  ctx.save();
  ctx.fillStyle = 'rgba(235,242,248,0.5)';
  const foamN = Math.min(ARENA_BUDGETS.foamFlecks, 24);
  for (let i = 0; i < foamN; i++) {
    const fx = foamRnd() * STAGE_W;
    const fw = 6 + foamRnd() * 22;
    ctx.fillRect(fx, comp.horizon - 1 + foamRnd() * 3, fw, 1.6);
  }
  ctx.restore();

  // Three rock ridges: far (full width), mid (west mass), near (east mass).
  const ridges = [
    { id: 'far', y: comp.seaTop + 70, amp: 26, color: washes.rockFar, step: 32 },
    { id: 'mid', y: comp.ground - 20, amp: 34, color: washes.rockMid, step: 40 },
    { id: 'near', y: comp.ground + 40, amp: 22, color: washes.rockNear, step: 53 },
  ];
  for (const r of ridges) {
    const facets = facetTable(seed, beat.id + '|' + r.id, ARENA_BUDGETS.facetsPerRidge, r.amp);
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ridgePath(ctx, facets, r.y, r.step);
    ctx.fill();
  }

  // Pass 3: detail. Western dark strata, eastern pale marble veins.
  const strataRnd = substream(String(seed), 'strata|' + beat.id, 0);
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 2;
  for (let i = 0; i < ARENA_BUDGETS.strataLines; i++) {
    const y = comp.seaTop + 40 + strataRnd() * (comp.ground - comp.seaTop - 30);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(140, y - 12, 260, y + 12, 400, y - 4);
    ctx.stroke();
  }
  const veinRnd = substream(String(seed), 'vein|' + beat.id, 0);
  ctx.strokeStyle = 'rgba(232,228,216,0.35)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < ARENA_BUDGETS.marbleVeins; i++) {
    const x = 560 + veinRnd() * 380;
    const y0 = comp.seaTop + 30 + veinRnd() * 60;
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x - 18 + veinRnd() * 36, y0 + 60 + veinRnd() * 60);
    ctx.stroke();
  }
  ctx.restore();

  // Pass 4: atmosphere. Rain walls scale with storm; mist bands hug the crag;
  // the skyburst beat earns the lightning fork and impact spray.
  if (g.storm > 0) {
    const rainRnd = substream(String(seed), 'rain|' + beat.id, slot);
    const drops = Math.min(g.storm * ARENA_BUDGETS.rainPerStorm, ARENA_BUDGETS.rainMax);
    ctx.save();
    ctx.strokeStyle = g.storm >= 4 ? 'rgba(220,232,245,0.28)' : 'rgba(220,232,245,0.14)';
    ctx.lineWidth = 1;
    const slant = -6 - (beat.wind && beat.wind.force ? beat.wind.force * 14 : 0);
    for (let i = 0; i < drops; i++) {
      const rx = rainRnd() * STAGE_W;
      const ry = rainRnd() * comp.ground;
      const len = 14 + rainRnd() * 22;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + slant, ry + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  const mistRnd = substream(String(seed), 'mist|' + beat.id, slot);
  ctx.save();
  for (let i = 0; i < ARENA_BUDGETS.mistBands; i++) {
    const my = comp.seaTop + mistRnd() * (comp.ground - comp.seaTop);
    const mh = 10 + mistRnd() * 22;
    const mg = ctx.createLinearGradient(0, my, 0, my + mh);
    mg.addColorStop(0, 'rgba(200,210,224,0)');
    mg.addColorStop(0.5, 'rgba(200,210,224,' + (0.10 + g.storm * 0.02) + ')');
    mg.addColorStop(1, 'rgba(200,210,224,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(0, my, STAGE_W, mh);
  }
  ctx.restore();

  if (g.grade === 'skyburst') {
    const fork = skyFork(seed, slot);
    ctx.save();
    ctx.strokeStyle = 'rgba(240,246,255,0.9)';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = 'rgba(180,210,255,0.9)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(fork[0].x, fork[0].y);
    for (let i = 1; i < fork.length; i++) ctx.lineTo(fork[i].x, fork[i].y);
    ctx.stroke();
    ctx.restore();
    const sprayRnd = substream(String(seed), 'spray|' + beat.id, slot);
    ctx.save();
    ctx.fillStyle = 'rgba(235,242,248,0.7)';
    const sprayN = Math.min(4 * ARENA_BUDGETS.sprayPerStorm, 48);
    for (let i = 0; i < sprayN; i++) {
      const sx = 380 + sprayRnd() * 200;
      const sy = comp.ground - sprayRnd() * 120;
      ctx.fillRect(sx, sy, 2, 2 + sprayRnd() * 5);
    }
    ctx.restore();
  }

  // Vignette last: holds the frame edges at every storm grade.
  const vig = ctx.createRadialGradient(480, 270, 240, 480, 270, 560);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(6,8,14,' + (0.28 + g.storm * 0.05) + ')');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);

  return { grade: g.grade, ground: comp.ground, horizon: comp.horizon };
}

// Hex helpers: mix two hex colors, then scale brightness. Pure and headless.
function hexRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r, g, b) {
  const c = (v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

export function mix(a, b, t) {
  const ca = hexRgb(a);
  const cb = hexRgb(b);
  return toHex(
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  );
}

export function shade(hex, f) {
  const c = hexRgb(hex);
  return toHex(c[0] * f, c[1] * f, c[2] * f);
}
