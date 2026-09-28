// Mythduel player: deterministic animatic stage (Phase 2).
//
// Plays story/duel.json as a scrub-exact canvas animatic: every rendered
// instant is quantized through frameTime() first, so pause, seek, chapters,
// and the capture loop all paint identical pixels. Paints the storm-crag
// through engine/arena.js (composition sketch, wash layers, detail pass,
// atmosphere pass), the fighters as design-faithful markers per beat staging
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

function paintFighter(ctx, seed, t, x, groundY, palette, broad, label) {
  // Design-faithful animatic marker: Thor broad wedge, Zeus narrow column,
  // cloak sway driven by the beat wind vector passed as sway. Feet plant on
  // the arena ground line so fighters sit in the painted geography.
  const baseX = x * STAGE_W;
  const baseY = groundY;
  const boil = boilOffset(seed, label, t);
  const w = broad ? 64 : 44;
  ctx.save();
  ctx.translate(baseX + boil.x, baseY + boil.y);
  ctx.fillStyle = palette;
  ctx.strokeStyle = '#141821';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-w / 2, -120, w, 120, 10);
  else ctx.rect(-w / 2, -120, w, 120);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -142, 16, 0, Math.PI * 2);
  ctx.fillStyle = broad ? '#e4d7bd' : '#dfc9a8';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#141821';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 24);
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
  paintFighter(ctx, tl.seed, q, thorX, arena.ground, '#a03c2e', true, 'THOR');
  paintFighter(ctx, tl.seed, q, zeusX, arena.ground, '#ece7da', false, 'ZEUS');
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
      captionLine.textContent = state.captionsOn && cap ? cap.who + ': ' + cap.line : '';
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
