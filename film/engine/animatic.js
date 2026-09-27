// Hearthlight living-animatic renderer: a pure function of (timeline, time).
// Storyboard-sketch look: ink-glyph cast, wash backgrounds, paper grain,
// 2s line boil (12 fps quantization). Scrub-exact: same t => same pixels.
import { substream } from './rng.js';
import { shotAt as shotInfo } from './timeline.js';

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, k) {
  const A = hex(a); const B = hex(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',') + ')';
}

function boilJitter(masterSeed, shotId, t, reducedMotion, amt) {
  if (reducedMotion) return { x: 0, y: 0 };
  const slot = Math.floor(t * 12); // 2s boil: jitter changes at 12 fps
  const r = substream(masterSeed, 'boil|' + shotId, slot);
  return { x: (r() - 0.5) * 2 * amt, y: (r() - 0.5) * 2 * amt };
}

// Camera: normalized progress 0..1 => view transform over a 960x540 stage.
function cameraTransform(move, p, W, H) {
  const s = W / 960;
  switch (move) {
    case 'push-in': { const z = 1 + p * 0.12; return { dx: (W - 960 * z * s / s) / 2 - (z - 1) * W * 0.0, dy: 0, z }; }
    case 'pull-back': { const z = 1.12 - p * 0.12; return { dx: 0, dy: 0, z }; }
    case 'pan-right': return { dx: -p * 60 * s, dy: 0, z: 1 };
    case 'track-left': return { dx: -p * 80 * s, dy: 0, z: 1 };
    case 'track-right': return { dx: p * 80 * s, dy: 0, z: 1 };
    case 'sweep': return { dx: (0.5 - p) * 120 * s, dy: 0, z: 1.05 };
    case 'rise': return { dx: 0, dy: p * 50 * s, z: 1 };
    case 'crane-up': return { dx: 0, dy: p * 70 * s, z: 1 + p * 0.06 };
    case 'tilt-up': return { dx: 0, dy: p * 60 * s, z: 1 };
    case 'bloom': { const z = 1 + p * 0.08; return { dx: 0, dy: 0, z }; }
    case 'fade-gold': return { dx: 0, dy: 0, z: 1 };
    default: return { dx: 0, dy: 0, z: 1 };
  }
}

function drawWash(ctx, rng, pal, W, H) {
  // Layered translucent wash blobs over the sky color.
  for (let i = 0; i < 9; i++) {
    const x = rng() * W; const y = rng() * H * 0.75;
    const r = (0.12 + rng() * 0.22) * W;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = rng() < 0.5 ? pal.wash : pal.sky;
    g.addColorStop(0, c + '');
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx, pal, W, H, horizonK) {
  const hy = H * horizonK;
  ctx.fillStyle = mix(pal.sky, '#101018', 0.45);
  ctx.fillRect(0, hy, W, H - hy);
  ctx.strokeStyle = pal.ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(1, W / 640);
  ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawLanternRow(ctx, rng, pal, W, H, hy, count, litFrac, t) {
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

// --- cast glyphs (model-sheet proportions, sketch linework) ---
function drawNia(ctx, pal, x, y, h, windK, boil) {
  ctx.save();
  ctx.translate(x + boil.x, y + boil.y);
  ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.ink;
  ctx.lineWidth = Math.max(1.2, h / 90);
  // cloak: triangle bellied by wind
  const belly = windK * h * 0.22;
  ctx.fillStyle = '#a03a2a';
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.quadraticCurveTo(-h * 0.34 - belly, -h * 0.45, -h * 0.3 - belly, 0);
  ctx.lineTo(h * 0.3, 0);
  ctx.quadraticCurveTo(h * 0.2, -h * 0.5, 0, -h);
  ctx.fill();
  ctx.stroke();
  // head + windswept tuft
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(h * 0.02, -h * 1.12, h * 0.11, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-h * 0.06, -h * 1.2);
  ctx.lineTo(-h * 0.22 - windK * h * 0.2, -h * 1.3);
  ctx.moveTo(-h * 0.02, -h * 1.23);
  ctx.lineTo(-h * 0.16 - windK * h * 0.2, -h * 1.38);
  ctx.stroke();
  // survey pole with ribbons
  ctx.beginPath(); ctx.moveTo(h * 0.42, 0); ctx.lineTo(h * 0.42, -h * 1.7); ctx.stroke();
  ctx.strokeStyle = '#d8d2c0';
  for (let i = 0; i < 3; i++) {
    const ry = -h * (1.55 - i * 0.12);
    ctx.beginPath(); ctx.moveTo(h * 0.42, ry);
    ctx.quadraticCurveTo(h * 0.42 + windK * h * 0.5, ry - h * 0.08, h * 0.42 + windK * h * 0.7, ry);
    ctx.stroke();
  }
  ctx.restore();
}

function drawYara(ctx, pal, x, y, h, boil) {
  ctx.save();
  ctx.translate(x + boil.x, y + boil.y);
  ctx.lineWidth = Math.max(1.2, h / 90);
  ctx.strokeStyle = pal.ink;
  // stooped shawl: draped peak
  ctx.fillStyle = '#33406a';
  ctx.beginPath();
  ctx.moveTo(-h * 0.3, 0); ctx.lineTo(h * 0.3, 0);
  ctx.lineTo(h * 0.12, -h * 0.9); ctx.quadraticCurveTo(0, -h * 1.05, -h * 0.12, -h * 0.82);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8b894';
  ctx.beginPath(); ctx.arc(-h * 0.05, -h * 0.95, h * 0.1, 0, 7); ctx.fill(); ctx.stroke();
  // staff by the door side
  ctx.beginPath(); ctx.moveTo(h * 0.45, 0); ctx.lineTo(h * 0.45, -h * 1.5); ctx.stroke();
  ctx.restore();
}

function drawRuel(ctx, pal, x, y, h, boil, breathT) {
  ctx.save();
  ctx.translate(x + boil.x, y + boil.y);
  ctx.lineWidth = Math.max(1.6, h / 70);
  ctx.strokeStyle = pal.ink;
  const L = h * 3.0; // body length per bible proportions
  // body + hump with moss mantle
  ctx.fillStyle = '#4a4038';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.7, L / 2, h * 0.62, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#5a7048';
  ctx.beginPath();
  ctx.ellipse(-L * 0.1, -h * 1.15, L * 0.28, h * 0.34, 0, Math.PI, 0); ctx.fill();
  // head, low and heavy
  ctx.fillStyle = '#4a4038';
  ctx.beginPath(); ctx.ellipse(L * 0.52, -h * 0.55, h * 0.42, h * 0.34, 0.2, 0, 7); ctx.fill(); ctx.stroke();
  // ember eyes
  ctx.fillStyle = pal.lantern;
  ctx.beginPath(); ctx.arc(L * 0.58, -h * 0.62, h * 0.045, 0, 7); ctx.fill();
  // lichen antlers: 5 tines a side, asymmetrical
  ctx.strokeStyle = '#b8c49a';
  for (const sx of [-1, 1]) {
    const bx = -L * 0.1 + sx * L * 0.08;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + sx * (0.25 + i * 0.16);
      const len = h * (0.5 - Math.abs(i - (sx > 0 ? 1 : 3)) * 0.06);
      ctx.beginPath(); ctx.moveTo(bx, -h * 1.25);
      ctx.lineTo(bx + Math.cos(a) * len, -h * 1.25 + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  // legs
  ctx.strokeStyle = pal.ink;
  for (const lx of [-L * 0.3, -L * 0.05, L * 0.22, L * 0.4]) {
    ctx.beginPath(); ctx.moveTo(lx, -h * 0.25); ctx.lineTo(lx, 0); ctx.stroke();
  }
  // breath mist in cold acts
  if (breathT !== null) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#cfd8e2';
    const bx = L * 0.52 + h * 0.5 + (breathT % 3) * h * 0.2;
    ctx.beginPath(); ctx.ellipse(bx, -h * 0.5, h * 0.3, h * 0.14, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawGrain(ctx, rng, W, H) {
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000';
  for (let i = 0; i < 130; i++) {
    ctx.fillRect(rng() * W, rng() * H, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;
}

export function renderAnimatic(ctx, tl, t, opts) {
  opts = opts || {};
  const W = opts.width || 960; const H = opts.height || 540;
  const reduced = !!opts.reducedMotion;
  const seed = String(tl.seed);
  const found = shotInfo(tl, t);
  const s = found.shot; const p = found.progress; const local = found.local;

  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, s.palette.sky);
  g.addColorStop(0.72, mix(s.palette.sky, s.palette.wash, 0.55));
  g.addColorStop(1, mix(s.palette.wash, '#101018', 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const wrng = substream(seed, 'wash|' + s.id, 1);
  drawWash(ctx, wrng, s.palette, W, H);

  ctx.save();
  const cam = cameraTransform(s.camera.move, p, W, H);
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-W / 2 + cam.dx, -H / 2 + cam.dy);

  const hy = H * (s.bg === 'chart-table' || s.bg === 'yara-house' ? 0.98 : 0.72);
  const boil = boilJitter(seed, s.id, t, reduced, W / 480);
  const windK = 0.35 + 0.3 * Math.sin(local * 0.9 + s.start);

  if (s.bg === 'chart-table') {
    // overhead chart sketch: swirling wind arrows bending around the cairn
    ctx.strokeStyle = s.palette.ink; ctx.lineWidth = 2;
    ctx.strokeRect(W * 0.14, H * 0.1, W * 0.72, H * 0.8);
    const crng = substream(seed, 'chart|' + s.id, 1);
    for (let i = 0; i < 11; i++) {
      const y0 = H * (0.16 + crng() * 0.68);
      ctx.beginPath(); ctx.moveTo(W * 0.18, y0);
      ctx.bezierCurveTo(W * 0.4, y0 - 30, W * 0.55, y0 + 40, W * 0.66, H * 0.32);
      ctx.stroke();
    }
    ctx.fillStyle = '#a03a2a';
    ctx.beginPath(); ctx.arc(W * 0.66, H * 0.32, 9, 0, 7); ctx.fill();
    ctx.fillStyle = s.palette.ink;
    ctx.font = (H * 0.045) + 'px serif';
    ctx.fillText('the high cairn', W * 0.68, H * 0.32);
  } else {
    drawGround(ctx, s.palette, W, H, s.bg === 'yara-house' || s.bg === 'threshold' ? 0.8 : 0.72);
    // lantern rows where the valley is visible
    const lrng = substream(seed, 'lanterns|' + s.id, 1);
    if (s.bg === 'hollow-dusk') drawLanternRow(ctx, lrng, s.palette, W, H, H * 0.72, 14, 0.55, t);
    if (s.bg === 'hollow-night') drawLanternRow(ctx, lrng, s.palette, W, H, H * 0.72, 14, 0.3, t);
    if (s.bg === 'valley-dawn') drawLanternRow(ctx, lrng, s.palette, W, H, H * 0.72, 14, 0.35 + p * 0.65, t);
    if (s.bg === 'hollow-dawn') drawLanternRow(ctx, lrng, s.palette, W, H, H * 0.72, 14, 1.0, t);

    // cast staging per shot
    const gy = H * 0.86;
    if (s.cast.includes('nia') && s.cast.includes('ruel')) {
      drawRuel(ctx, s.palette, W * 0.42, gy, H * 0.1, boil, s.act >= 3 ? local : null);
      drawNia(ctx, s.palette, W * 0.42, gy - H * 0.19, H * 0.13, windK, boil);
    } else if (s.cast.includes('ruel')) {
      drawRuel(ctx, s.palette, W * 0.55, gy, H * 0.11, boil, local);
    } else {
      if (s.cast.includes('nia')) drawNia(ctx, s.palette, W * (s.cast.includes('yara') ? 0.38 : 0.5), gy, H * 0.16, windK, boil);
      if (s.cast.includes('yara')) drawYara(ctx, s.palette, W * 0.62, gy, H * 0.17, boil);
    }

    // gorge water for the crossing
    if (s.bg === 'gorge-bridge') {
      ctx.fillStyle = mix(s.palette.sky, '#060a12', 0.6);
      ctx.fillRect(0, H * 0.86, W, H * 0.14);
      ctx.strokeStyle = 'rgba(220,235,245,0.5)';
      const srng = substream(seed, 'spray|' + s.id, Math.floor(t * 12));
      for (let i = 0; i < 24; i++) {
        const x = srng() * W; const y = H * 0.86 + srng() * H * 0.12;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + srng() * 14, y - 3); ctx.stroke();
      }
    }
    // cairn stones + braziers in the finale acts
    if (s.bg === 'cairn-top' || s.bg === 'cairn-approach') {
      ctx.fillStyle = mix(s.palette.ink, s.palette.sky, 0.2);
      const bx = W * 0.5;
      ctx.beginPath();
      ctx.moveTo(bx - 70, H * 0.86); ctx.lineTo(bx - 30, H * 0.5);
      ctx.lineTo(bx + 30, H * 0.5); ctx.lineTo(bx + 70, H * 0.86);
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = s.palette.ink; ctx.stroke();
      if (s.bg === 'cairn-top') {
        const lit = 0.2 + p * 0.8;
        const fg = ctx.createRadialGradient(bx, H * 0.46, 0, bx, H * 0.46, 160 * lit + 20);
        fg.addColorStop(0, s.palette.lantern);
        fg.addColorStop(1, 'rgba(255,210,122,0)');
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = fg;
        ctx.fillRect(bx - 200, H * 0.46 - 200, 400, 260);
        ctx.globalAlpha = 1;
        drawNia(ctx, s.palette, bx - 90, H * 0.86, H * 0.13, 0.15, boil);
      }
    }
  }
  ctx.restore();

  // letterbox + act/shot slate (first 2.2 s of each shot)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H * 0.07); ctx.fillRect(0, H * 0.93, W, H * 0.07);
  if (local < 2.2) {
    ctx.globalAlpha = Math.min(1, (2.2 - local));
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const bw = W * 0.6;
    ctx.fillRect((W - bw) / 2, H * 0.12, bw, H * 0.13);
    ctx.fillStyle = '#f2e8d5';
    ctx.textAlign = 'center';
    ctx.font = '600 ' + (H * 0.05) + 'px serif';
    ctx.fillText('Act ' + s.act + ' - ' + s.title, W / 2, H * 0.175);
    ctx.font = (H * 0.032) + 'px serif';
    ctx.fillText(s.id.toUpperCase() + '  ·  living animatic', W / 2, H * 0.215);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // paper grain (deterministic per boil slot)
  const grng = substream(seed, 'grain', reduced ? 0 : Math.floor(t * 12));
  drawGrain(ctx, grng, W, H);

  // gold fade on the final frame
  if (s.id === 's20') {
    ctx.fillStyle = 'rgba(255,205,120,' + (p * 0.35) + ')';
    ctx.fillRect(0, 0, W, H);
    if (p > 0.72) {
      ctx.fillStyle = '#2b2118';
      ctx.textAlign = 'center';
      ctx.font = '600 ' + (H * 0.11) + 'px serif';
      ctx.fillText('HEARTHLIGHT', W / 2, H * 0.52);
      ctx.textAlign = 'left';
    }
  }
  return found;
}
