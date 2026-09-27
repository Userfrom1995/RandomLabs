// Hearthlight valley paint set: one painter per screenplay background.
//
// Every location is painted in four honest passes, all from seeded
// substreams (no images, no tracing; every mark is a stroked vector path
// with hand-inked weight):
//   1. composition sketch (COMPOSITION table: horizon line, focal mass x,
//      light source x per location; identical at every render width),
//   2. three wash layers (sky deep/body/lift via paintSky, plus a fore
//      wash over the ground from the body stream),
//   3. detail pass (foliage clusters, rock facets, water reflections,
//      interior props; stroke counts scale down honestly at narrow widths
//      through detailCountFor, never blurred),
//   4. atmosphere pass (mist, ember-light falloff, storm murk, dawn bloom,
//      night hush, grove gloom, hearth glow).
//
// Contract: paintBackground(ctx, seed, shot, W, H, t, p) paints the full
// world behind the cast. Pure function of its arguments; stream ids are
// stable per shot so the boil shimmers in motion yet pins when scrubbed.
// Returns { windK, groundY, waterY, hearth }: wind carries the cloth and
// hair drivers, groundY stages the cast, waterY anchors the gorge spray,
// hearth anchors the house sparks. waterY/hearth are null off their
// locations; callers must tolerate that.
import { substream } from './rng.js';
import { inkStroke } from './ink.js';
import { boilSlot } from './ink.js';
import { paintSky, drawFibres, washPass } from './paper.js';

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, k) {
  const A = hex(a); const B = hex(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')';
}

// Composition sketch per location: horizonK (ground line as a fraction of
// frame height), focal (x fraction of the story mass the eye should land
// on), light (x fraction of the key light source). Width-independent: the
// same valley stages at 960 px and at 390 px.
export const COMPOSITION = {
  'hollow-dusk': { horizon: 0.72, focal: 0.5, light: 0.82, atmo: 'ember-falloff' },
  'hill-top': { horizon: 0.72, focal: 0.7, light: 0.15, atmo: 'ember-falloff' },
  'chart-table': { horizon: 0.98, focal: 0.5, light: 0.5, atmo: 'none' },
  'hollow-night': { horizon: 0.72, focal: 0.5, light: 0.2, atmo: 'night-hush' },
  'yara-house': { horizon: 0.8, focal: 0.62, light: 0.62, atmo: 'hearth-glow' },
  'threshold': { horizon: 0.8, focal: 0.5, light: 0.5, atmo: 'night-hush' },
  'low-valley': { horizon: 0.72, focal: 0.4, light: 0.7, atmo: 'ember-falloff' },
  'moss-grove': { horizon: 0.72, focal: 0.5, light: 0.5, atmo: 'grove-gloom' },
  'gorge-bridge': { horizon: 0.72, focal: 0.5, light: 0.5, atmo: 'storm-murk' },
  'storm-slope': { horizon: 0.72, focal: 0.62, light: 0.3, atmo: 'storm-murk' },
  'cairn-approach': { horizon: 0.72, focal: 0.5, light: 0.38, atmo: 'night-hush' },
  'cairn-top': { horizon: 0.72, focal: 0.5, light: 0.5, atmo: 'ember-falloff' },
  'valley-dawn': { horizon: 0.72, focal: 0.5, light: 0.5, atmo: 'dawn-bloom' },
  'hollow-dawn': { horizon: 0.72, focal: 0.5, light: 0.5, atmo: 'dawn-bloom' },
};

export function compositionFor(bg) {
  const c = COMPOSITION[bg];
  if (!c) throw new Error('no composition for background ' + bg);
  return { ...c };
}

// The three wash layers: deep, body, lift. Each owns a stable substream so
// pigment breakup differs per layer but pins per shot.
export const WASH_LAYERS = ['deep', 'body', 'lift'];

export function washLayersFor(bg) {
  compositionFor(bg);
  return WASH_LAYERS.map((layer) => ({ layer, stream: 'wash-' + layer + '|{shot}' }));
}

// Detail density per location at full width, scaled honestly for narrow
// frames: fewer strokes, same composition (ridge geometry and focal masses
// never move). Floor of 12 keeps every plate alive at 390 px.
const DETAIL_BASE = {
  'hollow-dusk': 60, 'hill-top': 55, 'chart-table': 45, 'hollow-night': 40,
  'yara-house': 70, 'threshold': 45, 'low-valley': 60, 'moss-grove': 75,
  'gorge-bridge': 65, 'storm-slope': 30, 'cairn-approach': 55, 'cairn-top': 50,
  'valley-dawn': 60, 'hollow-dawn': 55,
};

export function detailCountFor(bg, W) {
  const base = DETAIL_BASE[bg];
  if (!base) throw new Error('no detail budget for background ' + bg);
  const w = Number(W);
  if (!Number.isFinite(w) || w <= 0) throw new Error('bad width for detail budget: ' + W);
  const k = w >= 700 ? 1 : Math.max(0.45, w / 960);
  return Math.max(12, Math.round(base * k));
}

function ridgeLine(ctx, rng, pal, W, H, yBase, amp, boil, width) {
  const peaks = [];
  for (let x = 0; x <= W + 10; x += W / 12) {
    peaks.push(yBase + (rng() - 0.5) * amp);
  }
  ctx.beginPath();
  ctx.moveTo(-10, peaks[0]);
  for (let i = 0; i < peaks.length; i++) {
    ctx.lineTo(i * (W / 12) - 10, peaks[i]);
  }
  ctx.lineTo(W + 10, H + 10);
  ctx.lineTo(-10, H + 10);
  ctx.closePath();
  ctx.fillStyle = mix(pal.sky, '#101018', 0.45);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, peaks[0]);
  for (let i = 0; i < peaks.length; i++) {
    ctx.lineTo(i * (W / 12) - 10, peaks[i]);
  }
  inkStroke(ctx, pal.ink, width, boil, 0.3);
}

function mistBand(ctx, rng, pal, W, y, h, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = mix(pal.sky, '#f2e8d5', 0.5);
  for (let i = 0; i < 5; i++) {
    const w = W * (0.2 + rng() * 0.3);
    const x = rng() * W - w / 2;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + (rng() - 0.5) * h, w / 2, h * (0.3 + rng() * 0.3), 0, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function lanternRow(ctx, rng, pal, W, H, hy, count, litFrac, t) {
  for (let i = 0; i < count; i++) {
    const x = (W * (i + 0.5)) / count + (rng() - 0.5) * W * 0.03;
    const y = hy - H * 0.02 - rng() * H * 0.05;
    const lit = rng() < litFrac;
    if (lit) {
      const flick = 0.85 + 0.15 * Math.sin(t * 3 + i * 1.7);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
      g.addColorStop(0, pal.lantern);
      g.addColorStop(1, 'rgba(255,180,77,0)');
      ctx.globalAlpha = 0.5 * flick;
      ctx.fillStyle = g;
      ctx.fillRect(x - 26, y - 26, 52, 52);
      ctx.globalAlpha = 1;
      ctx.fillStyle = pal.lantern;
    } else {
      ctx.fillStyle = mix(pal.ink, pal.sky, 0.3);
    }
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, hy + H * 0.1); ctx.stroke();
  }
}

function reedTufts(ctx, rng, pal, W, gy, count, windK, boil) {
  for (let i = 0; i < count; i++) {
    const x = rng() * W; const h = 14 + rng() * 26;
    const bend = windK * 22 + (rng() - 0.5) * 6;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.quadraticCurveTo(x + bend * 0.4, gy - h * 0.7, x + bend, gy - h);
    inkStroke(ctx, pal.ink, 1.6, boil, 0.25);
    ctx.beginPath();
    ctx.moveTo(x + bend, gy - h);
    ctx.lineTo(x + bend + 5, gy - h + 3);
    ctx.strokeStyle = mix(pal.wash, pal.ink, 0.4);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function ground(ctx, pal, W, H, horizonK, boil) {
  const hy = H * horizonK;
  ctx.fillStyle = mix(pal.sky, '#101018', 0.45);
  ctx.fillRect(0, hy, W, H - hy);
  ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy);
  inkStroke(ctx, pal.ink, Math.max(1, W / 640), boil, 0.3);
  return hy;
}

// Foliage clusters: canopy blob with an ink rim plus inner leaf ticks.
// count is the width-scaled detail budget share for this feature.
function foliageClusters(ctx, rng, pal, W, H, gy, count, boil, leaf) {
  for (let i = 0; i < count; i++) {
    const cx = rng() * W;
    const cy = gy - rng() * H * 0.22;
    const r = (10 + rng() * 26) * (W / 960 + 0.5) / 1.5;
    ctx.fillStyle = mix(pal.wash, '#2c3a24', 0.45 + rng() * 0.2);
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, 7);
    inkStroke(ctx, pal.ink, 1.2, boil, 0.25);
    ctx.strokeStyle = leaf || '#5a7048';
    ctx.lineWidth = 1.1;
    for (let k = 0; k < 3; k++) {
      const lx = cx + (rng() - 0.5) * r;
      const ly = cy + (rng() - 0.5) * r * 0.6;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 5, ly - 6); ctx.stroke();
    }
  }
}

// Rock facets: split triangles, lit face against shade face, ink seams.
function rockFacets(ctx, rng, pal, cx, cy, size, count, boil) {
  for (let i = 0; i < count; i++) {
    const x = cx + (rng() - 0.5) * size * 2;
    const y = cy + (rng() - 0.5) * size;
    const s = size * (0.08 + rng() * 0.14);
    const a = rng() * Math.PI;
    const x2 = x + Math.cos(a) * s; const y2 = y + Math.sin(a) * s * 0.6;
    const x3 = x + Math.cos(a + 2.1) * s; const y3 = y + Math.sin(a + 2.1) * s * 0.6;
    ctx.fillStyle = rng() < 0.5 ? mix(pal.ink, pal.sky, 0.55) : mix(pal.ink, pal.sky, 0.3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
    inkStroke(ctx, pal.ink, 1.1, boil, 0.25);
  }
}

// Water reflections: light horizontal shimmer strokes under the water line,
// drifting deterministically with t (scrub-exact, same frame same marks).
function waterReflections(ctx, rng, pal, W, waterY, H, count, t) {
  ctx.strokeStyle = 'rgba(220,235,245,0.55)';
  ctx.lineWidth = 1.3;
  for (let i = 0; i < count; i++) {
    const x = rng() * W;
    const y = waterY + rng() * (H - waterY) * 0.9;
    const len = 8 + rng() * 22;
    const drift = Math.sin(t * 2 + i * 1.3) * 4;
    ctx.globalAlpha = 0.3 + rng() * 0.3;
    ctx.beginPath(); ctx.moveTo(x + drift, y); ctx.lineTo(x + drift + len, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Fern fronds and hanging moss for the grove floor and trunks.
function fernFronds(ctx, rng, pal, W, gy, count, boil) {
  ctx.strokeStyle = '#5a7048';
  for (let i = 0; i < count; i++) {
    const x = rng() * W;
    const h = 12 + rng() * 30;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.quadraticCurveTo(x + 8, gy - h * 0.6, x + 18, gy - h);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) {
      const fy = gy - (h * k) / 5;
      const fx = x + (18 * k) / 5;
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 6, fy - 4); ctx.stroke();
    }
  }
  void boil;
}

// Distant bird ticks for the dawn skies: two-stroke marks, never blobs.
function dawnBirds(ctx, rng, pal, W, H, count) {
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < count; i++) {
    const x = rng() * W; const y = H * (0.15 + rng() * 0.25);
    const s = 4 + rng() * 5;
    ctx.beginPath();
    ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s / 2, y - 3, x, y);
    ctx.quadraticCurveTo(x + s / 2, y - 3, x + s, y);
    ctx.stroke();
  }
}

function paintChartTable(ctx, seed, shot, pal, W, H, boil, detail) {
  ctx.fillStyle = mix(pal.sky, '#101018', 0.25);
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 2;
  ctx.strokeRect(W * 0.14, H * 0.1, W * 0.72, H * 0.8);
  const crng = substream(seed, 'chart|' + shot.id, 1);
  for (let i = 0; i < 11; i++) {
    const y0 = H * (0.16 + crng() * 0.68);
    ctx.beginPath(); ctx.moveTo(W * 0.18, y0);
    ctx.bezierCurveTo(W * 0.4, y0 - 30, W * 0.55, y0 + 40, W * 0.66, H * 0.32);
    ctx.stroke();
  }
  ctx.fillStyle = '#a03a2a';
  ctx.beginPath(); ctx.arc(W * 0.66, H * 0.32, 9, 0, 7); ctx.fill();
  ctx.fillStyle = pal.ink;
  ctx.font = (H * 0.045) + 'px serif';
  ctx.fillText('the high cairn', W * 0.68, H * 0.32);
  // Chart detail pass: compass rose, rhumb lines, margin ticks, stain ring.
  const drng = substream(seed, 'chart-detail|' + shot.id, 1);
  const roseX = W * 0.24; const roseY = H * 0.72; const roseR = H * 0.07;
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const len = roseR * (k % 2 === 0 ? 1 : 0.55);
    ctx.beginPath(); ctx.moveTo(roseX, roseY);
    ctx.lineTo(roseX + Math.cos(a) * len, roseY + Math.sin(a) * len); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(roseX, roseY, roseR * 0.2, 0, 7); ctx.stroke();
  const ticks = Math.max(8, Math.min(24, detail));
  for (let i = 0; i < ticks; i++) {
    const tx = W * (0.15 + drng() * 0.7);
    const top = drng() < 0.5;
    ctx.beginPath();
    ctx.moveTo(tx, top ? H * 0.1 : H * 0.9);
    ctx.lineTo(tx, top ? H * 0.1 + 6 : H * 0.9 - 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(W * 0.78, H * 0.68, H * 0.09, 0, 7); ctx.stroke();
  ctx.globalAlpha = 1;
  void boil;
}

function paintGorgeWater(ctx, seed, shot, pal, W, H, t, boil, detail) {
  const waterY = H * 0.86;
  ctx.fillStyle = mix(pal.sky, '#060a12', 0.6);
  ctx.fillRect(0, waterY, W, H - waterY);
  waterReflections(ctx, substream(seed, 'reflect|' + shot.id, 1), pal, W, waterY, H, detail, t);
  ctx.strokeStyle = 'rgba(220,235,245,0.5)';
  ctx.lineWidth = 1.4;
  const srng = substream(seed, 'spray|' + shot.id, boilSlot(t));
  for (let i = 0; i < 24; i++) {
    const x = srng() * W; const y = waterY + srng() * H * 0.12;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + srng() * 14, y - 3); ctx.stroke();
  }
  // Gorge walls close in: dark faceted cliffs left and right.
  rockFacets(ctx, substream(seed, 'gorge-wall|' + shot.id, 1), pal, W * 0.06, H * 0.6, H * 0.5, Math.max(6, detail >> 2), boil);
  rockFacets(ctx, substream(seed, 'gorge-wall-r|' + shot.id, 1), pal, W * 0.94, H * 0.6, H * 0.5, Math.max(6, detail >> 2), boil);
  // Rope bridge arc the cast crosses.
  ctx.beginPath();
  ctx.moveTo(W * 0.08, H * 0.8);
  ctx.quadraticCurveTo(W * 0.5, H * 0.92, W * 0.92, H * 0.78);
  inkStroke(ctx, pal.ink, 2.4, { x: 0, y: 0 }, 0.3);
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
  for (let i = 1; i < 9; i++) {
    const bx = W * (0.08 + i * 0.093);
    const by = H * (0.8 + Math.sin(i * 0.7) * 0.035 + 0.035);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + 16); ctx.stroke();
  }
  // Frayed rope ends trembling over the drop.
  const frng = substream(seed, 'fray|' + shot.id, 1);
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const fx = W * 0.5 + (frng() - 0.5) * W * 0.3;
    ctx.beginPath(); ctx.moveTo(fx, H * 0.88); ctx.lineTo(fx + (frng() - 0.5) * 10, H * 0.88 + 12); ctx.stroke();
  }
  return waterY;
}

function paintCairn(ctx, seed, shot, pal, W, H, p, boil, withBloom, detail) {
  const bx = W * 0.5;
  ctx.fillStyle = mix(pal.ink, pal.sky, 0.2);
  ctx.beginPath();
  ctx.moveTo(bx - 70, H * 0.86); ctx.lineTo(bx - 30, H * 0.5);
  ctx.lineTo(bx + 30, H * 0.5); ctx.lineTo(bx + 70, H * 0.86);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx - 70, H * 0.86); ctx.lineTo(bx - 30, H * 0.5);
  ctx.lineTo(bx + 30, H * 0.5); ctx.lineTo(bx + 70, H * 0.86);
  ctx.closePath();
  inkStroke(ctx, pal.ink, 2, boil, 0.3);
  // Stone courses with per-stone seams and lichen dots.
  const srng = substream(seed, 'cairn|' + shot.id, 1);
  for (let i = 0; i < 4; i++) {
    const sy = H * (0.5 - i * 0.035);
    const sw = 46 - i * 9 + (srng() - 0.5) * 6;
    ctx.fillStyle = mix(pal.ink, pal.sky, 0.35);
    ctx.beginPath();
    ctx.ellipse(bx + (srng() - 0.5) * 8, sy, sw / 2, 8, 0, 0, 7);
    ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.stroke();
  }
  const stones = Math.max(6, detail >> 2);
  for (let i = 0; i < stones; i++) {
    const sx = bx - 60 + srng() * 120;
    const sy = H * (0.55 + srng() * 0.3);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 8 + srng() * 10, sy - 3); ctx.stroke();
    if (srng() < 0.4) {
      ctx.fillStyle = '#8fa06a';
      ctx.beginPath(); ctx.arc(sx + 4, sy - 4, 1.8, 0, 7); ctx.fill();
    }
  }
  if (withBloom) {
    const lit = 0.2 + p * 0.8;
    const fg = ctx.createRadialGradient(bx, H * 0.46, 0, bx, H * 0.46, 160 * lit + 20);
    fg.addColorStop(0, pal.lantern);
    fg.addColorStop(1, 'rgba(255,210,122,0)');
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = fg;
    ctx.fillRect(bx - 200, H * 0.46 - 200, 400, 260);
    ctx.globalAlpha = 1;
  }
}

// Interior props for Yara's house: hearth arch, kettle, blanket folds,
// shelf with jars, hanging herbs. Returns the hearth anchor for the lyric
// sparks so the particles rise from the painted fire, not from mid-air.
function interiorProps(ctx, seed, shot, pal, W, H, hy, boil, t, detail) {
  const hx = W * 0.62;
  ctx.fillStyle = mix(pal.sky, '#101018', 0.55);
  ctx.beginPath();
  ctx.moveTo(hx - 120, hy); ctx.lineTo(hx - 120, hy - 90);
  ctx.lineTo(hx, hy - 150); ctx.lineTo(hx + 120, hy - 90); ctx.lineTo(hx + 120, hy);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - 120, hy); ctx.lineTo(hx - 120, hy - 90);
  ctx.lineTo(hx, hy - 150); ctx.lineTo(hx + 120, hy - 90); ctx.lineTo(hx + 120, hy);
  ctx.closePath();
  inkStroke(ctx, pal.ink, 2.2, boil, 0.3);
  const flick = 0.7 + 0.3 * Math.sin(t * 2.2);
  ctx.globalAlpha = 0.8 * flick;
  ctx.fillStyle = pal.lantern;
  ctx.fillRect(hx - 16, hy - 70, 32, 46);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.6;
  ctx.strokeRect(hx - 16, hy - 70, 32, 46);
  const prng = substream(seed, 'props|' + shot.id, 1);
  // Hearth stone arch around the fire mouth.
  rockFacets(ctx, substream(seed, 'hearth-arch|' + shot.id, 1), pal, hx, hy - 40, 60, Math.max(5, detail >> 3), boil);
  // Kettle over the fire: belly, spout, bail arm.
  ctx.fillStyle = '#2c2620';
  ctx.beginPath(); ctx.ellipse(hx + 44, hy - 34, 14, 10, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 44, hy - 34, 14, 10, 0, 0, 7);
  inkStroke(ctx, pal.ink, 1.4, boil, 0.3);
  ctx.beginPath(); ctx.moveTo(hx + 30, hy - 70); ctx.lineTo(hx + 58, hy - 70); ctx.stroke();
  // Blanket folds on the sleeping bench.
  ctx.strokeStyle = mix(pal.wash, pal.ink, 0.3);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const by = hy - 12 - i * 7;
    ctx.beginPath();
    ctx.moveTo(hx - 110, by);
    ctx.quadraticCurveTo(hx - 60, by + 5, hx - 20, by);
    ctx.stroke();
  }
  // Shelf with jars along the left wall.
  ctx.beginPath(); ctx.moveTo(hx - 112, hy - 84); ctx.lineTo(hx - 40, hy - 84); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const jx = hx - 104 + i * 18 + (prng() - 0.5) * 4;
    const jh = 10 + prng() * 10;
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2;
    ctx.strokeRect(jx, hy - 84 - jh, 12, jh);
  }
  // Hanging herbs by the door.
  ctx.strokeStyle = '#5a7048'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const ex = hx + 88 + i * 10;
    ctx.beginPath(); ctx.moveTo(ex, hy - 120); ctx.lineTo(ex, hy - 96); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, hy - 104); ctx.lineTo(ex - 5, hy - 100); ctx.stroke();
  }
  return { x: hx, y: hy - 48 };
}

// Gate props for the threshold: posts, lintel, storm-ribbons on the wind.
function gateProps(ctx, seed, shot, pal, W, H, hy, boil, windK, detail) {
  const gx = W * 0.5;
  ctx.fillStyle = mix(pal.ink, pal.sky, 0.15);
  ctx.fillRect(gx - W * 0.08, H * 0.2, W * 0.16, H * 0.6);
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 3;
  ctx.strokeRect(gx - W * 0.08, H * 0.2, W * 0.16, H * 0.6);
  const grng = substream(seed, 'gate|' + shot.id, 1);
  // Adze marks on the posts.
  ctx.lineWidth = 1.1;
  const marks = Math.max(6, detail >> 2);
  for (let i = 0; i < marks; i++) {
    const px = gx + (grng() < 0.5 ? -W * 0.08 : W * 0.08);
    const py = H * (0.25 + grng() * 0.5);
    ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py + 2); ctx.stroke();
  }
  // Storm-ribbons tied to the lintel, streaming on the shot wind.
  ctx.strokeStyle = '#4a6a9a'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const rx = gx - W * 0.06 + i * W * 0.03;
    const wave = windK * 30 + 8;
    ctx.beginPath();
    ctx.moveTo(rx, H * 0.2);
    ctx.quadraticCurveTo(rx + wave * 0.5, H * 0.2 + 22, rx + wave, H * 0.2 + 40);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(gx, H * 0.8);
  ctx.quadraticCurveTo(gx - W * 0.04, H * 0.9, gx - W * 0.2, H * 0.98);
  inkStroke(ctx, pal.ink, 2, boil, 0.25);
}

// Atmosphere pass: the air itself. One kind per location from the
// composition table; static per shot (slot 1) so it pins on scrub while
// the particle layer carries the animation.
function atmospherePass(ctx, seed, shot, pal, W, H, kind, boil) {
  const arng = substream(seed, 'atmo|' + shot.id, 1);
  void boil;
  if (kind === 'none') return;
  if (kind === 'ember-falloff') {
    const lx = W * compositionFor(shot.bg).light;
    const g = ctx.createRadialGradient(lx, H * 0.3, 0, lx, H * 0.3, W * 0.55);
    g.addColorStop(0, 'rgba(255,180,77,0.14)');
    g.addColorStop(1, 'rgba(10,8,16,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (kind === 'storm-murk') {
    ctx.fillStyle = 'rgba(40,52,72,0.22)';
    for (let i = 0; i < 4; i++) {
      const y = arng() * H;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y - H * 0.12); ctx.lineTo(W, y - H * 0.02); ctx.lineTo(0, y + H * 0.1);
      ctx.closePath(); ctx.fill();
    }
  } else if (kind === 'dawn-bloom') {
    const g = ctx.createLinearGradient(0, H * 0.4, 0, H * 0.75);
    g.addColorStop(0, 'rgba(255,205,120,0)');
    g.addColorStop(1, 'rgba(255,205,120,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.4, W, H * 0.35);
  } else if (kind === 'night-hush') {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    g.addColorStop(0, 'rgba(8,10,26,0.4)');
    g.addColorStop(1, 'rgba(8,10,26,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.5);
  } else if (kind === 'grove-gloom') {
    ctx.fillStyle = 'rgba(20,34,20,0.25)';
    ctx.fillRect(0, 0, W * 0.08, H);
    ctx.fillRect(W * 0.92, 0, W * 0.08, H);
  } else if (kind === 'hearth-glow') {
    const hx = W * 0.62;
    const g = ctx.createRadialGradient(hx, H * 0.66, 0, hx, H * 0.66, W * 0.4);
    g.addColorStop(0, 'rgba(255,180,77,0.18)');
    g.addColorStop(1, 'rgba(255,180,77,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

export const PAINTED_BACKGROUNDS = [
  'hollow-dusk', 'hill-top', 'chart-table', 'hollow-night', 'yara-house',
  'threshold', 'low-valley', 'moss-grove', 'gorge-bridge', 'storm-slope',
  'cairn-approach', 'cairn-top', 'valley-dawn', 'hollow-dawn',
];

export function paintBackground(ctx, seed, shot, W, H, t, p, boil) {
  const pal = shot.palette;
  const comp = compositionFor(shot.bg);
  // Hostile widths (zero, negative, non-finite) can never crash the
  // stage: the budget falls back to full width while the paint itself
  // still runs on the real W. The strict budget function keeps throwing
  // for direct garbage callers; this is the renderer floor.
  const budgetW = Number.isFinite(W) && W >= 1 ? W : 960;
  const detail = detailCountFor(shot.bg, budgetW);
  const windK = 0.35 + 0.3 * Math.sin((t - shot.start) * 0.9 + shot.start);
  if (shot.bg === 'chart-table') {
    paintChartTable(ctx, seed, shot, pal, W, H, boil, detail);
    drawFibres(ctx, seed, shot.id, W, H);
    return { windK, groundY: H * 0.98, waterY: null, hearth: null };
  }
  // Wash layers: deep, body, lift over the sky gradient.
  paintSky(ctx, seed, shot.id, pal, W, H);
  const distant = substream(seed, 'ridge-far|' + shot.id, 1);
  ridgeLine(ctx, distant, { ...pal, sky: mix(pal.sky, '#101018', 0.3) }, W, H, H * 0.52, H * 0.05, boil, 1.4);
  const near = substream(seed, 'ridge-near|' + shot.id, 1);
  ridgeLine(ctx, near, pal, W, H, H * 0.62, H * 0.06, boil, 1.8);
  const mrng = substream(seed, 'mist|' + shot.id, 1);
  mistBand(ctx, mrng, pal, W, H * 0.62, H * 0.06, 0.35);

  const hy = ground(ctx, pal, W, H, comp.horizon, boil);
  // Fore wash: one more pigment pass low over the ground from the body
  // stream so the floor grades instead of sitting flat.
  washPass(ctx, substream(seed, 'wash-body|' + shot.id, 1), { ...pal, sky: pal.wash }, W, H, 1.0, 4, 0.1);
  const lrng = substream(seed, 'lanterns|' + shot.id, 1);
  let waterY = null;
  let hearth = null;

  switch (shot.bg) {
    case 'hollow-dusk':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 0.55, t);
      foliageClusters(ctx, substream(seed, 'foliage|' + shot.id, 1), pal, W, H, H * 0.9, detail >> 2, boil);
      reedTufts(ctx, substream(seed, 'reeds|' + shot.id, 1), pal, W, H * 0.9, Math.max(6, detail >> 2), windK, boil);
      break;
    case 'hollow-night':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 0.3, t);
      foliageClusters(ctx, substream(seed, 'foliage|' + shot.id, 1), pal, W, H, H * 0.9, detail >> 3, boil);
      break;
    case 'hill-top': {
      const crng = substream(seed, 'hillcairn|' + shot.id, 1);
      for (let i = 0; i < 5; i++) {
        const sx = W * 0.7 + (crng() - 0.5) * 60;
        const sy = H * (0.68 - i * 0.02);
        ctx.fillStyle = mix(pal.ink, pal.sky, 0.3);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 26 - i * 4, 9, 0, 0, 7);
        ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.stroke();
      }
      rockFacets(ctx, substream(seed, 'hill-rock|' + shot.id, 1), pal, W * 0.7, H * 0.66, H * 0.3, Math.max(6, detail >> 2), boil);
      reedTufts(ctx, substream(seed, 'reeds|' + shot.id, 1), pal, W, H * 0.88, Math.max(8, detail >> 2), windK, boil);
      break;
    }
    case 'yara-house':
      hearth = interiorProps(ctx, seed, shot, pal, W, H, hy, boil, t, detail);
      lanternRow(ctx, lrng, pal, W * 0.4, H, H * 0.72, 5, 0.8, t);
      break;
    case 'threshold':
      gateProps(ctx, seed, shot, pal, W, H, hy, boil, windK, detail);
      reedTufts(ctx, substream(seed, 'reeds|' + shot.id, 1), pal, W, H * 0.9, Math.max(6, detail >> 3), windK, boil);
      break;
    case 'low-valley': {
      waterY = H * 0.8;
      ctx.strokeStyle = mix(pal.sky, '#dfeaf2', 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W * 0.1, H * 0.8);
      ctx.quadraticCurveTo(W * 0.4, H * 0.74, W * 0.7, H * 0.84);
      ctx.stroke();
      waterReflections(ctx, substream(seed, 'reflect|' + shot.id, 1), pal, W, waterY, H, Math.max(6, detail >> 2), t);
      foliageClusters(ctx, substream(seed, 'foliage|' + shot.id, 1), pal, W, H, H * 0.9, detail >> 2, boil);
      reedTufts(ctx, substream(seed, 'reeds|' + shot.id, 1), pal, W, H * 0.9, Math.max(6, detail >> 2), windK, boil);
      break;
    }
    case 'moss-grove': {
      const trng = substream(seed, 'trunks|' + shot.id, 1);
      for (let i = 0; i < 6; i++) {
        const tx = (W * (i + 0.5)) / 6 + (trng() - 0.5) * 50;
        const tw = 26 + trng() * 30;
        ctx.fillStyle = mix(pal.ink, '#2c3a24', 0.35);
        ctx.fillRect(tx - tw / 2, H * 0.1, tw, H * 0.76);
        ctx.beginPath();
        ctx.moveTo(tx - tw / 2, H * 0.1); ctx.lineTo(tx - tw / 2, H * 0.86);
        inkStroke(ctx, pal.ink, 2, boil, 0.3);
        const hrng = substream(seed, 'moss|' + shot.id + i, 1);
        ctx.strokeStyle = '#5a7048';
        ctx.lineWidth = 1.4;
        for (let m = 0; m < 5; m++) {
          const my = H * (0.2 + hrng() * 0.4);
          ctx.beginPath();
          ctx.moveTo(tx + (hrng() - 0.5) * tw, my);
          ctx.quadraticCurveTo(tx + (hrng() - 0.5) * 20, my + 26, tx + (hrng() - 0.5) * 10, my + 44);
          ctx.stroke();
        }
      }
      fernFronds(ctx, substream(seed, 'ferns|' + shot.id, 1), pal, W, H * 0.86, Math.max(6, detail >> 2), boil);
      foliageClusters(ctx, substream(seed, 'canopy|' + shot.id, 1), pal, W, H, H * 0.2, detail >> 3, boil, '#3a5230');
      break;
    }
    case 'gorge-bridge':
      waterY = paintGorgeWater(ctx, seed, shot, pal, W, H, t, boil, detail);
      break;
    case 'storm-slope': {
      const strng = substream(seed, 'storm|' + shot.id, boilSlot(t));
      ctx.strokeStyle = 'rgba(220,232,242,0.4)';
      ctx.lineWidth = 1.6;
      // Streak count rides the width-scaled detail budget (fewer streaks
      // at 390 px, same slant and murk), never blurred down.
      const streaks = Math.max(16, detail);
      for (let i = 0; i < streaks; i++) {
        const x = strng() * W; const y = strng() * H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 26 - windK * 30, y + 34); ctx.stroke();
      }
      rockFacets(ctx, substream(seed, 'slope-rock|' + shot.id, 1), pal, W * 0.62, H * 0.8, H * 0.5, Math.max(6, detail >> 2), boil);
      break;
    }
    case 'cairn-approach': {
      ctx.beginPath();
      ctx.moveTo(W * 0.15, H * 0.95);
      ctx.quadraticCurveTo(W * 0.4, H * 0.8, W * 0.35, H * 0.66);
      ctx.quadraticCurveTo(W * 0.3, H * 0.55, W * 0.5, H * 0.5);
      inkStroke(ctx, pal.lantern, 2.2, boil, 0.2);
      // Lantern-lit stepping stones along the path.
      const prng = substream(seed, 'path|' + shot.id, 1);
      const stones = Math.max(5, detail >> 3);
      for (let i = 0; i < stones; i++) {
        const px = W * (0.15 + prng() * 0.25) + i * W * 0.012;
        const py = H * (0.95 - i * 0.035 - prng() * 0.02);
        ctx.fillStyle = mix(pal.ink, pal.sky, 0.4);
        ctx.beginPath(); ctx.ellipse(px, py, 9, 5, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.1; ctx.stroke();
      }
      rockFacets(ctx, substream(seed, 'approach-rock|' + shot.id, 1), pal, W * 0.78, H * 0.7, H * 0.4, Math.max(6, detail >> 3), boil);
      paintCairn(ctx, seed, shot, pal, W, H, 0, boil, false, detail);
      break;
    }
    case 'cairn-top':
      rockFacets(ctx, substream(seed, 'top-rock|' + shot.id, 1), pal, W * 0.5, H * 0.9, H * 0.6, Math.max(6, detail >> 3), boil);
      paintCairn(ctx, seed, shot, pal, W, H, p, boil, true, detail);
      break;
    case 'valley-dawn':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 0.35 + p * 0.65, t);
      mistBand(ctx, substream(seed, 'dawnmist|' + shot.id, 1), pal, W, H * 0.55, H * 0.08, 0.5);
      foliageClusters(ctx, substream(seed, 'foliage|' + shot.id, 1), pal, W, H, H * 0.9, detail >> 3, boil);
      dawnBirds(ctx, substream(seed, 'birds|' + shot.id, 1), pal, W, H, 3);
      break;
    case 'hollow-dawn':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 1.0, t);
      mistBand(ctx, substream(seed, 'dawnmist|' + shot.id, 1), pal, W, H * 0.55, H * 0.08, 0.4);
      foliageClusters(ctx, substream(seed, 'foliage|' + shot.id, 1), pal, W, H, H * 0.9, detail >> 3, boil);
      dawnBirds(ctx, substream(seed, 'birds|' + shot.id, 1), pal, W, H, 2);
      break;
    default:
      break;
  }
  atmospherePass(ctx, seed, shot, pal, W, H, comp.atmo, boil);
  drawFibres(ctx, seed, shot.id, W, H);
  return { windK, groundY: hy, waterY, hearth };
}
