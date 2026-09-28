// Mythduel player: deterministic animatic stage (Phase 1).
//
// Plays story/duel.json as a scrub-exact canvas animatic: every rendered
// instant is quantized through frameTime() first, so pause, seek, chapters,
// and the capture loop all paint identical pixels. Paints the storm-crag as
// layered washes, the fighters as design-faithful markers per beat staging,
// ink-boil jitter and paper grain from the seeded RNG. Real controls only:
// play/pause, seek, chapters, captions toggle, fullscreen. Volume and trailer
// arrive with the score and premiere phases; no dead controls are rendered.
import { buildTimeline, beatAt, chapterAt, captionAt, formatTime } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { boilOffset } from '../engine/ink.js';
import { grainFlecks } from '../engine/paper.js';
import { paintGallery } from './gallery.js';

const STAGE_W = 960;
const STAGE_H = 540;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixSky(ctx, top, bottom, seed, t) {
  const g = ctx.createLinearGradient(0, 0, 0, STAGE_H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  // Deterministic rain-veil streaks scaled by nothing yet (arena pass lands Phase 2).
  const flecks = grainFlecks(seed, 'sky', t, 24);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (const f of flecks) {
    ctx.beginPath();
    ctx.moveTo(f.x * STAGE_W, f.y * STAGE_H);
    ctx.lineTo(f.x * STAGE_W - 8, f.y * STAGE_H + 26);
    ctx.stroke();
  }
  ctx.restore();
}

function paintCrag(ctx, seed, t, storm) {
  // Layered wash crag: far cliffs, mid mass, foreground rock. Seeded facet
  // jitter keeps every frame identical for the same t.
  const layers = [
    { y: 360, amp: 26, color: 'rgba(30,36,48,0.85)' },
    { y: 430, amp: 34, color: 'rgba(24,28,38,0.95)' },
    { y: 500, amp: 22, color: 'rgba(16,19,27,1)' },
  ];
  layers.forEach((L, li) => {
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(0, STAGE_H);
    ctx.lineTo(0, L.y);
    for (let x = 0; x <= STAGE_W; x += 32) {
      const rnd = sub01(seed, 'crag|' + li + '|' + x);
      ctx.lineTo(x, L.y - rnd * L.amp - storm * 3);
    }
    ctx.lineTo(STAGE_W, STAGE_H);
    ctx.closePath();
    ctx.fill();
  });
}

function sub01(seed, id) {
  let h = 2166136261 >>> 0;
  const s = seed + '|' + id;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function paintFighter(ctx, seed, t, x, palette, broad, label) {
  // Design-faithful animatic marker: Thor broad wedge, Zeus narrow column,
  // cloak sway driven by the beat wind vector passed as sway.
  const baseX = x * STAGE_W;
  const baseY = 430;
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
  mixSky(ctx, panel.palette.sky, panel.palette.wash, tl.seed, q);
  paintCrag(ctx, tl.seed, q, beat.storm);
  const sway = Math.sin(q * 0.8) * beat.wind.force * 8;
  const thorX = lerp(beat.staging.thor.x, 0.5, progress * 0.15) + sway / STAGE_W;
  const zeusX = lerp(beat.staging.zeus.x, 0.5, progress * 0.15) - sway / STAGE_W;
  paintFighter(ctx, tl.seed, q, thorX, '#a03c2e', true, 'THOR');
  paintFighter(ctx, tl.seed, q, zeusX, '#ece7da', false, 'ZEUS');
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
