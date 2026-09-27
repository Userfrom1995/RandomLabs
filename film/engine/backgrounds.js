// Hearthlight valley paint set: one painter per screenplay background.
//
// All 14 backgrounds of the screenplay are painted here from seeded
// substreams: layered ridge silhouettes, mist bands, lantern rows that
// gutter and rekindle with the story, grove trunks, gorge spray, storm
// streaks, cairn stones and the lighting bloom. No images, no tracing:
// every mark is a stroked vector path with hand-inked weight.
//
// Contract: paintBackground(ctx, seed, shot, W, H, t, p) paints the full
// world behind the cast. Pure function of its arguments; stream ids are
// stable since Phase 1 where the device already existed.
import { substream } from './rng.js';
import { inkStroke } from './ink.js';
import { boilSlot } from './ink.js';
import { paintSky, drawFibres } from './paper.js';

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, k) {
  const A = hex(a); const B = hex(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')';
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

function paintChartTable(ctx, seed, shot, pal, W, H) {
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
}

function paintGorgeWater(ctx, seed, shot, pal, W, H, t) {
  ctx.fillStyle = mix(pal.sky, '#060a12', 0.6);
  ctx.fillRect(0, H * 0.86, W, H * 0.14);
  ctx.strokeStyle = 'rgba(220,235,245,0.5)';
  ctx.lineWidth = 1.4;
  const srng = substream(seed, 'spray|' + shot.id, boilSlot(t));
  for (let i = 0; i < 24; i++) {
    const x = srng() * W; const y = H * 0.86 + srng() * H * 0.12;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + srng() * 14, y - 3); ctx.stroke();
  }
  // rope bridge arc the cast crosses
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
}

function paintCairn(ctx, seed, shot, pal, W, H, p, boil, withBloom) {
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
  // stacked capstones
  const srng = substream(seed, 'cairn|' + shot.id, 1);
  for (let i = 0; i < 4; i++) {
    const sy = H * (0.5 - i * 0.035);
    const sw = 46 - i * 9 + (srng() - 0.5) * 6;
    ctx.fillStyle = mix(pal.ink, pal.sky, 0.35);
    ctx.beginPath();
    ctx.ellipse(bx + (srng() - 0.5) * 8, sy, sw / 2, 8, 0, 0, 7);
    ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.2; ctx.stroke();
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

export const PAINTED_BACKGROUNDS = [
  'hollow-dusk', 'hill-top', 'chart-table', 'hollow-night', 'yara-house',
  'threshold', 'low-valley', 'moss-grove', 'gorge-bridge', 'storm-slope',
  'cairn-approach', 'cairn-top', 'valley-dawn', 'hollow-dawn',
];

export function paintBackground(ctx, seed, shot, W, H, t, p, boil) {
  const pal = shot.palette;
  const windK = 0.35 + 0.3 * Math.sin((t - shot.start) * 0.9 + shot.start);
  if (shot.bg === 'chart-table') {
    paintChartTable(ctx, seed, shot, pal, W, H);
    drawFibres(ctx, seed, shot.id, W, H);
    return { windK, groundY: H * 0.98 };
  }
  paintSky(ctx, seed, shot.id, pal, W, H);
  const distant = substream(seed, 'ridge-far|' + shot.id, 1);
  ridgeLine(ctx, distant, { ...pal, sky: mix(pal.sky, '#101018', 0.3) }, W, H, H * 0.52, H * 0.05, boil, 1.4);
  const near = substream(seed, 'ridge-near|' + shot.id, 1);
  ridgeLine(ctx, near, pal, W, H, H * 0.62, H * 0.06, boil, 1.8);
  const mrng = substream(seed, 'mist|' + shot.id, 1);
  mistBand(ctx, mrng, pal, W, H * 0.62, H * 0.06, 0.35);

  const horizonK = (shot.bg === 'yara-house' || shot.bg === 'threshold') ? 0.8 : 0.72;
  const hy = ground(ctx, pal, W, H, horizonK, boil);
  const lrng = substream(seed, 'lanterns|' + shot.id, 1);

  switch (shot.bg) {
    case 'hollow-dusk':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 0.55, t);
      reedTufts(ctx, substream(seed, 'reeds|' + shot.id, 1), pal, W, H * 0.9, 10, windK, boil);
      break;
    case 'hollow-night':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 0.3, t);
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
      reedTufts(ctx, substream(seed, 'reeds|' + shot.id, 1), pal, W, H * 0.88, 16, windK, boil);
      break;
    }
    case 'yara-house': {
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
      lanternRow(ctx, lrng, pal, W * 0.4, H, H * 0.72, 5, 0.8, t);
      break;
    }
    case 'threshold': {
      ctx.fillStyle = mix(pal.ink, pal.sky, 0.15);
      ctx.fillRect(W * 0.42, H * 0.2, W * 0.16, H * 0.6);
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 3;
      ctx.strokeRect(W * 0.42, H * 0.2, W * 0.16, H * 0.6);
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.8);
      ctx.quadraticCurveTo(W * 0.46, H * 0.9, W * 0.3, H * 0.98);
      inkStroke(ctx, pal.ink, 2, boil, 0.25);
      break;
    }
    case 'low-valley': {
      ctx.strokeStyle = mix(pal.sky, '#dfeaf2', 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W * 0.1, H * 0.8);
      ctx.quadraticCurveTo(W * 0.4, H * 0.74, W * 0.7, H * 0.84);
      ctx.stroke();
      reedTufts(ctx, substream(seed, 'reeds|' + shot.id, 1), pal, W, H * 0.9, 14, windK, boil);
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
      break;
    }
    case 'gorge-bridge':
      paintGorgeWater(ctx, seed, shot, pal, W, H, t);
      break;
    case 'storm-slope': {
      const strng = substream(seed, 'storm|' + shot.id, boilSlot(t));
      ctx.strokeStyle = 'rgba(220,232,242,0.4)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 40; i++) {
        const x = strng() * W; const y = strng() * H;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 26 - windK * 30, y + 34); ctx.stroke();
      }
      break;
    }
    case 'cairn-approach': {
      ctx.beginPath();
      ctx.moveTo(W * 0.15, H * 0.95);
      ctx.quadraticCurveTo(W * 0.4, H * 0.8, W * 0.35, H * 0.66);
      ctx.quadraticCurveTo(W * 0.3, H * 0.55, W * 0.5, H * 0.5);
      inkStroke(ctx, pal.lantern, 2.2, boil, 0.2);
      paintCairn(ctx, seed, shot, pal, W, H, 0, boil, false);
      break;
    }
    case 'cairn-top':
      paintCairn(ctx, seed, shot, pal, W, H, p, boil, true);
      break;
    case 'valley-dawn':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 0.35 + p * 0.65, t);
      mistBand(ctx, substream(seed, 'dawnmist|' + shot.id, 1), pal, W, H * 0.55, H * 0.08, 0.5);
      break;
    case 'hollow-dawn':
      lanternRow(ctx, lrng, pal, W, H, H * 0.72, 14, 1.0, t);
      mistBand(ctx, substream(seed, 'dawnmist|' + shot.id, 1), pal, W, H * 0.55, H * 0.08, 0.4);
      break;
    default:
      break;
  }
  drawFibres(ctx, seed, shot.id, W, H);
  return { windK, groundY: hy };
}
