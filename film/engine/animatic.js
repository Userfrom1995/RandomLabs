// Hearthlight renderer: a pure function of (timeline, time).
//
// Hand-drawn craft cut: the ink engine draws every line (2s boil +
// double-pass stroke weight), the paper module lays washes and grain, the
// valley paint set dresses all 14 backgrounds, the keyframed rigs act
// each shot from eased poses, and the particle layer plays the weather
// (embers, leaves, spray, storm, cairn sparks, the rekindling wave).
// Scrub-exact: time is locked to the 24 fps grid first, so same frame
// index => same pixels, whether the call comes from playback, a seek, or
// the capture loop.
//
// No wall-clock, no network, no Math.random anywhere in this path.
import { shotAt as shotInfo } from './timeline.js';
import { frameTime } from './frames.js';
import { boilJitter, boilJitterSlow } from './ink.js';
import { drawGrain, drawVignette } from './paper.js';
import { paintBackground } from './backgrounds.js';
import { poseFor, drawNiaAtWalk, drawYara, drawRuel, easeInOut } from './rigs.js';
import { drawParticles } from './particles.js';

// Camera: normalized progress 0..1 => view transform over a 960x540 stage.
// Directed moves (push, pull, pan, track, sweep, rise, crane, tilt, bloom)
// ease in and settle like a human operator; ambient moves (hold, drift,
// orbit) stay linear so the frame keeps breathing.
function cameraTransform(move, p, W, H) {
  const s = W / 960;
  const e = easeInOut(p);
  switch (move) {
    case 'push-in': { const z = 1 + e * 0.12; return { dx: 0, dy: 0, z }; }
    case 'pull-back': { const z = 1.12 - e * 0.12; return { dx: 0, dy: 0, z }; }
    case 'pan-right': return { dx: -e * 60 * s, dy: 0, z: 1 };
    case 'track-left': return { dx: -e * 80 * s, dy: 0, z: 1 };
    case 'track-right': return { dx: e * 80 * s, dy: 0, z: 1 };
    case 'sweep': return { dx: (0.5 - e) * 120 * s, dy: 0, z: 1.05 };
    case 'rise': return { dx: 0, dy: e * 50 * s, z: 1 };
    case 'crane-up': return { dx: 0, dy: e * 70 * s, z: 1 + e * 0.06 };
    case 'tilt-up': return { dx: 0, dy: e * 60 * s, z: 1 };
    case 'bloom': { const z = 1 + e * 0.08; return { dx: 0, dy: 0, z }; }
    case 'fade-gold': return { dx: 0, dy: 0, z: 1 };
    case 'hold': return { dx: Math.sin(p * Math.PI) * 6 * s, dy: 0, z: 1.01 };
    case 'drift': return { dx: -p * 30 * s, dy: p * 18 * s, z: 1.02 };
    case 'orbit': return { dx: Math.sin(p * Math.PI * 2) * 24 * s, dy: Math.sin(p * Math.PI) * -10 * s, z: 1 + Math.sin(p * Math.PI) * 0.05 };
    default: return { dx: 0, dy: 0, z: 1 };
  }
}

export function renderAnimatic(ctx, tl, t, opts) {
  opts = opts || {};
  const W = opts.width || 960; const H = opts.height || 540;
  const reduced = !!opts.reducedMotion;
  const seed = String(tl.seed);
  const ft = frameTime(t);
  const found = shotInfo(tl, ft);
  const s = found.shot; const p = found.progress; const local = found.local;

  const boil = boilJitter(seed, s.id, ft, reduced, W / 480);
  const slowBoil = boilJitterSlow(seed, s.id, ft, reduced, W / 520);
  const pose = poseFor(s, p, local);

  ctx.save();
  const cam = cameraTransform(s.camera.move, p, W, H);
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-W / 2 + cam.dx, -H / 2 + cam.dy);

  const painted = paintBackground(ctx, seed, s, W, H, ft, p, boil);
  const windK = painted.windK;
  const gy = painted.groundY + H * 0.06;

  // Cast staging: riding pairs, solo Ruel, or Nia/Yara marks.
  if (s.bg !== 'chart-table') {
    if (s.cast.includes('nia') && s.cast.includes('ruel')) {
      const ride = { ...pose.nia, stride: Math.max(pose.nia.stride, pose.ruel.tread * 0.6) };
      drawRuel(ctx, s.palette, W * 0.42, gy, H * 0.1, pose.ruel, boil, s.act >= 3 ? local : null, local);
      drawNiaAtWalk(ctx, s.palette, W * 0.42, gy - H * 0.19, H * 0.13, ride, windK, boil, local);
    } else if (s.cast.includes('ruel')) {
      drawRuel(ctx, s.palette, W * 0.55, gy, H * 0.11, pose.ruel, boil, local, local);
    } else {
      if (s.cast.includes('nia')) {
        drawNiaAtWalk(ctx, s.palette, W * (s.cast.includes('yara') ? 0.38 : 0.5), gy, H * 0.16, pose.nia, windK, boil, local);
      }
      if (s.cast.includes('yara')) {
        drawYara(ctx, s.palette, W * 0.62, gy, H * 0.17, pose.yara, slowBoil, local);
      }
    }
    // Nia returns to the cairn alone in the finale lighting.
    if (s.bg === 'cairn-top') {
      drawNiaAtWalk(ctx, s.palette, W * 0.5 - 90, H * 0.86, H * 0.13, pose.nia, 0.15, boil, local);
    }
  } else {
    // Overhead chart: Nia's hand plots the wind road.
    const hx = W * (0.18 + p * 0.44);
    const hyy = H * (0.5 - Math.sin(p * Math.PI) * 0.14);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(hx, hyy, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = s.palette.ink; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(hx, hyy, 7, 0, 7); ctx.stroke();
  }
  ctx.restore();

  // weather in front of the cast, under the letterbox
  drawParticles(ctx, seed, s, W, H, ft, p, windK, boil, reduced);

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
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // paper tooth + warm vignette close every frame
  drawGrain(ctx, seed, ft, reduced, W, H);
  drawVignette(ctx, W, H);

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
