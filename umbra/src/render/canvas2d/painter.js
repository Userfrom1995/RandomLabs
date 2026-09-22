/**
 * Umbra Canvas2D tier-2 painter: identical poses from the shared SceneDesc,
 * drawn as capsule strokes with gradient sky, moon glow, parallax ridges,
 * ground band, accent rim offsets, and ambient motes.
 */

import { flattenSegments } from '../scene.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w backing width
 * @param {number} h backing height
 */
function paintBackground(ctx, w, h, scene, arena, opts) {
  const t = opts.reducedMotion ? 0 : scene.time;
  const css = (c) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, css(arena.skyBottom));
  g.addColorStop(1, css(arena.skyTop));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Glow disc + halo.
  const gx = arena.glowPos[0] * w;
  const gy = (1 - arena.glowPos[1]) * h;
  // Moon glow mirrors the WebGL2 background shader (UMBRA_BG_FS):
  // bright core within d~0.16 plus a soft halo fading out by d~0.5.
  const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, h * 0.5);
  halo.addColorStop(0, css(arena.glow));
  halo.addColorStop(0.32, css(arena.glow.map((c) => c * 0.55)));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Two parallax ridgelines.
  for (let l = 0; l < 2; l++) {
    const drift = opts.reducedMotion ? 0 : scene.layers[l] * w * 0.4;
    const base = h * (1 - 0.24 - l * 0.05);
    const tint = arena.ridge[0] + (arena.ridge[1] - arena.ridge[0]) * l * 0.5;
    ctx.beginPath();
    ctx.moveTo(-10, h);
    for (let x = -10; x <= w + 10; x += 8) {
      const xx = (x + drift) / w;
      const y =
        base +
        Math.sin(xx * (5 + l * 3.7) + t * 0.05 + l * 7) * h * 0.035 +
        Math.sin(xx * 11 - t * 0.03 + l * 9) * h * 0.018;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + 10, h);
    ctx.closePath();
    const shade = Math.round(tint * 255);
    ctx.fillStyle = `rgb(${shade},${Math.round(shade * 0.9)},${Math.round(shade * 1.4)})`;
    ctx.fill();
  }

  // Ground band.
  const groundY = h * (1 - 0.14);
  ctx.fillStyle = css(arena.ground);
  ctx.fillRect(0, groundY, w, h - groundY);

  // Vignette.
  const v = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.3, w / 2, h * 0.45, h * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function toPx(s, w, h) {
  // Arena x in [-1,1] maps across width; arena y in [0,1] maps bottom-up.
  return {
    ax: (s.ax * 0.5 + 0.5) * w,
    ay: (1 - s.ay) * h,
    bx: (s.bx * 0.5 + 0.5) * w,
    by: (1 - s.by) * h,
    w: Math.max(1.5, (s.w * w) / 2),
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{tier:2, name:string, render:(scene:any, arena:any, opts?:any)=>void, dispose:()=>void}}
 */
export function createCanvas2DRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('umbra: Canvas2D unavailable');

  function render(scene, arena, opts = {}) {
    const w = canvas.width || 960;
    const h = canvas.height || 540;
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    paintBackground(ctx, w, h, scene, arena, opts);

    const segs = flattenSegments(scene);
    ctx.lineCap = 'round';

    // Rim light: dark bodies first at full width, then a thin accent edge
    // offset toward the arena key light. This mirrors the GPU SDF rim
    // (UMBRA_RIM_FS / rimlight.wgsl): a narrow lit edge whose intensity
    // falls off away from the light, not a full-width offset double-image.
    const lx = arena.keyLight[0];
    const ly = -arena.keyLight[1]; // arena y-up to canvas y-down
    const mag = Math.hypot(lx, ly) || 1;
    const accent = `rgb(${arena.accent.map((c) => Math.round(c * 255)).join(',')})`;
    for (const s of segs) {
      const p = toPx(s, w, h);
      ctx.strokeStyle = '#05060a';
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.moveTo(p.ax, p.ay);
      ctx.lineTo(p.bx, p.by);
      ctx.stroke();
    }
    ctx.globalAlpha = opts.reducedMotion ? 0.7 : 1.0;
    for (const s of segs) {
      const p = toPx(s, w, h);
      const ox = (lx / mag) * p.w * 0.35;
      const oy = (ly / mag) * p.w * 0.35;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1, p.w * 0.35);
      ctx.beginPath();
      ctx.moveTo(p.ax + ox, p.ay + oy);
      ctx.lineTo(p.bx + ox, p.by + oy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Ambient motes.
    // Reduced motion dims mote brightness (x0.4), matching the WebGL2
    // renderer and WebGPU pipeline contract; radius stays constant.
    if (!opts.batterySaver) {
      ctx.fillStyle = 'rgba(180,200,255,0.5)';
      for (const m of scene.particles) {
        const r = Math.max(0.6, m.s * w * 0.18);
        ctx.globalAlpha = m.b * 0.5 * (opts.reducedMotion ? 0.4 : 1);
        ctx.beginPath();
        ctx.arc(m.x * w, (1 - m.y) * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  }

  function dispose() {
    // Nothing to release for Canvas2D.
  }

  return { tier: 2, name: 'Canvas2D', render, dispose };
}
