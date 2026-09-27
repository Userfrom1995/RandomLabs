// Hearthlight weather and particles: embers, leaves, spray, storm,
// cairn sparks, and the rekindling wave.
//
// Every particle is a pure function of time: its static parameters come
// from a stable per-particle substream (slot 1, never the boil slot), and
// its position follows an analytic path from (t - shot.start), so motion
// is smooth in playback and pins exactly when scrubbed. No random calls,
// no wall clock, no retained state. Reduced motion freezes the whole field
// at the shot's first frame at softened alpha.
//
// The layer is drawn over the cast, under the letterbox: weather reads in
// front of the actors, as on a real multiplane stand.
import { substream } from './rng.js';
import { frameTime } from './frames.js';

function tau() { return Math.PI * 2; }

// One field per screenplay background: which weather lives there.
export const PARTICLE_FIELDS = {
  'hollow-dusk': { kind: 'embers', count: 12 },
  'hill-top': { kind: 'leaves', count: 14 },
  'chart-table': { kind: 'dust', count: 6 },
  'hollow-night': { kind: 'embers', count: 8 },
  'yara-house': { kind: 'hearth', count: 10 },
  'threshold': { kind: 'leaves', count: 8 },
  'low-valley': { kind: 'leaves', count: 16 },
  'moss-grove': { kind: 'spores', count: 12 },
  'gorge-bridge': { kind: 'spray', count: 18 },
  'storm-slope': { kind: 'storm', count: 30 },
  'cairn-approach': { kind: 'seeds', count: 10 },
  'cairn-top': { kind: 'sparks', count: 20 },
  'valley-dawn': { kind: 'rekindle', count: 24 },
  'hollow-dawn': { kind: 'rekindle', count: 16 },
};

export function particleFieldFor(shot) {
  const f = PARTICLE_FIELDS[shot.bg];
  if (!f) throw new Error('no particle field for background ' + shot.bg);
  return f;
}

// Painted anchor resolution: the gorge spray rises from the painted water
// line and the house sparks from the painted hearth, never from mid-air.
// Missing anchors fall back to the historic fractions so unit callers
// without a painted frame still render.
export function waterYFor(anchors, H) {
  if (anchors && Number.isFinite(anchors.waterY)) return anchors.waterY;
  return H * 0.8;
}

export function hearthFor(anchors) {
  if (anchors && anchors.hearth && Number.isFinite(anchors.hearth.x) && Number.isFinite(anchors.hearth.y)) {
    return anchors.hearth;
  }
  return null;
}

// Static per-particle parameters from a stable substream.
function params(seed, shotId, i) {
  const rng = substream(seed, 'particle|' + shotId + '|' + i, 1);
  return {
    x0: rng(), y0: rng(), size: rng(), speed: rng(), phase: rng(), gust: rng(),
  };
}

function glowDot(ctx, pal, x, y, r, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
  g.addColorStop(0, pal.lantern);
  g.addColorStop(1, 'rgba(255,180,77,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.lantern;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}

// Rising motes: embers, hearth sparks, grove spores, grass seed, cairn
// sparks, rekindling wave. Intensity ramps with shot progress p for kinds
// tied to the story's lighting beats (sparks, rekindle).
function drawRiser(ctx, seed, shot, pal, W, H, teff, p, q, i, reduced, anchors) {
  const field = PARTICLE_FIELDS[shot.bg];
  const pr = params(seed, shot.id, i);
  const cycle = 6 + pr.speed * 6;
  const u = (((teff - shot.start) * (0.6 + pr.speed * 0.8)) / cycle + pr.phase) % 1;
  const uu = u < 0 ? u + 1 : u;
  let base = H * (0.55 + pr.y0 * 0.35);
  const hearth = hearthFor(anchors);
  if (hearth) base = hearth.y - pr.y0 * H * 0.05;
  else if (shot.bg === 'yara-house') base = H * (0.72 - pr.y0 * 0.1);
  if (shot.bg === 'moss-grove') base = H * (0.3 + pr.y0 * 0.55);
  const riseK = field.kind === 'sparks' ? 0.62 : field.kind === 'rekindle' ? 0.5 : 0.42;
  const y = base - uu * H * riseK;
  const x = pr.x0 * W + Math.sin(uu * tau() + pr.phase * tau()) * (8 + pr.gust * 22);
  const r = (1.1 + pr.size * 2.4) * (W / 960);
  let intensity = 0.8;
  if (field.kind === 'sparks') intensity = 0.15 + 0.85 * p;
  else if (field.kind === 'rekindle') intensity = 0.2 + 0.8 * p;
  else if (field.kind === 'hearth') intensity = 0.9;
  else if (field.kind === 'spores') intensity = 0.5;
  else if (field.kind === 'seeds') intensity = 0.45 + 0.35 * q;
  const alpha = Math.pow(Math.sin(Math.PI * uu), 0.7) * intensity * (reduced ? 0.7 : 1);
  if (alpha <= 0.01) return;
  if (field.kind === 'spores') {
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = '#e6ebdc';
    ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (field.kind === 'seeds') {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    glowDot(ctx, pal, x, y, r, alpha * 0.75);
  }
}

function drawLeaf(ctx, seed, shot, pal, W, H, teff, q, i, windK, boil, reduced) {
  const pr = params(seed, shot.id, i);
  const span = W + 80;
  const x = (((pr.x0 * span + (teff - shot.start) * (26 + pr.speed * 60) * (0.4 + windK)) % span) + span) % span - 40;
  const y = H * (0.2 + pr.y0 * 0.6) + Math.sin((teff - shot.start) * 1.3 + pr.phase * tau()) * H * 0.03;
  const rot = pr.phase * tau() + (reduced ? 0 : (teff - shot.start) * (pr.speed - 0.5) * 4);
  const rx = (3 + pr.size * 4) * (W / 960);
  ctx.save();
  ctx.translate(x + boil.x * 0.5, y + boil.y * 0.5);
  ctx.rotate(rot);
  ctx.globalAlpha = reduced ? 0.55 : 0.8;
  ctx.fillStyle = pr.gust < 0.25 ? '#8a5a2a' : pal.wash;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, rx * 0.45, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = reduced ? 0.55 : 0.8;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, rx, rx * 0.45, 0, 0, 7); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSpray(ctx, seed, shot, W, H, teff, i, reduced, waterY) {
  const pr = params(seed, shot.id, i);
  const x = pr.x0 * W;
  const wy = Number.isFinite(waterY) ? waterY : H * 0.8;
  const bob = Math.abs(Math.sin((teff - shot.start) * (0.8 + pr.speed) + pr.phase * tau()));
  const y = wy - bob * H * 0.07;
  const alpha = (0.1 + 0.3 * bob) * (reduced ? 0.7 : 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#dce8f2';
  ctx.beginPath(); ctx.ellipse(x, y, (4 + pr.size * 9) * (W / 960), (2 + pr.size * 4) * (W / 960), 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawStorm(ctx, seed, shot, W, H, teff, i, windK, reduced) {
  const pr = params(seed, shot.id, i);
  if (reduced) {
    // Frozen ticks, not streaks: no crawl, no vestibular trouble.
    if (i % 4 !== 0) return;
    const x = pr.x0 * W; const y = pr.y0 * H;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#dce8f2';
    ctx.fillRect(x, y, 3, 3);
    ctx.globalAlpha = 1;
    return;
  }
  const vx = 260 + pr.speed * 320 + windK * 160;
  const vy = 200 + pr.gust * 200;
  const spanX = W + 160; const spanY = H + 120;
  const x = W + 40 - (((pr.x0 * spanX + (teff - shot.start) * vx) % spanX) + spanX) % spanX;
  const y = (((pr.y0 * spanY + (teff - shot.start) * vy) % spanY) + spanY) % spanY - 60;
  const len = (14 + pr.size * 22) * (W / 960);
  ctx.globalAlpha = 0.35 + pr.size * 0.3;
  ctx.strokeStyle = '#dce8f2';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y - len * 0.55); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawDust(ctx, seed, shot, W, H, teff, i, reduced) {
  const pr = params(seed, shot.id, i);
  const x = pr.x0 * W + Math.sin((teff - shot.start) * 0.3 + pr.phase * tau()) * 20;
  const y = H * (0.2 + pr.y0 * 0.5) + Math.cos((teff - shot.start) * 0.24 + pr.phase * tau()) * 14;
  ctx.globalAlpha = reduced ? 0.2 : 0.3;
  ctx.fillStyle = '#f2e8d5';
  ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawParticles(ctx, seed, shot, W, H, t, p, windK, boil, reducedMotion, anchors) {
  const field = particleFieldFor(shot);
  const teff = reducedMotion ? shot.start : frameTime(t);
  const b = boil || { x: 0, y: 0 };
  const waterY = waterYFor(anchors, H);
  for (let i = 0; i < field.count; i++) {
    switch (field.kind) {
      case 'embers':
      case 'hearth':
      case 'spores':
      case 'seeds':
      case 'sparks':
      case 'rekindle':
        drawRiser(ctx, seed, shot, shot.palette, W, H, teff, p, windK, i, reducedMotion, anchors);
        break;
      case 'leaves':
        drawLeaf(ctx, seed, shot, shot.palette, W, H, teff, windK, i, windK, b, reducedMotion);
        break;
      case 'spray':
        drawSpray(ctx, seed, shot, W, H, teff, i, reducedMotion, waterY);
        break;
      case 'storm':
        drawStorm(ctx, seed, shot, W, H, teff, i, windK, reducedMotion);
        break;
      case 'dust':
        drawDust(ctx, seed, shot, W, H, teff, i, reducedMotion);
        break;
      default:
        break;
    }
  }
}
