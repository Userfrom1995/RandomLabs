// Mythduel player: deterministic duel stage (Phase 4: original score).
//
// Plays story/duel.json as a scrub-exact canvas duel: every rendered instant
// is quantized through frameTime() first, so pause, seek, chapters, and the
// capture loop all paint identical pixels. Paints the storm-crag through
// engine/arena.js, the fighters as FK rigs (engine/fighters.js over rigs.js,
// acting.js, faces.js: proportion bodies, gripping hands, gaze/blink/brows,
// effort mouths, exertion tremor, wound marks, wind-driven cloth/hair,
// impact particles anchored to the geography) with feet on the arena ground
// line, ink-boil jitter and paper grain from the seeded RNG. The original
// score performs live (score/live-audio.js: same rows, lines, and
// cue-opening phrases as the offline WAV master) with volume and mute.
// Real controls only: play/pause, seek, chapters, captions toggle,
// fullscreen, volume, mute. Trailer arrives with the premiere phase;
// no dead controls.
import { buildTimeline, beatAt, chapterAt, captionAt, formatTime } from '../engine/timeline.js';
import { frameTime } from '../engine/frames.js';
import { grainFlecks } from '../engine/paper.js';
import { paintArena, STAGE_W, STAGE_H } from '../engine/arena.js';
import { paintFighterRig, paintWeaponFlight, weaponFlight, paintImpactParticles } from '../engine/fighters.js';
import { createPerformer } from '../score/live-audio.js';
import { paintGallery } from './gallery.js';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function paintStage(ctx, tl, board, t) {
  const q = frameTime(t);
  const { beat, local, progress } = beatAt(tl, q);
  const panel = board.panels.find((p) => p.beat === beat.id) || board.panels[0];
  const arena = paintArena(ctx, tl.seed, q, beat, panel.palette);
  const sway = Math.sin(q * 0.8) * beat.wind.force * 8;
  const thorX = lerp(beat.staging.thor.x, 0.5, progress * 0.15) + sway / STAGE_W;
  const zeusX = lerp(beat.staging.zeus.x, 0.5, progress * 0.15) - sway / STAGE_W;
  paintFighterRig(ctx, tl.seed, q, beat, 'thor', thorX, arena.ground, beat.wind, beat.continuity.exit.thor.fatigue);
  paintFighterRig(ctx, tl.seed, q, beat, 'zeus', zeusX, arena.ground, beat.wind, beat.continuity.exit.zeus.fatigue);
  // Thrown weapons fly the b04 wager lane; impact particles burst at the
  // crossing point, the clinch marks, and the skyburst crown.
  const thorFlight = weaponFlight(beat, local, 'thor', thorX * STAGE_W, zeusX * STAGE_W, arena.ground);
  const zeusFlight = weaponFlight(beat, local, 'zeus', thorX * STAGE_W, zeusX * STAGE_W, arena.ground);
  if (thorFlight) paintWeaponFlight(ctx, tl.seed, q, beat, local, 'thor', thorFlight.x, thorFlight.y);
  if (zeusFlight) paintWeaponFlight(ctx, tl.seed, q, beat, local, 'zeus', zeusFlight.x, zeusFlight.y);
  const crossX = (thorX + zeusX) / 2 * STAGE_W;
  paintImpactParticles(ctx, tl.seed, q, beat, { crossX, crossY: arena.ground - 110, ground: arena.ground });
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
      audio: createPerformer(), cueBeat: null,
    };
    const seek = document.getElementById('seek');
    const btnPlay = document.getElementById('btnPlay');
    const btnRestart = document.getElementById('btnRestart');
    const btnCaption = document.getElementById('btnCaption');
    const btnFull = document.getElementById('btnFull');
    const vol = document.getElementById('vol');
    const btnMute = document.getElementById('btnMute');
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
      // The live score follows the stage beat: same cue map as the WAV master.
      if (state.cueBeat !== beat.id) {
        state.cueBeat = beat.id;
        try { state.audio.setCue(beat.music, beat, beatPos - 1); } catch { /* silent stage without audio */ }
      }
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
            state.audio.stop();
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
      try {
        if (state.playing) { state.audio.unlock(); state.audio.start(); }
        else state.audio.stop();
      } catch { /* silent stage without audio */ }
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
    // Volume and mute drive the live score performer for real.
    if (!state.audio.audioAvailable()) {
      if (vol) vol.disabled = true;
      if (btnMute) btnMute.disabled = true;
    }
    if (vol) vol.addEventListener('input', () => {
      try { state.audio.unlock(); state.audio.setVolume(parseFloat(vol.value)); } catch { /* no audio */ }
    });
    if (btnMute) btnMute.addEventListener('click', () => {
      try {
        state.audio.unlock();
        state.audio.setMuted(!state.audio.isMuted());
        btnMute.setAttribute('aria-pressed', String(state.audio.isMuted()));
        btnMute.textContent = state.audio.isMuted() ? '🔇' : '🔊';
      } catch { /* no audio */ }
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
