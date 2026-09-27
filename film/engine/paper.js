// Hearthlight paper module: grain, fibre, vignette, wash stacking.
//
// Paper is what sells "hand-drawn" between the lines: a tooth of dark
// flecks, sparse laid fibres, a warm edge vignette, and watercolor washes
// laid as stacked translucent blobs (3 passes: deep, body, lift) instead of
// a single flat gradient. Everything is seeded per boil slot so grain
// shimmers at 12 fps in motion and pins exactly when scrubbed.
import { substream } from './rng.js';
import { boilSlot } from './ink.js';

export function drawGrain(ctx, masterSeed, t, reducedMotion, W, H, density = 130) {
  const slot = reducedMotion ? 0 : boilSlot(t);
  const rng = substream(masterSeed, 'grain', slot);
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000';
  for (let i = 0; i < density; i++) {
    ctx.fillRect(rng() * W, rng() * H, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
}

export function drawFibres(ctx, masterSeed, shotId, W, H) {
  const rng = substream(masterSeed, 'fibre|' + shotId, 1);
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#3a3226';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 26; i++) {
    const x = rng() * W; const y = rng() * H;
    const a = rng() * Math.PI; const len = 6 + rng() * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawVignette(ctx, W, H, warmth = '150,110,60', strength = 0.22) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(' + warmth + ',0)');
  g.addColorStop(1, 'rgba(' + warmth + ',' + strength + ')');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// One watercolor blob pass: n soft radial blooms in wash/sky ink.
export function washPass(ctx, rng, pal, W, H, yMaxK, count, alpha) {
  for (let i = 0; i < count; i++) {
    const x = rng() * W; const y = rng() * H * yMaxK;
    const r = (0.1 + rng() * 0.2) * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rng() < 0.5 ? pal.wash : pal.sky;
    g.addColorStop(0, c + '');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

// The full sky: base gradient, then deep/body/lift wash passes with
// independent substreams so each layer has its own pigment breakup.
export function paintSky(ctx, masterSeed, shotId, pal, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal.sky);
  g.addColorStop(0.72, pal.wash);
  g.addColorStop(1, pal.ink);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  washPass(ctx, substream(masterSeed, 'wash-deep|' + shotId, 1), pal, W, H, 0.7, 7, 0.2);
  washPass(ctx, substream(masterSeed, 'wash-body|' + shotId, 1), pal, W, H, 0.6, 9, 0.14);
  washPass(ctx, substream(masterSeed, 'wash-lift|' + shotId, 1), pal, W, H, 0.45, 5, 0.1);
}
