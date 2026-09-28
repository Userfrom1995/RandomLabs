// Mythduel player: deterministic animatic stage (Phase 2).
//
// Plays story/duel.json as a scrub-exact canvas animatic: every rendered
// instant is quantized through frameTime() first, so pause, seek, chapters,
// and the capture loop all paint identical pixels. Paints the storm-crag
// through engine/arena.js (composition sketch, wash layers, detail pass,
// atmosphere pass), the fighters as painted animatic figures in design colors
// with feet on the arena ground line, ink-boil jitter and paper grain from
// the seeded RNG. Real controls only: play/pause, seek, chapters, captions
// toggle, fullscreen. Volume and trailer arrive with the score and premiere
// phases; no dead controls are rendered.
import { buildTimeline, beatAt, chapterAt, captionAt, formatTime } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { boilOffset } from '../engine/ink.js';
import { grainFlecks } from '../engine/paper.js';
import { paintArena, STAGE_W, STAGE_H } from '../engine/arena.js';
import { paintGallery } from './gallery.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function paintFighter(ctx, seed, t, x, groundY, opts) {
  // Painted animatic fighter: proportion-blocked figure in design colors, no
  // debug labels. Thor reads as a broad rust wedge with beard, hair-cap, and
  // haft-hammer; Zeus as a narrow marble column with aegean cloak and
  // shaft-bolt. Cloak tips follow the beat wind sway; ink-boil jitter keeps
  // the hand-drawn feel. Feet plant on the arena ground line so fighters sit
  // in the painted geography. Fully deterministic: every value derives from
  // (seed, boilKey, quantized t) and the passed options.
  const baseX = x * STAGE_W;
  const baseY = groundY;
  const boil = boilOffset(seed, opts.boilKey, t);
  const sway = opts.sway || 0;
  const broad = opts.broad;
  const w = broad ? 66 : 44;
  const h = broad ? 128 : 138;
  const legH = 34;
  const torsoTop = -h + 26;
  ctx.save();
  ctx.translate(baseX + boil.x, baseY + boil.y);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#141821';
  // Cloak: wind-blown triangle behind the body, tip offset by the sway.
  ctx.fillStyle = opts.cloak;
  ctx.beginPath();
  ctx.moveTo(-w / 2, torsoTop + 6);
  ctx.lineTo(-w / 2 - 24 - sway, -10);
  ctx.lineTo(-w / 2 + 8, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Legs: two planted columns reaching the ground line.
  ctx.fillStyle = opts.legs;
  const legW = broad ? 15 : 12;
  ctx.fillRect(-w / 4 - legW / 2, -legH, legW, legH);
  ctx.strokeRect(-w / 4 - legW / 2, -legH, legW, legH);
  ctx.fillRect(w / 4 - legW / 2, -legH, legW, legH);
  ctx.strokeRect(w / 4 - legW / 2, -legH, legW, legH);
  // Torso: broad wedge (Thor) vs narrow column (Zeus).
  ctx.fillStyle = opts.torso;
  ctx.beginPath();
  if (broad) {
    ctx.moveTo(-w / 2 - 8, -legH);
    ctx.lineTo(w / 2 + 8, -legH);
    ctx.lineTo(w / 2 - 6, torsoTop);
    ctx.lineTo(-w / 2 + 6, torsoTop);
  } else {
    ctx.moveTo(-w / 2, -legH);
    ctx.lineTo(w / 2, -legH);
    ctx.lineTo(w / 2 - 2, torsoTop);
    ctx.lineTo(-w / 2 + 2, torsoTop);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sash across the chest in the cloak color.
  ctx.save();
  ctx.strokeStyle = opts.cloak;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-w / 2, torsoTop + 22);
  ctx.lineTo(w / 2, torsoTop + 34);
  ctx.stroke();
  ctx.restore();
  // Arms: rear arm low, weapon arm raised toward the grip.
  ctx.save();
  ctx.strokeStyle = opts.skin;
  ctx.lineWidth = broad ? 11 : 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 2, torsoTop + 14);
  ctx.lineTo(-w / 2 - 12, -legH + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 + 2, torsoTop + 14);
  ctx.lineTo(w / 2 + 16, torsoTop - 12);
  ctx.stroke();
  ctx.restore();
  // Weapon in the raised hand: haft-hammer (wedge head) vs shaft-bolt (point).
  const gx = w / 2 + 16;
  const gy = torsoTop - 12;
  ctx.save();
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(gx, gy + 34);
  ctx.lineTo(gx, gy - 30);
  ctx.stroke();
  ctx.fillStyle = opts.weaponHead;
  ctx.strokeStyle = '#141821';
  ctx.lineWidth = 2.5;
  if (opts.weapon === 'hammer') {
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy - 44);
    ctx.lineTo(gx + 22, gy - 38);
    ctx.lineTo(gx + 22, gy - 16);
    ctx.lineTo(gx - 6, gy - 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(gx, gy - 52);
    ctx.lineTo(gx + 11, gy - 30);
    ctx.lineTo(gx, gy - 22);
    ctx.lineTo(gx - 11, gy - 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // Head with hair-cap; Thor adds a beard block.
  ctx.fillStyle = opts.skin;
  ctx.strokeStyle = '#141821';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, torsoTop - 14, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = opts.hair;
  ctx.beginPath();
  ctx.arc(0, torsoTop - 19, 15, Math.PI, Math.PI * 2);
  ctx.fill();
  if (broad) {
    ctx.fillRect(-11, torsoTop - 8, 22, 14);
    ctx.strokeRect(-11, torsoTop - 8, 22, 14);
  }
  ctx.restore();
}

export function paintStage(ctx, tl, board, t) {
  const q = frameTime(t);
  const { beat, local, progress } = beatAt(tl, q);
  const panel = board.panels.find((p) => p.beat === beat.id) || board.panels[0];
  const arena = paintArena(ctx, tl.seed, q, beat, panel.palette);
  const sway = Math.sin(q * 0.8) * beat.wind.force * 8;
  const thorX = lerp(beat.staging.thor.x, 0.5, progress * 0.15) + sway / STAGE_W;
  const zeusX = lerp(beat.staging.zeus.x, 0.5, progress * 0.15) - sway / STAGE_W;
  paintFighter(ctx, tl.seed, q, thorX, arena.ground, {
    broad: true, boilKey: 'thor', sway, torso: '#a03c2e', cloak: '#3d4c63',
    legs: '#2a2f38', skin: '#e4d7bd', hair: '#8a5a3c', weapon: 'hammer', weaponHead: '#4a4f59',
  });
  paintFighter(ctx, tl.seed, q, zeusX, arena.ground, {
    broad: false, boilKey: 'zeus', sway: -sway, torso: '#ece7da', cloak: '#2e5f8a',
    legs: '#565b66', skin: '#dfc9a8', hair: '#cfd2d6', weapon: 'spear', weaponHead: '#b98d3e',
  });
  // Grain over everything, scrub-exact.
  const flecks = grainFlecks(tl.seed, 'stage', q, 60);
  ctx.save();
  ctx.fillStyle = '#000';
  for (const f of flecks) {
    ctx.globalAlpha = f.a;
    ctx.beginPath();
    ctx.arc(f.x * STAGE_W, f.y * STAGE_H, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  return { beat, local, progress, panel };
}

async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to load ' + url + ' (' + res.status + ')');
  return res.json();
}

export async function bootPlayer() {
  const canvas = document.getElementById('stage');
  const overlay = document.getElementById('stageOverlay');
  const overlayMsg = document.getElementById('overlayMsg');
  const captionLine = document.getElementById('captionLine');
  const fail = (msg) => {
    if (overlayMsg) overlayMsg.textContent = msg;
    if (overlay) overlay.hidden = false;
  };
  try {
    const [duel, board] = await Promise.all([
      loadJson('story/duel.json'),
      loadJson('story/storyboard.json'),
    ]);
    const tl = buildTimeline(duel);
    const ctx = canvas.getContext('2d');
    const state = {
      tl, board, playing: false, lastWall: 0, t: 0,
      captionsOn: true, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
    const seek = document.getElementById('seek');
    const btnPlay = document.getElementById('btnPlay');
    const btnRestart = document.getElementById('btnRestart');
    const btnCaption = document.getElementById('btnCaption');
    const btnFull = document.getElementById('btnFull');
    const tCur = document.getElementById('tCur');
    const tDur = document.getElementById('tDur');
    const beatMenu = document.getElementById('beatMenu');
    const beatTitle = document.getElementById('beatTitle');
    const veil = document.getElementById('loadingVeil');
    const bigPlay = document.getElementById('bigPlay');
    seek.max = tl.total;
    tDur.textContent = formatTime(tl.total);
    // Beat/chapter menu from the beat map.
    beatMenu.innerHTML = '';
    tl.chapters.forEach((c) => {
      const group = document.createElement('div');
      group.className = 'chapter-group';
      const h = document.createElement('h4');
      h.textContent = c.title;
      group.appendChild(h);
      c.beats.forEach((bid) => {
        const b = tl.beats.find((x) => x.id === bid);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = b.title;
        btn.dataset.beat = bid;
        btn.addEventListener('click', () => { setT(b.start + 0.01); });
        group.appendChild(btn);
      });
      beatMenu.appendChild(group);
    });
    paintGallery(state.tl, state.board);

    const setT = (v) => {
      state.t = Math.min(Math.max(v, 0), tl.total - 0.001);
      if (!Number.isFinite(state.t)) state.t = 0;
      draw();
    };

    const draw = () => {
      const q = frameTime(state.t);
      const { beat, local } = paintStage(ctx, tl, board, q);
      const beatPos = tl.beats.findIndex((x) => x.id === beat.id) + 1;
      beatTitle.textContent = 'Beat ' + beatPos + ' of ' + tl.beats.length + ' - ' + beat.title;
      const cap = captionAt(beat, local);
      // The caption band is never empty while captions are on: silent action
      // gaps name the beat so the first paint (t=0) already carries a line.
      captionLine.textContent = !state.captionsOn ? '' : (cap ? cap.who + ': ' + cap.line : beat.title + ' - the storm holds');
      seek.value = q;
      tCur.textContent = formatTime(q);
      seek.setAttribute('aria-valuetext', formatTime(q) + ' of ' + formatTime(tl.total));
      beatMenu.querySelectorAll('button').forEach((el) => {
        el.classList.toggle('active', el.dataset.beat === beat.id);
      });
    };

    const tick = (wall) => {
      if (state.playing) {
        const dt = state.lastWall ? (wall - state.lastWall) / 1000 : 0;
        state.lastWall = wall;
        if (!state.reduced) {
          state.t += dt;
          if (state.t >= tl.total) {
            state.t = tl.total - 0.001;
            state.playing = false;
            btnPlay.textContent = '▶';
            if (bigPlay) bigPlay.hidden = false;
          }
        } else if (!state.tickLogged) {
          // Reduced motion: hold stills; the viewer steps by seek/chapters.
          state.tickLogged = true;
        }
        draw();
      }
      requestAnimationFrame(tick);
    };

    btnPlay.addEventListener('click', () => {
      state.playing = !state.playing;
      state.lastWall = 0;
      btnPlay.textContent = state.playing ? '⏸' : '▶';
      if (bigPlay) bigPlay.hidden = state.playing;
    });
    if (bigPlay) bigPlay.addEventListener('click', () => btnPlay.click());
    btnRestart.addEventListener('click', () => setT(0));
    seek.addEventListener('input', () => setT(parseFloat(seek.value)));
    btnCaption.addEventListener('click', () => {
      state.captionsOn = !state.captionsOn;
      btnCaption.setAttribute('aria-pressed', String(state.captionsOn));
      draw();
    });
    btnFull.addEventListener('click', () => {
      const wrap = document.getElementById('stageWrap');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (wrap.requestFullscreen) wrap.requestFullscreen();
    });
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input,textarea')) return;
      if (e.code === 'Space') { e.preventDefault(); btnPlay.click(); }
      if (e.key === 'c' || e.key === 'C') btnCaption.click();
    });
    if (veil) veil.hidden = true;
    if (bigPlay) bigPlay.hidden = false;
    draw();
    requestAnimationFrame(tick);
  } catch (err) {
    fail(err && err.message ? err.message : String(err));
  }
}

if (typeof document !== 'undefined' && document.getElementById('stage')) {
  bootPlayer();
}
